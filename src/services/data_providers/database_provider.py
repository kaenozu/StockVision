"""
Database data provider for cached stock data.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from .base_provider import BaseDataProvider, DataProviderError, DataNotFoundError
from ...stock_api.data_models import StockData, CurrentPrice, PriceHistoryData, PriceHistoryItem
from ...models.stock import Stock
from ...models.price_history import PriceHistory

logger = logging.getLogger(__name__)


class DatabaseProvider(BaseDataProvider):
    """
    Database data provider for cached stock data.
    
    Retrieves previously cached stock data from the database.
    """
    
    def __init__(self, db_session: Session, **config):
        super().__init__("database", **config)
        self.db = db_session
        self.cache_ttl = config.get('cache_ttl', 300)  # 5 minutes default
    
    async def get_stock_info(self, stock_code: str) -> StockData:
        """Get stock information from database cache."""
        try:
            stock = self.db.query(Stock).filter(Stock.stock_code == stock_code).first()
            
            if not stock:
                self._record_request(False)
                raise DataNotFoundError(f"Stock {stock_code} not found in database")
            
            # Check if data is fresh enough
            if stock.updated_at and (datetime.utcnow() - stock.updated_at).total_seconds() > self.cache_ttl:
                self._record_request(False)
                raise DataProviderError(f"Stock data for {stock_code} is stale")
            
            self._record_request(True)
            
            return StockData(
                stock_code=stock.stock_code,
                company_name=stock.company_name,
                current_price=stock.current_price,
                previous_close=stock.previous_close,
                price_change=stock.price_change,
                price_change_pct=stock.price_change_pct,
                volume=stock.volume,
                market_cap=stock.market_cap,
                day_high=stock.day_high,
                day_low=stock.day_low,
                year_high=stock.year_high,
                year_low=stock.year_low,
                avg_volume=stock.avg_volume,
                pe_ratio=stock.pe_ratio,
                dividend_yield=stock.dividend_yield,
                last_updated=stock.updated_at or stock.created_at
            )
            
        except DataNotFoundError:
            raise
        except DataProviderError:
            raise  
        except Exception as e:
            self._record_request(False)
            logger.error(f"Database error getting stock info for {stock_code}: {e}")
            raise DataProviderError(f"Database error: {e}") from e
    
    async def get_current_price(self, stock_code: str) -> CurrentPrice:
        """Get current price from database cache."""
        try:
            stock_data = await self.get_stock_info(stock_code)
            return stock_data.to_current_price()
            
        except Exception as e:
            logger.error(f"Error getting current price from database for {stock_code}: {e}")
            raise DataProviderError(f"Database error: {e}") from e
    
    async def get_price_history(self, stock_code: str, days: int = 30) -> PriceHistoryData:
        """Get price history from database cache."""
        try:
            end_date = datetime.utcnow().date()
            start_date = end_date - timedelta(days=days)
            
            history_records = self.db.query(PriceHistory).filter(
                PriceHistory.stock_code == stock_code,
                PriceHistory.date >= start_date,
                PriceHistory.date <= end_date
            ).order_by(PriceHistory.date.desc()).all()
            
            if not history_records:
                self._record_request(False)
                raise DataNotFoundError(f"No price history found for {stock_code}")
            
            # Check if we have enough recent data
            latest_date = max(record.date for record in history_records)
            if (end_date - latest_date).days > 1:  # Data is more than 1 day old
                self._record_request(False)
                raise DataProviderError(f"Price history for {stock_code} is stale")
            
            self._record_request(True)
            
            history_items = [
                PriceHistoryItem(
                    stock_code=record.stock_code,
                    date=record.date.strftime("%Y-%m-%d"),
                    open=record.open_price,
                    high=record.high_price,
                    low=record.low_price,
                    close=record.close_price,
                    volume=record.volume
                )
                for record in history_records
            ]
            
            return PriceHistoryData(
                stock_code=stock_code,
                history=history_items,
                start_date=min(record.date for record in history_records),
                end_date=max(record.date for record in history_records)
            )
            
        except DataNotFoundError:
            raise
        except DataProviderError:
            raise
        except Exception as e:
            self._record_request(False)
            logger.error(f"Database error getting price history for {stock_code}: {e}")
            raise DataProviderError(f"Database error: {e}") from e
    
    async def is_available(self) -> bool:
        """Check if database is available."""
        try:
            # Simple query to test database connectivity
            self.db.execute("SELECT 1")
            return True
        except Exception as e:
            logger.warning(f"Database provider not available: {e}")
            return False
    
    async def close(self) -> None:
        """Close database session."""
        try:
            if self.db:
                self.db.close()
                logger.info("Database session closed")
        except Exception as e:
            logger.error(f"Error closing database session: {e}")