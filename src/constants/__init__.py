"""
Constants package for the StockVision application.

This package contains organized constants for different aspects of the application:
- api: API endpoints and server configuration
- cache: Cache TTL values and performance settings
- stock: Stock market related constants
"""

from .api import *
from .cache import *
from .stock import *

__all__ = [
    # API constants
    "API_PREFIX",
    "STOCKS_BASE", 
    "STOCK_CURRENT_ENDPOINT",
    "STOCK_HISTORY_ENDPOINT",
    "STOCK_INFO_ENDPOINT",
    "RECOMMENDED_STOCKS_ENDPOINT",
    "TRADING_RECOMMENDATIONS_ENDPOINT", 
    "PRICE_PREDICTIONS_ENDPOINT",
    "WATCHLIST_ENDPOINT",
    "API_RECOMMENDED_STOCKS",
    "API_TRADING_RECOMMENDATIONS",
    "API_PRICE_PREDICTIONS",
    "API_STOCKS_CURRENT",
    "API_STOCKS_HISTORY",
    "API_WATCHLIST",
    "HEALTH_ENDPOINT",
    "STATUS_ENDPOINT",
    "DEFAULT_HOST",
    "DEFAULT_PORT",
    "DEVELOPMENT_HOST",
    "FRONTEND_DEV_PORT",
    "FRONTEND_PROD_PORT",
    "CORS_ORIGINS",
    "DEV_CORS_ORIGINS",
    "PROD_ORIGINS",
    "DOCS_URL",
    "REDOC_URL", 
    "OPENAPI_URL",
    
    # Cache constants
    "CacheTTL",
    "SWRTime",
    "CacheSize",
    "PerformanceThresholds",
    "TimeConstants",
    
    # Stock constants
    "StockPrice",
    "VolumeFormat",
    "MarketStatus",
    "StockFields",
    "DefaultStocks",
]
