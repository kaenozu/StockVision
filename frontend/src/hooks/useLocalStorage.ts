import { useState, useCallback, useEffect } from 'react'
import { safeLocalStorage } from '../utils/browser'

/**
 * useLocalStorage hook
 * Provides persistent state with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = safeLocalStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        setStoredValue((currentValue) => {
          const valueToStore = value instanceof Function ? value(currentValue) : value
          
          // Save to local storage
          safeLocalStorage.setItem(key, JSON.stringify(valueToStore))
          
          // Dispatch custom event for cross-tab synchronization
          window.dispatchEvent(
            new CustomEvent('localStorage', {
              detail: { key, value: valueToStore }
            })
          )
          
          return valueToStore
        })
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key]
  )

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      safeLocalStorage.removeItem(key)
      setStoredValue(initialValue)
      
      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent('localStorage', {
          detail: { key, value: null }
        })
      )
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // Listen for changes in other tabs
  useEffect(() => {
    const handleStorageChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value ?? initialValue)
      }
    }

    // Listen for changes from other tabs
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.warn(`Error parsing localStorage value for key "${key}":`, error)
        }
      }
    }

    window.addEventListener('localStorage', handleStorageChange as EventListener)
    window.addEventListener('storage', handleStorageEvent)

    return () => {
      window.removeEventListener('localStorage', handleStorageChange as EventListener)
      window.removeEventListener('storage', handleStorageEvent)
    }
  }, [key])

  return [storedValue, setValue, removeValue]
}

/**
 * useSessionStorage hook
 * Similar to useLocalStorage but uses sessionStorage
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    
    try {
      const item = sessionStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error)
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore = value instanceof Function ? value(currentValue) : value
          
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(key, JSON.stringify(valueToStore))
          }
          
          return valueToStore
        })
      } catch (error) {
        console.warn(`Error setting sessionStorage key "${key}":`, error)
      }
    },
    [key]
  )

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(key)
      }
      setStoredValue(initialValue)
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  return [storedValue, setValue, removeValue]
}