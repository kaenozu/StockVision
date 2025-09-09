/**
 * Stock Data Hook
 * 
 * Custom React hook for managing stock data state and API calls.
 * Provides loading states, error handling, and automatic data validation.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  StockData,
  CurrentPriceResponse,
  PriceHistoryItem,
  AsyncState,
  DEFAULT_DAYS_HISTORY
} from '../types/stock'
import { stockApi, ValidationError } from '../services/stockApi'
import { validateStockDataResponse } from '../utils/validation'
import { formatErrorMessage } from '../utils/formatters'

/**
 * Hook for managing basic stock information
 */
export function useStockData(
  stockCode?: string,
  useRealData: boolean = false,
  autoFetch: boolean = true
) {
  const [state, setState] = useState<AsyncState<StockData>>({
    data: null,
    status: 'idle',
    error: null
  })

  const fetchStockData = useCallback(async (code: string, realData: boolean = false) => {
    if (!code) return

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const stockData = await stockApi.getStockData(code, realData)
      
      // Validate response data
      const validation = validateStockDataResponse(stockData)
      if (!validation.is_valid) {
        throw new ValidationError(`Data validation failed: ${validation.errors.join(', ')}`)
      }

      setState({
        data: stockData,
        status: 'success',
        error: null
      })
    } catch (error) {
      console.error('Failed to fetch stock data:', error)
      setState({
        data: null,
        status: 'error',
        error: formatErrorMessage(error)
      })
    }
  }, [])

  // Auto-fetch on mount or when stockCode changes
  useEffect(() => {
    if (autoFetch && stockCode) {
      fetchStockData(stockCode, useRealData)
    }
  }, [stockCode, useRealData, autoFetch, fetchStockData])

  const refresh = useCallback(() => {
    if (stockCode) {
      fetchStockData(stockCode, useRealData)
    }
  }, [stockCode, useRealData, fetchStockData])

  return {
    ...state,
    fetch: fetchStockData,
    refresh,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success'
  }
}

/**
 * Hook for managing current price information
 */
export function useCurrentPrice(
  stockCode?: string,
  useRealData: boolean = false,
  autoRefresh: boolean = false,
  refreshInterval: number = 600000 // 10 minutes (was 30 seconds) - prevents rate limiting
) {
  const [state, setState] = useState<AsyncState<CurrentPriceResponse>>({
    data: null,
    status: 'idle',
    error: null
  })

  const fetchCurrentPrice = useCallback(async (code: string, realData: boolean = false) => {
    if (!code) return

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const priceData = await stockApi.getCurrentPrice(code, realData)
      
      setState({
        data: priceData,
        status: 'success',
        error: null
      })
    } catch (error) {
      console.error('Failed to fetch current price:', error)
      setState({
        data: null,
        status: 'error',
        error: formatErrorMessage(error)
      })
    }
  }, [])

  // Auto-refresh effect
  useEffect(() => {
    if (!stockCode || !autoRefresh) return

    const intervalId = setInterval(() => {
      fetchCurrentPrice(stockCode, useRealData)
    }, refreshInterval)

    return () => clearInterval(intervalId)
  }, [stockCode, useRealData, autoRefresh, refreshInterval, fetchCurrentPrice])

  // Initial fetch
  useEffect(() => {
    if (stockCode) {
      fetchCurrentPrice(stockCode, useRealData)
    }
  }, [stockCode, useRealData, fetchCurrentPrice])

  const refresh = useCallback(() => {
    if (stockCode) {
      fetchCurrentPrice(stockCode, useRealData)
    }
  }, [stockCode, useRealData, fetchCurrentPrice])

  return {
    ...state,
    fetch: fetchCurrentPrice,
    refresh,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success'
  }
}

/**
 * Hook for managing price history data
 */
export function usePriceHistory(
  stockCode?: string,
  days: number = DEFAULT_DAYS_HISTORY,
  useRealData: boolean = false
) {
  const [state, setState] = useState<AsyncState<PriceHistoryItem[]>>({
    data: null,
    status: 'idle',
    error: null
  })

  const fetchPriceHistory = useCallback(async (
    code: string,
    historyDays: number = DEFAULT_DAYS_HISTORY,
    realData: boolean = false
  ) => {
    if (!code) return

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const historyData = await stockApi.getPriceHistory(code, historyDays, realData)
      
      setState({
        data: historyData,
        status: 'success',
        error: null
      })
    } catch (error) {
      console.error('Failed to fetch price history:', error)
      setState({
        data: null,
        status: 'error',
        error: formatErrorMessage(error)
      })
    }
  }, [])

  // Fetch on mount or when parameters change
  useEffect(() => {
    if (stockCode) {
      fetchPriceHistory(stockCode, days, useRealData)
    }
  }, [stockCode, days, useRealData, fetchPriceHistory])

  const refresh = useCallback(() => {
    if (stockCode) {
      fetchPriceHistory(stockCode, days, useRealData)
    }
  }, [stockCode, days, useRealData, fetchPriceHistory])

  return {
    ...state,
    fetch: fetchPriceHistory,
    refresh,
    isLoading: state.status === 'loading',
    isError: state.status === 'error',
    isSuccess: state.status === 'success'
  }
}

/**
 * Combined hook for comprehensive stock information
 * This hook combines basic stock data, current price, and price history
 */
export function useStockInfo(
  stockCode?: string,
  historyDays: number = DEFAULT_DAYS_HISTORY,
  useRealData: boolean = false,
  autoRefreshPrice: boolean = false
) {
  const stockData = useStockData(stockCode, useRealData)
  const currentPrice = useCurrentPrice(stockCode, useRealData, autoRefreshPrice)
  const priceHistory = usePriceHistory(stockCode, historyDays, useRealData)

  // Overall loading state
  const isLoading = stockData.isLoading || currentPrice.isLoading || priceHistory.isLoading

  // Check if any request has errors
  const hasError = stockData.isError || currentPrice.isError || priceHistory.isError

  // Combine errors
  const errors = [stockData.error, currentPrice.error, priceHistory.error]
    .filter(Boolean)
    .join(' / ')

  // Check if all data is loaded successfully
  const isReady = stockData.isSuccess && currentPrice.isSuccess && priceHistory.isSuccess

  const refreshAll = useCallback(() => {
    stockData.refresh()
    currentPrice.refresh()
    priceHistory.refresh()
  }, [stockData, currentPrice, priceHistory])

  return {
    stockData: stockData.data,
    currentPrice: currentPrice.data,
    priceHistory: priceHistory.data,
    isLoading,
    isError: hasError,
    error: hasError ? errors : null,
    isReady,
    refresh: refreshAll,
    individual: {
      stockData,
      currentPrice,
      priceHistory
    }
  }
}

/**
 * Hook for caching stock data to reduce API calls
 */
export function useStockCache() {
  const [cache, setCache] = useState<Map<string, {
    data: StockData
    timestamp: number
    ttl: number
  }>>(new Map())

  const getCachedData = useCallback((stockCode: string): StockData | null => {
    const cached = cache.get(stockCode)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      // Data expired, remove from cache
      setCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(stockCode)
        return newCache
      })
      return null
    }

    return cached.data
  }, [cache])

  const setCachedData = useCallback((stockCode: string, data: StockData, ttlMinutes: number = 5) => {
    setCache(prev => new Map(prev).set(stockCode, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
    }))
  }, [])

  const clearCache = useCallback((stockCode?: string) => {
    if (stockCode) {
      setCache(prev => {
        const newCache = new Map(prev)
        newCache.delete(stockCode)
        return newCache
      })
    } else {
      setCache(new Map())
    }
  }, [])

  const getCacheSize = useCallback(() => cache.size, [cache])

  return {
    getCachedData,
    setCachedData,
    clearCache,
    getCacheSize
  }
}

/**
 * Hook for debouncing stock code input
 */
export function useStockSearch(debounceMs: number = 500) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [searchQuery, debounceMs])

  return {
    searchQuery,
    debouncedQuery,
    setSearchQuery,
    hasQuery: debouncedQuery.length > 0,
    isSearching: searchQuery !== debouncedQuery
  }
}