import { useContext } from 'react'
import { ResponsiveContext, ResponsiveContextValue } from './ResponsiveContextObject'

export const useResponsive = (): ResponsiveContextValue => {
  const context = useContext(ResponsiveContext)
  if (context === undefined) {
    throw new Error('ResponsiveContext must be used within ResponsiveProvider')
  }
  return context
}