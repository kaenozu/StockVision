"""
Application configuration settings.

This module provides configuration management for the stock API application,
including environment variables and Yahoo Finance API settings.
"""
import os
from typing import Optional
from pydantic import BaseModel, Field
from functools import lru_cache


class YahooFinanceConfig(BaseModel):
    """Yahoo Finance API configuration."""
    
    enabled: bool = Field(default=False, description="Enable real Yahoo Finance API calls")
    max_requests: int = Field(default=10, description="Maximum requests per time window")
    time_window: int = Field(default=60, description="Rate limit time window in seconds")
    max_concurrent: int = Field(default=5, description="Maximum concurrent requests")
    timeout: int = Field(default=30, description="Request timeout in seconds")
    retry_attempts: int = Field(default=3, description="Number of retry attempts")
    retry_delay: float = Field(default=1.0, description="Delay between retries")
    cache_ttl: int = Field(default=300, description="Cache TTL for API responses in seconds")


class CacheConfig(BaseModel):
    """Cache configuration."""
    
    stock_info_ttl: float = Field(default=300.0, description="Stock info cache TTL in seconds")
    current_price_ttl: float = Field(default=60.0, description="Current price cache TTL in seconds") 
    price_history_ttl: float = Field(default=600.0, description="Price history cache TTL in seconds")


class DatabaseConfig(BaseModel):
    """Database configuration."""
    
    url: str = Field(default="sqlite:///./stocks.db", description="Database URL")
    echo: bool = Field(default=False, description="Enable SQL query logging")
    pool_size: int = Field(default=5, description="Database connection pool size")
    max_overflow: int = Field(default=10, description="Maximum overflow connections")


class MiddlewareConfig(BaseModel):
    """Middleware configuration."""
    
    # Cache Control Middleware
    cache_control_enabled: bool = Field(default=True, description="Enable Cache Control Middleware")
    
    # Response Compression Middleware
    response_compression_enabled: bool = Field(default=True, description="Enable Response Compression Middleware")
    response_compression_min_size: int = Field(default=1024, description="Minimum response size to compress (bytes)")
    response_compression_gzip_level: int = Field(default=6, description="GZip compression level (1-9, 9 is highest compression)")
    response_compression_brotli_quality: int = Field(default=4, description="Brotli compression quality (0-11, 11 is highest compression)")
    
    # Performance Metrics Middleware
    performance_metrics_enabled: bool = Field(default=True, description="Enable Performance Metrics Middleware")


class AppConfig(BaseModel):
    """Main application configuration."""
    
    debug: bool = Field(default=False, description="Enable debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
<<<<<<< HEAD
<<<<<<< HEAD
    cors: CorsConfig = Field(default_factory=CorsConfig)
=======
=======
>>>>>>> 6ac4565fe132f0b07307ce611734dcdda2f9732b
    
    # Redis settings
    redis_host: Optional[str] = Field(default=None, description="Redis server host")
    redis_port: Optional[int] = Field(default=6379, description="Redis server port")
    redis_db: Optional[int] = Field(default=0, description="Redis database number")
    redis_password: Optional[str] = Field(default=None, description="Redis server password")
    
<<<<<<< HEAD
>>>>>>> origin/main
=======
>>>>>>> 6ac4565fe132f0b07307ce611734dcdda2f9732b
    yahoo_finance: YahooFinanceConfig = Field(default_factory=YahooFinanceConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    middleware: MiddlewareConfig = Field(default_factory=MiddlewareConfig)
    
    @classmethod
<<<<<<< HEAD
<<<<<<< HEAD
            def from_env(cls) -> "AppConfig":
                """Create configuration from environment variables."""
                return cls(
                    debug=os.getenv("DEBUG", "false").lower() == "true",
                    log_level=os.getenv("LOG_LEVEL", "INFO"),
                    server_url=os.getenv("SERVER_URL", "http://localhost:8000"),
                    sentry_dsn=os.getenv("SENTRY_DSN"),
=======
=======
>>>>>>> 6ac4565fe132f0b07307ce611734dcdda2f9732b
    def from_env(cls) -> "AppConfig":
        """Create configuration from environment variables."""
        return cls(
            debug=os.getenv("DEBUG", "false").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            sentry_dsn=os.getenv("SENTRY_DSN"),
            
            # Redis settings
            redis_host=os.getenv("REDIS_HOST"),
            redis_port=int(os.getenv("REDIS_PORT", "6379")),
            redis_db=int(os.getenv("REDIS_DB", "0")),
            redis_password=os.getenv("REDIS_PASSWORD"),
            
<<<<<<< HEAD
>>>>>>> origin/main
=======
>>>>>>> 6ac4565fe132f0b07307ce611734dcdda2f9732b
            yahoo_finance=YahooFinanceConfig(
                enabled=os.getenv("USE_REAL_YAHOO_API", "false").lower() == "true",
                max_requests=int(os.getenv("YAHOO_MAX_REQUESTS", "10")),
                time_window=int(os.getenv("YAHOO_TIME_WINDOW", "60")),
                max_concurrent=int(os.getenv("YAHOO_MAX_CONCURRENT", "5")),
                timeout=int(os.getenv("YAHOO_TIMEOUT", "30")),
                retry_attempts=int(os.getenv("YAHOO_RETRY_ATTEMPTS", "3")),
                retry_delay=float(os.getenv("YAHOO_RETRY_DELAY", "1.0")),
                cache_ttl=int(os.getenv("YAHOO_CACHE_TTL", "300"))
            ),
            cache=CacheConfig(
                stock_info_ttl=float(os.getenv("CACHE_STOCK_INFO_TTL", "300.0")),
                current_price_ttl=float(os.getenv("CACHE_CURRENT_PRICE_TTL", "60.0")),
                price_history_ttl=float(os.getenv("CACHE_PRICE_HISTORY_TTL", "600.0"))
            ),
            database=DatabaseConfig(
                url=os.getenv("DATABASE_URL", "sqlite:///./stocks.db"),
                echo=os.getenv("DATABASE_ECHO", "false").lower() == "true",
                pool_size=int(os.getenv("DATABASE_POOL_SIZE", "5")),
                max_overflow=int(os.getenv("DATABASE_MAX_OVERFLOW", "10"))
            ),
            middleware=MiddlewareConfig(
                cache_control_enabled=os.getenv("MIDDLEWARE_CACHE_CONTROL_ENABLED", "true").lower() == "true",
                response_compression_enabled=os.getenv("MIDDLEWARE_RESPONSE_COMPRESSION_ENABLED", "true").lower() == "true",
                response_compression_min_size=int(os.getenv("MIDDLEWARE_RESPONSE_COMPRESSION_MIN_SIZE", "1024")),
                response_compression_gzip_level=int(os.getenv("MIDDLEWARE_RESPONSE_COMPRESSION_GZIP_LEVEL", "6")),
                response_compression_brotli_quality=int(os.getenv("MIDDLEWARE_RESPONSE_COMPRESSION_BROTLI_QUALITY", "4")),
                performance_metrics_enabled=os.getenv("MIDDLEWARE_PERFORMANCE_METRICS_ENABLED", "true").lower() == "true"
            ),
            cors=CorsConfig(
                allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "*").split(",") if origin.strip()],
                allow_credentials=os.getenv("CORS_ALLOW_CREDENTIALS", "true").lower() == "true",
                allow_methods=[method.strip() for method in os.getenv("CORS_ALLOW_METHODS", "*").split(",") if method.strip()],
                allow_headers=[header.strip() for header in os.getenv("CORS_ALLOW_HEADERS", "*").split(",") if header.strip()]
            )
        )


@lru_cache()
def get_settings() -> AppConfig:
    """Get cached application settings."""
    return AppConfig.from_env()


# Convenience functions for specific configurations
def get_yahoo_finance_config() -> YahooFinanceConfig:
    """Get Yahoo Finance configuration."""
    return get_settings().yahoo_finance


def get_cache_config() -> CacheConfig:
    """Get cache configuration."""
    return get_settings().cache


def get_database_config() -> DatabaseConfig:
    """Get database configuration."""
    return get_settings().database


def get_middleware_config() -> MiddlewareConfig:
    """Get middleware configuration."""
    return get_settings().middleware


def is_yahoo_finance_enabled() -> bool:
    """Check if Yahoo Finance API is enabled."""
    return get_settings().yahoo_finance.enabled


def should_use_real_data(use_real_data_param: Optional[bool] = None) -> bool:
    """
    Determine whether to use real Yahoo Finance data.
    
    Args:
        use_real_data_param: Query parameter override from API request
        
    Returns:
        bool: True if real data should be used, False for mock data
    """
    # Query parameter takes precedence over environment variable
    if use_real_data_param is not None:
        return use_real_data_param
    
    # Fall back to environment variable setting
    return is_yahoo_finance_enabled()