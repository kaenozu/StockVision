import { useAccessibility } from '../contexts/AccessibilityContext'

export const useMotionSafe = () => {
  const { reducedMotion } = useAccessibility()
  return !reducedMotion
}
