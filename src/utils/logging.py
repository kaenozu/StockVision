"""
Structured logging configuration for the Stock Test API.

This module provides comprehensive logging setup including:
- JSON format logging for structured data
- Different log levels for different modules
- Request ID tracking across requests
- Performance logging with timing information
- Rotating file handlers for log management
"""

import json
import logging
import logging.config
import os
import sys
import time
from datetime import datetime
from pathlib import Path


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging."""

    def __init__(self):
        super().__init__()

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON."""
        # Extract standard fields
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "filename": record.filename,
            "line": record.lineno,
            "function": record.funcName,
        }

        # Add process and thread info
        log_entry["process_id"] = os.getpid()
        log_entry["thread_id"] = record.thread
        log_entry["thread_name"] = record.threadName

        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__ if record.exc_info[0] else None,
                "message": str(record.exc_info[1]) if record.exc_info[1] else None,
                "traceback": (
                    self.formatException(record.exc_info) if record.exc_info else None
                ),
            }

        # Add extra fields from record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in {
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "message",
                "exc_info",
                "exc_text",
                "stack_info",
                "getMessage",
            }:
                extra_fields[key] = value

        if extra_fields:
            log_entry["extra"] = extra_fields

        return json.dumps(log_entry, ensure_ascii=False, default=str)


class ColoredFormatter(logging.Formatter):
    """Colored console formatter for development."""

    # Color codes for different log levels
    COLORS = {
        "DEBUG": "\033[36m",  # Cyan
        "INFO": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def __init__(self, include_extra: bool = True):
        super().__init__()
        self.include_extra = include_extra

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors."""
        # Get color for log level
        color = self.COLORS.get(record.levelname, "")

        # Format timestamp
        timestamp = datetime.fromtimestamp(record.created).strftime("%H:%M:%S.%f")[:-3]

        # Format base message
        base_message = (
            f"{color}{record.levelname:8}{self.RESET} "
            f"{timestamp} "
            f"{record.name:20} "
            f"{record.getMessage()}"
        )

        # Add extra fields if present and enabled
        if self.include_extra:
            extra_fields = {}
            for key, value in record.__dict__.items():
                if key not in {
                    "name",
                    "msg",
                    "args",
                    "levelname",
                    "levelno",
                    "pathname",
                    "filename",
                    "module",
                    "lineno",
                    "funcName",
                    "created",
                    "msecs",
                    "relativeCreated",
                    "thread",
                    "threadName",
                    "processName",
                    "process",
                    "message",
                    "exc_info",
                    "exc_text",
                    "stack_info",
                    "getMessage",
                }:
                    extra_fields[key] = value

            if extra_fields:
                base_message += f" {extra_fields}"

        # Add exception info if present
        if record.exc_info:
            base_message += "\n" + self.formatException(record.exc_info)

        return base_message


class RequestIdFilter(logging.Filter):
    """Filter to add request ID to log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        """Add request ID if available."""
        # Try to get request ID from various sources
        request_id = getattr(record, "request_id", None)

        if not request_id:
            # Try to get from thread-local storage or context
            import threading

            thread_local = getattr(threading.current_thread(), "request_id", None)
            if thread_local:
                request_id = thread_local

        # Set request_id on record (will be None if not found)
        record.request_id = request_id
        return True


class PerformanceLogger:
    """Context manager for performance logging."""

    def __init__(
        self, operation: str, logger: logging.Logger = None, level: int = logging.INFO
    ):
        self.operation = operation
        self.logger = logger or logging.getLogger(__name__)
        self.level = level
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        self.logger.log(
            self.level,
            f"Starting operation: {self.operation}",
            extra={"operation": self.operation, "event": "start"},
        )
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time

        if exc_type is None:
            self.logger.log(
                self.level,
                f"Completed operation: {self.operation} in {duration:.3f}s",
                extra={
                    "operation": self.operation,
                    "event": "complete",
                    "duration_seconds": duration,
                    "success": True,
                },
            )
        else:
            self.logger.error(
                f"Failed operation: {self.operation} after {duration:.3f}s",
                extra={
                    "operation": self.operation,
                    "event": "error",
                    "duration_seconds": duration,
                    "success": False,
                    "error_type": exc_type.__name__ if exc_type else None,
                    "error_message": str(exc_val) if exc_val else None,
                },
            )


def setup_logging(
    log_level: str = None,
    log_format: str = "json",
    log_file: str = None,
    console_output: bool = True,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5,
) -> None:
    """Setup logging configuration.

    Args:
        log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_format: Format type ("json" or "colored")
        log_file: Path to log file (default: logs/app.log)
        console_output: Whether to output to console
        max_bytes: Maximum size of log file before rotation
        backup_count: Number of backup files to keep
    """
    # Get configuration from environment if not provided
    log_level = log_level or os.getenv("LOG_LEVEL", "INFO").upper()
    log_format = log_format or os.getenv("LOG_FORMAT", "json").lower()

    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Default log file
    if log_file is None:
        log_file = log_dir / "app.log"
    else:
        log_file = Path(log_file)
        log_file.parent.mkdir(parents=True, exist_ok=True)

    # Clear any existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()

    # Set root log level
    numeric_level = getattr(logging, log_level, logging.INFO)
    root_logger.setLevel(numeric_level)

    handlers = []

    # Console handler
    if console_output:
        console_handler = logging.StreamHandler(sys.stdout)

        if log_format == "json":
            console_handler.setFormatter(JSONFormatter())
        else:
            console_handler.setFormatter(ColoredFormatter())

        console_handler.addFilter(RequestIdFilter())
        handlers.append(console_handler)

    # File handler with rotation
    if log_file:
        from logging.handlers import RotatingFileHandler

        file_handler = RotatingFileHandler(
            log_file, maxBytes=max_bytes, backupCount=backup_count, encoding="utf-8"
        )

        # Always use JSON format for file logging
        file_handler.setFormatter(JSONFormatter())
        file_handler.addFilter(RequestIdFilter())
        handlers.append(file_handler)

    # Add handlers to root logger
    for handler in handlers:
        handler.setLevel(numeric_level)
        root_logger.addHandler(handler)

    # Configure specific loggers
    _configure_module_loggers(numeric_level)

    # Log configuration info
    logging.info(
        "Logging configured",
        extra={
            "log_level": log_level,
            "log_format": log_format,
            "log_file": str(log_file) if log_file else None,
            "console_output": console_output,
            "max_bytes": max_bytes,
            "backup_count": backup_count,
        },
    )


def _configure_module_loggers(default_level: int) -> None:
    """Configure logging levels for specific modules."""

    # Application loggers
    app_loggers = [
        "src.main",
        "src.api.stocks",
        "src.api.watchlist",
        "src.middleware.error_handler",
        "src.stock_storage.database",
        "src.stock_api.yahoo_client",
    ]

    for logger_name in app_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(default_level)

    # External library loggers - set to WARNING to reduce noise
    external_loggers = [
        "uvicorn.access",
        "uvicorn.error",
        "sqlalchemy.engine",
        "sqlalchemy.pool",
        "httpx",
        "httpcore",
    ]

    for logger_name in external_loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(logging.WARNING)

    # Specifically allow uvicorn startup messages
    logging.getLogger("uvicorn").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Get a configured logger for a specific module.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def log_request_start(method: str, path: str, request_id: str = None, **extra) -> None:
    """Log the start of an HTTP request."""
    logger = get_logger("request")
    logger.info(
        f"Request started: {method} {path}",
        extra={
            "event": "request_start",
            "method": method,
            "path": path,
            "request_id": request_id,
            **extra,
        },
    )


def log_request_end(
    method: str,
    path: str,
    status_code: int,
    duration: float,
    request_id: str = None,
    **extra,
) -> None:
    """Log the end of an HTTP request."""
    logger = get_logger("request")
    logger.info(
        f"Request completed: {method} {path} -> {status_code} ({duration:.3f}s)",
        extra={
            "event": "request_end",
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_seconds": duration,
            "request_id": request_id,
            **extra,
        },
    )


# Convenience function for performance monitoring
def performance_monitor(operation: str, logger: logging.Logger = None):
    """Decorator or context manager for performance monitoring.

    Can be used as a decorator:
        @performance_monitor("database_query")
        def my_function():
            ...

    Or as a context manager:
        with performance_monitor("api_call"):
            ...
    """

    def decorator(func):
        import functools

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            with PerformanceLogger(operation, logger):
                return func(*args, **kwargs)

        return wrapper

    # If called without arguments, return the context manager
    if callable(operation):
        func = operation
        # operation_name = func.__name__ # Commented out as it's unused
        return decorator(func)
    else:
        return PerformanceLogger(operation, logger)
