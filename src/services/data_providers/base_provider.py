"""
Base data provider interface and common functionality.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from ...stock_api.data_models import StockData, CurrentPrice, PriceHistoryData


class DataProviderError(Exception):
    """Base exception for data provider errors."""
    pass


class DataNotFoundError(DataProviderError):
    """Exception raised when requested data is not found."""
    pass


class BaseDataProvider(ABC):
    """
    Abstract base class for stock data providers.
    
    Defines the interface that all data providers must implement.
    """
    
    def __init__(self, name: str, **config):
        self.name = name
        self.config = config
        self._metrics = {
            'requests_total': 0,
            'requests_successful': 0,
            'requests_failed': 0,
            'cache_hits': 0,
            'cache_misses': 0
        }
    
    @abstractmethod
    async def get_stock_info(self, stock_code: str) -> StockData:
        """
        Get comprehensive stock information.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            StockData: Complete stock information
            
        Raises:
            DataNotFoundError: If stock is not found
            DataProviderError: If data retrieval fails
        """
        pass
    
    @abstractmethod
    async def get_current_price(self, stock_code: str) -> CurrentPrice:
        """
        Get current stock price information.
        
        Args:
            stock_code: 4-digit stock code
            
        Returns:
            CurrentPrice: Current price and change information
            
        Raises:
            DataNotFoundError: If stock is not found
            DataProviderError: If data retrieval fails
        """
        pass
    
    @abstractmethod
    async def get_price_history(self, stock_code: str, days: int = 30) -> PriceHistoryData:
        """
        Get historical price data.
        
        Args:
            stock_code: 4-digit stock code
            days: Number of days of history to retrieve
            
        Returns:
            PriceHistoryData: Historical price information
            
        Raises:
            DataNotFoundError: If stock is not found
            DataProviderError: If data retrieval fails
        """
        pass
    
    @abstractmethod
    async def is_available(self) -> bool:
        """
        Check if the data provider is available and can serve requests.
        
        Returns:
            bool: True if provider is available, False otherwise
        """
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """
        Close the data provider and cleanup resources.
        """
        pass
    
    def get_metrics(self) -> Dict[str, Any]:
        """
        Get provider metrics and statistics.
        
        Returns:
            Dict containing metrics data
        """
        success_rate = 0.0
        if self._metrics['requests_total'] > 0:
            success_rate = self._metrics['requests_successful'] / self._metrics['requests_total']
            
        cache_hit_rate = 0.0
        cache_total = self._metrics['cache_hits'] + self._metrics['cache_misses']
        if cache_total > 0:
            cache_hit_rate = self._metrics['cache_hits'] / cache_total
        
        return {
            'provider_name': self.name,
            'requests_total': self._metrics['requests_total'],
            'requests_successful': self._metrics['requests_successful'],
            'requests_failed': self._metrics['requests_failed'],
            'success_rate': round(success_rate * 100, 2),
            'cache_hits': self._metrics['cache_hits'],
            'cache_misses': self._metrics['cache_misses'],
            'cache_hit_rate': round(cache_hit_rate * 100, 2)
        }
    
    def _record_request(self, success: bool = True) -> None:
        """Record a request for metrics."""
        self._metrics['requests_total'] += 1
        if success:
            self._metrics['requests_successful'] += 1
        else:
            self._metrics['requests_failed'] += 1
    
    def _record_cache_hit(self) -> None:
        """Record a cache hit for metrics."""
        self._metrics['cache_hits'] += 1
    
    def _record_cache_miss(self) -> None:
        """Record a cache miss for metrics."""
        self._metrics['cache_misses'] += 1