"""
FastAPI application entry point for stock tracking application.
"""
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, APIRouter, Header
from fastapi.middleware.cors import CORSMiddleware
from urllib.parse import urlparse
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session
from sqlalchemy import text

from .stock_storage.database import init_db, close_database, check_database_health, get_database_stats, get_session_scope
from .middleware.error_handler import setup_error_handlers
from .middleware.performance import setup_performance_middleware
from .middleware.metrics import setup_metrics
from .utils.logging import setup_logging
from .utils.cache import get_cache_stats, set_cache_ttls
from .config import get_settings
from .constants import (
    DEFAULT_HOST, DEFAULT_PORT, FRONTEND_DEV_PORT, FRONTEND_PROD_PORT,
    DEV_CORS_ORIGINS, PROD_ORIGINS, DOCS_URL, REDOC_URL, OPENAPI_URL,
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
        
        # Middleware is configured at import time below to avoid adding during lifespan

        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    
    logger.info("Stock Test API started")
    
    yield
    
    # Shutdown
    try:
        from .services.stock_service import cleanup_stock_service  # Lazy import to avoid heavy import at startup
        await cleanup_stock_service()
    except Exception:
        pass
    close_database()
    logger.info("Stock Test API shutdown complete")


def _build_openapi_servers() -> list[dict[str, str]]:
    """Generate OpenAPI servers list based on environment.

    Priority:
    1. API_PUBLIC_URL if provided (intended for production/public URL)
    2. API_ADDITIONAL_SERVER_URLS (comma-separated list)
    3. Fallback to localhost development URL
    """
    servers: list[dict[str, str]] = []

    public_url = os.getenv("API_PUBLIC_URL", "").strip()
    if public_url:
        servers.append({"url": public_url, "description": "Production server"})

    additional_urls = os.getenv("API_ADDITIONAL_SERVER_URLS", "")
    for raw in additional_urls.split(","):
        url = raw.strip()
        if url:
            servers.append({"url": url, "description": "Additional server"})

    if not servers:
        servers.append({"url": f"http://localhost:{DEFAULT_PORT}", "description": "Development server"})

    return servers


app = FastAPI(
    title="Stock Test API",
    version="1.0.0",
    description="株価テスト機能API仕様",
    servers=_build_openapi_servers(),
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


def _is_valid_origin(origin: str) -> bool:
    """Originのバリデーション（http/https + ホスト必須、ワイルドカード不可）。"""
    if not origin or origin == "*":
        return False
    try:
        parsed = urlparse(origin)
        if parsed.scheme not in {"http", "https"}:
            return False
        if not parsed.netloc:
            return False
        return True
    except Exception:
        return False


def compute_allowed_cors_origins(debug: bool) -> list[str]:
    """環境に応じてCORSの許可オリジンを算出する。

    - debug=True: 開発用 + 本番用（両方許可）
    - debug=False: 本番用のみ
    - 不正なオリジン（'*'やスキーム不明など）は除外
    - 本番でオリジン未設定の場合は空リスト（実質CORS無効）
    """
    origins = [*_safe_filter(PROD_ORIGINS)]
    if debug:
        origins = [*_safe_filter(DEV_CORS_ORIGINS), *origins]
    return origins


def _safe_filter(candidates: list[str]) -> list[str]:
    return [o for o in candidates if _is_valid_origin(o)]


# Configure middleware at import time
_app_settings = get_settings()
_origins = compute_allowed_cors_origins(_app_settings.debug)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT", "PATCH"],
    allow_headers=["*"],
)

setup_error_handlers(app)
setup_performance_middleware(app)

# Optional Prometheus metrics (env: ENABLE_METRICS=true)
try:
    setup_metrics(app)
except Exception:
    # Metrics are optional; never fail app import on metrics issues
    pass

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

@api_router.get("/live", tags=["Health"])
async def live_check():
    """Liveness probe endpoint: process is alive."""
    return {"status": "alive"}

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

@api_router.get("/ready", tags=["Health"])
async def readiness_check(db: Session = Depends(get_db)):
    """Readiness probe: checks DB connectivity and returns quick status."""
    import time as _t
    start = _t.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    duration_ms = round((_t.perf_counter() - start) * 1000, 2)
    if not db_ok:
        raise HTTPException(status_code=503, detail="Not ready")
    settings = get_settings()
    return {
        "status": "ready",
        "db_ping_ms": duration_ms,
        "yahoo_finance_enabled": settings.yahoo_finance.enabled,
    }

api_router.include_router(stocks_router)
api_router.include_router(watchlist_router)
api_router.include_router(metrics_router)

app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint."""
    return {"message": "Stock Test API is running", "version": "1.0.0"}

# Backward-compatible health endpoints at root
@app.get("/live", tags=["Health"])
async def root_live_check():
    return await live_check()

@app.get("/ready", tags=["Health"])
async def root_ready_check(db: Session = Depends(get_db)):
    return await readiness_check(db)


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "src.main:app",
        host=DEFAULT_HOST,
        port=DEFAULT_PORT,
        reload=True,
        log_level="info",
    )
