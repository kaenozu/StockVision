/**
 * Stock API Client Service
 * 
 * This service provides typed HTTP client functions for the FastAPI backend.
 * It handles request/response transformation, error handling, and data validation.
 * 
 * Features:
 * - Axios-based HTTP client with configurable timeouts
 * - Typed request/response interfaces
 * - Runtime data validation using type guards
 * - Comprehensive error handling with custom error types
 * - Support for both mock and real data modes
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'
import {
  StockData,
  CurrentPriceResponse,
  PriceHistoryItem,
  WatchlistItemAPI,
  AddWatchlistRequest,
  APIError,
  APIResponse,
  isValidStockCode,
  isStockData,
  isCurrentPriceResponse,
  isPriceHistoryItem,
  isWatchlistItemAPI,
  DEFAULT_DAYS_HISTORY,
  MAX_DAYS_HISTORY,
  MIN_DAYS_HISTORY
} from '../types/stock'

/**
 * Stock API Configuration
 */
interface StockApiConfig {
  baseURL: string
  timeout: number
  retries: number
  retryDelay: number
}

/**
 * Default configuration for the API client
 */
const DEFAULT_CONFIG: StockApiConfig = {
  baseURL: process.env.NODE_ENV === 'test' ? 'http://localhost:8001' : '/api',
  timeout: 10000, // 10 seconds
  retries: 3,
  retryDelay: 1000 // 1 second
}

/**
 * Custom error class for API errors
 */
export class StockApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public errorType?: string,
    public detail?: string
  ) {
    super(message)
    this.name = 'StockApiError'
  }
}

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Stock API Client Class
 */
export class StockApiClient {
  private client: AxiosInstance
  private config: StockApiConfig

  constructor(config: Partial<StockApiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // Create axios instance with configuration
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    // Setup request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[StockAPI] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => Promise.reject(error)
    )

    // Setup response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[StockAPI] Response ${response.status} for ${response.config.url}`)
        return response
      },
      (error) => this.handleHttpError(error)
    )
  }

  /**
   * Handle HTTP errors and transform them to StockApiError
   */
  private handleHttpError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      const apiError = data as APIError
      
      throw new StockApiError(
        status,
        apiError.message || `HTTP ${status} Error`,
        apiError.error_type,
        apiError.detail
      )
    } else if (error.request) {
      // Request was made but no response received
      throw new StockApiError(0, 'Network Error', 'network', 'No response from server')
    } else {
      // Something else happened
      throw new StockApiError(0, error.message || 'Unknown Error', 'unknown')
    }
  }

  /**
   * Validate stock code format
   */
  private validateStockCode(stockCode: string): void {
    if (!isValidStockCode(stockCode)) {
      throw new ValidationError('Invalid stock code format. Must be 4 digits.', 'stock_code')
    }
  }

  /**
   * Validate days parameter
   */
  private validateDays(days: number): void {
    if (days < MIN_DAYS_HISTORY || days > MAX_DAYS_HISTORY) {
      throw new ValidationError(
        `Invalid days parameter. Must be between ${MIN_DAYS_HISTORY} and ${MAX_DAYS_HISTORY}.`,
        'days'
      )
    }
  }

  /**
   * GET /stocks/{code} - Get basic stock information
   */
  async getStockData(stockCode: string, useRealData = false): Promise<StockData> {
    this.validateStockCode(stockCode)

    const params: Record<string, any> = {}
    if (useRealData) {
      params.use_real_data = true
    }

    const response = await this.client.get<StockData>(
      `/stocks/${stockCode}`,
      { params }
    )

    const stockData = response.data

    // Validate response data structure
    if (!isStockData(stockData)) {
      throw new ValidationError('Invalid data type in StockData response')
    }

    return stockData
  }

  /**
   * GET /stocks/{code}/current - Get current price information
   */
  async getCurrentPrice(stockCode: string, useRealData = false): Promise<CurrentPriceResponse> {
    this.validateStockCode(stockCode)

    const params: Record<string, any> = {}
    if (useRealData) {
      params.use_real_data = true
    }

    const response = await this.client.get<CurrentPriceResponse>(
      `/stocks/${stockCode}/current`,
      { params }
    )

    const currentPrice = response.data

    // Validate response data structure
    if (!isCurrentPriceResponse(currentPrice)) {
      throw new ValidationError('Invalid data type in CurrentPriceResponse')
    }

    return currentPrice
  }

  /**
   * GET /stocks/{code}/history - Get price history
   */
  async getPriceHistory(
    stockCode: string, 
    days: number = DEFAULT_DAYS_HISTORY,
    useRealData = false
  ): Promise<PriceHistoryItem[]> {
    this.validateStockCode(stockCode)
    this.validateDays(days)

    const params: Record<string, any> = { days }
    if (useRealData) {
      params.use_real_data = true
    }

    const response = await this.client.get<PriceHistoryItem[]>(
      `/stocks/${stockCode}/history`,
      { params }
    )

    const history = response.data

    // Validate response data structure
    if (!Array.isArray(history)) {
      throw new ValidationError('Invalid data type: expected array in PriceHistory response')
    }

    // Validate each history item and OHLC relationships
    for (const item of history) {
      if (!isPriceHistoryItem(item)) {
        throw new ValidationError('Invalid data type in PriceHistoryItem')
      }

      // Validate OHLC data relationships
      if (item.high < Math.max(item.open, item.close)) {
        throw new ValidationError('Invalid OHLC data: high price is less than open/close')
      }
      if (item.low > Math.min(item.open, item.close)) {
        throw new ValidationError('Invalid OHLC data: low price is greater than open/close')
      }
      if (item.volume < 0) {
        throw new ValidationError('Invalid volume data: volume cannot be negative')
      }
    }

    // Sort by date descending (most recent first)
    const sortedHistory = history.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return sortedHistory
  }

  /**
   * GET /watchlist - Get user's watchlist
   */
  async getWatchlist(): Promise<WatchlistItemAPI[]> {
    const response = await this.client.get<WatchlistItemAPI[]>('/watchlist')
    
    const watchlist = response.data

    // Validate response data structure
    if (!Array.isArray(watchlist)) {
      throw new ValidationError('Invalid data type: expected array in watchlist response')
    }

    // Validate each watchlist item
    for (const item of watchlist) {
      if (!isWatchlistItemAPI(item)) {
        throw new ValidationError('Invalid data type in WatchlistItemAPI')
      }
    }

    return watchlist
  }

  /**
   * POST /watchlist - Add stock to watchlist
   */
  async addToWatchlist(request: AddWatchlistRequest): Promise<WatchlistItemAPI> {
    // Validate request data
    this.validateStockCode(request.stock_code)
    
    if (request.alert_price !== undefined && request.alert_price !== null && request.alert_price <= 0) {
      throw new ValidationError('Invalid alert price: must be greater than 0', 'alert_price')
    }

    // Validate request data types
    if (typeof request.stock_code !== 'string') {
      throw new ValidationError('Invalid request data type: stock_code must be string')
    }
    if (request.alert_price !== undefined && request.alert_price !== null && typeof request.alert_price !== 'number') {
      throw new ValidationError('Invalid request data type: alert_price must be number or null')
    }

    const response = await this.client.post<WatchlistItemAPI>(
      '/watchlist',
      request
    )

    const watchlistItem = response.data

    // Validate response data structure
    if (!isWatchlistItemAPI(watchlistItem)) {
      throw new ValidationError('Invalid data type in WatchlistItemAPI response')
    }

    return watchlistItem
  }

  /**
   * DELETE /watchlist/{stock_code} - Remove stock from watchlist
   */
  async removeFromWatchlist(stockCode: string): Promise<{ message: string }> {
    this.validateStockCode(stockCode)

    const response = await this.client.delete<{ message: string }>(
      `/watchlist/${stockCode}`
    )

    return response.data
  }

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get<{ status: string; timestamp: string }>(
      '/health'
    )

    return response.data
  }
}

/**
 * Default stock API client instance
 * This is the primary export that components will use
 */
export const stockApi = new StockApiClient()

/**
 * Create a custom stock API client with specific configuration
 */
export function createStockApiClient(config: Partial<StockApiConfig>): StockApiClient {
  return new StockApiClient(config)
}

/**
 * Utility function to check if an error is a StockApiError
 */
export function isStockApiError(error: any): error is StockApiError {
  return error instanceof StockApiError
}

/**
 * Utility function to check if an error is a ValidationError
 */
export function isValidationError(error: any): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Format API errors for display to users
 */
export function formatApiError(error: unknown): string {
  if (isStockApiError(error)) {
    return error.message
  } else if (isValidationError(error)) {
    return error.message
  } else if (error instanceof Error) {
    return error.message
  } else {
    return 'Unknown error occurred'
  }
}

// Error classes are already exported above