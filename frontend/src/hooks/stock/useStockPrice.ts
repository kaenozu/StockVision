/**
 * Stock Price Hook
 * 
 * Specialized hook for real-time stock price data and updates.
 * Single responsibility: price tracking and real-time updates.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { CurrentPriceResponse, AsyncState } from '../../types/stock'
import { stockApi } from '../../services/stockApi'
import { CACHE_INTERVALS } from '../../constants/api'

interface UseStockPriceOptions {
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
  enableWebSocket?: boolean
}

export function useStockPrice(options: UseStockPriceOptions = {}) {
  const { 
    autoRefresh = false, 
    refreshInterval = CACHE_INTERVALS.PRICE_UPDATE, // 10 minutes (was 30 seconds)
    enableWebSocket = false 
  } = options

  const [state, setState] = useState<AsyncState<CurrentPriceResponse>>({
    data: null,
    status: 'idle',
    error: null
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const currentStockCode = useRef<string | null>(null)

  const fetchPrice = useCallback(async (stockCode: string): Promise<CurrentPriceResponse | null> => {
    if (!stockCode?.trim()) {
      setState(prev => ({ 
        ...prev, 
        error: 'Stock code is required',
        status: 'error' 
      }))
      return null
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const priceData = await stockApi.getCurrentPrice(stockCode)
      
      setState({
        data: priceData,
        status: 'success',
        error: null
      })

      return priceData

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch price data'
      
      setState({
        data: null,
        status: 'error',
        error: errorMessage
      })

      return null
    }
  }, [])

  const startAutoRefresh = useCallback((stockCode: string) => {
    // 自動更新は無効化済み - 手動更新のみ対応
    return
  }, [autoRefresh, refreshInterval, fetchPrice])

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    currentStockCode.current = null
  }, [])

  const connectWebSocket = useCallback((stockCode: string) => {
    if (!enableWebSocket || wsRef.current) return

    // WebSocket implementation would go here
    // For now, this is a placeholder for future real-time functionality
    console.log(`WebSocket connection for ${stockCode} would be established here`)
  }, [enableWebSocket])

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const fetchPriceWithRefresh = useCallback(async (stockCode: string) => {
    const result = await fetchPrice(stockCode)
    
    if (autoRefresh && result) {
      startAutoRefresh(stockCode)
    }
    
    if (enableWebSocket && result) {
      connectWebSocket(stockCode)
    }
    
    return result
  }, [fetchPrice, autoRefresh, enableWebSocket, startAutoRefresh, connectWebSocket])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoRefresh()
      disconnectWebSocket()
    }
  }, [stopAutoRefresh, disconnectWebSocket])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    stopAutoRefresh()
    disconnectWebSocket()
    setState({
      data: null,
      status: 'idle',
      error: null
    })
  }, [stopAutoRefresh, disconnectWebSocket])

  return {
    ...state,
    fetchPrice: fetchPriceWithRefresh,
    startAutoRefresh,
    stopAutoRefresh,
    connectWebSocket,
    disconnectWebSocket,
    clearError,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle',
    isAutoRefreshing: intervalRef.current !== null,
    isWebSocketConnected: wsRef.current !== null
  }
}