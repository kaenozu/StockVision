"""
Direct tests for CacheControlMiddleware
"""

import pytest
from starlette.datastructures import Headers
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse

from src.middleware.performance import CacheControlMiddleware


class MockCallNext:
    """Mock for the call_next function in middleware."""

    def __init__(self, response):
        self.response = response

    async def __call__(self, request):
        return self.response


@pytest.mark.asyncio
async def test_streaming_response_no_etag():
    """Test that StreamingResponse doesn't get ETag header."""
    # Create middleware instance
    middleware = CacheControlMiddleware(None)

    # Create a mock request
    request = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/stocks/streaming",
            "headers": Headers({}).raw,
        }
    )

    # Create a StreamingResponse
    async def fake_video_streamer():
        for i in range(10):
            yield b"some fake video bytes"

    response = StreamingResponse(fake_video_streamer())

    # Process through middleware
    result = await middleware.dispatch(request, MockCallNext(response))

    # Verify that no ETag header is present
    assert not result.headers.get("ETag")

    # StreamingResponse doesn't match any cache configuration, so no cache-control header
    # This is expected behavior
    assert not result.headers.get("Cache-Control")


@pytest.mark.asyncio
async def test_normal_response_etag():
    """Test that normal responses get ETag header."""
    # Create middleware instance
    middleware = CacheControlMiddleware(None)

    # Create a mock request
    request = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/stocks/7203/current",
            "headers": Headers({}).raw,
        }
    )

    # Create a normal Response
    response = Response(
        content='{"message": "Hello World"}', media_type="application/json"
    )

    # Process through middleware
    result = await middleware.dispatch(request, MockCallNext(response))

    # Verify that ETag header is present
    assert result.headers.get("ETag")

    # Verify cache control is applied
    assert result.headers.get("Cache-Control")


@pytest.mark.asyncio
async def test_streaming_response_with_if_none_match():
    """Test that StreamingResponse works correctly with If-None-Match header."""
    # Create middleware instance
    middleware = CacheControlMiddleware(None)

    # Create a mock request with If-None-Match header
    request = Request(
        scope={
            "type": "http",
            "method": "GET",
            "path": "/api/stocks/streaming",
            "headers": Headers({"if-none-match": '"some-etag"'}).raw,
        }
    )

    # Create a StreamingResponse
    async def fake_video_streamer():
        for i in range(10):
            yield b"some fake video bytes"

    response = StreamingResponse(fake_video_streamer())

    # Process through middleware
    result = await middleware.dispatch(request, MockCallNext(response))

    # Verify the response is successful (not 304)
    assert result.status_code == 200

    # Verify that no ETag header is present
    assert not result.headers.get("ETag")


if __name__ == "__main__":
    pytest.main([__file__])
