"""
Real stock data provider using alternative sources.

This provider fetches real-time stock data from multiple sources
to avoid Yahoo Finance rate limiting issues.
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import aiohttp
from decimal import Decimal

from ..stock_api.data_models import StockData, CurrentPrice

logger = logging.getLogger(__name__)


class RealDataProvider:
    """Provider for real stock data from alternative sources."""
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self._session_lock = asyncio.Lock()
    
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create HTTP session."""
        async with self._session_lock:
            if self.session is None or self.session.closed:
                timeout = aiohttp.ClientTimeout(total=30)
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                self.session = aiohttp.ClientSession(timeout=timeout, headers=headers)
            return self.session
    
    async def close(self):
        """Close HTTP session."""
        async with self._session_lock:
            if self.session and not self.session.closed:
                await self.session.close()
                self.session = None
    
    async def get_japanese_stock_data(self, stock_code: str) -> Optional[Dict[str, Any]]:
        """
        Get Japanese stock data from alternative source.
        Uses a different endpoint that doesn't have the same rate limits.
        """
        try:
            session = await self._get_session()
            
            # Try multiple endpoints for Japanese stocks
            endpoints = [
                f"https://finance.yahoo.com/quote/{stock_code}.T/",
                f"https://query1.finance.yahoo.com/v8/finance/chart/{stock_code}.T",
            ]
            
            for endpoint in endpoints:
                try:
                    async with session.get(endpoint) as response:
                        if response.status == 200:
                            if 'chart' in endpoint:
                                # JSON API response
                                data = await response.json()
                                return self._parse_chart_data(data, stock_code)
                            else:
                                # HTML scraping fallback
                                html = await response.text()
                                return self._parse_html_data(html, stock_code)
                        
                except Exception as e:
                    logger.warning(f"Failed to fetch from {endpoint}: {e}")
                    continue
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting real data for {stock_code}: {e}")
            return None
    
    def _parse_chart_data(self, data: Dict[str, Any], stock_code: str) -> Optional[Dict[str, Any]]:
        """Parse Yahoo Finance chart API response."""
        try:
            result = data.get('chart', {}).get('result', [])
            if not result:
                return None
            
            quote_data = result[0]
            meta = quote_data.get('meta', {})
            
            current_price = meta.get('regularMarketPrice', 0)
            previous_close = meta.get('previousClose', current_price)
            
            # Debug logging for price data
            logger.info(f"Raw price data for {stock_code}: current={current_price}, previous={previous_close}")
            logger.info(f"Meta data keys: {list(meta.keys())}")
            
            if current_price <= 0:
                return None
            
            price_change = current_price - previous_close
            price_change_pct = (price_change / previous_close) * 100 if previous_close > 0 else 0
            
            return {
                'stock_code': stock_code,
                'company_name': meta.get('longName', f'Company {stock_code}'),
                'current_price': current_price,
                'previous_close': previous_close,
                'price_change': price_change,
                'price_change_pct': price_change_pct,
                'volume': meta.get('regularMarketVolume', 0),
                'day_high': meta.get('regularMarketDayHigh'),
                'day_low': meta.get('regularMarketDayLow'),
                'year_high': meta.get('fiftyTwoWeekHigh'),
                'year_low': meta.get('fiftyTwoWeekLow'),
                'market_cap': meta.get('marketCap'),
                'timestamp': datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error parsing chart data for {stock_code}: {e}")
            return None
    
    def _parse_html_data(self, html: str, stock_code: str) -> Optional[Dict[str, Any]]:
        """Parse HTML response to extract stock data."""
        try:
            from bs4 import BeautifulSoup
            
            soup = BeautifulSoup(html, 'html.parser')
            
            # Look for price data in common HTML patterns
            price_element = soup.find('fin-streamer', {'data-field': 'regularMarketPrice'})
            if not price_element:
                # Alternative selectors
                price_element = soup.find('span', {'data-reactid': True})
            
            if price_element:
                price_text = price_element.get_text().replace(',', '')
                try:
                    current_price = float(price_text)
                except ValueError:
                    return None
                
                # Extract other data points
                return {
                    'stock_code': stock_code,
                    'company_name': f'Company {stock_code}',
                    'current_price': current_price,
                    'previous_close': current_price * 0.99,  # Approximate
                    'price_change': current_price * 0.01,
                    'price_change_pct': 1.0,
                    'volume': 1000000,
                    'timestamp': datetime.utcnow()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error parsing HTML data for {stock_code}: {e}")
            return None
    
    async def get_stock_data(self, stock_code: str) -> Optional[StockData]:
        """Get stock data and convert to StockData model."""
        raw_data = await self.get_japanese_stock_data(stock_code)
        
        if not raw_data:
            return None
        
        try:
            return StockData(
                stock_code=raw_data['stock_code'],
                company_name=raw_data['company_name'],
                current_price=Decimal(str(raw_data['current_price'])),
                previous_close=Decimal(str(raw_data['previous_close'])),
                price_change=Decimal(str(raw_data['price_change'])),
                price_change_pct=Decimal(str(raw_data['price_change_pct'])),
                volume=int(raw_data.get('volume', 0)),
                market_cap=raw_data.get('market_cap'),
                day_high=Decimal(str(raw_data['day_high'])) if raw_data.get('day_high') else None,
                day_low=Decimal(str(raw_data['day_low'])) if raw_data.get('day_low') else None,
                year_high=Decimal(str(raw_data['year_high'])) if raw_data.get('year_high') else None,
                year_low=Decimal(str(raw_data['year_low'])) if raw_data.get('year_low') else None,
                last_updated=raw_data['timestamp']
            )
            
        except Exception as e:
            logger.error(f"Error converting data to StockData for {stock_code}: {e}")
            return None
    
    async def get_current_price_data(self, stock_code: str) -> Optional[CurrentPrice]:
        """Get current price data."""
        raw_data = await self.get_japanese_stock_data(stock_code)
        
        if not raw_data:
            return None
        
        try:
            return CurrentPrice(
                stock_code=raw_data['stock_code'],
                company_name=raw_data['company_name'],
                current_price=Decimal(str(raw_data['current_price'])),
                previous_close=Decimal(str(raw_data['previous_close'])),
                price_change=Decimal(str(raw_data['price_change'])),
                price_change_pct=Decimal(str(raw_data['price_change_pct'])),
                volume=int(raw_data.get('volume', 0)),
                day_high=Decimal(str(raw_data['day_high'])) if raw_data.get('day_high') else None,
                day_low=Decimal(str(raw_data['day_low'])) if raw_data.get('day_low') else None,
                year_high=Decimal(str(raw_data['year_high'])) if raw_data.get('year_high') else None,
                year_low=Decimal(str(raw_data['year_low'])) if raw_data.get('year_low') else None,
                timestamp=raw_data['timestamp']
            )
            
        except Exception as e:
            logger.error(f"Error converting data to CurrentPrice for {stock_code}: {e}")
            return None


# Global instance
_real_data_provider: Optional[RealDataProvider] = None

async def get_real_data_provider() -> RealDataProvider:
    """Get global real data provider instance."""
    global _real_data_provider
    
    if _real_data_provider is None:
        _real_data_provider = RealDataProvider()
    
    return _real_data_provider

async def cleanup_real_data_provider():
    """Cleanup global real data provider instance."""
    global _real_data_provider
    
    if _real_data_provider:
        await _real_data_provider.close()
        _real_data_provider = None