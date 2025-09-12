"""
Cache and performance related constants for the StockVision application.
"""


# Cache TTL values (in seconds)
class CacheTTL:
    # Short-term cache (for real-time data)
    CURRENT_PRICE = 60  # 1 minute
    STOCK_DATA_SHORT = 300  # 5 minutes

    # Medium-term cache
    STOCK_INFO = 300  # 5 minutes
    STOCK_HISTORY = 1800  # 30 minutes
    TRADING_RECOMMENDATIONS = 1800  # 30 minutes

    # Long-term cache (for relatively static data)
    RECOMMENDED_STOCKS = 3600  # 1 hour
    PRICE_PREDICTIONS = 7200  # 2 hours
    DEFAULT = 3600  # 1 hour default

    # Special values
    NO_CACHE = 0  # No caching
    DATABASE_POOL_RECYCLE = 3600  # 1 hour for database pool


# Stale-while-revalidate values (in seconds)
class SWRTime:
    CURRENT_PRICE = 30  # 30 seconds
    STOCK_DATA_SHORT = 150  # 2.5 minutes
    STOCK_HISTORY = 900  # 15 minutes
    TRADING_RECOMMENDATIONS = 900  # 15 minutes
    RECOMMENDED_STOCKS = 1800  # 30 minutes
    PRICE_PREDICTIONS = 3600  # 1 hour


# Cache sizes
class CacheSize:
    DEFAULT_TTL_CACHE = 1000
    STOCK_CACHE = 500
    CURRENT_PRICE_CACHE = 1000


# Performance thresholds
class PerformanceThresholds:
    SLOW_REQUEST_THRESHOLD = 1.0  # seconds
    LARGE_BODY_LOG_LIMIT = 1000  # characters
    COMPRESSION_MIN_SIZE = 1000  # bytes
    COMPRESSION_LEVEL = 6


# Time conversion constants
class TimeConstants:
    MILLISECONDS_PER_SECOND = 1000
    SECONDS_PER_MINUTE = 60
    MINUTES_PER_HOUR = 60
    HOURS_PER_DAY = 24

    # Refresh intervals
    DEFAULT_REFRESH_INTERVAL = 30  # seconds
