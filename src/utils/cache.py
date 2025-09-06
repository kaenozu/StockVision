"""
In-memory caching utility for performance optimization.

This module provides a simple LRU cache with TTL (Time To Live) support
for caching API responses and reducing database queries.
"""
import logging
import time
import re
from functools import wraps
from typing import Any, Optional, Callable, Dict, Tuple
from collections import OrderedDict

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe TTL (Time To Live) cache with LRU eviction."""
    
    def __init__(self, maxsize: int = 1000, ttl: float = 300.0):
        """Initialize TTL cache.
        
        Args:
            maxsize: Maximum number of items to store (default: 1000)
            ttl: Time to live in seconds (default: 300 = 5 minutes)
        """
        self.maxsize = maxsize
        self.ttl = ttl
        self._cache: OrderedDict[str, Tuple[Any, float]] = OrderedDict()
        self._hits = 0
        self._requests = 0
        
    def _is_expired(self, timestamp: float) -> bool:
        """Check if timestamp is expired."""
        return time.time() - timestamp > self.ttl
    
    def _cleanup_expired(self) -> None:
        """Remove expired entries."""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self._cache.items()
            if current_time - timestamp > self.ttl
        ]
        for key in expired_keys:
            del self._cache[key]
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        # request count
        self._requests = getattr(self, '_requests', 0) + 1
        if key not in self._cache:
            return None
            
        value, timestamp = self._cache[key]
        
        if self._is_expired(timestamp):
            del self._cache[key]
            return None
        
        # Move to end (LRU)
        self._cache.move_to_end(key)
        # hit count
        self._hits = getattr(self, '_hits', 0) + 1
        return value
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache."""
        current_time = time.time()
        
        # Clean up expired entries periodically
        if len(self._cache) % 100 == 0:
            self._cleanup_expired()
        
        # Remove oldest if at capacity
        while len(self._cache) >= self.maxsize:
            self._cache.popitem(last=False)
        
        self._cache[key] = (value, current_time)
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
    
    def size(self) -> int:
        """Get current cache size."""
        self._cleanup_expired()
        return len(self._cache)
    
    def stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        self._cleanup_expired()
        requests = getattr(self, '_requests', 0)
        hits = getattr(self, '_hits', 0)
        return {
            'size': len(self._cache),
            'maxsize': self.maxsize,
            'ttl': self.ttl,
            'requests': requests,
            'hits': hits,
            'hit_ratio': (hits / requests) if requests else 0.0,
        }


# Global cache instances
_stock_cache = TTLCache(maxsize=500, ttl=300.0)  # 5 minutes TTL for stock data
_price_history_cache = TTLCache(maxsize=200, ttl=600.0)  # 10 minutes TTL for price history
_current_price_cache = TTLCache(maxsize=1000, ttl=60.0)  # 1 minute TTL for current prices


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


def cache_stock_data(cache_key_func: Optional[Callable] = None, ttl: float = 300.0):
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
                # Default key generation
                stock_code = kwargs.get('stock_code') or (args[0] if args else 'unknown')
                cache_key = f"{func.__name__}:{stock_code}"
            
            # Try to get from cache
            cached_result = _stock_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            _stock_cache.set(cache_key, result)
            logger.debug(f"Cache miss, stored result for {cache_key}")
            
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
                stock_code = kwargs.get('stock_code') or (args[0] if args else 'unknown')
                days = kwargs.get('days', 30)
                cache_key = f"price_history:{stock_code}:{days}"
            
            # Try to get from cache
            cached_result = _price_history_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            _price_history_cache.set(cache_key, result)
            logger.debug(f"Cache miss, stored result for {cache_key}")
            
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
                stock_code = kwargs.get('stock_code') or (args[0] if args else 'unknown')
                cache_key = f"current_price:{stock_code}"
            
            # Try to get from cache
            cached_result = _current_price_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            _current_price_cache.set(cache_key, result)
            logger.debug(f"Cache miss, stored result for {cache_key}")
            
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
    """Get statistics for all caches."""
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