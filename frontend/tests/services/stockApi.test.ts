/**
 * StockApiClient Unit Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import { StockApiClient, StockApiError, ValidationError } from '../../src/services/stockApi'
import type { StockData, CurrentPriceResponse } from '../../src/types/stock'

// Mock axios
vi.mock('axios')
const mockAxios = vi.mocked(axios, true)

// Mock cache services
vi.mock('../../src/services/cacheService', () => ({
  stockDataCache: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(() => ({})),
  },
  priceHistoryCache: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(() => ({})),
  },
  recommendationCache: {
    get: vi.fn(),
    set: vi.fn(),
    clear: vi.fn(),
    getStats: vi.fn(() => ({})),
  },
}))

// Mock error logger
vi.mock('../../src/services/errorLogger', () => ({
  errorLogger: {
    logError: vi.fn(),
  },
  logNetworkError: vi.fn(),
  logValidationError: vi.fn(),
  logCacheError: vi.fn(),
  ErrorCategory: {},
  ErrorSeverity: {},
}))

describe('StockApiClient', () => {
  let apiClient: StockApiClient
  let mockAxiosInstance: any

  beforeEach(() => {
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }
    
    mockAxios.create = vi.fn(() => mockAxiosInstance)
    
    apiClient = new StockApiClient({
      baseURL: 'http://test-api.com',
      timeout: 5000,
      retries: 2,
      retryDelay: 100,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://test-api.com',
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
    })

    it('should set up interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled()
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled()
    })
  })

  describe('getStockData', () => {
    const mockStockData: StockData = {
      stock_code: '7203',
      company_name: 'トヨタ自動車',
      current_price: 2500,
      previous_close: 2480,
      price_change: 20,
      price_change_pct: 0.81,
      day_high: 2550,
      day_low: 2470,
      volume: 1000000,
      market_cap: 25000000000,
      year_high: 2800,
      year_low: 2000,
      timestamp: '2024-01-01T09:00:00Z',
    }

    it('should validate stock code format', async () => {
      await expect(apiClient.getStockData('invalid')).rejects.toThrow(ValidationError)
      await expect(apiClient.getStockData('12345')).rejects.toThrow(ValidationError)
    })

    it('should successfully fetch stock data', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockStockData })

      const result = await apiClient.getStockData('7203')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/stocks/7203', {
        params: { use_real_data: true },
      })
      expect(result).toMatchObject({
        stock_code: '7203',
        company_name: expect.any(String),
        current_price: expect.any(Number),
      })
    })

    it('should handle network errors with retry', async () => {
      const networkError = new Error('Network Error')
      mockAxiosInstance.get
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: mockStockData })

      const result = await apiClient.getStockData('7203')

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3)
      expect(result).toMatchObject({
        stock_code: '7203',
      })
    })

    it('should not retry on validation errors', async () => {
      const invalidData = { invalid: 'data' }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: invalidData })

      await expect(apiClient.getStockData('7203')).rejects.toThrow(ValidationError)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('getCurrentPrice', () => {
    const mockCurrentPrice: CurrentPriceResponse = {
      stock_code: '7203',
      current_price: 2500,
      previous_close: 2480,
      price_change: 20,
      price_change_pct: 0.81,
      timestamp: '2024-01-01T09:00:00Z',
      market_status: 'open',
    }

    it('should fetch current price data', async () => {
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockCurrentPrice })

      const result = await apiClient.getCurrentPrice('7203')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/stocks/7203/current', {
        params: { use_real_data: true },
      })
      expect(result).toMatchObject({
        stock_code: '7203',
        current_price: expect.any(Number),
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle HTTP 404 errors', async () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Stock not found', error_type: 'not_found' },
        },
        config: { url: '/stocks/9999', method: 'GET' },
      }
      
      mockAxiosInstance.get.mockRejectedValueOnce(error)

      await expect(apiClient.getStockData('7203')).rejects.toThrow(StockApiError)
    })

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      mockAxiosInstance.get.mockRejectedValue(timeoutError)

      await expect(apiClient.getStockData('7203')).rejects.toThrow()
    })
  })

  describe('Retry Logic', () => {
    it('should retry on 5xx server errors', async () => {
      const serverError = {
        response: { status: 500, data: {} },
        config: { url: '/stocks/7203' },
      }
      
      mockAxiosInstance.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ data: { stock_code: '7203', current_price: 2500 } })

      // Should not throw and should retry
      const result = await apiClient.getCurrentPrice('7203')
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2)
    })

    it('should not retry on 4xx client errors', async () => {
      const clientError = {
        response: { status: 400, data: { message: 'Bad request' } },
        config: { url: '/stocks/7203' },
      }
      
      mockAxiosInstance.get.mockRejectedValueOnce(clientError)

      await expect(apiClient.getCurrentPrice('7203')).rejects.toThrow(StockApiError)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Validation', () => {
    it('should validate stock code format correctly', async () => {
      // Valid codes
      expect(() => apiClient['validateStockCode']('1234')).not.toThrow()
      expect(() => apiClient['validateStockCode']('7203')).not.toThrow()

      // Invalid codes
      expect(() => apiClient['validateStockCode']('123')).toThrow(ValidationError)
      expect(() => apiClient['validateStockCode']('12345')).toThrow(ValidationError)
      expect(() => apiClient['validateStockCode']('abcd')).toThrow(ValidationError)
      expect(() => apiClient['validateStockCode']('')).toThrow(ValidationError)
    })
  })

  describe('Cache Integration', () => {
    it('should clear all caches', () => {
      const { stockDataCache, priceHistoryCache, recommendationCache } = require('../../src/services/cacheService')
      
      apiClient.clearCache()

      expect(stockDataCache.clear).toHaveBeenCalled()
      expect(priceHistoryCache.clear).toHaveBeenCalled()
      expect(recommendationCache.clear).toHaveBeenCalled()
    })

    it('should get cache statistics', () => {
      const stats = apiClient.getCacheStats()

      expect(stats).toHaveProperty('stockData')
      expect(stats).toHaveProperty('priceHistory')
      expect(stats).toHaveProperty('recommendations')
    })
  })

  describe('Health Check', () => {
    it('should perform health check', async () => {
      const healthResponse = { status: 'ok', timestamp: '2024-01-01T00:00:00Z' }
      mockAxiosInstance.get.mockResolvedValueOnce({ data: healthResponse })

      const result = await apiClient.healthCheck()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health')
      expect(result).toEqual(healthResponse)
    })
  })
})