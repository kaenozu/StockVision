/**
 * Error Message Component
 * 
 * Reusable error display component with various styles and actions.
 * Supports different error types and Japanese error messages.
 */

import React from 'react'

interface ErrorMessageProps {
  error: string | Error | null
  type?: 'error' | 'warning' | 'info'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  onRetry?: () => void
  onDismiss?: () => void
  retryText?: string
  dismissText?: string
  className?: string
}

const typeConfig = {
  error: {
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-800',
    iconColor: 'text-red-400',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    icon: '❌'
  },
  warning: {
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-400',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    icon: '⚠️'
  },
  info: {
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-400',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    icon: 'ℹ️'
  }
}

const sizeConfig = {
  sm: {
    padding: 'p-3',
    textSize: 'text-sm',
    buttonSize: 'px-3 py-1 text-sm'
  },
  md: {
    padding: 'p-4',
    textSize: 'text-base',
    buttonSize: 'px-4 py-2 text-sm'
  },
  lg: {
    padding: 'p-6',
    textSize: 'text-lg',
    buttonSize: 'px-6 py-3 text-base'
  }
}

function getErrorMessage(error: string | Error | null): string {
  if (!error) return ''
  
  if (typeof error === 'string') {
    return error
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return '不明なエラーが発生しました'
}

export function ErrorMessage({
  error,
  type = 'error',
  size = 'md',
  showIcon = true,
  onRetry,
  onDismiss,
  retryText = '再試行',
  dismissText = '閉じる',
  className = ''
}: ErrorMessageProps) {
  const errorMessage = getErrorMessage(error)
  
  if (!errorMessage) return null

  const config = typeConfig[type]
  const sizes = sizeConfig[size]

  return (
    <div className={`
      ${config.bgColor} 
      ${config.borderColor} 
      ${config.textColor}
      border rounded-lg
      ${sizes.padding}
      ${className}
    `}>
      <div className="flex items-start space-x-3">
        {showIcon && (
          <span className={`${sizes.textSize} flex-shrink-0`} role="img" aria-label={type}>
            {config.icon}
          </span>
        )}
        
        <div className="flex-1 min-w-0">
          <p className={`${sizes.textSize} font-medium`}>
            {errorMessage}
          </p>
        </div>

        {(onRetry || onDismiss) && (
          <div className="flex-shrink-0 flex space-x-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className={`
                  ${config.buttonColor}
                  ${sizes.buttonSize}
                  text-white
                  rounded
                  font-medium
                  transition-colors
                  focus:outline-none
                  focus:ring-2
                  focus:ring-offset-2
                  focus:ring-opacity-50
                `}
              >
                {retryText}
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`
                  ${sizes.buttonSize}
                  ${config.textColor}
                  border
                  ${config.borderColor}
                  rounded
                  font-medium
                  transition-colors
                  hover:bg-opacity-50
                  focus:outline-none
                  focus:ring-2
                  focus:ring-offset-2
                  focus:ring-opacity-50
                `}
              >
                {dismissText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Inline Error Message (for forms, etc.)
 */
export function InlineErrorMessage({
  error,
  className = ''
}: {
  error: string | Error | null
  className?: string
}) {
  const errorMessage = getErrorMessage(error)
  
  if (!errorMessage) return null

  return (
    <p className={`text-red-600 text-sm font-medium ${className}`}>
      {errorMessage}
    </p>
  )
}

/**
 * Network Error Message (specialized for API errors)
 */
export function NetworkErrorMessage({
  error,
  onRetry,
  className = ''
}: {
  error: string | Error | null
  onRetry?: () => void
  className?: string
}) {
  const errorMessage = getErrorMessage(error)
  
  if (!errorMessage) return null

  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                        errorMessage.toLowerCase().includes('fetch') ||
                        errorMessage.toLowerCase().includes('timeout')

  const displayMessage = isNetworkError 
    ? 'ネットワーク接続に問題があります。インターネット接続を確認してください。'
    : errorMessage

  return (
    <ErrorMessage
      error={displayMessage}
      type="error"
      showIcon={true}
      onRetry={onRetry}
      retryText="再接続"
      className={className}
    />
  )
}

/**
 * Validation Error List
 */
export function ValidationErrorList({
  errors,
  className = ''
}: {
  errors: string[]
  className?: string
}) {
  if (!errors || errors.length === 0) return null

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <span className="text-red-400 flex-shrink-0" role="img" aria-label="エラー">
          ❌
        </span>
        <div className="flex-1">
          <h4 className="text-red-800 font-medium text-sm mb-2">
            入力内容に問題があります:
          </h4>
          <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * Empty State Message
 */
export function EmptyStateMessage({
  title = 'データがありません',
  description = '',
  icon = '📭',
  action,
  actionText = 'データを取得',
  className = ''
}: {
  title?: string
  description?: string
  icon?: string
  action?: () => void
  actionText?: string
  className?: string
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="text-6xl mb-4" role="img" aria-label="空の状態">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-600 mb-6">
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}

export default ErrorMessage