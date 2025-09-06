"""
API related constants for the StockVision application.
"""

import os

# API Endpoints
API_PREFIX = "/api"

# Stock API endpoints
STOCKS_BASE = "/stocks"
STOCK_CURRENT_ENDPOINT = f"{STOCKS_BASE}/{{stock_code}}/current"
STOCK_HISTORY_ENDPOINT = f"{STOCKS_BASE}/{{stock_code}}/history"
STOCK_INFO_ENDPOINT = f"{STOCKS_BASE}/{{stock_code}}/info"

# Feature API endpoints  
RECOMMENDED_STOCKS_ENDPOINT = "/recommended-stocks"
TRADING_RECOMMENDATIONS_ENDPOINT = "/trading-recommendations"
PRICE_PREDICTIONS_ENDPOINT = "/price-predictions"
WATCHLIST_ENDPOINT = "/watchlist"

# Full API paths (for cache configuration)
API_RECOMMENDED_STOCKS = f"{API_PREFIX}{RECOMMENDED_STOCKS_ENDPOINT}"
API_TRADING_RECOMMENDATIONS = f"{API_PREFIX}{TRADING_RECOMMENDATIONS_ENDPOINT}"
API_PRICE_PREDICTIONS = f"{API_PREFIX}{PRICE_PREDICTIONS_ENDPOINT}"
API_STOCKS_CURRENT = f"{API_PREFIX}{STOCKS_BASE}/*/current"
API_STOCKS_HISTORY = f"{API_PREFIX}{STOCKS_BASE}/*/history"
API_WATCHLIST = f"{API_PREFIX}{WATCHLIST_ENDPOINT}"

# Health endpoints
HEALTH_ENDPOINT = "/health"
STATUS_ENDPOINT = "/status"

# Server configuration
DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000
DEVELOPMENT_HOST = "localhost"
FRONTEND_DEV_PORT = 3000
FRONTEND_PROD_PORT = 8080

# CORS origins
# 環境変数から本番用オリジンを読み込み
PROD_ORIGINS_STR = os.getenv("PROD_CORS_ORIGINS", "")
PROD_ORIGINS = [origin.strip() for origin in PROD_ORIGINS_STR.split(",") if origin.strip()]

CORS_ORIGINS = [
    f"http://{DEVELOPMENT_HOST}:{FRONTEND_DEV_PORT}",
    f"http://{DEVELOPMENT_HOST}:{FRONTEND_PROD_PORT}",
    *PROD_ORIGINS,  # 本番環境オリジンを追加
]

# OpenAPI documentation
DOCS_URL = "/docs"
REDOC_URL = "/redoc"
OPENAPI_URL = "/openapi.json"