"""
Contract test for GET /stocks/{stock_code}/history endpoint

This test MUST FAIL initially as the implementation doesn't exist yet (TDD principle).
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, date
from src.main import app  # This import will fail - no implementation yet


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.mark.contract
class TestStocksHistory:
    """Contract tests for GET /stocks/{stock_code}/history endpoint"""

    def test_get_history_success_response_structure(self, client):
        """Test successful price history retrieval has correct structure"""
        stock_code = "7203"
        response = client.get(f"/stocks/{stock_code}/history")
        
        assert response.status_code == 200
        
        data = response.json()
        # Response should be an array
        assert isinstance(data, list)
        
        if data:  # If there's data, validate the structure
            item = data[0]
            # Required fields according to PriceHistory schema
            assert "date" in item
            assert "open_price" in item
            assert "high_price" in item
            assert "low_price" in item
            assert "close_price" in item
            assert "volume" in item
            
            # Validate data types
            assert isinstance(item["date"], str)
            assert isinstance(item["open_price"], (int, float))
            assert isinstance(item["high_price"], (int, float))
            assert isinstance(item["low_price"], (int, float))
            assert isinstance(item["close_price"], (int, float))
            assert isinstance(item["volume"], int)
            assert item["volume"] >= 0
            
            # Validate date format
            try:
                date.fromisoformat(item["date"])
            except ValueError:
                pytest.fail("date field is not in valid ISO date format (YYYY-MM-DD)")

    def test_get_history_optional_fields(self, client):
        """Test optional fields in response when present"""
        response = client.get("/stocks/7203/history")
        
        if response.status_code == 200:
            data = response.json()
            
            if data:  # If there's data, check optional fields
                item = data[0]
                if "adj_close" in item:
                    assert isinstance(item["adj_close"], (int, float))
                    
    def test_get_history_with_days_parameter(self, client):
        """Test history endpoint with days query parameter"""
        stock_code = "7203"
        days_values = [1, 7, 30, 90, 365]
        
        for days in days_values:
            response = client.get(f"/stocks/{stock_code}/history?days={days}")
            
            # Should return 200 if stock exists, 404 if not
            assert response.status_code in [200, 404]
            
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list)
                # Should not return more days than requested (but could be less)
                assert len(data) <= days
    
    def test_get_history_days_parameter_validation(self, client):
        """Test days parameter validation (1-365 range)"""
        stock_code = "7203"
        
        # Valid values
        valid_days = [1, 30, 100, 365]
        for days in valid_days:
            response = client.get(f"/stocks/{stock_code}/history?days={days}")
            # Should not return 400 for valid days parameter
            assert response.status_code in [200, 404]
        
        # Invalid values (should return 400 or 422)
        invalid_days = [0, -1, 366, 1000, "abc"]
        for days in invalid_days:
            response = client.get(f"/stocks/{stock_code}/history?days={days}")
            # Should return validation error for invalid days
            assert response.status_code in [400, 422]
    
    def test_get_history_default_days_parameter(self, client):
        """Test default days parameter (should default to 30)"""
        stock_code = "7203"
        
        # Request without days parameter
        response_default = client.get(f"/stocks/{stock_code}/history")
        response_explicit = client.get(f"/stocks/{stock_code}/history?days=30")
        
        if response_default.status_code == 200 and response_explicit.status_code == 200:
            # Both should return the same data (default is 30 days)
            data_default = response_default.json()
            data_explicit = response_explicit.json()
            
            # Should have similar number of records (allowing for some variation)
            assert len(data_default) == len(data_explicit)
    
    def test_get_history_stock_code_validation(self, client):
        """Test stock code validation"""
        invalid_codes = ["123", "12345", "abcd", "7203a", ""]
        
        for code in invalid_codes:
            response = client.get(f"/stocks/{code}/history")
            # Should return 400, 404, or 422 for invalid format
            assert response.status_code in [400, 404, 422]
    
    def test_get_history_price_relationships(self, client):
        """Test logical relationships between OHLC prices"""
        response = client.get("/stocks/7203/history?days=1")
        
        if response.status_code == 200:
            data = response.json()
            
            for item in data:
                open_price = item["open_price"]
                high_price = item["high_price"]
                low_price = item["low_price"]
                close_price = item["close_price"]
                
                # High should be >= all other prices
                assert high_price >= open_price
                assert high_price >= close_price
                assert high_price >= low_price
                
                # Low should be <= all other prices  
                assert low_price <= open_price
                assert low_price <= close_price
                assert low_price <= high_price
                
                # All prices should be positive
                assert open_price >= 0
                assert high_price >= 0
                assert low_price >= 0
                assert close_price >= 0
    
    def test_get_history_content_type(self, client):
        """Test response content type is application/json"""
        response = client.get("/stocks/7203/history")
        
        if response.status_code == 200:
            assert response.headers["content-type"] == "application/json"
    
    def test_get_history_chronological_order(self, client):
        """Test that history data is in chronological order"""
        response = client.get("/stocks/7203/history?days=30")
        
        if response.status_code == 200:
            data = response.json()
            
            if len(data) > 1:
                dates = [datetime.fromisoformat(item["date"]) for item in data]
                
                # Data should be sorted (either ascending or descending)
                is_ascending = all(dates[i] <= dates[i+1] for i in range(len(dates)-1))
                is_descending = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
                
                assert is_ascending or is_descending, "History data should be sorted chronologically"
    
    def test_get_history_non_existent_stock(self, client):
        """Test response for non-existent stock code"""
        stock_code = "0001"
        response = client.get(f"/stocks/{stock_code}/history")
        
        # Should return 404 for non-existent stock
        assert response.status_code == 404
    
    @pytest.mark.parametrize("stock_code", ["7203", "4689", "1000", "9999"])  
    def test_get_history_various_stocks(self, client, stock_code):
        """Test history endpoint with various stock codes"""
        response = client.get(f"/stocks/{stock_code}/history")
        
        # Response should be either 200 (found) or 404 (not found)
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            
            if data:  # If there's data, verify structure
                required_fields = ["date", "open_price", "high_price", "low_price", "close_price", "volume"]
                for field in required_fields:
                    assert field in data[0], f"Required field {field} missing in response"