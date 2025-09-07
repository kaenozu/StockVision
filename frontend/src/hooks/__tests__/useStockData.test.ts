/**
 * useStockData Hook Tests
 * 
 * Tests for edge cases and error scenarios in the useStockData hook.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useStockData } from '../stock/useStockData'
import { stockApi, ValidationError } from '../../services/stockApi'

// Mock the stockApi
vi.mock('../../services/stockApi', () => ({
  stockApi: {
    getStockData: vi.fn()
  },
  ValidationError: class extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'ValidationError'
    }
  }
}))

// Mock validation
vi.mock('../../utils/validation', () => ({
  validateStockDataResponse: vi.fn(() => ({
    is_valid: true,
    errors: []
  }))
}))

const mockStockApi = stockApi as any
const mockValidation = vi.mocked(await import('../../utils/validation'))

describe('useStockData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Edge Cases', () => {
    test('should handle empty stock code', async () => {
      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('')
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Stock code is required')
      expect(result.current.status).toBe('error')
      expect(mockStockApi.getStockData).not.toHaveBeenCalled()
    })

    test('should handle whitespace-only stock code', async () => {
      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('   ')
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Stock code is required')
      expect(result.current.status).toBe('error')
      expect(mockStockApi.getStockData).not.toHaveBeenCalled()
    })

    test('should handle null stock code', async () => {
      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData(null as any)
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Stock code is required')
      expect(result.current.status).toBe('error')
      expect(mockStockApi.getStockData).not.toHaveBeenCalled()
    })

    test('should handle undefined stock code', async () => {
      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData(undefined as any)
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Stock code is required')
      expect(result.current.status).toBe('error')
      expect(mockStockApi.getStockData).not.toHaveBeenCalled()
    })
  })

  describe('Error Scenarios', () => {
    test('should handle API network error', async () => {
      const networkError = new Error('Network request failed')
      mockStockApi.getStockData.mockRejectedValueOnce(networkError)

      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('AAPL')
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Network request failed')
      expect(result.current.status).toBe('error')
      expect(result.current.data).toBeNull()
    })

    test('should handle API timeout', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockStockApi.getStockData.mockRejectedValueOnce(timeoutError)

      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('AAPL')
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Request timeout')
      expect(result.current.status).toBe('error')
    })

    test('should handle validation error', async () => {
      const mockData = { stock_code: 'AAPL', invalid_field: true }
      mockStockApi.getStockData.mockResolvedValueOnce(mockData)
      mockValidation.validateStockDataResponse.mockReturnValueOnce({
        is_valid: false,
        errors: ['Invalid data format', 'Missing required field']
      })

      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('AAPL')
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Data validation failed: Invalid data format, Missing required field')
      expect(result.current.status).toBe('error')
    })

    test('should handle non-Error thrown objects', async () => {
      mockStockApi.getStockData.mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('AAPL')
      
      expect(response).toBeNull()
      expect(result.current.error).toBe('Failed to fetch stock data')
      expect(result.current.status).toBe('error')
    })

    test('should handle API returning null', async () => {
      mockStockApi.getStockData.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useStockData())
      
      const response = await result.current.fetchStockData('AAPL')
      
      expect(response).toBeNull()
      expect(result.current.data).toBeNull()
      expect(result.current.status).toBe('success')
    })
  })

  describe('Caching Behavior', () => {
    test('should return cached data when within timeout', async () => {
      const mockData = { stock_code: 'AAPL', company_name: 'Apple' }
      mockStockApi.getStockData.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useStockData({ cacheTimeout: 60000 }))
      
      // First call
      await result.current.fetchStockData('AAPL')
      expect(mockStockApi.getStockData).toHaveBeenCalledTimes(1)
      expect(result.current.data).toEqual(mockData)

      // Second call within timeout - should return cached data
      const secondResponse = await result.current.fetchStockData('AAPL')
      expect(mockStockApi.getStockData).toHaveBeenCalledTimes(1) // No additional API call
      expect(secondResponse).toEqual(mockData)
    })

    test('should fetch new data when cache expired', async () => {
      const mockData1 = { stock_code: 'AAPL', company_name: 'Apple' }
      const mockData2 = { stock_code: 'AAPL', company_name: 'Apple Inc.' }
      mockStockApi.getStockData
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result } = renderHook(() => useStockData({ cacheTimeout: 1000 }))
      
      // First call
      await result.current.fetchStockData('AAPL')
      expect(result.current.data).toEqual(mockData1)

      // Advance time beyond cache timeout
      vi.advanceTimersByTime(1001)

      // Second call after timeout - should fetch new data
      await result.current.fetchStockData('AAPL')
      expect(mockStockApi.getStockData).toHaveBeenCalledTimes(2)
      expect(result.current.data).toEqual(mockData2)
    })

    test('should force refresh even with valid cache', async () => {
      const mockData1 = { stock_code: 'AAPL', company_name: 'Apple' }
      const mockData2 = { stock_code: 'AAPL', company_name: 'Apple Inc.' }
      mockStockApi.getStockData
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)

      const { result } = renderHook(() => useStockData({ cacheTimeout: 60000 }))
      
      // First call
      await result.current.fetchStockData('AAPL')
      expect(result.current.data).toEqual(mockData1)

      // Force refresh
      await result.current.fetchStockData('AAPL', false, true)
      expect(mockStockApi.getStockData).toHaveBeenCalledTimes(2)
      expect(result.current.data).toEqual(mockData2)
    })
  })

  describe('State Management', () => {
    test('should track loading state correctly', async () => {
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      mockStockApi.getStockData.mockReturnValueOnce(promise)

      const { result } = renderHook(() => useStockData())
      
      // Start fetch
      const fetchPromise = result.current.fetchStockData('AAPL')
      
      // Should be loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.status).toBe('loading')
      
      // Resolve the API call
      resolvePromise!({ stock_code: 'AAPL' })
      await fetchPromise
      
      // Should complete loading
      expect(result.current.isLoading).toBe(false)
      expect(result.current.status).toBe('success')
    })

    test('should clear error on successful fetch', async () => {
      mockStockApi.getStockData
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ stock_code: 'AAPL' })

      const { result } = renderHook(() => useStockData())
      
      // First call that fails
      await result.current.fetchStockData('AAPL')
      expect(result.current.error).toBe('First error')
      
      // Second call that succeeds
      await result.current.fetchStockData('AAPL', false, true)
      expect(result.current.error).toBeNull()
      expect(result.current.status).toBe('success')
    })
  })

  describe('Options', () => {
    test('should skip validation when autoValidation is disabled', async () => {
      const mockData = { stock_code: 'AAPL', invalid_field: true }
      mockStockApi.getStockData.mockResolvedValueOnce(mockData)
      mockValidation.validateStockDataResponse.mockReturnValueOnce({
        is_valid: false,
        errors: ['Invalid data']
      })

      const { result } = renderHook(() => useStockData({ autoValidation: false }))
      
      const response = await result.current.fetchStockData('AAPL')
      
      expect(response).toEqual(mockData)
      expect(result.current.error).toBeNull()
      expect(result.current.status).toBe('success')
      expect(mockValidation.validateStockDataResponse).not.toHaveBeenCalled()
    })
  })

  describe('Utility Functions', () => {
    test('should clear error state', async () => {
      mockStockApi.getStockData.mockRejectedValueOnce(new Error('Test error'))

      const { result } = renderHook(() => useStockData())
      
      await result.current.fetchStockData('AAPL')
      expect(result.current.error).toBe('Test error')
      
      result.current.clearError()
      expect(result.current.error).toBeNull()
    })

    test('should reset all state', () => {
      const { result } = renderHook(() => useStockData())
      
      // Manually set some state to verify reset
      result.current.reset()
      
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()
      expect(result.current.status).toBe('idle')
      expect(result.current.isIdle).toBe(true)
    })
  })
})