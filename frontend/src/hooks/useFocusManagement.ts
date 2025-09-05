import { useCallback } from 'react'
import { useAccessibility } from '../contexts/AccessibilityContext'

export const useFocusManagement = () => {
  const { focusVisible, keyboardNavigation, announce } = useAccessibility()

  const focusElement = useCallback((element: HTMLElement | null, announceText?: string) => {
    if (!element) return

    element.focus()
    if (announceText && keyboardNavigation) {
      announce(announceText)
    }
  }, [keyboardNavigation, announce])

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return () => {}

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return { focusElement, trapFocus, focusVisible, keyboardNavigation }
}
