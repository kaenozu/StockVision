/**
 * Real-time Stock Price Component
 * 
 * リアルタイム株価表示コンポーネント
 * WebSocketを使用してリアルタイムで株価を更新表示
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStockWebSocket, StockPriceUpdate, SubscriptionType } from '../../hooks/useStockWebSocket';
import PriceDisplay from '../UI/PriceDisplay';
import LoadingSpinner from '../UI/LoadingSpinner';

interface RealtimeStockPriceProps {
  stockCode: string;
  showVolume?: boolean;
  showMarketStatus?: boolean;
  showLastUpdate?: boolean;
  autoConnect?: boolean;
  className?: string;
}

interface StockData {
  stock_code: string;
  current_price: number;
  price_change: number;
  price_change_pct: number;
  volume: number;
  market_status: string;
  timestamp: string;
  previous_close: number;
  company_name?: string;
}

const RealtimeStockPrice: React.FC<RealtimeStockPriceProps> = ({
  stockCode,
  showVolume = true,
  showMarketStatus = true,
  showLastUpdate = true,
  autoConnect = true,
  className = ''
}) => {
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateAnimation, setUpdateAnimation] = useState(false);

  // WebSocketフック
  const {
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  } = useStockWebSocket(
    process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/stock-prices',
    {
      autoConnect,
      onConnect: () => {
        console.log(`Connected to WebSocket for ${stockCode}`);
      },
      onDisconnect: () => {
        console.log(`Disconnected from WebSocket for ${stockCode}`);
      },
      onError: (error) => {
        console.error(`WebSocket error for ${stockCode}:`, error);
      },
      onPriceUpdate: (update: StockPriceUpdate) => {
        if (update.stock_code === stockCode) {
          handlePriceUpdate(update);
        }
      }
    }
  );

  // 株価更新ハンドラ
  const handlePriceUpdate = useCallback((update: StockPriceUpdate) => {
    setStockData(prevData => {
      const newData = {
        ...update,
        company_name: prevData?.company_name || `${stockCode}株式会社`
      };

      // アニメーション効果
      if (prevData && prevData.current_price !== update.current_price) {
        setUpdateAnimation(true);
        setTimeout(() => setUpdateAnimation(false), 1000);
      }

      return newData;
    });

    setIsLoading(false);
  }, [stockCode]);

  // WebSocket接続と購読管理
  useEffect(() => {
    if (isConnected) {
      subscribe(stockCode);
      setIsLoading(true);
    }

    return () => {
      if (isConnected) {
        unsubscribe(stockCode);
      }
    };
  }, [isConnected, stockCode, subscribe, unsubscribe]);

  // 手動接続
  const handleConnect = () => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  };

  // 手動切断
  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
    }
  };

  // 市場状況のスタイル
  const getMarketStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return 'text-green-600 bg-green-100';
      case 'closed':
        return 'text-gray-600 bg-gray-100';
      case 'pre_market':
        return 'text-blue-600 bg-blue-100';
      case 'after_market':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // 市場状況の表示名
  const getMarketStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open':
        return '取引中';
      case 'closed':
        return '取引終了';
      case 'pre_market':
        return '取引開始前';
      case 'after_market':
        return '取引時間外';
      default:
        return '不明';
    }
  };

  // フォーマット関数
  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toLocaleString();
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('ja-JP');
  };

  if (error) {
    return (
      <div className={`p-4 border border-red-300 rounded-lg bg-red-50 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-800">{stockCode}</h3>
            <p className="text-red-600 text-sm mt-1">接続エラー: {error}</p>
          </div>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isConnecting ? '接続中...' : '再接続'}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !stockData) {
    return (
      <div className={`p-4 border border-gray-300 rounded-lg bg-white ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{stockCode}</h3>
            <div className="flex items-center mt-2">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-gray-500 text-sm">
                {isConnecting ? '接続中...' : 'データ取得中...'}
              </span>
            </div>
          </div>
          {!autoConnect && !isConnected && (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              接続
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 border border-gray-300 rounded-lg bg-white transition-all duration-300 ${updateAnimation ? 'ring-2 ring-blue-400 shadow-lg' : ''} ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            {stockCode}
            {stockData.company_name && (
              <span className="text-sm text-gray-500 ml-2 font-normal">
                {stockData.company_name}
              </span>
            )}
          </h3>
          {showMarketStatus && (
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getMarketStatusStyle(stockData.market_status)}`}>
              {getMarketStatusText(stockData.market_status)}
            </span>
          )}
        </div>

        {/* 接続ステータス */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-gray-500">
            {isConnected ? 'リアルタイム' : '未接続'}
          </span>
          {!autoConnect && (
            <button
              onClick={isConnected ? handleDisconnect : handleConnect}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              {isConnected ? '切断' : '接続'}
            </button>
          )}
        </div>
      </div>

      {/* 株価表示 */}
      <div className="mb-3">
        <PriceDisplay
          price={stockData.current_price}
          change={stockData.price_change}
          changePercent={stockData.price_change_pct}
          previousClose={stockData.previous_close}
          currency="¥"
          size="lg"
        />
      </div>

      {/* 追加情報 */}
      <div className="space-y-2 text-sm text-gray-600">
        {showVolume && (
          <div className="flex justify-between">
            <span>出来高:</span>
            <span className="font-medium">{formatVolume(stockData.volume)}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span>前日終値:</span>
          <span className="font-medium">¥{stockData.previous_close.toLocaleString()}</span>
        </div>

        {showLastUpdate && (
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span>最終更新:</span>
            <span className="font-medium text-blue-600">
              {formatTimestamp(stockData.timestamp)}
            </span>
          </div>
        )}
      </div>

      {/* WebSocket統計 */}
      {lastUpdate && (
        <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
          最後のデータ受信: {lastUpdate.toLocaleTimeString('ja-JP')}
        </div>
      )}
    </div>
  );
};

export default RealtimeStockPrice;