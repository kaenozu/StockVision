"""
Real-time Data Provider for Stock Streaming

This module provides real-time data streaming capabilities for stock prices
using various data sources including WebSocket connections to external providers.
"""

import asyncio
import logging
import json
from datetime import datetime
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, asdict

from ..stock_api.yahoo_client import YahooFinanceClient
from ..services.stock_service import get_stock_service
from ..config import get_settings

logger = logging.getLogger(__name__)

@dataclass
class RealTimeDataPoint:
    """Real-time data point structure"""
    symbol: str
    price: float
    change: float
    change_percent: float
    volume: int
    timestamp: datetime
    market_hours: str  # PRE_MARKET, REGULAR_MARKET, POST_MARKET

@dataclass
class StreamingConfig:
    """Configuration for real-time data streaming"""
    providers: List[str]  # List of provider names to use
    symbols: List[str]    # List of symbols to stream
    update_interval: float  # Update interval in seconds
    max_retries: int       # Maximum retry attempts
    buffer_size: int       # Size of data buffer
    enable_fallback: bool  # Enable fallback to mock data

class RealTimeDataProvider:
    """Manages real-time data streaming from various providers"""
    
    def __init__(self, config: StreamingConfig):
        self.config = config
        self.settings = get_settings()
        self.providers = {}
        self.subscribers: Dict[str, List[Callable]] = {}
        self.is_running = False
        self.data_buffer: Dict[str, List[RealTimeDataPoint]] = {}
        self._lock = asyncio.Lock()
        
        # Initialize data buffer for each symbol
        for symbol in config.symbols:
            self.data_buffer[symbol] = []
    
    async def initialize_providers(self):
        """Initialize data providers"""
        for provider_name in self.config.providers:
            try:
                if provider_name == "yahoo_finance":
                    # Initialize Yahoo Finance client
                    self.providers[provider_name] = YahooFinanceClient(
                        max_requests=100,
                        time_window=60,
                        max_concurrent=10,
                        timeout=30,
                        retry_attempts=3,
                        retry_delay=1.0
                    )
                elif provider_name == "websocket":
                    # Placeholder for WebSocket provider
                    self.providers[provider_name] = WebSocketDataProvider()
                else:
                    logger.warning(f"Unknown provider: {provider_name}")
            except Exception as e:
                logger.error(f"Failed to initialize provider {provider_name}: {e}")
    
    async def start_streaming(self):
        """Start real-time data streaming"""
        if self.is_running:
            logger.warning("Streaming is already running")
            return
        
        self.is_running = True
        logger.info("Starting real-time data streaming")
        
        # Initialize providers
        await self.initialize_providers()
        
        # Start streaming tasks for each provider
        streaming_tasks = []
        for provider_name, provider in self.providers.items():
            task = asyncio.create_task(
                self._stream_from_provider(provider_name, provider)
            )
            streaming_tasks.append(task)
        
        # Wait for all tasks to complete (they shouldn't)
        try:
            await asyncio.gather(*streaming_tasks)
        except Exception as e:
            logger.error(f"Error in streaming tasks: {e}")
        finally:
            self.is_running = False
    
    async def stop_streaming(self):
        """Stop real-time data streaming"""
        self.is_running = False
        logger.info("Stopping real-time data streaming")
        
        # Close provider connections
        for provider_name, provider in self.providers.items():
            try:
                if hasattr(provider, 'close'):
                    await provider.close()
            except Exception as e:
                logger.error(f"Error closing provider {provider_name}: {e}")
    
    async def _stream_from_provider(self, provider_name: str, provider):
        """Stream data from a specific provider"""
        while self.is_running:
            try:
                # Get real-time data from provider
                data_points = await self._fetch_data_from_provider(provider_name, provider)
                
                # Process and distribute data
                for data_point in data_points:
                    await self._process_data_point(data_point)
                
                # Wait for next update
                await asyncio.sleep(self.config.update_interval)
                
            except asyncio.CancelledError:
                logger.info(f"Streaming cancelled for provider {provider_name}")
                break
            except Exception as e:
                logger.error(f"Error streaming from provider {provider_name}: {e}")
                # Wait before retrying
                await asyncio.sleep(5)
    
    async def _fetch_data_from_provider(self, provider_name: str, provider) -> List[RealTimeDataPoint]:
        """Fetch data from a specific provider"""
        data_points = []
        
        try:
            if provider_name == "yahoo_finance":
                # Fetch data for each symbol
                for symbol in self.config.symbols:
                    try:
                        # Get current price from Yahoo Finance
                        current_price = await provider.get_current_price(symbol)
                        
                        data_point = RealTimeDataPoint(
                            symbol=symbol,
                            price=current_price.price,
                            change=current_price.change,
                            change_percent=current_price.change_percent,
                            volume=current_price.volume,
                            timestamp=datetime.now(),
                            market_hours="REGULAR_MARKET"  # Simplified for now
                        )
                        
                        data_points.append(data_point)
                    except Exception as e:
                        logger.error(f"Error fetching data for {symbol} from Yahoo Finance: {e}")
                        # Try fallback if enabled
                        if self.config.enable_fallback:
                            mock_data = await self._generate_mock_data(symbol)
                            data_points.append(mock_data)
            
            elif provider_name == "websocket":
                # Get data from WebSocket provider
                data_points = await provider.get_latest_data(self.config.symbols)
            
        except Exception as e:
            logger.error(f"Error fetching data from provider {provider_name}: {e}")
            # Try fallback if enabled
            if self.config.enable_fallback:
                for symbol in self.config.symbols:
                    mock_data = await self._generate_mock_data(symbol)
                    data_points.append(mock_data)
        
        return data_points
    
    async def _generate_mock_data(self, symbol: str) -> RealTimeDataPoint:
        """Generate mock real-time data for fallback"""
        try:
            # Use stock service to generate mock data
            stock_service = await get_stock_service()
            current_price = await stock_service.get_current_price(symbol, use_real_data=False)
            
            return RealTimeDataPoint(
                symbol=symbol,
                price=current_price.price,
                change=current_price.change,
                change_percent=current_price.change_percent,
                volume=current_price.volume,
                timestamp=datetime.now(),
                market_hours="REGULAR_MARKET"
            )
        except Exception as e:
            logger.error(f"Error generating mock data for {symbol}: {e}")
            # Return basic mock data
            return RealTimeDataPoint(
                symbol=symbol,
                price=100.0,
                change=0.0,
                change_percent=0.0,
                volume=1000,
                timestamp=datetime.now(),
                market_hours="REGULAR_MARKET"
            )
    
    async def _process_data_point(self, data_point: RealTimeDataPoint):
        """Process and distribute a data point to subscribers"""
        async with self._lock:
            # Add to buffer
            self.data_buffer[data_point.symbol].append(data_point)
            
            # Maintain buffer size
            if len(self.data_buffer[data_point.symbol]) > self.config.buffer_size:
                self.data_buffer[data_point.symbol] = self.data_buffer[data_point.symbol][-self.config.buffer_size:]
        
        # Notify subscribers
        if data_point.symbol in self.subscribers:
            for callback in self.subscribers[data_point.symbol]:
                try:
                    await callback(data_point)
                except Exception as e:
                    logger.error(f"Error in subscriber callback for {data_point.symbol}: {e}")
    
    def subscribe(self, symbol: str, callback: Callable[[RealTimeDataPoint], None]):
        """Subscribe to real-time data for a symbol"""
        if symbol not in self.subscribers:
            self.subscribers[symbol] = []
        self.subscribers[symbol].append(callback)
        logger.info(f"Subscribed to {symbol} data")
    
    def unsubscribe(self, symbol: str, callback: Callable[[RealTimeDataPoint], None]):
        """Unsubscribe from real-time data for a symbol"""
        if symbol in self.subscribers:
            try:
                self.subscribers[symbol].remove(callback)
                if not self.subscribers[symbol]:
                    del self.subscribers[symbol]
                logger.info(f"Unsubscribed from {symbol} data")
            except ValueError:
                logger.warning(f"Callback not found for {symbol}")
    
    def get_latest_data(self, symbol: str) -> Optional[RealTimeDataPoint]:
        """Get the latest data point for a symbol"""
        if symbol in self.data_buffer and self.data_buffer[symbol]:
            return self.data_buffer[symbol][-1]
        return None
    
    def get_buffered_data(self, symbol: str, count: int = 10) -> List[RealTimeDataPoint]:
        """Get buffered data points for a symbol"""
        if symbol in self.data_buffer:
            return self.data_buffer[symbol][-count:]
        return []

class WebSocketDataProvider:
    """WebSocket data provider (placeholder implementation)"""
    
    def __init__(self):
        self.ws_url = "wss://streamer.finance.yahoo.com/"
        self.websocket = None
        self.is_connected = False
    
    async def connect(self):
        """Connect to WebSocket"""
        # Placeholder implementation
        self.is_connected = True
        logger.info("Connected to WebSocket data provider")
    
    async def disconnect(self):
        """Disconnect from WebSocket"""
        self.is_connected = False
        if self.websocket:
            await self.websocket.close()
        logger.info("Disconnected from WebSocket data provider")
    
    async def get_latest_data(self, symbols: List[str]) -> List[RealTimeDataPoint]:
        """Get latest data from WebSocket"""
        # Placeholder implementation - return mock data
        data_points = []
        for symbol in symbols:
            data_points.append(RealTimeDataPoint(
                symbol=symbol,
                price=100.0 + hash(symbol) % 10,  # Simple mock price
                change=0.5,
                change_percent=0.5,
                volume=1000,
                timestamp=datetime.now(),
                market_hours="REGULAR_MARKET"
            ))
        return data_points
    
    async def close(self):
        """Close WebSocket connection"""
        await self.disconnect()

# Global real-time data provider instance
_realtime_provider: Optional[RealTimeDataProvider] = None
_provider_lock = asyncio.Lock()

async def get_realtime_provider(config: Optional[StreamingConfig] = None) -> RealTimeDataProvider:
    """Get global real-time data provider instance"""
    global _realtime_provider
    
    async with _provider_lock:
        if _realtime_provider is None:
            if config is None:
                # Create default configuration
                config = StreamingConfig(
                    providers=["yahoo_finance"],
                    symbols=["7203.T", "9984.T", "8306.T"],  # Default symbols
                    update_interval=5.0,
                    max_retries=3,
                    buffer_size=100,
                    enable_fallback=True
                )
            _realtime_provider = RealTimeDataProvider(config)
        return _realtime_provider

async def cleanup_realtime_provider():
    """Cleanup global real-time data provider instance"""
    global _realtime_provider
    
    async with _provider_lock:
        if _realtime_provider:
            await _realtime_provider.stop_streaming()
            _realtime_provider = None