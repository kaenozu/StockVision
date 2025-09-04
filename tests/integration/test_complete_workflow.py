"""
Complete workflow integration tests.

Tests the full workflow:
1. Initialize database
2. Add stock data via API
3. Query via CLI  
4. Add to watchlist via CLI
5. Verify data persistence
"""
import asyncio
import os
import pytest
import tempfile
import shutil
import subprocess
import sys
import json
import time
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import text
from unittest.mock import patch, AsyncMock

from src.main import app
from src.stock_storage.database import DatabaseConfig, DatabaseManager
from src.models.stock import Stock
from src.models.watchlist import Watchlist
from src.models.price_history import PriceHistory


class TestCompleteWorkflow:
    """Test complete workflow from API to CLI integration."""
    
    @classmethod
    def setup_class(cls):
        """Set up test environment."""
        # Create temporary database
        cls.temp_dir = tempfile.mkdtemp()
        cls.test_db_path = Path(cls.temp_dir) / "test_workflow.db"
        cls.db_config = DatabaseConfig(db_path=str(cls.test_db_path))
        cls.db_manager = DatabaseManager(cls.db_config)
        
        # Initialize database
        cls.db_manager.init_db()
        
        # Override the global database manager for testing
        import src.stock_storage.database as db_module
        db_module._db_manager = cls.db_manager
        
        # Create test client
        cls.client = TestClient(app)
        
        # Mock Yahoo Finance client to avoid external API calls
        cls.mock_yahoo_data = {
            "7203": {
                "stock_code": "7203",
                "company_name": "Toyota Motor Corporation",
                "current_price": Decimal("2500.00"),
                "previous_close": Decimal("2450.00"),
                "price_change": Decimal("50.00"),
                "price_change_pct": Decimal("2.04"),
                "volume": 1000000,
                "market_cap": Decimal("30000000000.00")
            }
        }
    
    @classmethod
    def teardown_class(cls):
        """Clean up test resources."""
        if hasattr(cls, 'db_manager'):
            cls.db_manager.close()
        if hasattr(cls, 'temp_dir'):
            shutil.rmtree(cls.temp_dir, ignore_errors=True)
    
    def setup_method(self):
        """Clean database before each test."""
        with self.db_manager.session_scope() as session:
            session.query(PriceHistory).delete()
            session.query(Watchlist).delete()
            session.query(Stock).delete()
            session.commit()
    
    def test_step1_initialize_database(self):
        """Step 1: Initialize database."""
        # Database should be already initialized
        assert self.test_db_path.exists()
        
        # Test database connectivity
        response = self.client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"]["healthy"] is True
        
        # Verify tables exist
        with self.db_manager.session_scope() as session:
            tables_query = text("SELECT name FROM sqlite_master WHERE type='table'")
            tables = session.execute(tables_query).fetchall()
            table_names = [table[0] for table in tables]
            
            expected_tables = {'stocks', 'watchlist', 'price_history'}
            assert expected_tables.issubset(set(table_names))
    
    def test_step2_add_stock_data_via_api(self):
        """Step 2: Add stock data via API."""
        # Mock Yahoo Finance to avoid external API calls
        with patch('src.stock_api.yahoo_client.YahooClient') as mock_yahoo:
            mock_instance = AsyncMock()
            mock_yahoo.return_value.__aenter__.return_value = mock_instance
            
            # Mock stock data response
            class MockStockData:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                
                def to_stock_model(self):
                    return Stock(
                        stock_code=self.stock_code,
                        company_name=self.company_name,
                        current_price=self.current_price,
                        previous_close=self.previous_close,
                        price_change=self.price_change,
                        price_change_pct=self.price_change_pct,
                        volume=self.volume,
                        market_cap=self.market_cap,
                        created_at=datetime.utcnow()
                    )
            
            mock_instance.get_stock_data.return_value = MockStockData(self.mock_yahoo_data["7203"])
            
            # Add stock via API
            response = self.client.get("/stocks/7203")
            assert response.status_code == 200
            
            data = response.json()
            assert data["stock_code"] == "7203"
            assert data["company_name"] == "Toyota Motor Corporation"
            assert float(data["current_price"]) == 2500.00
        
        # Verify data was saved to database
        with self.db_manager.session_scope() as session:
            stock = session.query(Stock).filter(Stock.stock_code == "7203").first()
            assert stock is not None
            assert stock.company_name == "Toyota Motor Corporation"
            assert stock.current_price == Decimal("2500.00")
    
    def test_step3_query_via_cli(self):
        """Step 3: Query stock data via CLI."""
        # First add stock data
        with self.db_manager.session_scope() as session:
            stock = Stock(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2500.00"),
                previous_close=Decimal("2450.00"),
                price_change=Decimal("50.00"),
                price_change_pct=Decimal("2.04"),
                volume=1000000,
                market_cap=Decimal("30000000000.00"),
                created_at=datetime.utcnow()
            )
            session.add(stock)
            session.commit()
        
        # Test CLI query command (simulated)
        # In a real test, we would run: python -m src.stock_cli search 7203 --format json
        # For now, we test the underlying functionality
        
        from src.stock_storage.storage_service import StockStorageService
        storage = StockStorageService()
        
        # Override the storage service to use our test database
        storage._db_manager = self.db_manager
        
        # Query stock data
        stock_data = storage.get_stock("7203")
        assert stock_data is not None
        assert stock_data.stock_code == "7203"
        assert stock_data.company_name == "Toyota Motor Corporation"
        assert stock_data.current_price == Decimal("2500.00")
    
    def test_step4_add_to_watchlist_via_cli(self):
        """Step 4: Add stock to watchlist via CLI."""
        # First add stock data
        with self.db_manager.session_scope() as session:
            stock = Stock(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2500.00"),
                created_at=datetime.utcnow()
            )
            session.add(stock)
            session.commit()
        
        # Test CLI watchlist add command functionality
        from src.stock_storage.storage_service import StockStorageService
        storage = StockStorageService()
        storage._db_manager = self.db_manager
        
        # Add to watchlist (simulating CLI command)
        watchlist_item = storage.create_watchlist_item(
            stock_code="7203",
            notes="Added via CLI test",
            alert_price_high=Decimal("3000.00"),
            alert_price_low=Decimal("2000.00")
        )
        
        assert watchlist_item is not None
        assert watchlist_item.stock_code == "7203"
        assert watchlist_item.notes == "Added via CLI test"
        assert watchlist_item.alert_price_high == Decimal("3000.00")
    
    def test_step5_verify_data_persistence(self):
        """Step 5: Verify data persistence across operations."""
        # Add stock via API
        with self.db_manager.session_scope() as session:
            stock = Stock(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2500.00"),
                created_at=datetime.utcnow()
            )
            session.add(stock)
            session.commit()
        
        # Add to watchlist via API
        watchlist_data = {
            "stock_code": "7203",
            "notes": "Integration test stock",
            "alert_price_high": 3000.00
        }
        response = self.client.post("/watchlist", json=watchlist_data)
        assert response.status_code == 201
        watchlist_id = response.json()["id"]
        
        # Add price history
        with self.db_manager.session_scope() as session:
            history = PriceHistory(
                stock_code="7203",
                date=date(2024, 1, 1),
                open_price=Decimal("2400.00"),
                high_price=Decimal("2550.00"),
                low_price=Decimal("2350.00"),
                close_price=Decimal("2500.00"),
                volume=1500000,
                adj_close=Decimal("2500.00")
            )
            session.add(history)
            session.commit()
        
        # Close and reopen database connection to test persistence
        self.db_manager.close()
        self.db_manager = DatabaseManager(self.db_config)
        
        # Override the global database manager again
        import src.stock_storage.database as db_module
        db_module._db_manager = self.db_manager
        
        # Verify all data persists
        with self.db_manager.session_scope() as session:
            # Check stock
            stock = session.query(Stock).filter(Stock.stock_code == "7203").first()
            assert stock is not None
            assert stock.company_name == "Toyota Motor Corporation"
            
            # Check watchlist
            watchlist_item = session.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
            assert watchlist_item is not None
            assert watchlist_item.stock_code == "7203"
            assert watchlist_item.notes == "Integration test stock"
            
            # Check price history
            history_item = session.query(PriceHistory).filter(
                PriceHistory.stock_code == "7203",
                PriceHistory.date == date(2024, 1, 1)
            ).first()
            assert history_item is not None
            assert history_item.close_price == Decimal("2500.00")
    
    def test_complete_workflow_integration(self):
        """Test complete workflow from start to finish."""
        # Step 1: Initialize database (already done in setup)
        response = self.client.get("/health")
        assert response.status_code == 200
        
        # Step 2: Add stock data via API
        with patch('src.stock_api.yahoo_client.YahooClient') as mock_yahoo:
            mock_instance = AsyncMock()
            mock_yahoo.return_value.__aenter__.return_value = mock_instance
            
            class MockStockData:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                
                def to_stock_model(self):
                    return Stock(
                        stock_code=self.stock_code,
                        company_name=self.company_name,
                        current_price=self.current_price,
                        previous_close=self.previous_close,
                        price_change=self.price_change,
                        price_change_pct=self.price_change_pct,
                        volume=self.volume,
                        market_cap=self.market_cap,
                        created_at=datetime.utcnow()
                    )
            
            mock_instance.get_stock_data.return_value = MockStockData(self.mock_yahoo_data["7203"])
            
            # Add stock
            response = self.client.get("/stocks/7203")
            assert response.status_code == 200
        
        # Step 3: Query via storage service (simulating CLI)
        from src.stock_storage.storage_service import StockStorageService
        storage = StockStorageService()
        storage._db_manager = self.db_manager
        
        stock_data = storage.get_stock("7203")
        assert stock_data.company_name == "Toyota Motor Corporation"
        
        # Step 4: Add to watchlist via API (simulating CLI)
        watchlist_data = {
            "stock_code": "7203", 
            "notes": "Complete workflow test"
        }
        response = self.client.post("/watchlist", json=watchlist_data)
        assert response.status_code == 201
        
        # Step 5: Verify all operations
        response = self.client.get("/watchlist")
        assert response.status_code == 200
        watchlist = response.json()
        assert len(watchlist) == 1
        assert watchlist[0]["stock_code"] == "7203"
        assert watchlist[0]["notes"] == "Complete workflow test"
        
        # Verify data integrity
        with self.db_manager.session_scope() as session:
            stock_count = session.query(Stock).count()
            watchlist_count = session.query(Watchlist).count()
            
            assert stock_count == 1
            assert watchlist_count == 1
    
    def test_api_cli_data_consistency(self):
        """Test data consistency between API and CLI operations."""
        # Add stock via API
        with patch('src.stock_api.yahoo_client.YahooClient') as mock_yahoo:
            mock_instance = AsyncMock()
            mock_yahoo.return_value.__aenter__.return_value = mock_instance
            
            class MockStockData:
                def __init__(self, data):
                    for key, value in data.items():
                        setattr(self, key, value)
                
                def to_stock_model(self):
                    return Stock(
                        stock_code=self.stock_code,
                        company_name=self.company_name,
                        current_price=self.current_price,
                        previous_close=self.previous_close,
                        price_change=self.price_change,
                        price_change_pct=self.price_change_pct,
                        volume=self.volume,
                        market_cap=self.market_cap,
                        created_at=datetime.utcnow()
                    )
            
            mock_instance.get_stock_data.return_value = MockStockData(self.mock_yahoo_data["7203"])
            
            # Add via API
            response = self.client.get("/stocks/7203")
            api_data = response.json()
        
        # Query via storage service (CLI backend)
        from src.stock_storage.storage_service import StockStorageService
        storage = StockStorageService()
        storage._db_manager = self.db_manager
        
        stock_model = storage.get_stock("7203")
        
        # Verify consistency
        assert api_data["stock_code"] == stock_model.stock_code
        assert api_data["company_name"] == stock_model.company_name
        assert float(api_data["current_price"]) == float(stock_model.current_price)
        
        # Add to watchlist via API
        watchlist_data = {"stock_code": "7203", "notes": "API added"}
        response = self.client.post("/watchlist", json=watchlist_data)
        api_watchlist = response.json()
        
        # Query via storage service
        watchlist_items = storage.get_watchlist()
        cli_watchlist = watchlist_items[0]
        
        # Verify consistency
        assert api_watchlist["stock_code"] == cli_watchlist.stock_code
        assert api_watchlist["notes"] == cli_watchlist.notes
        assert api_watchlist["id"] == cli_watchlist.id
    
    def test_error_handling_across_layers(self):
        """Test error handling consistency across API and CLI layers."""
        # Test invalid stock code via API
        response = self.client.get("/stocks/invalid")
        assert response.status_code == 400
        error_data = response.json()
        assert "error" in error_data
        assert "request_id" in error_data["error"]
        
        # Test same error via storage service (CLI backend) 
        from src.stock_storage.storage_service import StockStorageService
        storage = StockStorageService()
        storage._db_manager = self.db_manager
        
        from src.stock_storage.storage_service import StockNotFoundError
        with pytest.raises(StockNotFoundError):
            storage.get_stock("9999")
        
        # Test invalid watchlist data
        invalid_watchlist = {"stock_code": "invalid"}
        response = self.client.post("/watchlist", json=invalid_watchlist)
        assert response.status_code == 422
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])