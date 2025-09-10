"""
Refactored hybrid stock service using provider pattern.

This service uses a provider-based architecture to manage different data sources
with intelligent fallback mechanisms and comprehensive caching support.
"""
import asyncio
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from ..config import get_settings, should_use_real_data, get_yahoo_finance_config, get_cache_config
from ..stock_api.data_models import StockData, CurrentPrice, PriceHistoryData, PriceHistoryItem
from ..stock_api.yahoo_client import YahooFinanceClient, YahooFinanceError, StockNotFoundError
from ..models.stock import Stock
from ..models.price_history import PriceHistory
from .cache import CacheManager
from .data_providers import (
    BaseDataProvider, DataProviderError, DataNotFoundError,
    YahooFinanceProvider, DatabaseProvider
)

logger = logging.getLogger(__name__)


# Move CacheManager to cache_manager.py


# Move MockDataGenerator to mock_provider.py
    
    
    


class HybridStockService:
    """
    Hybrid stock service that provides both mock and real Yahoo Finance data.
    
    Features:
    - Intelligent switching between mock and real data
    - Comprehensive caching for real API responses
    - Fallback to mock data when real API fails
    - Performance monitoring and error handling
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.yahoo_config = get_yahoo_finance_config()
        self.cache_config = get_cache_config()
        self.cache = CacheManager()
        # Mock generator removed - using data providers and CSV import instead
        self._yahoo_client: Optional[YahooFinanceClient] = None
        self._client_lock = asyncio.Lock()
    
    async def _get_yahoo_client(self) -> YahooFinanceClient:
        """Get or create Yahoo Finance client."""
        async with self._client_lock:
            if self._yahoo_client is None:
                self._yahoo_client = YahooFinanceClient(
                    max_requests=self.yahoo_config.max_requests,
                    time_window=self.yahoo_config.time_window,
                    max_concurrent=self.yahoo_config.max_concurrent,
                    timeout=self.yahoo_config.timeout,
                    retry_attempts=self.yahoo_config.retry_attempts,
                    retry_delay=self.yahoo_config.retry_delay
                )
            return self._yahoo_client
    
    async def close(self):
        """Close Yahoo Finance client and cleanup resources."""
        async with self._client_lock:
            if self._yahoo_client:
                await self._yahoo_client.close()
                self._yahoo_client = None
        await self.cache.clear()
    
    async def get_stock_info(
        self,
        stock_code: str,
        use_real_data: Optional[bool] = None,
        db: Optional[Session] = None
    ) -> StockData:
        """
        Get stock information with hybrid data source support.
        
        Args:
            stock_code: 4-digit stock code
            use_real_data: Override for real API usage (None = use config)
            db: Database session for caching to database
            
        Returns:
            StockData: Stock information from real API or mock data
        """
        should_use_real = should_use_real_data(use_real_data)
        
        if should_use_real:
            # Try to get from cache first
            cached_data = await self.cache.get(
                "stock_info", stock_code, ttl=self.yahoo_config.cache_ttl
            )
            
            if cached_data:
                logger.info(f"Using cached stock info for {stock_code}")
                return cached_data
            
            # Try to get from database
            if db:
                db_stock = db.query(Stock).filter(Stock.stock_code == stock_code).first()
                if db_stock and db_stock.updated_at:
                    # Check if data is fresh enough (e.g., within last hour)
                    from datetime import datetime, timedelta
                    if datetime.utcnow() - db_stock.updated_at < timedelta(hours=1):
                        logger.info(f"Using database stock info for {stock_code}")
                        stock_data = StockData(
                            stock_code=db_stock.stock_code,
                            company_name=db_stock.company_name,
                            current_price=db_stock.current_price,
                            previous_close=db_stock.previous_close,
                            price_change=db_stock.price_change,
                            price_change_pct=db_stock.price_change_pct,
                            volume=db_stock.volume,
                            market_cap=db_stock.market_cap,
                            last_updated=db_stock.updated_at
                        )
                        # Also cache it
                        await self.cache.set("stock_info", stock_code, stock_data)
                        return stock_data
            
            # Try to get from real Yahoo Finance API
            try:
                logger.info(f"Fetching real stock info for {stock_code}")
                client = await self._get_yahoo_client()
                stock_data = await client.get_stock_info(stock_code)
                
                # Cache the result
                await self.cache.set("stock_info", stock_code, stock_data)
                
                # Optionally save to database
                if db:
                    await self._save_stock_to_db(stock_data, db)
                
                logger.info(f"Successfully retrieved real stock info for {stock_code}")
                return stock_data
                
            except (YahooFinanceError, StockNotFoundError) as e:
                logger.warning(f"Real API failed for {stock_code}, falling back to mock data: {e}")
                # Fall back to mock data
                pass
            except Exception as e:
                logger.error(f"Unexpected error getting real stock info for {stock_code}: {e}")
                # Fall back to mock data
                pass
        
        # Use mock data - check cache first
        cached_mock_data = await self.cache.get(
            "stock_info", stock_code, ttl=self.cache_config.stock_info_ttl
        )
        
        if cached_mock_data:
            logger.info(f"Using cached mock stock info for {stock_code}")
            return cached_mock_data
        
        # Generate sample stock data as fallback (CSV import will provide real data)
        logger.info(f"Generating sample stock data for {stock_code} - consider using CSV import for real data")
        from decimal import Decimal
        from datetime import datetime
        
        sample_stock_data = StockData(
            stock_code=stock_code,
            company_name=f"Sample Company {stock_code}",
            current_price=Decimal('2500.0'),
            previous_close=Decimal('2480.0'),
            price_change=Decimal('20.0'),
            price_change_pct=Decimal('0.81'),
            volume=1000000,
            market_cap=Decimal('5000000000'),
            high_52week=Decimal('3000.0'),
            low_52week=Decimal('2000.0'),
            dividend_yield=Decimal('2.5'),
            pe_ratio=Decimal('15.0'),
            last_updated=datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        )
        
        # Cache the result
        await self.cache.set("stock_info", stock_code, sample_stock_data)
        
        logger.info(f"Successfully generated sample stock info for {stock_code}")
        return sample_stock_data
    
    async def get_current_price(
        self,
        stock_code: str,
        use_real_data: Optional[bool] = None
    ) -> CurrentPrice:
        """Get current price with hybrid data source support."""
        should_use_real = should_use_real_data(use_real_data)
        
        if should_use_real:
            # Try cache first
            cached_data = await self.cache.get(
                "current_price", stock_code, ttl=60  # Shorter TTL for price data
            )
            
            if cached_data:
                logger.info(f"Using cached current price for {stock_code}")
                return cached_data
            
            # Try real API
            try:
                logger.info(f"Fetching real current price for {stock_code}")
                client = await self._get_yahoo_client()
                price_data = await client.get_current_price(stock_code)
                
                # Cache the result
                await self.cache.set("current_price", stock_code, price_data)
                
                logger.info(f"Successfully retrieved real current price for {stock_code}")
                return price_data
                
            except Exception as e:
                logger.warning(f"Real API failed for current price {stock_code}, using mock: {e}")
        
        # Use mock data - check cache first
        cached_mock_price = await self.cache.get(
            "current_price", stock_code, ttl=self.cache_config.current_price_ttl
        )
        
        if cached_mock_price:
            logger.info(f"Using cached mock current price for {stock_code}")
            return cached_mock_price
        
        # Generate sample current price as fallback (CSV import will provide real data)
        logger.info(f"Generating sample current price for {stock_code} - consider using CSV import for real data")
        from decimal import Decimal
        from datetime import datetime
        
        sample_current_price = CurrentPrice(
            stock_code=stock_code,
            current_price=Decimal('2500.0'),
            price_change=Decimal('20.0'),
            price_change_pct=Decimal('0.81'),
            previous_close=Decimal('2480.0'),
            volume=1000000,
            timestamp=datetime.now()
        )
        
        # Cache the result
        await self.cache.set("current_price", stock_code, sample_current_price)
        
        logger.info(f"Successfully generated sample current price for {stock_code}")
        return sample_current_price
    
    async def get_price_history(
        self,
        stock_code: str,
        days: int = 30,
        use_real_data: Optional[bool] = None,
        db: Optional[Session] = None
    ) -> PriceHistoryData:
        """Get price history with hybrid data source support."""
        should_use_real = should_use_real_data(use_real_data)
        
        logger.info(f"Getting price history for {stock_code} (use_real_data={should_use_real})")
        
        if should_use_real:

            # Try cache first
            cached_data = await self.cache.get(
                "price_history", stock_code, ttl=self.yahoo_config.cache_ttl, days=days
            )
            
            if cached_data:
                logger.info(f"Using cached price history for {stock_code}")
                return cached_data
            
            # Try to get from database
            if db:
                from datetime import datetime, timedelta
                start_date = datetime.utcnow().date() - timedelta(days=days)
                db_history = db.query(PriceHistory).filter(
                    PriceHistory.stock_code == stock_code,
                    PriceHistory.date >= start_date
                ).order_by(PriceHistory.date.desc()).all()
                
                if db_history and len(db_history) >= days * 0.7:  # At least 70% of requested days
                    logger.info(f"Using database price history for {stock_code}: {len(db_history)} records")
                    history_items = []
                    for record in db_history:
                        history_items.append(PriceHistoryItem(
                            stock_code=record.stock_code,
                            date=record.date,
                            open=record.open_price,
                            high=record.high_price,
                            low=record.low_price,
                            close=record.close_price,
                            volume=record.volume
                        ))
                    
                    history_data = PriceHistoryData(
                        stock_code=stock_code,
                        history=history_items,
                        period_days=days
                    )
                    # Also cache it
                    await self.cache.set("price_history", stock_code, history_data, days=days)
                    return history_data
            
            # Try real API
            try:
                # Use real Yahoo Finance API
                logger.info(f"Fetching real price history for {stock_code}")
                client = await self._get_yahoo_client()
                price_history_data = await client.get_price_history(stock_code, days)
                
                # Cache the result
                await self.cache.set("price_history", stock_code, price_history_data, days=days)
                # Optionally save to database
                if db:
                    await self._save_price_history_to_db(price_history_data, db)
                
                logger.info(f"Successfully retrieved real price history for {stock_code}")
                return price_history_data
                
            except Exception as e:
                logger.error(f"Real API failed for price history {stock_code}: {e}")
                # Fallback to mock data will be handled below
        
        # Fallback: Use cached mock data or generate sample data
        cached_mock_history = await self.cache.get(
            "price_history", stock_code, ttl=self.cache_config.price_history_ttl, days=days
        )
        
        if cached_mock_history:
            logger.info(f"Using cached mock price history for {stock_code}")
            return cached_mock_history
        
        # Generate sample price history data as fallback (CSV import will provide real data)
        logger.warning(f"Generating sample price history for {stock_code} as fallback - consider using CSV import for real data")
        from datetime import date, timedelta, datetime
        from decimal import Decimal
        from ..stock_api.data_models import PriceHistoryData, PriceHistoryItem
        
        # Generate simple sample data for the requested period
        history_items = []
        base_price = Decimal('1000.0')  # Base price for sample data
        
        for i in range(min(days, 10)):  # Limit to 10 sample days
            day_offset = timedelta(days=i)
            trade_date = datetime.now() - day_offset
            
            # Simple price variation for demo
            daily_change = Decimal(str(i * 0.5))
            
            sample_item = PriceHistoryItem(
                stock_code=stock_code,
                date=trade_date,
                open=base_price + daily_change,
                high=base_price + daily_change + Decimal('5.0'),
                low=base_price + daily_change - Decimal('5.0'),
                close=base_price + daily_change + Decimal('2.0'),
                volume=1000000 + (i * 10000)
            )
            history_items.append(sample_item)
        
        return PriceHistoryData(
            stock_code=stock_code,
            history=history_items,
            period_days=days
        )
    
    async def _save_stock_to_db(self, stock_data: StockData, db: Session) -> None:
        """Save stock data to database."""
        try:
            existing_stock = db.query(Stock).filter(Stock.stock_code == stock_data.stock_code).first()
            
            if existing_stock:
                # Update existing record
                existing_stock.company_name = stock_data.company_name
                existing_stock.current_price = stock_data.current_price
                existing_stock.previous_close = stock_data.previous_close
                existing_stock.price_change = stock_data.price_change
                existing_stock.price_change_pct = stock_data.price_change_pct
                existing_stock.volume = stock_data.volume
                existing_stock.market_cap = stock_data.market_cap
                existing_stock.updated_at = datetime.utcnow()
            else:
                # Create new record
                new_stock = Stock(
                    stock_code=stock_data.stock_code,
                    company_name=stock_data.company_name,
                    current_price=stock_data.current_price,
                    previous_close=stock_data.previous_close,
                    price_change=stock_data.price_change,
                    price_change_pct=stock_data.price_change_pct,
                    volume=stock_data.volume,
                    market_cap=stock_data.market_cap,
                    created_at=datetime.utcnow()
                )
                db.add(new_stock)
            
            db.commit()
            logger.debug(f"Saved stock data to database: {stock_data.stock_code}")
            
        except Exception as e:
            logger.error(f"Error saving stock data to database: {e}")
            db.rollback()
    
    async def _save_price_history_to_db(self, history_data: PriceHistoryData, db: Session) -> None:
        """Save price history data to database."""
        try:
            for item in history_data.history:
                # item.date may be datetime or str depending on model configuration
                if isinstance(item.date, datetime):
                    item_date = item.date.date()
                else:
                    item_date = datetime.strptime(item.date, "%Y-%m-%d").date()
                existing_record = db.query(PriceHistory).filter(
                    PriceHistory.stock_code == item.stock_code,
                    PriceHistory.date == item_date
                ).first()
                
                if not existing_record:
                    new_record = PriceHistory(
                        stock_code=item.stock_code,
                        date=item_date,
                        open_price=item.open,
                        high_price=item.high,
                        low_price=item.low,
                        close_price=item.close,
                        volume=item.volume,
                        adj_close=item.close
                    )
                    db.add(new_record)
            
            db.commit()
            logger.debug(f"Saved {len(history_data.history)} price history records to database")
            
        except Exception as e:
            logger.error(f"Error saving price history to database: {e}")
            db.rollback()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return self.cache.get_stats()


# Global service instance
_stock_service: Optional[HybridStockService] = None
_service_lock = asyncio.Lock()


async def get_stock_service() -> HybridStockService:
    """Get global stock service instance."""
    global _stock_service
    
    async with _service_lock:
        if _stock_service is None:
            _stock_service = HybridStockService()
        return _stock_service


async def cleanup_stock_service():
    """Cleanup global stock service instance."""
    global _stock_service
    
    async with _service_lock:
        if _stock_service:
            await _stock_service.close()
            _stock_service = None
