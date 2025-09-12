"""
Unit tests for the enhanced wildcard matching in cache.py
"""

from src.utils.cache import _get_cache_config


def test_get_cache_config_simple_wildcard():
    """Test simple wildcard pattern matching"""
    # Mock CACHE_SETTINGS for testing
    # In the actual implementation, this is defined inside the function
    # but for testing we need to verify the logic works correctly

    # Test case 1: Simple wildcard at the end
    result = _get_cache_config("/api/stocks/7203")
    assert result == {"ttl": 300, "maxsize": 500}

    # Test case 2: Path that shouldn't match
    result = _get_cache_config("/api/users/123")
    assert result == {}


def test_get_cache_config_multiple_wildcards():
    """Test multiple wildcard pattern matching"""
    # Test case 1: Multiple wildcards
    result = _get_cache_config("/api/stocks/7203/history/30")
    assert result == {"ttl": 600, "maxsize": 200}

    # Test case 2: Multiple wildcards with different values
    result = _get_cache_config("/api/stocks/9984/history/7")
    assert result == {"ttl": 600, "maxsize": 200}


def test_get_cache_config_single_wildcard_at_end():
    """Test single wildcard at the end of pattern"""
    # Test case 1: Single wildcard at end
    result = _get_cache_config("/api/stocks/7203/current")
    assert result == {"ttl": 60, "maxsize": 1000}

    # Test case 2: Different stock code
    result = _get_cache_config("/api/stocks/9984/current")
    assert result == {"ttl": 60, "maxsize": 1000}


def test_get_cache_config_no_match():
    """Test paths that don't match any pattern"""
    # Test case 1: Completely different path
    result = _get_cache_config("/api/news/latest")
    assert result == {}

    # Test case 2: Partial match but not complete
    result = _get_cache_config("/api/stocks")
    assert result == {}


def test_get_cache_config_complex_patterns():
    """Test more complex pattern matching scenarios"""
    # Test case 1: Path with extra segments
    result = _get_cache_config("/api/stocks/7203/history/30/detailed")
    assert result == {}  # Should not match /api/stocks/*/history/*

    # Test case 2: Path with missing segments
    result = _get_cache_config("/api/stocks/history")
    # This will match /api/stocks/* because it starts with /api/stocks/
    # This is expected behavior with the current implementation
    assert result == {"ttl": 300, "maxsize": 500}
