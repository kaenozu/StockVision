import { useResponsive, ResponsiveContextValue } from '../contexts/ResponsiveContext'

export const useBreakpointValue = <T,>(values: Partial<Record<ResponsiveContextValue['breakpoint'], T>>): T | undefined => {
  const { breakpoint } = useResponsive()
  
  // Find the best matching value by checking current and smaller breakpoints
  const orderedBreakpoints: Array<ResponsiveContextValue['breakpoint']> = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = orderedBreakpoints.indexOf(breakpoint)
  
  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i]
    if (values[bp] !== undefined) {
      return values[bp]
    }
  }
  
  return undefined
}
