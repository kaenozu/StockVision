import { useState, useMemo } from 'react'

interface VirtualListOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

interface VirtualListResult {
  virtualItems: Array<{
    index: number
    start: number
    end: number
  }>
  totalHeight: number
  scrollOffset: number
  setScrollOffset: (offset: number) => void
}

/**
 * useVirtualList hook
 * Virtualizes large lists for better performance
 */
export function useVirtualList<T>(
  items: T[],
  options: VirtualListOptions
): VirtualListResult {
  const { itemHeight, containerHeight, overscan = 5 } = options
  const [scrollOffset, setScrollOffset] = useState(0)

  const totalHeight = items.length * itemHeight

  const virtualItems = useMemo(() => {
    const visibleStart = Math.floor(scrollOffset / itemHeight)
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    )

    const start = Math.max(0, visibleStart - overscan)
    const end = Math.min(items.length - 1, visibleEnd + overscan)

    return Array.from({ length: end - start + 1 }, (_, index) => {
      const itemIndex = start + index
      return {
        index: itemIndex,
        start: itemIndex * itemHeight,
        end: (itemIndex + 1) * itemHeight
      }
    })
  }, [scrollOffset, itemHeight, containerHeight, items.length, overscan])

  return {
    virtualItems,
    totalHeight,
    scrollOffset,
    setScrollOffset
  }
}

/**
 * VirtualList component props interface
 * For the actual component, create a separate .tsx file
 */
export interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  height: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}