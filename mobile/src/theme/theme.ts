/**
 * Mobile app theme configuration
 * Material Design 3 theme for React Native Paper
 */

import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

const colors = {
  primary: '#2196F3',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E3F2FD',
  onPrimaryContainer: '#0D47A1',
  
  secondary: '#4CAF50',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#E8F5E8',
  onSecondaryContainer: '#2E7D32',
  
  tertiary: '#FF9800',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#FFF3E0',
  onTertiaryContainer: '#E65100',
  
  error: '#F44336',
  onError: '#FFFFFF',
  errorContainer: '#FFEBEE',
  onErrorContainer: '#B71C1C',
  
  background: '#FAFAFA',
  onBackground: '#1A1A1A',
  surface: '#FFFFFF',
  onSurface: '#1A1A1A',
  
  surfaceVariant: '#F5F5F5',
  onSurfaceVariant: '#616161',
  outline: '#BDBDBD',
  outlineVariant: '#E0E0E0',
  
  // Stock-specific colors
  profit: '#4CAF50',
  loss: '#F44336',
  neutral: '#9E9E9E',
  
  // Chart colors
  chartRed: '#FF5252',
  chartGreen: '#4CAF50',
  chartBlue: '#2196F3',
  chartOrange: '#FF9800',
  chartPurple: '#9C27B0',
};

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...colors,
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90CAF9',
    onPrimary: '#0D47A1',
    primaryContainer: '#1565C0',
    onPrimaryContainer: '#E3F2FD',
    
    secondary: '#A5D6A7',
    onSecondary: '#2E7D32',
    secondaryContainer: '#388E3C',
    onSecondaryContainer: '#E8F5E8',
    
    tertiary: '#FFCC02',
    onTertiary: '#E65100',
    tertiaryContainer: '#F57C00',
    onTertiaryContainer: '#FFF3E0',
    
    error: '#EF5350',
    onError: '#B71C1C',
    errorContainer: '#D32F2F',
    onErrorContainer: '#FFEBEE',
    
    background: '#121212',
    onBackground: '#FFFFFF',
    surface: '#1E1E1E',
    onSurface: '#FFFFFF',
    
    surfaceVariant: '#2C2C2C',
    onSurfaceVariant: '#BDBDBD',
    outline: '#616161',
    outlineVariant: '#424242',
    
    // Stock-specific colors (dark mode)
    profit: '#4CAF50',
    loss: '#F44336',
    neutral: '#9E9E9E',
    
    // Chart colors (dark mode)
    chartRed: '#FF5252',
    chartGreen: '#4CAF50',
    chartBlue: '#90CAF9',
    chartOrange: '#FFCC02',
    chartPurple: '#CE93D8',
  },
};

// Default to light theme
export const theme = lightTheme;

// Typography
export const typography = {
  headlineLarge: {
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  headlineMedium: {
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  headlineSmall: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  titleLarge: {
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 0,
    fontWeight: '400' as const,
  },
  titleMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontWeight: '500' as const,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500' as const,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.15,
    fontWeight: '400' as const,
  },
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
    fontWeight: '400' as const,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.4,
    fontWeight: '400' as const,
  },
  labelLarge: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: '500' as const,
  },
  labelMedium: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },
  labelSmall: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },
};

// Spacing system (8pt grid)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
};

// Border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Shadows (elevation)
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
};

// Animation durations
export const animations = {
  fast: 200,
  normal: 300,
  slow: 500,
};

// Screen dimensions helpers
export const layout = {
  isSmallDevice: false, // Will be set based on device dimensions
  window: {
    width: 0,
    height: 0,
  },
  screen: {
    width: 0,
    height: 0,
  },
};