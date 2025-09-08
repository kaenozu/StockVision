/**
 * Main App Component
 * 
 * Root application component with routing, error boundaries,
 * and global state management.
 */

import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { LoadingLayout, ErrorBoundaryLayout } from './components/layout/Layout'
import HomePage from './pages/HomePage'
import SimplifiedHomePage from './pages/SimplifiedHomePage'
import StockDetailPage from './pages/StockDetailPage'
import WatchlistPage from './pages/WatchlistPage'
import SearchPage from './pages/SearchPage'
import SettingsPage from './pages/SettingsPage'
import DemoPage from './pages/DemoPage'
import RecommendedStocksPage from './pages/RecommendedStocksPage'
import TradingRecommendationsPage from './pages/TradingRecommendationsPage'
import TestPage from './pages/TestPage'

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <ErrorBoundaryLayout
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }

    return this.props.children
  }
}

// Lazy load components for code splitting
const AboutPage = React.lazy(() => 
  import('./pages/AboutPage').catch(() => ({ 
    default: () => (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">About</h1>
        <p>株価チェッカーについてのページは準備中です。</p>
      </div>
    )
  }))
)

const NotFoundPage = React.lazy(() => 
  Promise.resolve({
    default: () => (
      <div className="text-center py-12">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          ページが見つかりません
        </h1>
        <p className="text-gray-600 mb-8">
          お探しのページは存在しないか、移動した可能性があります。
        </p>
        <div className="space-x-4">
          <button 
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            戻る
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    )
  })
)

/**
 * Main App Component
 */
function App() {
  const handleGlobalSearch = (stockCode: string, useRealData: boolean) => {
    // This function is called from header search
    // Navigation is handled by the header component itself
    console.log('Global search:', stockCode, useRealData)
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Demo page - standalone without layout */}
            <Route path="/demo" element={<DemoPage />} />
            
            <Route path="/" element={<Layout onSearch={handleGlobalSearch} />}>
              {/* Main Routes */}
              <Route index element={<SimplifiedHomePage />} />
              <Route path="stock/:stockCode" element={<StockDetailPage />} />
              <Route path="stocks/:stockCode/detail" element={<StockDetailPage />} />
              <Route path="watchlist" element={<WatchlistPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="settings" element={<SettingsPage />} />
              
              {/* Legacy route for complex home page */}
              <Route path="home-advanced" element={<HomePage />} />
              
              {/* New Feature Routes */}
              <Route path="recommended-stocks" element={<RecommendedStocksPage />} />
              <Route path="trading-recommendations" element={<TradingRecommendationsPage />} />
              
              {/* Test Page for debugging */}
              <Route path="test" element={<TestPage />} />
              
              {/* Lazy Loaded Routes */}
              <Route 
                path="about" 
                element={
                  <Suspense fallback={<LoadingLayout message="ページを読み込み中..." />}>
                    <AboutPage />
                  </Suspense>
                } 
              />
              
              {/* Redirect legacy routes */}
              <Route path="stocks/:stockCode" element={<Navigate to="/stock/:stockCode" replace />} />
              <Route path="portfolio" element={<Navigate to="/watchlist" replace />} />
              
              {/* 404 Page */}
              <Route 
                path="*" 
                element={
                  <Suspense fallback={<LoadingLayout />}>
                    <NotFoundPage />
                  </Suspense>
                } 
              />
            </Route>
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
