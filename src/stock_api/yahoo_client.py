"""
Yahoo Finance API client for stock data retrieval.

This module provides an async client for fetching stock information and historical
price data from Yahoo Finance with rate limiting and comprehensive error handling.
"""
import asyncio
import logging
import time
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any, Union

import aiohttp
import yfinance as yf
from aiohttp import ClientSession, ClientTimeout, ClientError
from asyncio import Semaphore

from .data_models import (
    StockData, CurrentPrice, PriceHistoryData, PriceHistoryItem,
    APIResponse, BulkStockInfoResponse, StockInfoRequest, PriceHistoryRequest
)
from ..utils.cache import (
    cache_stock_data,
    cache_price_history,
    cache_current_price,
    configure_cache_ttls_from_settings,
)

logger = logging.getLogger(__name__)


class YahooFinanceError(Exception):
    """Base exception for Yahoo Finance API operations."""
    pass


class StockNotFoundError(YahooFinanceError):
    """Exception raised when stock is not found."""
    pass


class RateLimitError(YahooFinanceError):
    """Exception raised when rate limit is exceeded."""
    pass


class DataValidationError(YahooFinanceError):
    """Exception raised when received data is invalid."""
    pass


class RateLimiter:
    """Rate limiter for API requests."""
    
    def __init__(self, max_requests: int = 10, time_window: int = 60):
        """Initialize rate limiter.
        
        Args:
            max_requests: Maximum number of requests per time window
            time_window: Time window in seconds
        """
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []
        self._lock = asyncio.Lock()
    
    async def acquire(self) -> None:
        """Acquire rate limit permission."""
        async with self._lock:
            now = time.time()
            
            # 古いリクエストを削除
            self.requests = [req_time for req_time in self.requests 
                           if now - req_time < self.time_window]
            
            # レート制限チェック
            if len(self.requests) >= self.max_requests:
                sleep_time = self.time_window - (now - self.requests[0]) + 1
                logger.warning(f"Rate limit reached, sleeping for {sleep_time:.2f} seconds")
                raise RateLimitError(f"Rate limit exceeded, wait {sleep_time:.2f} seconds")
            
            self.requests.append(now)


class YahooFinanceClient:
    """Yahoo Finance API client with async support and rate limiting."""
    
    def __init__(
        self,
        max_requests: int = 10,
        time_window: int = 60,
        max_concurrent: int = 5,
        timeout: int = 30,
        retry_attempts: int = 3,
        retry_delay: float = 1.0
    ):
        """Initialize Yahoo Finance client.
        
        Args:
            max_requests: Maximum requests per time window
            time_window: Time window for rate limiting in seconds
            max_concurrent: Maximum concurrent requests
            timeout: Request timeout in seconds
            retry_attempts: Number of retry attempts for failed requests
            retry_delay: Delay between retry attempts in seconds
        """
        self.rate_limiter = RateLimiter(max_requests, time_window)
        self.semaphore = Semaphore(max_concurrent)
        self.timeout = ClientTimeout(total=timeout)
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self._session: Optional[ClientSession] = None
        # Sync cache TTLs with settings (non-fatal if unavailable)
        try:
            configure_cache_ttls_from_settings()
        except Exception:
            pass
    
    async def __aenter__(self):
        """Async context manager entry."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def _get_session(self) -> ClientSession:
        """Get or create HTTP session."""
        if self._session is None or self._session.closed:
            self._session = ClientSession(timeout=self.timeout)
        return self._session
    
    async def close(self) -> None:
        """Close HTTP session and cleanup resources."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None
    
    def _format_stock_code_for_yahoo(self, stock_code: str) -> str:
        """Format Japanese stock code for Yahoo Finance API.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            Formatted stock symbol for Yahoo Finance (e.g., "1234.T")
        """
        return f"{stock_code}.T"
    
    async def _make_request_with_retry(
        self,
        url: str,
        params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic.
        
        Args:
            url: Request URL
            params: Query parameters
            
        Returns:
            JSON response data
            
        Raises:
            YahooFinanceError: If request fails after all retries
        """
        session = await self._get_session()
        
        for attempt in range(self.retry_attempts + 1):
            try:
                await self.rate_limiter.acquire()
                
                async with self.semaphore:
                    async with session.get(url, params=params) as response:
                        if response.status == 200:
                            data = await response.json()
                            return data
                        elif response.status == 429:  # Too Many Requests
                            raise RateLimitError("Rate limit exceeded by server")
                        elif response.status == 404:
                            raise StockNotFoundError("Stock not found")
                        else:
                            response.raise_for_status()
                            
            except (ClientError, asyncio.TimeoutError) as e:
                if attempt < self.retry_attempts:
                    delay = self.retry_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"Request failed (attempt {attempt + 1}), retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Request failed after {self.retry_attempts + 1} attempts: {e}")
                    raise YahooFinanceError(f"Request failed: {e}") from e
            except RateLimitError:
                if attempt < self.retry_attempts:
                    # レート制限の場合は少し長めに待機
                    await asyncio.sleep(self.retry_delay * 2)
                else:
                    raise
    
    def _get_yfinance_ticker(self, stock_code: str) -> yf.Ticker:
        """Get yfinance Ticker object for stock code.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            yfinance Ticker object
        """
        symbol = self._format_stock_code_for_yahoo(stock_code)
        return yf.Ticker(symbol)
    
    def _extract_stock_info(self, ticker_info: Dict[str, Any], stock_code: str) -> StockData:
        """Extract stock information from yfinance ticker info.
        
        Args:
            ticker_info: Raw ticker information from yfinance
            stock_code: 4-digit stock code
            
        Returns:
            StockData instance
            
        Raises:
            DataValidationError: If required data is missing or invalid
        """
        try:
            # 必須フィールドの取得
            current_price = ticker_info.get('currentPrice') or ticker_info.get('regularMarketPrice')
            previous_close = ticker_info.get('previousClose') or ticker_info.get('regularMarketPreviousClose')
            company_name = ticker_info.get('longName') or ticker_info.get('shortName')
            volume = ticker_info.get('volume') or ticker_info.get('regularMarketVolume', 0)
            
            if current_price is None or previous_close is None:
                raise DataValidationError(f"Missing price data for stock {stock_code}")
            
            if not company_name:
                company_name = f"Stock {stock_code}"  # フォールバック
            
            # 価格変化の計算
            price_change = Decimal(str(current_price)) - Decimal(str(previous_close))
            if previous_close != 0:
                price_change_pct = (price_change / Decimal(str(previous_close))) * 100
            else:
                price_change_pct = Decimal('0.00')
            
            # オプションフィールドの取得
            market_cap = ticker_info.get('marketCap')
            day_high = ticker_info.get('dayHigh') or ticker_info.get('regularMarketDayHigh')
            day_low = ticker_info.get('dayLow') or ticker_info.get('regularMarketDayLow')
            year_high = ticker_info.get('fiftyTwoWeekHigh')
            year_low = ticker_info.get('fiftyTwoWeekLow')
            avg_volume = ticker_info.get('averageVolume')
            pe_ratio = ticker_info.get('trailingPE') or ticker_info.get('forwardPE')
            dividend_yield = ticker_info.get('dividendYield')
            
            return StockData(
                stock_code=stock_code,
                company_name=company_name,
                current_price=Decimal(str(current_price)),
                previous_close=Decimal(str(previous_close)),
                price_change=price_change,
                price_change_pct=price_change_pct,
                volume=int(volume),
                market_cap=Decimal(str(market_cap)) if market_cap else None,
                day_high=Decimal(str(day_high)) if day_high else None,
                day_low=Decimal(str(day_low)) if day_low else None,
                year_high=Decimal(str(year_high)) if year_high else None,
                year_low=Decimal(str(year_low)) if year_low else None,
                avg_volume=int(avg_volume) if avg_volume else None,
                pe_ratio=Decimal(str(pe_ratio)) if pe_ratio else None,
                dividend_yield=Decimal(str(dividend_yield * 100)) if dividend_yield else None,
                last_updated=datetime.utcnow(),
                market_time=ticker_info.get('regularMarketTime')
            )
            
        except (ValueError, TypeError, KeyError) as e:
            logger.error(f"Error extracting stock info for {stock_code}: {e}")
            raise DataValidationError(f"Invalid data format for stock {stock_code}") from e
    
    def _extract_price_history(
        self,
        history_data: Any,
        stock_code: str,
        days: int
    ) -> PriceHistoryData:
        """Extract price history from yfinance history data.
        
        Args:
            history_data: Raw history data from yfinance
            stock_code: 4-digit stock code
            days: Number of days requested
            
        Returns:
            PriceHistoryData instance
            
        Raises:
            DataValidationError: If data is invalid
        """
        try:
            if history_data.empty:
                logger.warning(f"No price history data found for stock {stock_code}")
                return PriceHistoryData(
                    stock_code=stock_code,
                    history=[],
                    start_date=None,
                    end_date=None
                )
            
            history_items = []
            
            for date_index, row in history_data.iterrows():
                try:
                    # DatetimeIndexからdateに変換
                    trade_date = date_index.date() if hasattr(date_index, 'date') else date_index
                    
                    # Check for NaN values before creating item
                    if pd.isna(row['Open']) or pd.isna(row['High']) or pd.isna(row['Low']) or pd.isna(row['Close']):
                        logger.debug(f"Skipping row with NaN values for {stock_code} on {date_index}")
                        continue
                        
                    price_item = PriceHistoryItem(
                        stock_code=stock_code,
                        date=datetime.combine(trade_date, datetime.min.time()) if isinstance(trade_date, date) else trade_date,
                        open=Decimal(str(row['Open'])),
                        high=Decimal(str(row['High'])),
                        low=Decimal(str(row['Low'])),
                        close=Decimal(str(row['Close'])),
                        volume=int(row['Volume']) if not pd.isna(row['Volume']) else 0
                    )
                    history_items.append(price_item)
                    
                except (ValueError, TypeError) as e:
                    logger.warning(f"Skipping invalid price data for {stock_code} on {date_index}: {e}")
                    logger.debug(f"Row data: {dict(row)}")
                    continue
            
            if not history_items:
                raise DataValidationError(f"No valid price history data for stock {stock_code}")
            
            # 日付範囲の計算  
            dates = [item.date.date() if isinstance(item.date, datetime) else item.date for item in history_items]
            start_date = min(dates)
            end_date = max(dates)
            
            return PriceHistoryData(
                stock_code=stock_code,
                history=history_items,
                start_date=start_date,
                end_date=end_date
            )
            
        except Exception as e:
            logger.error(f"Error extracting price history for {stock_code}: {e}")
            raise DataValidationError(f"Failed to extract price history for stock {stock_code}") from e
    
    @cache_stock_data(cache_key_func=lambda self, stock_code: f"stock_info:{stock_code}")
    async def _async_get_stock_info(self, stock_code: str) -> StockData:
        """Get current stock information.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            StockData instance with current stock information
            
        Raises:
            StockNotFoundError: If stock is not found
            YahooFinanceError: If data retrieval fails
        """
        try:
            # yfinanceは同期APIなので、executor で実行
            ticker = self._get_yfinance_ticker(stock_code)
            
            # 非同期でyfinanceを実行
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, lambda: ticker.info)
            
            if not info or 'currentPrice' not in info and 'regularMarketPrice' not in info:
                raise StockNotFoundError(f"Stock {stock_code} not found or no price data available")
            
            stock_data = self._extract_stock_info(info, stock_code)
            logger.info(f"Successfully retrieved stock info for {stock_code}")
            return stock_data
            
        except StockNotFoundError:
            raise
        except DataValidationError:
            raise
        except Exception as e:
            logger.error(f"Error getting stock info for {stock_code}: {e}")
            raise YahooFinanceError(f"Failed to get stock info for {stock_code}") from e
    
    @cache_price_history(cache_key_func=lambda self, stock_code, days=30: f"price_history:{stock_code}:{days}")
    async def _async_get_price_history(self, stock_code: str, days: int = 30) -> PriceHistoryData:
        """Get historical price data for a stock.
        
        Args:
            stock_code: 4-digit stock code
            days: Number of days of history to retrieve (default: 30)
            
        Returns:
            PriceHistoryData instance with historical prices
            
        Raises:
            StockNotFoundError: If stock is not found
            YahooFinanceError: If data retrieval fails
        """
        try:
            ticker = self._get_yfinance_ticker(stock_code)
            
            # 期間を計算
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # yfinanceで履歴データを取得
            loop = asyncio.get_event_loop()
            history = await loop.run_in_executor(
                None,
                lambda: ticker.history(start=start_date, end=end_date)
            )
            
            price_history_data = self._extract_price_history(history, stock_code, days)
            logger.info(f"Successfully retrieved {len(price_history_data.history)} price history records for {stock_code}")
            return price_history_data
            
        except DataValidationError:
            raise
        except Exception as e:
            logger.error(f"Error getting price history for {stock_code}: {e}")
            raise YahooFinanceError(f"Failed to get price history for {stock_code}") from e
    
    async def get_multiple_stock_info(self, stock_codes: List[str]) -> BulkStockInfoResponse:
        """Get stock information for multiple stocks.
        
        Args:
            stock_codes: List of 4-digit stock codes
            
        Returns:
            BulkStockInfoResponse with results for all requested stocks
        """
        results = []
        
        # 並行処理でストック情報を取得
        async def get_single_stock(code: str) -> APIResponse:
            try:
                stock_data = await self.get_stock_info(code)
                return APIResponse(success=True, data=stock_data)
            except Exception as e:
                logger.warning(f"Failed to get stock info for {code}: {e}")
                return APIResponse(success=False, error=str(e))
        
        # 並行処理タスクを作成
        tasks = [get_single_stock(code) for code in stock_codes]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 例外を処理
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(
                    APIResponse(success=False, error=f"Unexpected error: {str(result)}")
                )
            else:
                processed_results.append(result)
        
        successful_count = sum(1 for result in processed_results if result.success)
        
        return BulkStockInfoResponse(
            success=successful_count > 0,
            results=processed_results,
            total_requested=len(stock_codes),
            total_successful=successful_count
        )
    
    @cache_current_price(cache_key_func=lambda self, stock_code: f"current_price:{stock_code}")
    async def _async_get_current_price(self, stock_code: str) -> CurrentPrice:
        """Get current price information for a stock.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            CurrentPrice instance
            
        Raises:
            StockNotFoundError: If stock is not found
            YahooFinanceError: If data retrieval fails
        """
        stock_data = await self._async_get_stock_info(stock_code)
        return stock_data.to_current_price()

    # Dual-mode public wrappers: sync call returns value; async context returns awaitable
    def get_stock_info(self, stock_code: str) -> StockData:
        try:
            # In async context, return awaitable
            asyncio.get_running_loop()
            return self._async_get_stock_info(stock_code)  # type: ignore[return-value]
        except RuntimeError:
            # No running loop: execute synchronously
            return asyncio.run(self._async_get_stock_info(stock_code))

    def get_price_history(self, stock_code: str, days: int = 30) -> PriceHistoryData:
        try:
            asyncio.get_running_loop()
            return self._async_get_price_history(stock_code, days)  # type: ignore[return-value]
        except RuntimeError:
            return asyncio.run(self._async_get_price_history(stock_code, days))

    def get_current_price(self, stock_code: str) -> CurrentPrice:
        try:
            asyncio.get_running_loop()
            return self._async_get_current_price(stock_code)  # type: ignore[return-value]
        except RuntimeError:
            return asyncio.run(self._async_get_current_price(stock_code))
    
    def validate_stock_code(self, stock_code: str) -> bool:
        """Validate stock code format.
        
        Args:
            stock_code: Stock code to validate
            
        Returns:
            True if valid, False otherwise
        """
        import re
        return bool(re.match(r'^\d{4}$', stock_code))
    
    async def health_check(self) -> bool:
        """Check if Yahoo Finance API is accessible.
        
        Returns:
            True if API is healthy, False otherwise
        """
        try:
            # 有名な株式（トヨタ自動車: 7203）でテスト
            await self._async_get_current_price("7203")
            return True
        except Exception as e:
            logger.error(f"Yahoo Finance API health check failed: {e}")
            return False


# パンダがインポートされていない場合の処理
try:
    import pandas as pd
except ImportError:
    logger.warning("pandas not available, some functionality may be limited")
    
    class MockPandas:
        @staticmethod
        def isna(value):
            return value is None or (isinstance(value, float) and str(value).lower() == 'nan')
    
    pd = MockPandas()


# 便利な関数
async def get_stock_info(stock_code: str) -> APIResponse:
    """Convenience function to get stock information.
    
    Args:
        stock_code: 4-digit stock code
        
    Returns:
        APIResponse with stock information
    """
    async with YahooFinanceClient() as client:
        try:
            stock_data = await client.get_stock_info(stock_code)
            return APIResponse(success=True, data=stock_data)
        except Exception as e:
            return APIResponse(success=False, error=str(e))


async def get_price_history(stock_code: str, days: int = 30) -> APIResponse:
    """Convenience function to get price history.
    
    Args:
        stock_code: 4-digit stock code
        days: Number of days of history
        
    Returns:
        APIResponse with price history data
    """
    async with YahooFinanceClient() as client:
        try:
            price_data = await client.get_price_history(stock_code, days)
            return APIResponse(success=True, data=price_data)
        except Exception as e:
            return APIResponse(success=False, error=str(e))


async def get_multiple_stocks(stock_codes: List[str]) -> BulkStockInfoResponse:
    """Convenience function to get multiple stock information.
    
    Args:
        stock_codes: List of stock codes
        
    Returns:
        BulkStockInfoResponse with all results
    """
    async with YahooFinanceClient() as client:
        return await client.get_multiple_stock_info(stock_codes)
