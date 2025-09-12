"""
Price History model for stock tracking application.
"""

from datetime import date
from decimal import Decimal
from typing import Optional

from sqlalchemy import DECIMAL, Date, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from .stock import Base


class PriceHistory(Base):
    """Price History model representing detailed historical stock price data.

    This model stores daily Open-High-Low-Close (OHLC) price data for stocks,
    along with trading volumes. Each record represents a single trading day
    for a specific stock.

    Key features:
    - Stores OHLC prices with high precision (2 decimal places)
    - Tracks trading volume for each day
    - Optionally stores adjusted closing prices
    - Maintains foreign key relationship to Stock model
    - Includes business rule validations for price consistency
    - Optimized for time-series queries with date and stock code indexes

    Business rules enforced:
    - High price >= max(Open, Close)
    - Low price <= min(Open, Close)
    - High price >= Low price
    - All prices must be positive
    - Volume must be non-negative
    """

    __tablename__ = "price_history"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Foreign key to Stock
    stock_code: Mapped[str] = mapped_column(
        String(4), ForeignKey("stocks.stock_code"), nullable=False
    )

    # Date
    date: Mapped[date] = mapped_column(Date, nullable=False)

    # OHLC prices
    open_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    high_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    low_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)
    close_price: Mapped[Decimal] = mapped_column(DECIMAL(10, 2), nullable=False)

    # Volume
    volume: Mapped[int] = mapped_column(Integer, nullable=False)

    # Adjusted close price (optional)
    adj_close: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)

    # Relationships
    stock = relationship("Stock", back_populates="price_history")

    # Indexes for performance
    __table_args__ = (
        Index("idx_stock_code_date", "stock_code", "date", unique=True),
        Index("idx_date", "date"),
        Index("idx_price_history_stock_code", "stock_code"),
        Index("idx_close_price", "close_price"),
    )

    @validates("stock_code")
    def validate_stock_code(self, key, stock_code):
        """Validate stock code format (4 digits)."""
        import re

        if not isinstance(stock_code, str):
            raise ValueError("Stock code must be a string")

        if not re.match(r"^\d{4}$", stock_code):
            raise ValueError("Stock code must be exactly 4 digits")

        return stock_code

    @validates("open_price", "high_price", "low_price", "close_price", "adj_close")
    def validate_prices(self, key, price):
        """Validate all prices are positive."""
        if price is not None and price <= 0:
            raise ValueError(f"{key} must be positive")
        return price

    @validates("volume")
    def validate_volume(self, key, volume):
        """Validate volume is non-negative."""
        if volume is not None and volume < 0:
            raise ValueError("Volume must be non-negative")
        return volume

    def validate_ohlc_relationships(self) -> None:
        """Validate OHLC price relationships."""
        # High price should be >= max(open, close)
        max_open_close = max(self.open_price, self.close_price)
        if self.high_price < max_open_close:
            raise ValueError("High price must be >= max(open_price, close_price)")

        # Low price should be <= min(open, close)
        min_open_close = min(self.open_price, self.close_price)
        if self.low_price > min_open_close:
            raise ValueError("Low price must be <= min(open_price, close_price)")

        # High price should be >= low price
        if self.high_price < self.low_price:
            raise ValueError("High price must be >= low price")

    def __repr__(self) -> str:
        return (
            f"<PriceHistory(id={self.id}, "
            f"stock_code='{self.stock_code}', "
            f"date='{self.date}', "
            f"close_price={self.close_price})>"
        )

    def get_price_range(self) -> Decimal:
        """Get the price range (high - low) for the day."""
        return self.high_price - self.low_price

    def get_price_change(self) -> Decimal:
        """Get the price change (close - open) for the day."""
        return self.close_price - self.open_price

    def get_price_change_pct(self) -> Decimal:
        """Get the price change percentage for the day."""
        if self.open_price == 0:
            return Decimal("0.00")
        return (self.get_price_change() / self.open_price) * 100

    def is_bullish_day(self) -> bool:
        """Check if it was a bullish day (close > open)."""
        return self.close_price > self.open_price

    def is_bearish_day(self) -> bool:
        """Check if it was a bearish day (close < open)."""
        return self.close_price < self.open_price

    def is_doji(self, threshold_pct: Decimal = Decimal("0.1")) -> bool:
        """Check if it's a doji (open ≈ close within threshold)."""
        if self.open_price == 0:
            return False
        change_pct = abs(self.get_price_change_pct())
        return change_pct <= threshold_pct
