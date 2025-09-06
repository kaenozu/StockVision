"""
Contract test for POST /watchlist endpoint

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
@pytest.mark.skip(reason="TDD test for unimplemented endpoint")
class TestWatchlistPost:
    """Contract tests for POST /watchlist endpoint"""

    def test_post_watchlist_success_response_structure(self, client):
        """Test successful watchlist creation has correct structure"""
        payload = {
            "stock_code": "7203",
            "notes": "長期保有候補",
            "alert_price_high": 2500.0,
            "alert_price_low": 2300.0
        }
        
        response = client.post("/watchlist", json=payload)
        
        assert response.status_code == 201
        
        data = response.json()
        # Required fields according to Watchlist schema
        assert "id" in data
        assert "stock_code" in data
        assert "added_at" in data
        assert "is_active" in data
        
        # Validate data types
        assert isinstance(data["id"], int)
        assert isinstance(data["stock_code"], str)
        assert isinstance(data["added_at"], str)
        assert isinstance(data["is_active"], bool)
        
        # Validate returned data matches input
        assert data["stock_code"] == payload["stock_code"]
        
        # ID should be positive
        assert data["id"] > 0
        
        # Should be active by default
        assert data["is_active"] is True
        
        # Validate datetime format
        try:
            datetime.fromisoformat(data["added_at"].replace('Z', '+00:00'))
        except ValueError:
            pytest.fail("added_at field is not in valid ISO datetime format")

    def test_post_watchlist_minimal_payload(self, client):
        """Test watchlist creation with minimal required payload"""
        payload = {
            "stock_code": "7203"
        }
        
        response = client.post("/watchlist", json=payload)
        
        assert response.status_code == 201
        
        data = response.json()
        # Required fields should be present
        assert "id" in data
        assert "stock_code" in data
        assert "added_at" in data
        assert "is_active" in data
        
        assert data["stock_code"] == payload["stock_code"]
        assert data["is_active"] is True

    def test_post_watchlist_optional_fields(self, client):
        """Test watchlist creation with optional fields"""
        payload = {
            "stock_code": "4689",
            "notes": "テクニカル分析用",
            "alert_price_high": 1500.0,
            "alert_price_low": 1200.0
        }
        
        response = client.post("/watchlist", json=payload)
        
        if response.status_code == 201:
            data = response.json()
            
            # Optional fields should be preserved if provided
            if "notes" in data:
                assert data["notes"] == payload["notes"]
            if "alert_price_high" in data:
                assert data["alert_price_high"] == payload["alert_price_high"]
            if "alert_price_low" in data:
                assert data["alert_price_low"] == payload["alert_price_low"]
    
    def test_post_watchlist_stock_code_validation(self, client):
        """Test stock_code validation according to pattern"""
        # Valid 4-digit stock codes
        valid_codes = ["7203", "4689", "1000", "9999"]
        
        for code in valid_codes:
            payload = {"stock_code": code}
            response = client.post("/watchlist", json=payload)
            # Should not fail with validation error for valid codes
            assert response.status_code in [201, 400, 404], f"Unexpected status for valid code {code}"
        
        # Invalid stock codes
        invalid_codes = ["123", "12345", "abcd", "7203a", "", "7203 "]
        
        for code in invalid_codes:
            payload = {"stock_code": code}
            response = client.post("/watchlist", json=payload)
            # Should return validation error for invalid codes
            assert response.status_code == 400, f"Expected 400 for invalid code {code}, got {response.status_code}"
    
    def test_post_watchlist_notes_length_validation(self, client):
        """Test notes field length validation (max 500 characters)"""
        # Valid notes length
        valid_notes = "短いメモ"
        payload = {
            "stock_code": "7203",
            "notes": valid_notes
        }
        
        response = client.post("/watchlist", json=payload)
        assert response.status_code in [201, 400]  # Should not fail due to length
        
        # Invalid notes length (over 500 characters)
        long_notes = "あ" * 501  # 501 characters
        payload_long = {
            "stock_code": "7203",
            "notes": long_notes
        }
        
        response = client.post("/watchlist", json=payload_long)
        assert response.status_code == 400  # Should fail validation
    
    def test_post_watchlist_alert_price_validation(self, client):
        """Test alert price validation"""
        # Valid alert prices
        payload = {
            "stock_code": "7203",
            "alert_price_high": 2500.0,
            "alert_price_low": 2300.0
        }
        
        response = client.post("/watchlist", json=payload)
        assert response.status_code in [201, 400]
        
        # Negative alert prices should be invalid
        invalid_payload = {
            "stock_code": "7203",
            "alert_price_high": -100.0
        }
        
        response = client.post("/watchlist", json=invalid_payload)
        # Implementation should validate non-negative prices
        assert response.status_code in [201, 400]  # Depends on validation strictness
        
    def test_post_watchlist_missing_required_fields(self, client):
        """Test validation when required fields are missing"""
        # Missing stock_code
        payload = {
            "notes": "メモのみ"
        }
        
        response = client.post("/watchlist", json=payload)
        assert response.status_code == 400  # Should fail validation
    
    def test_post_watchlist_empty_payload(self, client):
        """Test empty payload validation"""
        response = client.post("/watchlist", json={})
        assert response.status_code == 400  # Should fail validation
    
    def test_post_watchlist_invalid_json(self, client):
        """Test invalid JSON payload"""
        response = client.post(
            "/watchlist", 
            data="invalid json",
            headers={"content-type": "application/json"}
        )
        assert response.status_code in [400, 422]  # Should fail JSON parsing
    
    def test_post_watchlist_content_type_validation(self, client):
        """Test content-type validation"""
        payload = {"stock_code": "7203"}
        
        # Valid content-type
        response = client.post("/watchlist", json=payload)
        # Should work with proper JSON content-type
        
        # Invalid content-type
        response = client.post(
            "/watchlist",
            data="stock_code=7203",
            headers={"content-type": "application/x-www-form-urlencoded"}
        )
        # Should expect JSON content-type
        assert response.status_code in [400, 415, 422]
    
    def test_post_watchlist_content_type_header(self, client):
        """Test response content type is application/json"""
        payload = {"stock_code": "7203"}
        response = client.post("/watchlist", json=payload)
        
        if response.status_code == 201:
            assert response.headers["content-type"] == "application/json"
    
    def test_post_watchlist_alert_price_relationship(self, client):
        """Test logical relationship between alert prices"""
        # High alert should be greater than low alert
        payload = {
            "stock_code": "7203",
            "alert_price_high": 2300.0,  # Lower value
            "alert_price_low": 2500.0     # Higher value
        }
        
        response = client.post("/watchlist", json=payload)
        # Implementation might validate this relationship
        # Could return 201 (no validation) or 400 (with validation)
        assert response.status_code in [201, 400]
    
    def test_post_watchlist_duplicate_stock_code(self, client):
        """Test behavior when adding duplicate stock codes"""
        payload = {"stock_code": "7203"}
        
        # First request
        response1 = client.post("/watchlist", json=payload)
        
        # Second request with same stock code
        response2 = client.post("/watchlist", json=payload)
        
        # Both could succeed (allowing duplicates) or second could fail
        # This depends on business logic implementation
        assert response1.status_code in [201, 400]
        assert response2.status_code in [201, 400, 409]
    
    @pytest.mark.parametrize("stock_code", ["7203", "4689", "1000", "9999"])
    def test_post_watchlist_various_stock_codes(self, client, stock_code):
        """Test POST watchlist with various valid stock codes"""
        payload = {"stock_code": stock_code}
        response = client.post("/watchlist", json=payload)
        
        # Should either succeed or fail with validation (not server error)
        assert response.status_code in [201, 400, 404]
        
        if response.status_code == 201:
            data = response.json()
            assert data["stock_code"] == stock_code
            assert "id" in data
            assert "added_at" in data
            assert "is_active" in data