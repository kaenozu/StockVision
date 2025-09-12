"""
Cache management for stock data services.
"""

import asyncio
import logging
import time
from typing import Any, Dict, Optional

from ...utils.cache_key_generator import generate_stock_cache_key

logger = logging.getLogger(__name__)


class CacheManager:
    """Simple in-memory cache for stock data API responses."""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    def _get_cache_key(self, operation: str, stock_code: str, **kwargs) -> str:
        """Generate robust cache key for operation using improved key generation."""
        return generate_stock_cache_key(operation, stock_code, **kwargs)

    async def get(
        self, operation: str, stock_code: str, ttl: int = 300, **kwargs
    ) -> Optional[Any]:
        """Get cached data if available and not expired."""
        async with self._lock:
            cache_key = self._get_cache_key(operation, stock_code, **kwargs)

            if cache_key not in self._cache:
                return None

            cached_data = self._cache[cache_key]

            # Check if expired
            if time.time() - cached_data["timestamp"] > ttl:
                del self._cache[cache_key]
                return None

            logger.debug(f"Cache hit for {cache_key}")
            return cached_data["data"]

    async def set(self, operation: str, stock_code: str, data: Any, **kwargs) -> None:
        """Cache data with timestamp."""
        async with self._lock:
            cache_key = self._get_cache_key(operation, stock_code, **kwargs)

            self._cache[cache_key] = {"data": data, "timestamp": time.time()}
            logger.debug(f"Cached data for {cache_key}")

    async def clear(self) -> None:
        """Clear all cached data."""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "entries": len(self._cache),
            "size_bytes": len(str(self._cache).encode("utf-8")),
        }
