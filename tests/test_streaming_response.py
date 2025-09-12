"""
Tests for the performance middleware, specifically CacheControlMiddleware's handling of StreamingResponse.
"""

import pytest
from fastapi import FastAPI
from starlette.responses import StreamingResponse
from starlette.testclient import TestClient

from src.middleware.performance import CacheControlMiddleware


@pytest.fixture
def app():
    """Create a FastAPI app with CacheControlMiddleware for testing."""
    app = FastAPI()

    # Add the middleware
    app.add_middleware(CacheControlMiddleware)

    @app.get("/api/stocks/streaming")
    async def streaming_endpoint():
        async def fake_video_streamer():
            for i in range(10):
                yield b"some fake video bytes"

        return StreamingResponse(fake_video_streamer())

    @app.get("/api/stocks/7203/current")
    async def normal_endpoint():
        return {"message": "Hello World"}

    return app


def test_streaming_response_no_etag(app):
    """Test that StreamingResponse doesn't get ETag header."""
    client = TestClient(app)

    # Make a request to the streaming endpoint
    response = client.get("/api/stocks/streaming")

    # Verify the response is successful
    assert response.status_code == 200

    # Verify that no ETag header is present
    assert "etag" not in response.headers

    # StreamingResponse doesn't match any cache configuration, so no cache-control header
    # This is expected behavior
    assert "cache-control" not in response.headers


def test_normal_response_etag(app):
    """Test that normal responses still get ETag header."""
    client = TestClient(app)

    # Make a request to the normal endpoint
    response = client.get("/api/stocks/7203/current")

    # Verify the response is successful
    assert response.status_code == 200

    # Verify that cache control headers are applied
    assert "cache-control" in response.headers

    # Verify that ETag header is present
    assert "etag" in response.headers


def test_streaming_response_with_if_none_match(app):
    """Test that StreamingResponse works correctly even when If-None-Match header is present."""
    client = TestClient(app)

    # Make a request to the streaming endpoint with If-None-Match header
    response = client.get(
        "/api/stocks/streaming", headers={"if-none-match": '"some-etag"'}
    )

    # Verify the response is successful (not 304)
    assert response.status_code == 200

    # Verify that no ETag header is present
    assert "etag" not in response.headers


if __name__ == "__main__":
    pytest.main([__file__])
