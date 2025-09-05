/**
 * Main Layout Component
 * 
 * Wraps the entire application with header, footer, and main content area.
 * Provides consistent layout structure and responsive design.
 */

import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import { MobileNav } from './MobileNav'
import { PageLoadingOverlay } from '../UI/LoadingSpinner'

interface LayoutProps {
  loading?: boolean
  onSearch?: (stockCode: string, useRealData: boolean) => void
}

export function Layout({ loading = false, onSearch }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <Header onSearch={onSearch} />
      
      {/* Main Content with mobile nav padding */}
      <main className="flex-1 pb-16 md:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
      
      {/* Footer */}
      <Footer />
      
      {/* Mobile Navigation */}
      <MobileNav />
      
      {/* Global Loading Overlay */}
      <PageLoadingOverlay isVisible={loading} />
    </div>
  )
}

/**
 * Centered Layout (for auth pages, error pages, etc.)
 */
export function CenteredLayout({ 
  children, 
  title, 
  subtitle,
  maxWidth = 'md'
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className={`${maxWidthClasses[maxWidth]} w-full space-y-8`}>
        {(title || subtitle) && (
          <div className="text-center">
            {title && (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

/**
 * Error Boundary Layout
 */
export function ErrorBoundaryLayout({
  error,
  onRetry
}: {
  error: Error
  onRetry?: () => void
}) {
  return (
    <CenteredLayout
      title="エラーが発生しました"
      subtitle="申し訳ございません。予期しないエラーが発生しました。"
      maxWidth="lg"
    >
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">😵</div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              システムエラー
            </h2>
            <p className="text-gray-600 text-sm">
              {error.message || '不明なエラーが発生しました'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-md p-4">
            <details className="text-left">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                技術的な詳細を表示
              </summary>
              <pre className="mt-2 text-xs text-gray-600 overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                再試行
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    </CenteredLayout>
  )
}

/**
 * Loading Layout (for initial app loading)
 */
export function LoadingLayout({ message = 'アプリケーションを読み込み中...' }: { message?: string }) {
  return (
    <CenteredLayout maxWidth="sm">
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <div className="text-center space-y-6">
          <div className="text-4xl">📈</div>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              株価チェッカー
            </h1>
            <p className="text-gray-600 text-sm mb-6">
              {message}
            </p>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </CenteredLayout>
  )
}

/**
 * Sidebar Layout (for pages with sidebar navigation)
 */
export function SidebarLayout({
  children,
  sidebar,
  sidebarWidth = 'w-64'
}: {
  children: React.ReactNode
  sidebar: React.ReactNode
  sidebarWidth?: string
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarWidth} bg-white shadow-sm border-r border-gray-200 min-h-screen`}>
          <div className="p-6">
            {sidebar}
          </div>
        </aside>
        
        {/* Main Content */}
        <main className="flex-1">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  )
}

export default Layout