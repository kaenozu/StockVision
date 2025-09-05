import { useContext } from 'react'
import { AccessibilityContext, AccessibilityContextValue } from './AccessibilityContextObject'
export const useAccessibility = (): AccessibilityContextValue => {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('AccessibilityContext must be used within AccessibilityProvider')
  }
  return context
}
