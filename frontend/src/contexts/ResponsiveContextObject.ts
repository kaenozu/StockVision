import { createContext } from 'react'

export interface ResponsiveContextValue {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
}

export const ResponsiveContext = createContext<ResponsiveContextValue | undefined>(undefined)
