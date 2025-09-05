import { useTheme } from '../../contexts/ThemeContext'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  circle?: boolean
  lines?: number
}

export function Skeleton({ 
  width = '100%', 
  height = '1rem', 
  className = '', 
  circle = false,
  lines = 1
}: SkeletonProps) {
  const { theme } = useTheme()
  
  const baseClasses = `animate-pulse ${
    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
  } ${circle ? 'rounded-full' : 'rounded'}`

  if (lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${index === lines - 1 ? 'w-3/4' : ''}`}
            style={{ 
              width: index === lines - 1 ? '75%' : width, 
              height 
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  const { theme } = useTheme()
  
  return (
    <div className={`p-4 rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } ${className}`}>
      <div className="animate-pulse">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton circle width="40px" height="40px" />
          <div className="flex-1">
            <Skeleton width="60%" height="1.25rem" />
            <Skeleton width="40%" height="1rem" className="mt-2" />
          </div>
        </div>
        <Skeleton lines={3} height="1rem" />
      </div>
    </div>
  )
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  const { theme } = useTheme()
  
  return (
    <div className={`p-4 rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } ${className}`}>
      <div className="animate-pulse">
        <Skeleton width="40%" height="1.5rem" className="mb-4" />
        <div className="h-64 flex items-end justify-between space-x-1">
          {Array.from({ length: 20 }, (_, index) => (
            <Skeleton
              key={index}
              width="100%"
              height={`${Math.random() * 80 + 20}%`}
              className="flex-1"
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className = '' 
}: { 
  rows?: number
  columns?: number
  className?: string 
}) {
  const { theme } = useTheme()
  
  return (
    <div className={`overflow-hidden rounded-lg border ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-4">
          {Array.from({ length: columns }, (_, index) => (
            <Skeleton key={index} width="120px" height="1rem" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        >
          <div className="flex space-x-4">
            {Array.from({ length: columns }, (_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                width={colIndex === 0 ? "80px" : "100px"} 
                height="1rem" 
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}