import { useContext } from 'react'
import { ThemeContext, ThemeContextValue } from './ThemeContextObject'
export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('ThemeContext must be used within ThemeProvider')
  }
  return context
}
