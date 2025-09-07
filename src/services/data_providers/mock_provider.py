"""
Mock data provider for testing and development.
"""

import asyncio
import random
import hashlib
import time
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict, Any

from .base_provider import BaseDataProvider, DataProviderError
from ...stock_api.data_models import StockData, CurrentPrice, PriceHistoryData, PriceHistoryItem


class MockDataProvider(BaseDataProvider):
    """
    Mock data provider that generates realistic test data.
    
    Provides deterministic mock data based on stock codes for consistent testing.
    """
    
    def __init__(self, **config):
        super().__init__("mock", **config)
        self._known_stocks = {
            '7203': {'name': 'Toyota Motor Corp', 'base_price': 2800},
            '6758': {'name': 'Sony Group Corp', 'base_price': 12500},
            '9984': {'name': 'SoftBank Group Corp', 'base_price': 8200},
            '7974': {'name': 'Nintendo Co Ltd', 'base_price': 24000},
            '6503': {'name': 'Mitsubishi Electric Corp', 'base_price': 1650},
            '8001': {'name': 'Itochu Corp', 'base_price': 4800},
        }
    
    async def get_stock_info(self, stock_code: str) -> StockData:
        """Generate deterministic mock stock data based on stock code."""
        self._record_request(True)
        
        # Simulate some delay
        await asyncio.sleep(0.1)
        
        # Use stock code as seed for consistent data generation
        seed = int(hashlib.md5(stock_code.encode()).hexdigest()[:8], 16)
        random.seed(seed)
        
        # Get known stock info or generate default
        stock_info = self._known_stocks.get(stock_code, {
            'name': f'Mock Company {stock_code}',
            'base_price': 2500
        })
        
        base_price = Decimal(str(stock_info['base_price']))
        # Add small variation
        current_price = base_price + Decimal(str(random.uniform(-100, 100)))
        previous_close = base_price + Decimal(str(random.uniform(-50, 50)))
        price_change = current_price - previous_close
        price_change_pct = (price_change / previous_close) * 100 if previous_close > 0 else Decimal('0')
        
        # Reset random seed to avoid affecting other operations
        random.seed(int(time.time()))
        
        return StockData(
            stock_code=stock_code,
            company_name=stock_info['name'],
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
    
    async def get_current_price(self, stock_code: str) -> CurrentPrice:
        """Generate mock current price data."""
        self._record_request(True)
        
        # Simulate some delay
        await asyncio.sleep(0.05)
        
        stock_data = await self.get_stock_info(stock_code)
        return stock_data.to_current_price()
    
    async def get_price_history(self, stock_code: str, days: int = 30) -> PriceHistoryData:
        """Generate mock price history data."""
        self._record_request(True)
        
        # Simulate some delay
        await asyncio.sleep(0.2)
        
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
        def _to_dt(v):
            if isinstance(v, datetime):
                return v
            if isinstance(v, date):
                return datetime(v.year, v.month, v.day)
            return datetime.strptime(v, "%Y-%m-%d")

        history_items.sort(key=lambda x: _to_dt(x.date), reverse=True)

        return PriceHistoryData(
            stock_code=stock_code,
            history=history_items,
            start_date=min(_to_dt(item.date).date() for item in history_items),
            end_date=max(_to_dt(item.date).date() for item in history_items)
        )
    
    async def is_available(self) -> bool:
        """Mock provider is always available."""
        return True
    
    async def close(self) -> None:
        """No resources to close for mock provider."""
        pass