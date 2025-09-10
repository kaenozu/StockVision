/**
 * Header Component
 * 
 * Main navigation header with search functionality, navigation links,
 * and responsive mobile menu.
 */

import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useTranslation } from 'react-i18next'
import { CompactStockSearch } from '../stock/StockSearch'
import { IconButton } from '../UI/Button'
import { SUPPORTED_LANGUAGES } from '../../i18n/config'

interface HeaderProps {
  onSearch?: (stockCode: string, useRealData: boolean) => void
}

export function Header({ onSearch }: HeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { i18n, t } = useTranslation(['common'])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false)

  const handleSearch = (stockCode: string, useRealData: boolean) => {
    // Navigate to stock details page
    navigate(`/stock/${stockCode}${useRealData ? '?real=true' : ''}`)
    onSearch?.(stockCode, useRealData)
    setMobileMenuOpen(false)
  }

  // 言語を変更する関数
  const changeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng)
    setLanguageSelectorOpen(false) // 言語セレクターを閉じる
  }

  const navigationItems = [
    { path: '/', label: t('common.home'), icon: '🏠' },
    { path: '/watchlist', label: t('common.watchlist'), icon: '⭐' },
    { path: '/performance', label: t('common.performance'), icon: '📊' },
    { path: '/docs', label: t('common.documents'), icon: '📚' },
    { path: '/about', label: t('common.about'), icon: 'ℹ️' }
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo and Brand - Responsive */}
          <div className="flex items-center flex-shrink-0">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-1 sm:space-x-2 hover:opacity-75 transition-opacity"
            >
              <div className="text-xl sm:text-2xl">📈</div>
              <div>
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 truncate max-w-[100px] sm:max-w-none">株価チェッカー</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Stock Price Tracker</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation - Responsive with better breakpoints */}
          <nav className="hidden lg:flex items-center space-x-2 xl:space-x-4">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  flex items-center space-x-1 px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium transition-colors whitespace-nowrap
                  ${isActive(item.path) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <span className="text-base lg:text-lg">{item.icon}</span>
                <span className="hidden xl:inline">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right Side Controls - Responsive */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 flex-shrink-0">
            {/* Language Selector (Desktop) */}
            <div className="hidden lg:relative">
              <button
                onClick={() => setLanguageSelectorOpen(!languageSelectorOpen)}
                className={`
                  flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${theme === 'dark' 
                    ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
                aria-label={t('common.language')}
              >
                <span className="text-lg">🌐</span>
                <span>{SUPPORTED_LANGUAGES.find(lang => lang.code === i18n.language)?.name || i18n.language}</span>
              </button>
              
              {/* Language Dropdown */}
              {languageSelectorOpen && (
                <div className={`
                  absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50
                  ${theme === 'dark' ? 'bg-gray-800 ring-1 ring-gray-700' : 'bg-white ring-1 ring-gray-200'}
                `}>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`
                        block w-full text-left px-4 py-2 text-sm transition-colors
                        ${i18n.language === lang.code
                          ? theme === 'dark'
                            ? 'text-blue-400 bg-gray-750'
                            : 'text-blue-600 bg-blue-50'
                          : theme === 'dark'
                            ? 'text-gray-300 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Theme Toggle */}
            <button
              onClick={() => {
                console.log('Theme toggle clicked, current theme:', theme)
                toggleTheme()
              }}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('common.theme')}
            >
              <span className="text-2xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>

            {/* Desktop Search */}
            <div className="hidden xl:block">
              <CompactStockSearch 
                onSearch={handleSearch}
                className="w-48 2xl:w-64"
              />
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <IconButton
                variant="ghost"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="メニューを開く"
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </IconButton>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4 space-y-4">
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
                      ? theme === 'dark' 
                        ? 'text-blue-400 bg-gray-800' 
                        : 'text-blue-600 bg-blue-50'
                      : theme === 'dark'
                        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            
            {/* Mobile Language Selector */}
            <div className="px-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('common.language')}
                </span>
                <select
                  value={i18n.language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className={`
                    px-3 py-1 rounded-md text-sm
                    ${theme === 'dark' 
                      ? 'bg-gray-800 text-gray-300 border-gray-700' 
                      : 'bg-white text-gray-700 border-gray-300'
                    }
                  `}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
