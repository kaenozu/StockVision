"""
統合テスト: シナリオ3 - 一括操作
"""

import asyncio
import json
from datetime import datetime
from decimal import Decimal
from typing import Dict
from unittest.mock import MagicMock, patch

import pytest

from src.models.watchlist import Watchlist as WatchlistItem
from src.stock_cli.cli import StockCLI
from src.stock_storage.database import DatabaseManager as Database


@pytest.mark.integration
@pytest.mark.asyncio
@pytest.mark.skip(reason="Legacy test with outdated imports - needs refactoring")
class TestBatchOperations:
    """一括操作（複数銘柄の追加・更新・表示）のテスト"""

    @pytest.fixture
    async def setup_test_db(self):
        """テスト用データベースのセットアップ"""
        db = Database(":memory:")
        await db.init_tables()
        yield db
        await db.close()

    @pytest.fixture
    def mock_multiple_stocks_data(self):
        """複数銘柄の模擬データ"""
        return {
            "7203": {  # トヨタ自動車
                "symbol": "7203.T",
                "shortName": "トヨタ自動車株式会社",
                "regularMarketPrice": 2480.5,
                "previousClose": 2450.0,
                "regularMarketChange": 30.5,
                "regularMarketChangePercent": 1.24,
            },
            "6758": {  # ソニーグループ
                "symbol": "6758.T",
                "shortName": "ソニーグループ株式会社",
                "regularMarketPrice": 14250.0,
                "previousClose": 14100.0,
                "regularMarketChange": 150.0,
                "regularMarketChangePercent": 1.06,
            },
            "4063": {  # 信越化学工業
                "symbol": "4063.T",
                "shortName": "信越化学工業株式会社",
                "regularMarketPrice": 4820.0,
                "previousClose": 4795.0,
                "regularMarketChange": 25.0,
                "regularMarketChangePercent": 0.52,
            },
            "9984": {  # ソフトバンクグループ
                "symbol": "9984.T",
                "shortName": "ソフトバンクグループ株式会社",
                "regularMarketPrice": 7850.0,
                "previousClose": 7920.0,
                "regularMarketChange": -70.0,
                "regularMarketChangePercent": -0.88,
            },
        }

    def create_mock_ticker(self, stock_data: Dict):
        """yfinance Tickerのモックを作成"""
        mock_instance = MagicMock()
        mock_instance.info = stock_data
        return mock_instance

    @patch("yfinance.Ticker")
    async def test_batch_add_to_watchlist_workflow(
        self, mock_ticker, setup_test_db, mock_multiple_stocks_data
    ):
        """
        複数銘柄の一括ウォッチリスト追加ワークフローテスト:
        1. 複数銘柄を一括でウォッチリストに追加
        2. 全ウォッチリスト銘柄の価格一括更新
        3. テーブル形式で結果確認

        このテストは実装が存在しないため最初は失敗する
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        # yfinanceのモック設定（複数銘柄に対応）
        def ticker_side_effect(symbol):
            # シンボルから銘柄コードを抽出（7203.T -> 7203）
            code = symbol.replace(".T", "")
            if code in mock_multiple_stocks_data:
                return self.create_mock_ticker(mock_multiple_stocks_data[code])
            raise ValueError(f"Invalid symbol: {symbol}")

        mock_ticker.side_effect = ticker_side_effect

        # Step 1: 複数銘柄を一括でウォッチリストに追加
        # python -m src.stock_cli watchlist batch-add --codes 7203,6758,4063,9984 --notes "日本主要株" 相当
        stock_codes = ["7203", "6758", "4063", "9984"]
        batch_result = await cli.batch_add_to_watchlist(
            stock_codes=stock_codes, notes="日本主要株"
        )

        assert batch_result is not None
        assert batch_result.success is True
        assert batch_result.total_processed == 4
        assert batch_result.successful_count == 4
        assert batch_result.failed_count == 0
        assert len(batch_result.successful_items) == 4

        # 各銘柄が正しく追加されたことを確認
        expected_companies = [
            "トヨタ自動車株式会社",
            "ソニーグループ株式会社",
            "信越化学工業株式会社",
            "ソフトバンクグループ株式会社",
        ]

        for item in batch_result.successful_items:
            assert item.stock_code in stock_codes
            assert item.notes == "日本主要株"
            assert item.company_name in expected_companies

        # Step 2: 全ウォッチリスト銘柄の価格一括更新
        # python -m src.stock_cli update --all 相当
        update_result = await cli.batch_update_watchlist()

        assert update_result is not None
        assert update_result.success is True
        assert update_result.total_processed == 4
        assert update_result.successful_count == 4

        # 更新結果の詳細確認
        price_changes = {
            "7203": Decimal("30.5"),  # トヨタ: +30.5
            "6758": Decimal("150.0"),  # ソニー: +150.0
            "4063": Decimal("25.0"),  # 信越化学: +25.0
            "9984": Decimal("-70.0"),  # ソフトバンク: -70.0
        }

        for update_item in update_result.update_details:
            expected_change = price_changes[update_item.stock_code]
            assert update_item.price_change == expected_change

        # Step 3: 結果の確認（テーブル形式）
        # python -m src.stock_cli watchlist list --format table 相当
        watchlist = await cli.get_watchlist()
        table_output = await cli.format_watchlist_table(watchlist)

        # テーブルの構造確認
        assert "Stock Code" in table_output
        assert "Company Name" in table_output
        assert "Current Price" in table_output
        assert "Change" in table_output
        assert "Change %" in table_output
        assert "Notes" in table_output

        # 各銘柄のデータが含まれていることを確認
        for code in stock_codes:
            assert code in table_output

        # 価格データが含まれていることを確認
        assert "2480.5" in table_output  # トヨタ
        assert "14250.0" in table_output  # ソニー
        assert "4820.0" in table_output  # 信越化学
        assert "7850.0" in table_output  # ソフトバンク

    @patch("yfinance.Ticker")
    async def test_api_batch_watchlist_add(
        self, mock_ticker, mock_multiple_stocks_data
    ):
        """
        API経由での一括ウォッチリスト追加テスト
        POST /watchlist/batch 相当
        """
        from fastapi.testclient import TestClient

        from src.main import app

        def ticker_side_effect(symbol):
            code = symbol.replace(".T", "")
            if code in mock_multiple_stocks_data:
                return self.create_mock_ticker(mock_multiple_stocks_data[code])
            raise ValueError(f"Invalid symbol: {symbol}")

        mock_ticker.side_effect = ticker_side_effect

        client = TestClient(app)
        payload = {
            "stock_codes": ["7203", "6758", "4063", "9984"],
            "notes": "日本主要株",
        }

        response = client.post("/watchlist/batch", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["total_processed"] == 4
        assert data["successful_count"] == 4
        assert len(data["successful_items"]) == 4

    @patch("yfinance.Ticker")
    async def test_api_batch_update_all(self, mock_ticker, mock_multiple_stocks_data):
        """
        API経由での全銘柄一括更新テスト
        PUT /watchlist/update-all 相当
        """
        from fastapi.testclient import TestClient

        from src.main import app

        def ticker_side_effect(symbol):
            code = symbol.replace(".T", "")
            if code in mock_multiple_stocks_data:
                return self.create_mock_ticker(mock_multiple_stocks_data[code])
            raise ValueError(f"Invalid symbol: {symbol}")

        mock_ticker.side_effect = ticker_side_effect

        client = TestClient(app)

        # まずウォッチリストに銘柄を追加
        for code in mock_multiple_stocks_data.keys():
            client.post("/watchlist", json={"stock_code": code})

        # 一括更新実行
        response = client.put("/watchlist/update-all")

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_processed"] == 4
        assert data["successful_count"] == 4

    async def test_database_batch_operations(
        self, setup_test_db, mock_multiple_stocks_data
    ):
        """
        データベースでの一括操作テスト
        """
        db = setup_test_db

        # 一括でウォッチリストアイテム作成
        watchlist_items = []
        for code, data in mock_multiple_stocks_data.items():
            item = WatchlistItem(
                stock_code=code, company_name=data["shortName"], notes="日本主要株"
            )
            watchlist_items.append(item)

        # 一括保存
        result = await db.batch_add_to_watchlist(watchlist_items)
        assert result.successful_count == 4
        assert result.failed_count == 0

        # 一括取得
        saved_items = await db.get_watchlist()
        assert len(saved_items) == 4

        # 各アイテムの確認
        saved_codes = {item.stock_code for item in saved_items}
        assert saved_codes == {"7203", "6758", "4063", "9984"}

    @patch("yfinance.Ticker")
    async def test_concurrent_batch_operations(
        self, mock_ticker, setup_test_db, mock_multiple_stocks_data
    ):
        """
        並行一括操作のテスト（パフォーマンス・競合状態）
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        def ticker_side_effect(symbol):
            code = symbol.replace(".T", "")
            if code in mock_multiple_stocks_data:
                return self.create_mock_ticker(mock_multiple_stocks_data[code])
            raise ValueError(f"Invalid symbol: {symbol}")

        mock_ticker.side_effect = ticker_side_effect

        # 複数の一括操作を並行実行
        tasks = []
        stock_groups = [["7203", "6758"], ["4063", "9984"]]

        for group in stock_groups:
            task = asyncio.create_task(
                cli.batch_add_to_watchlist(group, notes="並行テスト")
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks)

        # 結果の確認
        total_success = sum(r.successful_count for r in results)
        assert total_success == 4

        # データベースの整合性確認
        watchlist = await db.get_watchlist()
        assert len(watchlist) == 4

    async def test_partial_failure_handling(self, setup_test_db):
        """
        部分的失敗の処理テスト（一部の銘柄が無効な場合）
        """
        cli = StockCLI(database=setup_test_db)

        # 有効な銘柄と無効な銘柄を混在
        stock_codes = ["7203", "INVALID1", "6758", "INVALID2"]

        with patch("yfinance.Ticker") as mock_ticker:

            def ticker_side_effect(symbol):
                if "INVALID" in symbol:
                    raise ValueError(f"Invalid ticker: {symbol}")
                return MagicMock()

            mock_ticker.side_effect = ticker_side_effect

            result = await cli.batch_add_to_watchlist(
                stock_codes, notes="部分失敗テスト"
            )

            # 部分的成功の確認
            assert result.total_processed == 4
            assert result.successful_count == 2  # 7203, 6758のみ成功
            assert result.failed_count == 2  # INVALID1, INVALID2が失敗
            assert len(result.failed_items) == 2

            # エラー詳細の確認
            failed_codes = [item.stock_code for item in result.failed_items]
            assert "INVALID1" in failed_codes
            assert "INVALID2" in failed_codes

    async def test_performance_metrics(self, setup_test_db, mock_multiple_stocks_data):
        """
        一括操作のパフォーマンステスト
        """
        cli = StockCLI(database=setup_test_db)

        with patch("yfinance.Ticker") as mock_ticker:

            def ticker_side_effect(symbol):
                code = symbol.replace(".T", "")
                if code in mock_multiple_stocks_data:
                    return self.create_mock_ticker(mock_multiple_stocks_data[code])
                raise ValueError(f"Invalid symbol: {symbol}")

            mock_ticker.side_effect = ticker_side_effect

            # パフォーマンス測定
            start_time = datetime.now()

            result = await cli.batch_add_to_watchlist(
                list(mock_multiple_stocks_data.keys()), notes="パフォーマンステスト"
            )

            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()

            # 結果の確認
            assert result.successful_count == 4
            assert result.execution_time_seconds == pytest.approx(
                execution_time, abs=0.1
            )

            # パフォーマンス目標（4銘柄を5秒以内で処理）
            assert execution_time < 5.0

    async def test_output_formatting_variations(
        self, setup_test_db, mock_multiple_stocks_data
    ):
        """
        さまざまな出力形式のテスト
        """
        cli = StockCLI()

        # テストデータ作成
        watchlist_items = []
        for code, data in mock_multiple_stocks_data.items():
            item = WatchlistItem(
                stock_code=code,
                company_name=data["shortName"],
                current_price=Decimal(str(data["regularMarketPrice"])),
                price_change=Decimal(str(data["regularMarketChange"])),
                price_change_pct=data["regularMarketChangePercent"],
                notes="日本主要株",
            )
            watchlist_items.append(item)

        # JSON形式
        json_output = await cli.format_watchlist_json(watchlist_items)
        parsed_json = json.loads(json_output)
        assert len(parsed_json) == 4
        assert all(item["notes"] == "日本主要株" for item in parsed_json)

        # CSV形式
        csv_output = await cli.format_watchlist_csv(watchlist_items)
        lines = csv_output.strip().split("\n")
        assert len(lines) == 5  # ヘッダー + 4データ行
        assert "Stock Code,Company Name" in lines[0]

        # テーブル形式
        table_output = await cli.format_watchlist_table(watchlist_items)
        assert "│" in table_output  # テーブル罫線
        assert "7203" in table_output
        assert "トヨタ自動車" in table_output

    async def test_error_recovery_and_rollback(self, setup_test_db):
        """
        エラー時の回復処理とロールバックテスト
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        # トランザクション内でエラーが発生する場合
        with patch.object(db, "add_to_watchlist") as mock_add:
            # 3番目の銘柄で例外を発生
            call_count = 0

            async def add_side_effect(item):
                nonlocal call_count
                call_count += 1
                if call_count == 3:
                    raise Exception("Database error")
                return item

            mock_add.side_effect = add_side_effect

            stock_codes = ["7203", "6758", "4063", "9984"]

            # ロールバックが正常に動作することを確認
            with pytest.raises(Exception):
                await cli.batch_add_to_watchlist(
                    stock_codes, notes="ロールバックテスト"
                )

            # データベースが元の状態に戻っていることを確認
            watchlist = await db.get_watchlist()
            assert len(watchlist) == 0

    @patch("yfinance.Ticker")
    async def test_large_batch_operation(self, mock_ticker, setup_test_db):
        """
        大量データの一括操作テスト（スケーラビリティ）
        """
        db = setup_test_db
        cli = StockCLI(database=db)

        # 大量の銘柄コード生成（100銘柄）
        large_stock_codes = [f"{1000 + i}" for i in range(100)]

        # yfinanceのモック設定
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = {
            "regularMarketPrice": 1000.0,
            "shortName": "Test Company",
        }
        mock_ticker.return_value = mock_ticker_instance

        # 大量一括操作実行
        result = await cli.batch_add_to_watchlist(large_stock_codes, notes="大量テスト")

        assert result.successful_count == 100
        assert result.failed_count == 0

        # データベース確認
        watchlist = await db.get_watchlist()
        assert len(watchlist) == 100
