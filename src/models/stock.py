"""
Stock model for stock tracking application.
"""

import re
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DECIMAL, DateTime, Index, Integer, String
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column,
                            relationship, validates)


class Base(DeclarativeBase):
    pass


class Stock(Base):
    """Stock model representing comprehensive stock information.

    This model stores detailed information about a stock, including:
    - Basic identification (stock code, company name)
    - Current pricing and performance metrics
    - Historical price data references
    - Market capitalization
    - Trading volume
    - Timestamps for creation and updates

    The model is designed for efficient querying with indexes on commonly
    searched fields like company name, current price, and update timestamps.
    """

    __tablename__ = "stocks"

    # Primary key (allow .T suffix for Japanese stocks)
    stock_code: Mapped[str] = mapped_column(String(10), primary_key=True)

    # Basic information
    company_name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Price information
    current_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    previous_close: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    price_change: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    price_change_pct: Mapped[Decimal] = mapped_column(DECIMAL(5, 2), nullable=False)

    # Volume and market cap
    volume: Mapped[int] = mapped_column(Integer, nullable=False)
    market_cap: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(15, 2), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    watchlist_items = relationship("Watchlist", back_populates="stock")
    price_history = relationship("PriceHistory", back_populates="stock")

    # Indexes for performance
    __table_args__ = (
        Index("idx_company_name", "company_name"),
        Index("idx_current_price", "current_price"),
        Index("idx_updated_at", "updated_at"),
    )

    @validates("stock_code")
    def validate_stock_code(self, key, stock_code):
        """Validate stock code format (4 digits)."""
        if not isinstance(stock_code, str):
            raise ValueError("Stock code must be a string")

        if not re.match(r"^\d{4}(\.T)?$", stock_code):
            raise ValueError("Stock code must be 4 digits or 4 digits with .T suffix")

        return stock_code

    @validates("current_price", "previous_close")
    def validate_prices(self, key, price):
        """Validate price values are positive."""
        if price is not None and price < 0:
            raise ValueError(f"{key} must be non-negative")
        return price

    @validates("volume")
    def validate_volume(self, key, volume):
        """Validate volume is non-negative."""
        if volume is not None and volume < 0:
            raise ValueError("Volume must be non-negative")
        return volume

    @validates("market_cap")
    def validate_market_cap(self, key, market_cap):
        """Validate market cap is positive."""
        if market_cap is not None and market_cap <= 0:
            raise ValueError("Market cap must be positive")
        return market_cap

    @validates("company_name")
    def validate_company_name(self, key, company_name):
        """Validate company name is not empty."""
        if not company_name or not company_name.strip():
            raise ValueError("Company name cannot be empty")
        return company_name.strip()

    def __repr__(self) -> str:
        return (
            f"<Stock(stock_code='{self.stock_code}', "
            f"company_name='{self.company_name}', "
            f"current_price={self.current_price}, "
            f"price_change={self.price_change})>"
        )

    def calculate_price_change(self) -> None:
        """Calculate price change and percentage from current and previous prices."""
        if self.current_price is not None and self.previous_close is not None:
            self.price_change = self.current_price - self.previous_close
            if self.previous_close != 0:
                self.price_change_pct = (self.price_change / self.previous_close) * 100
            else:
                self.price_change_pct = Decimal("0.00")

    def is_price_up(self) -> bool:
        """Check if the current price is higher than previous close."""
        return self.price_change > 0

    def is_price_down(self) -> bool:
        """Check if the current price is lower than previous close."""
        return self.price_change < 0
