"""
Robust cache key generation utilities.

This module provides improved cache key generation strategies to avoid key collisions
and ensure consistent cache key generation across the application.
"""

import hashlib
import json
import urllib.parse
from typing import Any, Dict, List, Optional, Union
from dataclasses import dataclass
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class CacheKeyConfig:
    """Configuration for cache key generation."""
    
    namespace: str = "stockvision"
    version: str = "v1"
    include_timestamp: bool = False
    hash_long_keys: bool = True
    max_key_length: int = 250
    hash_algorithm: str = "sha256"


class CacheKeyGenerator:
    """
    Robust cache key generator that prevents collisions and provides consistent keys.
    
    Features:
    - Namespace support to avoid global collisions
    - Deterministic serialization of complex parameters
    - Automatic hashing of long keys to prevent length issues
    - Version support for cache invalidation during deployments
    - Type-safe parameter handling
    """
    
    def __init__(self, config: Optional[CacheKeyConfig] = None):
        self.config = config or CacheKeyConfig()
    
    def generate_key(
        self,
        operation: str,
        primary_key: str,
        parameters: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a robust cache key.
        
        Args:
            operation: The operation being cached (e.g., 'get_stock_data', 'price_history')
            primary_key: The primary identifier (e.g., stock_code)
            parameters: Additional parameters that affect the result
            context: Context information (user_id, session_id, etc.)
            
        Returns:
            A robust, collision-resistant cache key
        """
        # Build key components in a structured way
        key_components = [
            self.config.namespace,
            self.config.version,
            operation,
            primary_key
        ]
        
        # Add parameters if provided
        if parameters:
            param_string = self._serialize_parameters(parameters)
            key_components.append(param_string)
        
        # Add context if provided
        if context:
            context_string = self._serialize_parameters(context, prefix="ctx")
            key_components.append(context_string)
        
        # Add timestamp if configured
        if self.config.include_timestamp:
            # Use minute-level precision to allow some caching but ensure freshness
            timestamp = datetime.now().strftime("%Y%m%d%H%M")
            key_components.append(f"ts={timestamp}")
        
        # Join components with delimiter
        raw_key = ":".join(key_components)
        
        # Hash if key is too long
        if self.config.hash_long_keys and len(raw_key) > self.config.max_key_length:
            return self._hash_key(raw_key)
        
        return raw_key
    
    def generate_stock_key(
        self,
        operation: str,
        stock_code: str,
        **kwargs: Any
    ) -> str:
        """
        Convenience method for generating stock-related cache keys.
        
        Args:
            operation: Stock operation (e.g., 'current_price', 'history', 'info')
            stock_code: Stock symbol/code
            **kwargs: Additional parameters (period, days, etc.)
            
        Returns:
            Cache key for stock operations
        """
        return self.generate_key(
            operation=f"stock:{operation}",
            primary_key=stock_code,
            parameters=kwargs if kwargs else None
        )
    
    def generate_api_key(
        self,
        endpoint: str,
        method: str = "GET",
        params: Optional[Dict[str, Any]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate cache key for API responses.
        
        Args:
            endpoint: API endpoint path
            method: HTTP method
            params: Query parameters or request body
            user_context: User-specific context
            
        Returns:
            Cache key for API responses
        """
        operation = f"api:{method.lower()}:{endpoint.strip('/').replace('/', ':')}"
        
        # Use a deterministic primary key for API calls
        primary_key = self._generate_api_primary_key(endpoint, method, params)
        
        return self.generate_key(
            operation=operation,
            primary_key=primary_key,
            parameters=params,
            context=user_context
        )
    
    def _serialize_parameters(self, params: Dict[str, Any], prefix: str = "") -> str:
        """
        Serialize parameters in a deterministic way.
        
        Args:
            params: Parameters to serialize
            prefix: Optional prefix for the serialized string
            
        Returns:
            Deterministic string representation of parameters
        """
        if not params:
            return ""
        
        # Sort keys for deterministic output
        sorted_items = []
        for key in sorted(params.keys()):
            value = params[key]
            serialized_value = self._serialize_value(value)
            sorted_items.append(f"{key}={serialized_value}")
        
        param_str = "&".join(sorted_items)
        return f"{prefix}({param_str})" if prefix else param_str
    
    def _serialize_value(self, value: Any) -> str:
        """
        Serialize a single value in a deterministic way with type information.
        
        Args:
            value: Value to serialize
            
        Returns:
            String representation of the value with type prefix
        """
        if value is None:
            return "null"
        elif isinstance(value, bool):
            # Handle bool before int (since bool is subclass of int in Python)
            return f"bool:{'true' if value else 'false'}"
        elif isinstance(value, int):
            return f"int:{value}"
        elif isinstance(value, float):
            return f"float:{value}"
        elif isinstance(value, str):
            # URL encode the string to escape delimiters and special characters
            encoded_value = urllib.parse.quote(value, safe='')
            return f"str:{encoded_value}"
        elif isinstance(value, (list, tuple)):
            # Sort lists for deterministic output (if possible)
            try:
                sorted_list = sorted(value)
                serialized_items = ','.join(self._serialize_value(item) for item in sorted_list)
                return f"list:[{serialized_items}]"
            except TypeError:
                # If items are not sortable, use original order
                serialized_items = ','.join(self._serialize_value(item) for item in value)
                return f"list:[{serialized_items}]"
        elif isinstance(value, dict):
            return f"dict:{self._serialize_parameters(value)}"
        else:
            # For complex objects, use JSON serialization
            try:
                json_value = json.dumps(value, sort_keys=True, separators=(',', ':'))
                return f"json:{json_value}"
            except (TypeError, ValueError):
                # Fallback to string representation
                return f"obj:{str(value)}"
    
    def _generate_api_primary_key(
        self,
        endpoint: str,
        method: str,
        params: Optional[Dict[str, Any]]
    ) -> str:
        """Generate primary key for API cache keys."""
        key_parts = [endpoint.strip('/')]
        
        if params:
            # Include key parameters that identify the resource
            resource_params = []
            for key in sorted(params.keys()):
                if key in ['id', 'symbol', 'code', 'stock_code', 'user_id']:
                    resource_params.append(f"{key}={params[key]}")
            
            if resource_params:
                key_parts.append("&".join(resource_params))
        
        return ":".join(key_parts)
    
    def _hash_key(self, key: str) -> str:
        """
        Hash a key using the configured algorithm.
        
        Args:
            key: Key to hash
            
        Returns:
            Hashed key with original length info
        """
        hasher = hashlib.new(self.config.hash_algorithm)
        hasher.update(key.encode('utf-8'))
        hash_value = hasher.hexdigest()
        
        # Include original key length for debugging
        return f"{self.config.namespace}:hash:{hash_value}:len={len(key)}"
    
    def extract_components(self, cache_key: str) -> Dict[str, str]:
        """
        Extract components from a generated cache key for debugging.
        
        Args:
            cache_key: Cache key to analyze
            
        Returns:
            Dictionary of key components
        """
        if cache_key.startswith(f"{self.config.namespace}:hash:"):
            # Hashed key
            parts = cache_key.split(":")
            return {
                "type": "hashed",
                "namespace": parts[0],
                "hash": parts[2],
                "original_length": parts[3] if len(parts) > 3 else "unknown"
            }
        
        # Regular key
        parts = cache_key.split(":")
        components = {"type": "regular"}
        
        if len(parts) >= 4:
            components.update({
                "namespace": parts[0],
                "version": parts[1],
                "operation": parts[2],
                "primary_key": parts[3]
            })
            
            if len(parts) > 4:
                components["additional_params"] = ":".join(parts[4:])
        
        return components


# Global cache key generator instance
_default_generator = CacheKeyGenerator()


def generate_cache_key(
    operation: str,
    primary_key: str,
    parameters: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate a cache key using the default generator.
    
    This is a convenience function for the most common use case.
    """
    return _default_generator.generate_key(operation, primary_key, parameters, context)


def generate_stock_cache_key(operation: str, stock_code: str, **kwargs: Any) -> str:
    """Generate cache key for stock operations using the default generator."""
    return _default_generator.generate_stock_key(operation, stock_code, **kwargs)


def generate_api_cache_key(
    endpoint: str,
    method: str = "GET",
    params: Optional[Dict[str, Any]] = None,
    user_context: Optional[Dict[str, Any]] = None
) -> str:
    """Generate cache key for API responses using the default generator."""
    return _default_generator.generate_api_key(endpoint, method, params, user_context)


def get_cache_key_info(cache_key: str) -> Dict[str, str]:
    """Get information about a cache key for debugging purposes."""
    return _default_generator.extract_components(cache_key)


# Configuration function for customizing the default generator
def configure_cache_keys(
    namespace: str = "stockvision",
    version: str = "v1",
    include_timestamp: bool = False,
    hash_long_keys: bool = True,
    max_key_length: int = 250
):
    """Configure the default cache key generator."""
    global _default_generator
    
    config = CacheKeyConfig(
        namespace=namespace,
        version=version,
        include_timestamp=include_timestamp,
        hash_long_keys=hash_long_keys,
        max_key_length=max_key_length
    )
    
    _default_generator = CacheKeyGenerator(config)
    
    logger.info(f"Cache key generator configured: namespace={namespace}, version={version}")