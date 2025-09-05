import React from 'react'
import { useVirtualList, VirtualListProps } from '../../hooks/useVirtualList'

/**
 * VirtualList component
 * Renders large lists efficiently using virtualization
 */
export function VirtualList<T>(props: VirtualListProps<T>) {
  const { items, itemHeight, height, renderItem, className = '' } = props
  const { virtualItems, totalHeight, setScrollOffset } = useVirtualList(items, {
    itemHeight,
    containerHeight: height
  })

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={(e) => setScrollOffset(e.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.index}
            style={{
              position: 'absolute',
              top: virtualItem.start,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}