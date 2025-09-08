"""
Stock Data Streaming WebSocket API

This module provides WebSocket endpoints for real-time stock data streaming:
- WebSocket /ws/stocks - リアルタイム株価データストリーミング
- Supports subscription to specific stock codes
- Broadcasts real-time price updates
"""

import logging
import asyncio
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, Path

from ..websocket.websocket_manager import websocket_manager
from ..services.stock_service import get_stock_service
from ..stock_api.data_models import StockCode
from ..config import should_use_real_data

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["WebSocket"])

# Client ID counter
client_counter = 0

@router.websocket("/stocks")
async def websocket_stocks_endpoint(
    websocket: WebSocket,
    stock_codes: str = Query(..., description="カンマ区切りの銘柄コードリスト (例: 7203,9984)")
):
    """リアルタイム株価データストリーミング用WebSocketエンドポイント
    
    Args:
        websocket: WebSocket接続
        stock_codes: カンマ区切りの銘柄コードリスト
    """
    global client_counter
    client_counter += 1
    client_id = f"client_{client_counter}_{websocket.client.host}"
    
    try:
        # Connect client
        if not await websocket_manager.connect_client(websocket, client_id):
            await websocket.close()
            return
            
        # Parse stock codes
        codes = [code.strip() for code in stock_codes.split(",") if code.strip()]
        
        # Validate stock codes
        for code in codes:
            try:
                StockCode(code=code)
            except ValueError as e:
                await websocket_manager.send_to_client(
                    client_id, 
                    {"error": f"Invalid stock code {code}: {str(e)}"}, 
                    "error"
                )
                await websocket_manager.disconnect_client(client_id)
                return
        
        # Subscribe to channels
        await websocket_manager.subscribe_client(client_id, codes)
        
        # Send subscription confirmation
        await websocket_manager.send_to_client(
            client_id,
            {
                "message": f"Subscribed to stock codes: {', '.join(codes)}",
                "timestamp": datetime.now().isoformat()
            },
            "subscription"
        )
        
        # Start streaming data
        await stream_stock_data(client_id, codes)
        
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in WebSocket connection for {client_id}: {e}")
        await websocket_manager.disconnect_client(client_id)
    finally:
        await websocket_manager.disconnect_client(client_id)

async def stream_stock_data(client_id: str, stock_codes: List[str]):
    """Stream real-time stock data to connected client
    
    Args:
        client_id: Client identifier
        stock_codes: List of stock codes to stream
    """
    try:
        stock_service = await get_stock_service()
        
        while True:
            # Get current prices for all subscribed stocks
            for code in stock_codes:
                try:
                    # Get real-time price (this could be replaced with actual streaming logic)
                    current_price = await stock_service.get_current_price(
                        stock_code=code,
                        use_real_data=should_use_real_data(None)  # Use environment setting
                    )
                    
                    # Send data to client
                    await websocket_manager.send_to_client(
                        client_id,
                        {
                            "code": code,
                            "price": current_price.price,
                            "change": current_price.change,
                            "change_percent": current_price.change_percent,
                            "volume": current_price.volume,
                            "timestamp": datetime.now().isoformat()
                        },
                        code,
                        "price_update"
                    )
                    
                except Exception as e:
                    logger.error(f"Error getting price for {code}: {e}")
                    await websocket_manager.send_to_client(
                        client_id,
                        {"error": f"Failed to get price for {code}", "code": code},
                        "error"
                    )
            
            # Wait before next update (simulating real-time updates)
            await asyncio.sleep(5)  # Update every 5 seconds
            
    except Exception as e:
        logger.error(f"Error in stock data streaming for {client_id}: {e}")
        raise

@router.websocket("/stocks/{stock_code}")
async def websocket_single_stock_endpoint(
    websocket: WebSocket,
    stock_code: str = Path(..., pattern=r"^[0-9]{4}$", example="7203")
):
    """単一銘柄のリアルタイム株価データストリーミング用WebSocketエンドポイント
    
    Args:
        websocket: WebSocket接続
        stock_code: 4桁の銘柄コード
    """
    global client_counter
    client_counter += 1
    client_id = f"client_{client_counter}_{websocket.client.host}"
    
    try:
        # Validate stock code
        StockCode(code=stock_code)
        
        # Connect client
        if not await websocket_manager.connect_client(websocket, client_id):
            await websocket.close()
            return
            
        # Subscribe to channel
        await websocket_manager.subscribe_client(client_id, [stock_code])
        
        # Send subscription confirmation
        await websocket_manager.send_to_client(
            client_id,
            {
                "message": f"Subscribed to stock code: {stock_code}",
                "timestamp": datetime.now().isoformat()
            },
            "subscription"
        )
        
        # Start streaming data
        await stream_stock_data(client_id, [stock_code])
        
    except ValueError as e:
        await websocket_manager.send_to_client(
            client_id, 
            {"error": f"Invalid stock code {stock_code}: {str(e)}"}, 
            "error"
        )
        await websocket.close()
    except WebSocketDisconnect:
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"Error in WebSocket connection for {client_id}: {e}")
        await websocket_manager.disconnect_client(client_id)
    finally:
        await websocket_manager.disconnect_client(client_id)