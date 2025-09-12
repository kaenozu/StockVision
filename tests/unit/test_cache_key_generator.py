"""
Unit tests for the robust cache key generator.

These tests verify that the cache key generation system prevents collisions
and provides consistent, deterministic keys.
"""

from datetime import datetime
from unittest.mock import patch

import pytest

from src.utils.cache_key_generator import (
    CacheKeyConfig,
    CacheKeyGenerator,
    generate_api_cache_key,
    generate_cache_key,
    generate_stock_cache_key,
    get_cache_key_info,
)


class TestCacheKeyGenerator:
    """Test cases for the CacheKeyGenerator class."""

    def test_basic_key_generation(self):
        """Test basic cache key generation."""
        generator = CacheKeyGenerator()

        key = generator.generate_key("get_stock", "7203")
        expected = "stockvision:v1:get_stock:7203"

        assert key == expected

    def test_key_with_parameters(self):
        """Test cache key generation with parameters."""
        generator = CacheKeyGenerator()

        parameters = {"days": 30, "period": "1d"}
        key = generator.generate_key("price_history", "7203", parameters)

        # Parameters should be included in sorted order with type prefixes
        assert "days=int:30" in key
        assert "period=str:1d" in key
        assert "7203" in key

    def test_key_with_context(self):
        """Test cache key generation with context."""
        generator = CacheKeyGenerator()

        context = {"user_id": "123", "session": "abc"}
        key = generator.generate_key("api_call", "endpoint", context=context)

        assert "ctx(session=str:abc&user_id=str:123)" in key

    def test_parameter_serialization_consistency(self):
        """Test that parameter serialization is deterministic."""
        generator = CacheKeyGenerator()

        params1 = {"b": 2, "a": 1, "c": 3}
        params2 = {"a": 1, "b": 2, "c": 3}

        key1 = generator.generate_key("test", "key", params1)
        key2 = generator.generate_key("test", "key", params2)

        # Keys should be identical regardless of parameter order
        assert key1 == key2

    def test_complex_parameter_serialization(self):
        """Test serialization of complex parameters."""
        generator = CacheKeyGenerator()

        parameters = {
            "list_param": [3, 1, 2],  # Will be sorted
            "dict_param": {"z": 1, "a": 2},  # Will be sorted
            "none_param": None,
            "bool_param": True,
            "float_param": 3.14,
        }

        key = generator.generate_key("test", "complex", parameters)

        # Verify serialization format with type prefixes
        assert "bool_param=bool:true" in key
        assert "none_param=null" in key
        assert "float_param=float:3.14" in key
        assert "list:[int:1,int:2,int:3]" in key  # Sorted list with types

    def test_long_key_hashing(self):
        """Test that long keys are automatically hashed."""
        config = CacheKeyConfig(max_key_length=50, hash_long_keys=True)
        generator = CacheKeyGenerator(config)

        # Create a very long key
        long_params = {f"param_{i}": f"value_{i}" for i in range(20)}
        key = generator.generate_key("operation", "primary", long_params)

        # Should be hashed
        assert key.startswith("stockvision:hash:")
        assert len(key) < 100  # Much shorter than original

    def test_namespace_and_version_customization(self):
        """Test custom namespace and version."""
        config = CacheKeyConfig(namespace="custom", version="v2")
        generator = CacheKeyGenerator(config)

        key = generator.generate_key("test", "key")

        assert key.startswith("custom:v2:")

    def test_stock_key_generation(self):
        """Test stock-specific key generation convenience method."""
        generator = CacheKeyGenerator()

        key = generator.generate_stock_key("current_price", "7203", period="1d")

        assert "stock:current_price" in key
        assert "7203" in key
        assert "period=str:1d" in key

    def test_api_key_generation(self):
        """Test API-specific key generation."""
        generator = CacheKeyGenerator()

        params = {"symbol": "7203", "days": 30}
        key = generator.generate_api_key("/api/stocks", "GET", params)

        assert "api:get:api:stocks" in key

    def test_key_component_extraction(self):
        """Test extracting components from generated keys."""
        generator = CacheKeyGenerator()

        key = generator.generate_key("test_op", "test_key")
        components = generator.extract_components(key)

        assert components["type"] == "regular"
        assert components["namespace"] == "stockvision"
        assert components["version"] == "v1"
        assert components["operation"] == "test_op"
        assert components["primary_key"] == "test_key"

    def test_hashed_key_component_extraction(self):
        """Test extracting components from hashed keys."""
        config = CacheKeyConfig(max_key_length=20, hash_long_keys=True)
        generator = CacheKeyGenerator(config)

        # Force hashing with long key
        long_params = {"very_long_parameter_name": "very_long_value"}
        key = generator.generate_key("operation", "key", long_params)

        components = generator.extract_components(key)

        assert components["type"] == "hashed"
        assert components["namespace"] == "stockvision"
        assert "hash" in components

    @patch("src.utils.cache_key_generator.datetime")
    def test_timestamp_inclusion(self, mock_datetime):
        """Test timestamp inclusion when configured."""
        # Mock datetime to return consistent value
        mock_now = datetime(2023, 1, 1, 12, 30, 45)
        mock_datetime.now.return_value = mock_now

        config = CacheKeyConfig(include_timestamp=True)
        generator = CacheKeyGenerator(config)

        key = generator.generate_key("test", "key")

        # Should include minute-level timestamp
        assert "ts=202301011230" in key


class TestConvenienceFunctions:
    """Test cases for convenience functions."""

    def test_generate_cache_key_function(self):
        """Test the global convenience function."""
        key = generate_cache_key("operation", "primary_key")

        assert "stockvision:v1:operation:primary_key" == key

    def test_generate_stock_cache_key_function(self):
        """Test stock cache key convenience function."""
        key = generate_stock_cache_key("current_price", "7203", period="1d")

        assert "stock:current_price" in key
        assert "7203" in key

    def test_generate_api_cache_key_function(self):
        """Test API cache key convenience function."""
        params = {"symbol": "7203"}
        key = generate_api_cache_key("/api/stocks", params=params)

        assert "api:get:api:stocks" in key

    def test_get_cache_key_info_function(self):
        """Test cache key information extraction."""
        key = generate_cache_key("test", "key")
        info = get_cache_key_info(key)

        assert info["type"] == "regular"
        assert info["operation"] == "test"


class TestCollisionPrevention:
    """Test cases to verify collision prevention."""

    def test_similar_parameters_different_keys(self):
        """Test that similar parameters generate different keys."""
        generator = CacheKeyGenerator()

        # These should generate different keys despite similarity
        key1 = generator.generate_key("test", "key", {"param": "value_1"})
        key2 = generator.generate_key("test", "key", {"param": "value_2"})
        key3 = generator.generate_key(
            "test", "key", {"param_": "value1"}
        )  # Different param name

        assert key1 != key2
        assert key1 != key3
        assert key2 != key3

    def test_different_operations_different_keys(self):
        """Test that different operations generate different keys."""
        generator = CacheKeyGenerator()

        key1 = generator.generate_key("get_stock", "7203")
        key2 = generator.generate_key("get_price", "7203")

        assert key1 != key2

    def test_parameter_type_sensitivity(self):
        """Test that parameter types affect key generation."""
        generator = CacheKeyGenerator()

        # Different types should generate different keys
        key1 = generator.generate_key("test", "key", {"param": 1})  # int
        key2 = generator.generate_key("test", "key", {"param": "1"})  # str
        key3 = generator.generate_key("test", "key", {"param": 1.0})  # float
        key4 = generator.generate_key("test", "key", {"param": True})  # bool

        all_keys = [key1, key2, key3, key4]
        # All keys should be different
        assert len(set(all_keys)) == len(all_keys)

    def test_nested_structure_consistency(self):
        """Test consistent handling of nested structures."""
        generator = CacheKeyGenerator()

        params1 = {"nested": {"b": 2, "a": 1}}
        params2 = {"nested": {"a": 1, "b": 2}}

        key1 = generator.generate_key("test", "key", params1)
        key2 = generator.generate_key("test", "key", params2)

        # Should be the same despite different order
        assert key1 == key2


class TestPerformanceConsiderations:
    """Test cases for performance-related functionality."""

    def test_key_length_management(self):
        """Test that keys are kept to reasonable lengths."""
        generator = CacheKeyGenerator()

        # Create parameters that would result in a very long key
        large_params = {f"param_{i}": f"value_{i}_with_long_content" for i in range(50)}
        key = generator.generate_key("test", "key", large_params)

        # Should be hashed and therefore short
        assert len(key) < 300  # Reasonable length even for complex keys

    def test_deterministic_hashing(self):
        """Test that hashing is deterministic."""
        config = CacheKeyConfig(max_key_length=50, hash_long_keys=True)
        generator = CacheKeyGenerator(config)

        params = {f"param_{i}": f"value_{i}" for i in range(20)}

        key1 = generator.generate_key("test", "key", params)
        key2 = generator.generate_key("test", "key", params)

        # Should be identical
        assert key1 == key2


if __name__ == "__main__":
    pytest.main([__file__])
