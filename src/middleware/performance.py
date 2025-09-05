"""
Performance optimization middleware for StockVision API

Provides response compression, caching headers, and other optimizations.
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time
import hashlib
import json


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add appropriate cache control headers to API responses.
    """
    
    # Cache configurations for different endpoints
    CACHE_SETTINGS = {
        # Static data - cache longer
        "/api/recommended-stocks": {"max_age": 3600, "stale_while_revalidate": 1800},  # 1h cache, 30m stale
        "/api/trading-recommendations": {"max_age": 1800, "stale_while_revalidate": 900},  # 30m cache, 15m stale
        "/api/price-predictions": {"max_age": 7200, "stale_while_revalidate": 3600},  # 2h cache, 1h stale
        
        # Real-time data - shorter cache
        "/api/stocks/*/current": {"max_age": 300, "stale_while_revalidate": 150},  # 5m cache, 2.5m stale
        "/api/stocks/*/history": {"max_age": 1800, "stale_while_revalidate": 900},  # 30m cache, 15m stale
        
        # User-specific data - no cache
        "/api/watchlist": {"max_age": 0, "no_cache": True}
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Skip caching for non-GET requests
        if request.method != "GET":
            return response
        
        # Skip caching for error responses
        if response.status_code >= 400:
            return response
        
        # Find matching cache configuration
        cache_config = self._get_cache_config(request.url.path)
        
        if cache_config:
            if cache_config.get("no_cache"):
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
            else:
                max_age = cache_config["max_age"]
                swr = cache_config.get("stale_while_revalidate", 0)
                
                cache_control = f"public, max-age={max_age}"
                if swr > 0:
                    cache_control += f", stale-while-revalidate={swr}"
                
                response.headers["Cache-Control"] = cache_control
                
                # Add ETag for better cache validation
                if hasattr(response, 'body') and response.body:
                    etag = self._generate_etag(response.body)
                    response.headers["ETag"] = etag
                    
                    # Check if client has matching ETag
                    if_none_match = request.headers.get("If-None-Match")
                    if if_none_match == etag:
                        return Response(status_code=304)

        # Add performance headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        
        return response
    
    def _get_cache_config(self, path: str) -> dict:
        """Get cache configuration for the given path."""
        # Direct match first
        if path in self.CACHE_SETTINGS:
            return self.CACHE_SETTINGS[path]
        
        # Pattern matching for dynamic paths
        for pattern, config in self.CACHE_SETTINGS.items():
            if "*" in pattern:
                # Simple wildcard matching
                pattern_parts = pattern.split("*")
                if len(pattern_parts) == 2:
                    prefix, suffix = pattern_parts
                    if path.startswith(prefix) and path.endswith(suffix):
                        return config
        
        return {}
    
    def _generate_etag(self, content: bytes) -> str:
        """Generate ETag from response content."""
        return f'"{hashlib.md5(content).hexdigest()}"'


class ResponseCompressionMiddleware(BaseHTTPMiddleware):
    """
    Advanced compression middleware with content-type aware compression.
    """
    
    # Content types that should be compressed
    COMPRESSIBLE_TYPES = {
        "application/json",
        "application/javascript",
        "text/html",
        "text/css",
        "text/plain",
        "text/xml",
        "application/xml",
        "application/rss+xml",
        "application/atom+xml",
        "image/svg+xml"
    }
    
    # Minimum size to compress (bytes)
    MIN_SIZE = 1024
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Check if compression is appropriate
        if not self._should_compress(request, response):
            return response
        
        # Compression is handled by GZipMiddleware, just add headers
        response.headers["Vary"] = "Accept-Encoding"
        
        return response
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """Determine if response should be compressed."""
        # Check if client accepts gzip
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return False
        
        # Check content type
        content_type = response.headers.get("content-type", "").split(";")[0]
        if content_type not in self.COMPRESSIBLE_TYPES:
            return False
        
        # Check content length
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) < self.MIN_SIZE:
            return False
        
        return True


class PerformanceMetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to collect and add performance metrics to responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        
        response = await call_next(request)
        
        # Calculate response time
        process_time = time.time() - start_time
        
        # Add performance headers
        response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))  # milliseconds
        response.headers["X-Timestamp"] = str(int(time.time()))
        
        # Log slow requests
        if process_time > 1.0:  # Requests taking over 1 second
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(
                f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s"
            )
        
        return response


def setup_performance_middleware(app: FastAPI):
    """
    Set up all performance optimization middleware.
    """
    # Add GZip compression (built-in FastAPI middleware)
    app.add_middleware(
        GZipMiddleware,
        minimum_size=1024,
        compresslevel=6  # Balance between compression ratio and CPU usage
    )
    
    # Add custom performance middleware
    app.add_middleware(PerformanceMetricsMiddleware)
    app.add_middleware(ResponseCompressionMiddleware)
    app.add_middleware(CacheControlMiddleware)


# Utility functions for manual performance optimization

def optimize_json_response(data: dict) -> dict:
    """
    Optimize JSON response data for better performance.
    """
    # Remove null/None values to reduce payload size
    def remove_nulls(obj):
        if isinstance(obj, dict):
            return {k: remove_nulls(v) for k, v in obj.items() if v is not None}
        elif isinstance(obj, list):
            return [remove_nulls(item) for item in obj if item is not None]
        return obj
    
    return remove_nulls(data)


def compress_price_history(history_data: list) -> dict:
    """
    Compress price history data using efficient encoding.
    """
    if not history_data:
        return {"dates": [], "prices": [], "volumes": []}
    
    # Separate data by type for better compression
    dates = []
    prices = {"open": [], "high": [], "low": [], "close": []}
    volumes = []
    
    for item in history_data:
        dates.append(item["date"])
        prices["open"].append(item["open"])
        prices["high"].append(item["high"])
        prices["low"].append(item["low"])
        prices["close"].append(item["close"])
        volumes.append(item["volume"])
    
    return {
        "dates": dates,
        "prices": prices,
        "volumes": volumes,
        "count": len(dates)
    }


def batch_database_queries(queries: list) -> list:
    """
    Batch multiple database queries for better performance.
    This is a placeholder - actual implementation would depend on ORM.
    """
    # Implementation would use techniques like:
    # - SQLAlchemy's batch operations
    # - Eager loading with joinedload/selectinload
    # - Bulk operations for inserts/updates
    
    results = []
    for query in queries:
        # Execute query (placeholder)
        result = query()
        results.append(result)
    
    return results


# Cache key generation utilities

def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate consistent cache key from arguments using improved key generation.
    
    This is a legacy function maintained for backward compatibility.
    New code should use the cache_key_generator module directly.
    """
    from ..utils.cache_key_generator import generate_cache_key as new_generate_cache_key
    
    # Convert legacy format to new format
    primary_key = args[0] if args else 'default'
    parameters = dict(kwargs)
    if len(args) > 1:
        for i, arg in enumerate(args[1:], 1):
            parameters[f'arg{i}'] = arg
    
    return new_generate_cache_key(prefix, str(primary_key), parameters)


def cache_response(key: str, data: dict, ttl: int = 3600):
    """
    Cache response data with TTL.
    This would integrate with Redis or similar in production.
    """
    # Placeholder implementation
    # In production, this would use Redis:
    # redis_client.setex(key, ttl, json.dumps(data))
    pass


def get_cached_response(key: str) -> dict:
    """
    Retrieve cached response data.
    """
    # Placeholder implementation
    # In production, this would use Redis:
    # cached = redis_client.get(key)
    # return json.loads(cached) if cached else None
    return None