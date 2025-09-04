"""
Hybrid stock service that provides both mock and real Yahoo Finance data.

This service intelligently chooses between mock data and real Yahoo Finance API
based on configuration settings and query parameters, with comprehensive caching support.
"""
import asyncio
import logging
import time
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from ..config import get_settings, should_use_real_data, get_yahoo_finance_config
from ..stock_api.yahoo_client import YahooFinanceClient, YahooFinanceError, StockNotFoundError
from ..stock_api.data_models import StockData, CurrentPrice, PriceHistoryData, PriceHistoryItem
from ..models.stock import Stock
from ..models.price_history import PriceHistory

logger = logging.getLogger(__name__)


class CacheManager:
    """Simple in-memory cache for Yahoo Finance API responses."""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
    
    def _get_cache_key(self, operation: str, stock_code: str, **kwargs) -> str:
        """Generate cache key for operation."""
        params = "_".join(f"{k}={v}" for k, v in sorted(kwargs.items()) if v is not None)
        return f"{operation}_{stock_code}_{params}" if params else f"{operation}_{stock_code}"
    
    async def get(self, operation: str, stock_code: str, ttl: int = 300, **kwargs) -> Optional[Any]:
        """Get cached data if available and not expired."""
        async with self._lock:
            cache_key = self._get_cache_key(operation, stock_code, **kwargs)
            
            if cache_key not in self._cache:
                return None
            
            cached_data = self._cache[cache_key]
            
            # Check if expired
            if time.time() - cached_data["timestamp"] > ttl:
                del self._cache[cache_key]
                return None
            
            logger.debug(f"Cache hit for {cache_key}")
            return cached_data["data"]
    
    async def set(self, operation: str, stock_code: str, data: Any, **kwargs) -> None:
        """Cache data with timestamp."""
        async with self._lock:
            cache_key = self._get_cache_key(operation, stock_code, **kwargs)
            
            self._cache[cache_key] = {
                "data": data,
                "timestamp": time.time()
            }
            logger.debug(f"Cached data for {cache_key}")
    
    async def clear(self) -> None:
        """Clear all cached data."""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "entries": len(self._cache),
            "size_bytes": len(str(self._cache).encode('utf-8'))
        }


class MockDataGenerator:
    """Generator for realistic mock stock data."""
    
    @staticmethod
    def generate_stock_data(stock_code: str) -> StockData:
        """Generate mock stock data."""
        import random
        
        base_price = Decimal('1000.0')
        current_price = base_price + Decimal(str(random.uniform(-200, 200)))
        previous_close = base_price + Decimal(str(random.uniform(-50, 50)))
        price_change = current_price - previous_close
        price_change_pct = (price_change / previous_close) * 100 if previous_close > 0 else Decimal('0')
        
        return StockData(
            stock_code=stock_code,
            company_name=f"Mock Company {stock_code}",
            current_price=current_price,
            previous_close=previous_close,
            price_change=price_change,
            price_change_pct=price_change_pct,
            volume=random.randint(100000, 10000000),
            market_cap=current_price * Decimal(str(random.randint(1000000, 100000000))),
            day_high=current_price * Decimal('1.05'),
            day_low=current_price * Decimal('0.95'),
            year_high=current_price * Decimal('1.3'),
            year_low=current_price * Decimal('0.7'),
            avg_volume=random.randint(500000, 5000000),
            pe_ratio=Decimal(str(random.uniform(10, 30))) if random.choice([True, False]) else None,
            dividend_yield=Decimal(str(random.uniform(1, 5))) if random.choice([True, False]) else None,
            last_updated=datetime.utcnow()
        )
    
    @staticmethod
    def generate_current_price(stock_code: str) -> CurrentPrice:
        """Generate mock current price data."""
        stock_data = MockDataGenerator.generate_stock_data(stock_code)
        return stock_data.to_current_price()
    
    @staticmethod
    def generate_price_history(stock_code: str, days: int = 30) -> PriceHistoryData:
        """Generate mock price history data."""
        import random
        
        history_items = []
        base_price = 1000.0
        current_date = date.today()
        
        for i in range(days):
            daily_change = random.uniform(-5, 5)  # -5% to +5%
            open_price = Decimal(str(base_price * (1 + daily_change / 100)))
            high_price = open_price * Decimal(str(1 + random.uniform(0, 0.05)))
            low_price = open_price * Decimal(str(1 - random.uniform(0, 0.05)))
            close_price = Decimal(str(random.uniform(float(low_price), float(high_price))))
            volume = random.randint(50000, 5000000)
            
            history_item = PriceHistoryItem(
                stock_code=stock_code,
                date=current_date.strftime("%Y-%m-%d"),
                open=open_price,
                high=high_price,
                low=low_price,
                close=close_price,
                volume=volume
            )
            
            history_items.append(history_item)
            current_date = current_date - timedelta(days=1)
            base_price = float(close_price)  # Next day's base price
        
        # Sort by date descending (most recent first)
        from datetime import datetime
        history_items.sort(key=lambda x: datetime.strptime(x.date, "%Y-%m-%d"), reverse=True)
        
        return PriceHistoryData(
            stock_code=stock_code,
            history=history_items,
            start_date=min(datetime.strptime(item.date, "%Y-%m-%d").date() for item in history_items),
            end_date=max(datetime.strptime(item.date, "%Y-%m-%d").date() for item in history_items)
        )


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
        self.cache = CacheManager()
        self.mock_generator = MockDataGenerator()
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
        
        # Use mock data
        logger.info(f"Using mock stock info for {stock_code}")
        mock_data = self.mock_generator.generate_stock_data(stock_code)
        
        # Optionally save mock data to database
        if db:
            await self._save_stock_to_db(mock_data, db)
        
        return mock_data
    
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
        
        # Use mock data
        logger.info(f"Using mock current price for {stock_code}")
        return self.mock_generator.generate_current_price(stock_code)
    
    async def get_price_history(
        self,
        stock_code: str,
        days: int = 30,
        use_real_data: Optional[bool] = None,
        db: Optional[Session] = None
    ) -> PriceHistoryData:
        """Get price history with hybrid data source support."""
        should_use_real = should_use_real_data(use_real_data)
        
        if should_use_real:
            # Try cache first
            cached_data = await self.cache.get(
                "price_history", stock_code, ttl=self.yahoo_config.cache_ttl, days=days
            )
            
            if cached_data:
                logger.info(f"Using cached price history for {stock_code}")
                return cached_data
            
            # Try real API
            try:
                logger.info(f"Fetching real price history for {stock_code} ({days} days)")
                client = await self._get_yahoo_client()
                history_data = await client.get_price_history(stock_code, days)
                
                # Cache the result
                await self.cache.set("price_history", stock_code, history_data, days=days)
                
                # Optionally save to database
                if db:
                    await self._save_price_history_to_db(history_data, db)
                
                logger.info(f"Successfully retrieved real price history for {stock_code}")
                return history_data
                
            except Exception as e:
                logger.warning(f"Real API failed for price history {stock_code}, using mock: {e}")
        
        # Use mock data
        logger.info(f"Using mock price history for {stock_code}")
        mock_history = self.mock_generator.generate_price_history(stock_code, days)
        
        # Optionally save mock data to database
        if db:
            await self._save_price_history_to_db(mock_history, db)
        
        return mock_history
    
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