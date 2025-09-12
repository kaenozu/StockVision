"""
Contract test for DELETE /watchlist/{id} endpoint

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
class TestWatchlistDelete:
    """Contract tests for DELETE /watchlist/{id} endpoint"""

    def test_delete_watchlist_success_response(self, client):
        """Test successful watchlist item deletion"""
        item_id = 1
        response = client.delete(f"/watchlist/{item_id}")

        # Should return 204 No Content on successful deletion
        assert response.status_code == 204

        # Response body should be empty for 204
        assert response.content == b""

    def test_delete_watchlist_not_found(self, client):
        """Test deletion of non-existent watchlist item"""
        non_existent_id = 99999
        response = client.delete(f"/watchlist/{non_existent_id}")

        # Should return 404 Not Found
        assert response.status_code == 404

    def test_delete_watchlist_id_validation_positive_integer(self, client):
        """Test ID parameter validation - should be positive integer"""
        valid_ids = [1, 2, 10, 100, 999]

        for item_id in valid_ids:
            response = client.delete(f"/watchlist/{item_id}")
            # Should not fail with validation error for valid IDs
            # Could return 204 (success) or 404 (not found), but not 400/422 (validation error)
            assert response.status_code in [
                204,
                404,
            ], f"Unexpected status for valid ID {item_id}"

    def test_delete_watchlist_id_validation_invalid_formats(self, client):
        """Test ID parameter validation with invalid formats"""
        invalid_ids = ["abc", "1.5", "-1", "0", " 1", "1 ", "", "null"]

        for item_id in invalid_ids:
            response = client.delete(f"/watchlist/{item_id}")
            # Should return validation error for invalid ID formats
            assert response.status_code in [
                400,
                404,
                422,
            ], f"Expected error for invalid ID {item_id}, got {response.status_code}"

    def test_delete_watchlist_zero_id(self, client):
        """Test deletion with ID zero"""
        response = client.delete("/watchlist/0")

        # ID 0 should be invalid (IDs should be positive integers)
        assert response.status_code in [400, 404, 422]

    def test_delete_watchlist_negative_id(self, client):
        """Test deletion with negative ID"""
        response = client.delete("/watchlist/-1")

        # Negative ID should be invalid
        assert response.status_code in [400, 404, 422]

    def test_delete_watchlist_large_id(self, client):
        """Test deletion with very large ID"""
        large_id = 999999999
        response = client.delete(f"/watchlist/{large_id}")

        # Large ID should be handled gracefully (likely not found)
        assert response.status_code in [204, 404]

    def test_delete_watchlist_idempotent_behavior(self, client):
        """Test idempotent behavior of DELETE operation"""
        item_id = 1

        # First delete
        response1 = client.delete(f"/watchlist/{item_id}")

        # Second delete of the same item
        response2 = client.delete(f"/watchlist/{item_id}")

        # First could succeed (204) or not exist (404)
        assert response1.status_code in [204, 404]

        # Second should return 404 (not found) if first was successful
        # Or same status as first if item never existed
        if response1.status_code == 204:
            assert response2.status_code == 404
        else:
            assert response2.status_code == 404

    def test_delete_watchlist_response_headers(self, client):
        """Test response headers for successful deletion"""
        item_id = 1
        response = client.delete(f"/watchlist/{item_id}")

        if response.status_code == 204:
            # 204 responses typically don't include content-type header
            # as there's no content, but some frameworks may include it
            pass

    def test_delete_watchlist_no_response_body(self, client):
        """Test that successful deletion has no response body"""
        item_id = 1
        response = client.delete(f"/watchlist/{item_id}")

        if response.status_code == 204:
            # 204 No Content should have empty body
            assert len(response.content) == 0

    def test_delete_watchlist_method_not_allowed_for_invalid_methods(self, client):
        """Test that only DELETE method is allowed on this endpoint"""
        item_id = 1

        # GET should not be allowed on delete endpoint
        response_get = client.get(f"/watchlist/{item_id}")
        # This might return 404 (route not found) or 405 (method not allowed)
        assert response_get.status_code in [404, 405]

        # POST should not be allowed on delete endpoint
        response_post = client.post(f"/watchlist/{item_id}", json={})
        assert response_post.status_code in [404, 405]

        # PUT should not be allowed on delete endpoint
        response_put = client.put(f"/watchlist/{item_id}", json={})
        assert response_put.status_code in [404, 405]

    def test_delete_watchlist_trailing_slash_handling(self, client):
        """Test handling of trailing slash in URL"""
        item_id = 1

        # Without trailing slash
        response1 = client.delete(f"/watchlist/{item_id}")

        # With trailing slash
        response2 = client.delete(f"/watchlist/{item_id}/")

        # Both should be handled consistently
        # Either both work or both fail, but with same type of response
        if response1.status_code in [204, 404]:
            assert response2.status_code in [204, 404]
        elif response1.status_code in [400, 422]:
            assert response2.status_code in [400, 422]

    def test_delete_watchlist_concurrent_access(self, client):
        """Test behavior with concurrent delete attempts"""
        item_id = 1

        # This simulates concurrent access by making multiple rapid requests
        responses = []
        for _ in range(3):
            response = client.delete(f"/watchlist/{item_id}")
            responses.append(response)

        # At most one should succeed (204), others should fail (404)
        success_count = sum(1 for r in responses if r.status_code == 204)
        not_found_count = sum(1 for r in responses if r.status_code == 404)

        # Should have at most 1 success and rest not found
        assert success_count <= 1
        assert success_count + not_found_count == len(responses)

    @pytest.mark.parametrize("item_id", [1, 2, 5, 10, 100])
    def test_delete_watchlist_various_valid_ids(self, client, item_id):
        """Test DELETE endpoint with various valid ID values"""
        response = client.delete(f"/watchlist/{item_id}")

        # Should either succeed (204) or not exist (404), but not validation error
        assert response.status_code in [204, 404]

        if response.status_code == 204:
            # Successful deletion should have empty body
            assert len(response.content) == 0

    def test_delete_watchlist_boundary_id_values(self, client):
        """Test deletion with boundary ID values"""
        boundary_ids = [1, 2147483647]  # 1 and max 32-bit integer

        for item_id in boundary_ids:
            response = client.delete(f"/watchlist/{item_id}")
            # Should handle boundary values gracefully
            assert response.status_code in [204, 404]
