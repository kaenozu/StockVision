import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export type BreakpointType = 'mobile' | 'tablet' | 'desktop' | 'wide'

interface ResponsiveContextType {
  windowWidth: number
  windowHeight: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  breakpoint: BreakpointType
  orientation: 'portrait' | 'landscape'
  isTouch: boolean
}

const ResponsiveContext = createContext<ResponsiveContextType | null>(null)

interface ResponsiveProviderProps {
  children: ReactNode
  debounceDelay?: number
  breakpoints?: {
    mobile: number
    tablet: number
    desktop: number
    wide: number
  }
}

const defaultBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  wide: 1920
}

export const ResponsiveProvider: React.FC<ResponsiveProviderProps> = ({
  children,
  debounceDelay = 150,
  breakpoints = defaultBreakpoints
}) => {
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  }))

  const [isTouch, setIsTouch] = useState(() => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0
    }
    return false
  })

  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }, [])

  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    })
  }, [])

  const debouncedHandleResize = useCallback(
    debounce(handleResize, debounceDelay),
    [handleResize, debounceDelay]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Initial size
    handleResize()

    // Add resize listener
    window.addEventListener('resize', debouncedHandleResize)
    
    // Add orientation change listener
    window.addEventListener('orientationchange', handleResize)

    // Detect touch capability changes
    const handleTouchStart = () => setIsTouch(true)
    window.addEventListener('touchstart', handleTouchStart, { once: true })

    return () => {
      window.removeEventListener('resize', debouncedHandleResize)
      window.removeEventListener('orientationchange', handleResize)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [debouncedHandleResize, handleResize])

  // Calculate breakpoint information
  const getBreakpointInfo = useCallback((width: number) => {
    const isMobile = width < breakpoints.mobile
    const isTablet = width >= breakpoints.mobile && width < breakpoints.desktop
    const isDesktop = width >= breakpoints.desktop && width < breakpoints.wide
    const isWide = width >= breakpoints.wide

    let breakpoint: BreakpointType = 'mobile'
    if (isWide) breakpoint = 'wide'
    else if (isDesktop) breakpoint = 'desktop'
    else if (isTablet) breakpoint = 'tablet'

    return {
      isMobile,
      isTablet,
      isDesktop,
      isWide,
      breakpoint
    }
  }, [breakpoints])

  const breakpointInfo = getBreakpointInfo(windowSize.width)
  const orientation = windowSize.width > windowSize.height ? 'landscape' : 'portrait'

  const value: ResponsiveContextType = {
    windowWidth: windowSize.width,
    windowHeight: windowSize.height,
    ...breakpointInfo,
    orientation,
    isTouch
  }

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  )
}

export const useResponsive = (): ResponsiveContextType => {
  const context = useContext(ResponsiveContext)
  if (context === null) {
    throw new Error('useResponsive must be used within a ResponsiveProvider')
  }
  return context
}

// Hook for components that need to work without ResponsiveProvider
export const useResponsiveSafe = (): ResponsiveContextType | null => {
  return useContext(ResponsiveContext)
}

// Hook for specific breakpoint checks
export const useBreakpoint = (breakpoint: BreakpointType): boolean => {
  const responsive = useResponsive()
  return responsive.breakpoint === breakpoint
}

// Hook for minimum breakpoint checks
export const useMinBreakpoint = (breakpoint: BreakpointType): boolean => {
  const responsive = useResponsive()
  const breakpointOrder = ['mobile', 'tablet', 'desktop', 'wide']
  const currentIndex = breakpointOrder.indexOf(responsive.breakpoint)
  const targetIndex = breakpointOrder.indexOf(breakpoint)
  return currentIndex >= targetIndex
}

// Hook for maximum breakpoint checks
export const useMaxBreakpoint = (breakpoint: BreakpointType): boolean => {
  const responsive = useResponsive()
  const breakpointOrder = ['mobile', 'tablet', 'desktop', 'wide']
  const currentIndex = breakpointOrder.indexOf(responsive.breakpoint)
  const targetIndex = breakpointOrder.indexOf(breakpoint)
  return currentIndex <= targetIndex
}

// Utility hook for responsive values
export const useResponsiveValue = <T,>(values: Partial<Record<BreakpointType, T>>): T | undefined => {
  const responsive = useResponsive()
  
  // Try current breakpoint first
  if (values[responsive.breakpoint]) {
    return values[responsive.breakpoint]
  }
  
  // Fallback to smaller breakpoints
  const breakpointOrder: BreakpointType[] = ['wide', 'desktop', 'tablet', 'mobile']
  const currentIndex = breakpointOrder.indexOf(responsive.breakpoint)
  
  for (let i = currentIndex + 1; i < breakpointOrder.length; i++) {
    const fallbackBreakpoint = breakpointOrder[i]
    if (values[fallbackBreakpoint]) {
      return values[fallbackBreakpoint]
    }
  }
  
  return undefined
}
