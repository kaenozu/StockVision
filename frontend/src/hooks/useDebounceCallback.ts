import { useEffect, useRef, useCallback } from 'react'

/**
 * useDebounceCallback hook
 * Debounces a callback function
 */
export function useDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(((...args: Parameters<T>) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    const newTimer = setTimeout(() => {
      callback(...args)
    }, delay)

    debounceTimer.current = newTimer
  }) as T, [callback, delay])

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, []) // Empty dependency array because debounceTimer is a ref

  return debouncedCallback
}
