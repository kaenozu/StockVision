"""
Performance optimization middleware for StockVision API

Provides response compression, caching headers, and other optimizations.
Supports integration with external cache systems like Redis.
Supports multiple compression algorithms including GZip and Brotli.
"""

import time
import hashlib
import json
import re
import gzip
try:
    import brotli  # type: ignore
    HAS_BROTLI = True
except Exception:  # pragma: no cover
    brotli = None  # type: ignore
    HAS_BROTLI = False
from typing import Callable, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import FastAPI, Request, Response
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.datastructures import MutableHeaders

from ..constants import (
    API_RECOMMENDED_STOCKS, API_TRADING_RECOMMENDATIONS, API_PRICE_PREDICTIONS,
    API_STOCKS_CURRENT, API_STOCKS_HISTORY, API_WATCHLIST,
    CacheTTL, SWRTime, PerformanceThresholds, TimeConstants
)
from ..utils.performance_monitor import record_request_metrics
from ..config import get_middleware_config


class CompressionAlgorithm(Enum):
    """Supported compression algorithms."""
    GZIP = "gzip"
    BROTLI = "br"
    NONE = "none"


@dataclass
class CompressionMetrics:
    """Compression metrics for monitoring and optimization."""
    algorithm: str = "none"
    original_size: int = 0
    compressed_size: int = 0
    compression_ratio: float = 0.0
    cpu_time_ms: float = 0.0
    savings_bytes: int = 0


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add appropriate cache control headers to API responses.
    Supports integration with external cache systems like Redis.
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
        # Check if middleware is enabled
        middleware_config = get_middleware_config()
        if not middleware_config.cache_control_enabled:
            return await call_next(request)
            
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
        """Get cache configuration for the given path with improved wildcard matching."""
        # Direct match first
        if path in self.CACHE_SETTINGS:
            return self.CACHE_SETTINGS[path]
        
        # Pattern matching for dynamic paths using enhanced regex
        for pattern, config in self.CACHE_SETTINGS.items():
            if "*" in pattern:
                try:
                    if self._match_wildcard_pattern(pattern, path):
                        return config
                except (re.error, ValueError):
                    # Fallback to simple wildcard matching if regex fails
                    if self._simple_wildcard_match(pattern, path):
                        return config
        
        return {}
    
    def _match_wildcard_pattern(self, pattern: str, path: str) -> bool:
        """
        Enhanced wildcard pattern matching supporting multiple wildcards.
        
        Supports patterns like:
        - /api/stocks/* -> matches /api/stocks/7203
        - /api/stocks/*/history -> matches /api/stocks/7203/history  
        - /api/stocks/*/history/* -> matches /api/stocks/7203/history/30d
        """
        # Escape special regex characters except wildcards
        escaped_pattern = re.escape(pattern)
        
        # Convert wildcards to regex patterns
        # Use [^/]* to match any character except slash (single path segment)
        regex_pattern = escaped_pattern.replace(r'\*', r'[^/]*')
        
        # Add anchors to match full path
        regex_pattern = f'^{regex_pattern}$'
        
        return bool(re.match(regex_pattern, path))
    
    def _simple_wildcard_match(self, pattern: str, path: str) -> bool:
        """
        Simple fallback wildcard matching for basic patterns.
        
        Handles single wildcards at start, middle, or end of pattern.
        """
        # Handle patterns with single wildcard
        if pattern.count("*") == 1:
            if pattern.startswith("*"):
                return path.endswith(pattern[1:])
            elif pattern.endswith("*"):
                return path.startswith(pattern[:-1])
            else:
                # Wildcard in middle
                prefix, suffix = pattern.split("*", 1)
                return path.startswith(prefix) and path.endswith(suffix)
        
        # For multiple wildcards, fall back to basic fnmatch-like behavior
        import fnmatch
        try:
            return fnmatch.fnmatch(path, pattern)
        except Exception:
            return False
    
    def _generate_etag(self, content: bytes) -> str:
        """Generate ETag from response content using SHA256 for consistency."""
        return f'"{hashlib.sha256(content).hexdigest()}"'


class ResponseCompressionMiddleware(BaseHTTPMiddleware):
    """
    Advanced compression middleware with content-type aware compression.
    Supports multiple compression algorithms including GZip and Brotli.
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
    
    # Compression levels
    GZIP_COMPRESSLEVEL = 6  # Balance between compression ratio and CPU usage
    BROTLI_QUALITY = 4      # Balance between compression ratio and CPU usage (0-11)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if middleware is enabled
        middleware_config = get_middleware_config()
        if not middleware_config.response_compression_enabled:
            return await call_next(request)
            
        response = await call_next(request)
        
        # Check if compression is appropriate
        if not self._should_compress(request, response):
            return response
        
        # Determine best compression algorithm based on client preference
        accept_encoding = request.headers.get("accept-encoding", "")
        algorithm = self._choose_compression_algorithm(accept_encoding)
        
        # Compress response body
        if algorithm != CompressionAlgorithm.NONE:
            start_time = time.time()
            compressed_body, metrics = self._compress_response(response.body, algorithm)
            compression_time = (time.time() - start_time) * 1000  # ms
            
            # Update response with compressed body and headers
            if compressed_body:
                response.body = compressed_body
                response.headers["Content-Encoding"] = algorithm.value
                response.headers["Vary"] = "Accept-Encoding"
                
                # Add compression metrics to response headers (for debugging)
                response.headers["X-Compression-Algorithm"] = algorithm.value
                response.headers["X-Compression-Ratio"] = str(round(metrics.compression_ratio, 4))
                response.headers["X-Compression-Time-ms"] = str(round(compression_time, 2))
                response.headers["X-Original-Size"] = str(metrics.original_size)
                response.headers["X-Compressed-Size"] = str(metrics.compressed_size)
                response.headers["X-Bytes-Saved"] = str(metrics.savings_bytes)
        
        return response
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """Determine if response should be compressed."""
        # Skip streaming responses (they don't have a .body attribute)
        from starlette.responses import StreamingResponse
        if isinstance(response, StreamingResponse):
            return False
        
        # Check if client accepts any compression
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding and "br" not in accept_encoding:
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
    
    def _choose_compression_algorithm(self, accept_encoding: str) -> CompressionAlgorithm:
        """Choose the best compression algorithm based on client preference."""
        # Prefer Brotli if supported
        if "br" in accept_encoding and HAS_BROTLI:
            return CompressionAlgorithm.BROTLI
        # Fallback to GZip
        elif "gzip" in accept_encoding:
            return CompressionAlgorithm.GZIP
        # No compression
        else:
            return CompressionAlgorithm.NONE
    
    def _compress_response(self, body: bytes, algorithm: CompressionAlgorithm) -> tuple[Optional[bytes], CompressionMetrics]:
        """Compress response body using the specified algorithm."""
        if not body:
            return None, CompressionMetrics(algorithm=algorithm.value)
        
        metrics = CompressionMetrics(
            algorithm=algorithm.value,
            original_size=len(body)
        )
        
        try:
            if algorithm == CompressionAlgorithm.GZIP:
                compressed_body = gzip.compress(body, compresslevel=self.GZIP_COMPRESSLEVEL)
            elif algorithm == CompressionAlgorithm.BROTLI and HAS_BROTLI and brotli:
                compressed_body = brotli.compress(body, quality=self.BROTLI_QUALITY)
            else:
                compressed_body = body
            
            metrics.compressed_size = len(compressed_body)
            metrics.compression_ratio = metrics.compressed_size / max(1, metrics.original_size)
            metrics.savings_bytes = metrics.original_size - metrics.compressed_size
            
            return compressed_body, metrics
            
        except Exception as e:
            # Log compression error but return original body
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Compression failed with algorithm {algorithm.value}: {e}")
            return body, CompressionMetrics(algorithm="none", original_size=len(body), compressed_size=len(body))


class PerformanceMetricsMiddleware(BaseHTTPMiddleware):
    """
    Middleware to collect and add performance metrics to responses.
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check if middleware is enabled
        middleware_config = get_middleware_config()
        if not middleware_config.performance_metrics_enabled:
            return await call_next(request)
            
        start_time = time.time()
        
        response = await call_next(request)
        
        # Calculate response time
        process_time = time.time() - start_time
        
        # Add performance headers
        response.headers["X-Process-Time"] = str(round(process_time * TimeConstants.MILLISECONDS_PER_SECOND, 2))  # milliseconds
        response.headers["X-Timestamp"] = str(int(time.time()))
        
        # Record metrics
        record_request_metrics(
            method=request.method,
            path=request.url.path,
            process_time=process_time,
            status_code=response.status_code,
            user_agent=request.headers.get("user-agent", ""),
            client_ip=request.client.host if request.client else ""
        )
        
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
    パフォーマンス最適化ミドルウェアの設定
    
    ★ 重要: FastAPIのミドルウェアは逆順（LIFO）で処理される
    最後に登録されたミドルウェアが最初にリクエストを受け取り、
    レスポンス処理では登録順に処理される
    
    想定される実行順序:
    リクエスト: Metrics -> Compression -> CacheControl -> App
    レスポンス: App -> CacheControl -> Compression -> Metrics
    
    理由:
    1. Metrics: 全体の処理時間を正確に測定するため最外層
    2. Compression: キャッシュヘッダー設定後に圧縮を実行
    3. CacheControl: アプリデータに基づいたキャッシュ戦略適用
    
    詳細は docs/middleware-architecture.md を参照
    """
    middleware_config = get_middleware_config()
    
    # 注意: 登録順序と実行順序は逆になる
    
    # 1. Cache Control Middleware (最内層 - アプリに最も近い) - 一時的に無効化
    # if middleware_config.cache_control_enabled:
    #     # Import the new smart cache middleware
    #     from .smart_cache import SmartCacheMiddleware
    #     import os
    #     
    #     # Use smart cache with optional Redis support
    #     redis_url = os.getenv('REDIS_URL')
    #     app.add_middleware(
    #         SmartCacheMiddleware,
    #         redis_url=redis_url,
    #         enable_redis=bool(redis_url),
    #         stats_interval=300,  # 5 minutes
    #         excluded_paths={'/health', '/live', '/status', '/metrics', '/docs', '/redoc', '/openapi.json'}
    #     )
    
    # 2. Response Compression Middleware (中間層) - 一時的に無効化
    # if middleware_config.response_compression_enabled:
    #     # Import the new advanced compression middleware
    #     from .compression import SmartCompressionMiddleware
    #     
    #     # Use smart compression with adaptive levels and Brotli support
    #     app.add_middleware(
    #         SmartCompressionMiddleware,
    #         minimum_size=500,
    #         maximum_size=50 * 1024 * 1024,  # 50MB
    #         exclude_paths={'/health', '/metrics', '/live', '/static'}
    #     )
    
    # 3. Performance Metrics Middleware (最外層 - 全体測定) - 一時的に無効化
    # if middleware_config.performance_metrics_enabled:
    #     app.add_middleware(PerformanceMetricsMiddleware)


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
