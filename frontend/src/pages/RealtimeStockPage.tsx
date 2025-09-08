/**
 * Real-time Stock Monitoring Page
 * 
 * リアルタイム株価監視ページ
 * WebSocketを使用したリアルタイム株価表示とデータ管理
 */

import React, { useState, useCallback } from 'react';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useResponsive } from '../contexts/ResponsiveContext';
import { RealtimeStockList, RealtimeStockPrice } from '../components/realtime';
import Button from '../components/UI/Button';

interface RealtimeStockPageProps {
  className?: string;
}

// デフォルト監視銘柄
const DEFAULT_STOCK_CODES = [
  '7203', // トヨタ自動車
  '9984', // ソフトバンクグループ
  '6758', // ソニーグループ
  '4519', // 中外製薬
  '6861', // キーエンス
  '8035', // 東京エレクトロン
  '4568', // 第一三共
  '9434', // ソフトバンク
  '6098', // リクルートホールディングス
  '4661', // オリエンタルランド
  '8306', // 三菱UFJフィナンシャル・グループ
  '7974'  // 任天堂
];

const RealtimeStockPage: React.FC<RealtimeStockPageProps> = ({
  className = ''
}) => {
  const { announce } = useAccessibility();
  const { isMobile } = useResponsive();

  // 状態管理
  const [stockCodes, setStockCodes] = useState<string[]>(DEFAULT_STOCK_CODES);
  const [selectedStock, setSelectedStock] = useState<string>(DEFAULT_STOCK_CODES[0]);
  const [newStockCode, setNewStockCode] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [autoConnect, setAutoConnect] = useState(true);
  const [maxDisplayCount, setMaxDisplayCount] = useState(12);

  // 銘柄追加
  const handleAddStock = useCallback(() => {
    const code = newStockCode.trim().toUpperCase();
    
    if (!code) {
      announce('銘柄コードを入力してください');
      return;
    }

    if (stockCodes.includes(code)) {
      announce('この銘柄は既に追加されています');
      return;
    }

    if (!/^\d{4}$/.test(code)) {
      announce('4桁の数字で銘柄コードを入力してください');
      return;
    }

    setStockCodes(prev => [...prev, code]);
    setNewStockCode('');
    announce(`${code}を監視リストに追加しました`);
  }, [newStockCode, stockCodes, announce]);

  // 銘柄削除
  const handleRemoveStock = useCallback((code: string) => {
    setStockCodes(prev => prev.filter(c => c !== code));
    
    // 選択中の銘柄が削除された場合は別の銘柄を選択
    if (selectedStock === code && stockCodes.length > 1) {
      const remainingStocks = stockCodes.filter(c => c !== code);
      setSelectedStock(remainingStocks[0]);
    }
    
    announce(`${code}を監視リストから削除しました`);
  }, [selectedStock, stockCodes, announce]);

  // デフォルト銘柄リセット
  const handleResetToDefault = useCallback(() => {
    setStockCodes(DEFAULT_STOCK_CODES);
    setSelectedStock(DEFAULT_STOCK_CODES[0]);
    announce('監視リストをデフォルトにリセットしました');
  }, [announce]);

  // 全削除
  const handleClearAll = useCallback(() => {
    if (stockCodes.length > 0) {
      setStockCodes([]);
      setSelectedStock('');
      announce('監視リストを全て削除しました');
    }
  }, [stockCodes.length, announce]);

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                リアルタイム株価監視
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                WebSocketによるリアルタイム株価更新とデータ監視
              </p>
            </div>

            {/* ページ設定 */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={autoConnect}
                    onChange={(e) => setAutoConnect(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  自動接続
                </label>
                
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={showControls}
                    onChange={(e) => setShowControls(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  コントロール表示
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 銘柄管理パネル */}
        <div className="bg-white rounded-lg border border-gray-200 mb-6 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">監視銘柄管理</h3>
          
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 銘柄追加 */}
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="銘柄コード (例: 7203)"
                  value={newStockCode}
                  onChange={(e) => setNewStockCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={4}
                />
                <Button onClick={handleAddStock} variant="primary">
                  追加
                </Button>
              </div>
            </div>

            {/* アクション */}
            <div className="flex gap-2">
              <Button onClick={handleResetToDefault} variant="outline" size="sm">
                デフォルト
              </Button>
              <Button 
                onClick={handleClearAll} 
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                全削除
              </Button>
            </div>
          </div>

          {/* 現在の監視銘柄一覧 */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              監視中の銘柄 ({stockCodes.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {stockCodes.map(code => (
                <div
                  key={code}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm border cursor-pointer transition-colors ${
                    selectedStock === code
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
                  onClick={() => setSelectedStock(code)}
                >
                  <span>{code}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveStock(code);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 表示設定 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-700">
                最大表示数:
                <select
                  value={maxDisplayCount}
                  onChange={(e) => setMaxDisplayCount(Number(e.target.value))}
                  className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={6}>6銘柄</option>
                  <option value={12}>12銘柄</option>
                  <option value={20}>20銘柄</option>
                  <option value={50}>50銘柄</option>
                </select>
              </label>

              {isMobile && (
                <>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={autoConnect}
                      onChange={(e) => setAutoConnect(e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    自動接続
                  </label>
                  
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={showControls}
                      onChange={(e) => setShowControls(e.target.checked)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    コントロール表示
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {stockCodes.length > 0 ? (
          <div className="space-y-6">
            {/* 選択銘柄の詳細表示 */}
            {selectedStock && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  注目銘柄: {selectedStock}
                </h3>
                <div className="max-w-md">
                  <RealtimeStockPrice
                    stockCode={selectedStock}
                    showVolume={true}
                    showMarketStatus={true}
                    showLastUpdate={true}
                    autoConnect={autoConnect}
                  />
                </div>
              </div>
            )}

            {/* リアルタイム株価リスト */}
            <RealtimeStockList
              stockCodes={stockCodes}
              maxDisplayCount={maxDisplayCount}
              showControls={showControls}
              sortBy="change_pct"
              sortOrder="desc"
              filterBy="all"
              autoConnect={autoConnect}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <svg
                className="mx-auto h-16 w-16 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                監視銘柄がありません
              </h3>
              <p className="text-gray-500 mb-6">
                上記のフォームで銘柄コードを追加するか、デフォルト銘柄を読み込んでください
              </p>
              <Button onClick={handleResetToDefault} variant="primary">
                デフォルト銘柄を読み込み
              </Button>
            </div>
          </div>
        )}

        {/* 使用方法ガイド */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                リアルタイム株価監視について
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>WebSocketでリアルタイムに株価データを受信・表示</li>
                  <li>銘柄カードをクリックして詳細表示の対象を変更可能</li>
                  <li>ソート・フィルタリング機能で効率的な監視が可能</li>
                  <li>接続ステータスと更新回数をリアルタイムで表示</li>
                  <li>自動再接続機能でネットワーク断線に対応</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeStockPage;