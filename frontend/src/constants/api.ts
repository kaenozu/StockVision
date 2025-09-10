/**
 * API constants for the StockVision frontend application.
 */

// Development environment detection
export const IS_DEVELOPMENT = import.meta.env.DEV

// API Base URLs - Environment-aware configuration
export const API_BASE_URL = (() => {
  // Check for environment variable first (for production deployment)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // Default URLs for development/production
  return IS_DEVELOPMENT 
    ? '/api'  // Use relative path for development to leverage Vite proxy
    : 'http://localhost:8080/api'
})()

// Cache and refresh intervals (in milliseconds) - Increased to prevent rate limiting
export const CACHE_INTERVALS = {
  DEFAULT_REFRESH: 300000, // 5 minutes (was 30 seconds)
  PRICE_UPDATE: 600000,    // 10 minutes (was 1 minute)
  CHART_UPDATE: 900000,    // 15 minutes (was 5 minutes)
} as const

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const

// API Endpoints
export const API_ENDPOINTS = {
  STOCKS: '/stocks',
  WATCHLIST: '/watchlist',
  RECOMMENDATIONS: '/recommendations',
  PRICE_PREDICTIONS: '/price-predictions',
  TRADING_RECOMMENDATIONS: '/trading-recommendations',
} as const

// Stock data mock values
export const MOCK_VALUES = {
  DEFAULT_VOLUME: 8000000,
  DEFAULT_PRICE: 12543000,
} as const