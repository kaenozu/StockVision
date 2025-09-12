"""
Real-time Data Streaming Service
Fetches and distributes live stock market data
"""

import asyncio
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Set

import yfinance as yf

from ..websocket.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


class DataType(Enum):
    """Types of real-time data"""

    PRICE = "price"
    VOLUME = "volume"
    NEWS = "news"
    TRADES = "trades"
    ORDERBOOK = "orderbook"
    TECHNICAL = "technical"


@dataclass
class StockPrice:
    """Real-time stock price data"""

    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: datetime
    market_cap: Optional[float] = None
    pe_ratio: Optional[float] = None


@dataclass
class TradeData:
    """Individual trade data"""

    symbol: str
    price: float
    volume: int
    timestamp: datetime
    side: str  # 'buy' or 'sell'


@dataclass
class NewsItem:
    """Stock news item"""

    symbol: str
    title: str
    summary: str
    url: str
    timestamp: datetime
    sentiment: Optional[str] = None
    source: Optional[str] = None


class RealtimeDataService:
    """Service for streaming real-time stock market data"""

    def __init__(self):
        self.subscribed_symbols: Set[str] = set()
        self.data_feeds: Dict[str, asyncio.Task] = {}
        self.running = False
        self.update_interval = 60.0  # seconds - Much slower to respect rate limits

        # Data cache for rate limiting and efficiency
        self.price_cache: Dict[str, StockPrice] = {}
        self.last_update: Dict[str, datetime] = {}

        # Market hours
        self.market_hours = {
            "NYSE": {"open": "09:30", "close": "16:00", "timezone": "US/Eastern"},
            "NASDAQ": {"open": "09:30", "close": "16:00", "timezone": "US/Eastern"},
        }

    async def start(self):
        """Start the real-time data service"""
        try:
            self.running = True

            # Start background tasks
            asyncio.create_task(self._price_update_loop())
            asyncio.create_task(self._news_update_loop())
            asyncio.create_task(self._market_status_loop())

            logger.info("Real-time data service started")

        except Exception as e:
            logger.error(f"Failed to start real-time data service: {e}")
            raise

    async def stop(self):
        """Stop the real-time data service"""
        self.running = False

        # Stop all data feeds
        for task in self.data_feeds.values():
            task.cancel()

        logger.info("Real-time data service stopped")

    async def subscribe_symbol(self, symbol: str) -> bool:
        """Subscribe to real-time data for a symbol"""
        try:
            symbol = symbol.upper()

            if symbol not in self.subscribed_symbols:
                self.subscribed_symbols.add(symbol)

                # Get initial data
                await self._fetch_initial_data(symbol)

                logger.info(f"Subscribed to symbol: {symbol}")

                # Notify clients
                await websocket_manager.broadcast_to_channel(
                    "symbols",
                    {"action": "subscribed", "symbol": symbol},
                    "subscription",
                )

            return True

        except Exception as e:
            logger.error(f"Failed to subscribe to symbol {symbol}: {e}")
            return False

    async def unsubscribe_symbol(self, symbol: str) -> bool:
        """Unsubscribe from real-time data for a symbol"""
        try:
            symbol = symbol.upper()

            if symbol in self.subscribed_symbols:
                self.subscribed_symbols.remove(symbol)

                # Clean up cached data
                if symbol in self.price_cache:
                    del self.price_cache[symbol]
                if symbol in self.last_update:
                    del self.last_update[symbol]

                logger.info(f"Unsubscribed from symbol: {symbol}")

                # Notify clients
                await websocket_manager.broadcast_to_channel(
                    "symbols",
                    {"action": "unsubscribed", "symbol": symbol},
                    "subscription",
                )

            return True

        except Exception as e:
            logger.error(f"Failed to unsubscribe from symbol {symbol}: {e}")
            return False

    async def get_current_price(self, symbol: str) -> Optional[StockPrice]:
        """Get current cached price for symbol"""
        return self.price_cache.get(symbol.upper())

    async def get_subscribed_symbols(self) -> List[str]:
        """Get list of currently subscribed symbols"""
        return list(self.subscribed_symbols)

    async def _fetch_initial_data(self, symbol: str):
        """Fetch initial data when subscribing to a symbol"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            history = ticker.history(period="1d", interval="1m")

            if not history.empty:
                latest = history.iloc[-1]
                previous_close = info.get("previousClose", latest["Close"])

                price_data = StockPrice(
                    symbol=symbol,
                    price=float(latest["Close"]),
                    change=float(latest["Close"] - previous_close),
                    change_percent=float(
                        (latest["Close"] - previous_close) / previous_close * 100
                    ),
                    volume=int(latest["Volume"]),
                    timestamp=datetime.now(),
                    market_cap=info.get("marketCap"),
                    pe_ratio=info.get("trailingPE"),
                )

                self.price_cache[symbol] = price_data

                # Broadcast to clients
                await websocket_manager.broadcast_to_channel(
                    f"price:{symbol}", asdict(price_data)
                )

        except Exception as e:
            logger.error(f"Failed to fetch initial data for {symbol}: {e}")

    async def _price_update_loop(self):
        """Main loop for price updates"""
        while self.running:
            try:
                if self.subscribed_symbols and self._is_market_open():
                    # Fetch updates for all subscribed symbols
                    symbols_list = list(self.subscribed_symbols)

                    # Process in smaller batches to avoid API limits
                    batch_size = 3  # Much smaller batches
                    for i in range(0, len(symbols_list), batch_size):
                        batch = symbols_list[i : i + batch_size]
                        await self._update_price_batch(batch)
                        # Wait between batches to avoid rate limiting
                        if i + batch_size < len(symbols_list):
                            await asyncio.sleep(5)  # 5 second delay between batches

                await asyncio.sleep(self.update_interval)

            except Exception as e:
                logger.error(f"Error in price update loop: {e}")
                await asyncio.sleep(5)

    async def _update_price_batch(self, symbols: List[str]):
        """Update prices for a batch of symbols"""
        try:
            # Create yfinance tickers
            symbols_str = " ".join(symbols)
            data = yf.download(symbols_str, period="1d", interval="1m", progress=False)

            if data.empty:
                return

            # Handle single vs multiple symbols
            if len(symbols) == 1:
                symbol = symbols[0]
                if not data.empty:
                    latest = data.iloc[-1]
                    await self._process_price_update(symbol, latest)
            else:
                for symbol in symbols:
                    if symbol in data.columns.get_level_values(1):
                        symbol_data = data.xs(symbol, level=1, axis=1)
                        if not symbol_data.empty:
                            latest = symbol_data.iloc[-1]
                            await self._process_price_update(symbol, latest)

        except Exception as e:
            logger.error(f"Failed to update price batch: {e}")

    async def _process_price_update(self, symbol: str, latest_data):
        """Process price update for a single symbol"""
        try:
            current_price = float(latest_data["Close"])
            volume = int(latest_data["Volume"])

            # Calculate change from previous cached price
            previous_price = self.price_cache.get(symbol)
            if previous_price:
                change = current_price - previous_price.price
                change_percent = (
                    (change / previous_price.price) * 100
                    if previous_price.price > 0
                    else 0
                )
            else:
                change = 0
                change_percent = 0

            price_data = StockPrice(
                symbol=symbol,
                price=current_price,
                change=change,
                change_percent=change_percent,
                volume=volume,
                timestamp=datetime.now(),
            )

            # Check if significant change (avoid spam)
            if self._is_significant_change(symbol, price_data):
                self.price_cache[symbol] = price_data
                self.last_update[symbol] = datetime.now()

                # Broadcast to clients
                await websocket_manager.broadcast_to_channel(
                    f"price:{symbol}", asdict(price_data)
                )

                # Also broadcast to general price channel
                await websocket_manager.broadcast_to_channel(
                    "prices", asdict(price_data)
                )

        except Exception as e:
            logger.error(f"Failed to process price update for {symbol}: {e}")

    def _is_significant_change(self, symbol: str, new_price: StockPrice) -> bool:
        """Check if price change is significant enough to broadcast"""
        if symbol not in self.price_cache:
            return True

        cached_price = self.price_cache[symbol]

        # Always update if more than 30 seconds old
        if symbol in self.last_update:
            time_diff = datetime.now() - self.last_update[symbol]
            if time_diff > timedelta(seconds=30):
                return True

        # Check price change threshold (0.1% or $0.01)
        price_diff = abs(new_price.price - cached_price.price)
        percent_diff = abs(new_price.change_percent - cached_price.change_percent)

        return price_diff >= 0.01 or percent_diff >= 0.1

    async def _news_update_loop(self):
        """Loop for fetching and broadcasting news updates"""
        while self.running:
            try:
                for symbol in self.subscribed_symbols:
                    await self._fetch_news(symbol)

                # Update every 5 minutes
                await asyncio.sleep(300)

            except Exception as e:
                logger.error(f"Error in news update loop: {e}")
                await asyncio.sleep(60)

    async def _fetch_news(self, symbol: str):
        """Fetch news for a symbol"""
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news

            if news:
                for item in news[:3]:  # Latest 3 news items
                    news_item = NewsItem(
                        symbol=symbol,
                        title=item.get("title", ""),
                        summary=item.get("summary", ""),
                        url=item.get("link", ""),
                        timestamp=datetime.fromtimestamp(
                            item.get("providerPublishTime", 0)
                        ),
                        source=item.get("publisher", ""),
                    )

                    # Broadcast to clients
                    await websocket_manager.broadcast_to_channel(
                        f"news:{symbol}", asdict(news_item)
                    )

        except Exception as e:
            logger.error(f"Failed to fetch news for {symbol}: {e}")

    async def _market_status_loop(self):
        """Loop for broadcasting market status updates"""
        while self.running:
            try:
                market_status = {
                    "is_open": self._is_market_open(),
                    "next_open": self._get_next_market_open(),
                    "next_close": self._get_next_market_close(),
                    "timestamp": datetime.now().isoformat(),
                }

                await websocket_manager.broadcast_to_channel(
                    "market_status", market_status
                )

                # Update every minute
                await asyncio.sleep(60)

            except Exception as e:
                logger.error(f"Error in market status loop: {e}")
                await asyncio.sleep(60)

    def _is_market_open(self) -> bool:
        """Check if market is currently open"""
        # Simplified check - in reality would need timezone handling
        now = datetime.now()

        # Check if weekend
        if now.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False

        # Check market hours (simplified)
        market_open_hour = 9  # 9:30 AM simplified to 9 AM
        market_close_hour = 16  # 4:00 PM

        current_hour = now.hour
        return market_open_hour <= current_hour < market_close_hour

    def _get_next_market_open(self) -> str:
        """Get next market open time"""
        # Simplified implementation
        now = datetime.now()

        if self._is_market_open():
            # Market is open, next open is tomorrow
            next_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
            next_open += timedelta(days=1)
        else:
            # Market is closed, next open is today or tomorrow
            next_open = now.replace(hour=9, minute=30, second=0, microsecond=0)
            if next_open <= now or now.weekday() >= 5:
                next_open += timedelta(days=1)

        # Skip weekends
        while next_open.weekday() >= 5:
            next_open += timedelta(days=1)

        return next_open.isoformat()

    def _get_next_market_close(self) -> str:
        """Get next market close time"""
        # Simplified implementation
        now = datetime.now()

        if self._is_market_open():
            # Market is open, close is today
            next_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
        else:
            # Market is closed, next close is when it opens next
            next_close = now.replace(hour=16, minute=0, second=0, microsecond=0)
            if next_close <= now or now.weekday() >= 5:
                next_close += timedelta(days=1)

        # Skip weekends
        while next_close.weekday() >= 5:
            next_close += timedelta(days=1)

        return next_close.isoformat()

    def get_service_stats(self) -> Dict:
        """Get service statistics"""
        return {
            "running": self.running,
            "subscribed_symbols": len(self.subscribed_symbols),
            "symbols": list(self.subscribed_symbols),
            "cached_prices": len(self.price_cache),
            "update_interval": self.update_interval,
            "market_open": self._is_market_open(),
            "active_feeds": len(self.data_feeds),
        }


# Global service instance
realtime_service = RealtimeDataService()
