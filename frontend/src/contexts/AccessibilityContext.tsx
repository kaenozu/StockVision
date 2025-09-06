import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

interface AccessibilityContextType {
  // Focus management
  focusMode: boolean
  focusVisible: boolean
  keyboardNavigation: boolean
  
  // Motion and animation
  reducedMotion: boolean
  
  // Visual accessibility
  highContrast: boolean
  largeText: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  
  // Screen reader support
  screenReader: boolean
  announcements: string[]
  
  // Settings management
  setFocusMode: (enabled: boolean) => void
  setReducedMotion: (enabled: boolean) => void
  setHighContrast: (enabled: boolean) => void
  setLargeText: (enabled: boolean) => void
  setFontSize: (size: 'small' | 'medium' | 'large' | 'extra-large') => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  clearAnnouncements: () => void
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined)

interface AccessibilityProviderProps {
  children: ReactNode
  storagePrefix?: string
  enableKeyboardShortcuts?: boolean
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
  storagePrefix = 'accessibility',
  enableKeyboardShortcuts = true
}) => {
  // Focus management state
  const [focusMode, setFocusModeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(`${storagePrefix}-focus-mode`) === 'true'
      } catch {
        return false
      }
    }
    return false
  })

  const [focusVisible, setFocusVisible] = useState(false)
  const [keyboardNavigation, setKeyboardNavigation] = useState(false)

  // Motion preferences
  const [reducedMotion, setReducedMotionState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${storagePrefix}-reduced-motion`)
        if (stored !== null) {
          return stored === 'true'
        }
        // Check system preference
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch {
        return false
      }
    }
    return false
  })

  // Visual accessibility
  const [highContrast, setHighContrastState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${storagePrefix}-high-contrast`)
        if (stored !== null) {
          return stored === 'true'
        }
        // Check system preference
        return window.matchMedia('(prefers-contrast: high)').matches
      } catch {
        return false
      }
    }
    return false
  })

  const [largeText, setLargeTextState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(`${storagePrefix}-large-text`) === 'true'
      } catch {
        return false
      }
    }
    return false
  })

  const [fontSize, setFontSizeState] = useState<'small' | 'medium' | 'large' | 'extra-large'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`${storagePrefix}-font-size`)
        if (stored === 'small' || stored === 'medium' || stored === 'large' || stored === 'extra-large') {
          return stored
        }
      } catch {
        // ignore
      }
    }
    return 'medium'
  })

  // Screen reader detection and announcements
  const [screenReader, setScreenReader] = useState(false)
  const [announcements, setAnnouncements] = useState<string[]>([])

  // Detect screen reader usage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for common screen readers in user agent
      const userAgent = navigator.userAgent.toLowerCase()
      const hasScreenReader = userAgent.includes('nvda') || 
                             userAgent.includes('jaws') || 
                             userAgent.includes('voiceover') ||
                             userAgent.includes('talkback')
      
      setScreenReader(hasScreenReader)
    }
  }, [])

  // Detect keyboard navigation
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigation(true)
        setFocusVisible(true)
        if (!document.body.classList.contains('keyboard-navigation-active')) {
          document.body.classList.add('keyboard-navigation-active')
        }
      }
    }

    const handleMouseDown = () => {
      setFocusVisible(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  // Apply accessibility settings to document
  useEffect(() => {
    if (typeof window === 'undefined') return

    const root = document.documentElement

    // High contrast
    root.classList.toggle('high-contrast', highContrast)
    
    // Large text
    root.classList.toggle('large-text', largeText)
    
    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large')
    root.classList.add(`font-${fontSize}`)
    
    // Reduced motion
    root.classList.toggle('reduce-motion', reducedMotion)
    
    // Focus mode
    root.classList.toggle('focus-mode', focusMode)
  }, [highContrast, largeText, fontSize, reducedMotion, focusMode])

  // Persistent storage for settings
  const setFocusMode = useCallback((enabled: boolean) => {
    setFocusModeState(enabled)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${storagePrefix}-focus-mode`, String(enabled))
      } catch {
        // ignore
      }
    }
  }, [storagePrefix])

  const setReducedMotion = useCallback((enabled: boolean) => {
    setReducedMotionState(enabled)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${storagePrefix}-reduced-motion`, String(enabled))
      } catch {
        // ignore
      }
    }
  }, [storagePrefix])

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${storagePrefix}-high-contrast`, String(enabled))
      } catch {
        // ignore
      }
    }
  }, [storagePrefix])

  const setLargeText = useCallback((enabled: boolean) => {
    setLargeTextState(enabled)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${storagePrefix}-large-text`, String(enabled))
      } catch {
        // ignore
      }
    }
  }, [storagePrefix])

  const setFontSize = useCallback((size: 'small' | 'medium' | 'large' | 'extra-large') => {
    setFontSizeState(size)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${storagePrefix}-font-size`, size)
      } catch {
        // ignore
      }
    }
  }, [storagePrefix])

  // Announcement system for screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, `${priority}: ${message}`])
    
    // Auto-clear announcements after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(ann => ann !== `${priority}: ${message}`))
    }, 5000)
  }, [])

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([])
  }, [])

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')

    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(`${storagePrefix}-reduced-motion`) === null) {
        setReducedMotionState(e.matches)
      }
    }

    const handleContrastChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(`${storagePrefix}-high-contrast`) === null) {
        setHighContrastState(e.matches)
      }
    }

    reducedMotionQuery.addEventListener('change', handleMotionChange)
    highContrastQuery.addEventListener('change', handleContrastChange)

    return () => {
      reducedMotionQuery.removeEventListener('change', handleMotionChange)
      highContrastQuery.removeEventListener('change', handleContrastChange)
    }
  }, [storagePrefix])

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts || typeof window === 'undefined') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus mode toggle (Alt+F)
      if (e.altKey && e.key === 'f') {
        e.preventDefault()
        setFocusMode(!focusMode)
      }
      
      // High contrast toggle (Alt+H)
      if (e.altKey && e.key === 'h') {
        e.preventDefault()
        setHighContrast(!highContrast)
      }
      
      // Reduced motion toggle (Alt+M)
      if (e.altKey && e.key === 'm') {
        e.preventDefault()
        setReducedMotion(!reducedMotion)
      }
      
      // Font size controls (Ctrl + Plus/Minus)
      if (e.ctrlKey && e.key === '=') {
        e.preventDefault()
        const sizes = ['small', 'medium', 'large', 'extra-large']
        const currentIndex = sizes.indexOf(fontSize)
        if (currentIndex < sizes.length - 1) {
          setFontSize(sizes[currentIndex + 1] as 'small' | 'medium' | 'large' | 'extra-large')
        }
      }
      
      if (e.ctrlKey && e.key === '-') {
        e.preventDefault()
        const sizes = ['small', 'medium', 'large', 'extra-large']
        const currentIndex = sizes.indexOf(fontSize)
        if (currentIndex > 0) {
          setFontSize(sizes[currentIndex - 1] as 'small' | 'medium' | 'large' | 'extra-large')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enableKeyboardShortcuts, focusMode, highContrast, reducedMotion, fontSize, setFocusMode, setFontSize, setHighContrast, setReducedMotion])

  const value: AccessibilityContextType = {
    focusMode,
    focusVisible,
    keyboardNavigation,
    reducedMotion,
    highContrast,
    largeText,
    fontSize,
    screenReader,
    announcements,
    setFocusMode,
    setReducedMotion,
    setHighContrast,
    setLargeText,
    setFontSize,
    announce,
    clearAnnouncements
  }

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
      {/* ARIA live region for announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="accessibility-announcements"
      >
        {announcements.filter(ann => ann.startsWith('polite:')).map((ann, i) => (
          <div key={i}>{ann.replace('polite: ', '')}</div>
        ))}
      </div>
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        data-testid="accessibility-alerts"
      >
        {announcements.filter(ann => ann.startsWith('assertive:')).map((ann, i) => (
          <div key={i}>{ann.replace('assertive: ', '')}</div>
        ))}
      </div>
    </AccessibilityContext.Provider>
  )
}

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext)
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return context
}

// Hook for components that need to work without AccessibilityProvider
export const useAccessibilitySafe = (): AccessibilityContextType | null => {
  return useContext(AccessibilityContext)
}
