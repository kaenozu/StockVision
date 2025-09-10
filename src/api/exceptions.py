"""
Common exception handling for StockVision API
"""
import logging
from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from .types import ErrorResponse
from datetime import datetime

logger = logging.getLogger(__name__)

# === Custom Exception Classes ===

class StockVisionException(Exception):
    """Base exception for StockVision-specific errors"""
    def __init__(self, message: str, error_code: str = "STOCK_VISION_ERROR", details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)

class StockNotFoundError(StockVisionException):
    """Raised when a stock is not found"""
    def __init__(self, symbol: str):
        super().__init__(
            message=f"Stock {symbol} not found",
            error_code="STOCK_NOT_FOUND",
            details={"symbol": symbol}
        )

class PredictionError(StockVisionException):
    """Raised when ML prediction fails"""
    def __init__(self, symbol: str, reason: str = "Unknown error"):
        super().__init__(
            message=f"Failed to generate prediction for {symbol}: {reason}",
            error_code="PREDICTION_ERROR",
            details={"symbol": symbol, "reason": reason}
        )

class DataFetchError(StockVisionException):
    """Raised when data fetching fails"""
    def __init__(self, source: str, reason: str = "Unknown error"):
        super().__init__(
            message=f"Failed to fetch data from {source}: {reason}",
            error_code="DATA_FETCH_ERROR",
            details={"source": source, "reason": reason}
        )

class ValidationError(StockVisionException):
    """Raised when input validation fails"""
    def __init__(self, field: str, value: Any, reason: str = "Invalid value"):
        super().__init__(
            message=f"Validation failed for {field}: {reason}",
            error_code="VALIDATION_ERROR",
            details={"field": field, "value": str(value), "reason": reason}
        )

class RateLimitError(StockVisionException):
    """Raised when rate limit is exceeded"""
    def __init__(self, limit: int, window: str = "minute"):
        super().__init__(
            message=f"Rate limit exceeded: {limit} requests per {window}",
            error_code="RATE_LIMIT_ERROR",
            details={"limit": limit, "window": window}
        )

# === Exception Handlers ===

async def stock_vision_exception_handler(request: Request, exc: StockVisionException) -> JSONResponse:
    """Handle StockVision-specific exceptions"""
    logger.warning(f"StockVision exception: {exc.error_code} - {exc.message}")
    
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

async def stock_not_found_handler(request: Request, exc: StockNotFoundError) -> JSONResponse:
    """Handle stock not found exceptions"""
    logger.warning(f"Stock not found: {exc.details.get('symbol')}")
    
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

async def prediction_error_handler(request: Request, exc: PredictionError) -> JSONResponse:
    """Handle prediction error exceptions"""
    logger.error(f"Prediction error: {exc.message}")
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

async def data_fetch_error_handler(request: Request, exc: DataFetchError) -> JSONResponse:
    """Handle data fetch error exceptions"""
    logger.error(f"Data fetch error: {exc.message}")
    
    return JSONResponse(
        status_code=503,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

async def validation_error_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Handle validation error exceptions"""
    logger.warning(f"Validation error: {exc.message}")
    
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

async def rate_limit_error_handler(request: Request, exc: RateLimitError) -> JSONResponse:
    """Handle rate limit error exceptions"""
    logger.warning(f"Rate limit error: {exc.message}")
    
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {type(exc).__name__}: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred",
            "details": {
                "type": type(exc).__name__,
                "message": str(exc)
            },
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url)
        }
    )

# === Utility Functions ===

def register_exception_handlers(app) -> None:
    """Register all exception handlers with the FastAPI app"""
    app.add_exception_handler(StockNotFoundError, stock_not_found_handler)
    app.add_exception_handler(PredictionError, prediction_error_handler)
    app.add_exception_handler(DataFetchError, data_fetch_error_handler)
    app.add_exception_handler(ValidationError, validation_error_handler)
    app.add_exception_handler(RateLimitError, rate_limit_error_handler)
    app.add_exception_handler(StockVisionException, stock_vision_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

def validate_stock_symbol(symbol: str) -> str:
    """Validate stock symbol format"""
    if not symbol:
        raise ValidationError("symbol", symbol, "Symbol cannot be empty")
    
    symbol = symbol.upper().strip()
    
    # Basic validation - alphanumeric characters and dots
    if not symbol.replace('.', '').replace('T', '').isdigit() and not symbol.isalpha():
        raise ValidationError("symbol", symbol, "Invalid symbol format")
    
    return symbol

def validate_positive_number(value: Union[int, float], field_name: str) -> Union[int, float]:
    """Validate that a number is positive"""
    if value <= 0:
        raise ValidationError(field_name, value, "Must be a positive number")
    return value

def validate_range(value: Union[int, float], min_val: Union[int, float], max_val: Union[int, float], field_name: str) -> Union[int, float]:
    """Validate that a value is within a specific range"""
    if not min_val <= value <= max_val:
        raise ValidationError(field_name, value, f"Must be between {min_val} and {max_val}")
    return value