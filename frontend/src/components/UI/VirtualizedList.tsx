/**
 * Virtualized List Component
 * 
 * High-performance list component that only renders visible items,
 * significantly improving performance for large datasets.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'

interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  overscan?: number
  onScroll?: (scrollTop: number) => void
  className?: string
  loadingComponent?: React.ReactNode
  emptyComponent?: React.ReactNode
  scrollToIndex?: number
}

export const VirtualizedList = memo(function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 3,
  onScroll,
  className = '',
  loadingComponent,
  emptyComponent,
  scrollToIndex
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  // Get visible items
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      originalIndex: startIndex + index
    }))
  }, [items, visibleRange])

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  // Auto-scroll to specific index
  useEffect(() => {
    if (typeof scrollToIndex === 'number' && scrollElementRef.current) {
      const targetScrollTop = scrollToIndex * itemHeight
      scrollElementRef.current.scrollTop = targetScrollTop
      setScrollTop(targetScrollTop)
    }
  }, [scrollToIndex, itemHeight])

  // Empty state
  if (items.length === 0 && emptyComponent) {
    return (
      <div className={`virtualized-list-empty ${className}`} style={{ height: containerHeight }}>
        {emptyComponent}
      </div>
    )
  }

  return (
    <div
      ref={scrollElementRef}
      className={`virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto'
      }}
      onScroll={handleScroll}
    >
      {/* Spacer for items before visible range */}
      <div style={{ height: visibleRange.startIndex * itemHeight }} />
      
      {/* Visible items */}
      <div>
        {visibleItems.map(({ item, originalIndex }) => (
          <div
            key={keyExtractor(item, originalIndex)}
            style={{ height: itemHeight }}
            className="virtualized-list-item"
          >
            {renderItem(item, originalIndex)}
          </div>
        ))}
      </div>
      
      {/* Spacer for items after visible range */}
      <div style={{ 
        height: Math.max(0, totalHeight - (visibleRange.endIndex + 1) * itemHeight)
      }} />
      
      {/* Loading indicator */}
      {loadingComponent && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          {loadingComponent}
        </div>
      )}
    </div>
  )
})

/**
 * Adaptive Virtualized List that adjusts item height based on content
 */
interface AdaptiveVirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  estimatedItemHeight?: number
  containerHeight: number
  overscan?: number
  onScroll?: (scrollTop: number) => void
  className?: string
}

export const AdaptiveVirtualizedList = memo(function AdaptiveVirtualizedList<T>({
  items,
  renderItem,
  keyExtractor,
  estimatedItemHeight = 50,
  containerHeight,
  overscan = 3,
  onScroll,
  className = ''
}: AdaptiveVirtualizedListProps<T>) {
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map())
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const itemElementRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Update item height when measured
  const updateItemHeight = useCallback((index: number, height: number) => {
    setItemHeights(prev => {
      if (prev.get(index) !== height) {
        const next = new Map(prev)
        next.set(index, height)
        return next
      }
      return prev
    })
  }, [])

  // Calculate cumulative heights and visible range
  const { cumulativeHeights, visibleRange, totalHeight } = useMemo(() => {
    const heights: number[] = []
    let cumulative = 0
    
    for (let i = 0; i < items.length; i++) {
      heights[i] = cumulative
      const itemHeight = itemHeights.get(i) || estimatedItemHeight
      cumulative += itemHeight
    }
    
    // Find visible range
    let startIndex = 0
    let endIndex = items.length - 1
    
    for (let i = 0; i < heights.length; i++) {
      if (heights[i] + (itemHeights.get(i) || estimatedItemHeight) >= scrollTop) {
        startIndex = Math.max(0, i - overscan)
        break
      }
    }
    
    for (let i = startIndex; i < heights.length; i++) {
      if (heights[i] > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan)
        break
      }
    }
    
    return {
      cumulativeHeights: heights,
      visibleRange: { startIndex, endIndex },
      totalHeight: cumulative
    }
  }, [items.length, itemHeights, estimatedItemHeight, scrollTop, containerHeight, overscan])

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange
    return items.slice(startIndex, endIndex + 1).map((item, index) => {
      const originalIndex = startIndex + index
      return {
        item,
        originalIndex,
        top: cumulativeHeights[originalIndex] || 0
      }
    })
  }, [items, visibleRange, cumulativeHeights])

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  return (
    <div
      ref={scrollElementRef}
      className={`adaptive-virtualized-list ${className}`}
      style={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, originalIndex, top }) => (
          <AdaptiveItem
            key={keyExtractor(item, originalIndex)}
            index={originalIndex}
            top={top}
            onHeightChange={updateItemHeight}
            ref={(el) => {
              if (el) {
                itemElementRefs.current.set(originalIndex, el)
              } else {
                itemElementRefs.current.delete(originalIndex)
              }
            }}
          >
            {renderItem(item, originalIndex)}
          </AdaptiveItem>
        ))}
      </div>
    </div>
  )
})

// Individual adaptive item component
const AdaptiveItem = memo(React.forwardRef<
  HTMLDivElement,
  {
    index: number
    top: number
    onHeightChange: (index: number, height: number) => void
    children: React.ReactNode
  }
>(function AdaptiveItem({ index, top, onHeightChange, children }, ref) {
  const elementRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver>()

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Create ResizeObserver to detect height changes
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height
        onHeightChange(index, height)
      }
    })

    resizeObserverRef.current.observe(element)

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [index, onHeightChange])

  return (
    <div
      ref={(el) => {
        elementRef.current = el
        if (typeof ref === 'function') {
          ref(el)
        } else if (ref) {
          ref.current = el
        }
      }}
      style={{
        position: 'absolute',
        top: top,
        left: 0,
        right: 0
      }}
      className="adaptive-virtualized-item"
    >
      {children}
    </div>
  )
}))

export default VirtualizedList