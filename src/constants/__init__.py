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
    "api.API_PREFIX",
    "api.STOCKS_BASE",
    "api.STOCK_CURRENT_ENDPOINT",
    "api.STOCK_HISTORY_ENDPOINT",
    "api.STOCK_INFO_ENDPOINT",
    "api.RECOMMENDED_STOCKS_ENDPOINT",
    "api.TRADING_RECOMMENDATIONS_ENDPOINT",
    "api.PRICE_PREDICTIONS_ENDPOINT",
    "api.WATCHLIST_ENDPOINT",
    "api.API_RECOMMENDED_STOCKS",
    "api.API_TRADING_RECOMMENDATIONS",
    "api.API_PRICE_PREDICTIONS",
    "api.API_STOCKS_CURRENT",
    "api.API_STOCKS_HISTORY",
    "api.API_WATCHLIST",
    "api.HEALTH_ENDPOINT",
    "api.STATUS_ENDPOINT",
    "api.DEFAULT_HOST",
    "api.DEFAULT_PORT",
    "api.DEVELOPMENT_HOST",
    "api.FRONTEND_DEV_PORT",
    "api.FRONTEND_PROD_PORT",
    "api.CORS_ORIGINS",
    "api.DEV_CORS_ORIGINS",
    "api.PROD_ORIGINS",
    "api.DOCS_URL",
    "api.REDOC_URL",
    "api.OPENAPI_URL",
    # Cache constants
    "cache.CacheTTL",
    "cache.SWRTime",
    "cache.CacheSize",
    "cache.PerformanceThresholds",
    "cache.TimeConstants",
    # Stock constants
    "stock.StockPrice",
    "stock.VolumeFormat",
    "stock.MarketStatus",
    "stock.StockFields",
    "stock.DefaultStocks",
]
