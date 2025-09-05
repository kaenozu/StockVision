/**
 * Common UI types and interfaces
 * Centralizing UI-related type definitions to reduce duplication
 */

export type ThemeMode = 'light' | 'dark' | 'system'
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
export type Currency = 'JPY' | 'USD' | 'EUR'
export type TrendDirection = 'up' | 'down' | 'neutral'
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type LoadingVariant = 'spinner' | 'dots' | 'skeleton' | 'pulse' | 'bars'

// Common component props
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Size configuration
export interface SizeConfig {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
}

// Color configuration for accessibility
export interface ColorConfig {
  normal: string
  colorBlind: string
}

// Price and financial data types
export interface PriceData {
  current: number
  previous?: number
  change?: number
  changePercent?: number
  currency?: Currency
}

export interface CurrencyConfig {
  symbol: string
  locale: string
  currency: string
  minimumFractionDigits: number
}

// Accessibility preferences
export interface AccessibilityPreferences {
  reduceMotion: boolean
  highContrast: boolean
  colorBlindFriendly: boolean
  announcements: boolean
  keyboardNavigation: boolean
}

// Responsive breakpoint configuration
export interface BreakpointConfig {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  '2xl': number
}

// Animation configuration
export interface AnimationConfig {
  duration: string
  easing: string
  delay?: string
}

// Loading state configuration
export interface LoadingConfig {
  variant: LoadingVariant
  size: ComponentSize
  color?: string
  duration?: number
}

// Error handling
export interface ErrorState {
  hasError: boolean
  error: Error | null
  retry?: () => void
}

export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}