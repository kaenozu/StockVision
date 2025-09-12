"""
Data Streaming Optimization

This module provides optimizations for real-time data streaming including
compression, batching, delta updates, and connection management.
"""

import asyncio
import json
import logging
import time
import zlib
from collections import deque
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from ..services.realtime_provider import RealTimeDataPoint
from ..websocket.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


@dataclass
class StreamingOptimizationConfig:
    """Configuration for streaming optimizations"""

    # Compression settings
    enable_compression: bool = True
    compression_level: int = 6  # 1-9, 6 is default

    # Batching settings
    enable_batching: bool = True
    batch_size: int = 10
    batch_interval: float = 0.1  # seconds

    # Delta updates
    enable_delta_updates: bool = True

    # Connection management
    max_connections: int = 1000
    heartbeat_interval: float = 30.0  # seconds
    connection_timeout: float = 300.0  # seconds

    # Data filtering
    enable_filtering: bool = True
    max_symbols_per_client: int = 50

    # Rate limiting
    rate_limit_messages: int = 100
    rate_limit_window: int = 60  # seconds


@dataclass
class StreamMessage:
    """Optimized stream message structure"""

    type: str
    channel: str
    data: Any
    timestamp: str
    compressed: bool = False
    batch_id: Optional[str] = None


class DataStreamingOptimizer:
    """Optimizes data streaming for performance and efficiency"""

    def __init__(self, config: StreamingOptimizationConfig):
        self.config = config
        self.batches: Dict[str, List[Any]] = {}  # channel -> data points
        self.batch_timers: Dict[str, asyncio.TimerHandle] = {}
        self.last_values: Dict[str, Dict[str, float]] = (
            {}
        )  # symbol -> field -> last_value
        self.connection_stats: Dict[str, Dict[str, Any]] = {}
        self.message_queues: Dict[str, deque] = {}  # client_id -> message queue
        self.is_running = False

    async def start(self):
        """Start the streaming optimizer"""
        if self.is_running:
            return

        self.is_running = True
        logger.info("Data streaming optimizer started")

        # Start background tasks
        if self.config.enable_batching:
            asyncio.create_task(self._batch_flush_task())

        # Start heartbeat
        asyncio.create_task(self._heartbeat_task())

    async def stop(self):
        """Stop the streaming optimizer"""
        self.is_running = False
        logger.info("Data streaming optimizer stopped")

        # Cancel batch timers
        for timer in self.batch_timers.values():
            timer.cancel()
        self.batch_timers.clear()

    async def optimize_and_send(
        self, channel: str, data: Any, client_id: Optional[str] = None
    ):
        """Optimize and send data"""
        try:
            # Apply optimizations
            if self.config.enable_batching:
                await self._batch_data(channel, data, client_id)
            elif self.config.enable_delta_updates:
                optimized_data = await self._create_delta_update(channel, data)
                await self._send_optimized_data(channel, optimized_data, client_id)
            else:
                await self._send_optimized_data(channel, data, client_id)

        except Exception as e:
            logger.error(f"Error optimizing and sending data to {channel}: {e}")

    async def _batch_data(
        self, channel: str, data: Any, client_id: Optional[str] = None
    ):
        """Batch data for sending"""
        # Initialize batch for channel if needed
        if channel not in self.batches:
            self.batches[channel] = []

        # Add data to batch
        self.batches[channel].append(data)

        # Check if batch is full
        if len(self.batches[channel]) >= self.config.batch_size:
            await self._flush_batch(channel, client_id)
        else:
            # Set timer to flush batch after interval
            if channel not in self.batch_timers:
                self.batch_timers[channel] = asyncio.get_event_loop().call_later(
                    self.config.batch_interval,
                    lambda: asyncio.create_task(self._flush_batch(channel, client_id)),
                )

    async def _flush_batch(self, channel: str, client_id: Optional[str] = None):
        """Flush batched data"""
        try:
            if channel in self.batches and self.batches[channel]:
                batch_data = self.batches[channel]
                batch_id = f"batch_{int(time.time() * 1000)}"

                # Clear batch
                self.batches[channel] = []

                # Cancel timer if exists
                if channel in self.batch_timers:
                    self.batch_timers[channel].cancel()
                    del self.batch_timers[channel]

                # Send batched message
                message = StreamMessage(
                    type="batch",
                    channel=channel,
                    data=batch_data,
                    timestamp=datetime.now().isoformat(),
                    batch_id=batch_id,
                )

                await self._send_message(message, client_id)

        except Exception as e:
            logger.error(f"Error flushing batch for {channel}: {e}")

    async def _batch_flush_task(self):
        """Periodic batch flushing task"""
        while self.is_running:
            try:
                # Flush any batches that have been waiting too long
                # current_time = time.time() # Commented out as it's unused
                channels_to_flush = []

                for channel, batch in self.batches.items():
                    if batch:  # Only flush non-empty batches
                        channels_to_flush.append(channel)

                # Flush channels
                for channel in channels_to_flush:
                    await self._flush_batch(channel)

                await asyncio.sleep(0.05)  # Check every 50ms
            except Exception as e:
                logger.error(f"Error in batch flush task: {e}")
                await asyncio.sleep(1)

    async def _create_delta_update(self, channel: str, data: Any) -> Any:
        """Create delta update by comparing with last values"""
        if not self.config.enable_delta_updates:
            return data

        try:
            # Handle RealTimeDataPoint
            if isinstance(data, RealTimeDataPoint):
                symbol = data.symbol
                current_values = {
                    "price": data.price,
                    "change": data.change,
                    "change_percent": data.change_percent,
                    "volume": data.volume,
                }

                # Get last values
                last_values = self.last_values.get(symbol, {})

                # Create delta
                delta = {}
                for field, current_value in current_values.items():
                    if field not in last_values or last_values[field] != current_value:
                        delta[field] = current_value

                # Update last values
                if symbol not in self.last_values:
                    self.last_values[symbol] = {}
                self.last_values[symbol].update(current_values)

                # If no changes, return None to skip sending
                if not delta:
                    return None

                # Return delta update
                return {
                    "symbol": symbol,
                    "delta": delta,
                    "timestamp": data.timestamp.isoformat(),
                }
            else:
                # For other data types, send as-is
                return data

        except Exception as e:
            logger.error(f"Error creating delta update for {channel}: {e}")
            return data

    async def _send_optimized_data(
        self, channel: str, data: Any, client_id: Optional[str] = None
    ):
        """Send optimized data with compression if enabled"""
        if data is None:  # Skip null data (delta updates with no changes)
            return

        message = StreamMessage(
            type="data",
            channel=channel,
            data=data,
            timestamp=datetime.now().isoformat(),
        )

        await self._send_message(message, client_id)

    async def _send_message(
        self, message: StreamMessage, client_id: Optional[str] = None
    ):
        """Send message with compression and other optimizations"""
        try:
            # Serialize message
            message_data = json.dumps(asdict(message), separators=(",", ":"))

            # Apply compression if enabled
            if self.config.enable_compression:
                compressed_data = zlib.compress(
                    message_data.encode("utf-8"), self.config.compression_level
                )
                message_data = compressed_data
                message.compressed = True

            # Send to specific client or broadcast
            if client_id:
                await websocket_manager.send_to_client(
                    client_id, message_data, message.channel
                )
            else:
                await websocket_manager.broadcast_to_channel(
                    message.channel, message_data
                )

        except Exception as e:
            logger.error(f"Error sending message: {e}")

    async def add_connection_stats(self, client_id: str, stats: Dict[str, Any]):
        """Add connection statistics"""
        self.connection_stats[client_id] = {
            "connected_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "messages_sent": 0,
            "data_sent_bytes": 0,
            "compression_ratio": 0.0,
            **stats,
        }

    async def update_connection_activity(self, client_id: str):
        """Update connection activity timestamp"""
        if client_id in self.connection_stats:
            self.connection_stats[client_id][
                "last_activity"
            ] = datetime.now().isoformat()

    async def get_connection_stats(
        self, client_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get connection statistics"""
        if client_id:
            return self.connection_stats.get(client_id, {})
        return self.connection_stats

    async def apply_data_filtering(
        self, client_id: str, symbols: List[str]
    ) -> List[str]:
        """Apply data filtering based on client configuration"""
        if not self.config.enable_filtering:
            return symbols

        # Limit symbols per client
        if len(symbols) > self.config.max_symbols_per_client:
            logger.warning(
                f"Client {client_id} requested {len(symbols)} symbols, limiting to {self.config.max_symbols_per_client}"
            )
            return symbols[: self.config.max_symbols_per_client]

        return symbols

    async def apply_rate_limiting(self, client_id: str) -> bool:
        """Apply rate limiting to client"""
        # Implementation would track message rates per client
        # and return False if rate limit is exceeded
        return True

    async def _heartbeat_task(self):
        """Send periodic heartbeat messages"""
        while self.is_running:
            try:
                # Send heartbeat to all connections
                await websocket_manager.broadcast_to_channel(
                    "system",
                    {
                        "type": "heartbeat",
                        "timestamp": datetime.now().isoformat(),
                        "server_time": time.time(),
                    },
                    "system",
                )

                await asyncio.sleep(self.config.heartbeat_interval)
            except Exception as e:
                logger.error(f"Error in heartbeat task: {e}")
                await asyncio.sleep(1)

    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get optimization statistics"""
        total_batches = sum(len(batch) for batch in self.batches.values())
        active_batches = len([batch for batch in self.batches.values() if batch])

        return {
            "total_batches": total_batches,
            "active_batches": active_batches,
            "connections": len(self.connection_stats),
            "compression_enabled": self.config.enable_compression,
            "batching_enabled": self.config.enable_batching,
            "delta_updates_enabled": self.config.enable_delta_updates,
        }


# Global streaming optimizer instance
_streaming_optimizer: Optional[DataStreamingOptimizer] = None
_optimizer_lock = asyncio.Lock()


async def get_streaming_optimizer(
    config: Optional[StreamingOptimizationConfig] = None,
) -> DataStreamingOptimizer:
    """Get global streaming optimizer instance"""
    global _streaming_optimizer

    async with _optimizer_lock:
        if _streaming_optimizer is None:
            if config is None:
                config = StreamingOptimizationConfig()
            _streaming_optimizer = DataStreamingOptimizer(config)
            await _streaming_optimizer.start()
        return _streaming_optimizer


async def cleanup_streaming_optimizer():
    """Cleanup global streaming optimizer instance"""
    global _streaming_optimizer

    async with _optimizer_lock:
        if _streaming_optimizer:
            await _streaming_optimizer.stop()
            _streaming_optimizer = None
