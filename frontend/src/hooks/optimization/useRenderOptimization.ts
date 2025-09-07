/**
 * Render Optimization Hook
 * 
 * Custom hook providing utilities for optimizing React component rendering,
 * including performance monitoring, render counting, and optimization helpers.
 */

import { useRef, useCallback, useMemo } from 'react'

interface RenderStats {
  renderCount: number
  lastRenderTime: number
  averageRenderTime: number
  totalRenderTime: number
}

interface UseRenderOptimizationOptions {
  enablePerformanceMonitoring?: boolean
  logRenders?: boolean
  componentName?: string
}

export function useRenderOptimization(options: UseRenderOptimizationOptions = {}) {
  const {
    enablePerformanceMonitoring = false,
    logRenders = false,
    componentName = 'Unknown'
  } = options

  const renderStatsRef = useRef<RenderStats>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0
  })

  const startTimeRef = useRef<number>(0)

  // Performance monitoring
  if (enablePerformanceMonitoring) {
    startTimeRef.current = performance.now()
  }

  // Update render stats
  if (enablePerformanceMonitoring || logRenders) {
    const renderTime = performance.now() - startTimeRef.current
    const stats = renderStatsRef.current
    
    stats.renderCount++
    stats.lastRenderTime = renderTime
    stats.totalRenderTime += renderTime
    stats.averageRenderTime = stats.totalRenderTime / stats.renderCount

    if (logRenders) {
      console.log(`[Render] ${componentName} - Count: ${stats.renderCount}, Time: ${renderTime.toFixed(2)}ms`)
    }
  }

  // Stable reference equality checker
  const useStableCallback = useCallback(<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList
  ): T => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useCallback(callback, deps)
  }, [])

  // Shallow comparison for objects
  const useShallowMemo = useCallback(<T>(
    factory: () => T,
    deps: React.DependencyList
  ): T => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(factory, deps)
  }, [])

  // Deep comparison for complex objects (use sparingly)
  const useDeepMemo = useCallback(<T>(
    factory: () => T,
    deps: any[]
  ): T => {
    return useMemo(() => {
      return factory()
    }, deps.map(dep => JSON.stringify(dep)))
  }, [])

  // Stable reference for arrays
  const useStableArray = useCallback(<T>(
    array: T[],
    compareFn?: (a: T, b: T) => boolean
  ): T[] => {
    return useMemo(() => {
      if (!compareFn) return [...array]
      return array.slice().sort(compareFn)
    }, [array, compareFn])
  }, [])

  // Get current render statistics
  const getRenderStats = useCallback((): RenderStats => {
    return { ...renderStatsRef.current }
  }, [])

  // Reset render statistics
  const resetRenderStats = useCallback(() => {
    renderStatsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      totalRenderTime: 0
    }
  }, [])

  return {
    // Optimization utilities
    useStableCallback,
    useShallowMemo,
    useDeepMemo,
    useStableArray,
    
    // Performance monitoring
    getRenderStats,
    resetRenderStats,
    
    // Current stats
    renderCount: renderStatsRef.current.renderCount,
    lastRenderTime: renderStatsRef.current.lastRenderTime,
    averageRenderTime: renderStatsRef.current.averageRenderTime
  }
}

/**
 * Hook for debouncing values to prevent excessive re-renders
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook for throttling function calls to improve performance
 */
export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now())

  return useCallback(((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      func(...args)
      lastRun.current = Date.now()
    }
  }) as T, [func, delay])
}

/**
 * Hook for memoizing expensive calculations
 */
export function useExpensiveMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  options: { maxAge?: number; maxSize?: number } = {}
): T {
  const { maxAge = 60000, maxSize = 10 } = options // 1 minute default, 10 items max
  const cacheRef = useRef<Map<string, { value: T; timestamp: number }>>(new Map())

  return useMemo(() => {
    const depsKey = JSON.stringify(deps)
    const cache = cacheRef.current
    const cached = cache.get(depsKey)
    const now = Date.now()

    // Check if cached value is still valid
    if (cached && (now - cached.timestamp) < maxAge) {
      return cached.value
    }

    // Calculate new value
    const newValue = factory()
    
    // Manage cache size
    if (cache.size >= maxSize) {
      // Remove oldest entry
      const oldestKey = cache.keys().next().value
      if (oldestKey) {
        cache.delete(oldestKey)
      }
    }

    // Cache new value
    cache.set(depsKey, { value: newValue, timestamp: now })
    
    return newValue
  }, deps)
}

import { useState, useEffect } from 'react'