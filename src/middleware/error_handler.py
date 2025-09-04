"""
Global error handling middleware for FastAPI application.

This module provides comprehensive error handling including:
- Custom exception handler middleware
- Logging of errors with context
- Consistent error response format
- Development vs production error details
"""
import logging
import traceback
import uuid
import time
from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Request/Response logging and performance monitoring middleware."""
    
    def __init__(self, app, debug: bool = False):
        super().__init__(app)
        self.debug = debug
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Handle requests with logging and performance tracking."""
        # Generate request ID for tracing
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Extract request body for logging (if needed)
        body = None
        if hasattr(request, '_body'):
            try:
                body = await request.body()
                # For large bodies, only log first 1000 chars
                if len(body) > 1000:
                    body = body[:1000] + b'...'
                body = body.decode('utf-8', errors='ignore')
            except Exception:
                body = "[Unable to decode body]"
        
        # Log request
        logger.info(
            f"Request {request_id}: {request.method} {request.url}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "client_ip": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent", "Unknown"),
                "content_type": request.headers.get("content-type"),
                "content_length": request.headers.get("content-length"),
                "body": body[:500] if body and self.debug else None,  # Only in debug mode
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
        try:
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            
            # Log response
            logger.info(
                f"Response {request_id}: {response.status_code} ({duration:.3f}s)",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                    "duration_ms": round(duration * 1000, 2),
                    "response_size": response.headers.get("content-length"),
                    "content_type": response.headers.get("content-type"),
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            # Add performance headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration:.3f}s"
            
            # Log slow requests as warnings
            if duration > 2.0:  # Requests taking more than 2 seconds
                logger.warning(
                    f"Slow request {request_id}: {duration:.3f}s - {request.method} {request.url}",
                    extra={
                        "request_id": request_id,
                        "duration_ms": round(duration * 1000, 2),
                        "slow_request": True
                    }
                )
            
            return response
            
        except Exception as exc:
            duration = time.time() - start_time
            
            logger.error(
                f"Exception in request {request_id}: {exc} ({duration:.3f}s)",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "url": str(request.url),
                    "client_ip": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                    "duration_ms": round(duration * 1000, 2),
                    "exception_type": type(exc).__name__,
                    "exception_message": str(exc),
                    "traceback": traceback.format_exc() if self.debug else None
                }
            )
            raise


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Custom error handling middleware."""
    
    def __init__(self, app, debug: bool = False):
        super().__init__(app)
        self.debug = debug
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """Handle requests with error tracking."""
        # Use request ID from RequestLoggingMiddleware if available
        request_id = getattr(request.state, 'request_id', str(uuid.uuid4())[:8])
        if not hasattr(request.state, 'request_id'):
            request.state.request_id = request_id
        
        try:
            response = await call_next(request)
            return response
            
        except Exception as exc:
            return await self._create_error_response(exc, request_id, request)
    
    async def _create_error_response(self, exc: Exception, request_id: str, request: Request) -> JSONResponse:
        """Create standardized error response."""
        
        if isinstance(exc, HTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": {
                        "code": exc.status_code,
                        "message": exc.detail,
                        "type": "HTTPException",
                        "request_id": request_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "path": request.url.path
                    }
                }
            )
        
        elif isinstance(exc, RequestValidationError):
            return JSONResponse(
                status_code=422,
                content={
                    "error": {
                        "code": 422,
                        "message": "Validation error",
                        "type": "ValidationError",
                        "details": exc.errors() if self.debug else "Request validation failed",
                        "request_id": request_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "path": request.url.path
                    }
                }
            )
        
        elif isinstance(exc, SQLAlchemyError):
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": 500,
                        "message": "Database error" if not self.debug else str(exc),
                        "type": "DatabaseError",
                        "request_id": request_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "path": request.url.path,
                        "details": str(exc) if self.debug else None
                    }
                }
            )
        
        else:
            # Unexpected error
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": 500,
                        "message": "Internal server error" if not self.debug else str(exc),
                        "type": type(exc).__name__,
                        "request_id": request_id,
                        "timestamp": datetime.utcnow().isoformat(),
                        "path": request.url.path,
                        "details": str(exc) if self.debug else None
                    }
                }
            )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions with consistent format."""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.warning(
        f"HTTP exception {exc.status_code}: {exc.detail}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "status_code": exc.status_code,
            "detail": exc.detail
        }
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.status_code,
                "message": exc.detail,
                "type": "HTTPException",
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path
            }
        }
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors with detailed information."""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.warning(
        f"Validation error: {exc}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "validation_errors": exc.errors()
        }
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": 422,
                "message": "Request validation failed",
                "type": "ValidationError",
                "details": [
                    {
                        "field": ".".join(str(loc) for loc in error["loc"][1:]) if len(error["loc"]) > 1 else str(error["loc"][0]),
                        "message": error["msg"],
                        "type": error["type"],
                        "input": error.get("input")
                    }
                    for error in exc.errors()
                ],
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path
            }
        }
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle SQLAlchemy database errors."""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(
        f"Database error: {exc}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)
        }
    )
    
    # In production, don't expose internal database errors
    import os
    debug_mode = os.getenv("DEBUG", "false").lower() == "true"
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Database error occurred" if not debug_mode else str(exc),
                "type": "DatabaseError",
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
                "details": str(exc) if debug_mode else "Contact support for assistance"
            }
        }
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle any unhandled exceptions."""
    request_id = getattr(request.state, 'request_id', 'unknown')
    
    logger.error(
        f"Unhandled exception: {exc}",
        extra={
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc()
        }
    )
    
    import os
    debug_mode = os.getenv("DEBUG", "false").lower() == "true"
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal server error" if not debug_mode else str(exc),
                "type": type(exc).__name__,
                "request_id": request_id,
                "timestamp": datetime.utcnow().isoformat(),
                "path": request.url.path,
                "details": str(exc) if debug_mode else "An unexpected error occurred"
            }
        }
    )


def setup_error_handlers(app: FastAPI) -> None:
    """Setup all error handlers for the FastAPI application."""
    import os
    debug_mode = os.getenv("DEBUG", "false").lower() == "true"
    
    # Add request logging middleware (should be first)
    app.add_middleware(RequestLoggingMiddleware, debug=debug_mode)
    
    # Add error handling middleware
    app.add_middleware(ErrorHandlerMiddleware, debug=debug_mode)
    
    # Add specific exception handlers
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("Error handlers and request logging configured successfully")


# Custom exception classes for specific business logic errors
class StockNotFoundError(HTTPException):
    """Exception raised when a stock is not found."""
    
    def __init__(self, stock_code: str):
        super().__init__(
            status_code=404,
            detail=f"Stock code {stock_code} not found"
        )


class WatchlistItemNotFoundError(HTTPException):
    """Exception raised when a watchlist item is not found."""
    
    def __init__(self, item_id: int):
        super().__init__(
            status_code=404,
            detail=f"Watchlist item with ID {item_id} not found"
        )


class DuplicateWatchlistItemError(HTTPException):
    """Exception raised when trying to add duplicate watchlist item."""
    
    def __init__(self, stock_code: str):
        super().__init__(
            status_code=409,
            detail=f"Stock code {stock_code} is already in the watchlist"
        )


class InvalidStockCodeError(HTTPException):
    """Exception raised when stock code format is invalid."""
    
    def __init__(self, stock_code: str):
        super().__init__(
            status_code=400,
            detail=f"Invalid stock code format: {stock_code}. Must be exactly 4 digits."
        )


class ExternalApiError(HTTPException):
    """Exception raised when external API (Yahoo Finance) fails."""
    
    def __init__(self, service: str = "External API", detail: str = None):
        super().__init__(
            status_code=503,
            detail=detail or f"{service} is temporarily unavailable"
        )


# Health check related errors
class DatabaseConnectionError(HTTPException):
    """Exception raised when database connection fails."""
    
    def __init__(self):
        super().__init__(
            status_code=503,
            detail="Database connection failed"
        )