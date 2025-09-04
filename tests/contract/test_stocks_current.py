"""
Contract test for GET /stocks/{stock_code}/current endpoint

This test MUST FAIL initially as the implementation doesn't exist yet (TDD principle).
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
from src.main import app  # This import will fail - no implementation yet


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.mark.contract
class TestStocksCurrent:
    """Contract tests for GET /stocks/{stock_code}/current endpoint"""

    def test_get_current_price_success_response_structure(self, client):
        """Test successful current price retrieval has correct structure"""
        stock_code = "7203"
        response = client.get(f"/stocks/{stock_code}/current")
        
        assert response.status_code == 200
        
        data = response.json()
        # Required fields according to OpenAPI contract CurrentPrice schema
        assert "stock_code" in data
        assert "price" in data
        assert "change" in data
        assert "change_pct" in data
        
        # Validate data types
        assert isinstance(data["stock_code"], str)
        assert isinstance(data["price"], (int, float))
        assert isinstance(data["change"], (int, float))
        assert isinstance(data["change_pct"], (int, float))
        
        # Validate stock code format
        assert len(data["stock_code"]) == 4
        assert data["stock_code"].isdigit()
        
        # Price should be positive or zero
        assert data["price"] >= 0
        
    def test_get_current_price_optional_timestamp_field(self, client):
        """Test optional timestamp field when present"""
        response = client.get("/stocks/7203/current")
        
        if response.status_code == 200:
            data = response.json()
            
            if "timestamp" in data:
                assert isinstance(data["timestamp"], str)
                # Should be a valid ISO datetime format
                try:
                    datetime.fromisoformat(data["timestamp"].replace('Z', '+00:00'))
                except ValueError:
                    pytest.fail("timestamp field is not in valid ISO format")
    
    def test_get_current_price_stock_code_validation(self, client):
        """Test stock code validation in path parameter"""
        invalid_codes = ["123", "12345", "abcd", "7203a", ""]
        
        for code in invalid_codes:
            response = client.get(f"/stocks/{code}/current")
            # Should return 400, 404, or 422 for invalid format
            assert response.status_code in [400, 404, 422]
    
    def test_get_current_price_valid_stock_code_format(self, client):
        """Test valid 4-digit stock code format"""
        valid_codes = ["7203", "4689", "1000", "9999"]
        
        for code in valid_codes:
            response = client.get(f"/stocks/{code}/current")
            
            # Response should be 200 (if stock exists) or 404 (if not found)
            # But not 400/422 for valid format
            assert response.status_code in [200, 404]
            
            if response.status_code == 200:
                data = response.json()
                assert data["stock_code"] == code
    
    def test_get_current_price_content_type(self, client):
        """Test response content type is application/json"""
        response = client.get("/stocks/7203/current")
        
        if response.status_code == 200:
            assert response.headers["content-type"] == "application/json"
    
    def test_get_current_price_stock_code_in_path_matches_response(self, client):
        """Test that stock_code in path matches response data"""
        stock_code = "7203"
        response = client.get(f"/stocks/{stock_code}/current")
        
        if response.status_code == 200:
            data = response.json()
            assert data["stock_code"] == stock_code
    
    def test_get_current_price_change_calculation_consistency(self, client):
        """Test that change percentage calculation is consistent"""
        response = client.get("/stocks/7203/current")
        
        if response.status_code == 200:
            data = response.json()
            price = data["price"]
            change = data["change"]
            change_pct = data["change_pct"]
            
            # If we have all values, verify percentage calculation
            if price > 0 and change != 0:
                previous_price = price - change
                if previous_price > 0:
                    calculated_pct = (change / previous_price) * 100
                    # Allow for small floating point differences
                    assert abs(calculated_pct - change_pct) < 0.01
    
    def test_get_current_price_non_existent_stock(self, client):
        """Test response for non-existent stock code"""
        # Using a stock code that likely doesn't exist
        stock_code = "0001"
        response = client.get(f"/stocks/{stock_code}/current")
        
        # Should return 404 for non-existent stock
        assert response.status_code in [404]
    
    @pytest.mark.parametrize("stock_code", ["7203", "4689", "1000", "9999"])
    def test_get_current_price_various_stocks(self, client, stock_code):
        """Test current price endpoint with various stock codes"""
        response = client.get(f"/stocks/{stock_code}/current")
        
        # Response should be either 200 (found) or 404 (not found)
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            # Verify required fields are present
            required_fields = ["stock_code", "price", "change", "change_pct"]
            for field in required_fields:
                assert field in data, f"Required field {field} missing in response"
            
            # Verify stock code matches
            assert data["stock_code"] == stock_code
            
            # Verify data types
            assert isinstance(data["price"], (int, float))
            assert isinstance(data["change"], (int, float))
            assert isinstance(data["change_pct"], (int, float))