/**
 * Header Component
 * 
 * Main navigation header with search functionality, navigation links,
 * and responsive mobile menu.
 */

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CompactStockSearch } from '../stock/StockSearch'
import Button, { IconButton } from '../ui/Button'

interface HeaderProps {
  onSearch?: (stockCode: string, useRealData: boolean) => void
}

export function Header({ onSearch }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSearch = (stockCode: string, useRealData: boolean) => {
    // Navigate to stock details page
    navigate(`/stock/${stockCode}${useRealData ? '?real=true' : ''}`)
    onSearch?.(stockCode, useRealData)
    setMobileMenuOpen(false)
  }

  const navigationItems = [
    { path: '/', label: 'ホーム', icon: '🏠' },
    { path: '/watchlist', label: 'ウォッチリスト', icon: '⭐' },
    { path: '/about', label: 'About', icon: 'ℹ️' }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 hover:opacity-75 transition-opacity"
            >
              <div className="text-2xl">📈</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">株価チェッカー</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Stock Price Tracker</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(item.path) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Desktop Search */}
          <div className="hidden md:block">
            <CompactStockSearch 
              onSearch={handleSearch}
              className="w-64"
            />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <IconButton
              variant="ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="メニューを開く"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </IconButton>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-4">
            {/* Mobile Search */}
            <div className="px-2">
              <CompactStockSearch 
                onSearch={handleSearch}
                className="w-full"
              />
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-1">
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    setMobileMenuOpen(false)
                  }}
                  className={`
                    flex items-center space-x-2 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.path) 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header