import { createContext } from 'react'

export interface AccessibilityContextValue {
  reducedMotion: boolean
  highContrast: boolean
  keyboardNavigation: boolean
  focusVisible: boolean
  announcements: boolean
  setKeyboardNavigation: (enabled: boolean) => void
  setFocusVisible: (visible: boolean) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

export const AccessibilityContext = createContext<AccessibilityContextValue | undefined>(undefined)
