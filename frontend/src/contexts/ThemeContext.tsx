import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'

export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system'
  toggleTheme: () => void
  systemPreference: 'light' | 'dark'
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as 'light' | 'dark' | 'system') || 'light'
  })

  const [systemPreference, setSystemPreference] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  })

  const isDark = theme === 'dark' || (theme === 'system' && systemPreference === 'dark')

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(nextTheme)
    localStorage.setItem('theme', nextTheme)
  }, [theme])

  // System preference detection
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Apply theme to document root
  useEffect(() => {
    if (typeof document === 'undefined') return
    
    const root = document.documentElement
    
    if (isDark) {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }

    // Set data attribute for CSS targeting
    root.setAttribute('data-theme', theme)
  }, [isDark, theme])

  const value: ThemeContextValue = {
    theme,
    toggleTheme,
    systemPreference,
    isDark
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('ThemeContext must be used within ThemeProvider')
  }
  return context
}

export { ThemeContext }