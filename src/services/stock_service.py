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
from fastapi import HTTPException

from ..config import get_settings, should_use_real_data, get_yahoo_finance_config, get_cache_config
from ..stock_api.data_models import StockData, CurrentPrice, PriceHistoryData, PriceHistoryItem
from ..stock_api.yahoo_client import YahooFinanceClient
from ..models.stock import Stock
from ..models.price_history import PriceHistory
from .cache import CacheManager
from .real_data_provider import get_real_data_provider
from .data_providers import (
    BaseDataProvider, DataProviderError, DataNotFoundError,
    YahooFinanceProvider, DatabaseProvider
)

logger = logging.getLogger(__name__)


# Move CacheManager to cache_manager.py




class HybridStockService:
    """
    Real stock service that provides only real stock data.
    
    Features:
    - Real-time stock data from multiple sources
    - Comprehensive caching for API responses
    - Multiple data source fallback mechanisms
    - Performance monitoring and error handling
    """
    
    def __init__(self):
        self.settings = get_settings()
        self.yahoo_config = get_yahoo_finance_config()
        self.cache_config = get_cache_config()
        self.cache = CacheManager()
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
        Get stock information from real data sources only.
        
        Args:
            stock_code: 4-digit stock code
            use_real_data: Ignored parameter for compatibility (always uses real data)
            db: Database session for caching to database
            
        Returns:
            StockData: Stock information from real API sources
        """
        try:
            # Try to get from cache first
            cached_data = await self.cache.get(
                "stock_info", stock_code, ttl=self.yahoo_config.cache_ttl
            )
            
            if cached_data:
                logger.info(f"Using cached stock info for {stock_code}")
                return cached_data
            
            # Try Yahoo Finance client first (more accurate)
            logger.info(f"Fetching real stock info for {stock_code} using Yahoo Finance client")
            client = await self._get_yahoo_client()
            stock_data = await client.get_stock_info(stock_code)
            
            if stock_data:
                # Cache the result
                await self.cache.set("stock_info", stock_code, stock_data)
                
                # Optionally save to database
                if db:
                    await self._save_stock_to_db(stock_data, db)
                
                logger.info(f"Successfully retrieved Yahoo Finance stock info for {stock_code}")
                return stock_data
            
            # Fallback to real data provider
            logger.warning(f"Yahoo Finance client failed for {stock_code}, trying RealDataProvider")
            real_provider = await get_real_data_provider()
            stock_data = await real_provider.get_stock_data(stock_code)
            
            # Cache the result
            await self.cache.set("stock_info", stock_code, stock_data)
            
            # Optionally save to database
            if db:
                await self._save_stock_to_db(stock_data, db)
            
            logger.info(f"Successfully retrieved Yahoo Finance stock info for {stock_code}")
            return stock_data
            
        except Exception as e:
            logger.error(f"All real data sources failed for {stock_code}: {e}")
            raise HTTPException(status_code=503, detail=f"Unable to fetch real stock data for {stock_code}")
    
    async def get_current_price(
        self,
        stock_code: str,
        use_real_data: Optional[bool] = None
    ) -> CurrentPrice:
        """Get current price from real data sources only."""
        try:
            # Try cache first
            cached_data = await self.cache.get(
                "current_price", stock_code, ttl=60  # Shorter TTL for price data
            )
            
            if cached_data:
                logger.info(f"Using cached current price for {stock_code}")
                return cached_data
            
            # Try Yahoo Finance client first (more accurate)
            logger.info(f"Fetching real current price for {stock_code} using Yahoo Finance client")
            client = await self._get_yahoo_client()
            price_data = await client.get_current_price(stock_code)
            
            if price_data:
                # Cache the result
                await self.cache.set("current_price", stock_code, price_data)
                logger.info(f"Successfully retrieved Yahoo Finance current price for {stock_code}")
                return price_data
            
            # Fallback to real data provider
            logger.warning(f"Yahoo Finance client failed for {stock_code}, trying RealDataProvider")
            real_provider = await get_real_data_provider()
            price_data = await real_provider.get_current_price_data(stock_code)
            
            # Cache the result
            await self.cache.set("current_price", stock_code, price_data)
            
            logger.info(f"Successfully retrieved Yahoo Finance current price for {stock_code}")
            return price_data
            
        except Exception as e:
            logger.error(f"All real data sources failed for current price {stock_code}: {e}")
            raise HTTPException(status_code=503, detail=f"Unable to fetch real current price for {stock_code}")
    
    async def get_price_history(
        self,
        stock_code: str,
        days: int = 30,
        use_real_data: Optional[bool] = None,
        db: Optional[Session] = None
    ) -> PriceHistoryData:
        """Get price history from real data sources only."""
        try:
            # Try cache first
            cached_data = await self.cache.get(
                "price_history", stock_code, ttl=self.yahoo_config.cache_ttl, days=days
            )
            
            if cached_data:
                logger.info(f"Using cached price history for {stock_code}")
                return cached_data
            
            # Only use Yahoo Finance for price history as RealDataProvider doesn't support it yet
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
            logger.error(f"All real data sources failed for price history {stock_code}: {e}")
            raise HTTPException(status_code=503, detail=f"Unable to fetch real price history for {stock_code}")
    
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
