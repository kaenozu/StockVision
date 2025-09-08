"""
FastAPI application entry point for stock tracking application.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text

from .stock_storage.database import init_db, close_database, check_database_health, get_database_stats, get_session_scope
from .middleware.error_handler import setup_error_handlers
from .utils.logging import setup_logging
from .utils.cache import get_cache_stats
from .services.stock_service import cleanup_stock_service
from .config import get_settings


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
    servers=[{"url": "http://localhost:8000", "description": "Development server"}],
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Add GZip middleware for response compression (performance optimization)
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=6)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],  # Configure for production
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "PATCH"],
    allow_headers=["*"],
)

# Setup error handlers
setup_error_handlers(app)

# Import and include API routes
from .api.stocks import router as stocks_router
from .api.watchlist import router as watchlist_router
from .api.ml_prediction import router as ml_router

app.include_router(stocks_router)
app.include_router(watchlist_router)
app.include_router(ml_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {"message": "Stock Test API is running", "version": "1.0.0"}


def get_db():
    """Database dependency function."""
    with get_session_scope() as session:
        yield session


@app.get("/health", tags=["Health"])
async def health_check(db: Session = Depends(get_db)):
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host="localhost",
        port=8000,
        reload=True,
        log_level="info",
    )