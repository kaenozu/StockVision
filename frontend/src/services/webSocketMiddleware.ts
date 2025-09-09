/**
 * Redux WebSocket Middleware for Real-time Stock Data
 * 
 * This middleware handles WebSocket connections for real-time stock data
 * and dispatches actions to update the Redux store.
 */

// import { Middleware, Action, Dispatch, AnyAction } from 'redux';
import { StockData, CurrentPriceResponse, PriceHistoryItem } from '../types/stock';

// Action types
export const WEBSOCKET_CONNECT = 'WEBSOCKET_CONNECT';
export const WEBSOCKET_DISCONNECT = 'WEBSOCKET_DISCONNECT';
export const WEBSOCKET_SEND = 'WEBSOCKET_SEND';
export const WEBSOCKET_MESSAGE = 'WEBSOCKET_MESSAGE';
export const WEBSOCKET_OPEN = 'WEBSOCKET_OPEN';
export const WEBSOCKET_CLOSE = 'WEBSOCKET_CLOSE';
export const WEBSOCKET_ERROR = 'WEBSOCKET_ERROR';

// Action interfaces
interface WebSocketConnectAction {
  type: typeof WEBSOCKET_CONNECT;
  payload: {
    url: string;
    stockCodes: string[];
  };
}

interface WebSocketDisconnectAction {
  type: typeof WEBSOCKET_DISCONNECT;
}

interface WebSocketSendAction {
  type: typeof WEBSOCKET_SEND;
  payload: any;
}

interface WebSocketMessageAction {
  type: typeof WEBSOCKET_MESSAGE;
  payload: any;
}

interface WebSocketOpenAction {
  type: typeof WEBSOCKET_OPEN;
}

interface WebSocketCloseAction {
  type: typeof WEBSOCKET_CLOSE;
}

interface WebSocketErrorAction {
  type: typeof WEBSOCKET_ERROR;
  payload: string;
}

// Union type for all WebSocket actions
export type WebSocketAction =
  | WebSocketConnectAction
  | WebSocketDisconnectAction
  | WebSocketSendAction
  | WebSocketMessageAction
  | WebSocketOpenAction
  | WebSocketCloseAction
  | WebSocketErrorAction;

// Action creators
export const connectWebSocket = (url: string, stockCodes: string[]): WebSocketConnectAction => ({
  type: WEBSOCKET_CONNECT,
  payload: { url, stockCodes }
});

export const disconnectWebSocket = (): WebSocketDisconnectAction => ({
  type: WEBSOCKET_DISCONNECT
});

export const sendWebSocketMessage = (message: any): WebSocketSendAction => ({
  type: WEBSOCKET_SEND,
  payload: message
});

export const receiveWebSocketMessage = (message: any): WebSocketMessageAction => ({
  type: WEBSOCKET_MESSAGE,
  payload: message
});

export const webSocketOpened = (): WebSocketOpenAction => ({
  type: WEBSOCKET_OPEN
});

export const webSocketClosed = (): WebSocketCloseAction => ({
  type: WEBSOCKET_CLOSE
});

export const webSocketError = (error: string): WebSocketErrorAction => ({
  type: WEBSOCKET_ERROR,
  payload: error
});

// Real-time stock data action types
export const REALTIME_PRICE_UPDATE = 'REALTIME_PRICE_UPDATE';
export const REALTIME_SUBSCRIBE = 'REALTIME_SUBSCRIBE';
export const REALTIME_UNSUBSCRIBE = 'REALTIME_UNSUBSCRIBE';

// Real-time stock data action interfaces
interface RealtimePriceUpdateAction {
  type: typeof REALTIME_PRICE_UPDATE;
  payload: {
    stockCode: string;
    priceData: {
      price: number;
      change: number;
      changePercent: number;
      volume: number;
      timestamp: string;
    };
  };
}

interface RealtimeSubscribeAction {
  type: typeof REALTIME_SUBSCRIBE;
  payload: {
    stockCode: string;
  };
}

interface RealtimeUnsubscribeAction {
  type: typeof REALTIME_UNSUBSCRIBE;
  payload: {
    stockCode: string;
  };
}

// Union type for real-time stock data actions
export type RealtimeStockAction =
  | RealtimePriceUpdateAction
  | RealtimeSubscribeAction
  | RealtimeUnsubscribeAction;

// Action creators for real-time stock data
export const updateRealtimePrice = (
  stockCode: string,
  priceData: {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: string;
  }
): RealtimePriceUpdateAction => ({
  type: REALTIME_PRICE_UPDATE,
  payload: {
    stockCode,
    priceData
  }
});

export const subscribeToRealtime = (stockCode: string): RealtimeSubscribeAction => ({
  type: REALTIME_SUBSCRIBE,
  payload: {
    stockCode
  }
});

export const unsubscribeFromRealtime = (stockCode: string): RealtimeUnsubscribeAction => ({
  type: REALTIME_UNSUBSCRIBE,
  payload: {
    stockCode
  }
});

// WebSocket connection state
interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  socket: WebSocket | null;
  subscriptions: Set<string>;
}

// Initial WebSocket state
const initialWebSocketState: WebSocketState = {
  connected: false,
  connecting: false,
  error: null,
  socket: null,
  subscriptions: new Set()
};

// WebSocket middleware
export const webSocketMiddleware: any = (store: any) => {
  let socket: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  let heartbeatInterval: NodeJS.Timeout | null = null;
  const maxReconnectAttempts = 10;
  const baseReconnectInterval = 1000; // 1 second base
  const maxReconnectInterval = 30000; // 30 seconds max
  const heartbeatIntervalMs = 30000; // 30 seconds
  
  // 指数バックオフ計算
  const getReconnectDelay = (attempt: number): number => {
    const delay = Math.min(baseReconnectInterval * Math.pow(2, attempt), maxReconnectInterval);
    return delay + Math.random() * 1000; // ジッターを追加
  };

  // ネットワーク状態監視
  const isOnline = (): boolean => {
    return navigator.onLine;
  };

  // ハートビート機能
  const startHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    heartbeatInterval = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatIntervalMs);
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  // ネットワーク状態変更の監視
  const handleOnline = () => {
    console.log('[WebSocket] Network connection restored');
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // 再接続を試行
      const state = store.getState();
      const lastAction = state.webSocket?.lastConnectAction;
      if (lastAction) {
        store.dispatch(connectWebSocket(lastAction.url, lastAction.stockCodes));
      }
    }
  };

  const handleOffline = () => {
    console.log('[WebSocket] Network connection lost');
    store.dispatch(webSocketError('Network connection lost'));
  };

  // イベントリスナーを追加
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }

  return (next: any) => (action: any) => {
    // Handle WebSocket actions
    switch (action.type) {
      case WEBSOCKET_CONNECT:
        // Clear any existing reconnect timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }

        // Close existing connection if any
        if (socket) {
          socket.close();
        }

        // Update state
        next({
          type: WEBSOCKET_CONNECT,
          payload: action.payload
        });

        // Connect to WebSocket server
        try {
          const { url, stockCodes } = action.payload;
          socket = new WebSocket(url);

          // Set up event handlers
          socket.onopen = () => {
            console.log('[WebSocket] Connected to server');
            store.dispatch(webSocketOpened());
            reconnectAttempts = 0;
            startHeartbeat();

            // Subscribe to stock codes
            if (stockCodes.length > 0) {
              socket?.send(JSON.stringify({
                type: 'subscribe',
                channels: stockCodes
              }));
            }
          };

          socket.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log('[WebSocket] Received message:', message);

              // Handle different message types
              switch (message.type) {
                case 'price_update':
                  // Dispatch real-time price update action
                  store.dispatch(updateRealtimePrice(
                    message.code,
                    {
                      price: message.price,
                      change: message.change,
                      changePercent: message.change_percent,
                      volume: message.volume,
                      timestamp: message.timestamp
                    }
                  ));
                  break;

                case 'subscription':
                  console.log('[WebSocket] Subscription confirmed:', message.data);
                  break;

                case 'pong':
                  // Handle heartbeat response
                  console.log('[WebSocket] Heartbeat pong received');
                  break;

                case 'error':
                  console.error('[WebSocket] Server error:', message);
                  store.dispatch(webSocketError(message.error || 'Unknown server error'));
                  break;

                default:
                  // Dispatch generic message action
                  store.dispatch(receiveWebSocketMessage(message));
              }
            } catch (error) {
              console.error('[WebSocket] Error parsing message:', error);
              store.dispatch(webSocketError('Failed to parse message'));
            }
          };

          socket.onclose = (event) => {
            console.log('[WebSocket] Connection closed:', event.reason);
            store.dispatch(webSocketClosed());
            stopHeartbeat();

            // Attempt to reconnect if not explicitly disconnected and network is online
            if (reconnectAttempts < maxReconnectAttempts && isOnline() && event.code !== 1000) {
              const delay = getReconnectDelay(reconnectAttempts);
              reconnectAttempts++;
              console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
              reconnectTimeout = setTimeout(() => {
                if (isOnline()) {
                  store.dispatch(connectWebSocket(action.payload.url, action.payload.stockCodes));
                } else {
                  console.log('[WebSocket] Skipping reconnect - offline');
                }
              }, delay);
            } else if (reconnectAttempts >= maxReconnectAttempts) {
              console.error('[WebSocket] Max reconnect attempts reached');
              store.dispatch(webSocketError('Max reconnect attempts reached'));
            }
          };

          socket.onerror = (error) => {
            console.error('[WebSocket] Connection error:', error);
            store.dispatch(webSocketError('Connection error'));
          };

        } catch (error) {
          console.error('[WebSocket] Connection failed:', error);
          store.dispatch(webSocketError('Connection failed'));
        }
        break;

      case WEBSOCKET_DISCONNECT:
        // Clear any existing reconnect timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }

        // Stop heartbeat
        stopHeartbeat();

        // Close connection
        if (socket) {
          socket.close(1000, 'Client disconnect'); // Clean closure
          socket = null;
        }

        // Reset reconnect attempts
        reconnectAttempts = 0;

        // Update state
        next(action);
        break;

      case WEBSOCKET_SEND:
        // Send message through WebSocket
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(action.payload));
        } else {
          console.warn('[WebSocket] Cannot send message - not connected');
          store.dispatch(webSocketError('Not connected'));
        }
        break;

      case REALTIME_SUBSCRIBE:
        // Subscribe to a stock code
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'subscribe',
            channels: [action.payload.stockCode]
          }));
        }
        break;

      case REALTIME_UNSUBSCRIBE:
        // Unsubscribe from a stock code
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'unsubscribe',
            channels: [action.payload.stockCode]
          }));
        }
        break;

      default:
        // Pass through all other actions
        return next(action);
    }
  };
};

// WebSocket reducer
export const webSocketReducer = (state: WebSocketState = initialWebSocketState, action: WebSocketAction): WebSocketState => {
  switch (action.type) {
    case WEBSOCKET_CONNECT:
      return {
        ...state,
        connecting: true,
        error: null
      };

    case WEBSOCKET_OPEN:
      return {
        ...state,
        connected: true,
        connecting: false,
        error: null
      };

    case WEBSOCKET_CLOSE:
      return {
        ...state,
        connected: false,
        connecting: false
      };

    case WEBSOCKET_ERROR:
      return {
        ...state,
        connecting: false,
        error: action.payload
      };

    default:
      return state;
  }
};

// Real-time stock data reducer
interface RealtimeStockState {
  prices: Record<string, {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: string;
  }>;
}

const initialRealtimeStockState: RealtimeStockState = {
  prices: {}
};

export const realtimeStockReducer = (state: RealtimeStockState = initialRealtimeStockState, action: RealtimeStockAction): RealtimeStockState => {
  switch (action.type) {
    case REALTIME_PRICE_UPDATE:
      return {
        ...state,
        prices: {
          ...state.prices,
          [action.payload.stockCode]: action.payload.priceData
        }
      };

    default:
      return state;
  }
};

// Selectors
export const getWebSocketState = (state: any): WebSocketState => state.webSocket;
export const getRealtimePrices = (state: any): RealtimeStockState['prices'] => state.realtimeStock.prices;
export const getRealtimePrice = (state: any, stockCode: string) => state.realtimeStock.prices[stockCode];