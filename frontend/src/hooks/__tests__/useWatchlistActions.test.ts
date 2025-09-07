/**
 * useWatchlistActions Hook Tests
 * 
 * Tests for edge cases and error scenarios in the useWatchlistActions hook.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWatchlistActions } from '../watchlist/useWatchlistActions'
import { stockApi } from '../../services/stockApi'
import { AddWatchlistRequest } from '../../types/stock'

// Mock the stockApi
vi.mock('../../services/stockApi', () => ({
  stockApi: {
    addToWatchlist: vi.fn(),
    removeFromWatchlist: vi.fn()
  }
}))

// Mock validation
vi.mock('../../utils/validation', () => ({
  validateAddWatchlistRequest: vi.fn(() => ({
    is_valid: true,
    errors: []
  }))
}))

const mockStockApi = stockApi as any
const mockValidation = vi.mocked(await import('../../utils/validation'))

describe('useWatchlistActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Add to Watchlist - Edge Cases', () => {
    test('should handle invalid request validation', async () => {
      mockValidation.validateAddWatchlistRequest.mockReturnValueOnce({
        is_valid: false,
        errors: ['Stock code is required', 'Invalid price format']
      })

      const onError = vi.fn()
      const { result } = renderHook(() => useWatchlistActions({ onError }))
      
      const request: AddWatchlistRequest = { stock_code: '' }
      const response = await result.current.addToWatchlist(request)
      
      expect(response).toBeNull()
      expect(result.current.getItemState('').hasError).toBe(true)
      expect(result.current.getItemError('')).toBe('Validation failed: Stock code is required, Invalid price format')
      expect(onError).toHaveBeenCalledWith('add', 'Validation failed: Stock code is required, Invalid price format')
      expect(mockStockApi.addToWatchlist).not.toHaveBeenCalled()
    })

    test('should handle network error', async () => {
      mockStockApi.addToWatchlist.mockRejectedValueOnce(new Error('Network error'))

      const onError = vi.fn()
      const { result } = renderHook(() => useWatchlistActions({ onError }))
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      const response = await result.current.addToWatchlist(request)
      
      expect(response).toBeNull()
      expect(result.current.getItemState('AAPL').hasError).toBe(true)
      expect(result.current.getItemState('AAPL').isAdding).toBe(false)
      expect(result.current.getItemError('AAPL')).toBe('Network error')
      expect(onError).toHaveBeenCalledWith('add', 'Network error')
    })

    test('should handle API timeout', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'TimeoutError'
      mockStockApi.addToWatchlist.mockRejectedValueOnce(timeoutError)

      const { result } = renderHook(() => useWatchlistActions())
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      const response = await result.current.addToWatchlist(request)
      
      expect(response).toBeNull()
      expect(result.current.globalError).toBe('Request timeout')
      expect(result.current.getItemError('AAPL')).toBe('Request timeout')
    })

    test('should handle non-Error thrown objects', async () => {
      mockStockApi.addToWatchlist.mockRejectedValueOnce('String error')

      const { result } = renderHook(() => useWatchlistActions())
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      const response = await result.current.addToWatchlist(request)
      
      expect(response).toBeNull()
      expect(result.current.getItemError('AAPL')).toBe('Failed to add to watchlist')
      expect(result.current.globalError).toBe('Failed to add to watchlist')
    })

    test('should handle successful add with callback', async () => {
      const mockItem = { 
        id: 'watchlist-AAPL', 
        stock_code: 'AAPL', 
        added_date: '2024-01-01',
        isLoading: false,
        hasError: false
      }
      mockStockApi.addToWatchlist.mockResolvedValueOnce(mockItem)

      const onSuccess = vi.fn()
      const { result } = renderHook(() => useWatchlistActions({ onSuccess }))
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      const response = await result.current.addToWatchlist(request)
      
      expect(response).toEqual(mockItem)
      expect(result.current.getItemState('AAPL').hasError).toBe(false)
      expect(result.current.getItemState('AAPL').isAdding).toBe(false)
      expect(result.current.globalError).toBeNull()
      expect(onSuccess).toHaveBeenCalledWith('add', mockItem)
    })
  })

  describe('Remove from Watchlist - Edge Cases', () => {
    test('should handle empty stock code', async () => {
      const onError = vi.fn()
      const { result } = renderHook(() => useWatchlistActions({ onError }))
      
      const response = await result.current.removeFromWatchlist('')
      
      expect(response).toBe(false)
      expect(result.current.getItemError('')).toBe('Stock code is required')
      expect(onError).toHaveBeenCalledWith('remove', 'Stock code is required')
      expect(mockStockApi.removeFromWatchlist).not.toHaveBeenCalled()
    })

    test('should handle whitespace-only stock code', async () => {
      const { result } = renderHook(() => useWatchlistActions())
      
      const response = await result.current.removeFromWatchlist('   ')
      
      expect(response).toBe(false)
      expect(result.current.getItemError('   ')).toBe('Stock code is required')
      expect(mockStockApi.removeFromWatchlist).not.toHaveBeenCalled()
    })

    test('should handle null stock code', async () => {
      const { result } = renderHook(() => useWatchlistActions())
      
      const response = await result.current.removeFromWatchlist(null as any)
      
      expect(response).toBe(false)
      expect(result.current.getItemError(null as any)).toBe('Stock code is required')
    })

    test('should handle API error during removal', async () => {
      mockStockApi.removeFromWatchlist.mockRejectedValueOnce(new Error('Stock not found'))

      const onError = vi.fn()
      const { result } = renderHook(() => useWatchlistActions({ onError }))
      
      const response = await result.current.removeFromWatchlist('AAPL')
      
      expect(response).toBe(false)
      expect(result.current.getItemState('AAPL').hasError).toBe(true)
      expect(result.current.getItemState('AAPL').isRemoving).toBe(false)
      expect(result.current.getItemError('AAPL')).toBe('Stock not found')
      expect(onError).toHaveBeenCalledWith('remove', 'Stock not found')
    })

    test('should handle successful removal with callback', async () => {
      mockStockApi.removeFromWatchlist.mockResolvedValueOnce(undefined)

      const onSuccess = vi.fn()
      const { result } = renderHook(() => useWatchlistActions({ onSuccess }))
      
      const response = await result.current.removeFromWatchlist('AAPL')
      
      expect(response).toBe(true)
      expect(result.current.getItemState('AAPL').hasError).toBe(false)
      expect(result.current.getItemState('AAPL').isRemoving).toBe(false)
      expect(result.current.globalError).toBeNull()
      expect(onSuccess).toHaveBeenCalledWith('remove', 'AAPL')
    })
  })

  describe('State Management', () => {
    test('should track individual item loading states', async () => {
      let resolveAdd: (value: any) => void
      let resolveRemove: (value: any) => void
      
      const addPromise = new Promise(resolve => { resolveAdd = resolve })
      const removePromise = new Promise(resolve => { resolveRemove = resolve })
      
      mockStockApi.addToWatchlist.mockReturnValueOnce(addPromise)
      mockStockApi.removeFromWatchlist.mockReturnValueOnce(removePromise)

      const { result } = renderHook(() => useWatchlistActions())
      
      // Start add operation
      const addRequest: AddWatchlistRequest = { stock_code: 'AAPL' }
      const addPromiseResult = result.current.addToWatchlist(addRequest)
      
      expect(result.current.getItemState('AAPL').isAdding).toBe(true)
      expect(result.current.isItemAdding('AAPL')).toBe(true)
      
      // Start remove operation for different stock
      const removePromiseResult = result.current.removeFromWatchlist('GOOGL')
      
      expect(result.current.getItemState('GOOGL').isRemoving).toBe(true)
      expect(result.current.isItemRemoving('GOOGL')).toBe(true)
      
      // Both should be tracked independently
      expect(result.current.hasAnyLoading).toBe(true)
      
      // Resolve operations
      resolveAdd!({ stock_code: 'AAPL' })
      resolveRemove!(undefined)
      
      await Promise.all([addPromiseResult, removePromiseResult])
      
      expect(result.current.getItemState('AAPL').isAdding).toBe(false)
      expect(result.current.getItemState('GOOGL').isRemoving).toBe(false)
      expect(result.current.hasAnyLoading).toBe(false)
    })

    test('should clear item state correctly', () => {
      const { result } = renderHook(() => useWatchlistActions())
      
      // Simulate error state
      result.current.addToWatchlist({ stock_code: '' }) // Will fail validation
      
      waitFor(() => {
        expect(result.current.getItemState('').hasError).toBe(true)
      })
      
      // Clear error
      result.current.clearItemError('')
      expect(result.current.getItemState('').hasError).toBe(false)
      expect(result.current.getItemError('')).toBeUndefined()
    })

    test('should clear all errors', async () => {
      mockValidation.validateAddWatchlistRequest
        .mockReturnValueOnce({ is_valid: false, errors: ['Error 1'] })
        .mockReturnValueOnce({ is_valid: false, errors: ['Error 2'] })

      const { result } = renderHook(() => useWatchlistActions())
      
      // Create multiple errors
      await result.current.addToWatchlist({ stock_code: 'AAPL' })
      await result.current.addToWatchlist({ stock_code: 'GOOGL' })
      
      expect(result.current.hasItemError('AAPL')).toBe(true)
      expect(result.current.hasItemError('GOOGL')).toBe(true)
      expect(result.current.hasAnyErrors).toBe(true)
      
      // Clear all errors
      result.current.clearAllErrors()
      
      expect(result.current.hasItemError('AAPL')).toBe(false)
      expect(result.current.hasItemError('GOOGL')).toBe(false)
      expect(result.current.hasAnyErrors).toBe(false)
      expect(result.current.globalError).toBeNull()
    })

    test('should reset all state', () => {
      const { result } = renderHook(() => useWatchlistActions())
      
      result.current.reset()
      
      expect(result.current.globalError).toBeNull()
      expect(result.current.isGlobalLoading).toBe(false)
      expect(result.current.hasAnyErrors).toBe(false)
      expect(result.current.hasAnyLoading).toBe(false)
    })
  })

  describe('Options Configuration', () => {
    test('should respect enableOptimisticUpdates option', async () => {
      const mockItem = { stock_code: 'AAPL', id: 'watchlist-AAPL' }
      mockStockApi.addToWatchlist.mockResolvedValueOnce(mockItem)

      const { result } = renderHook(() => useWatchlistActions({
        enableOptimisticUpdates: false
      }))
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      const response = await result.current.addToWatchlist(request, { 
        company_name: 'Apple Inc.' 
      })
      
      expect(response).toEqual(mockItem)
      expect(mockStockApi.addToWatchlist).toHaveBeenCalledWith(request)
    })

    test('should not trigger callbacks when not provided', async () => {
      mockStockApi.addToWatchlist.mockResolvedValueOnce({ stock_code: 'AAPL' })

      const { result } = renderHook(() => useWatchlistActions())
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      
      // Should not throw error when no callbacks are provided
      expect(async () => {
        await result.current.addToWatchlist(request)
      }).not.toThrow()
    })
  })

  describe('Concurrent Operations', () => {
    test('should handle concurrent add operations for same stock', async () => {
      const mockItem = { stock_code: 'AAPL', id: 'watchlist-AAPL' }
      mockStockApi.addToWatchlist.mockResolvedValue(mockItem)

      const { result } = renderHook(() => useWatchlistActions())
      
      const request: AddWatchlistRequest = { stock_code: 'AAPL' }
      
      // Start two concurrent operations
      const promise1 = result.current.addToWatchlist(request)
      const promise2 = result.current.addToWatchlist(request)
      
      const [response1, response2] = await Promise.all([promise1, promise2])
      
      expect(response1).toEqual(mockItem)
      expect(response2).toEqual(mockItem)
      expect(mockStockApi.addToWatchlist).toHaveBeenCalledTimes(2)
    })

    test('should handle mixed add/remove operations', async () => {
      mockStockApi.addToWatchlist.mockResolvedValueOnce({ stock_code: 'AAPL' })
      mockStockApi.removeFromWatchlist.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useWatchlistActions())
      
      const addRequest: AddWatchlistRequest = { stock_code: 'AAPL' }
      
      // Start concurrent add and remove operations
      const addPromise = result.current.addToWatchlist(addRequest)
      const removePromise = result.current.removeFromWatchlist('GOOGL')
      
      const [addResult, removeResult] = await Promise.all([addPromise, removePromise])
      
      expect(addResult).toBeDefined()
      expect(removeResult).toBe(true)
    })
  })
})