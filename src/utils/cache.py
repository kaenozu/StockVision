"""
In-memory caching utility for performance optimization.

This module provides a simple LRU cache with TTL (Time To Live) support
for caching API responses and reducing database queries.
"""
import logging
import time
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
        if key not in self._cache:
            return None
            
        value, timestamp = self._cache[key]
        
        if self._is_expired(timestamp):
            del self._cache[key]
            return None
        
        # Move to end (LRU)
        self._cache.move_to_end(key)
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
        return {
            'size': len(self._cache),
            'maxsize': self.maxsize,
            'ttl': self.ttl,
            'hit_ratio': getattr(self, '_hits', 0) / max(getattr(self, '_requests', 1), 1)
        }


# Global cache instances
_stock_cache = TTLCache(maxsize=500, ttl=300.0)  # 5 minutes TTL for stock data
_price_history_cache = TTLCache(maxsize=200, ttl=600.0)  # 10 minutes TTL for price history
_current_price_cache = TTLCache(maxsize=1000, ttl=60.0)  # 1 minute TTL for current prices


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