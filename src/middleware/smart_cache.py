"""
Smart Cache Middleware with Dynamic Strategy and Redis Integration

Provides intelligent caching with usage-based optimization, Redis support,
and dynamic cache TTL adjustments based on API usage patterns.
"""

import json
import time
import asyncio
import hashlib
from typing import Dict, List, Optional, Any, Union, Set
from dataclasses import dataclass, asdict
from collections import defaultdict
from datetime import datetime, timedelta
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from fastapi import FastAPI
import logging

# Optional Redis support
try:
    import redis.asyncio as redis
    HAS_REDIS = True
except ImportError:
    redis = None
    HAS_REDIS = False

logger = logging.getLogger(__name__)


@dataclass
class CacheStats:
    """Cache statistics for monitoring and optimization."""
    hits: int = 0
    misses: int = 0
    total_requests: int = 0
    avg_response_time: float = 0.0
    hit_rate: float = 0.0
    last_updated: datetime = None


@dataclass
class EndpointMetrics:
    """Metrics for individual endpoints."""
    path: str
    method: str
    request_count: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    avg_response_size: float = 0.0
    avg_response_time: float = 0.0
    last_access: datetime = None
    optimal_ttl: int = 300  # seconds


class SmartCacheStrategy:
    """
    Dynamic cache strategy that adapts based on usage patterns.
    """
    
    def __init__(self):
        self.endpoint_metrics: Dict[str, EndpointMetrics] = {}
        self.global_stats = CacheStats()
        
        # Base cache configurations
        self.base_configs = {
            # Stock data endpoints
            '/api/stocks': {'base_ttl': 300, 'max_ttl': 1800, 'min_ttl': 60},
            '/api/stocks/current': {'base_ttl': 180, 'max_ttl': 600, 'min_ttl': 30},
            '/api/stocks/history': {'base_ttl': 900, 'max_ttl': 3600, 'min_ttl': 300},
            
            # Analysis endpoints
            '/api/recommendations': {'base_ttl': 1800, 'max_ttl': 7200, 'min_ttl': 600},
            '/api/predictions': {'base_ttl': 3600, 'max_ttl': 14400, 'min_ttl': 900},
            
            # User data (minimal caching)
            '/api/watchlist': {'base_ttl': 0, 'max_ttl': 60, 'min_ttl': 0},
            
            # Performance data
            '/api/performance': {'base_ttl': 60, 'max_ttl': 300, 'min_ttl': 15}
        }
    
    def get_cache_key(self, request: Request) -> str:
        """Generate cache key from request."""
        key_parts = [
            request.method,
            request.url.path,
            sorted(request.query_params.items()).__str__()
        ]
        key_string = '|'.join(str(part) for part in key_parts)
        return f"stockvision:cache:{hashlib.sha256(key_string.encode()).hexdigest()[:16]}"
    
    def get_endpoint_key(self, request: Request) -> str:
        """Get endpoint key for metrics tracking."""
        return f"{request.method}:{request.url.path}"
    
    def calculate_optimal_ttl(self, endpoint_key: str, request: Request) -> int:
        """Calculate optimal TTL based on usage patterns."""
        if endpoint_key not in self.endpoint_metrics:
            # New endpoint, use base configuration
            return self._get_base_ttl(request.url.path)
        
        metrics = self.endpoint_metrics[endpoint_key]
        base_config = self._get_base_config(request.url.path)
        
        # Factors for TTL calculation
        hit_rate = metrics.cache_hits / max(metrics.request_count, 1)
        time_since_last_access = (datetime.now() - metrics.last_access).total_seconds() if metrics.last_access else 0
        
        # Higher hit rate = longer TTL (up to max)
        hit_rate_factor = 1 + (hit_rate * 0.5)  # 1.0 to 1.5x multiplier
        
        # Recent access = shorter TTL for freshness
        recency_factor = max(0.5, 1 - (time_since_last_access / 3600))  # Decay over 1 hour
        
        # Calculate optimal TTL
        optimal_ttl = int(base_config['base_ttl'] * hit_rate_factor * recency_factor)
        
        # Clamp to min/max values
        optimal_ttl = max(base_config['min_ttl'], min(optimal_ttl, base_config['max_ttl']))
        
        return optimal_ttl
    
    def _get_base_config(self, path: str) -> Dict[str, int]:
        """Get base configuration for path."""
        for pattern, config in self.base_configs.items():
            if path.startswith(pattern):
                return config
        # Default configuration
        return {'base_ttl': 300, 'max_ttl': 1800, 'min_ttl': 60}
    
    def _get_base_ttl(self, path: str) -> int:
        """Get base TTL for path."""
        return self._get_base_config(path)['base_ttl']
    
    def update_metrics(self, endpoint_key: str, hit: bool, response_size: int = 0, response_time: float = 0.0):
        """Update endpoint metrics."""
        if endpoint_key not in self.endpoint_metrics:
            method, path = endpoint_key.split(':', 1)
            self.endpoint_metrics[endpoint_key] = EndpointMetrics(
                path=path,
                method=method
            )
        
        metrics = self.endpoint_metrics[endpoint_key]
        metrics.request_count += 1
        metrics.last_access = datetime.now()
        
        if hit:
            metrics.cache_hits += 1
            self.global_stats.hits += 1
        else:
            metrics.cache_misses += 1
            self.global_stats.misses += 1
        
        if response_size > 0:
            # Update average response size
            total_size = metrics.avg_response_size * (metrics.request_count - 1) + response_size
            metrics.avg_response_size = total_size / metrics.request_count
        
        if response_time > 0:
            # Update average response time
            total_time = metrics.avg_response_time * (metrics.request_count - 1) + response_time
            metrics.avg_response_time = total_time / metrics.request_count
        
        # Update global stats
        self.global_stats.total_requests += 1
        self.global_stats.hit_rate = self.global_stats.hits / max(self.global_stats.total_requests, 1)
        self.global_stats.last_updated = datetime.now()
    
    def get_cache_headers(self, ttl: int, hit: bool = False) -> Dict[str, str]:
        """Generate cache control headers."""
        headers = {}
        
        if ttl > 0:
            headers['Cache-Control'] = f'max-age={ttl}, stale-while-revalidate={ttl // 2}'
            headers['ETag'] = f'"{int(time.time() // ttl)}"'
            
            if hit:
                headers['X-Cache'] = 'HIT'
            else:
                headers['X-Cache'] = 'MISS'
        else:
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            headers['X-Cache'] = 'BYPASS'
        
        return headers


class SmartCacheMiddleware(BaseHTTPMiddleware):
    """
    Smart cache middleware with Redis support and dynamic TTL optimization.
    """
    
    def __init__(
        self,
        app: FastAPI,
        redis_url: Optional[str] = None,
        enable_redis: bool = False,
        cache_prefix: str = "stockvision:cache:",
        stats_interval: int = 300,  # 5 minutes
        excluded_paths: Optional[Set[str]] = None
    ):
        super().__init__(app)
        self.strategy = SmartCacheStrategy()
        self.redis_client = None
        self.enable_redis = enable_redis and HAS_REDIS
        self.cache_prefix = cache_prefix
        self.stats_interval = stats_interval
        self.last_stats_update = time.time()
        
        # Paths to exclude from caching
        self.excluded_paths = excluded_paths or {
            '/health', '/live', '/status', '/metrics',
            '/docs', '/redoc', '/openapi.json'
        }
        
        # Local cache fallback (in-memory)
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_times: Dict[str, float] = {}
        
        # Initialize Redis connection
        if self.enable_redis and redis_url:
            self._init_redis(redis_url)
    
    def _init_redis(self, redis_url: str):
        """Initialize Redis connection."""
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            logger.info(f"Redis cache initialized: {redis_url}")
        except Exception as e:
            logger.error(f"Failed to initialize Redis: {e}")
            self.enable_redis = False
    
    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip caching for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)
        
        # Skip non-GET requests
        if request.method != 'GET':
            return await call_next(request)
        
        start_time = time.time()
        cache_key = self.strategy.get_cache_key(request)
        endpoint_key = self.strategy.get_endpoint_key(request)
        
        # Try to get from cache
        cached_response = await self._get_from_cache(cache_key)
        
        if cached_response:
            # Cache hit
            response_time = time.time() - start_time
            self.strategy.update_metrics(endpoint_key, hit=True, response_time=response_time)
            
            # Create response from cache
            response = Response(
                content=cached_response['content'],
                status_code=cached_response['status_code'],
                headers=cached_response['headers']
            )
            
            # Add cache headers
            ttl = self.strategy.calculate_optimal_ttl(endpoint_key, request)
            cache_headers = self.strategy.get_cache_headers(ttl, hit=True)
            for key, value in cache_headers.items():
                response.headers[key] = value
            
            return response
        
        # Cache miss - get fresh response
        response = await call_next(request)
        response_time = time.time() - start_time
        
        # Only cache successful responses
        if 200 <= response.status_code < 300:
            ttl = self.strategy.calculate_optimal_ttl(endpoint_key, request)
            
            if ttl > 0:
                # Cache the response
                await self._set_in_cache(cache_key, response, ttl)
            
            # Add cache headers
            cache_headers = self.strategy.get_cache_headers(ttl, hit=False)
            for key, value in cache_headers.items():
                response.headers[key] = value
        
        # Update metrics
        content_length = len(response.body) if hasattr(response, 'body') else 0
        self.strategy.update_metrics(endpoint_key, hit=False, 
                                   response_size=content_length, 
                                   response_time=response_time)
        
        # Periodic stats logging
        await self._maybe_log_stats()
        
        return response
    
    async def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get response from cache (Redis or local)."""
        try:
            if self.enable_redis and self.redis_client:
                cached = await self.redis_client.get(cache_key)
                if cached:
                    return json.loads(cached)
            
            # Fallback to local cache
            if cache_key in self.local_cache:
                cache_time = self.cache_times.get(cache_key, 0)
                if time.time() - cache_time < 3600:  # 1 hour max for local cache
                    return self.local_cache[cache_key]
                else:
                    # Expired, remove from local cache
                    del self.local_cache[cache_key]
                    del self.cache_times[cache_key]
            
        except Exception as e:
            logger.error(f"Cache get error for {cache_key}: {e}")
        
        return None
    
    async def _set_in_cache(self, cache_key: str, response: Response, ttl: int):
        """Set response in cache (Redis or local)."""
        try:
            # Prepare cache data
            cache_data = {
                'content': response.body.decode() if hasattr(response, 'body') else '',
                'status_code': response.status_code,
                'headers': dict(response.headers)
            }
            
            if self.enable_redis and self.redis_client:
                await self.redis_client.setex(
                    cache_key, 
                    ttl, 
                    json.dumps(cache_data)
                )
            else:
                # Fallback to local cache with size limits
                if len(self.local_cache) > 1000:  # Limit local cache size
                    # Remove oldest entries
                    oldest_keys = sorted(self.cache_times.items(), key=lambda x: x[1])[:100]
                    for old_key, _ in oldest_keys:
                        self.local_cache.pop(old_key, None)
                        self.cache_times.pop(old_key, None)
                
                self.local_cache[cache_key] = cache_data
                self.cache_times[cache_key] = time.time()
        
        except Exception as e:
            logger.error(f"Cache set error for {cache_key}: {e}")
    
    async def _maybe_log_stats(self):
        """Periodically log cache statistics."""
        now = time.time()
        if now - self.last_stats_update > self.stats_interval:
            self.last_stats_update = now
            
            stats = self.strategy.global_stats
            logger.info(
                f"Cache Stats - Requests: {stats.total_requests}, "
                f"Hit Rate: {stats.hit_rate:.2%}, "
                f"Hits: {stats.hits}, Misses: {stats.misses}"
            )
            
            # Log top endpoints
            top_endpoints = sorted(
                self.strategy.endpoint_metrics.items(),
                key=lambda x: x[1].request_count,
                reverse=True
            )[:5]
            
            for endpoint_key, metrics in top_endpoints:
                hit_rate = metrics.cache_hits / max(metrics.request_count, 1)
                logger.info(
                    f"Endpoint {endpoint_key}: {metrics.request_count} requests, "
                    f"hit rate: {hit_rate:.2%}, avg response time: {metrics.avg_response_time:.3f}s"
                )
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        stats = asdict(self.strategy.global_stats)
        
        # Add endpoint details
        endpoint_stats = {}
        for key, metrics in self.strategy.endpoint_metrics.items():
            endpoint_stats[key] = {
                'request_count': metrics.request_count,
                'cache_hits': metrics.cache_hits,
                'cache_misses': metrics.cache_misses,
                'hit_rate': metrics.cache_hits / max(metrics.request_count, 1),
                'avg_response_size': metrics.avg_response_size,
                'avg_response_time': metrics.avg_response_time,
                'optimal_ttl': metrics.optimal_ttl,
                'last_access': metrics.last_access.isoformat() if metrics.last_access else None
            }
        
        return {
            'global_stats': stats,
            'endpoints': endpoint_stats,
            'cache_backend': 'redis' if self.enable_redis else 'memory',
            'local_cache_size': len(self.local_cache)
        }