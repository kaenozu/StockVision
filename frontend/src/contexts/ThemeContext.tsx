import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type ThemeType = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeType
  actualTheme: 'light' | 'dark'
  isDark: boolean
  setTheme: (theme: ThemeType) => void
  toggleTheme: () => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: ThemeType
  enableTransitions?: boolean
  storageKey?: string
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'light',
  enableTransitions = true,
  storageKey = 'theme'
}) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          return stored as ThemeType
        }
      } catch (error) {
        console.warn('Failed to read theme from localStorage:', error)
      }
      
      // If no stored preference, check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'system'
      }
    }
    return defaultTheme
  })

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  // Actual theme being applied (resolves 'system' to light/dark)
  const actualTheme = theme === 'system' ? systemTheme : theme

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? 'dark' : 'light')
      }

      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    
    // Add current theme class
    root.classList.add(actualTheme)
    
    // Add transition class if enabled
    if (enableTransitions) {
      root.style.setProperty('--theme-transition', 'color 300ms ease-in-out, background-color 300ms ease-in-out, border-color 300ms ease-in-out')
    }
  }, [actualTheme, enableTransitions])

  // Persist theme to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, theme)
      } catch (error) {
        console.warn('Failed to save theme to localStorage:', error)
      }
    }
  }, [theme, storageKey])

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(current => {
      if (current === 'light') return 'dark'
      if (current === 'dark') return 'light'
      // If system, toggle based on current actual theme
      return actualTheme === 'light' ? 'dark' : 'light'
    })
  }

  const resetTheme = () => {
    setThemeState('system')
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(storageKey)
      } catch (error) {
        console.warn('Failed to remove theme from localStorage:', error)
      }
    }
  }

  // Keyboard shortcut for theme toggle (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        toggleTheme()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [actualTheme])

  const value: ThemeContextType = {
    theme,
    actualTheme,
    isDark: actualTheme === 'dark',
    setTheme,
    toggleTheme,
    resetTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Hook for components that need to work without ThemeProvider
export const useThemeSafe = (): ThemeContextType | null => {
  return useContext(ThemeContext)
}
