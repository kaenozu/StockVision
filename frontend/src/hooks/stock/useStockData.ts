/**
 * Basic Stock Data Hook
 * 
 * Focused hook for fetching basic stock information.
 * Single responsibility: stock data retrieval and state management.
 */

import { useState, useCallback } from 'react'
import { StockData, AsyncState } from '../../types/stock'
import { stockApi, ValidationError } from '../../services/stockApi'
import { validateStockDataResponse } from '../../utils/validation'

interface UseStockDataOptions {
  autoValidation?: boolean
  cacheTimeout?: number
}

export function useStockData(options: UseStockDataOptions = {}) {
  const { autoValidation = true, cacheTimeout = 300000 } = options // 5 minutes default

  const [state, setState] = useState<AsyncState<StockData>>({
    data: null,
    status: 'idle',
    error: null
  })

  const [lastFetch, setLastFetch] = useState<Map<string, number>>(new Map())

  const fetchStockData = useCallback(async (
    stockCode: string, 
    useRealData: boolean = false,
    forceRefresh: boolean = false
  ): Promise<StockData | null> => {
    if (!stockCode?.trim()) {
      setState(prev => ({ 
        ...prev, 
        error: 'Stock code is required',
        status: 'error' 
      }))
      return null
    }

    // Check cache timeout
    const lastFetchTime = lastFetch.get(stockCode)
    const now = Date.now()
    
    if (!forceRefresh && lastFetchTime && (now - lastFetchTime < cacheTimeout)) {
      // Return cached data if available and not expired
      if (state.data?.stock_code === stockCode) {
        return state.data
      }
    }

    setState(prev => ({ ...prev, status: 'loading', error: null }))

    try {
      const stockData = await stockApi.getStockData(stockCode, useRealData)
      
      // Validate response data if enabled
      if (autoValidation) {
        const validation = validateStockDataResponse(stockData)
        if (!validation.is_valid) {
          throw new ValidationError(`Data validation failed: ${validation.errors.join(', ')}`)
        }
      }

      setState({
        data: stockData,
        status: 'success',
        error: null
      })

      setLastFetch(prev => new Map(prev).set(stockCode, now))
      return stockData

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock data'
      
      setState({
        data: null,
        status: 'error',
        error: errorMessage
      })

      return null
    }
  }, [autoValidation, cacheTimeout, lastFetch, state.data])

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({
      data: null,
      status: 'idle',
      error: null
    })
    setLastFetch(new Map())
  }, [])

  return {
    ...state,
    fetchStockData,
    clearError,
    reset,
    isLoading: state.status === 'loading',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
    isIdle: state.status === 'idle'
  }
}