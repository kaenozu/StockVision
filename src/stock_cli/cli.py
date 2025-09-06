"""
Minimal CLI stub for integration with tests.

This module provides a lightweight `StockCLI` class to satisfy imports in
integration tests. Methods are async and raise NotImplementedError by default.
Extend incrementally as features are implemented.
"""
from __future__ import annotations

from typing import Any, List, Optional


class StockCLI:
    """Lightweight CLI facade used by integration tests.

    Parameters
    ----------
    database: Optional[Any]
        Optional database dependency; kept generic to avoid tight coupling.
    """

    def __init__(self, database: Optional[Any] = None) -> None:
        self.database = database

    # --- Stock operations ---
    async def search_stock(self, stock_code: str) -> Any:
        raise NotImplementedError("search_stock is not implemented yet")

    async def update_stock_data(self, stock_code: str) -> Any:
        raise NotImplementedError("update_stock_data is not implemented yet")

    # --- Watchlist operations ---
    async def add_to_watchlist(
        self,
        *,
        stock_code: str,
        notes: Optional[str] = None,
        alert_high: Optional[Any] = None,
        alert_low: Optional[Any] = None,
    ) -> Any:
        raise NotImplementedError("add_to_watchlist is not implemented yet")

    async def get_watchlist(self) -> List[Any]:
        raise NotImplementedError("get_watchlist is not implemented yet")

