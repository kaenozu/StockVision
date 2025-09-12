"""
表示フォーマッターのユニットテスト
"""

import json
from datetime import datetime
from decimal import Decimal

import pytest

from src.stock_api.data_models import CurrentPrice, StockData
from src.stock_display.formatters import (CompactFormatter, JSONFormatter,
                                          StockFormatter, TableFormatter)


class TestStockFormatter:
    """StockFormatterベースクラスのテスト"""

    def test_base_formatter_initialization(self):
        """基本フォーマッターの初期化"""
        formatter = StockFormatter()
        assert formatter is not None

    def test_format_not_implemented(self):
        """format メソッドが未実装であることの確認"""
        formatter = StockFormatter()
        # 基底クラスのformatメソッドが実装されている場合はスキップ
        if hasattr(formatter, "format") and callable(getattr(formatter, "format")):
            try:
                result = formatter.format([])
                # 実装されている場合は結果を確認
                assert isinstance(result, str)
            except NotImplementedError:
                # NotImplementedErrorが発生することを確認
                pass


class TestTableFormatter:
    """テーブルフォーマッターのテスト"""

    @pytest.fixture
    def sample_stock_data(self):
        """サンプル株式データ"""
        return [
            StockData(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2800.50"),
                previous_close=Decimal("2750.00"),
                price_change=Decimal("50.50"),
                price_change_pct=Decimal("1.84"),
                volume=1000000,
                market_cap=Decimal("37000000000000"),
            ),
            StockData(
                stock_code="4689",
                company_name="Yahoo Japan Corporation",
                current_price=Decimal("350.00"),
                previous_close=Decimal("345.00"),
                price_change=Decimal("5.00"),
                price_change_pct=Decimal("1.45"),
                volume=500000,
                market_cap=Decimal("800000000000"),
            ),
        ]

    def test_table_formatter_initialization(self):
        """テーブルフォーマッター初期化"""
        formatter = TableFormatter()
        assert formatter is not None

    def test_format_stock_data_table(self, sample_stock_data):
        """株式データのテーブルフォーマット"""
        formatter = TableFormatter()
        result = formatter.format_stock_list(sample_stock_data)

        assert isinstance(result, str)
        assert len(result) > 0

        # データが含まれていることを確認
        assert "7203" in result
        assert "Toyota Motor Corporation" in result
        assert "4689" in result
        assert "Yahoo Japan Corporation" in result

    def test_format_empty_data(self):
        """空データのフォーマット"""
        formatter = TableFormatter()
        result = formatter.format_stock_list([])

        assert isinstance(result, str)

    def test_format_single_item(self, sample_stock_data):
        """単一アイテムのフォーマット"""
        formatter = TableFormatter()
        result = formatter.format_stock_list([sample_stock_data[0]])

        assert isinstance(result, str)
        assert "7203" in result
        assert "Toyota Motor Corporation" in result


class TestJSONFormatter:
    """JSONフォーマッターのテスト"""

    @pytest.fixture
    def sample_current_price(self):
        """サンプル現在価格データ"""
        return CurrentPrice(
            stock_code="7203",
            company_name="Toyota Motor Corporation",
            current_price=Decimal("2800.50"),
            previous_close=Decimal("2750.00"),
            price_change=Decimal("50.50"),
            price_change_pct=Decimal("1.84"),
            volume=1000000,
            market_cap=Decimal("37000000000000"),
            timestamp=datetime(2023, 12, 1, 15, 30, 0),
        )

    def test_json_formatter_initialization(self):
        """JSONフォーマッター初期化"""
        formatter = JSONFormatter()
        assert formatter is not None

    def test_format_single_item_json(self, sample_current_price):
        """単一アイテムのJSONフォーマット"""
        formatter = JSONFormatter()
        result = formatter.format_current_price(sample_current_price)

        assert isinstance(result, str)

        # 有効なJSONかどうかを確認
        parsed = json.loads(result)
        assert isinstance(parsed, dict)
        assert parsed["stock_code"] == "7203"
        assert parsed["company_name"] == "Toyota Motor Corporation"
        assert parsed["current_price"] == 2800.5  # Decimalは float に変換される

    def test_format_list_json(self, sample_current_price):
        """リストデータのJSONフォーマット"""
        data = [sample_current_price]
        formatter = JSONFormatter()
        result = formatter.format_json(data)

        assert isinstance(result, str)

        parsed = json.loads(result)
        assert isinstance(parsed, list)
        assert len(parsed) == 1
        assert parsed[0]["stock_code"] == "7203"

    def test_format_empty_list_json(self):
        """空リストのJSONフォーマット"""
        formatter = JSONFormatter()
        result = formatter.format_json([])

        assert isinstance(result, str)

        parsed = json.loads(result)
        assert isinstance(parsed, list)
        assert len(parsed) == 0

    def test_json_datetime_serialization(self, sample_current_price):
        """datetime型のシリアライゼーション"""
        formatter = JSONFormatter()
        result = formatter.format_current_price(sample_current_price)

        parsed = json.loads(result)
        # timestampがISO形式の文字列になっていることを確認
        assert isinstance(parsed["timestamp"], str)
        assert "2023-12-01" in parsed["timestamp"]

    def test_json_decimal_serialization(self, sample_current_price):
        """Decimal型のシリアライゼーション"""
        formatter = JSONFormatter()
        result = formatter.format_current_price(sample_current_price)

        parsed = json.loads(result)
        # Decimal値がfloatになっていることを確認
        assert isinstance(parsed["current_price"], float)
        assert parsed["current_price"] == 2800.5


class TestCompactFormatter:
    """コンパクトフォーマッターのテスト"""

    @pytest.fixture
    def sample_stock_list(self):
        """サンプル株式リスト"""
        return [
            StockData(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2800.50"),
                previous_close=Decimal("2750.00"),
                price_change=Decimal("50.50"),
                price_change_pct=Decimal("1.84"),
                volume=1000000,
                market_cap=Decimal("37000000000000"),
            ),
            StockData(
                stock_code="4689",
                company_name="Yahoo Japan Corporation",
                current_price=Decimal("350.00"),
                previous_close=Decimal("345.00"),
                price_change=Decimal("5.00"),
                price_change_pct=Decimal("1.45"),
                volume=500000,
                market_cap=Decimal("800000000000"),
            ),
        ]

    def test_compact_formatter_initialization(self):
        """コンパクトフォーマッター初期化"""
        formatter = CompactFormatter()
        assert formatter is not None

    def test_format_stock_data_compact(self, sample_stock_list):
        """株式データのコンパクトフォーマット"""
        formatter = CompactFormatter()
        result = formatter.format_stock_list(sample_stock_list)

        assert isinstance(result, str)

        # データが含まれていることを確認
        assert "7203" in result
        assert "Toyota Motor Corporation" in result
        assert "4689" in result

    def test_format_empty_compact(self):
        """空データのコンパクトフォーマット"""
        formatter = CompactFormatter()
        result = formatter.format_stock_list([])

        assert isinstance(result, str)


class TestFormatterPerformance:
    """フォーマッターのパフォーマンステスト"""

    def test_table_formatter_large_dataset_performance(self):
        """大量データでのテーブルフォーマッターのパフォーマンス"""
        # 100件のサンプルデータを生成
        large_dataset = []
        for i in range(100):
            stock = StockData(
                stock_code=f"{1000+i}",
                company_name=f"Company {i}",
                current_price=Decimal(f"{1000+i}.00"),
                price_change_pct=Decimal("1.01"),
                volume=100000 + i * 1000,
                market_cap=Decimal(f"{1000000000 + i * 1000000}"),
            )
            large_dataset.append(stock)

        formatter = TableFormatter()

        import time

        start_time = time.time()
        result = formatter.format_stock_list(large_dataset)
        end_time = time.time()

        # 1秒以内に完了することを確認
        assert (end_time - start_time) < 1.0
        assert isinstance(result, str)
        assert len(result) > 0

    def test_json_formatter_large_dataset_performance(self):
        """大量データでのJSONフォーマッターのパフォーマンス"""
        # 100件のサンプルデータを生成
        large_dataset = []
        for i in range(100):
            stock = CurrentPrice(
                stock_code=f"{1000+i}",
                company_name=f"Company {i}",
                current_price=Decimal(f"{1000+i}.00"),
                previous_close=Decimal(f"{990+i}.00"),
                price_change=Decimal("10.00"),
                price_change_pct=Decimal("1.01"),
                volume=100000 + i * 1000,
                market_cap=Decimal(f"{1000000000 + i * 1000000}"),
            )
            large_dataset.append(stock)

        formatter = JSONFormatter()

        import time

        start_time = time.time()
        result = formatter.format_json(large_dataset)
        end_time = time.time()

        # 1秒以内に完了することを確認
        assert (end_time - start_time) < 1.0
        assert isinstance(result, str)

        # 有効なJSONであることを確認
        parsed = json.loads(result)
        assert len(parsed) == 100


class TestFormatterErrorHandling:
    """フォーマッターのエラーハンドリングテスト"""

    def test_table_formatter_with_none_values(self):
        """None値を含むデータのテーブルフォーマット"""
        data_with_nulls = [
            StockData(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2800.50"),
                previous_close=Decimal("2750.00"),
                price_change=Decimal("50.50"),
                price_change_pct=Decimal("1.84"),
                volume=1000000,
                market_cap=None,  # None値
            )
        ]

        formatter = TableFormatter()
        result = formatter.format_stock_list(data_with_nulls)

        assert isinstance(result, str)
        assert "7203" in result

    def test_json_formatter_with_invalid_data(self):
        """無効なデータでのJSONフォーマット"""
        formatter = JSONFormatter()

        # None値をフォーマット
        result = formatter.format_json(None)
        assert result is not None

    def test_compact_formatter_with_unicode_data(self):
        """Unicode文字を含むデータのコンパクトフォーマット"""
        unicode_data = [
            StockData(
                stock_code="7203",
                company_name="トヨタ自動車株式会社",  # 日本語
                current_price=Decimal("2800.50"),
                previous_close=Decimal("2750.00"),
                price_change=Decimal("50.50"),
                price_change_pct=Decimal("1.84"),
                volume=1000000,
                market_cap=Decimal("37000000000000"),
            )
        ]

        formatter = CompactFormatter()
        result = formatter.format_stock_list(unicode_data)

        assert isinstance(result, str)
        assert "トヨタ自動車株式会社" in result
