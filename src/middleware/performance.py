"""
Performance optimization middleware for StockVision API

Provides response compression, caching headers, and other optimizations.
"""

from fastapi import FastAPI, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
import time
import hashlib
import json
import re

from ..constants import (
    API_RECOMMENDED_STOCKS, API_TRADING_RECOMMENDATIONS, API_PRICE_PREDICTIONS,
    API_STOCKS_CURRENT, API_STOCKS_HISTORY, API_WATCHLIST,
    CacheTTL, SWRTime, PerformanceThresholds, TimeConstants
)


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add appropriate cache control headers to API responses.
    """
    
    # Cache configurations for different endpoints
    CACHE_SETTINGS = {
        # Static data - cache longer
        API_RECOMMENDED_STOCKS: {"max_age": CacheTTL.RECOMMENDED_STOCKS, "stale_while_revalidate": SWRTime.RECOMMENDED_STOCKS},
        API_TRADING_RECOMMENDATIONS: {"max_age": CacheTTL.TRADING_RECOMMENDATIONS, "stale_while_revalidate": SWRTime.TRADING_RECOMMENDATIONS},
        API_PRICE_PREDICTIONS: {"max_age": CacheTTL.PRICE_PREDICTIONS, "stale_while_revalidate": SWRTime.PRICE_PREDICTIONS},
        
        # Real-time data - shorter cache
        API_STOCKS_CURRENT: {"max_age": CacheTTL.STOCK_DATA_SHORT, "stale_while_revalidate": SWRTime.STOCK_DATA_SHORT},
        API_STOCKS_HISTORY: {"max_age": CacheTTL.STOCK_HISTORY, "stale_while_revalidate": SWRTime.STOCK_HISTORY},
        
        # User-specific data - no cache
        API_WATCHLIST: {"max_age": CacheTTL.NO_CACHE, "no_cache": True}
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
                # Skip ETag generation for StreamingResponse
                if not isinstance(response, StreamingResponse):
                    if hasattr(response, 'body') and response.body:
                        try:
                            etag = self._generate_etag(response.body)
                            response.headers["ETag"] = etag
                            
                            # Check if client has matching ETag
                            if_none_match = request.headers.get("If-None-Match")
                            if if_none_match == etag:
                                return Response(status_code=304)
                        except AttributeError:
                            # Skip ETag if body is not accessible
                            pass

        # Add performance headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        
        return response
    
    def _get_cache_config(self, path: str) -> dict:
        """Get cache configuration for the given path."""
        # Direct match first
        if path in self.CACHE_SETTINGS:
            return self.CACHE_SETTINGS[path]
        
        # Pattern matching for dynamic paths using regex
        for pattern, config in self.CACHE_SETTINGS.items():
            if "*" in pattern:
                # Convert wildcard pattern to regex pattern
                # Escape special regex characters but keep wildcards
                regex_pattern = re.escape(pattern).replace(r'\*', r'[^/]*')
                # Add anchors to match full path
                regex_pattern = f'^{regex_pattern}$'
                
                try:
                    if re.match(regex_pattern, path):
                        return config
                except re.error:
                    # Fallback to simple wildcard matching if regex fails
                    pattern_parts = pattern.split("*")
                    if len(pattern_parts) == 2:
                        prefix, suffix = pattern_parts
                        if path.startswith(prefix) and path.endswith(suffix):
                            return config
        
        return {}
    
    def _generate_etag(self, content: bytes) -> str:
        """Generate ETag from response content using SHA256 for consistency."""
        return f'"{hashlib.sha256(content).hexdigest()}"'


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
    MIN_SIZE = PerformanceThresholds.COMPRESSION_MIN_SIZE
    
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
        response.headers["X-Process-Time"] = str(round(process_time * TimeConstants.MILLISECONDS_PER_SECOND, 2))  # milliseconds
        response.headers["X-Timestamp"] = str(int(time.time()))
        
        # Log slow requests
        if process_time > PerformanceThresholds.SLOW_REQUEST_THRESHOLD:
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
        minimum_size=PerformanceThresholds.COMPRESSION_MIN_SIZE,
        compresslevel=PerformanceThresholds.COMPRESSION_LEVEL  # Balance between compression ratio and CPU usage
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


def cache_response(key: str, data: dict, ttl: int = CacheTTL.DEFAULT):
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