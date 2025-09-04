import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { isBrowser, isResizeObserverSupported, safeMatchMedia } from '../utils/browser'

export interface ResponsiveContextValue {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
}

const ResponsiveContext = createContext<ResponsiveContextValue | undefined>(undefined)

interface ResponsiveProviderProps {
  children: ReactNode
}

// Breakpoint definitions
const BREAKPOINTS = {
  xs: 0,      // 0px+
  sm: 640,    // 640px+
  md: 768,    // 768px+
  lg: 1024,   // 1024px+
  xl: 1280,   // 1280px+
  '2xl': 1920  // 1920px+
} as const

const getBreakpoint = (width: number): 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' => {
  if (width >= BREAKPOINTS['2xl']) return '2xl'
  if (width >= BREAKPOINTS.xl) return 'xl'
  if (width >= BREAKPOINTS.lg) return 'lg'
  if (width >= BREAKPOINTS.md) return 'md'
  if (width >= BREAKPOINTS.sm) return 'sm'
  return 'xs'
}

const getDeviceType = (breakpoint: string) => {
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm'
  const isTablet = breakpoint === 'md'
  const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl'
  
  return { isMobile, isTablet, isDesktop }
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({ children }) => {
  const [width, setWidth] = useState(() => {
    return isBrowser ? window.innerWidth : 1024 // Default fallback for SSR
  })

  const breakpoint = getBreakpoint(width)
  const { isMobile, isTablet, isDesktop } = getDeviceType(breakpoint)

  const handleResize = useCallback(() => {
    if (isBrowser) {
      setWidth(window.innerWidth)
    }
  }, [])

  // Window resize listener
  useEffect(() => {
    if (!isBrowser) return

    window.addEventListener('resize', handleResize)
    
    // Initial size check
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  // ResizeObserver for more accurate detection when available
  useEffect(() => {
    if (!isResizeObserverSupported) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === document.body) {
          setWidth(entry.contentRect.width)
        }
      }
    })

    resizeObserver.observe(document.body)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const value: ResponsiveContextValue = {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    width
  }

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  )
}

export const useResponsive = (): ResponsiveContextValue => {
  const context = useContext(ResponsiveContext)
  if (context === undefined) {
    throw new Error('ResponsiveContext must be used within ResponsiveProvider')
  }
  return context
}

// Custom hook for breakpoint-specific values
export const useBreakpointValue = <T,>(values: Partial<Record<ResponsiveContextValue['breakpoint'], T>>): T | undefined => {
  const { breakpoint } = useResponsive()
  
  // Find the best matching value by checking current and smaller breakpoints
  const orderedBreakpoints: Array<ResponsiveContextValue['breakpoint']> = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = orderedBreakpoints.indexOf(breakpoint)
  
  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i]
    if (values[bp] !== undefined) {
      return values[bp]
    }
  }
  
  return undefined
}

// Custom hook for media query-like usage
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    const mediaQuery = safeMatchMedia(query)
    return mediaQuery?.matches ?? false
  })

  useEffect(() => {
    const mediaQuery = safeMatchMedia(query)
    if (!mediaQuery) return

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    setMatches(mediaQuery.matches) // Set initial value

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

export { ResponsiveContext }