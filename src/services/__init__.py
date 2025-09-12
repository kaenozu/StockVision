"""Services module for stock application.

Avoid importing heavy dependencies at module import time to keep FastAPI app
import lightweight for tests and environments without optional deps.
"""

__all__ = [
    "HybridStockService",
    "CacheManager",
    "MockDataGenerator",
    "get_stock_service",
    "cleanup_stock_service",
]


# Lazy accessors to avoid import side effects
def __getattr__(name):
    if name in __all__:
        from . import stock_service as _svc

        return getattr(_svc, name)
    raise AttributeError(name)
