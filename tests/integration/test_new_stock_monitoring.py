"""
統合テスト: シナリオ1 - 新規銘柄の追加と監視
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
from decimal import Decimal

from src.stock_api.yahoo_client import YahooFinanceClient
from src.stock_cli.cli import StockCLI
from src.stock_storage.database import Database
from src.models.stock import StockData, WatchlistItem


@pytest.mark.integration
@pytest.mark.asyncio
class TestNewStockMonitoring:
    """新規銘柄（ソニーグループ 6758）の追加と監視のテスト"""

    @pytest.fixture
    async def setup_test_db(self):
        """テスト用データベースのセットアップ"""
        db = Database(":memory:")  # インメモリデータベース
        await db.init_tables()
        yield db
        await db.close()

    @pytest.fixture
    def mock_yfinance_data(self):
        """yfinanceからの模擬データ"""
        return {
            "symbol": "6758.T",
            "shortName": "ソニーグループ株式会社",
            "regularMarketPrice": 14250.0,
            "previousClose": 14100.0,
            "regularMarketChange": 150.0,
            "regularMarketChangePercent": 1.06,
            "currency": "JPY",
            "marketCap": 17580000000000
        }

    @patch('yfinance.Ticker')
    async def test_sony_stock_search_and_monitoring_workflow(
        self, 
        mock_ticker, 
        setup_test_db, 
        mock_yfinance_data
    ):
        """
        完全なワークフローテスト:
        1. 銘柄検索（6758 ソニーグループ）
        2. ウォッチリストに追加（ノートとアラート付き）
        3. ウォッチリストで確認
        
        このテストは実装が存在しないため最初は失敗する
        """
        db = setup_test_db
        
        # Step 1: yfinanceのモック設定
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = mock_yfinance_data
        mock_ticker.return_value = mock_ticker_instance
        
        # Step 2: 銘柄データ取得（CLI経由）
        cli = StockCLI(database=db)
        
        # python -m src.stock_cli search 6758 相当
        search_result = await cli.search_stock("6758")
        
        # 期待される結果の検証
        assert search_result is not None
        assert search_result.stock_code == "6758"
        assert search_result.company_name == "ソニーグループ株式会社"
        assert search_result.current_price == Decimal("14250.0")
        assert search_result.previous_close == Decimal("14100.0")
        assert search_result.price_change == Decimal("150.0")
        assert search_result.price_change_pct == pytest.approx(1.06)
        
        # Step 3: ウォッチリストに追加
        # python -m src.stock_cli watchlist add 6758 --notes "エンタメ関連株" --alert-high 15000 --alert-low 12000 相当
        watchlist_item = await cli.add_to_watchlist(
            stock_code="6758",
            notes="エンタメ関連株",
            alert_high=Decimal("15000"),
            alert_low=Decimal("12000")
        )
        
        assert watchlist_item is not None
        assert watchlist_item.stock_code == "6758"
        assert watchlist_item.notes == "エンタメ関連株"
        assert watchlist_item.alert_high == Decimal("15000")
        assert watchlist_item.alert_low == Decimal("12000")
        
        # Step 4: ウォッチリストで確認
        # python -m src.stock_cli watchlist list 相当
        watchlist = await cli.get_watchlist()
        
        assert len(watchlist) == 1
        sony_item = watchlist[0]
        assert sony_item.stock_code == "6758"
        assert sony_item.company_name == "ソニーグループ株式会社"
        assert sony_item.current_price == Decimal("14250.0")
        assert sony_item.notes == "エンタメ関連株"

    @patch('yfinance.Ticker')
    async def test_api_endpoint_stock_search(self, mock_ticker, mock_yfinance_data):
        """
        API経由での銘柄検索テスト
        GET /stocks/6758 相当
        """
        from fastapi.testclient import TestClient
        from src.main import app
        
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = mock_yfinance_data
        mock_ticker.return_value = mock_ticker_instance
        
        client = TestClient(app)
        response = client.get("/stocks/6758")
        
        assert response.status_code == 200
        data = response.json()
        assert data["stock_code"] == "6758"
        assert data["company_name"] == "ソニーグループ株式会社"
        assert data["current_price"] == 14250.0
        assert data["price_change"] == 150.0

    @patch('yfinance.Ticker')
    async def test_api_endpoint_watchlist_add(self, mock_ticker, mock_yfinance_data):
        """
        API経由でのウォッチリスト追加テスト
        POST /watchlist 相当
        """
        from fastapi.testclient import TestClient
        from src.main import app
        
        mock_ticker_instance = MagicMock()
        mock_ticker_instance.info = mock_yfinance_data
        mock_ticker.return_value = mock_ticker_instance
        
        client = TestClient(app)
        payload = {
            "stock_code": "6758",
            "notes": "エンタメ関連株",
            "alert_high": 15000,
            "alert_low": 12000
        }
        
        response = client.post("/watchlist", json=payload)
        
        assert response.status_code == 201
        data = response.json()
        assert data["stock_code"] == "6758"
        assert data["notes"] == "エンタメ関連株"
        assert data["alert_high"] == 15000
        assert data["alert_low"] == 12000

    async def test_database_operations(self, setup_test_db):
        """
        データベース操作の直接テスト
        """
        db = setup_test_db
        
        # 銘柄データの保存
        stock_data = StockData(
            stock_code="6758",
            company_name="ソニーグループ株式会社",
            current_price=Decimal("14250.0"),
            previous_close=Decimal("14100.0"),
            price_change=Decimal("150.0"),
            price_change_pct=1.06
        )
        
        await db.save_stock_data(stock_data)
        
        # ウォッチリストアイテムの保存
        watchlist_item = WatchlistItem(
            stock_code="6758",
            notes="エンタメ関連株",
            alert_high=Decimal("15000"),
            alert_low=Decimal("12000")
        )
        
        await db.add_to_watchlist(watchlist_item)
        
        # データの検証
        saved_stock = await db.get_stock_data("6758")
        assert saved_stock.company_name == "ソニーグループ株式会社"
        
        watchlist = await db.get_watchlist()
        assert len(watchlist) == 1
        assert watchlist[0].notes == "エンタメ関連株"

    async def test_alert_functionality(self, setup_test_db):
        """
        アラート機能のテスト（価格が設定値を超えた場合の検知）
        """
        db = setup_test_db
        
        # ウォッチリストにアイテム追加
        watchlist_item = WatchlistItem(
            stock_code="6758",
            alert_high=Decimal("15000"),
            alert_low=Decimal("12000")
        )
        await db.add_to_watchlist(watchlist_item)
        
        # 高値アラートのテスト（15100円 > 15000円）
        high_price_stock = StockData(
            stock_code="6758",
            current_price=Decimal("15100.0")
        )
        
        alerts = await db.check_alerts(high_price_stock)
        assert len(alerts) == 1
        assert alerts[0].alert_type == "high"
        assert alerts[0].triggered_price == Decimal("15100.0")
        
        # 安値アラートのテスト（11900円 < 12000円）
        low_price_stock = StockData(
            stock_code="6758",
            current_price=Decimal("11900.0")
        )
        
        alerts = await db.check_alerts(low_price_stock)
        assert len(alerts) == 1
        assert alerts[0].alert_type == "low"
        assert alerts[0].triggered_price == Decimal("11900.0")

    @patch('yfinance.Ticker')
    async def test_error_handling_invalid_stock_code(self, mock_ticker):
        """
        無効な銘柄コードの処理テスト
        """
        # yfinanceが例外を投げる場合の模擬
        mock_ticker.side_effect = Exception("Invalid ticker symbol")
        
        cli = StockCLI()
        
        with pytest.raises(ValueError, match="銘柄コードが無効です"):
            await cli.search_stock("INVALID")

    @patch('yfinance.Ticker')
    async def test_network_error_handling(self, mock_ticker):
        """
        ネットワークエラーの処理テスト
        """
        # ネットワークエラーの模擬
        mock_ticker.side_effect = ConnectionError("Network unreachable")
        
        cli = StockCLI()
        
        with pytest.raises(ConnectionError, match="ネットワークに接続できません"):
            await cli.search_stock("6758")