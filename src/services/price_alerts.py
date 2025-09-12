"""
Price Alert Notification System

This module provides real-time price alert notifications for stock prices.
It monitors price changes and sends notifications when specified conditions are met.
"""

import asyncio
import logging
from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from ..services.realtime_provider import RealTimeDataPoint, RealTimeDataProvider
from ..websocket.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)


class AlertCondition(Enum):
    """Types of alert conditions"""

    PRICE_ABOVE = "price_above"
    PRICE_BELOW = "price_below"
    PERCENTAGE_CHANGE_ABOVE = "percentage_change_above"
    PERCENTAGE_CHANGE_BELOW = "percentage_change_below"
    VOLUME_ABOVE = "volume_above"


@dataclass
class PriceAlert:
    """Price alert configuration"""

    id: str
    symbol: str
    condition: AlertCondition
    threshold: float
    enabled: bool = True
    created_at: datetime = None
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0
    notification_channels: List[str] = None  # "websocket", "email", "sms", etc.

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.notification_channels is None:
            self.notification_channels = ["websocket"]


@dataclass
class AlertNotification:
    """Alert notification structure"""

    alert_id: str
    symbol: str
    condition: AlertCondition
    threshold: float
    current_value: float
    triggered_at: datetime
    message: str


class PriceAlertSystem:
    """Manages price alerts and notifications"""

    def __init__(self, realtime_provider: RealTimeDataProvider):
        self.realtime_provider = realtime_provider
        self.alerts: Dict[str, PriceAlert] = {}
        self.symbol_alerts: Dict[str, List[str]] = {}  # symbol -> alert_ids
        self.is_monitoring = False
        self._lock = asyncio.Lock()

        # Register callback with real-time provider
        self._setup_callbacks()

    def _setup_callbacks(self):
        """Set up callbacks for real-time data"""
        # Subscribe to all symbols that have alerts
        for symbol in self.symbol_alerts.keys():
            self.realtime_provider.subscribe(symbol, self._on_price_update)

    async def add_alert(self, alert: PriceAlert) -> bool:
        """Add a new price alert"""
        async with self._lock:
            self.alerts[alert.id] = alert

            # Add to symbol alerts mapping
            if alert.symbol not in self.symbol_alerts:
                self.symbol_alerts[alert.symbol] = []
                # Subscribe to real-time data for this symbol
                self.realtime_provider.subscribe(alert.symbol, self._on_price_update)
            self.symbol_alerts[alert.symbol].append(alert.id)

            logger.info(f"Added price alert {alert.id} for {alert.symbol}")
            return True

    async def remove_alert(self, alert_id: str) -> bool:
        """Remove a price alert"""
        async with self._lock:
            if alert_id not in self.alerts:
                return False

            alert = self.alerts[alert_id]

            # Remove from symbol alerts mapping
            if alert.symbol in self.symbol_alerts:
                if alert_id in self.symbol_alerts[alert.symbol]:
                    self.symbol_alerts[alert.symbol].remove(alert_id)

                # If no more alerts for this symbol, unsubscribe
                if not self.symbol_alerts[alert.symbol]:
                    del self.symbol_alerts[alert.symbol]
                    self.realtime_provider.unsubscribe(
                        alert.symbol, self._on_price_update
                    )

            del self.alerts[alert_id]
            logger.info(f"Removed price alert {alert_id} for {alert.symbol}")
            return True

    async def update_alert(self, alert_id: str, **kwargs) -> bool:
        """Update an existing alert"""
        async with self._lock:
            if alert_id not in self.alerts:
                return False

            alert = self.alerts[alert_id]

            # Handle symbol change
            if "symbol" in kwargs and kwargs["symbol"] != alert.symbol:
                # Remove from old symbol
                if alert.symbol in self.symbol_alerts:
                    self.symbol_alerts[alert.symbol].remove(alert_id)
                    if not self.symbol_alerts[alert.symbol]:
                        del self.symbol_alerts[alert.symbol]
                        self.realtime_provider.unsubscribe(
                            alert.symbol, self._on_price_update
                        )

                # Add to new symbol
                new_symbol = kwargs["symbol"]
                if new_symbol not in self.symbol_alerts:
                    self.symbol_alerts[new_symbol] = []
                    self.realtime_provider.subscribe(new_symbol, self._on_price_update)
                self.symbol_alerts[new_symbol].append(alert_id)

            # Update alert properties
            for key, value in kwargs.items():
                if hasattr(alert, key):
                    setattr(alert, key, value)

            logger.info(f"Updated price alert {alert_id}")
            return True

    async def get_alerts_for_symbol(self, symbol: str) -> List[PriceAlert]:
        """Get all alerts for a symbol"""
        async with self._lock:
            alert_ids = self.symbol_alerts.get(symbol, [])
            return [
                self.alerts[alert_id]
                for alert_id in alert_ids
                if alert_id in self.alerts
            ]

    async def get_all_alerts(self) -> List[PriceAlert]:
        """Get all alerts"""
        async with self._lock:
            return list(self.alerts.values())

    async def enable_alert(self, alert_id: str) -> bool:
        """Enable an alert"""
        async with self._lock:
            if alert_id in self.alerts:
                self.alerts[alert_id].enabled = True
                logger.info(f"Enabled price alert {alert_id}")
                return True
            return False

    async def disable_alert(self, alert_id: str) -> bool:
        """Disable an alert"""
        async with self._lock:
            if alert_id in self.alerts:
                self.alerts[alert_id].enabled = False
                logger.info(f"Disabled price alert {alert_id}")
                return True
            return False

    def _on_price_update(self, data_point: RealTimeDataPoint):
        """Callback for real-time price updates"""
        asyncio.create_task(self._process_price_update(data_point))

    async def _process_price_update(self, data_point: RealTimeDataPoint):
        """Process price update and check alerts"""
        try:
            # Get alerts for this symbol
            alerts = await self.get_alerts_for_symbol(data_point.symbol)

            # Check each alert
            for alert in alerts:
                if not alert.enabled:
                    continue

                # Check if alert condition is met
                if self._check_alert_condition(alert, data_point):
                    await self._trigger_alert(alert, data_point)

        except Exception as e:
            logger.error(f"Error processing price update for {data_point.symbol}: {e}")

    def _check_alert_condition(
        self, alert: PriceAlert, data_point: RealTimeDataPoint
    ) -> bool:
        """Check if an alert condition is met"""
        try:
            if alert.condition == AlertCondition.PRICE_ABOVE:
                return data_point.price >= alert.threshold
            elif alert.condition == AlertCondition.PRICE_BELOW:
                return data_point.price <= alert.threshold
            elif alert.condition == AlertCondition.PERCENTAGE_CHANGE_ABOVE:
                # Calculate percentage change from previous price
                # This is a simplified implementation - in practice, you'd need to track previous prices
                return data_point.change_percent >= alert.threshold
            elif alert.condition == AlertCondition.PERCENTAGE_CHANGE_BELOW:
                return data_point.change_percent <= alert.threshold
            elif alert.condition == AlertCondition.VOLUME_ABOVE:
                return data_point.volume >= alert.threshold
            else:
                logger.warning(f"Unknown alert condition: {alert.condition}")
                return False
        except Exception as e:
            logger.error(f"Error checking alert condition for {alert.id}: {e}")
            return False

    async def _trigger_alert(self, alert: PriceAlert, data_point: RealTimeDataPoint):
        """Trigger an alert and send notifications"""
        try:
            # Update alert statistics
            alert.last_triggered = datetime.now()
            alert.trigger_count += 1

            # Create notification
            if alert.condition == AlertCondition.PRICE_ABOVE:
                message = f"{alert.symbol}の価格が{alert.threshold}円以上になりました（現在{data_point.price}円）"
            elif alert.condition == AlertCondition.PRICE_BELOW:
                message = f"{alert.symbol}の価格が{alert.threshold}円以下になりました（現在{data_point.price}円）"
            elif alert.condition == AlertCondition.PERCENTAGE_CHANGE_ABOVE:
                message = f"{alert.symbol}の価格変動が{alert.threshold}%以上になりました（現在{data_point.change_percent}%）"
            elif alert.condition == AlertCondition.PERCENTAGE_CHANGE_BELOW:
                message = f"{alert.symbol}の価格変動が{alert.threshold}%以下になりました（現在{data_point.change_percent}%）"
            elif alert.condition == AlertCondition.VOLUME_ABOVE:
                message = f"{alert.symbol}の取引量が{alert.threshold}を超えました（現在{data_point.volume}）"
            else:
                message = f"{alert.symbol}のアラートが発生しました"

            notification = AlertNotification(
                alert_id=alert.id,
                symbol=alert.symbol,
                condition=alert.condition,
                threshold=alert.threshold,
                current_value=self._get_current_value(alert.condition, data_point),
                triggered_at=datetime.now(),
                message=message,
            )

            # Send notifications
            await self._send_notifications(alert, notification)

            logger.info(f"Alert triggered: {alert.id} for {alert.symbol}")

        except Exception as e:
            logger.error(f"Error triggering alert {alert.id}: {e}")

    def _get_current_value(
        self, condition: AlertCondition, data_point: RealTimeDataPoint
    ) -> float:
        """Get current value based on alert condition"""
        if condition in [AlertCondition.PRICE_ABOVE, AlertCondition.PRICE_BELOW]:
            return data_point.price
        elif condition in [
            AlertCondition.PERCENTAGE_CHANGE_ABOVE,
            AlertCondition.PERCENTAGE_CHANGE_BELOW,
        ]:
            return data_point.change_percent
        elif condition == AlertCondition.VOLUME_ABOVE:
            return data_point.volume
        else:
            return 0.0

    async def _send_notifications(
        self, alert: PriceAlert, notification: AlertNotification
    ):
        """Send notifications through configured channels"""
        try:
            for channel in alert.notification_channels:
                if channel == "websocket":
                    # Send to WebSocket clients
                    await self._send_websocket_notification(notification)
                elif channel == "email":
                    # Send email notification (implementation not shown)
                    await self._send_email_notification(notification)
                elif channel == "sms":
                    # Send SMS notification (implementation not shown)
                    await self._send_sms_notification(notification)
                else:
                    logger.warning(f"Unknown notification channel: {channel}")
        except Exception as e:
            logger.error(f"Error sending notifications for alert {alert.id}: {e}")

    async def _send_websocket_notification(self, notification: AlertNotification):
        """Send notification via WebSocket"""
        try:
            # Broadcast to all clients subscribed to this symbol
            await websocket_manager.broadcast_to_channel(
                f"alerts.{notification.symbol}", asdict(notification), "alert"
            )

            # Also send to general alerts channel
            await websocket_manager.broadcast_to_channel(
                "alerts", asdict(notification), "alert"
            )

            logger.info(
                f"Sent WebSocket notification for alert {notification.alert_id}"
            )
        except Exception as e:
            logger.error(f"Error sending WebSocket notification: {e}")

    async def _send_email_notification(self, notification: AlertNotification):
        """Send notification via email (placeholder)"""
        # Implementation would use an email service
        logger.info(f"Sent email notification for alert {notification.alert_id}")

    async def _send_sms_notification(self, notification: AlertNotification):
        """Send notification via SMS (placeholder)"""
        # Implementation would use an SMS service
        logger.info(f"Sent SMS notification for alert {notification.alert_id}")

    async def start_monitoring(self):
        """Start monitoring for alerts"""
        self.is_monitoring = True
        logger.info("Price alert monitoring started")

    async def stop_monitoring(self):
        """Stop monitoring for alerts"""
        self.is_monitoring = False
        logger.info("Price alert monitoring stopped")

    def get_alert_stats(self) -> Dict[str, Any]:
        """Get alert system statistics"""
        async with self._lock:
            total_alerts = len(self.alerts)
            enabled_alerts = sum(1 for alert in self.alerts.values() if alert.enabled)
            triggered_alerts = sum(
                alert.trigger_count for alert in self.alerts.values()
            )

            return {
                "total_alerts": total_alerts,
                "enabled_alerts": enabled_alerts,
                "triggered_alerts": triggered_alerts,
                "symbols_monitored": len(self.symbol_alerts),
            }


# Global price alert system instance
_price_alert_system: Optional[PriceAlertSystem] = None
_alert_system_lock = asyncio.Lock()


async def get_price_alert_system(
    realtime_provider: Optional[RealTimeDataProvider] = None,
) -> PriceAlertSystem:
    """Get global price alert system instance"""
    global _price_alert_system

    async with _alert_system_lock:
        if _price_alert_system is None:
            if realtime_provider is None:
                from ..services.realtime_provider import get_realtime_provider

                realtime_provider = await get_realtime_provider()
            _price_alert_system = PriceAlertSystem(realtime_provider)
        return _price_alert_system


async def cleanup_price_alert_system():
    """Cleanup global price alert system instance"""
    global _price_alert_system

    async with _alert_system_lock:
        if _price_alert_system:
            await _price_alert_system.stop_monitoring()
            _price_alert_system = None
