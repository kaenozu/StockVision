"""
リアルタイム株価WebSocketサーバー

WebSocketを使用して株価データをリアルタイムでクライアントに配信
購読管理、接続管理、エラーハンドリングを含む包括的なWebSocketシステム
"""
import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Set, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field
from collections import defaultdict, deque

from ..services.stock_service import get_stock_service, HybridStockService
from ..config import get_settings


class MessageType(Enum):
    """WebSocketメッセージタイプ"""
    SUBSCRIBE = "subscribe"
    UNSUBSCRIBE = "unsubscribe"
    PRICE_UPDATE = "price_update"
    MARKET_STATUS = "market_status"
    ERROR = "error"
    HEARTBEAT = "heartbeat"
    CONNECTION_STATUS = "connection_status"
    BULK_UPDATE = "bulk_update"


class SubscriptionType(Enum):
    """購読タイプ"""
    REAL_TIME_PRICE = "real_time_price"    # リアルタイム価格
    MARKET_STATUS = "market_status"        # 市場状況
    WATCHLIST = "watchlist"               # ウォッチリスト
    ALL_STOCKS = "all_stocks"             # 全銘柄


@dataclass
class StockPriceUpdate:
    """株価更新データ"""
    stock_code: str
    current_price: float
    price_change: float
    price_change_pct: float
    volume: int
    market_status: str
    timestamp: str
    previous_close: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class WebSocketMessage:
    """WebSocketメッセージ"""
    type: str
    data: Any
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    def to_json(self) -> str:
        return json.dumps({
            "type": self.type,
            "data": self.data,
            "timestamp": self.timestamp,
            "message_id": self.message_id
        }, ensure_ascii=False)


class ConnectionInfo:
    """接続情報"""
    def __init__(self, websocket: WebSocket, client_id: str):
        self.websocket = websocket
        self.client_id = client_id
        self.connected_at = datetime.now()
        self.last_heartbeat = datetime.now()
        self.subscriptions: Set[str] = set()
        self.subscription_types: Set[SubscriptionType] = set()
        self.user_agent = ""
        self.ip_address = ""
        self.message_count = 0
        self.error_count = 0
        
    def is_expired(self, timeout_minutes: int = 30) -> bool:
        """接続がタイムアウトしているかチェック"""
        return datetime.now() - self.last_heartbeat > timedelta(minutes=timeout_minutes)
    
    def update_heartbeat(self):
        """ハートビート更新"""
        self.last_heartbeat = datetime.now()


class StockWebSocketManager:
    """株価WebSocket管理システム"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.settings = get_settings()
        
        # 接続管理
        self.connections: Dict[str, ConnectionInfo] = {}
        self.stock_subscribers: Dict[str, Set[str]] = defaultdict(set)  # stock_code -> client_ids
        self.type_subscribers: Dict[SubscriptionType, Set[str]] = defaultdict(set)
        
        # データ管理
        self.last_prices: Dict[str, StockPriceUpdate] = {}
        self.price_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # 配信制御
        self.broadcast_queue: asyncio.Queue = asyncio.Queue()
        self.is_broadcasting = False
        self.broadcast_task: Optional[asyncio.Task] = None
        
        # レート制限
        self.client_message_counts: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.rate_limit_per_minute = 60
        
        # 統計
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "total_messages_sent": 0,
            "total_errors": 0,
            "uptime_start": datetime.now()
        }
        
        # バックグラウンドタスク
        self.cleanup_task: Optional[asyncio.Task] = None
        self.heartbeat_task: Optional[asyncio.Task] = None
        self.stock_service: Optional[HybridStockService] = None
        
    async def start(self):
        """WebSocket管理システムを開始"""
        self.logger.info("Starting WebSocket manager")
        
        # 株価サービスを取得
        self.stock_service = await get_stock_service()
        
        # バックグラウンドタスクを開始
        self.broadcast_task = asyncio.create_task(self._broadcast_loop())
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        
        self.is_broadcasting = True
        self.logger.info("WebSocket manager started successfully")
        
    async def stop(self):
        """WebSocket管理システムを停止"""
        self.logger.info("Stopping WebSocket manager")
        
        self.is_broadcasting = False
        
        # 全ての接続を閉じる
        for client_id, conn_info in list(self.connections.items()):
            await self.disconnect_client(client_id, code=1001, reason="Server shutdown")
            
        # バックグラウンドタスクを停止
        if self.broadcast_task:
            self.broadcast_task.cancel()
        if self.cleanup_task:
            self.cleanup_task.cancel()
        if self.heartbeat_task:
            self.heartbeat_task.cancel()
            
        self.logger.info("WebSocket manager stopped")
        
    async def connect_client(self, websocket: WebSocket, client_id: str) -> bool:
        """クライアント接続"""
        try:
            await websocket.accept()
            
            # 接続情報を作成
            conn_info = ConnectionInfo(websocket, client_id)
            conn_info.ip_address = websocket.client.host if websocket.client else "unknown"
            
            # User-Agentを取得（利用可能な場合）
            headers = getattr(websocket, 'headers', {})
            conn_info.user_agent = headers.get('user-agent', 'unknown')
            
            self.connections[client_id] = conn_info
            
            # 統計更新
            self.stats["total_connections"] += 1
            self.stats["active_connections"] = len(self.connections)
            
            # 接続確認メッセージを送信
            await self.send_message_to_client(
                client_id,
                MessageType.CONNECTION_STATUS,
                {
                    "status": "connected",
                    "client_id": client_id,
                    "server_time": datetime.now().isoformat(),
                    "supported_types": [t.value for t in SubscriptionType]
                }
            )
            
            self.logger.info(f"Client {client_id} connected from {conn_info.ip_address}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to connect client {client_id}: {e}")
            return False
            
    async def disconnect_client(self, client_id: str, code: int = 1000, reason: str = "Normal closure"):
        """クライアント切断"""
        if client_id not in self.connections:
            return
            
        conn_info = self.connections[client_id]
        
        try:
            # WebSocket接続を閉じる
            await conn_info.websocket.close(code=code, reason=reason)
        except Exception as e:
            self.logger.warning(f"Error closing websocket for client {client_id}: {e}")
            
        # 購読をクリーンアップ
        await self._cleanup_client_subscriptions(client_id)
        
        # 接続情報を削除
        del self.connections[client_id]
        
        # 統計更新
        self.stats["active_connections"] = len(self.connections)
        
        self.logger.info(f"Client {client_id} disconnected: {reason}")
        
    async def handle_client_message(self, client_id: str, message: str):
        """クライアントからのメッセージを処理"""
        if client_id not in self.connections:
            return
            
        conn_info = self.connections[client_id]
        
        # レート制限チェック
        if not self._check_rate_limit(client_id):
            await self.send_error_to_client(
                client_id, 
                "Rate limit exceeded", 
                "Too many messages per minute"
            )
            return
            
        try:
            data = json.loads(message)
            message_type = data.get("type")
            payload = data.get("data", {})
            
            conn_info.message_count += 1
            conn_info.update_heartbeat()
            
            # メッセージタイプ別処理
            if message_type == MessageType.SUBSCRIBE.value:
                await self._handle_subscribe(client_id, payload)
            elif message_type == MessageType.UNSUBSCRIBE.value:
                await self._handle_unsubscribe(client_id, payload)
            elif message_type == MessageType.HEARTBEAT.value:
                await self._handle_heartbeat(client_id)
            else:
                await self.send_error_to_client(
                    client_id,
                    "Unknown message type",
                    f"Unsupported message type: {message_type}"
                )
                
        except json.JSONDecodeError as e:
            await self.send_error_to_client(client_id, "Invalid JSON", str(e))
            conn_info.error_count += 1
        except Exception as e:
            self.logger.error(f"Error handling message from client {client_id}: {e}")
            await self.send_error_to_client(client_id, "Internal server error", "Please try again")
            conn_info.error_count += 1
            
    async def _handle_subscribe(self, client_id: str, payload: Dict[str, Any]):
        """購読要求を処理"""
        subscription_type = payload.get("subscription_type")
        stock_codes = payload.get("stock_codes", [])
        
        if subscription_type not in [t.value for t in SubscriptionType]:
            await self.send_error_to_client(
                client_id,
                "Invalid subscription type",
                f"Unsupported subscription type: {subscription_type}"
            )
            return
            
        conn_info = self.connections[client_id]
        sub_type = SubscriptionType(subscription_type)
        
        # 購読タイプを追加
        conn_info.subscription_types.add(sub_type)
        self.type_subscribers[sub_type].add(client_id)
        
        # 個別銘柄購読を処理
        if stock_codes:
            for stock_code in stock_codes:
                conn_info.subscriptions.add(stock_code)
                self.stock_subscribers[stock_code].add(client_id)
                
                # 既存の価格データがあれば送信
                if stock_code in self.last_prices:
                    await self.send_message_to_client(
                        client_id,
                        MessageType.PRICE_UPDATE,
                        self.last_prices[stock_code].to_dict()
                    )
        
        # 全銘柄購読の場合
        elif sub_type == SubscriptionType.ALL_STOCKS:
            # 既存の全価格データを送信
            for stock_code, price_data in self.last_prices.items():
                await self.send_message_to_client(
                    client_id,
                    MessageType.PRICE_UPDATE,
                    price_data.to_dict()
                )
        
        self.logger.info(f"Client {client_id} subscribed to {subscription_type} with {len(stock_codes)} stocks")
        
    async def _handle_unsubscribe(self, client_id: str, payload: Dict[str, Any]):
        """購読解除要求を処理"""
        subscription_type = payload.get("subscription_type")
        stock_codes = payload.get("stock_codes", [])
        
        if client_id not in self.connections:
            return
            
        conn_info = self.connections[client_id]
        
        if subscription_type:
            sub_type = SubscriptionType(subscription_type)
            conn_info.subscription_types.discard(sub_type)
            self.type_subscribers[sub_type].discard(client_id)
            
        # 個別銘柄購読解除
        for stock_code in stock_codes:
            conn_info.subscriptions.discard(stock_code)
            self.stock_subscribers[stock_code].discard(client_id)
            
        self.logger.info(f"Client {client_id} unsubscribed from {subscription_type}")
        
    async def _handle_heartbeat(self, client_id: str):
        """ハートビート処理"""
        if client_id in self.connections:
            self.connections[client_id].update_heartbeat()
            await self.send_message_to_client(
                client_id,
                MessageType.HEARTBEAT,
                {"status": "pong", "server_time": datetime.now().isoformat()}
            )
            
    async def broadcast_price_update(self, stock_code: str, price_data: StockPriceUpdate):
        """株価更新をブロードキャスト"""
        # 価格データを保存
        self.last_prices[stock_code] = price_data
        self.price_history[stock_code].append((datetime.now(), price_data.current_price))
        
        # ブロードキャストキューに追加
        await self.broadcast_queue.put({
            "type": "price_update",
            "stock_code": stock_code,
            "data": price_data
        })
        
    async def broadcast_market_status(self, status_data: Dict[str, Any]):
        """市場状況をブロードキャスト"""
        await self.broadcast_queue.put({
            "type": "market_status",
            "data": status_data
        })
        
    async def send_message_to_client(self, client_id: str, message_type: MessageType, data: Any):
        """個別クライアントにメッセージ送信"""
        if client_id not in self.connections:
            return
            
        conn_info = self.connections[client_id]
        
        try:
            message = WebSocketMessage(
                type=message_type.value,
                data=data
            )
            
            await conn_info.websocket.send_text(message.to_json())
            self.stats["total_messages_sent"] += 1
            
        except Exception as e:
            self.logger.error(f"Failed to send message to client {client_id}: {e}")
            await self.disconnect_client(client_id, code=1011, reason="Send error")
            
    async def send_error_to_client(self, client_id: str, error_type: str, message: str):
        """エラーメッセージを送信"""
        await self.send_message_to_client(
            client_id,
            MessageType.ERROR,
            {
                "error_type": error_type,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }
        )
        self.stats["total_errors"] += 1
        
    async def _broadcast_loop(self):
        """ブロードキャストループ"""
        try:
            while self.is_broadcasting:
                try:
                    # キューからメッセージを取得
                    broadcast_data = await asyncio.wait_for(
                        self.broadcast_queue.get(), timeout=1.0
                    )
                    
                    await self._process_broadcast(broadcast_data)
                    
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    self.logger.error(f"Error in broadcast loop: {e}")
                    await asyncio.sleep(1)
                    
        except asyncio.CancelledError:
            self.logger.info("Broadcast loop cancelled")
            
    async def _process_broadcast(self, broadcast_data: Dict[str, Any]):
        """ブロードキャストデータを処理"""
        broadcast_type = broadcast_data["type"]
        
        if broadcast_type == "price_update":
            stock_code = broadcast_data["stock_code"]
            price_data = broadcast_data["data"]
            
            # 該当銘柄の購読者に送信
            subscribers = self.stock_subscribers.get(stock_code, set()).copy()
            
            # 全銘柄購読者も追加
            subscribers.update(self.type_subscribers.get(SubscriptionType.ALL_STOCKS, set()))
            
            # 同時送信
            if subscribers:
                await asyncio.gather(*[
                    self.send_message_to_client(
                        client_id,
                        MessageType.PRICE_UPDATE,
                        price_data.to_dict()
                    )
                    for client_id in subscribers
                    if client_id in self.connections
                ], return_exceptions=True)
                
        elif broadcast_type == "market_status":
            status_data = broadcast_data["data"]
            
            # 市場状況購読者に送信
            subscribers = self.type_subscribers.get(SubscriptionType.MARKET_STATUS, set()).copy()
            
            if subscribers:
                await asyncio.gather(*[
                    self.send_message_to_client(
                        client_id,
                        MessageType.MARKET_STATUS,
                        status_data
                    )
                    for client_id in subscribers
                    if client_id in self.connections
                ], return_exceptions=True)
                
    async def _cleanup_loop(self):
        """クリーンアップループ"""
        try:
            while self.is_broadcasting:
                await asyncio.sleep(30)  # 30秒間隔
                
                # 期限切れ接続をクリーンアップ
                expired_clients = []
                for client_id, conn_info in self.connections.items():
                    if conn_info.is_expired():
                        expired_clients.append(client_id)
                        
                for client_id in expired_clients:
                    await self.disconnect_client(
                        client_id, 
                        code=1001, 
                        reason="Connection timeout"
                    )
                    
                # 空の購読セットをクリーンアップ
                for stock_code in list(self.stock_subscribers.keys()):
                    if not self.stock_subscribers[stock_code]:
                        del self.stock_subscribers[stock_code]
                        
        except asyncio.CancelledError:
            self.logger.info("Cleanup loop cancelled")
            
    async def _heartbeat_loop(self):
        """ハートビートループ"""
        try:
            while self.is_broadcasting:
                await asyncio.sleep(30)  # 30秒間隔
                
                # 全クライアントにハートビートを送信
                if self.connections:
                    await asyncio.gather(*[
                        self.send_message_to_client(
                            client_id,
                            MessageType.HEARTBEAT,
                            {"status": "ping", "server_time": datetime.now().isoformat()}
                        )
                        for client_id in list(self.connections.keys())
                    ], return_exceptions=True)
                    
        except asyncio.CancelledError:
            self.logger.info("Heartbeat loop cancelled")
            
    def _check_rate_limit(self, client_id: str) -> bool:
        """レート制限チェック"""
        now = time.time()
        client_messages = self.client_message_counts[client_id]
        
        # 1分以内のメッセージをフィルタ
        cutoff_time = now - 60  # 1分前
        while client_messages and client_messages[0] < cutoff_time:
            client_messages.popleft()
            
        # レート制限チェック
        if len(client_messages) >= self.rate_limit_per_minute:
            return False
            
        # 現在のタイムスタンプを追加
        client_messages.append(now)
        return True
        
    async def _cleanup_client_subscriptions(self, client_id: str):
        """クライアントの購読をクリーンアップ"""
        if client_id not in self.connections:
            return
            
        conn_info = self.connections[client_id]
        
        # 銘柄別購読をクリーンアップ
        for stock_code in conn_info.subscriptions:
            self.stock_subscribers[stock_code].discard(client_id)
            
        # タイプ別購読をクリーンアップ
        for sub_type in conn_info.subscription_types:
            self.type_subscribers[sub_type].discard(client_id)
            
    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""
        uptime_seconds = (datetime.now() - self.stats["uptime_start"]).total_seconds()
        
        return {
            **self.stats,
            "uptime_seconds": uptime_seconds,
            "subscriptions": {
                "total_stock_subscriptions": sum(len(subs) for subs in self.stock_subscribers.values()),
                "total_type_subscriptions": sum(len(subs) for subs in self.type_subscribers.values()),
                "unique_stocks_subscribed": len([s for s in self.stock_subscribers if self.stock_subscribers[s]]),
            },
            "price_data": {
                "total_stocks_tracked": len(self.last_prices),
                "total_price_history_points": sum(len(hist) for hist in self.price_history.values())
            }
        }


# グローバルWebSocketマネージャー
stock_websocket_manager = StockWebSocketManager()