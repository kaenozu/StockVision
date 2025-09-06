"""
FastAPI application entry point for stock tracking application.
"""
import logging
import sentry_sdk
from contextlib import asynccontextmanager
<<<<<<< HEAD
from fastapi import FastAPI, HTTPException, Depends, APIRouter, Header
=======
from fastapi import FastAPI, HTTPException, Depends, APIRouter
>>>>>>> origin/main
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session
from sqlalchemy import text

from .stock_storage.database import init_db, close_database, check_database_health, get_database_stats, get_session_scope
from .middleware.performance import setup_error_handlers, setup_performance_middleware
from .utils.logging import setup_logging
from .utils.cache import get_cache_stats, set_cache_ttls
from .services.stock_service import cleanup_stock_service
from .config import get_settings
from .constants import (
    DEFAULT_HOST, DEFAULT_PORT, FRONTEND_DEV_PORT, FRONTEND_PROD_PORT,
    CORS_ORIGINS, DOCS_URL, REDOC_URL, OPENAPI_URL,
    PerformanceThresholds
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    setup_logging()
    logger = logging.getLogger(__name__)
    
    try:
        # Load settings
        settings = get_settings()
        logger.info(f"Loaded application settings (Yahoo Finance API enabled: {settings.yahoo_finance.enabled})")
        
        # Initialize Sentry if DSN is provided
        if settings.sentry_dsn:
            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                traces_sample_rate=1.0,
                profiles_sample_rate=1.0,
            )
            logger.info("Sentry initialized successfully")
        else:
            logger.info("Sentry DSN not provided, skipping initialization")
        
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    logger.info("Stock Test API started")
    
    yield
    
    # Shutdown
    await cleanup_stock_service()
    close_database()
    logger.info("Stock Test API shutdown complete")


app = FastAPI(
    title="Stock Test API",
    version="1.0.0",
    description="株価テスト機能API仕様",
    servers=[{"url": f"http://localhost:{DEFAULT_PORT}", "description": "Development server"}],
    lifespan=lifespan,
    docs_url=DOCS_URL,
    redoc_url=REDOC_URL,
    openapi_url=OPENAPI_URL,
    openapi_tags=[
        {"name": "Stocks", "description": "株式情報の取得と管理"},
        {"name": "Watchlist", "description": "ウォッチリストの管理"},
        {"name": "Health", "description": "アプリケーションとデータベースのヘルスチェック"},
        {"name": "Root", "description": "ルートエンドポイント"}
    ]
)


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Configure for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "PATCH"],
    allow_headers=["*"],
)

# Setup error handlers
setup_error_handlers(app)

# Setup performance middleware
setup_performance_middleware(app)

# Import and include API routes
from .api.stocks import router as stocks_router
from .api.watchlist import router as watchlist_router
from .api.metrics import router as metrics_router

api_router = APIRouter(prefix="/api")

def get_db():
    """Database dependency function."""
    with get_session_scope() as session:
        yield session

@api_router.get("/health", tags=["Health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}

@api_router.get("/status", tags=["Health"])
async def status_check(db: Session = Depends(get_db)):
    """Health check endpoint with database connectivity."""
    try:
        # データベース接続テスト
        db.execute(text("SELECT 1"))
        db_healthy = True
    except Exception:
        db_healthy = False
    
    if not db_healthy:
        raise HTTPException(status_code=503, detail="Database connection failed")
    
    db_stats = get_database_stats()
    
    # Get configuration and service stats
    settings = get_settings()
    
    # Get stock service cache stats
    from .services.stock_service import get_stock_service
    try:
        stock_service = await get_stock_service()
        service_cache_stats = stock_service.get_cache_stats()
    except Exception:
        service_cache_stats = {"entries": 0, "size_bytes": 0}
    
    return {
        "status": "healthy",
        "database": {
            "healthy": db_healthy,
            "stats": db_stats
        },
        "cache": {
            "general": get_cache_stats(),
            "yahoo_api": service_cache_stats
        },
        "configuration": {
            "yahoo_finance_api_enabled": settings.yahoo_finance.enabled,
            "debug_mode": settings.debug,
            "log_level": settings.log_level
        },
        "performance": {
            "optimizations_enabled": [
                "hybrid_data_source",
                f"yahoo_finance_api_{'enabled' if settings.yahoo_finance.enabled else 'disabled'}",
                "intelligent_caching",
                "in_memory_caching",
                "database_connection_pooling", 
                "gzip_compression",
                "sqlite_performance_tuning"
            ]
        },
        "version": "1.0.0"
    }

api_router.include_router(stocks_router)
api_router.include_router(watchlist_router)
api_router.include_router(metrics_router)

app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {"message": "Stock Test API is running", "version": "1.0.0"}


# Admin utilities
@app.post("/api/admin/cache/ttl", tags=["Admin"])
async def update_cache_ttls(
    payload: dict,
    x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")
):
    """Update in-memory cache TTLs at runtime (admin only).

    Request JSON fields (optional):
      - stock_info_ttl: float seconds
      - current_price_ttl: float seconds
      - price_history_ttl: float seconds

    Authorization: provide X-Admin-Token header matching ADMIN_TOKEN env (if set).
    """
    import os

    required = os.getenv("ADMIN_TOKEN")
    if required:
        if not x_admin_token or x_admin_token != required:
            raise HTTPException(status_code=401, detail="Unauthorized")

    stock_info_ttl = payload.get("stock_info_ttl")
    current_price_ttl = payload.get("current_price_ttl")
    price_history_ttl = payload.get("price_history_ttl")

    try:
        set_cache_ttls(
            stock_info_ttl=stock_info_ttl,
            current_price_ttl=current_price_ttl,
            price_history_ttl=price_history_ttl,
        )
        return {
            "ok": True,
            "applied": {
                "stock_info_ttl": stock_info_ttl,
                "current_price_ttl": current_price_ttl,
                "price_history_ttl": price_history_ttl,
            },
            "stats": get_cache_stats(),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update TTLs: {e}")
=======
@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_json():
    """OpenAPIスキーマをJSON形式で返すエンドポイント"""
    return get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
        servers=app.servers,
        tags=app.openapi_tags,
    )
>>>>>>> origin/main


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=DEFAULT_HOST,
        port=DEFAULT_PORT,
        reload=True,
        log_level="info",
    )
