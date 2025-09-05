import { createContext } from 'react'

export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system'
  toggleTheme: () => void
  systemPreference: 'light' | 'dark'
  isDark: boolean
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
