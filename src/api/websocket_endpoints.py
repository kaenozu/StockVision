"""
WebSocket APIエンドポイント

リアルタイム株価配信用のWebSocketエンドポイントとHTTP管理API
"""
import asyncio
import logging
import uuid
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..websocket.stock_websocket import stock_websocket_manager, StockPriceUpdate, MessageType, SubscriptionType
from ..services.stock_service import get_stock_service
from ..config import get_settings

router = APIRouter(prefix="/ws", tags=["WebSocket"])
logger = logging.getLogger(__name__)


class WebSocketStatsResponse(BaseModel):
    """WebSocket統計レスポンス"""
    total_connections: int
    active_connections: int
    total_messages_sent: int
    total_errors: int
    uptime_seconds: float
    subscriptions: Dict[str, Any]
    price_data: Dict[str, Any]


class BroadcastRequest(BaseModel):
    """ブロードキャスト要求"""
    stock_codes: List[str]
    message: Optional[str] = None


# ===== WebSocketエンドポイント =====

@router.websocket("/stock-prices")
async def stock_prices_websocket(websocket: WebSocket):
    """
    リアルタイム株価WebSocketエンドポイント
    
    クライアントは以下のメッセージタイプを送信できます:
    - subscribe: 銘柄または配信タイプを購読
    - unsubscribe: 購読解除
    - heartbeat: 接続維持
    
    サーバーは以下のメッセージタイプを送信します:
    - price_update: 株価更新
    - market_status: 市場状況
    - heartbeat: ハートビート
    - connection_status: 接続状況
    - error: エラー情報
    """
    client_id = str(uuid.uuid4())
    
    try:
        # クライアント接続
        success = await stock_websocket_manager.connect_client(websocket, client_id)
        if not success:
            await websocket.close(code=1011, reason="Connection failed")
            return
            
        logger.info(f"WebSocket client {client_id} connected")
        
        # メッセージループ
        while True:
            try:
                # クライアントからのメッセージを待機
                data = await websocket.receive_text()
                
                # メッセージを処理
                await stock_websocket_manager.handle_client_message(client_id, data)
                
            except WebSocketDisconnect:
                logger.info(f"WebSocket client {client_id} disconnected normally")
                break
            except Exception as e:
                logger.error(f"Error handling WebSocket message from {client_id}: {e}")
                await stock_websocket_manager.send_error_to_client(
                    client_id,
                    "Message handling error",
                    "Failed to process your message"
                )
                
    except Exception as e:
        logger.error(f"WebSocket connection error for client {client_id}: {e}")
    finally:
        # クライアント切断処理
        await stock_websocket_manager.disconnect_client(client_id)


# ===== HTTP管理API =====

@router.get("/stats",
           response_model=WebSocketStatsResponse,
           summary="WebSocket統計情報取得",
           description="WebSocketサーバーの統計情報と現在の接続状況を取得")
async def get_websocket_stats():
    """
    WebSocketサーバーの統計情報を取得
    
    Returns:
        WebSocketStatsResponse: 接続数、メッセージ数、購読情報など
    """
    stats = stock_websocket_manager.get_stats()
    return WebSocketStatsResponse(**stats)


@router.post("/broadcast/price-update",
             summary="株価更新のブロードキャスト",
             description="指定銘柄の最新株価を取得してWebSocketクライアントにブロードキャスト")
async def broadcast_price_update(
    request: BroadcastRequest,
    force_update: bool = Query(False, description="強制更新（キャッシュを無視）")
):
    """
    株価更新をブロードキャスト
    
    Args:
        request: ブロードキャスト要求（銘柄コードリスト）
        force_update: 強制更新フラグ
    
    Returns:
        Dict: ブロードキャスト結果
    """
    try:
        stock_service = await get_stock_service()
        broadcast_count = 0
        errors = []
        
        for stock_code in request.stock_codes:
            try:
                # 株価データを取得
                current_price_data = await stock_service.get_current_price(
                    stock_code, 
                    use_real_data=not force_update
                )
                
                if current_price_data:
                    # WebSocket形式に変換
                    price_update = StockPriceUpdate(
                        stock_code=stock_code,
                        current_price=current_price_data.current_price,
                        price_change=current_price_data.price_change,
                        price_change_pct=current_price_data.price_change_pct,
                        volume=getattr(current_price_data, 'volume', 0),
                        market_status=current_price_data.market_status,
                        timestamp=current_price_data.timestamp,
                        previous_close=current_price_data.previous_close
                    )
                    
                    # ブロードキャスト
                    await stock_websocket_manager.broadcast_price_update(
                        stock_code, 
                        price_update
                    )
                    broadcast_count += 1
                    
                else:
                    errors.append(f"No data available for {stock_code}")
                    
            except Exception as e:
                logger.error(f"Failed to broadcast price for {stock_code}: {e}")
                errors.append(f"Error with {stock_code}: {str(e)}")
                
        return {
            "success": True,
            "broadcast_count": broadcast_count,
            "requested_count": len(request.stock_codes),
            "errors": errors,
            "message": request.message
        }
        
    except Exception as e:
        logger.error(f"Broadcast error: {e}")
        raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")


@router.post("/broadcast/market-status",
             summary="市場状況のブロードキャスト",
             description="市場状況情報をWebSocketクライアントにブロードキャスト")
async def broadcast_market_status(
    status: str = Query(..., description="市場状況 (open, closed, pre_market, after_market)"),
    message: Optional[str] = Query(None, description="追加メッセージ")
):
    """
    市場状況をブロードキャスト
    
    Args:
        status: 市場状況
        message: 追加メッセージ
    
    Returns:
        Dict: ブロードキャスト結果
    """
    try:
        status_data = {
            "market_status": status,
            "timestamp": stock_websocket_manager.stats["uptime_start"].isoformat(),
            "message": message or f"Market status: {status}"
        }
        
        await stock_websocket_manager.broadcast_market_status(status_data)
        
        return {
            "success": True,
            "status": status,
            "message": message,
            "subscriber_count": len(
                stock_websocket_manager.type_subscribers.get(
                    SubscriptionType.MARKET_STATUS, 
                    set()
                )
            )
        }
        
    except Exception as e:
        logger.error(f"Market status broadcast error: {e}")
        raise HTTPException(status_code=500, detail=f"Broadcast failed: {str(e)}")


@router.get("/connections",
           summary="アクティブ接続一覧",
           description="現在アクティブなWebSocket接続の情報を取得")
async def get_active_connections():
    """
    アクティブなWebSocket接続の情報を取得
    
    Returns:
        Dict: 接続情報リスト
    """
    connections = []
    
    for client_id, conn_info in stock_websocket_manager.connections.items():
        connections.append({
            "client_id": client_id,
            "connected_at": conn_info.connected_at.isoformat(),
            "last_heartbeat": conn_info.last_heartbeat.isoformat(),
            "ip_address": conn_info.ip_address,
            "user_agent": conn_info.user_agent,
            "subscription_count": len(conn_info.subscriptions),
            "subscription_types": [t.value for t in conn_info.subscription_types],
            "message_count": conn_info.message_count,
            "error_count": conn_info.error_count
        })
        
    return {
        "active_connections": len(connections),
        "connections": connections
    }


@router.get("/subscriptions",
           summary="購読情報取得",
           description="現在の銘柄別・タイプ別購読情報を取得")
async def get_subscription_info():
    """
    購読情報を取得
    
    Returns:
        Dict: 購読統計と詳細情報
    """
    # 銘柄別購読情報
    stock_subscriptions = {}
    for stock_code, subscribers in stock_websocket_manager.stock_subscribers.items():
        if subscribers:  # 空でないもののみ
            stock_subscriptions[stock_code] = {
                "subscriber_count": len(subscribers),
                "subscribers": list(subscribers)
            }
    
    # タイプ別購読情報
    type_subscriptions = {}
    for sub_type, subscribers in stock_websocket_manager.type_subscribers.items():
        if subscribers:  # 空でないもののみ
            type_subscriptions[sub_type.value] = {
                "subscriber_count": len(subscribers),
                "subscribers": list(subscribers)
            }
    
    return {
        "stock_subscriptions": stock_subscriptions,
        "type_subscriptions": type_subscriptions,
        "summary": {
            "total_stock_subscriptions": len(stock_subscriptions),
            "total_type_subscriptions": len(type_subscriptions),
            "most_subscribed_stock": max(
                stock_subscriptions.keys(),
                key=lambda k: stock_subscriptions[k]["subscriber_count"]
            ) if stock_subscriptions else None
        }
    }


@router.post("/start",
            summary="WebSocketサーバー開始",
            description="WebSocketサーバーを開始（通常は自動的に開始されます）")
async def start_websocket_server():
    """
    WebSocketサーバーを開始
    
    Returns:
        Dict: 開始結果
    """
    try:
        if stock_websocket_manager.is_broadcasting:
            return {
                "success": True,
                "message": "WebSocket server is already running",
                "status": "running"
            }
            
        await stock_websocket_manager.start()
        
        return {
            "success": True,
            "message": "WebSocket server started successfully",
            "status": "running"
        }
        
    except Exception as e:
        logger.error(f"Failed to start WebSocket server: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start server: {str(e)}")


@router.post("/stop",
            summary="WebSocketサーバー停止",
            description="WebSocketサーバーを停止（全接続が切断されます）")
async def stop_websocket_server():
    """
    WebSocketサーバーを停止
    
    Returns:
        Dict: 停止結果
    """
    try:
        if not stock_websocket_manager.is_broadcasting:
            return {
                "success": True,
                "message": "WebSocket server is not running",
                "status": "stopped"
            }
            
        await stock_websocket_manager.stop()
        
        return {
            "success": True,
            "message": "WebSocket server stopped successfully",
            "status": "stopped"
        }
        
    except Exception as e:
        logger.error(f"Failed to stop WebSocket server: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop server: {str(e)}")


@router.get("/health",
           summary="WebSocketサーバーヘルスチェック",
           description="WebSocketサーバーの稼働状況とヘルス情報を取得")
async def websocket_health_check():
    """
    WebSocketサーバーのヘルス状況を取得
    
    Returns:
        Dict: ヘルス情報
    """
    try:
        stats = stock_websocket_manager.get_stats()
        
        # ヘルス判定
        is_healthy = (
            stock_websocket_manager.is_broadcasting and
            stats.get("total_errors", 0) < 100 and  # エラー数が100未満
            stats.get("active_connections", 0) >= 0  # 接続数が正常
        )
        
        return {
            "healthy": is_healthy,
            "status": "running" if stock_websocket_manager.is_broadcasting else "stopped",
            "uptime_seconds": stats.get("uptime_seconds", 0),
            "active_connections": stats.get("active_connections", 0),
            "total_messages_sent": stats.get("total_messages_sent", 0),
            "total_errors": stats.get("total_errors", 0),
            "error_rate": (
                stats.get("total_errors", 0) / max(1, stats.get("total_messages_sent", 1))
            ),
            "checks": {
                "server_running": stock_websocket_manager.is_broadcasting,
                "low_error_rate": stats.get("total_errors", 0) < 100,
                "background_tasks_running": (
                    stock_websocket_manager.broadcast_task is not None and
                    not stock_websocket_manager.broadcast_task.done()
                )
            }
        }
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "healthy": False,
            "status": "error",
            "error": str(e)
        }