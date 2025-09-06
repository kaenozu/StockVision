"""
In-memory caching utility for performance optimization.

This module provides a simple LRU cache with TTL (Time To Live) support
for caching API responses and reducing database queries.
Supports integration with external cache systems like Redis.
"""
import logging
import time
import re
from functools import wraps
from typing import Any, Optional, Callable, Dict, Tuple, Union
from collections import OrderedDict
from dataclasses import dataclass, asdict
from threading import Lock

from .cache_key_generator import generate_stock_cache_key
from .redis_client import get_redis_client, RedisClient
from ..constants import CacheTTL, CacheSize

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with metadata for advanced caching strategies."""
    value: Any
    timestamp: float
    access_count: int = 0
    last_accessed: float = 0.0
    size_estimate: int = 0  # Estimated size in bytes


@dataclass
class CacheStats:
    """Cache statistics for monitoring and optimization."""
    hits: int = 0
    misses: int = 0
    evictions: int = 0
    expired: int = 0
    size: int = 0
    maxsize: int = 0
    ttl: float = 0.0
    hit_ratio: float = 0.0


class AdaptiveTTLCache:
    """Thread-safe adaptive TTL cache with LRU/LFU hybrid eviction and size-based policies."""
    
    def __init__(
        self, 
        maxsize: int = CacheSize.DEFAULT_TTL_CACHE, 
        ttl: float = CacheTTL.STOCK_DATA_SHORT,
        adaptive_ttl: bool = False,
        size_based_eviction: bool = False,
        max_memory_bytes: Optional[int] = None,
        use_redis: bool = False,
        redis_prefix: str = "cache:"
    ):
        """Initialize adaptive TTL cache.
        
        Args:
            maxsize: Maximum number of items to store
            ttl: Time to live in seconds
            adaptive_ttl: Enable adaptive TTL based on access patterns
            size_based_eviction: Enable size-based eviction (requires size estimates)
            max_memory_bytes: Maximum memory usage in bytes (if size_based_eviction is True)
            use_redis: Enable Redis integration for distributed caching
            redis_prefix: Prefix for Redis keys
        """
        self.maxsize = maxsize
        self.ttl = ttl
        self.adaptive_ttl = adaptive_ttl
        self.size_based_eviction = size_based_eviction
        self.max_memory_bytes = max_memory_bytes
        self.use_redis = use_redis
        self.redis_prefix = redis_prefix
        
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = Lock()
        self._stats = CacheStats(maxsize=maxsize, ttl=ttl)
        
        # Redis client for distributed caching
        self._redis_client: Optional[RedisClient] = None
        if self.use_redis:
            self._redis_client = get_redis_client()
        
        # Adaptive TTL parameters
        self._access_window = 60.0  # Time window to track access frequency (seconds)
        self._min_ttl = 10.0  # Minimum adaptive TTL
        self._max_ttl = 3600.0  # Maximum adaptive TTL
        
    def _is_expired(self, entry: CacheEntry) -> bool:
        """Check if cache entry is expired."""
        return time.time() - entry.timestamp > self.ttl
    
    def _cleanup_expired(self) -> int:
        """Remove expired entries and return count."""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time - entry.timestamp > self.ttl
        ]
        
        for key in expired_keys:
            del self._cache[key]
            
        self._stats.expired += len(expired_keys)
        return len(expired_keys)
    
    def _evict_entries(self, num_to_evict: int = 1) -> int:
        """Evict entries based on policy (LRU/LFU/Size) and return count."""
        if not self._cache:
            return 0
            
        evicted = 0
        
        # Size-based eviction first
        if self.size_based_eviction and self.max_memory_bytes:
            current_size = sum(entry.size_estimate for entry in self._cache.values())
            while current_size > self.max_memory_bytes and self._cache:
                # Evict largest entry
                key_to_evict = max(self._cache.keys(), key=lambda k: self._cache[k].size_estimate)
                evicted_size = self._cache[key_to_evict].size_estimate
                del self._cache[key_to_evict]
                current_size -= evicted_size
                evicted += 1
                self._stats.evictions += 1
                
        # Then evict based on LRU/LFU hybrid
        while len(self._cache) >= self.maxsize and evicted < num_to_evict:
            # Find least recently/frequently used entry
            # Simple hybrid: prioritize least recently used, but consider access count
            candidate_keys = list(self._cache.keys())[:min(10, len(self._cache))]  # Sample first 10
            key_to_evict = min(candidate_keys, key=lambda k: (
                self._cache[k].last_accessed,  # Primary: LRU
                -self._cache[k].access_count   # Secondary: LFU (negative for min)
            ))
            
            del self._cache[key_to_evict]
            evicted += 1
            self._stats.evictions += 1
            
        return evicted
    
    def _calculate_adaptive_ttl(self, entry: CacheEntry) -> float:
        """Calculate adaptive TTL based on access patterns."""
        if not self.adaptive_ttl:
            return self.ttl
            
        current_time = time.time()
        age = current_time - entry.timestamp
        
        # Access frequency in the recent window
        access_frequency = entry.access_count / max(1.0, age)
        
        # Adjust TTL based on frequency
        # More frequent access -> longer TTL
        # Less frequent access -> shorter TTL
        if access_frequency > 1.0:  # Accessed more than once per second on average
            adaptive_factor = min(5.0, access_frequency)  # Cap at 5x increase
        elif access_frequency < 0.1:  # Accessed less than once every 10 seconds on average
            adaptive_factor = max(0.1, access_frequency * 10)  # Cap at 10x decrease
        else:
            adaptive_factor = 1.0
            
        calculated_ttl = self.ttl * adaptive_factor
        return max(self._min_ttl, min(calculated_ttl, self._max_ttl))
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        with self._lock:
            self._stats.hits += 1
            
            # Try to get from Redis first if enabled
            if self.use_redis and self._redis_client:
                redis_key = f"{self.redis_prefix}{key}"
                try:
                    cached_result = self._redis_client.get(redis_key)
                    if cached_result is not None:
                        logger.debug(f"Redis cache hit for {redis_key}")
                        return cached_result
                except Exception as e:
                    logger.warning(f"Error getting from Redis cache: {e}")
            
            if key not in self._cache:
                self._stats.misses += 1
                return None
                
            entry = self._cache[key]
            
            # Check expiration with adaptive TTL
            effective_ttl = self._calculate_adaptive_ttl(entry)
            if time.time() - entry.timestamp > effective_ttl:
                del self._cache[key]
                self._stats.expired += 1
                self._stats.misses += 1
                return None
            
            # Update access metadata
            entry.access_count += 1
            entry.last_accessed = time.time()
            
            # Move to end (LRU)
            self._cache.move_to_end(key)
            
            return entry.value
    
    def set(self, key: str, value: Any, size_estimate: int = 0) -> None:
        """Set value in cache."""
        with self._lock:
            current_time = time.time()
            
            # Cleanup expired entries periodically
            if len(self._cache) % 100 == 0:
                self._cleanup_expired()
            
            # Remove if already exists
            if key in self._cache:
                del self._cache[key]
            
            # Create new entry
            entry = CacheEntry(
                value=value,
                timestamp=current_time,
                access_count=1,
                last_accessed=current_time,
                size_estimate=size_estimate
            )
            
            # Evict if necessary
            if len(self._cache) >= self.maxsize:
                self._evict_entries()
            
            self._cache[key] = entry
            
            # Also set in Redis if enabled
            if self.use_redis and self._redis_client:
                redis_key = f"{self.redis_prefix}{key}"
                try:
                    self._redis_client.set(redis_key, value, expire=int(self.ttl))
                    logger.debug(f"Set value in Redis cache for {redis_key} (TTL: {self.ttl}s)")
                except Exception as e:
                    logger.warning(f"Error setting value in Redis cache: {e}")
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        with self._lock:
            deleted = False
            
            # Delete from local cache
            if key in self._cache:
                del self._cache[key]
                deleted = True
            
            # Also delete from Redis if enabled
            if self.use_redis and self._redis_client:
                redis_key = f"{self.redis_prefix}{key}"
                try:
                    result = self._redis_client.delete(redis_key)
                    if result:
                        logger.debug(f"Deleted key from Redis cache: {redis_key}")
                        deleted = True
                except Exception as e:
                    logger.warning(f"Error deleting key from Redis cache: {e}")
            
            return deleted
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            
            # Also clear Redis if enabled
            if self.use_redis and self._redis_client:
                try:
                    # Note: This clears the entire Redis database, not just the prefix.
                    # For production, you might want a more targeted approach.
                    self._redis_client.flushdb()
                    logger.info("Cleared Redis cache")
                except Exception as e:
                    logger.warning(f"Error clearing Redis cache: {e}")
    
    def size(self) -> int:
        """Get current cache size."""
        with self._lock:
            self._cleanup_expired()
            return len(self._cache)
    
    def stats(self) -> Dict[str, Any]:
        """Get detailed cache statistics."""
        with self._lock:
            self._cleanup_expired()
            
            total_requests = self._stats.hits + self._stats.misses
            hit_ratio = self._stats.hits / max(1, total_requests)
            
            # Get Redis info if enabled
            redis_info = {}
            if self.use_redis and self._redis_client:
                try:
                    redis_info = self._redis_client.info() or {}
                except Exception as e:
                    logger.warning(f"Error getting Redis info: {e}")
            
            return {
                'hits': self._stats.hits,
                'misses': self._stats.misses,
                'evictions': self._stats.evictions,
                'expired': self._stats.expired,
                'size': len(self._cache),
                'maxsize': self._stats.maxsize,
                'ttl': self._stats.ttl,
                'hit_ratio': round(hit_ratio, 4),
                'memory_usage_bytes': sum(entry.size_estimate for entry in self._cache.values()),
                'redis_enabled': self.use_redis,
                'redis_info': redis_info
            }


# Global cache instances with adaptive strategies
_stock_cache = AdaptiveTTLCache(
    maxsize=CacheSize.STOCK_CACHE, 
    ttl=CacheTTL.STOCK_DATA_SHORT,
    adaptive_ttl=True,
    size_based_eviction=True,
    max_memory_bytes=50 * 1024 * 1024,  # 50MB limit
    use_redis=True,  # Enable Redis integration
    redis_prefix="stock:"
)  # Stock data cache

_price_history_cache = AdaptiveTTLCache(
    maxsize=200, 
    ttl=CacheTTL.STOCK_HISTORY,
    adaptive_ttl=True,
    use_redis=True,  # Enable Redis integration
    redis_prefix="price_history:"
)  # Price history cache

_current_price_cache = AdaptiveTTLCache(
    maxsize=CacheSize.CURRENT_PRICE_CACHE, 
    ttl=CacheTTL.CURRENT_PRICE,
    adaptive_ttl=False,  # Keep fixed TTL for current prices
    use_redis=True,  # Enable Redis integration
    redis_prefix="current_price:"
)  # Current price cache


def _get_cache_config(path: str) -> dict:
    """Get cache configuration for a given path using enhanced wildcard matching.
    
    This function supports complex wildcard patterns with multiple '*' characters.
    
    Args:
        path: The request path to match against cache settings
        
    Returns:
        Dictionary with cache configuration (ttl, maxsize) or empty dict if no match
    """
    # Example CACHE_SETTINGS - in a real implementation this would be defined elsewhere
    # CACHE_SETTINGS = {
    #     "/api/stocks/*": {"ttl": 300, "maxsize": 500},
    #     "/api/stocks/*/history/*": {"ttl": 600, "maxsize": 200},
    #     "/api/stocks/*/current": {"ttl": 60, "maxsize": 1000}
    # }
    
    # For this implementation, we'll use a mock CACHE_SETTINGS
    CACHE_SETTINGS = {
        "/api/stocks/*": {"ttl": 300, "maxsize": 500},
        "/api/stocks/*/history/*": {"ttl": 600, "maxsize": 200},
        "/api/stocks/*/current": {"ttl": 60, "maxsize": 1000}
    }
    
    for pattern, config in CACHE_SETTINGS.items():
        # Convert wildcard pattern to regex
        # Escape special regex characters except '*'
        escaped_pattern = re.escape(pattern)
        # Replace escaped '*' with '.*' for regex matching
        regex_pattern = escaped_pattern.replace(r'\*', '[^/]*')
        # Add start and end anchors
        regex_pattern = f"^{regex_pattern}$"
        
        if re.match(regex_pattern, path):
            return config
    
    return {}


def cache_stock_data(cache_key_func: Optional[Callable] = None, ttl: float = CacheTTL.STOCK_DATA_SHORT):
    """Decorator to cache stock data responses.
    
    Args:
        cache_key_func: Function to generate cache key from function args
        ttl: Time to live in seconds
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                # Use improved key generation
                stock_code = kwargs.get('stock_code') or (args[0] if args else 'unknown')
                cache_key = generate_stock_cache_key(func.__name__, stock_code, **kwargs)
            
            # Try to get from cache
            cached_result = _stock_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            # Estimate size (simple estimation)
            size_estimate = len(str(result)) if result else 0
            _stock_cache.set(cache_key, result, size_estimate=size_estimate)
            logger.debug(f"Cache miss, stored result for {cache_key} (size: {size_estimate} bytes)")
            
            return result
        return wrapper
    return decorator


def cache_price_history(cache_key_func: Optional[Callable] = None):
    """Decorator to cache price history responses."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                # Use improved key generation for price history
                stock_code = kwargs.get('stock_code') or (args[0] if args else 'unknown')
                cache_key = generate_stock_cache_key("price_history", stock_code, **kwargs)
            
            # Try to get from cache
            cached_result = _price_history_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            # Estimate size (more complex data structure)
            size_estimate = len(str(result)) * 2 if result else 0  # Rough estimate for list/dict
            _price_history_cache.set(cache_key, result, size_estimate=size_estimate)
            logger.debug(f"Cache miss, stored result for {cache_key} (size: {size_estimate} bytes)")
            
            return result
        return wrapper
    return decorator


def cache_current_price(cache_key_func: Optional[Callable] = None):
    """Decorator to cache current price responses."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                # Use improved key generation for current price
                stock_code = kwargs.get('stock_code') or (args[0] if args else 'unknown')
                cache_key = generate_stock_cache_key("current_price", stock_code, **kwargs)
            
            # Try to get from cache
            cached_result = _current_price_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            # Estimate size (small, simple data structure)
            size_estimate = len(str(result)) if result else 0
            _current_price_cache.set(cache_key, result, size_estimate=size_estimate)
            logger.debug(f"Cache miss, stored result for {cache_key} (size: {size_estimate} bytes)")
            
            return result
        return wrapper
    return decorator


def invalidate_stock_cache(stock_code: str) -> None:
    """Invalidate all cache entries for a stock."""
    keys_to_remove = []
    
    # Check stock data cache
    for key in _stock_cache._cache.keys():
        if stock_code in key:
            keys_to_remove.append(('stock', key))
    
    # Check price history cache
    for key in _price_history_cache._cache.keys():
        if stock_code in key:
            keys_to_remove.append(('price_history', key))
    
    # Check current price cache
    for key in _current_price_cache._cache.keys():
        if stock_code in key:
            keys_to_remove.append(('current_price', key))
    
    # Remove keys
    for cache_type, key in keys_to_remove:
        if cache_type == 'stock':
            _stock_cache.delete(key)
        elif cache_type == 'price_history':
            _price_history_cache.delete(key)
        elif cache_type == 'current_price':
            _current_price_cache.delete(key)
    
    logger.info(f"Invalidated {len(keys_to_remove)} cache entries for stock {stock_code}")


def clear_all_caches() -> None:
    """Clear all caches."""
    _stock_cache.clear()
    _price_history_cache.clear()
    _current_price_cache.clear()
    logger.info("Cleared all caches")


def get_cache_stats() -> Dict[str, Any]:
    """Get detailed statistics for all caches."""
    return {
        'stock_cache': _stock_cache.stats(),
        'price_history_cache': _price_history_cache.stats(),
        'current_price_cache': _current_price_cache.stats()
    }


def set_cache_ttls(
    *,
    stock_info_ttl: Optional[float] = None,
    current_price_ttl: Optional[float] = None,
    price_history_ttl: Optional[float] = None,
) -> None:
    """Update TTLs for the global caches at runtime.

    Args:
        stock_info_ttl: TTL in seconds for stock info cache
        current_price_ttl: TTL in seconds for current price cache
        price_history_ttl: TTL in seconds for price history cache
    """
    if stock_info_ttl is not None:
        _stock_cache.ttl = float(stock_info_ttl)
    if current_price_ttl is not None:
        _current_price_cache.ttl = float(current_price_ttl)
    if price_history_ttl is not None:
        _price_history_cache.ttl = float(price_history_ttl)


def configure_cache_ttls_from_settings() -> None:
    """Sync cache TTLs from application settings if available.

    Safe to call multiple times; falls back silently if settings import fails.
    """
    try:
        # Local import to avoid circular dependencies at module import time
        from ..config import get_cache_config  # type: ignore

        cfg = get_cache_config()
        set_cache_ttls(
            stock_info_ttl=cfg.stock_info_ttl,
            current_price_ttl=cfg.current_price_ttl,
            price_history_ttl=cfg.price_history_ttl,
        )
        logger.info(
            "Configured cache TTLs from settings",
            extra={
                "stock_info_ttl": cfg.stock_info_ttl,
                "current_price_ttl": cfg.current_price_ttl,
                "price_history_ttl": cfg.price_history_ttl,
            },
        )
    except Exception:
        # Non-fatal: caching still works with default TTLs
        logger.debug("Cache TTL configuration skipped (settings unavailable)")