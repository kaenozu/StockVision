import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'

/**
 * usePersistentWatchlist hook
 * Manages watchlist state with local persistence
 */
export function usePersistentWatchlist() {
  const [localWatchlist, setLocalWatchlist] = useLocalStorage<any[]>('watchlist', [])
  const [lastSync, setLastSync] = useLocalStorage<number>('watchlist_last_sync', 0)

  const addToLocalWatchlist = useCallback((item: any) => {
    setLocalWatchlist(prev => [...prev, { ...item, added_locally: Date.now() }])
    setLastSync(Date.now())
  }, [setLocalWatchlist, setLastSync])

  const removeFromLocalWatchlist = useCallback((stockCode: string) => {
    setLocalWatchlist(prev => prev.filter(item => item.stock_code !== stockCode))
    setLastSync(Date.now())
  }, [setLocalWatchlist, setLastSync])

  const syncWithServer = useCallback(async (serverWatchlist: any[]) => {
    // Merge local changes with server data
    const merged = [...serverWatchlist]
    localWatchlist.forEach(localItem => {
      if (localItem.added_locally && localItem.added_locally > lastSync) {
        const existingIndex = merged.findIndex(item => item.stock_code === localItem.stock_code)
        if (existingIndex === -1) {
          merged.push(localItem)
        }
      }
    })

    setLocalWatchlist(merged)
    setLastSync(Date.now())
    return merged
  }, [localWatchlist, lastSync, setLocalWatchlist, setLastSync])

  return {
    localWatchlist,
    addToLocalWatchlist,
    removeFromLocalWatchlist,
    syncWithServer,
    lastSync
  }
}

/**
 * usePersistentSettings hook
 * Manages user settings with local persistence
 */
interface UserSettings {
  refreshInterval: number
  notifications: boolean
  defaultTimeframe: string
  chartType: 'line' | 'candlestick'
  autoRefresh: boolean
  compactView: boolean
}

const defaultSettings: UserSettings = {
  refreshInterval: 5,
  notifications: true,
  defaultTimeframe: '30d',
  chartType: 'line',
  autoRefresh: true,
  compactView: false
}

export function usePersistentSettings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>('user_settings', defaultSettings)

  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }, [setSettings])

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
  }, [setSettings])

  return {
    settings,
    updateSetting,
    resetSettings
  }
}

/**
 * usePersistentViewHistory hook
 * Tracks viewed stocks and provides quick access
 */
interface ViewHistoryItem {
  stock_code: string
  company_name?: string
  last_viewed: number
  view_count: number
}

export function usePersistentViewHistory() {
  const [viewHistory, setViewHistory] = useLocalStorage<ViewHistoryItem[]>('view_history', [])

  const addToHistory = useCallback((stockCode: string, companyName?: string) => {
    setViewHistory(prev => {
      const existing = prev.find(item => item.stock_code === stockCode)
      if (existing) {
        return prev.map(item => 
          item.stock_code === stockCode
            ? {
                ...item,
                last_viewed: Date.now(),
                view_count: item.view_count + 1,
                company_name: companyName || item.company_name
              }
            : item
        ).sort((a, b) => b.last_viewed - a.last_viewed)
      } else {
        const newItem: ViewHistoryItem = {
          stock_code: stockCode,
          company_name: companyName,
          last_viewed: Date.now(),
          view_count: 1
        }
        return [newItem, ...prev].slice(0, 20) // Keep only latest 20 items
      }
    })
  }, [setViewHistory])

  const clearHistory = useCallback(() => {
    setViewHistory([])
  }, [setViewHistory])

  const getRecentlyViewed = useCallback((limit: number = 5) => {
    return viewHistory.slice(0, limit)
  }, [viewHistory])

  const getMostViewed = useCallback((limit: number = 5) => {
    return [...viewHistory]
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, limit)
  }, [viewHistory])

  return {
    viewHistory,
    addToHistory,
    clearHistory,
    getRecentlyViewed,
    getMostViewed
  }
}

/**
 * usePersistentCache hook
 * Implements intelligent caching for API responses
 */
interface CacheItem<T> {
  data: T
  timestamp: number
  expires: number
}

export function usePersistentCache<T>(key: string, ttl: number = 5 * 60 * 1000) {
  const [cache, setCache] = useLocalStorage<Record<string, CacheItem<T>>>(`cache_${key}`, {})

  const get = useCallback((cacheKey: string): T | null => {
    const item = cache[cacheKey]
    if (!item) return null

    if (Date.now() > item.expires) {
      // Remove expired item
      setCache(prev => {
        const updated = { ...prev }
        delete updated[cacheKey]
        return updated
      })
      return null
    }

    return item.data
  }, [cache, setCache])

  const set = useCallback((cacheKey: string, data: T, customTTL?: number) => {
    const effectiveTTL = customTTL || ttl
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + effectiveTTL
    }

    setCache(prev => ({
      ...prev,
      [cacheKey]: item
    }))
  }, [setCache, ttl])

  const remove = useCallback((cacheKey: string) => {
    setCache(prev => {
      const updated = { ...prev }
      delete updated[cacheKey]
      return updated
    })
  }, [setCache])

  const clear = useCallback(() => {
    setCache({})
  }, [setCache])

  const cleanup = useCallback(() => {
    const now = Date.now()
    setCache(prev => {
      const updated: Record<string, CacheItem<T>> = {}
      Object.entries(prev).forEach(([key, item]) => {
        if (now < item.expires) {
          updated[key] = item
        }
      })
      return updated
    })
  }, [setCache])

  return {
    get,
    set,
    remove,
    clear,
    cleanup
  }
}