"""
Complete integration tests for stock tracking application.

This module tests the full workflow from database initialization
to API operations and CLI commands.
"""
import asyncio
import os
import pytest
import tempfile
import shutil
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from src.main import app
from src.stock_storage.database import DatabaseConfig, DatabaseManager, get_session_scope
from src.models.stock import Base, Stock
from src.models.watchlist import Watchlist
from src.models.price_history import PriceHistory


class TestCompleteIntegration:
    """Complete integration tests for the entire application."""
    
    @classmethod
    def setup_class(cls):
        """Set up test database and client."""
        # Create temporary database
        cls.temp_dir = tempfile.mkdtemp()
        cls.test_db_path = Path(cls.temp_dir) / "test_stock.db"
        cls.db_config = DatabaseConfig(db_path=str(cls.test_db_path))
        cls.db_manager = DatabaseManager(cls.db_config)
        
        # Initialize database
        cls.db_manager.init_db()
        
        # Override the global database manager for testing
        import src.stock_storage.database as db_module
        db_module._db_manager = cls.db_manager
        
        # Create test client
        cls.client = TestClient(app)
    
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
    
    def test_database_initialization(self):
        """Test database initialization and connectivity."""
        # Check if database file exists
        assert self.test_db_path.exists()
        
        # Test basic database operations
        with self.db_manager.session_scope() as session:
            # Should be able to execute a simple query
            result = session.execute(text("SELECT 1")).scalar()
            assert result == 1
            
            # Check that tables exist
            tables = session.execute(
                text("SELECT name FROM sqlite_master WHERE type='table'")
            ).fetchall()
            table_names = [table[0] for table in tables]
            
            expected_tables = {'stocks', 'watchlist', 'price_history'}
            assert expected_tables.issubset(set(table_names))
    
    def test_health_endpoint(self):
        """Test health check endpoint."""
        response = self.client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"]["healthy"] is True
        assert "stats" in data["database"]
    
    def test_stock_api_endpoints(self):
        """Test stock API endpoints with database operations."""
        # First, manually insert a stock for testing
        with self.db_manager.session_scope() as session:
            test_stock = Stock(
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
            session.add(test_stock)
            session.commit()
        
        # Test GET /stocks/{stock_code}
        response = self.client.get("/stocks/7203")
        assert response.status_code == 200
        
        data = response.json()
        assert data["stock_code"] == "7203"
        assert data["company_name"] == "Toyota Motor Corporation"
        assert float(data["current_price"]) == 2500.00
        
        # Test invalid stock code
        response = self.client.get("/stocks/999")
        assert response.status_code == 400  # Invalid format
        
        # Test non-existent stock code
        response = self.client.get("/stocks/9999")
        assert response.status_code == 404
    
    def test_stock_current_price_endpoint(self):
        """Test current price endpoint."""
        # Insert test stock
        with self.db_manager.session_scope() as session:
            test_stock = Stock(
                stock_code="7203",
                company_name="Toyota Motor Corporation", 
                current_price=Decimal("2500.00"),
                previous_close=Decimal("2450.00"),
                price_change=Decimal("50.00"),
                price_change_pct=Decimal("2.04"),
                volume=1000000,
                created_at=datetime.utcnow()
            )
            session.add(test_stock)
            session.commit()
        
        # Test current price endpoint
        response = self.client.get("/stocks/7203/current")
        assert response.status_code == 200
        
        data = response.json()
        assert data["stock_code"] == "7203"
        assert float(data["current_price"]) == 2500.00
    
    def test_stock_history_endpoint(self):
        """Test price history endpoint."""
        # Insert test stock
        with self.db_manager.session_scope() as session:
            test_stock = Stock(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2500.00"),
                created_at=datetime.utcnow()
            )
            session.add(test_stock)
            
            # Add price history
            history_items = [
                PriceHistory(
                    stock_code="7203",
                    date=date(2024, 1, 1),
                    open_price=Decimal("2400.00"),
                    high_price=Decimal("2520.00"),
                    low_price=Decimal("2380.00"),
                    close_price=Decimal("2500.00"),
                    volume=1000000,
                    adj_close=Decimal("2500.00")
                ),
                PriceHistory(
                    stock_code="7203",
                    date=date(2024, 1, 2),
                    open_price=Decimal("2500.00"),
                    high_price=Decimal("2550.00"),
                    low_price=Decimal("2480.00"),
                    close_price=Decimal("2530.00"),
                    volume=1200000,
                    adj_close=Decimal("2530.00")
                )
            ]
            session.add_all(history_items)
            session.commit()
        
        # Test history endpoint
        response = self.client.get("/stocks/7203/history?days=30")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 2
        assert data[0]["stock_code"] == "7203"
        assert float(data[0]["close_price"]) == 2530.00  # Latest first
    
    def test_watchlist_endpoints(self):
        """Test watchlist API endpoints."""
        # Test GET empty watchlist
        response = self.client.get("/watchlist")
        assert response.status_code == 200
        assert response.json() == []
        
        # Test POST add to watchlist
        watchlist_data = {
            "stock_code": "7203",
            "notes": "Toyota stock",
            "alert_price_high": 3000.00,
            "alert_price_low": 2000.00
        }
        
        response = self.client.post("/watchlist", json=watchlist_data)
        assert response.status_code == 201
        
        data = response.json()
        assert data["stock_code"] == "7203"
        assert data["notes"] == "Toyota stock"
        assert float(data["alert_price_high"]) == 3000.00
        watchlist_id = data["id"]
        
        # Test GET watchlist with items
        response = self.client.get("/watchlist")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["stock_code"] == "7203"
        
        # Test POST duplicate entry
        response = self.client.post("/watchlist", json=watchlist_data)
        assert response.status_code == 409
        
        # Test DELETE watchlist item
        response = self.client.delete(f"/watchlist/{watchlist_id}")
        assert response.status_code == 204
        
        # Test GET after delete
        response = self.client.get("/watchlist")
        assert response.status_code == 200
        assert response.json() == []
    
    def test_data_persistence(self):
        """Test data persistence across operations."""
        # Add stock via database
        with self.db_manager.session_scope() as session:
            test_stock = Stock(
                stock_code="7203",
                company_name="Toyota Motor Corporation",
                current_price=Decimal("2500.00"),
                created_at=datetime.utcnow()
            )
            session.add(test_stock)
            session.commit()
        
        # Add to watchlist via API
        watchlist_data = {
            "stock_code": "7203",
            "notes": "Added via API"
        }
        response = self.client.post("/watchlist", json=watchlist_data)
        assert response.status_code == 201
        watchlist_id = response.json()["id"]
        
        # Verify data persists after closing session
        self.db_manager.close()
        self.db_manager = DatabaseManager(self.db_config)
        
        # Override the global database manager again
        import src.stock_storage.database as db_module
        db_module._db_manager = self.db_manager
        
        # Verify stock exists
        with self.db_manager.session_scope() as session:
            stock = session.query(Stock).filter(Stock.stock_code == "7203").first()
            assert stock is not None
            assert stock.company_name == "Toyota Motor Corporation"
            
            # Verify watchlist exists
            watchlist_item = session.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
            assert watchlist_item is not None
            assert watchlist_item.stock_code == "7203"
            assert watchlist_item.notes == "Added via API"
    
    def test_error_handling(self):
        """Test error handling and response format."""
        # Test invalid stock code format
        response = self.client.get("/stocks/abc")
        assert response.status_code == 400
        
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == 400
        assert "request_id" in error_data["error"]
        assert "timestamp" in error_data["error"]
        
        # Test invalid watchlist data
        invalid_data = {
            "stock_code": "abc",  # Invalid format
            "alert_price_high": -100  # Invalid negative price
        }
        
        response = self.client.post("/watchlist", json=invalid_data)
        assert response.status_code == 422
        
        error_data = response.json()
        assert "error" in error_data
        assert error_data["error"]["code"] == 422
        assert "details" in error_data["error"]
    
    def test_request_logging(self):
        """Test that requests are properly logged."""
        # This test would typically verify log output
        # For now, we just ensure requests complete successfully
        # with logging middleware active
        
        response = self.client.get("/")
        assert response.status_code == 200
        
        # Check response headers added by middleware
        assert "X-Request-ID" in response.headers
        assert "X-Response-Time" in response.headers
    
    def test_concurrent_operations(self):
        """Test concurrent database operations."""
        def add_stock(stock_code: str, price: float):
            """Helper function to add stock."""
            with self.db_manager.session_scope() as session:
                stock = Stock(
                    stock_code=stock_code,
                    company_name=f"Company {stock_code}",
                    current_price=Decimal(str(price)),
                    previous_close=Decimal(str(price - 10)),
                    price_change=Decimal("10.00"),
                    price_change_pct=Decimal("1.00"),
                    volume=100000,
                    created_at=datetime.utcnow()
                )
                session.add(stock)
                session.commit()
        
        # Add multiple stocks concurrently
        import threading
        threads = []
        
        for i in range(5):
            thread = threading.Thread(
                target=add_stock,
                args=(f"120{i}", 1000.0 + i * 100)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all stocks were added
        with self.db_manager.session_scope() as session:
            count = session.query(Stock).count()
            assert count == 5
            
            stocks = session.query(Stock).all()
            stock_codes = [stock.stock_code for stock in stocks]
            expected_codes = [f"120{i}" for i in range(5)]
            assert set(stock_codes) == set(expected_codes)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])