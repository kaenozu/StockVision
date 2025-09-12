"""
WebSocket Manager for Real-time Stock Data Streaming
Handles WebSocket connections and real-time data distribution
"""

import asyncio
import json
import logging
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set

import redis.asyncio as redis
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


@dataclass
class StreamMessage:
    """WebSocket stream message structure"""

    type: str
    channel: str
    data: Any
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ClientSubscription:
    """Client subscription information"""

    websocket: WebSocket
    channels: Set[str]
    filters: Dict[str, Any]
    client_id: str
    connected_at: datetime


class WebSocketManager:
    """Manages WebSocket connections and real-time data streaming"""

    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.connections: Dict[str, ClientSubscription] = {}
        self.channel_subscribers: Dict[str, Set[str]] = {}
        self.redis_client: Optional[redis.Redis] = None
        self.redis_url = redis_url
        self.running = False

        # Message rate limiting
        self.rate_limits = {
            "default": {"messages": 100, "window": 60},
            "premium": {"messages": 1000, "window": 60},
        }
        self.client_message_counts: Dict[str, Dict] = {}

    async def start(self):
        """Start the WebSocket manager"""
        try:
            self.redis_client = redis.from_url(self.redis_url)
            await self.redis_client.ping()
            self.running = True

            # Start background tasks
            asyncio.create_task(self._cleanup_disconnected_clients())
            asyncio.create_task(self._redis_message_handler())

            logger.info("WebSocket Manager started successfully")

        except Exception as e:
            logger.error(f"Failed to start WebSocket Manager: {e}")
            raise

    async def stop(self):
        """Stop the WebSocket manager"""
        self.running = False

        # Close all connections
        for client_id in list(self.connections.keys()):
            await self.disconnect_client(client_id)

        if self.redis_client:
            await self.redis_client.close()

        logger.info("WebSocket Manager stopped")

    async def connect_client(self, websocket: WebSocket, client_id: str) -> bool:
        """Connect a new WebSocket client"""
        try:
            await websocket.accept()

            subscription = ClientSubscription(
                websocket=websocket,
                channels=set(),
                filters={},
                client_id=client_id,
                connected_at=datetime.now(),
            )

            self.connections[client_id] = subscription
            self.client_message_counts[client_id] = {
                "count": 0,
                "reset_time": datetime.now(),
            }

            logger.info(f"Client {client_id} connected")

            # Send connection confirmation
            await self._send_to_client(
                client_id,
                StreamMessage(
                    type="connection",
                    channel="system",
                    data={"status": "connected", "client_id": client_id},
                    timestamp=datetime.now().isoformat(),
                ),
            )

            return True

        except Exception as e:
            logger.error(f"Failed to connect client {client_id}: {e}")
            return False

    async def disconnect_client(self, client_id: str):
        """Disconnect a WebSocket client"""
        if client_id in self.connections:
            subscription = self.connections[client_id]

            # Remove from channel subscriptions
            for channel in subscription.channels:
                if channel in self.channel_subscribers:
                    self.channel_subscribers[channel].discard(client_id)
                    if not self.channel_subscribers[channel]:
                        del self.channel_subscribers[channel]

            # Close WebSocket connection
            try:
                await subscription.websocket.close()
            except Exception as e:
                logger.warning(f"Error closing websocket for client {client_id}: {e}")
                pass

            # Clean up
            del self.connections[client_id]
            if client_id in self.client_message_counts:
                del self.client_message_counts[client_id]

            logger.info(f"Client {client_id} disconnected")

    async def subscribe_client(
        self, client_id: str, channels: list, filters: Dict[str, Any] = None
    ):
        """Subscribe client to data channels"""
        if client_id not in self.connections:
            logger.warning(f"Client {client_id} not found for subscription")
            return False

        subscription = self.connections[client_id]
        filters = filters or {}

        for channel in channels:
            subscription.channels.add(channel)

            if channel not in self.channel_subscribers:
                self.channel_subscribers[channel] = set()
            self.channel_subscribers[channel].add(client_id)

        subscription.filters.update(filters)

        logger.info(f"Client {client_id} subscribed to channels: {channels}")

        # Send subscription confirmation
        await self._send_to_client(
            client_id,
            StreamMessage(
                type="subscription",
                channel="system",
                data={
                    "channels": list(subscription.channels),
                    "filters": subscription.filters,
                },
                timestamp=datetime.now().isoformat(),
            ),
        )

        return True

    async def unsubscribe_client(self, client_id: str, channels: list):
        """Unsubscribe client from data channels"""
        if client_id not in self.connections:
            return False

        subscription = self.connections[client_id]

        for channel in channels:
            subscription.channels.discard(channel)

            if channel in self.channel_subscribers:
                self.channel_subscribers[channel].discard(client_id)
                if not self.channel_subscribers[channel]:
                    del self.channel_subscribers[channel]

        logger.info(f"Client {client_id} unsubscribed from channels: {channels}")
        return True

    async def broadcast_to_channel(
        self, channel: str, message_data: Any, message_type: str = "data"
    ):
        """Broadcast message to all subscribers of a channel"""
        if channel not in self.channel_subscribers:
            return 0

        message = StreamMessage(
            type=message_type,
            channel=channel,
            data=message_data,
            timestamp=datetime.now().isoformat(),
        )

        subscribers = self.channel_subscribers[channel].copy()
        successful_sends = 0

        for client_id in subscribers:
            if await self._send_to_client(client_id, message):
                successful_sends += 1

        return successful_sends

    async def send_to_client(
        self,
        client_id: str,
        message_data: Any,
        channel: str = "direct",
        message_type: str = "message",
    ):
        """Send direct message to specific client"""
        message = StreamMessage(
            type=message_type,
            channel=channel,
            data=message_data,
            timestamp=datetime.now().isoformat(),
        )

        return await self._send_to_client(client_id, message)

    async def publish_to_redis(self, channel: str, data: Any):
        """Publish message to Redis for distributed systems"""
        if not self.redis_client:
            return False

        try:
            message = {
                "channel": channel,
                "data": data,
                "timestamp": datetime.now().isoformat(),
            }

            await self.redis_client.publish(
                f"stockvision:{channel}", json.dumps(message)
            )
            return True

        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")
            return False

    async def _send_to_client(self, client_id: str, message: StreamMessage) -> bool:
        """Send message to specific client with rate limiting"""
        if client_id not in self.connections:
            return False

        # Check rate limiting
        if not self._check_rate_limit(client_id):
            logger.warning(f"Rate limit exceeded for client {client_id}")
            return False

        subscription = self.connections[client_id]

        # Apply filters
        if not self._message_passes_filters(message, subscription.filters):
            return True  # Message filtered but no error

        try:
            await subscription.websocket.send_text(json.dumps(asdict(message)))

            # Update message count
            self.client_message_counts[client_id]["count"] += 1

            return True

        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected during message send")
            await self.disconnect_client(client_id)
            return False

        except Exception as e:
            logger.error(f"Failed to send message to client {client_id}: {e}")
            await self.disconnect_client(client_id)
            return False

    def _check_rate_limit(self, client_id: str) -> bool:
        """Check if client is within rate limits"""
        if client_id not in self.client_message_counts:
            return True

        client_data = self.client_message_counts[client_id]
        now = datetime.now()

        # Reset count if window has passed
        if now - client_data["reset_time"] > timedelta(seconds=60):
            client_data["count"] = 0
            client_data["reset_time"] = now

        # Get rate limit (default for now, could be user-specific)
        limit = self.rate_limits["default"]["messages"]

        return client_data["count"] < limit

    def _message_passes_filters(
        self, message: StreamMessage, filters: Dict[str, Any]
    ) -> bool:
        """Check if message passes client filters"""
        if not filters:
            return True

        # Symbol filter
        if "symbols" in filters:
            if (
                hasattr(message.data, "symbol")
                and message.data.symbol not in filters["symbols"]
            ):
                return False
            elif (
                isinstance(message.data, dict)
                and message.data.get("symbol") not in filters["symbols"]
            ):
                return False

        # Price range filter
        if "price_range" in filters and isinstance(message.data, dict):
            price = message.data.get("price")
            if price is not None:
                min_price = filters["price_range"].get("min", 0)
                max_price = filters["price_range"].get("max", float("inf"))
                if not (min_price <= price <= max_price):
                    return False

        # Volume filter
        if "min_volume" in filters and isinstance(message.data, dict):
            volume = message.data.get("volume", 0)
            if volume < filters["min_volume"]:
                return False

        return True

    async def _cleanup_disconnected_clients(self):
        """Periodic cleanup of disconnected clients"""
        while self.running:
            try:
                disconnected_clients = []

                for client_id, subscription in self.connections.items():
                    # Check if connection is still alive
                    try:
                        await subscription.websocket.ping()
                    except Exception as e:
                        logger.info(
                            f"Client {client_id} ping failed, marking for disconnection: {e}"
                        )
                        disconnected_clients.append(client_id)

                for client_id in disconnected_clients:
                    await self.disconnect_client(client_id)

                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                logger.error(f"Error in client cleanup: {e}")
                await asyncio.sleep(30)

    async def _redis_message_handler(self):
        """Handle messages from Redis pub/sub"""
        if not self.redis_client:
            return

        try:
            pubsub = self.redis_client.pubsub()
            await pubsub.subscribe("stockvision:*")

            while self.running:
                try:
                    message = await pubsub.get_message(timeout=1)
                    if message and message["type"] == "message":
                        channel_full = message["channel"].decode()
                        channel = channel_full.replace("stockvision:", "")
                        data = json.loads(message["data"])

                        await self.broadcast_to_channel(channel, data["data"])

                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    logger.error(f"Error handling Redis message: {e}")

        except Exception as e:
            logger.error(f"Redis message handler error: {e}")

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics"""
        channel_stats = {}
        for channel, subscribers in self.channel_subscribers.items():
            channel_stats[channel] = len(subscribers)

        return {
            "total_connections": len(self.connections),
            "channel_subscriptions": channel_stats,
            "active_channels": len(self.channel_subscribers),
            "message_counts": {
                client_id: data["count"]
                for client_id, data in self.client_message_counts.items()
            },
        }

    async def handle_client_message(self, client_id: str, message_data: str):
        """Handle incoming messages from clients"""
        try:
            message = json.loads(message_data)
            message_type = message.get("type")

            if message_type == "subscribe":
                channels = message.get("channels", [])
                filters = message.get("filters", {})
                await self.subscribe_client(client_id, channels, filters)

            elif message_type == "unsubscribe":
                channels = message.get("channels", [])
                await self.unsubscribe_client(client_id, channels)

            elif message_type == "ping":
                await self.send_to_client(client_id, {"type": "pong"}, "system")

            else:
                logger.warning(
                    f"Unknown message type from client {client_id}: {message_type}"
                )

        except json.JSONDecodeError:
            logger.error(f"Invalid JSON from client {client_id}: {message_data}")
        except Exception as e:
            logger.error(f"Error handling client message: {e}")


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
