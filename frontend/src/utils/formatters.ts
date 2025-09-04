/**
 * Data Formatting Utilities
 * 
 * Provides consistent formatting functions for displaying financial data,
 * dates, numbers, and other UI elements with Japanese localization support.
 */

import { PriceFormatOptions } from '../types/stock'

/**
 * Default price formatting options for Japanese Yen
 */
const DEFAULT_PRICE_OPTIONS: PriceFormatOptions = {
  locale: 'ja-JP',
  currency: 'JPY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
}

/**
 * Format price with Japanese Yen currency
 */
export function formatPrice(
  price: number,
  options: Partial<PriceFormatOptions> = {}
): string {
  const opts = { ...DEFAULT_PRICE_OPTIONS, ...options }
  
  try {
    return new Intl.NumberFormat(opts.locale, {
      style: 'currency',
      currency: opts.currency,
      minimumFractionDigits: opts.minimumFractionDigits,
      maximumFractionDigits: opts.maximumFractionDigits
    }).format(price)
  } catch (error) {
    console.warn('Price formatting error:', error)
    return `¥${price.toFixed(opts.maximumFractionDigits)}`
  }
}

/**
 * Format price without currency symbol (for display in tables)
 */
export function formatPriceValue(
  price: number,
  maximumFractionDigits: number = 2
): string {
  try {
    return new Intl.NumberFormat('ja-JP', {
      minimumFractionDigits: 0,
      maximumFractionDigits
    }).format(price)
  } catch (error) {
    console.warn('Price value formatting error:', error)
    return price.toFixed(maximumFractionDigits)
  }
}

/**
 * Format price change with appropriate sign and color class
 */
export function formatPriceChange(
  change: number,
  showSign: boolean = true
): {
  formatted: string
  colorClass: string
  sign: 'positive' | 'negative' | 'neutral'
} {
  const formatted = formatPriceValue(Math.abs(change))
  const sign = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
  
  let displayValue = formatted
  if (showSign) {
    if (change > 0) {
      displayValue = `+${formatted}`
    } else if (change < 0) {
      displayValue = `-${formatted}`
    }
  }
  
  const colorClass = sign === 'positive' ? 'price-positive' : 
                     sign === 'negative' ? 'price-negative' : 
                     'text-gray-600'
  
  return {
    formatted: displayValue,
    colorClass,
    sign
  }
}

/**
 * Format percentage change with appropriate sign and color class
 */
export function formatPercentageChange(
  percentage: number,
  showSign: boolean = true
): {
  formatted: string
  colorClass: string
  sign: 'positive' | 'negative' | 'neutral'
} {
  const rounded = Math.round(percentage * 100) / 100
  const sign = rounded > 0 ? 'positive' : rounded < 0 ? 'negative' : 'neutral'
  
  let displayValue = Math.abs(rounded).toFixed(2) + '%'
  if (showSign) {
    if (rounded > 0) {
      displayValue = `+${Math.abs(rounded).toFixed(2)}%`
    } else if (rounded < 0) {
      displayValue = `-${Math.abs(rounded).toFixed(2)}%`
    }
  }
  
  const colorClass = sign === 'positive' ? 'price-positive' : 
                     sign === 'negative' ? 'price-negative' : 
                     'text-gray-600'
  
  return {
    formatted: displayValue,
    colorClass,
    sign
  }
}

/**
 * Format volume with Japanese number formatting (万, 千万, 億)
 */
export function formatVolume(volume: number): string {
  if (volume === 0) return '0'
  
  try {
    if (volume >= 100000000) { // 1億以上
      return `${(volume / 100000000).toFixed(1)}億`
    } else if (volume >= 10000) { // 1万以上
      return `${(volume / 10000).toFixed(1)}万`
    } else {
      return new Intl.NumberFormat('ja-JP').format(volume)
    }
  } catch (error) {
    console.warn('Volume formatting error:', error)
    return volume.toString()
  }
}

/**
 * Format date for Japanese display (YYYY年MM月DD日)
 */
export function formatDateJapanese(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  } catch (error) {
    console.warn('Japanese date formatting error:', error)
    return dateString
  }
}

/**
 * Format date for display in charts and tables (MM/DD)
 */
export function formatDateShort(dateString: string): string {
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString
    }
    
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
  } catch (error) {
    console.warn('Short date formatting error:', error)
    return dateString
  }
}

/**
 * Format timestamp for display (YYYY/MM/DD HH:mm)
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return timestamp
    }
    
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  } catch (error) {
    console.warn('Timestamp formatting error:', error)
    return timestamp
  }
}

/**
 * Format relative time (e.g., "2分前", "1時間前")
 */
export function formatRelativeTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return timestamp
    }
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMinutes < 1) {
      return 'たった今'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分前`
    } else if (diffHours < 24) {
      return `${diffHours}時間前`
    } else if (diffDays < 7) {
      return `${diffDays}日前`
    } else {
      return formatDateJapanese(timestamp)
    }
  } catch (error) {
    console.warn('Relative time formatting error:', error)
    return timestamp
  }
}

/**
 * Format market status for Japanese display
 */
export function formatMarketStatus(status: string): {
  text: string
  colorClass: string
  icon: string
} {
  switch (status) {
    case 'open':
      return {
        text: '取引中',
        colorClass: 'text-green-600',
        icon: '🟢'
      }
    case 'closed':
      return {
        text: '取引終了',
        colorClass: 'text-red-600', 
        icon: '🔴'
      }
    case 'pre_market':
      return {
        text: '取引前',
        colorClass: 'text-yellow-600',
        icon: '🟡'
      }
    case 'after_hours':
      return {
        text: '時間外',
        colorClass: 'text-blue-600',
        icon: '🔵'
      }
    default:
      return {
        text: '不明',
        colorClass: 'text-gray-600',
        icon: '⚫'
      }
  }
}

/**
 * Format stock code with proper display (add leading zeros if needed)
 */
export function formatStockCode(code: string): string {
  if (!code || typeof code !== 'string') return ''
  
  const cleaned = code.replace(/[^0-9]/g, '')
  return cleaned.padStart(4, '0')
}

/**
 * Format company name for display (truncate if too long)
 */
export function formatCompanyName(name: string, maxLength: number = 20): string {
  if (!name || typeof name !== 'string') return ''
  
  if (name.length <= maxLength) return name
  
  return name.substring(0, maxLength - 1) + '…'
}

/**
 * Format large numbers with Japanese units (千, 万, 億)
 */
export function formatLargeNumber(num: number, precision: number = 1): string {
  if (Math.abs(num) >= 100000000) { // 1億以上
    return `${(num / 100000000).toFixed(precision)}億`
  } else if (Math.abs(num) >= 10000) { // 1万以上
    return `${(num / 10000).toFixed(precision)}万`
  } else if (Math.abs(num) >= 1000) { // 1千以上
    return `${(num / 1000).toFixed(precision)}千`
  } else {
    return num.toString()
  }
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Map common error messages to Japanese
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'ネットワークエラーが発生しました。接続を確認してください。'
    } else if (message.includes('timeout')) {
      return 'リクエストがタイムアウトしました。しばらく後で再試行してください。'
    } else if (message.includes('not found') || message.includes('404')) {
      return '指定された銘柄コードが見つかりませんでした。'
    } else if (message.includes('invalid') || message.includes('validation')) {
      return '入力データに問題があります。内容を確認してください。'
    } else {
      return error.message
    }
  } else if (typeof error === 'string') {
    return error
  } else {
    return '予期しないエラーが発生しました。'
  }
}

/**
 * Format loading state text for Japanese display
 */
export function formatLoadingText(type: string): string {
  switch (type) {
    case 'stock':
      return '銘柄情報を取得中...'
    case 'price':
      return '価格データを取得中...'
    case 'history':
      return '履歴データを取得中...'
    case 'watchlist':
      return 'ウォッチリストを取得中...'
    case 'search':
      return '検索中...'
    default:
      return '読み込み中...'
  }
}

/**
 * Utility function to safely format any value
 */
export function safeFormat<T>(
  value: T,
  formatter: (val: T) => string,
  fallback: string = '—'
): string {
  try {
    if (value === null || value === undefined) return fallback
    return formatter(value)
  } catch (error) {
    console.warn('Formatting error:', error)
    return fallback
  }
}