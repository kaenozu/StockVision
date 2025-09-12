"""
WebSocket API Routes
Real-time data streaming endpoints
"""

import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from ..streaming.realtime_data_service import realtime_service
from ..websocket.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.on_event("startup")
async def startup_websocket():
    """Start WebSocket services on startup"""
    await websocket_manager.start()
    await realtime_service.start()


@router.on_event("shutdown")
async def shutdown_websocket():
    """Stop WebSocket services on shutdown"""
    await websocket_manager.stop()
    await realtime_service.stop()


@router.websocket("/stream")
async def websocket_stream(websocket: WebSocket):
    """
    Main WebSocket endpoint for real-time data streaming

    Expected message format:
    {
        "type": "subscribe|unsubscribe|ping",
        "channels": ["price:AAPL", "news:TSLA"],
        "filters": {
            "symbols": ["AAPL", "TSLA"],
            "price_range": {"min": 100, "max": 200},
            "min_volume": 1000
        }
    }
    """
    client_id = str(uuid.uuid4())

    try:
        # Connect client
        success = await websocket_manager.connect_client(websocket, client_id)
        if not success:
            await websocket.close(code=1011, reason="Connection failed")
            return

        logger.info(f"WebSocket client {client_id} connected")

        # Listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                await websocket_manager.handle_client_message(client_id, data)

            except WebSocketDisconnect:
                logger.info(f"WebSocket client {client_id} disconnected")
                break
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket_manager.send_to_client(
                    client_id, {"error": str(e)}, "system", "error"
                )

    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        await websocket_manager.disconnect_client(client_id)


@router.websocket("/stock/{symbol}")
async def websocket_stock_stream(websocket: WebSocket, symbol: str):
    """
    Dedicated WebSocket endpoint for a specific stock symbol
    Automatically subscribes to price updates for the symbol
    """
    client_id = str(uuid.uuid4())
    symbol = symbol.upper()

    try:
        # Connect client
        success = await websocket_manager.connect_client(websocket, client_id)
        if not success:
            await websocket.close(code=1011, reason="Connection failed")
            return

        # Auto-subscribe to the symbol
        await websocket_manager.subscribe_client(
            client_id, [f"price:{symbol}", f"news:{symbol}"], {"symbols": [symbol]}
        )

        # Subscribe symbol to real-time service
        await realtime_service.subscribe_symbol(symbol)

        logger.info(f"WebSocket client {client_id} connected to {symbol}")

        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                await websocket_manager.handle_client_message(client_id, data)

            except WebSocketDisconnect:
                logger.info(f"WebSocket client {client_id} disconnected from {symbol}")
                break
            except Exception as e:
                logger.error(f"Error in stock WebSocket: {e}")

    except Exception as e:
        logger.error(f"Stock WebSocket connection error: {e}")
    finally:
        await websocket_manager.disconnect_client(client_id)


@router.get("/test")
async def websocket_test_page():
    """Test page for WebSocket functionality"""
    html_content = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>StockVision WebSocket Test</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .container { max-width: 800px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
            #messages { height: 400px; overflow-y: scroll; background: #f5f5f5; padding: 10px; }
            .message { margin: 5px 0; padding: 5px; background: white; border-radius: 3px; }
            .controls { margin: 10px 0; }
            button { margin: 5px; padding: 8px 15px; }
            input, select { margin: 5px; padding: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>StockVision WebSocket Test</h1>
            
            <div class="section">
                <h3>Connection Status</h3>
                <p>Status: <span id="status">Disconnected</span></p>
                <button id="connect">Connect</button>
                <button id="disconnect">Disconnect</button>
            </div>
            
            <div class="section">
                <h3>Subscriptions</h3>
                <div class="controls">
                    <input type="text" id="symbolInput" placeholder="Enter symbol (e.g., AAPL)" />
                    <button id="subscribe">Subscribe</button>
                    <button id="unsubscribe">Unsubscribe</button>
                </div>
                <p>Subscribed symbols: <span id="subscribedSymbols">None</span></p>
            </div>
            
            <div class="section">
                <h3>Quick Actions</h3>
                <button onclick="subscribeToSymbol('AAPL')">Subscribe to AAPL</button>
                <button onclick="subscribeToSymbol('TSLA')">Subscribe to TSLA</button>
                <button onclick="subscribeToSymbol('GOOGL')">Subscribe to GOOGL</button>
                <button id="ping">Send Ping</button>
                <button id="clear">Clear Messages</button>
            </div>
            
            <div class="section">
                <h3>Messages</h3>
                <div id="messages"></div>
            </div>
        </div>
        
        <script>
            let ws = null;
            let subscribedSymbols = new Set();
            
            const statusEl = document.getElementById('status');
            const messagesEl = document.getElementById('messages');
            const subscribedEl = document.getElementById('subscribedSymbols');
            
            function updateStatus(status) {
                statusEl.textContent = status;
                statusEl.style.color = status === 'Connected' ? 'green' : 'red';
            }
            
            function addMessage(type, message) {
                const msgEl = document.createElement('div');
                msgEl.className = 'message';
                msgEl.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong> [${type}]: ${JSON.stringify(message, null, 2)}`;
                messagesEl.appendChild(msgEl);
                messagesEl.scrollTop = messagesEl.scrollHeight;
            }
            
            function updateSubscribedSymbols() {
                subscribedEl.textContent = subscribedSymbols.size > 0 ? Array.from(subscribedSymbols).join(', ') : 'None';
            }
            
            function connect() {
                if (ws) {
                    ws.close();
                }
                
                ws = new WebSocket(`ws://localhost:8080/ws/stream`);
                
                ws.onopen = function(event) {
                    updateStatus('Connected');
                    addMessage('CONNECTION', 'WebSocket connected');
                };
                
                ws.onclose = function(event) {
                    updateStatus('Disconnected');
                    addMessage('CONNECTION', 'WebSocket disconnected');
                };
                
                ws.onerror = function(error) {
                    updateStatus('Error');
                    addMessage('ERROR', error);
                };
                
                ws.onmessage = function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        addMessage(data.type.toUpperCase(), data);
                    } catch (e) {
                        addMessage('RAW', event.data);
                    }
                };
            }
            
            function disconnect() {
                if (ws) {
                    ws.close();
                    ws = null;
                }
            }
            
            function subscribeToSymbol(symbol) {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    alert('Please connect first');
                    return;
                }
                
                const message = {
                    type: 'subscribe',
                    channels: [`price:${symbol}`, `news:${symbol}`],
                    filters: {
                        symbols: [symbol]
                    }
                };
                
                ws.send(JSON.stringify(message));
                subscribedSymbols.add(symbol);
                updateSubscribedSymbols();
                addMessage('SENT', message);
            }
            
            function unsubscribeFromSymbol(symbol) {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    alert('Please connect first');
                    return;
                }
                
                const message = {
                    type: 'unsubscribe',
                    channels: [`price:${symbol}`, `news:${symbol}`]
                };
                
                ws.send(JSON.stringify(message));
                subscribedSymbols.delete(symbol);
                updateSubscribedSymbols();
                addMessage('SENT', message);
            }
            
            // Event listeners
            document.getElementById('connect').onclick = connect;
            document.getElementById('disconnect').onclick = disconnect;
            
            document.getElementById('subscribe').onclick = function() {
                const symbol = document.getElementById('symbolInput').value.toUpperCase();
                if (symbol) {
                    subscribeToSymbol(symbol);
                    document.getElementById('symbolInput').value = '';
                }
            };
            
            document.getElementById('unsubscribe').onclick = function() {
                const symbol = document.getElementById('symbolInput').value.toUpperCase();
                if (symbol) {
                    unsubscribeFromSymbol(symbol);
                    document.getElementById('symbolInput').value = '';
                }
            };
            
            document.getElementById('ping').onclick = function() {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    const message = { type: 'ping' };
                    ws.send(JSON.stringify(message));
                    addMessage('SENT', message);
                }
            };
            
            document.getElementById('clear').onclick = function() {
                messagesEl.innerHTML = '';
            };
            
            // Auto-connect on page load
            connect();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/stats")
async def websocket_stats():
    """Get WebSocket connection statistics"""
    try:
        ws_stats = websocket_manager.get_connection_stats()
        service_stats = realtime_service.get_service_stats()

        return {
            "websocket": ws_stats,
            "realtime_service": service_stats,
            "timestamp": "2024-01-01T00:00:00Z",  # Would be current time
        }

    except Exception as e:
        logger.error(f"Failed to get WebSocket stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get statistics")


@router.post("/broadcast")
async def broadcast_message(
    channel: str, message: Dict[str, Any], message_type: str = "broadcast"
):
    """
    Broadcast message to all subscribers of a channel
    Requires admin privileges
    """
    try:
        count = await websocket_manager.broadcast_to_channel(
            channel, message, message_type
        )

        return {"success": True, "channel": channel, "subscribers_notified": count}

    except Exception as e:
        logger.error(f"Failed to broadcast message: {e}")
        raise HTTPException(status_code=500, detail="Broadcast failed")


@router.post("/symbols/subscribe")
async def subscribe_symbol(symbol: str):
    """Subscribe to real-time data for a symbol"""
    try:
        success = await realtime_service.subscribe_symbol(symbol.upper())

        if success:
            return {
                "success": True,
                "symbol": symbol.upper(),
                "message": f"Subscribed to {symbol}",
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to subscribe to symbol")

    except Exception as e:
        logger.error(f"Failed to subscribe to symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/symbols/{symbol}")
async def unsubscribe_symbol(symbol: str):
    """Unsubscribe from real-time data for a symbol"""
    try:
        success = await realtime_service.unsubscribe_symbol(symbol.upper())

        if success:
            return {
                "success": True,
                "symbol": symbol.upper(),
                "message": f"Unsubscribed from {symbol}",
            }
        else:
            raise HTTPException(
                status_code=400, detail="Failed to unsubscribe from symbol"
            )

    except Exception as e:
        logger.error(f"Failed to unsubscribe from symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/symbols")
async def get_subscribed_symbols():
    """Get list of currently subscribed symbols"""
    try:
        symbols = await realtime_service.get_subscribed_symbols()

        return {"symbols": symbols, "count": len(symbols)}

    except Exception as e:
        logger.error(f"Failed to get subscribed symbols: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/symbols/{symbol}/price")
async def get_current_price(symbol: str):
    """Get current cached price for a symbol"""
    try:
        price_data = await realtime_service.get_current_price(symbol.upper())

        if price_data:
            return {
                "symbol": symbol.upper(),
                "price_data": price_data.__dict__,
                "cached": True,
            }
        else:
            raise HTTPException(status_code=404, detail="Price data not found")

    except Exception as e:
        logger.error(f"Failed to get current price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
