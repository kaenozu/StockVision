/**
 * Real-time Stock List Component
 * 
 * リアルタイム株価リスト表示コンポーネント
 * 複数の銘柄を同時監視してリアルタイム更新
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStockWebSocket, StockPriceUpdate, SubscriptionType } from '../../hooks/useStockWebSocket';
import RealtimeStockPrice from './RealtimeStockPrice';
import LoadingSpinner from '../UI/LoadingSpinner';
import Button from '../UI/Button';

interface RealtimeStockListProps {
  stockCodes: string[];
  maxDisplayCount?: number;
  showControls?: boolean;
  sortBy?: 'code' | 'price' | 'change' | 'change_pct' | 'volume';
  sortOrder?: 'asc' | 'desc';
  filterBy?: 'all' | 'positive' | 'negative' | 'unchanged';
  autoConnect?: boolean;
  refreshInterval?: number;
  className?: string;
}

interface StockListData {
  [stockCode: string]: StockPriceUpdate & {
    lastUpdated: Date;
    updateCount: number;
  };
}

const RealtimeStockList: React.FC<RealtimeStockListProps> = ({
  stockCodes,
  maxDisplayCount = 20,
  showControls = true,
  sortBy = 'code',
  sortOrder = 'asc',
  filterBy = 'all',
  autoConnect = true,
  refreshInterval = 30000,
  className = ''
}) => {
  const [stocksData, setStocksData] = useState<StockListData>({});
  const [localSortBy, setLocalSortBy] = useState(sortBy);
  const [localSortOrder, setLocalSortOrder] = useState(sortOrder);
  const [localFilterBy, setLocalFilterBy] = useState(filterBy);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // WebSocketフック
  const {
    isConnected,
    isConnecting,
    error,
    lastUpdate,
    connectionCount,
    subscribedStocks,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscribeToType
  } = useStockWebSocket(
    process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/stock-prices',
    {
      autoConnect,
      onConnect: () => {
        console.log('Stock list WebSocket connected');
      },
      onDisconnect: () => {
        console.log('Stock list WebSocket disconnected');
      },
      onError: (error) => {
        console.error('Stock list WebSocket error:', error);
      },
      onPriceUpdate: handlePriceUpdate
    }
  );

  // 株価更新ハンドラ
  function handlePriceUpdate(update: StockPriceUpdate) {
    if (stockCodes.includes(update.stock_code)) {
      setStocksData(prev => ({
        ...prev,
        [update.stock_code]: {
          ...update,
          lastUpdated: new Date(),
          updateCount: (prev[update.stock_code]?.updateCount || 0) + 1
        }
      }));
    }
  }

  // 銘柄購読管理
  useEffect(() => {
    if (isConnected) {
      // 新しい銘柄を購読
      stockCodes.forEach(code => {
        if (!subscribedStocks.has(code)) {
          subscribe(code);
        }
      });

      // 不要な購読を解除
      Array.from(subscribedStocks).forEach(code => {
        if (!stockCodes.includes(code)) {
          unsubscribe(code);
        }
      });
    }
  }, [isConnected, stockCodes, subscribedStocks, subscribe, unsubscribe]);

  // ソート・フィルタリング済みデータ
  const processedStocks = useMemo(() => {
    let filtered = Object.entries(stocksData);

    // フィルタリング
    switch (localFilterBy) {
      case 'positive':
        filtered = filtered.filter(([_, data]) => data.price_change > 0);
        break;
      case 'negative':
        filtered = filtered.filter(([_, data]) => data.price_change < 0);
        break;
      case 'unchanged':
        filtered = filtered.filter(([_, data]) => data.price_change === 0);
        break;
    }

    // ソート
    filtered.sort((a, b) => {
      const [codeA, dataA] = a;
      const [codeB, dataB] = b;
      let compareValue = 0;

      switch (localSortBy) {
        case 'code':
          compareValue = codeA.localeCompare(codeB);
          break;
        case 'price':
          compareValue = dataA.current_price - dataB.current_price;
          break;
        case 'change':
          compareValue = dataA.price_change - dataB.price_change;
          break;
        case 'change_pct':
          compareValue = dataA.price_change_pct - dataB.price_change_pct;
          break;
        case 'volume':
          compareValue = dataA.volume - dataB.volume;
          break;
      }

      return localSortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered.slice(0, maxDisplayCount);
  }, [stocksData, localSortBy, localSortOrder, localFilterBy, maxDisplayCount]);

  // 統計データ
  const stats = useMemo(() => {
    const allData = Object.values(stocksData);
    return {
      total: allData.length,
      positive: allData.filter(data => data.price_change > 0).length,
      negative: allData.filter(data => data.price_change < 0).length,
      unchanged: allData.filter(data => data.price_change === 0).length,
      avgChange: allData.length > 0 
        ? allData.reduce((sum, data) => sum + data.price_change_pct, 0) / allData.length 
        : 0
    };
  }, [stocksData]);

  // 全銘柄を一括購読
  const subscribeAllStocks = () => {
    if (isConnected) {
      stockCodes.forEach(code => subscribe(code));
    }
  };

  // 全銘柄を一括購読解除
  const unsubscribeAllStocks = () => {
    if (isConnected) {
      stockCodes.forEach(code => unsubscribe(code));
    }
  };

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

  if (error) {
    return (
      <div className={`p-6 border border-red-300 rounded-lg bg-red-50 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">接続エラー</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            variant="primary"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? '接続中...' : '再接続'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-800">
              リアルタイム株価一覧
            </h2>
            
            {/* 接続ステータス */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? `接続中 (${connectionCount})` : '未接続'}
              </span>
            </div>

            {/* 統計 */}
            <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600">
              <span>合計: {stats.total}</span>
              <span className="text-green-600">上昇: {stats.positive}</span>
              <span className="text-red-600">下落: {stats.negative}</span>
              <span className="text-gray-500">変化なし: {stats.unchanged}</span>
              <span>平均変動率: {stats.avgChange.toFixed(2)}%</span>
            </div>
          </div>

          {/* 折りたたみボタン */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className={`w-5 h-5 transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* モバイル統計 */}
        <div className="md:hidden mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
          <span>合計: {stats.total}</span>
          <span className="text-green-600">上昇: {stats.positive}</span>
          <span className="text-red-600">下落: {stats.negative}</span>
          <span>平均: {stats.avgChange.toFixed(2)}%</span>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* コントロールパネル */}
          {showControls && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap items-center gap-4">
                {/* ソート */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">ソート:</label>
                  <select
                    value={localSortBy}
                    onChange={(e) => setLocalSortBy(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="code">銘柄コード</option>
                    <option value="price">現在値</option>
                    <option value="change">変化額</option>
                    <option value="change_pct">変化率</option>
                    <option value="volume">出来高</option>
                  </select>
                  
                  <button
                    onClick={() => setLocalSortOrder(localSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                  >
                    {localSortOrder === 'asc' ? '昇順' : '降順'}
                  </button>
                </div>

                {/* フィルタ */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">フィルタ:</label>
                  <select
                    value={localFilterBy}
                    onChange={(e) => setLocalFilterBy(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="positive">上昇のみ</option>
                    <option value="negative">下落のみ</option>
                    <option value="unchanged">変化なしのみ</option>
                  </select>
                </div>

                {/* 接続制御 */}
                {!autoConnect && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={isConnected ? handleDisconnect : handleConnect}
                      disabled={isConnecting}
                    >
                      {isConnecting ? '接続中...' : isConnected ? '切断' : '接続'}
                    </Button>
                    
                    {isConnected && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={subscribeAllStocks}
                        >
                          全購読
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={unsubscribeAllStocks}
                        >
                          全解除
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 株価リスト */}
          <div className="p-4">
            {isConnecting && Object.keys(stocksData).length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-3 text-gray-600">データ取得中...</span>
              </div>
            ) : processedStocks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {processedStocks.map(([stockCode, data]) => (
                  <div key={stockCode} className="relative">
                    <RealtimeStockPrice
                      stockCode={stockCode}
                      showVolume={true}
                      showMarketStatus={false}
                      showLastUpdate={false}
                      autoConnect={false} // 親コンポーネントで管理
                      className="h-full"
                    />
                    
                    {/* 更新カウンタ */}
                    <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {data.updateCount}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {localFilterBy === 'all' 
                  ? 'データがありません' 
                  : 'フィルタ条件に一致する銘柄がありません'
                }
              </div>
            )}
          </div>

          {/* フッター情報 */}
          {lastUpdate && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
              最終受信: {lastUpdate.toLocaleString('ja-JP')} | 
              表示中: {processedStocks.length} / {stockCodes.length} 銘柄
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RealtimeStockList;