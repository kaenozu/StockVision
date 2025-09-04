"""
入力検証のためのユニットテスト
"""

import pytest
from decimal import Decimal
from datetime import datetime
from pydantic import ValidationError

from src.stock_api.data_models import (
    StockData, 
    CurrentPrice, 
    PriceHistoryItem
)


class TestStockDataValidation:
    """StockDataモデルの検証テスト"""

    def test_valid_stock_data(self):
        """有効なStockDataの作成"""
        data = {
            "stock_code": "7203",
            "company_name": "Toyota Motor Corporation",
            "current_price": Decimal("2800.50"),
            "previous_close": Decimal("2750.00"),
            "price_change": Decimal("50.50"),
            "price_change_pct": Decimal("1.84"),
            "volume": 1000000,
            "market_cap": Decimal("37000000000000")
        }
        
        stock = StockData(**data)
        assert stock.stock_code == "7203"
        assert stock.company_name == "Toyota Motor Corporation"
        assert stock.current_price == Decimal("2800.50")

    def test_stock_code_validation(self):
        """銘柄コードの検証"""
        # 有効な4桁の銘柄コード
        valid_codes = ["7203", "4689", "1000", "9999"]
        for code in valid_codes:
            data = {
                "stock_code": code,
                "company_name": "Test Company",
                "current_price": Decimal("1000"),
                "previous_close": Decimal("950"),
                "price_change": Decimal("50"),
                "price_change_pct": Decimal("5.26"),
                "volume": 100000
            }
            stock = StockData(**data)
            assert stock.stock_code == code

        # 無効な銘柄コード
        invalid_codes = ["123", "12345", "abcd", "7203a", ""]
        for code in invalid_codes:
            data = {
                "stock_code": code,
                "company_name": "Test Company",
                "current_price": Decimal("1000"),
                "previous_close": Decimal("950"),
                "price_change": Decimal("50"),
                "price_change_pct": Decimal("5.26"),
                "volume": 100000
            }
            with pytest.raises(ValidationError):
                StockData(**data)

    def test_price_validation(self):
        """価格の検証"""
        base_data = {
            "stock_code": "7203",
            "company_name": "Test Company",
            "price_change": Decimal("50"),
            "price_change_pct": Decimal("5.26"),
            "volume": 100000
        }

        # 負の価格は許可されない
        with pytest.raises(ValidationError):
            StockData(**{**base_data, "current_price": Decimal("-100"), "previous_close": Decimal("950")})
        
        with pytest.raises(ValidationError):
            StockData(**{**base_data, "current_price": Decimal("1000"), "previous_close": Decimal("-50")})

        # ゼロは許可される
        valid_data = {**base_data, "current_price": Decimal("0"), "previous_close": Decimal("0")}
        stock = StockData(**valid_data)
        assert stock.current_price == Decimal("0")

    def test_volume_validation(self):
        """出来高の検証"""
        base_data = {
            "stock_code": "7203",
            "company_name": "Test Company",
            "current_price": Decimal("1000"),
            "previous_close": Decimal("950"),
            "price_change": Decimal("50"),
            "price_change_pct": Decimal("5.26")
        }

        # 負の出来高は許可されない
        with pytest.raises(ValidationError):
            StockData(**{**base_data, "volume": -1000})

        # ゼロは許可される
        valid_data = {**base_data, "volume": 0}
        stock = StockData(**valid_data)
        assert stock.volume == 0

    def test_company_name_validation(self):
        """会社名の検証"""
        base_data = {
            "stock_code": "7203",
            "current_price": Decimal("1000"),
            "previous_close": Decimal("950"),
            "price_change": Decimal("50"),
            "price_change_pct": Decimal("5.26"),
            "volume": 100000
        }

        # 空の会社名は許可されない
        with pytest.raises(ValidationError):
            StockData(**{**base_data, "company_name": ""})

        # 有効な会社名
        valid_data = {**base_data, "company_name": "Toyota Motor Corporation"}
        stock = StockData(**valid_data)
        assert stock.company_name == "Toyota Motor Corporation"


class TestCurrentPriceValidation:
    """CurrentPriceモデルの検証テスト"""

    def test_valid_current_price(self):
        """有効なCurrentPriceの作成"""
        data = {
            "stock_code": "7203",
            "company_name": "Toyota Motor Corporation",
            "current_price": Decimal("2800.50"),
            "previous_close": Decimal("2750.00"),
            "price_change": Decimal("50.50"),
            "price_change_pct": Decimal("1.84"),
            "volume": 1000000,
            "market_cap": Decimal("37000000000000")
        }
        
        price = CurrentPrice(**data)
        assert price.stock_code == "7203"
        assert isinstance(price.timestamp, datetime)

    def test_market_cap_validation(self):
        """時価総額の検証"""
        base_data = {
            "stock_code": "7203",
            "company_name": "Toyota Motor Corporation",
            "current_price": Decimal("2800.50"),
            "previous_close": Decimal("2750.00"),
            "price_change": Decimal("50.50"),
            "price_change_pct": Decimal("1.84"),
            "volume": 1000000
        }

        # 正の時価総額
        valid_data = {**base_data, "market_cap": Decimal("37000000000000")}
        price = CurrentPrice(**valid_data)
        assert price.market_cap == Decimal("37000000000000")

        # ゼロまたは負の時価総額は許可されない
        with pytest.raises(ValidationError):
            CurrentPrice(**{**base_data, "market_cap": Decimal("0")})

        with pytest.raises(ValidationError):
            CurrentPrice(**{**base_data, "market_cap": Decimal("-1000000")})

        # Noneは許可される
        none_data = {**base_data, "market_cap": None}
        price = CurrentPrice(**none_data)
        assert price.market_cap is None


class TestPriceHistoryValidation:
    """PriceHistoryItemモデルの検証テスト"""

    def test_valid_price_history(self):
        """有効なPriceHistoryItemの作成"""
        data = {
            "stock_code": "7203",
            "date": datetime(2023, 12, 1),
            "open": Decimal("2800.00"),
            "high": Decimal("2850.00"),
            "low": Decimal("2780.00"),
            "close": Decimal("2820.00"),
            "volume": 1500000
        }
        
        history = PriceHistoryItem(**data)
        assert history.stock_code == "7203"
        assert history.open == Decimal("2800.00")

    def test_price_relationships(self):
        """価格の関係性検証"""
        # high >= open, close >= low などの関係は
        # ビジネスロジックレベルで検証されるべき
        # ここでは基本的なバリデーションのみテスト
        
        data = {
            "stock_code": "7203",
            "date": datetime(2023, 12, 1),
            "open": Decimal("2800.00"),
            "high": Decimal("2700.00"),  # high < open (異常だが技術的には可能)
            "low": Decimal("2900.00"),   # low > high (異常だが技術的には可能) 
            "close": Decimal("2820.00"),
            "volume": 1500000
        }
        
        # 基本的なPydanticバリデーションは通る
        history = PriceHistoryItem(**data)
        assert history.stock_code == "7203"


class TestDecimalFieldValidation:
    """Decimal型フィールドの精度テスト"""

    def test_decimal_precision(self):
        """小数点以下の精度テスト"""
        # 高精度のDecimal値
        data = {
            "stock_code": "7203",
            "company_name": "Test Company",
            "current_price": Decimal("2800.123456"),
            "previous_close": Decimal("2750.654321"),
            "price_change": Decimal("49.469135"),
            "price_change_pct": Decimal("1.798876"),
            "volume": 1000000
        }
        
        stock = StockData(**data)
        # Decimal値が保持されることを確認
        assert isinstance(stock.current_price, Decimal)
        assert stock.current_price == Decimal("2800.123456")

    def test_float_to_decimal_conversion(self):
        """float値からDecimal変換"""
        data = {
            "stock_code": "7203",
            "company_name": "Test Company",
            "current_price": 2800.50,  # float
            "previous_close": 2750.00,  # float
            "price_change": 50.50,      # float
            "price_change_pct": 1.84,   # float
            "volume": 1000000
        }
        
        stock = StockData(**data)
        # float値がDecimalに変換されることを確認
        assert isinstance(stock.current_price, Decimal)
        assert stock.current_price == Decimal("2800.5")


class TestDateTimeValidation:
    """datetime型フィールドの検証テスト"""

    def test_datetime_fields(self):
        """datetime型フィールドの処理"""
        specific_time = datetime(2023, 12, 1, 15, 30, 0)
        
        data = {
            "stock_code": "7203",
            "date": specific_time,
            "open": Decimal("2800.00"),
            "high": Decimal("2850.00"),
            "low": Decimal("2780.00"),
            "close": Decimal("2820.00"),
            "volume": 1500000
        }
        
        history = PriceHistoryItem(**data)
        assert history.date == specific_time

    def test_current_price_timestamp_default(self):
        """CurrentPriceのtimestampデフォルト値"""
        data = {
            "stock_code": "7203",
            "company_name": "Toyota Motor Corporation",
            "current_price": Decimal("2800.50"),
            "previous_close": Decimal("2750.00"),
            "price_change": Decimal("50.50"),
            "price_change_pct": Decimal("1.84"),
            "volume": 1000000
        }
        
        before_creation = datetime.utcnow()
        price = CurrentPrice(**data)
        after_creation = datetime.utcnow()
        
        # timestampがデフォルト値で設定されていることを確認
        assert before_creation <= price.timestamp <= after_creation


class TestModelSerialization:
    """モデルのシリアライゼーションテスト"""

    def test_json_serialization(self):
        """JSON形式でのシリアライゼーション"""
        data = {
            "stock_code": "7203",
            "company_name": "Toyota Motor Corporation",
            "current_price": Decimal("2800.50"),
            "previous_close": Decimal("2750.00"),
            "price_change": Decimal("50.50"),
            "price_change_pct": Decimal("1.84"),
            "volume": 1000000,
            "market_cap": Decimal("37000000000000")
        }
        
        price = CurrentPrice(**data)
        json_data = price.model_dump()
        
        # Decimal値がfloatに変換されることを確認
        assert isinstance(json_data["current_price"], float)
        assert json_data["current_price"] == 2800.5

    def test_dict_conversion(self):
        """辞書形式への変換"""
        data = {
            "stock_code": "7203",
            "company_name": "Toyota Motor Corporation",
            "current_price": Decimal("2800.50"),
            "previous_close": Decimal("2750.00"),
            "price_change": Decimal("50.50"),
            "price_change_pct": Decimal("1.84"),
            "volume": 1000000
        }
        
        stock = StockData(**data)
        dict_data = stock.model_dump()
        
        assert dict_data["stock_code"] == "7203"
        assert dict_data["company_name"] == "Toyota Motor Corporation"
        assert isinstance(dict_data["current_price"], float)