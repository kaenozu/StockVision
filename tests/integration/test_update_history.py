"""
統合テスト: シナリオ2 - データ更新と履歴確認
"""

import asyncio
import json
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

from src.models.price_history import \
    PriceHistory as StockHistory  # Added this line
from src.stock_api.data_models import StockData
from src.stock_cli.cli import StockCLI
from src.stock_storage.database import DatabaseManager as Database


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.skip(reason="Legacy test with outdated imports - needs refactoring")
class TestUpdateHistory:
    """データ更新と履歴確認（トヨタ自動車 7203）のテスト"""

    @pytest.fixture
    async def setup_test_db(self):
        """テスト用データベースのセットアップ"""
        db = Database(":memory:")
        await db.init_tables()
        yield db
        await db.close()

    @pytest.fixture
    def mock_toyota_current_data(self):
        """トヨタの現在価格データ（更新後）"""
        return {
            "symbol": "7203.T",
            "shortName": "トヨタ自動車株式会社",
            "regularMarketPrice": 2480.5,
            "previousClose": 2450.0,
            "regularMarketChange": 30.5,
            "regularMarketChangePercent": 1.24,
            "currency": "JPY",
            "marketCap": 35000000000000,
        }

    @pytest.fixture
    def mock_toyota_history_data(self):
        """トヨタの過去7日間の履歴データ"""
        base_date = datetime.now()
        history_data = []

        # 7日間の履歴データ生成（価格は徐々に上昇傾向）
        prices = [2420.0, 2435.5, 2441.2, 2438.8, 2455.3, 2450.0, 2480.5]

        for i, price in enumerate(prices):
            date = base_date - timedelta(days=6 - i)
            history_data.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "open": price - 5.0,
                    "high": price + 8.0,
                    "low": price - 12.0,
                    "close": price,
                    "volume": 15000000 + (i * 500000),
                }
            )

        return history_data

    @pytest.fixture
    def mock_toyota_old_data(self):
        """更新前のトヨタデータ"""
        return StockData(
            stock_code="7203",
            company_name="トヨタ自動車株式会社",
            current_price=Decimal("2450.0"),
            previous_close=Decimal("2430.0"),
            price_change=Decimal("20.0"),
            price_change_pct=0.82,
            last_updated=datetime.now() - timedelta(hours=2),
        )

    @patch("yfinance.Ticker")
    async def test_toyota_data_update_workflow(
        self,
        mock_ticker,
        setup_test_db,
        mock_toyota_current_data,
        mock_toyota_history_data,
        mock_toyota_old_data,
    ):
        """
        完全なデータ更新ワークフローテスト:
        1. 古いデータが存在する状態
        2. 価格データ更新実行
        3. 更新結果確認
        4. 7日間履歴確認

        このテストは実装が存在しないため最初は失敗する
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        # Step 1: 古いデータを事前に保存
        await db.save_stock_data(mock_toyota_old_data)

        # yfinanceのモック設定
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = mock_toyota_current_data
        mock_ticker_instance.history.return_value.to_dict.return_value = {
            "Close": {
                i: data["close"] for i, data in enumerate(mock_toyota_history_data)
            },
            "Volume": {
                i: data["volume"] for i, data in enumerate(mock_toyota_history_data)
            },
        }
        mock_ticker.return_value = mock_ticker_instance

        # Step 2: 価格データ更新
        # python -m src.stock_cli update 7203 相当
        update_result = await cli.update_stock_data("7203")

        assert update_result is not None
        assert update_result.success is True
        assert update_result.stock_code == "7203"
        assert update_result.old_price == Decimal("2450.0")
        assert update_result.new_price == Decimal("2480.5")
        assert update_result.price_difference == Decimal("30.5")

        # Step 3: 更新結果確認
        # python -m src.stock_cli search 7203 --format json 相当
        updated_stock = await cli.search_stock("7203", use_cache=False)

        assert updated_stock.current_price == Decimal("2480.5")
        assert updated_stock.previous_close == Decimal("2450.0")
        assert updated_stock.price_change == Decimal("30.5")
        assert updated_stock.price_change_pct == pytest.approx(1.24)

        # 更新時刻が新しくなっていることを確認
        assert updated_stock.last_updated > mock_toyota_old_data.last_updated

        # Step 4: 履歴確認
        # python -m src.stock_cli history 7203 --days 7 相当
        history = await cli.get_stock_history("7203", days=7)

        assert len(history) == 7
        assert history[-1].close_price == Decimal("2480.5")  # 最新データ
        assert history[0].close_price == Decimal("2420.0")  # 7日前

        # 価格上昇傾向の確認
        prices = [h.close_price for h in history]
        assert prices[-1] > prices[0]  # 最新価格 > 7日前価格

    @patch("yfinance.Ticker")
    async def test_api_stock_update_endpoint(
        self, mock_ticker, mock_toyota_current_data
    ):
        """
        API経由での株価更新テスト
        PUT /stocks/7203/update 相当
        """
        from fastapi.testclient import TestClient

        from src.main import app

        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = mock_toyota_current_data
        mock_ticker.return_value = mock_ticker_instance

        client = TestClient(app)
        response = client.put("/stocks/7203/update")

        assert response.status_code == 200
        data = response.json()
        assert data["stock_code"] == "7203"
        assert data["success"] is True
        assert data["new_price"] == 2480.5

    @patch("yfinance.Ticker")
    async def test_api_stock_history_endpoint(
        self, mock_ticker, mock_toyota_history_data
    ):
        """
        API経由での履歴取得テスト
        GET /stocks/7203/history?days=7 相当
        """
        from fastapi.testclient import TestClient

        from src.main import app

        mock_ticker_instance = MagicMock()
        mock_ticker_instance.history.return_value.to_dict.return_value = {
            "Close": {
                i: data["close"] for i, data in enumerate(mock_toyota_history_data)
            },
            "Volume": {
                i: data["volume"] for i, data in enumerate(mock_toyota_history_data)
            },
        }
        mock_ticker.return_value = mock_ticker_instance

        client = TestClient(app)
        response = client.get("/stocks/7203/history?days=7")

        assert response.status_code == 200
        data = response.json()
        assert len(data["history"]) == 7
        assert data["stock_code"] == "7203"
        assert data["history"][-1]["close_price"] == 2480.5

    async def test_database_history_operations(
        self, setup_test_db, mock_toyota_history_data
    ):
        """
        データベースでの履歴操作テスト
        """
        db = setup_test_db

        # 履歴データの保存
        for day_data in mock_toyota_history_data:
            history_item = StockHistory(
                stock_code="7203",
                date=datetime.strptime(day_data["date"], "%Y-%m-%d").date(),
                open_price=Decimal(str(day_data["open"])),
                high_price=Decimal(str(day_data["high"])),
                low_price=Decimal(str(day_data["low"])),
                close_price=Decimal(str(day_data["close"])),
                volume=day_data["volume"],
            )
            await db.save_stock_history(history_item)

        # 履歴データの取得
        history = await db.get_stock_history("7203", days=7)
        assert len(history) == 7

        # 日付順になっていることを確認
        dates = [h.date for h in history]
        assert dates == sorted(dates)

        # 最新データの確認
        latest = history[-1]
        assert latest.close_price == Decimal("2480.5")
        assert latest.volume == 18500000

    async def test_price_change_calculation(self, setup_test_db):
        """
        価格変動計算の正確性テスト
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        # 古いデータ
        old_stock = StockData(stock_code="7203", current_price=Decimal("2450.0"))
        await db.save_stock_data(old_stock)

        # 新しいデータ
        new_stock = StockData(
            stock_code="7203",
            current_price=Decimal("2480.5"),
            previous_close=Decimal("2450.0"),
        )

        # 価格変動の計算
        change_info = await cli.calculate_price_change(old_stock, new_stock)

        assert change_info.price_difference == Decimal("30.5")
        assert change_info.percentage_change == pytest.approx(1.24, abs=0.01)
        assert change_info.trend == "up"

    @patch("yfinance.Ticker")
    async def test_concurrent_updates(
        self, mock_ticker, setup_test_db, mock_toyota_current_data
    ):
        """
        同時更新の処理テスト（排他制御）
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = mock_toyota_current_data
        mock_ticker.return_value = mock_ticker_instance

        # 同時に複数の更新を実行
        tasks = []
        for _ in range(5):
            task = asyncio.create_task(cli.update_stock_data("7203"))
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # すべて成功するか、適切にエラーハンドリングされることを確認
        successful_updates = [
            r for r in results if isinstance(r, dict) and r.get("success")
        ]
        assert len(successful_updates) >= 1  # 最低1つは成功

        # データの整合性確認
        final_stock = await db.get_stock_data("7203")
        assert final_stock.current_price == Decimal("2480.5")

    async def test_history_data_aggregation(
        self, setup_test_db, mock_toyota_history_data
    ):
        """
        履歴データの集計機能テスト
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        # テストデータの保存
        for day_data in mock_toyota_history_data:
            history_item = StockHistory(
                stock_code="7203",
                date=datetime.strptime(day_data["date"], "%Y-%m-%d").date(),
                close_price=Decimal(str(day_data["close"])),
                volume=day_data["volume"],
            )
            await db.save_stock_history(history_item)

        # 集計データの取得
        stats = await cli.get_history_statistics("7203", days=7)

        assert stats.min_price == Decimal("2420.0")
        assert stats.max_price == Decimal("2480.5")
        assert stats.avg_price == pytest.approx(Decimal("2445.9"), abs=1)
        assert stats.total_volume > 100000000
        assert stats.volatility > 0

    @patch("yfinance.Ticker")
    async def test_update_error_handling(self, mock_ticker):
        """
        更新時のエラーハンドリングテスト
        """
        cli = StockCLI()

        # API接続エラーの場合
        mock_ticker.side_effect = ConnectionError("API unavailable")

        with pytest.raises(ConnectionError):
            await cli.update_stock_data("7203")

        # データ不整合の場合
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = {"symbol": "7203.T"}  # 価格データなし
        mock_ticker.return_value = mock_ticker_instance
        mock_ticker.side_effect = None

        with pytest.raises(ValueError, match="価格データが取得できません"):
            await cli.update_stock_data("7203")

    async def test_json_format_output(self, setup_test_db, mock_toyota_history_data):
        """
        JSON形式での出力テスト
        python -m src.stock_cli search 7203 --format json 相当
        """
        cli = StockCLI()

        stock_data = StockData(
            stock_code="7203",
            company_name="トヨタ自動車株式会社",
            current_price=Decimal("2480.5"),
            previous_close=Decimal("2450.0"),
            price_change=Decimal("30.5"),
            price_change_pct=1.24,
        )

        json_output = await cli.format_output(stock_data, format_type="json")
        parsed_json = json.loads(json_output)

        assert parsed_json["stock_code"] == "7203"
        assert parsed_json["company_name"] == "トヨタ自動車株式会社"
        assert parsed_json["current_price"] == 2480.5
        assert parsed_json["price_change"] == 30.5

    async def test_table_format_history(self, setup_test_db, mock_toyota_history_data):
        """
        テーブル形式での履歴表示テスト
        python -m src.stock_cli history 7203 --days 7 --format table 相当
        """
        cli = StockCLI()

        history_items = []
        for day_data in mock_toyota_history_data:
            history_item = StockHistory(
                stock_code="7203",
                date=datetime.strptime(day_data["date"], "%Y-%m-%d").date(),
                close_price=Decimal(str(day_data["close"])),
                volume=day_data["volume"],
            )
            history_items.append(history_item)

        table_output = await cli.format_history_table(history_items)

        # テーブルヘッダーの存在確認
        assert "Date" in table_output
        assert "Close Price" in table_output
        assert "Volume" in table_output

        # データ行の存在確認
        assert "7203" in table_output
        assert "2480.5" in table_output
        assert "18500000" in table_output
