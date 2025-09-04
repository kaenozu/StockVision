/**
 * TypeScript type definitions for Stock API
 * 
 * These interfaces match the API contract specifications exactly.
 * They are used by the stockApi service and React components.
 */

// Core stock data interface matching backend StockData model
export interface StockData {
  stock_code: string        // 4-digit stock code (e.g., "7203")
  company_name: string      // Company name (e.g., "トヨタ自動車株式会社")
  current_price: number     // Current stock price
  previous_close: number    // Previous day closing price
  price_change: number      // Absolute price change
  price_change_pct: number  // Percentage change
  last_updated?: string     // ISO timestamp (optional for some responses)
}

// Current price response interface matching backend CurrentPriceResponse
export interface CurrentPriceResponse {
  stock_code: string
  current_price: number
  previous_close: number
  price_change: number
  price_change_pct: number
  timestamp: string         // ISO timestamp
  market_status: MarketStatus
}

// Market status enumeration
export type MarketStatus = 'open' | 'closed' | 'pre_market' | 'after_hours'

// Price history item interface matching backend PriceHistoryItem
export interface PriceHistoryItem {
  date: string             // YYYY-MM-DD format
  open: number
  high: number
  low: number
  close: number
  volume: number
  stock_code: string       // 4-digit stock code
}

// Watchlist item interface for API responses
export interface WatchlistItemAPI {
  stock_code: string
  company_name: string
  added_date: string       // ISO timestamp
  alert_price?: number | null
  notes?: string | null
}

// Request interface for adding to watchlist
export interface AddWatchlistRequest {
  stock_code: string
  alert_price?: number | null
  notes?: string | null
}

// Client-side watchlist item (extends API response with local data)
export interface WatchlistItem extends WatchlistItemAPI {
  id?: string             // Local ID for React keys
  isLoading?: boolean     // UI loading state
  hasError?: boolean      // UI error state
}

// Chart configuration interface for client-side state
export interface ChartConfig {
  timeframe: ChartTimeframe
  chart_type: ChartType
  show_volume: boolean
  theme: 'light' | 'dark'
}

// Chart timeframe options
export type ChartTimeframe = '7d' | '30d' | '90d' | '1y'

// Chart type options
export type ChartType = 'line' | 'candlestick'

// API error interface
export interface APIError {
  status: number
  message: string
  error_type?: string
  detail?: string
}

// Generic API response wrapper
export interface APIResponse<T> {
  data: T
  status: 'success' | 'error'
  message?: string
  timestamp: string
}

// Application state interfaces
export interface AppState {
  current_stock: StockData | null
  search_query: string
  is_loading: boolean
  error_message: string | null
  watchlist: WatchlistItem[]
  chart_config: ChartConfig
}

// Component error state
export interface ComponentErrorState {
  has_error: boolean
  error_type: 'network' | 'validation' | 'api' | 'unknown'
  error_message: string
  retry_available: boolean
  last_error_time: string
}

// Stock code validation interface
export interface StockCodeValidation {
  is_valid: boolean
  error_message?: string
  normalized_code?: string
}

// Cache item interface for client-side caching
export interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

// Search result interface
export interface SearchResult {
  stock_code: string
  company_name: string
  current_price?: number
  price_change_pct?: number
  is_loading: boolean
  has_error: boolean
}

// Navigation state for React Router
export interface NavigationState {
  current_route: string
  stock_code?: string
  previous_route?: string
}

// Form validation interfaces
export interface ValidationResult {
  is_valid: boolean
  errors: string[]
  warnings: string[]
}

export interface StockSearchFormData {
  stock_code: string
  use_real_data: boolean
}

export interface WatchlistFormData {
  stock_code: string
  alert_price: string | null
  notes: string | null
}

// Utility types for React components
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  status: LoadingState
  error: string | null
}

// Chart data interfaces for Chart.js integration
export interface ChartDataPoint {
  x: string | number
  y: number
}

export interface ChartDataset {
  label: string
  data: ChartDataPoint[]
  borderColor: string
  backgroundColor: string
  fill?: boolean
}

export interface ChartData {
  labels: string[]
  datasets: ChartDataset[]
}

// Price formatting utilities
export interface PriceFormatOptions {
  locale: string
  currency: string
  minimumFractionDigits: number
  maximumFractionDigits: number
}

// Constants for validation
export const STOCK_CODE_PATTERN = /^[0-9]{4}$/
export const MAX_DAYS_HISTORY = 365
export const MIN_DAYS_HISTORY = 1
export const DEFAULT_DAYS_HISTORY = 30

// Type guards for runtime validation
export function isValidStockCode(code: string): code is string {
  return STOCK_CODE_PATTERN.test(code)
}

export function isStockData(obj: any): obj is StockData {
  return (
    obj &&
    typeof obj.stock_code === 'string' &&
    isValidStockCode(obj.stock_code) &&
    typeof obj.company_name === 'string' &&
    typeof obj.current_price === 'number' &&
    typeof obj.previous_close === 'number' &&
    typeof obj.price_change === 'number' &&
    typeof obj.price_change_pct === 'number'
  )
}

export function isCurrentPriceResponse(obj: any): obj is CurrentPriceResponse {
  // Debug logging
  console.log('Validating CurrentPriceResponse:', obj);
  
  if (!obj) {
    console.log('Validation failed: obj is falsy');
    return false;
  }
  
  if (typeof obj.stock_code !== 'string') {
    console.log('Validation failed: stock_code is not string, got:', typeof obj.stock_code);
    return false;
  }
  
  if (!isValidStockCode(obj.stock_code)) {
    console.log('Validation failed: invalid stock code format:', obj.stock_code);
    return false;
  }
  
  if (typeof obj.current_price !== 'number') {
    console.log('Validation failed: current_price is not number, got:', typeof obj.current_price);
    return false;
  }
  
  if (typeof obj.previous_close !== 'number') {
    console.log('Validation failed: previous_close is not number, got:', typeof obj.previous_close);
    return false;
  }
  
  if (typeof obj.price_change !== 'number') {
    console.log('Validation failed: price_change is not number, got:', typeof obj.price_change);
    return false;
  }
  
  if (typeof obj.price_change_pct !== 'number') {
    console.log('Validation failed: price_change_pct is not number, got:', typeof obj.price_change_pct);
    return false;
  }
  
  if (typeof obj.timestamp !== 'string') {
    console.log('Validation failed: timestamp is not string, got:', typeof obj.timestamp);
    return false;
  }
  
  if (!['open', 'closed', 'pre_market', 'after_hours'].includes(obj.market_status)) {
    console.log('Validation failed: invalid market_status:', obj.market_status);
    return false;
  }
  
  console.log('Validation passed');
  return true;
}

export function isPriceHistoryItem(obj: any): obj is PriceHistoryItem {
  return (
    obj &&
    typeof obj.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(obj.date) &&
    typeof obj.open === 'number' &&
    typeof obj.high === 'number' &&
    typeof obj.low === 'number' &&
    typeof obj.close === 'number' &&
    typeof obj.volume === 'number' &&
    typeof obj.stock_code === 'string' &&
    isValidStockCode(obj.stock_code) &&
    obj.high >= Math.max(obj.open, obj.close) &&
    obj.low <= Math.min(obj.open, obj.close) &&
    obj.volume >= 0
  )
}

export function isWatchlistItemAPI(obj: any): obj is WatchlistItemAPI {
  return (
    obj &&
    typeof obj.stock_code === 'string' &&
    isValidStockCode(obj.stock_code) &&
    typeof obj.company_name === 'string' &&
    typeof obj.added_date === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(obj.added_date) &&
    (obj.alert_price === null || (typeof obj.alert_price === 'number' && obj.alert_price > 0)) &&
    (obj.notes === null || typeof obj.notes === 'string')
  )
}