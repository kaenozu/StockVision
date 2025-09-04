"""
Storage service for stock tracking application.

This module provides CRUD operations for stocks, watchlist items, and price history
with comprehensive error handling and transaction management.
"""
import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Union

from sqlalchemy import and_, or_, desc, asc, func
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from .database import get_session_scope, get_session
from ..models.stock import Stock
from ..models.watchlist import Watchlist
from ..models.price_history import PriceHistory

logger = logging.getLogger(__name__)


class StorageError(Exception):
    """Base exception for storage operations."""
    pass


class StockNotFoundError(StorageError):
    """Exception raised when stock is not found."""
    pass


class WatchlistItemNotFoundError(StorageError):
    """Exception raised when watchlist item is not found."""
    pass


class PriceHistoryNotFoundError(StorageError):
    """Exception raised when price history is not found."""
    pass


class DuplicateStockError(StorageError):
    """Exception raised when attempting to create duplicate stock."""
    pass


class StockStorageService:
    """Service class for stock data storage operations."""
    
    def __init__(self, session: Optional[Session] = None):
        """Initialize storage service.
        
        Args:
            session: Optional SQLAlchemy session. If None, will use session_scope for operations.
        """
        self._session = session
    
    def _get_session_context(self):
        """Get session context manager."""
        if self._session:
            # セッションが提供されている場合は、そのまま使用（外部でトランザクション管理）
            from contextlib import nullcontext
            return nullcontext(self._session)
        else:
            # セッションが提供されていない場合は、session_scopeを使用
            return get_session_scope()
    
    # Stock CRUD operations
    def create_stock(
        self,
        stock_code: str,
        company_name: str,
        current_price: Decimal,
        previous_close: Decimal,
        volume: int,
        market_cap: Optional[Decimal] = None
    ) -> Stock:
        """Create a new stock record.
        
        Args:
            stock_code: 4-digit stock code
            company_name: Company name
            current_price: Current stock price
            previous_close: Previous closing price
            volume: Trading volume
            market_cap: Market capitalization (optional)
            
        Returns:
            Created Stock instance
            
        Raises:
            DuplicateStockError: If stock already exists
            StorageError: If creation fails
        """
        try:
            with self._get_session_context() as session:
                # 重複チェック
                existing_stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                if existing_stock:
                    raise DuplicateStockError(f"Stock {stock_code} already exists")
                
                # 新しい株式レコードを作成
                stock = Stock(
                    stock_code=stock_code,
                    company_name=company_name,
                    current_price=current_price,
                    previous_close=previous_close,
                    volume=volume,
                    market_cap=market_cap
                )
                
                # 価格変化を計算
                stock.calculate_price_change()
                
                session.add(stock)
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Stock {stock_code} created successfully")
                return stock
                
        except IntegrityError as e:
            logger.error(f"Integrity error creating stock {stock_code}: {e}")
            raise DuplicateStockError(f"Stock {stock_code} already exists") from e
        except SQLAlchemyError as e:
            logger.error(f"Database error creating stock {stock_code}: {e}")
            raise StorageError(f"Failed to create stock {stock_code}") from e
    
    def get_stock(self, stock_code: str) -> Stock:
        """Get stock by code.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            Stock instance
            
        Raises:
            StockNotFoundError: If stock is not found
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                if not stock:
                    raise StockNotFoundError(f"Stock {stock_code} not found")
                
                return stock
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting stock {stock_code}: {e}")
            raise StorageError(f"Failed to get stock {stock_code}") from e
    
    def update_stock(
        self,
        stock_code: str,
        current_price: Optional[Decimal] = None,
        previous_close: Optional[Decimal] = None,
        volume: Optional[int] = None,
        market_cap: Optional[Decimal] = None,
        company_name: Optional[str] = None
    ) -> Stock:
        """Update existing stock record.
        
        Args:
            stock_code: 4-digit stock code
            current_price: New current price (optional)
            previous_close: New previous close price (optional)
            volume: New volume (optional)
            market_cap: New market cap (optional)
            company_name: New company name (optional)
            
        Returns:
            Updated Stock instance
            
        Raises:
            StockNotFoundError: If stock is not found
            StorageError: If update fails
        """
        try:
            with self._get_session_context() as session:
                stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                if not stock:
                    raise StockNotFoundError(f"Stock {stock_code} not found")
                
                # 更新
                if current_price is not None:
                    stock.current_price = current_price
                if previous_close is not None:
                    stock.previous_close = previous_close
                if volume is not None:
                    stock.volume = volume
                if market_cap is not None:
                    stock.market_cap = market_cap
                if company_name is not None:
                    stock.company_name = company_name
                
                # 価格変化を再計算
                stock.calculate_price_change()
                stock.updated_at = datetime.utcnow()
                
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Stock {stock_code} updated successfully")
                return stock
                
        except SQLAlchemyError as e:
            logger.error(f"Database error updating stock {stock_code}: {e}")
            raise StorageError(f"Failed to update stock {stock_code}") from e
    
    def delete_stock(self, stock_code: str) -> bool:
        """Delete stock record.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            True if deleted, False if not found
            
        Raises:
            StorageError: If deletion fails
        """
        try:
            with self._get_session_context() as session:
                stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                if not stock:
                    logger.warning(f"Stock {stock_code} not found for deletion")
                    return False
                
                session.delete(stock)
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Stock {stock_code} deleted successfully")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Database error deleting stock {stock_code}: {e}")
            raise StorageError(f"Failed to delete stock {stock_code}") from e
    
    def get_all_stocks(self, limit: Optional[int] = None) -> List[Stock]:
        """Get all stocks.
        
        Args:
            limit: Maximum number of stocks to return (optional)
            
        Returns:
            List of Stock instances
            
        Raises:
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                query = session.query(Stock).order_by(Stock.stock_code)
                if limit:
                    query = query.limit(limit)
                
                stocks = query.all()
                logger.info(f"Retrieved {len(stocks)} stocks")
                return stocks
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting all stocks: {e}")
            raise StorageError("Failed to get all stocks") from e
    
    def search_stocks(
        self,
        search_term: str,
        search_fields: Optional[List[str]] = None
    ) -> List[Stock]:
        """Search stocks by company name or stock code.
        
        Args:
            search_term: Search term
            search_fields: Fields to search in (default: ['company_name', 'stock_code'])
            
        Returns:
            List of matching Stock instances
            
        Raises:
            StorageError: If search fails
        """
        if search_fields is None:
            search_fields = ['company_name', 'stock_code']
        
        try:
            with self._get_session_context() as session:
                conditions = []
                
                if 'company_name' in search_fields:
                    conditions.append(Stock.company_name.ilike(f'%{search_term}%'))
                if 'stock_code' in search_fields:
                    conditions.append(Stock.stock_code.like(f'%{search_term}%'))
                
                if not conditions:
                    return []
                
                stocks = session.query(Stock).filter(or_(*conditions)).order_by(Stock.stock_code).all()
                logger.info(f"Found {len(stocks)} stocks matching '{search_term}'")
                return stocks
                
        except SQLAlchemyError as e:
            logger.error(f"Database error searching stocks: {e}")
            raise StorageError("Failed to search stocks") from e
    
    # Watchlist CRUD operations
    def create_watchlist_item(
        self,
        stock_code: str,
        notes: Optional[str] = None,
        alert_price_high: Optional[Decimal] = None,
        alert_price_low: Optional[Decimal] = None
    ) -> Watchlist:
        """Add stock to watchlist.
        
        Args:
            stock_code: 4-digit stock code
            notes: Optional notes
            alert_price_high: High price alert threshold
            alert_price_low: Low price alert threshold
            
        Returns:
            Created Watchlist instance
            
        Raises:
            StockNotFoundError: If stock doesn't exist
            StorageError: If creation fails
        """
        try:
            with self._get_session_context() as session:
                # 株式の存在確認
                stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                if not stock:
                    raise StockNotFoundError(f"Stock {stock_code} not found")
                
                watchlist_item = Watchlist(
                    stock_code=stock_code,
                    notes=notes,
                    alert_price_high=alert_price_high,
                    alert_price_low=alert_price_low
                )
                
                # アラート価格の関係性を検証
                watchlist_item.validate_alert_price_relationship()
                
                session.add(watchlist_item)
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Watchlist item created for stock {stock_code}")
                return watchlist_item
                
        except ValueError as e:
            logger.error(f"Validation error creating watchlist item: {e}")
            raise StorageError(str(e)) from e
        except SQLAlchemyError as e:
            logger.error(f"Database error creating watchlist item: {e}")
            raise StorageError("Failed to create watchlist item") from e
    
    def get_watchlist(self, active_only: bool = True) -> List[Watchlist]:
        """Get watchlist items.
        
        Args:
            active_only: If True, only return active items
            
        Returns:
            List of Watchlist instances with related stock data
            
        Raises:
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                query = session.query(Watchlist).options(joinedload(Watchlist.stock))
                
                if active_only:
                    query = query.filter(Watchlist.is_active == True)
                
                watchlist_items = query.order_by(desc(Watchlist.added_at)).all()
                logger.info(f"Retrieved {len(watchlist_items)} watchlist items")
                return watchlist_items
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting watchlist: {e}")
            raise StorageError("Failed to get watchlist") from e
    
    def get_watchlist_item(self, item_id: int) -> Watchlist:
        """Get watchlist item by ID.
        
        Args:
            item_id: Watchlist item ID
            
        Returns:
            Watchlist instance
            
        Raises:
            WatchlistItemNotFoundError: If item is not found
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                item = session.query(Watchlist).options(joinedload(Watchlist.stock)).filter_by(id=item_id).first()
                if not item:
                    raise WatchlistItemNotFoundError(f"Watchlist item {item_id} not found")
                
                return item
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting watchlist item {item_id}: {e}")
            raise StorageError(f"Failed to get watchlist item {item_id}") from e
    
    def update_watchlist_item(
        self,
        item_id: int,
        notes: Optional[str] = None,
        alert_price_high: Optional[Decimal] = None,
        alert_price_low: Optional[Decimal] = None,
        is_active: Optional[bool] = None
    ) -> Watchlist:
        """Update watchlist item.
        
        Args:
            item_id: Watchlist item ID
            notes: New notes (optional)
            alert_price_high: New high alert price (optional)
            alert_price_low: New low alert price (optional)
            is_active: New active status (optional)
            
        Returns:
            Updated Watchlist instance
            
        Raises:
            WatchlistItemNotFoundError: If item is not found
            StorageError: If update fails
        """
        try:
            with self._get_session_context() as session:
                item = session.query(Watchlist).filter_by(id=item_id).first()
                if not item:
                    raise WatchlistItemNotFoundError(f"Watchlist item {item_id} not found")
                
                # 更新
                if notes is not None:
                    item.notes = notes
                if alert_price_high is not None:
                    item.alert_price_high = alert_price_high
                if alert_price_low is not None:
                    item.alert_price_low = alert_price_low
                if is_active is not None:
                    item.is_active = is_active
                
                # アラート価格の関係性を検証
                item.validate_alert_price_relationship()
                
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Watchlist item {item_id} updated successfully")
                return item
                
        except ValueError as e:
            logger.error(f"Validation error updating watchlist item: {e}")
            raise StorageError(str(e)) from e
        except SQLAlchemyError as e:
            logger.error(f"Database error updating watchlist item {item_id}: {e}")
            raise StorageError(f"Failed to update watchlist item {item_id}") from e
    
    def remove_from_watchlist(self, item_id: int) -> bool:
        """Remove item from watchlist.
        
        Args:
            item_id: Watchlist item ID
            
        Returns:
            True if removed, False if not found
            
        Raises:
            StorageError: If removal fails
        """
        try:
            with self._get_session_context() as session:
                item = session.query(Watchlist).filter_by(id=item_id).first()
                if not item:
                    logger.warning(f"Watchlist item {item_id} not found for removal")
                    return False
                
                session.delete(item)
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Watchlist item {item_id} removed successfully")
                return True
                
        except SQLAlchemyError as e:
            logger.error(f"Database error removing watchlist item {item_id}: {e}")
            raise StorageError(f"Failed to remove watchlist item {item_id}") from e
    
    # Price History CRUD operations
    def add_price_history(
        self,
        stock_code: str,
        date: date,
        open_price: Decimal,
        high_price: Decimal,
        low_price: Decimal,
        close_price: Decimal,
        volume: int,
        adj_close: Optional[Decimal] = None
    ) -> PriceHistory:
        """Add price history record.
        
        Args:
            stock_code: 4-digit stock code
            date: Trading date
            open_price: Opening price
            high_price: High price
            low_price: Low price
            close_price: Closing price
            volume: Trading volume
            adj_close: Adjusted closing price (optional)
            
        Returns:
            Created PriceHistory instance
            
        Raises:
            StockNotFoundError: If stock doesn't exist
            StorageError: If creation fails
        """
        try:
            with self._get_session_context() as session:
                # 株式の存在確認
                stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                if not stock:
                    raise StockNotFoundError(f"Stock {stock_code} not found")
                
                price_history = PriceHistory(
                    stock_code=stock_code,
                    date=date,
                    open_price=open_price,
                    high_price=high_price,
                    low_price=low_price,
                    close_price=close_price,
                    volume=volume,
                    adj_close=adj_close
                )
                
                # OHLC価格の関係性を検証
                price_history.validate_ohlc_relationships()
                
                session.add(price_history)
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Price history added for stock {stock_code} on {date}")
                return price_history
                
        except ValueError as e:
            logger.error(f"Validation error adding price history: {e}")
            raise StorageError(str(e)) from e
        except IntegrityError as e:
            logger.error(f"Integrity error adding price history: {e}")
            raise StorageError(f"Price history for {stock_code} on {date} already exists") from e
        except SQLAlchemyError as e:
            logger.error(f"Database error adding price history: {e}")
            raise StorageError("Failed to add price history") from e
    
    def get_price_history(
        self,
        stock_code: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: Optional[int] = None
    ) -> List[PriceHistory]:
        """Get price history for a stock.
        
        Args:
            stock_code: 4-digit stock code
            start_date: Start date (optional)
            end_date: End date (optional)
            limit: Maximum number of records to return (optional)
            
        Returns:
            List of PriceHistory instances ordered by date (newest first)
            
        Raises:
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                query = session.query(PriceHistory).filter_by(stock_code=stock_code)
                
                if start_date:
                    query = query.filter(PriceHistory.date >= start_date)
                if end_date:
                    query = query.filter(PriceHistory.date <= end_date)
                
                query = query.order_by(desc(PriceHistory.date))
                
                if limit:
                    query = query.limit(limit)
                
                price_history = query.all()
                logger.info(f"Retrieved {len(price_history)} price history records for stock {stock_code}")
                return price_history
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting price history for {stock_code}: {e}")
            raise StorageError(f"Failed to get price history for {stock_code}") from e
    
    def get_latest_price_history(self, stock_code: str) -> Optional[PriceHistory]:
        """Get the latest price history record for a stock.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            Latest PriceHistory instance or None if not found
            
        Raises:
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                latest = (session.query(PriceHistory)
                         .filter_by(stock_code=stock_code)
                         .order_by(desc(PriceHistory.date))
                         .first())
                
                return latest
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting latest price history for {stock_code}: {e}")
            raise StorageError(f"Failed to get latest price history for {stock_code}") from e
    
    # Bulk operations
    def bulk_update_stocks(self, stock_updates: List[Dict[str, Any]]) -> int:
        """Bulk update multiple stocks.
        
        Args:
            stock_updates: List of dictionaries with stock update data
            Each dict should contain 'stock_code' and update fields
            
        Returns:
            Number of stocks updated
            
        Raises:
            StorageError: If bulk update fails
        """
        updated_count = 0
        
        try:
            with self._get_session_context() as session:
                for update_data in stock_updates:
                    stock_code = update_data.pop('stock_code')
                    stock = session.query(Stock).filter_by(stock_code=stock_code).first()
                    
                    if stock:
                        for field, value in update_data.items():
                            if hasattr(stock, field):
                                setattr(stock, field, value)
                        
                        stock.calculate_price_change()
                        stock.updated_at = datetime.utcnow()
                        updated_count += 1
                
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Bulk updated {updated_count} stocks")
                return updated_count
                
        except SQLAlchemyError as e:
            logger.error(f"Database error in bulk update: {e}")
            raise StorageError("Failed to perform bulk update") from e
    
    def bulk_add_price_history(self, price_data: List[Dict[str, Any]]) -> int:
        """Bulk add price history records.
        
        Args:
            price_data: List of dictionaries with price history data
            
        Returns:
            Number of records added
            
        Raises:
            StorageError: If bulk add fails
        """
        added_count = 0
        
        try:
            with self._get_session_context() as session:
                for data in price_data:
                    try:
                        price_history = PriceHistory(**data)
                        price_history.validate_ohlc_relationships()
                        session.add(price_history)
                        added_count += 1
                    except (ValueError, IntegrityError) as e:
                        logger.warning(f"Skipping invalid price history record: {e}")
                        continue
                
                if not self._session:  # 外部セッションでない場合のみコミット
                    session.commit()
                
                logger.info(f"Bulk added {added_count} price history records")
                return added_count
                
        except SQLAlchemyError as e:
            logger.error(f"Database error in bulk price history add: {e}")
            raise StorageError("Failed to perform bulk price history add") from e
    
    # Utility methods
    def get_stock_count(self) -> int:
        """Get total number of stocks in database.
        
        Returns:
            Number of stocks
            
        Raises:
            StorageError: If count fails
        """
        try:
            with self._get_session_context() as session:
                count = session.query(Stock).count()
                return count
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting stock count: {e}")
            raise StorageError("Failed to get stock count") from e
    
    def get_watchlist_alerts(self) -> List[Watchlist]:
        """Get watchlist items that have price alerts configured.
        
        Returns:
            List of Watchlist instances with alerts
            
        Raises:
            StorageError: If retrieval fails
        """
        try:
            with self._get_session_context() as session:
                alerts = (session.query(Watchlist)
                         .options(joinedload(Watchlist.stock))
                         .filter(Watchlist.is_active == True)
                         .filter(or_(
                             Watchlist.alert_price_high.is_not(None),
                             Watchlist.alert_price_low.is_not(None)
                         ))
                         .all())
                
                return alerts
                
        except SQLAlchemyError as e:
            logger.error(f"Database error getting watchlist alerts: {e}")
            raise StorageError("Failed to get watchlist alerts") from e