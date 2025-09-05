/**
 * Main App Component - 完全版
 */

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useTheme } from './contexts/ThemeContext'

// Import all original pages
import SimplifiedHomePage from './pages/StockDashboardInline'
import StockDetail from './pages/StockDetail'
import SettingsPage from './pages/SettingsPage'
import RecommendedStocksPage from './pages/RecommendedStocksPage'
import TradingRecommendationsPage from './pages/TradingRecommendationsPage'

// プロフェッショナルなヘッダー
function Header() {
  const { actualTheme, toggleTheme } = useTheme()
  
  return (
    <header className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ロゴとタイトル */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">SV</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                StockVision
              </h1>
            </div>
          </div>

          {/* ナビゲーション */}
          <nav className="hidden md:flex space-x-8">
            <Link
              to="/"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              ダッシュボード
            </Link>
            <Link
              to="/recommended-stocks"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              おすすめ銘柄
            </Link>
            <Link
              to="/trading-recommendations"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              投資判断
            </Link>
            <Link
              to="/settings"
              className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
            >
              設定
            </Link>
          </nav>

          {/* テーマ切り替えボタン */}
          <div className="flex items-center">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="テーマを切り替え"
            >
              {actualTheme === 'dark' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

// メインレイアウト
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <Header />
      <main>
        {children}
      </main>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<SimplifiedHomePage />} />
          <Route path="/stock/:stockCode" element={<StockDetail />} />
          <Route path="/recommended-stocks" element={
            <Layout>
              <RecommendedStocksPage />
            </Layout>
          } />
          <Route path="/trading-recommendations" element={
            <Layout>
              <TradingRecommendationsPage />
            </Layout>
          } />
          <Route path="/settings" element={
            <Layout>
              <SettingsPage />
            </Layout>
          } />
          <Route path="*" element={
            <Layout>
              <div className="text-center py-12">
                <div className="text-6xl mb-6">🔍</div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                  ページが見つかりません
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  お探しのページは存在しないか、移動した可能性があります。
                </p>
                <Link
                  to="/"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  ホームに戻る
                </Link>
              </div>
            </Layout>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App