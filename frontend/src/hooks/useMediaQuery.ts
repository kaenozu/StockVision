import { useEffect, useState } from 'react'
import { safeMatchMedia } from '../utils/browser'

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => {
    const mediaQuery = safeMatchMedia(query)
    return mediaQuery?.matches ?? false
  })

  useEffect(() => {
    const mediaQuery = safeMatchMedia(query)
    if (!mediaQuery) return

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    setMatches(mediaQuery.matches) // Set initial value

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}
