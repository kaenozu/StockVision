"""
Watchlist model for stock tracking application.
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import String, Integer, DECIMAL, DateTime, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, validates, relationship

from .stock import Base


class Watchlist(Base):
    """Watchlist model representing user's personalized stock watchlist items.
    
    This model allows users to track specific stocks of interest and set
    price alerts. Each watchlist item can have:
    - Custom notes for personal reference
    - High and low price alert thresholds
    - Active/inactive status for easy management
    
    Key features:
    - User-friendly alert system with customizable price thresholds
    - Flexible note-taking capability (up to 500 characters)
    - Activation/deactivation without permanent deletion
    - Automatic timestamping of when items are added
    - Efficient querying with indexes on stock code, status, and alerts
    - Relationship to core Stock model for rich data integration
    
    Business rules:
    - Alert high price must be > alert low price (if both are set)
    - Notes are limited to 500 characters
    - Stock codes must follow 4-digit format
    - Alert prices must be positive if set
    """
    
    __tablename__ = "watchlist"
    
    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Foreign key to Stock
    stock_code: Mapped[str] = mapped_column(String(4), ForeignKey("stocks.stock_code"), nullable=False)
    
    # Watchlist information
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text(500), nullable=True)
    
    # Alert prices
    alert_price_high: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)
    alert_price_low: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 2), nullable=True)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Relationships
    stock = relationship("Stock", back_populates="watchlist_items")
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_watchlist_stock_code', 'stock_code'),
        Index('idx_added_at', 'added_at'),
        Index('idx_is_active', 'is_active'),
        Index('idx_alert_prices', 'alert_price_high', 'alert_price_low'),
    )
    
    @validates('stock_code')
    def validate_stock_code(self, key, stock_code):
        """Validate stock code format (4 digits)."""
        import re
        if not isinstance(stock_code, str):
            raise ValueError("Stock code must be a string")
        
        if not re.match(r'^\d{4}$', stock_code):
            raise ValueError("Stock code must be exactly 4 digits")
        
        return stock_code
    
    @validates('alert_price_high', 'alert_price_low')
    def validate_alert_prices(self, key, price):
        """Validate alert prices are positive."""
        if price is not None and price <= 0:
            raise ValueError(f"{key} must be positive")
        return price
    
    @validates('notes')
    def validate_notes(self, key, notes):
        """Validate notes length."""
        if notes is not None and len(notes) > 500:
            raise ValueError("Notes cannot exceed 500 characters")
        return notes
    
    def validate_alert_price_relationship(self) -> None:
        """Validate that high alert price is greater than low alert price."""
        if (self.alert_price_high is not None and 
            self.alert_price_low is not None and 
            self.alert_price_high <= self.alert_price_low):
            raise ValueError("Alert high price must be greater than alert low price")
    
    def __repr__(self) -> str:
        return (
            f"<Watchlist(id={self.id}, "
            f"stock_code='{self.stock_code}', "
            f"added_at='{self.added_at}', "
            f"is_active={self.is_active})>"
        )
    
    def should_alert_high(self, current_price: Decimal) -> bool:
        """Check if current price triggers high alert."""
        return (self.is_active and 
                self.alert_price_high is not None and 
                current_price >= self.alert_price_high)
    
    def should_alert_low(self, current_price: Decimal) -> bool:
        """Check if current price triggers low alert."""
        return (self.is_active and 
                self.alert_price_low is not None and 
                current_price <= self.alert_price_low)
    
    def has_alerts_configured(self) -> bool:
        """Check if any alert prices are configured."""
        return self.alert_price_high is not None or self.alert_price_low is not None
    
    def deactivate(self) -> None:
        """Deactivate the watchlist item."""
        self.is_active = False
    
    def activate(self) -> None:
        """Activate the watchlist item."""
        self.is_active = True