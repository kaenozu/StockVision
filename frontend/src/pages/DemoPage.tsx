import React, { useState } from 'react'
import { ThemeProvider, useTheme } from '../contexts/ThemeContext'
import { ResponsiveProvider, useResponsive } from '../contexts/ResponsiveContext'
import { AccessibilityProvider, useAccessibility } from '../contexts/AccessibilityContext'

// Import new UI components
import VisualIndicator, { PriceChangeIndicator, TrendIndicator } from '../components/UI/VisualIndicator'
import PriceDisplay, { PriceWithChange, CompactPriceDisplay, HighlightedPrice } from '../components/UI/PriceDisplay'
import LoadingState, { InlineLoader, OverlayLoader, CardSkeleton, ListSkeleton } from '../components/UI/LoadingState'
import EnhancedStockCard, { CompactEnhancedStockCard, DetailedEnhancedStockCard } from '../components/stock/EnhancedStockCard'

// Demo Controls Component
const DemoControls: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme()
  const { breakpoint, width, isMobile, isTablet, isDesktop } = useResponsive()
  const { reducedMotion, highContrast, keyboardNavigation, announce } = useAccessibility()

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        🎮 デモコントロール
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Theme Control */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            テーマ
          </label>
          <button
            onClick={toggleTheme}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            {theme} → 切り替え
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            現在: {isDark ? 'ダーク' : 'ライト'}モード
          </p>
        </div>

        {/* Responsive Info */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            レスポンシブ情報
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="text-sm space-y-1">
              <div>ブレイクポイント: <span className="font-mono">{breakpoint}</span></div>
              <div>幅: <span className="font-mono">{width}px</span></div>
              <div>デバイス: {isMobile ? 'モバイル' : isTablet ? 'タブレット' : 'デスクトップ'}</div>
            </div>
          </div>
        </div>

        {/* Accessibility Info */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            アクセシビリティ
          </label>
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div className="text-sm space-y-1">
              <div>運動制限: {reducedMotion ? 'あり' : 'なし'}</div>
              <div>高コントラスト: {highContrast ? 'あり' : 'なし'}</div>
              <div>キーボードナビ: {keyboardNavigation ? 'あり' : 'なし'}</div>
            </div>
          </div>
          <button
            onClick={() => announce('アクセシビリティテスト中です', 'polite')}
            className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
          >
            音声アナウンステスト
          </button>
        </div>
      </div>
    </div>
  )
}

// Demo Section Component
const DemoSection: React.FC<{
  title: string
  description: string
  children: React.ReactNode
}> = ({ title, description, children }) => {
  return (
    <div className="mb-12">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}

// VisualIndicator Demo
const VisualIndicatorDemo: React.FC = () => {
  const [demoValues, setDemoValues] = useState({
    currentPrice: 2500,
    previousPrice: 2400,
  })

  return (
    <DemoSection
      title="📈 VisualIndicator - 価格トレンド可視化"
      description="価格の上昇・下落・中立を視覚的に表示。色覚異常対応とアクセシビリティに配慮。"
    >
      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">現在価格</label>
            <input
              type="number"
              value={demoValues.currentPrice}
              onChange={(e) => setDemoValues(prev => ({
                ...prev,
                currentPrice: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">前回価格</label>
            <input
              type="number"
              value={demoValues.previousPrice}
              onChange={(e) => setDemoValues(prev => ({
                ...prev,
                previousPrice: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">基本インジケーター</h4>
          <VisualIndicator
            trend={demoValues.currentPrice > demoValues.previousPrice ? 'up' : 
                   demoValues.currentPrice < demoValues.previousPrice ? 'down' : 'neutral'}
            value={demoValues.currentPrice}
            previousValue={demoValues.previousPrice}
            size="lg"
            showPercentage={true}
          />
        </div>
        
        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">価格変化インジケーター</h4>
          <PriceChangeIndicator
            currentPrice={demoValues.currentPrice}
            previousPrice={demoValues.previousPrice}
            showPercentage={true}
            size="lg"
          />
        </div>

        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">トレンドインジケーター</h4>
          <TrendIndicator
            trend={demoValues.currentPrice > demoValues.previousPrice ? 'up' : 
                   demoValues.currentPrice < demoValues.previousPrice ? 'down' : 'neutral'}
            size="lg"
          />
        </div>
      </div>
    </DemoSection>
  )
}

// PriceDisplay Demo
const PriceDisplayDemo: React.FC = () => {
  const [priceData, setPriceData] = useState({
    price: 12500,
    previousPrice: 12000,
    currency: 'JPY' as const
  })

  return (
    <DemoSection
      title="💰 PriceDisplay - 価格表示"
      description="多通貨対応の価格表示コンポーネント。変化量・変化率の表示も可能。"
    >
      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">価格</label>
            <input
              type="number"
              value={priceData.price}
              onChange={(e) => setPriceData(prev => ({
                ...prev,
                price: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">前回価格</label>
            <input
              type="number"
              value={priceData.previousPrice}
              onChange={(e) => setPriceData(prev => ({
                ...prev,
                previousPrice: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">通貨</label>
            <select
              value={priceData.currency}
              onChange={(e) => setPriceData(prev => ({
                ...prev,
                currency: e.target.value as 'JPY' | 'USD' | 'EUR'
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="JPY">日本円 (JPY)</option>
              <option value="USD">米ドル (USD)</option>
              <option value="EUR">ユーロ (EUR)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Price Displays */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3 text-sm">基本表示</h4>
          <PriceDisplay
            price={priceData.price}
            currency={priceData.currency}
            size="lg"
          />
        </div>
        
        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3 text-sm">変化表示</h4>
          <PriceWithChange
            price={priceData.price}
            previousPrice={priceData.previousPrice}
            currency={priceData.currency}
            size="md"
          />
        </div>

        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3 text-sm">コンパクト</h4>
          <CompactPriceDisplay
            price={priceData.price}
            previousPrice={priceData.previousPrice}
            currency={priceData.currency}
          />
        </div>

        <div className="text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3 text-sm">ハイライト</h4>
          <HighlightedPrice
            price={priceData.price}
            previousPrice={priceData.previousPrice}
            currency={priceData.currency}
            size="md"
          />
        </div>
      </div>
    </DemoSection>
  )
}

// LoadingState Demo
const LoadingStateDemo: React.FC = () => {
  const [loadingStates, setLoadingStates] = useState({
    inline: false,
    overlay: false,
    card: false,
    list: false,
    error: false
  })

  return (
    <DemoSection
      title="⏳ LoadingState - 読み込み状態"
      description="多様なローディングスタイルとエラー表示。スケルトンUIも提供。"
    >
      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex flex-wrap gap-2">
          {Object.keys(loadingStates).map((key) => (
            <button
              key={key}
              onClick={() => setLoadingStates(prev => ({
                ...prev,
                [key]: !prev[key as keyof typeof prev]
              }))}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                loadingStates[key as keyof typeof loadingStates]
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              {key} {loadingStates[key as keyof typeof loadingStates] ? 'ON' : 'OFF'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">インラインローダー</h4>
          {loadingStates.inline ? (
            <InlineLoader message="データ読み込み中..." />
          ) : (
            <p className="text-gray-500">ローダーを表示するにはボタンを押してください</p>
          )}
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative">
          <h4 className="font-medium mb-3">オーバーレイローダー</h4>
          <OverlayLoader loading={loadingStates.overlay}>
            <div className="h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
              コンテンツエリア
            </div>
          </OverlayLoader>
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">エラー表示</h4>
          {loadingStates.error ? (
            <LoadingState
              error="データの取得に失敗しました"
              retry={() => setLoadingStates(prev => ({ ...prev, error: false }))}
            />
          ) : (
            <p className="text-gray-500">エラーを表示するにはボタンを押してください</p>
          )}
        </div>
      </div>

      {/* Skeleton Examples */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">カードスケルトン</h4>
          {loadingStates.card ? <CardSkeleton /> : <p className="text-gray-500">カードスケルトンを表示</p>}
        </div>

        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="font-medium mb-3">リストスケルトン</h4>
          {loadingStates.list ? <ListSkeleton items={3} /> : <p className="text-gray-500">リストスケルトンを表示</p>}
        </div>
      </div>
    </DemoSection>
  )
}

// EnhancedStockCard Demo
const EnhancedStockCardDemo: React.FC = () => {
  const [stockData, setStockData] = useState({
    stockCode: '7203',
    name: 'トヨタ自動車株式会社',
    price: 2500,
    previousPrice: 2400,
    variant: 'default' as 'default' | 'compact' | 'detailed'
  })

  return (
    <DemoSection
      title="📊 EnhancedStockCard - 統合株式カード"
      description="全UIコンポーネントを統合した次世代株式カード。レスポンシブ・アクセシブル対応。"
    >
      {/* Controls */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">銘柄コード</label>
            <input
              type="text"
              value={stockData.stockCode}
              onChange={(e) => setStockData(prev => ({
                ...prev,
                stockCode: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">企業名</label>
            <input
              type="text"
              value={stockData.name}
              onChange={(e) => setStockData(prev => ({
                ...prev,
                name: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">現在価格</label>
            <input
              type="number"
              value={stockData.price}
              onChange={(e) => setStockData(prev => ({
                ...prev,
                price: parseFloat(e.target.value) || 0
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">バリアント</label>
            <select
              value={stockData.variant}
              onChange={(e) => setStockData(prev => ({
                ...prev,
                variant: e.target.value as 'default' | 'compact' | 'detailed'
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="default">デフォルト</option>
              <option value="compact">コンパクト</option>
              <option value="detailed">詳細</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stock Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <div>
          <h4 className="font-medium mb-3">Enhanced StockCard</h4>
          <EnhancedStockCard
            stockCode={stockData.stockCode}
            name={stockData.name}
            price={stockData.price}
            previousPrice={stockData.previousPrice}
            variant={stockData.variant}
            responsive={true}
            accessibility={{
              keyboardNavigation: true,
              announceChanges: true
            }}
            onRefresh={() => console.log('Refresh clicked')}
            onViewDetails={() => console.log('View details clicked')}
          />
        </div>

        <div>
          <h4 className="font-medium mb-3">Compact Version</h4>
          <CompactEnhancedStockCard
            stockCode={stockData.stockCode}
            name={stockData.name}
            price={stockData.price}
            previousPrice={stockData.previousPrice}
            responsive={true}
          />
        </div>

        <div>
          <h4 className="font-medium mb-3">Detailed Version</h4>
          <DetailedEnhancedStockCard
            stockCode={stockData.stockCode}
            name={stockData.name}
            price={stockData.price}
            previousPrice={stockData.previousPrice}
            responsive={true}
            accessibility={{
              keyboardNavigation: true
            }}
          />
        </div>
      </div>
    </DemoSection>
  )
}

// Main Demo Page
const DemoPageContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            🎨 StockVision UI Components Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            TDD GREEN フェーズで実装された新しいUIコンポーネントのインタラクティブデモ。
            テーマ切り替え、レスポンシブデザイン、アクセシビリティ機能を体験してください。
          </p>
        </header>

        {/* Demo Controls */}
        <DemoControls />

        {/* Demo Sections */}
        <VisualIndicatorDemo />
        <PriceDisplayDemo />
        <LoadingStateDemo />
        <EnhancedStockCardDemo />

        {/* Footer */}
        <footer className="text-center py-8 mt-12 border-t border-gray-200 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            🤖 Generated with Claude Code | StockVision UI Components Demo
          </p>
        </footer>
      </div>
    </div>
  )
}

// Wrapped Demo Page with all providers
const DemoPage: React.FC = () => {
  return (
    <ThemeProvider>
      <ResponsiveProvider>
        <AccessibilityProvider>
          <DemoPageContent />
        </AccessibilityProvider>
      </ResponsiveProvider>
    </ThemeProvider>
  )
}

export default DemoPage