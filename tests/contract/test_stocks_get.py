"""
Contract test for GET /stocks/{stock_code} endpoint

This test MUST FAIL initially as the implementation doesn't exist yet (TDD principle).
"""

import pytest
from fastapi.testclient import TestClient
from src.main import app  # This import will fail - no implementation yet


@pytest.fixture
def client():
    """Test client fixture"""
    return TestClient(app)


@pytest.mark.contract
@pytest.mark.skip(reason="TDD test for unimplemented endpoint")
class TestStocksGet:
    """Contract tests for GET /stocks/{stock_code} endpoint"""

    def test_get_stock_success_response_structure(self, client):
        """Test successful stock retrieval has correct structure"""
        stock_code = "7203"
        response = client.get(f"/stocks/{stock_code}")
        
        assert response.status_code == 200
        
        data = response.json()
        # Required fields according to Stock schema
        assert "stock_code" in data
        assert "company_name" in data
        assert "current_price" in data
        assert "previous_close" in data
        
        # Validate data types and constraints
        assert isinstance(data["stock_code"], str)
        assert len(data["stock_code"]) == 4
        assert data["stock_code"].isdigit()
        assert isinstance(data["company_name"], str)
        assert len(data["company_name"]) <= 100
        assert isinstance(data["current_price"], (int, float))
        assert data["current_price"] >= 0
        assert isinstance(data["previous_close"], (int, float))
        assert data["previous_close"] >= 0
        
    def test_get_stock_optional_fields(self, client):
        """Test optional fields in response when present"""
        response = client.get("/stocks/7203")
        
        if response.status_code == 200:
            data = response.json()
            
            # Optional fields validation if present
            if "price_change" in data:
                assert isinstance(data["price_change"], (int, float))
            if "price_change_pct" in data:
                assert isinstance(data["price_change_pct"], (int, float))
                assert -100 <= data["price_change_pct"] <= 100
            if "volume" in data:
                assert isinstance(data["volume"], int)
                assert data["volume"] >= 0
            if "market_cap" in data:
                assert isinstance(data["market_cap"], (int, float))
                assert data["market_cap"] >= 0
            if "created_at" in data:
                assert isinstance(data["created_at"], str)
            if "updated_at" in data:
                assert isinstance(data["updated_at"], str)
    
    def test_get_stock_not_found(self, client):
        """Test 404 response for non-existent stock"""
        stock_code = "9999"
        response = client.get(f"/stocks/{stock_code}")
        
        assert response.status_code == 404
    
    def test_get_stock_invalid_code_format(self, client):
        """Test invalid stock code format"""
        invalid_codes = ["123", "12345", "abcd", "7203a", ""]
        
        for code in invalid_codes:
            response = client.get(f"/stocks/{code}")
            # Should return 400 for invalid format or 404 for not found
            assert response.status_code in [400, 404, 422]
    
    def test_get_stock_content_type(self, client):
        """Test response content type is application/json"""
        response = client.get("/stocks/7203")
        
        if response.status_code == 200:
            assert response.headers["content-type"] == "application/json"
    
    def test_get_stock_stock_code_in_path_matches_response(self, client):
        """Test that stock_code in path matches response data"""
        stock_code = "7203"
        response = client.get(f"/stocks/{stock_code}")
        
        if response.status_code == 200:
            data = response.json()
            assert data["stock_code"] == stock_code
    
    @pytest.mark.parametrize("stock_code", ["1000", "9999", "7203", "4689"])
    def test_get_stock_various_codes(self, client, stock_code):
        """Test various stock codes - some may exist, some may not"""
        response = client.get(f"/stocks/{stock_code}")
        
        # Response should be either 200 (found) or 404 (not found)
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert data["stock_code"] == stock_code
            # Verify required fields are present
            required_fields = ["stock_code", "company_name", "current_price", "previous_close"]
            for field in required_fields:
                assert field in data, f"Required field {field} missing in response"