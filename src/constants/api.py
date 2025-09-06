"""
API related constants for the StockVision application.
"""

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
import os

DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000
DEVELOPMENT_HOST = "localhost"
FRONTEND_DEV_PORT = 3000
FRONTEND_PROD_PORT = 8080

# Environment-aware server configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
API_HOST = os.getenv("API_HOST", "localhost")
API_PORT = int(os.getenv("API_PORT", str(DEFAULT_PORT)))

# CORS origins - support both environment variables and defaults
def get_cors_origins():
    """Get CORS origins based on environment configuration."""
    cors_origins_env = os.getenv("CORS_ORIGINS")
    if cors_origins_env:
        return [origin.strip() for origin in cors_origins_env.split(",")]
    
    # Default CORS origins for development
    return [
        f"http://{DEVELOPMENT_HOST}:{FRONTEND_DEV_PORT}",
        f"http://{DEVELOPMENT_HOST}:{FRONTEND_PROD_PORT}",
        # Additional common local development URLs
        f"http://127.0.0.1:{FRONTEND_DEV_PORT}",
        f"http://127.0.0.1:{FRONTEND_PROD_PORT}"
    ]

CORS_ORIGINS = get_cors_origins()

# OpenAPI documentation
DOCS_URL = "/docs"
REDOC_URL = "/redoc"
OPENAPI_URL = "/openapi.json"