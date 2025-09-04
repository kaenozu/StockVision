// UI Component Interfaces - UIの改善機能
// Generated from functional requirements FR-001 to FR-008

export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  toggleTheme: () => void;
  systemPreference: 'light' | 'dark';
  isDark: boolean;
}

export interface ResponsiveContextValue {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMobile: boolean;
  isTablet: boolean; 
  isDesktop: boolean;
  width: number;
}

export interface AccessibilityContextValue {
  highContrast: boolean;
  reduceMotion: boolean;
  keyboardNavigation: boolean;
  screenReaderActive: boolean;
  setHighContrast: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
}

export interface VisualIndicatorProps {
  value: number;
  previousValue?: number;
  showTrend?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface VisualStyleConfig {
  color: string;
  backgroundColor: string;
  icon: string;
  arrowDirection: 'up' | 'down' | 'neutral';
  contrast: 'normal' | 'high';
}

export interface ChartConfigProps {
  type: 'line' | 'candlestick';
  timeframe: '1d' | '1w' | '1m' | '3m' | '1y';
  indicators?: string[];
  theme?: 'light' | 'dark';
  responsive?: boolean;
  accessibility?: AccessibilityOptions;
}

export interface AccessibilityOptions {
  ariaLabel: string;
  description?: string;
  keyboardNavigation?: boolean;
  highContrast?: boolean;
}

export interface StockCardEnhancedProps {
  // Existing props from current StockCard component
  stockCode: string;
  name: string;
  price: number;
  previousPrice?: number;
  // New enhancement props
  visualIndicator?: VisualIndicatorProps;
  theme?: 'light' | 'dark';
  responsive?: boolean;
  accessibility?: AccessibilityOptions;
}

export interface PriceDisplayProps {
  price: number;
  previousPrice?: number;
  currency?: string;
  precision?: number;
  showTrend?: boolean;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'light' | 'dark';
}

export interface LoadingStateProps {
  isLoading: boolean;
  error?: string | null;
  retry?: () => void;
  skeleton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface KeyboardNavigationProps {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  tabIndex?: number;
  ariaLabel?: string;
}

// Event interfaces for component interactions
export interface ThemeChangeEvent {
  theme: 'light' | 'dark' | 'system';
  timestamp: Date;
}

export interface ResponsiveBreakpointEvent {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  width: number;
  timestamp: Date;
}

export interface AccessibilityChangeEvent {
  setting: keyof AccessibilityContextValue;
  value: boolean;
  timestamp: Date;
}

// Utility type for component testing
export interface ComponentTestProps {
  testId?: string;
  debug?: boolean;
  mockData?: any;
}