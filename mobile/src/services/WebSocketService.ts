/**
 * Real-time WebSocket service for stock price updates
 * Handles connection management and data streaming
 */

import { EventEmitter } from 'events';

export interface StockUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  high: number;
  low: number;
  open: number;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen?: string;
  nextClose?: string;
  timezone: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  connectionTime?: string;
  lastHeartbeat?: string;
  reconnectAttempts: number;
}

type EventType = 'stock_update' | 'market_status' | 'connection_status' | 'error';

class WebSocketServiceClass extends EventEmitter {
  private ws: WebSocket | null = null;
  private connectionUrl: string = 'ws://localhost:8080/ws';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions: Set<string> = new Set();
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    reconnectAttempts: 0,
  };

  private isInitialized: boolean = false;

  async initialize(url?: string): Promise<void> {
    if (this.isInitialized) {
      console.log('WebSocketService already initialized');
      return;
    }

    if (url) {
      this.connectionUrl = url;
    }

    console.log('Initializing WebSocketService...');
    
    try {
      await this.connect();
      this.isInitialized = true;
      console.log('WebSocketService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize WebSocketService:', error);
      throw error;
    }
  }

  private async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.connectionUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.connectionStatus = {
            isConnected: true,
            connectionTime: new Date().toISOString(),
            reconnectAttempts: this.reconnectAttempts,
          };
          
          this.emit('connection_status', this.connectionStatus);
          this.resetReconnectAttempts();
          this.startHeartbeat();
          
          // Resubscribe to previous subscriptions
          this.resubscribe();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.connectionStatus = {
            isConnected: false,
            reconnectAttempts: this.reconnectAttempts,
          };
          
          this.emit('connection_status', this.connectionStatus);
          this.stopHeartbeat();
          
          // Attempt to reconnect if not a clean close
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', { type: 'websocket_error', error });
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'stock_update':
          this.handleStockUpdate(data);
          break;
        case 'market_status':
          this.handleMarketStatus(data);
          break;
        case 'heartbeat':
          this.handleHeartbeat(data);
          break;
        case 'error':
          this.handleError(data);
          break;
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      this.emit('error', { type: 'parse_error', error, rawMessage: event.data });
    }
  }

  private handleStockUpdate(data: any): void {
    const update: StockUpdate = {
      symbol: data.symbol,
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      volume: data.volume,
      timestamp: data.timestamp,
      high: data.high,
      low: data.low,
      open: data.open,
    };

    this.emit('stock_update', update);
  }

  private handleMarketStatus(data: any): void {
    const status: MarketStatus = {
      isOpen: data.isOpen,
      nextOpen: data.nextOpen,
      nextClose: data.nextClose,
      timezone: data.timezone || 'America/New_York',
    };

    this.emit('market_status', status);
  }

  private handleHeartbeat(data: any): void {
    this.connectionStatus.lastHeartbeat = new Date().toISOString();
    
    // Send heartbeat response
    this.send({
      type: 'heartbeat_response',
      timestamp: new Date().toISOString(),
    });
  }

  private handleError(data: any): void {
    console.error('Server error:', data.message);
    this.emit('error', { type: 'server_error', message: data.message });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'heartbeat',
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000); // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnect attempt failed:', error);
      }
    }, delay);
  }

  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }

  private resubscribe(): void {
    if (this.subscriptions.size > 0) {
      console.log('Resubscribing to:', Array.from(this.subscriptions));
      this.send({
        type: 'batch_subscribe',
        symbols: Array.from(this.subscriptions),
      });
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  subscribe(symbol: string): void {
    if (!symbol) {
      console.error('Cannot subscribe to empty symbol');
      return;
    }

    const normalizedSymbol = symbol.toUpperCase();
    this.subscriptions.add(normalizedSymbol);
    
    console.log(`Subscribing to ${normalizedSymbol}`);
    
    this.send({
      type: 'subscribe',
      symbol: normalizedSymbol,
    });
  }

  unsubscribe(symbol: string): void {
    if (!symbol) {
      return;
    }

    const normalizedSymbol = symbol.toUpperCase();
    this.subscriptions.delete(normalizedSymbol);
    
    console.log(`Unsubscribing from ${normalizedSymbol}`);
    
    this.send({
      type: 'unsubscribe',
      symbol: normalizedSymbol,
    });
  }

  batchSubscribe(symbols: string[]): void {
    const normalizedSymbols = symbols.map(s => s.toUpperCase()).filter(Boolean);
    
    normalizedSymbols.forEach(symbol => {
      this.subscriptions.add(symbol);
    });
    
    console.log('Batch subscribing to:', normalizedSymbols);
    
    this.send({
      type: 'batch_subscribe',
      symbols: normalizedSymbols,
    });
  }

  batchUnsubscribe(symbols: string[]): void {
    const normalizedSymbols = symbols.map(s => s.toUpperCase()).filter(Boolean);
    
    normalizedSymbols.forEach(symbol => {
      this.subscriptions.delete(symbol);
    });
    
    console.log('Batch unsubscribing from:', normalizedSymbols);
    
    this.send({
      type: 'batch_unsubscribe',
      symbols: normalizedSymbols,
    });
  }

  getSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  disconnect(): void {
    console.log('Disconnecting WebSocket...');
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionStatus = {
      isConnected: false,
      reconnectAttempts: 0,
    };
    
    this.emit('connection_status', this.connectionStatus);
  }

  // Event listener methods
  onStockUpdate(callback: (update: StockUpdate) => void): () => void {
    this.on('stock_update', callback);
    return () => this.off('stock_update', callback);
  }

  onMarketStatus(callback: (status: MarketStatus) => void): () => void {
    this.on('market_status', callback);
    return () => this.off('market_status', callback);
  }

  onConnectionStatus(callback: (status: ConnectionStatus) => void): () => void {
    this.on('connection_status', callback);
    return () => this.off('connection_status', callback);
  }

  onError(callback: (error: any) => void): () => void {
    this.on('error', callback);
    return () => this.off('error', callback);
  }

  // Debug methods
  getDebugInfo(): any {
    return {
      connectionUrl: this.connectionUrl,
      isConnected: this.isConnected(),
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
      connectionStatus: this.connectionStatus,
      wsReadyState: this.ws?.readyState,
    };
  }
}

export const WebSocketService = new WebSocketServiceClass();