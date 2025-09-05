import { useEffect, useState, useCallback, ReactNode } from 'react'
import { AccessibilityContext, AccessibilityContextValue } from './AccessibilityContextObject'

interface AccessibilityProviderProps {
  children: ReactNode
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  const [highContrast, setHighContrast] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-contrast: high)').matches
    }
    return false
  })

  const [keyboardNavigation, setKeyboardNavigationState] = useState(false)
  const [focusVisible, setFocusVisibleState] = useState(false)
  const [announcements, setAnnouncements] = useState(true)

  const setKeyboardNavigation = useCallback((enabled: boolean) => {
    setKeyboardNavigationState(enabled)
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.body.classList.add('keyboard-navigation-active')
      } else {
        document.body.classList.remove('keyboard-navigation-active')
      }
    }
  }, [])

  const setFocusVisible = useCallback((visible: boolean) => {
    setFocusVisibleState(visible)
    if (typeof document !== 'undefined') {
      if (visible) {
        document.body.classList.add('focus-visible')
      } else {
        document.body.classList.remove('focus-visible')
      }
    }
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcements || typeof document === 'undefined') return

    let announcer = document.getElementById(`announcer-${priority}`)
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = `announcer-${priority}`
      announcer.setAttribute('aria-live', priority)
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `
      document.body.appendChild(announcer)
    }

    announcer.textContent = message

    setTimeout(() => {
      announcer!.textContent = ''
    }, 1000)
  }, [announcements])

  // Reduced motion detection
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // High contrast detection
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Keyboard navigation detection
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true)
        setFocusVisible(true)
      }
    }

    const handleMouseDown = () => {
      setFocusVisible(false)
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        setFocusVisible(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [setKeyboardNavigation, setFocusVisible])

  // Apply accessibility classes to document
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement

    if (reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }

    if (highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
  }, [reducedMotion, highContrast])

  // Screen reader detection
  useEffect(() => {
    if (typeof navigator === 'undefined') return

    const userAgent = navigator.userAgent.toLowerCase()
    const hasScreenReader = 
      userAgent.includes('nvda') ||
      userAgent.includes('jaws') ||
      userAgent.includes('voiceover') ||
      userAgent.includes('orca') ||
      userAgent.includes('talkback')

    if (hasScreenReader) {
      setAnnouncements(true)
      announce('スクリーンリーダーが検出されました。アクセシビリティ機能が有効になります。')
    }
  }, [announce])

  const value: AccessibilityContextValue = {
    reducedMotion,
    highContrast,
    keyboardNavigation,
    focusVisible,
    announcements,
    setKeyboardNavigation,
    setFocusVisible,
    announce
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      <div id="announcer-polite" aria-live="polite" aria-atomic="true" className="sr-only" />
      <div id="announcer-assertive" aria-live="assertive" aria-atomic="true" className="sr-only" />
    </AccessibilityContext.Provider>
  )
}
