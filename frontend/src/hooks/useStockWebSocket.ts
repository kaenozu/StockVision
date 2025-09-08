/**
 * WebSocket Hook for Real-time Stock Price Updates
 * 
 * リアルタイム株価更新のためのWebSocketカスタムフック
 * 接続管理、購読管理、メッセージハンドリングを提供
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// WebSocketメッセージタイプ定義
export enum MessageType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  HEARTBEAT = 'heartbeat',
  PRICE_UPDATE = 'price_update',
  MARKET_STATUS = 'market_status',
  CONNECTION_STATUS = 'connection_status',
  ERROR = 'error'
}

export enum SubscriptionType {
  STOCK = 'stock',
  MARKET_STATUS = 'market_status',
  ALL_STOCKS = 'all_stocks'
}

// 株価更新データ型
export interface StockPriceUpdate {
  stock_code: string;
  current_price: number;
  price_change: number;
  price_change_pct: number;
  volume: number;
  market_status: string;
  timestamp: string;
  previous_close: number;
}

// WebSocketメッセージ型
export interface WebSocketMessage {
  type: MessageType;
  data?: any;
  error?: string;
  timestamp?: string;
}

// フック設定オプション
export interface UseStockWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  onPriceUpdate?: (update: StockPriceUpdate) => void;
  onMarketStatusUpdate?: (status: any) => void;
}

// フック戻り値型
export interface UseStockWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectionCount: number;
  lastUpdate: Date | null;
  subscribedStocks: Set<string>;
  subscribedTypes: Set<SubscriptionType>;
  connect: () => void;
  disconnect: () => void;
  subscribe: (stockCode: string) => void;
  unsubscribe: (stockCode: string) => void;
  subscribeToType: (type: SubscriptionType) => void;
  unsubscribeFromType: (type: SubscriptionType) => void;
  sendMessage: (message: WebSocketMessage) => void;
}

const DEFAULT_WS_URL = 'ws://localhost:8000/ws/stock-prices';

export const useStockWebSocket = (
  wsUrl: string = DEFAULT_WS_URL,
  options: UseStockWebSocketOptions = {}
): UseStockWebSocketReturn => {
  const {
    autoConnect = false,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    onConnect,
    onDisconnect,
    onError,
    onPriceUpdate,
    onMarketStatusUpdate
  } = options;

  // 状態管理
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionCount, setConnectionCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [subscribedStocks, setSubscribedStocks] = useState<Set<string>>(new Set());
  const [subscribedTypes, setSubscribedTypes] = useState<Set<SubscriptionType>>(new Set());

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocketメッセージ送信
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          ...message,
          timestamp: new Date().toISOString()
        }));
      } catch (err) {
        console.error('Failed to send WebSocket message:', err);
        setError('メッセージ送信に失敗しました');
      }
    } else {
      console.warn('WebSocket is not connected');
      setError('WebSocketが接続されていません');
    }
  }, []);

  // ハートビート送信
  const sendHeartbeat = useCallback(() => {
    sendMessage({
      type: MessageType.HEARTBEAT,
      data: { client_timestamp: new Date().toISOString() }
    });
  }, [sendMessage]);

  // ハートビート開始
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (isConnected) {
        sendHeartbeat();
      }
    }, heartbeatInterval);
  }, [isConnected, heartbeatInterval, sendHeartbeat]);

  // ハートビート停止
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // WebSocket接続
  const connect = useCallback(() => {
    if (isConnecting || (wsRef.current?.readyState === WebSocket.OPEN)) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionCount(prev => prev + 1);
        reconnectAttemptsRef.current = 0;
        
        startHeartbeat();
        onConnect?.();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastUpdate(new Date());

          switch (message.type) {
            case MessageType.PRICE_UPDATE:
              if (message.data && onPriceUpdate) {
                onPriceUpdate(message.data as StockPriceUpdate);
              }
              break;

            case MessageType.MARKET_STATUS:
              if (message.data && onMarketStatusUpdate) {
                onMarketStatusUpdate(message.data);
              }
              break;

            case MessageType.CONNECTION_STATUS:
              console.log('Connection status:', message.data);
              break;

            case MessageType.ERROR:
              console.error('WebSocket error:', message.error);
              setError(message.error || 'Unknown error');
              onError?.(message.error || 'Unknown error');
              break;

            case MessageType.HEARTBEAT:
              // ハートビート応答は自動処理
              break;

            default:
              console.log('Unhandled message type:', message.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
          setError('メッセージの解析に失敗しました');
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        stopHeartbeat();
        onDisconnect?.();

        // 自動再接続
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${reconnectInterval}ms (attempt ${reconnectAttemptsRef.current})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          setError(`最大再接続試行回数（${maxReconnectAttempts}回）に達しました`);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket接続エラーが発生しました');
        setIsConnecting(false);
        onError?.('WebSocket接続エラーが発生しました');
      };

    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      setError('WebSocket接続の作成に失敗しました');
      setIsConnecting(false);
    }
  }, [wsUrl, isConnecting, reconnectInterval, maxReconnectAttempts, startHeartbeat, onConnect, onDisconnect, onError, onPriceUpdate, onMarketStatusUpdate]);

  // WebSocket切断
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    stopHeartbeat();
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    reconnectAttemptsRef.current = maxReconnectAttempts; // 再接続を停止
  }, [stopHeartbeat, maxReconnectAttempts]);

  // 銘柄購読
  const subscribe = useCallback((stockCode: string) => {
    sendMessage({
      type: MessageType.SUBSCRIBE,
      data: {
        subscription_type: SubscriptionType.STOCK,
        stock_code: stockCode
      }
    });
    
    setSubscribedStocks(prev => new Set(prev).add(stockCode));
  }, [sendMessage]);

  // 銘柄購読解除
  const unsubscribe = useCallback((stockCode: string) => {
    sendMessage({
      type: MessageType.UNSUBSCRIBE,
      data: {
        subscription_type: SubscriptionType.STOCK,
        stock_code: stockCode
      }
    });
    
    setSubscribedStocks(prev => {
      const newSet = new Set(prev);
      newSet.delete(stockCode);
      return newSet;
    });
  }, [sendMessage]);

  // タイプ別購読
  const subscribeToType = useCallback((type: SubscriptionType) => {
    sendMessage({
      type: MessageType.SUBSCRIBE,
      data: {
        subscription_type: type
      }
    });
    
    setSubscribedTypes(prev => new Set(prev).add(type));
  }, [sendMessage]);

  // タイプ別購読解除
  const unsubscribeFromType = useCallback((type: SubscriptionType) => {
    sendMessage({
      type: MessageType.UNSUBSCRIBE,
      data: {
        subscription_type: type
      }
    });
    
    setSubscribedTypes(prev => {
      const newSet = new Set(prev);
      newSet.delete(type);
      return newSet;
    });
  }, [sendMessage]);

  // 自動接続
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]); // connectとdisconnectを依存配列に含めない（無限ループ防止）

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [stopHeartbeat]);

  return {
    isConnected,
    isConnecting,
    error,
    connectionCount,
    lastUpdate,
    subscribedStocks,
    subscribedTypes,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscribeToType,
    unsubscribeFromType,
    sendMessage
  };
};