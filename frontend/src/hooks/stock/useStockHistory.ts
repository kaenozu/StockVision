/**
 * Stock History Hook
 * 
 * Specialized hook for historical stock data and chart data.
 * Single responsibility: historical data management and caching.
 */

import { useState, useCallback } from 'react'
import { PriceHistoryItem, AsyncState, ChartTimeframe } from '../../types/stock'
import { stockApi } from '../../services/stockApi'

interface UseStockHistoryOptions {
  defaultTimeframe?: ChartTimeframe
  enableCaching?: boolean
  maxCacheSize?: number
}

interface HistoryCache {
  [key: string]: {
    data: PriceHistoryItem[]
    timestamp: number
    timeframe: ChartTimeframe
  }
}

export function useStockHistory(options: UseStockHistoryOptions = {}) {
  const { 
    defaultTimeframe = '30d', 
    enableCaching = true,
    maxCacheSize = 50 
  } = options

  const [state, setState] = useState<AsyncState<PriceHistoryItem[]>>({
    data: null,
    status: 'idle',
    error: null
  })

  const [currentTimeframe, setCurrentTimeframe] = useState<ChartTimeframe>(defaultTimeframe)
  const [cache, setCache] = useState<HistoryCache>({})

  const getCacheKey = (stockCode: string, timeframe: ChartTimeframe) => 
    `${stockCode}:${timeframe}`

  const isValidCache = (cacheEntry: HistoryCache[string], maxAge: number = 300000): boolean => {
    return Date.now() - cacheEntry.timestamp < maxAge // 5 minutes default
  }

  const addToCache = useCallback((
    stockCode: string, 
    timeframe: ChartTimeframe, 
    data: PriceHistoryItem[]
  ) => {
    if (!enableCaching) return

    setCache(prevCache => {
      const newCache = { ...prevCache }
      const cacheKey = getCacheKey(stockCode, timeframe)
      
      // Add new entry
      newCache[cacheKey] = {
        data,
        timestamp: Date.now(),
        timeframe
      }

      // Limit cache size
      const cacheKeys = Object.keys(newCache)
      if (cacheKeys.length > maxCacheSize) {
        // Remove oldest entries
        const sortedKeys = cacheKeys
          .map(key => ({ key, timestamp: newCache[key].timestamp }))
          .sort((a, b) => a.timestamp - b.timestamp)
        
        const keysToRemove = sortedKeys.slice(0, cacheKeys.length - maxCacheSize)
        keysToRemove.forEach(({ key }) => delete newCache[key])
      }

      return newCache
    })
  }, [enableCaching, maxCacheSize])

  const fetchHistory = useCallback(async (
    stockCode: string, 
    timeframe?: ChartTimeframe,
    forceRefresh: boolean = false
  ): Promise<PriceHistoryItem[] | null> => {
    if (!stockCode?.trim()) {
      setState(prev => ({ 
        ...prev, 
        error: 'Stock code is required',
        status: 'error' 
      }))
      return null
    }

    const selectedTimeframe = timeframe || currentTimeframe
    const cacheKey = getCacheKey(stockCode, selectedTimeframe)

    // Check cache first
    if (!forceRefresh && enableCaching && cache[cacheKey]) {
      const cachedData = cache[cacheKey]
      if (isValidCache(cachedData)) {
        setState({
          data: cachedData.data,
          status: 'success',
          error: null
        })
        setCurrentTimeframe(selectedTimeframe)
        return cachedData.data
      }
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      // Convert timeframe to days
      const daysMap: Record<ChartTimeframe, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      }
      
      const days = daysMap[selectedTimeframe] || 30
      const historyData = await stockApi.getPriceHistory(stockCode, days)
      
      setState({
        data: historyData,
        status: 'success',
        error: null
      })

      setCurrentTimeframe(selectedTimeframe)
      addToCache(stockCode, selectedTimeframe, historyData)
      
      return historyData

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch price history'
      
      setState({
        data: null,
        status: 'error',
        error: errorMessage
      })

      return null
    }
  }, [currentTimeframe, cache, enableCaching, addToCache])

  const changeTimeframe = useCallback(async (
    stockCode: string, 
    newTimeframe: ChartTimeframe
  ) => {
    if (newTimeframe !== currentTimeframe) {
      return await fetchHistory(stockCode, newTimeframe)
    }
    return state.data
  }, [currentTimeframe, state.data, fetchHistory])

  const clearCache = useCallback(() => {
    setCache({})
  }, [])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({
      data: null,
      status: 'idle',
      error: null
    })
    setCurrentTimeframe(defaultTimeframe)
    if (enableCaching) {
      setCache({})
    }
  }, [defaultTimeframe, enableCaching])

  return {
    ...state,
    currentTimeframe,
    fetchHistory,
    changeTimeframe,
    clearCache,
    clearError,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    cacheSize: Object.keys(cache).length
  }
}