/**
 * UI Configuration Constants
 * Centralized configuration for UI components to ensure consistency
 */

import type { 
  BreakpointConfig, 
  CurrencyConfig, 
  AnimationConfig, 
  ComponentSize,
  SizeConfig,
  ColorConfig 
} from '../types/ui'

// Breakpoint definitions
export const BREAKPOINTS: BreakpointConfig = {
  xs: 0,      // 0px+
  sm: 640,    // 640px+
  md: 768,    // 768px+
  lg: 1024,   // 1024px+
  xl: 1280,   // 1280px+
  '2xl': 1920  // 1920px+
} as const

// Currency configurations
export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  JPY: { 
    symbol: '¥', 
    locale: 'ja-JP', 
    currency: 'JPY', 
    minimumFractionDigits: 0 
  },
  USD: { 
    symbol: '$', 
    locale: 'en-US', 
    currency: 'USD', 
    minimumFractionDigits: 2 
  },
  EUR: { 
    symbol: '€', 
    locale: 'de-DE', 
    currency: 'EUR', 
    minimumFractionDigits: 2 
  }
} as const

// Animation configurations
export const ANIMATIONS: Record<string, AnimationConfig> = {
  fast: { duration: '150ms', easing: 'ease-out' },
  normal: { duration: '300ms', easing: 'ease-in-out' },
  slow: { duration: '500ms', easing: 'ease-in-out' },
  bounce: { duration: '600ms', easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }
} as const

// Size configurations for components
export const COMPONENT_SIZES: Record<ComponentSize, SizeConfig> = {
  xs: {
    xs: 'text-xs p-1',
    sm: 'text-xs p-1.5',
    md: 'text-xs p-2',
    lg: 'text-sm p-2.5',
    xl: 'text-sm p-3'
  },
  sm: {
    xs: 'text-sm p-1.5',
    sm: 'text-sm p-2',
    md: 'text-sm p-2.5',
    lg: 'text-base p-3',
    xl: 'text-base p-3.5'
  },
  md: {
    xs: 'text-base p-2',
    sm: 'text-base p-2.5',
    md: 'text-base p-3',
    lg: 'text-lg p-3.5',
    xl: 'text-lg p-4'
  },
  lg: {
    xs: 'text-lg p-2.5',
    sm: 'text-lg p-3',
    md: 'text-lg p-3.5',
    lg: 'text-xl p-4',
    xl: 'text-xl p-4.5'
  },
  xl: {
    xs: 'text-xl p-3',
    sm: 'text-xl p-3.5',
    md: 'text-xl p-4',
    lg: 'text-2xl p-4.5',
    xl: 'text-2xl p-5'
  }
} as const

// Color configurations for accessibility
export const COLOR_CONFIGS: Record<string, ColorConfig> = {
  success: {
    normal: 'text-green-600 dark:text-green-400',
    colorBlind: 'text-blue-600 dark:text-blue-400'
  },
  danger: {
    normal: 'text-red-600 dark:text-red-400',
    colorBlind: 'text-orange-600 dark:text-orange-400'
  },
  warning: {
    normal: 'text-yellow-600 dark:text-yellow-400',
    colorBlind: 'text-amber-600 dark:text-amber-400'
  },
  info: {
    normal: 'text-blue-600 dark:text-blue-400',
    colorBlind: 'text-indigo-600 dark:text-indigo-400'
  },
  neutral: {
    normal: 'text-gray-600 dark:text-gray-400',
    colorBlind: 'text-slate-600 dark:text-slate-400'
  }
} as const

// Loading animation durations
export const LOADING_DURATIONS = {
  spinner: 1000,
  dots: 1200,
  pulse: 2000,
  skeleton: 1500,
  bars: 800
} as const

// Z-index layers
export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1010,
  modal: 1020,
  popover: 1030,
  tooltip: 1040,
  notification: 1050
} as const

// Common CSS classes
export const COMMON_CLASSES = {
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800',
  transition: 'transition-all duration-300 ease-in-out',
  shadow: 'shadow-sm hover:shadow-md transition-shadow duration-200',
  rounded: 'rounded-lg',
  border: 'border border-gray-200 dark:border-gray-700'
} as const