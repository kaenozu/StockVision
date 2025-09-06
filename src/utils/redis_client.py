"""
Redis client utility for external caching.

This module provides a Redis client wrapper for integrating with Redis
for distributed caching and session storage.
"""
import logging
import json
import pickle
from typing import Any, Optional, Union
from functools import wraps

import redis
from redis import Redis
from redis.exceptions import ConnectionError, TimeoutError

from ..config import get_settings

logger = logging.getLogger(__name__)


class RedisClient:
    """Redis client wrapper with connection pooling and error handling."""
    
    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0, password: Optional[str] = None):
        """Initialize Redis client.
        
        Args:
            host: Redis server host
            port: Redis server port
            db: Redis database number
            password: Redis server password (if required)
        """
        self.host = host
        self.port = port
        self.db = db
        self.password = password
        
        # Connection pool for efficient connection reuse
        self.pool = redis.ConnectionPool(
            host=host,
            port=port,
            db=db,
            password=password,
            max_connections=20,  # Adjust based on your needs
            decode_responses=True  # Automatically decode responses to strings
        )
        
        # Redis client instance
        self.client: Optional[Redis] = None
        self.connected = False
        
    def connect(self) -> bool:
        """Establish connection to Redis server.
        
        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            if not self.client:
                self.client = redis.Redis(connection_pool=self.pool)
            
            # Ping to test connection
            self.client.ping()
            self.connected = True
            logger.info(f"Connected to Redis at {self.host}:{self.port}/{self.db}")
            return True
            
        except (ConnectionError, TimeoutError) as e:
            logger.error(f"Failed to connect to Redis at {self.host}:{self.port}/{self.db}: {e}")
            self.connected = False
            return False
        except Exception as e:
            logger.error(f"Unexpected error connecting to Redis: {e}")
            self.connected = False
            return False
    
    def disconnect(self) -> None:
        """Disconnect from Redis server."""
        if self.client:
            self.client.close()
            self.client = None
        self.connected = False
        logger.info("Disconnected from Redis")
    
    def _ensure_connection(self) -> bool:
        """Ensure Redis client is connected.
        
        Returns:
            bool: True if connected, False otherwise
        """
        if not self.connected or not self.client:
            return self.connect()
        return True
    
    def set(self, key: str, value: Any, expire: Optional[int] = None) -> bool:
        """Set a key-value pair in Redis.
        
        Args:
            key: Key to set
            value: Value to set (will be serialized to JSON)
            expire: Expiration time in seconds (optional)
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._ensure_connection():
            return False
            
        try:
            # Serialize value to JSON
            serialized_value = json.dumps(value, ensure_ascii=False)
            
            if expire:
                result = self.client.setex(key, expire, serialized_value)
            else:
                result = self.client.set(key, serialized_value)
                
            if result:
                logger.debug(f"Set key '{key}' in Redis (expire: {expire})")
            else:
                logger.warning(f"Failed to set key '{key}' in Redis")
                
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error setting key '{key}' in Redis: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value from Redis by key.
        
        Args:
            key: Key to get
            
        Returns:
            Optional[Any]: Deserialized value or None if key not found or error
        """
        if not self._ensure_connection():
            return None
            
        try:
            serialized_value = self.client.get(key)
            
            if serialized_value is None:
                logger.debug(f"Key '{key}' not found in Redis")
                return None
                
            # Deserialize value from JSON
            value = json.loads(serialized_value)
            logger.debug(f"Retrieved key '{key}' from Redis")
            return value
            
        except Exception as e:
            logger.error(f"Error getting key '{key}' from Redis: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a key from Redis.
        
        Args:
            key: Key to delete
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._ensure_connection():
            return False
            
        try:
            result = self.client.delete(key)
            
            if result:
                logger.debug(f"Deleted key '{key}' from Redis")
            else:
                logger.debug(f"Key '{key}' not found in Redis for deletion")
                
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error deleting key '{key}' from Redis: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if a key exists in Redis.
        
        Args:
            key: Key to check
            
        Returns:
            bool: True if key exists, False otherwise
        """
        if not self._ensure_connection():
            return False
            
        try:
            result = self.client.exists(key)
            return bool(result)
            
        except Exception as e:
            logger.error(f"Error checking existence of key '{key}' in Redis: {e}")
            return False
    
    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Increment the integer value of a key by the given amount.
        
        Args:
            key: Key to increment
            amount: Amount to increment by (default: 1)
            
        Returns:
            Optional[int]: New value of the key or None if error
        """
        if not self._ensure_connection():
            return None
            
        try:
            result = self.client.incrby(key, amount)
            logger.debug(f"Incremented key '{key}' by {amount} in Redis")
            return result
            
        except Exception as e:
            logger.error(f"Error incrementing key '{key}' in Redis: {e}")
            return None
    
    def decrement(self, key: str, amount: int = 1) -> Optional[int]:
        """Decrement the integer value of a key by the given amount.
        
        Args:
            key: Key to decrement
            amount: Amount to decrement by (default: 1)
            
        Returns:
            Optional[int]: New value of the key or None if error
        """
        if not self._ensure_connection():
            return None
            
        try:
            result = self.client.decrby(key, amount)
            logger.debug(f"Decremented key '{key}' by {amount} in Redis")
            return result
            
        except Exception as e:
            logger.error(f"Error decrementing key '{key}' in Redis: {e}")
            return None
    
    def sadd(self, key: str, *members) -> Optional[int]:
        """Add one or more members to a set.
        
        Args:
            key: Key of the set
            *members: Members to add
            
        Returns:
            Optional[int]: Number of members added or None if error
        """
        if not self._ensure_connection():
            return None
            
        try:
            result = self.client.sadd(key, *members)
            logger.debug(f"Added {result} members to set '{key}' in Redis")
            return result
            
        except Exception as e:
            logger.error(f"Error adding members to set '{key}' in Redis: {e}")
            return None
    
    def smembers(self, key: str) -> Optional[set]:
        """Get all members of a set.
        
        Args:
            key: Key of the set
            
        Returns:
            Optional[set]: Set of members or None if error
        """
        if not self._ensure_connection():
            return None
            
        try:
            result = self.client.smembers(key)
            logger.debug(f"Retrieved {len(result)} members from set '{key}' in Redis")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving members from set '{key}' in Redis: {e}")
            return None
    
    def srem(self, key: str, *members) -> Optional[int]:
        """Remove one or more members from a set.
        
        Args:
            key: Key of the set
            *members: Members to remove
            
        Returns:
            Optional[int]: Number of members removed or None if error
        """
        if not self._ensure_connection():
            return None
            
        try:
            result = self.client.srem(key, *members)
            logger.debug(f"Removed {result} members from set '{key}' in Redis")
            return result
            
        except Exception as e:
            logger.error(f"Error removing members from set '{key}' in Redis: {e}")
            return None
    
    def flushdb(self) -> bool:
        """Remove all keys from the current database.
        
        Returns:
            bool: True if successful, False otherwise
        """
        if not self._ensure_connection():
            return False
            
        try:
            self.client.flushdb()
            logger.info("Flushed Redis database")
            return True
            
        except Exception as e:
            logger.error(f"Error flushing Redis database: {e}")
            return False
    
    def info(self) -> Optional[dict]:
        """Get Redis server information.
        
        Returns:
            Optional[dict]: Server information or None if error
        """
        if not self._ensure_connection():
            return None
            
        try:
            info = self.client.info()
            return info
            
        except Exception as e:
            logger.error(f"Error getting Redis server info: {e}")
            return None


# Global Redis client instance
_redis_client: Optional[RedisClient] = None


def get_redis_client() -> RedisClient:
    """Get or create a global Redis client instance.
    
    Returns:
        RedisClient: Redis client instance
    """
    global _redis_client
    
    if _redis_client is None:
        settings = get_settings()
        
        # Create Redis client with settings from environment variables
        _redis_client = RedisClient(
            host=settings.redis_host or "localhost",
            port=settings.redis_port or 6379,
            db=settings.redis_db or 0,
            password=settings.redis_password
        )
        
        # Attempt to connect
        _redis_client.connect()
    
    return _redis_client


def close_redis_client() -> None:
    """Close the global Redis client connection."""
    global _redis_client
    
    if _redis_client:
        _redis_client.disconnect()
        _redis_client = None


def redis_cache(ttl: int = 300):
    """Decorator to cache function results in Redis.
    
    Args:
        ttl: Time to live in seconds (default: 300)
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from Redis cache
            redis_client = get_redis_client()
            cached_result = redis_client.get(cache_key)
            
            if cached_result is not None:
                logger.debug(f"Redis cache hit for {cache_key}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            redis_client.set(cache_key, result, expire=ttl)
            logger.debug(f"Redis cache miss, stored result for {cache_key} (TTL: {ttl}s)")
            
            return result
        return wrapper
    return decorator