/**
 * Browser environment utilities
 * Common browser detection and environment checks used across contexts
 */

export const isBrowser = typeof window !== 'undefined'

export const isMatchMediaSupported = isBrowser && 'matchMedia' in window

export const isResizeObserverSupported = isBrowser && 'ResizeObserver' in window

export const isLocalStorageSupported = isBrowser && 'localStorage' in window

/**
 * Safe localStorage operations with fallback
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isLocalStorageSupported) return null
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isLocalStorageSupported) return
    try {
      localStorage.setItem(key, value)
    } catch {
      // Silently fail in private mode or when storage is full
    }
  },

  removeItem: (key: string): void => {
    if (!isLocalStorageSupported) return
    try {
      localStorage.removeItem(key)
    } catch {
      // Silently fail
    }
  }
}

/**
 * Safe matchMedia operations with fallback
 */
export const safeMatchMedia = (query: string): MediaQueryList | null => {
  if (!isMatchMediaSupported) return null
  try {
    return window.matchMedia(query)
  } catch {
    return null
  }
}