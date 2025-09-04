/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner with various sizes and colors.
 * Supports Japanese loading messages and accessibility features.
 */

import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'white'
  message?: string
  showMessage?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  error: 'text-red-600',
  white: 'text-white'
}

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  message = '読み込み中...',
  showMessage = false,
  className = ''
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <svg
          className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="img"
          aria-label="読み込み中"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        {showMessage && (
          <span className={`text-sm font-medium ${colorClasses[color]}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Inline Loading Spinner (for buttons, etc.)
 */
export function InlineLoadingSpinner({
  size = 'sm',
  color = 'white',
  className = ''
}: Pick<LoadingSpinnerProps, 'size' | 'color' | 'className'>) {
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="img"
      aria-label="処理中"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * Page Loading Overlay
 */
export function PageLoadingOverlay({
  message = 'ページを読み込んでいます...',
  isVisible = true
}: {
  message?: string
  isVisible?: boolean
}) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-8 shadow-xl">
        <LoadingSpinner size="xl" color="primary" />
        <p className="text-lg font-medium text-gray-700">{message}</p>
      </div>
    </div>
  )
}

/**
 * Card Loading Skeleton
 */
export function LoadingSkeleton({
  lines = 3,
  className = ''
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="flex space-x-3">
          <div className="h-4 bg-gray-300 rounded flex-1"></div>
          <div className="h-4 bg-gray-300 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  )
}

export default LoadingSpinner