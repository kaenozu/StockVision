/**
 * Global Error Handler Utilities
 */

import { errorLogger, ErrorLevel } from '../services/errorLogger'

export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

/**
 * Convert various error types to ApiError
 */
export function normalizeError(error: unknown): ApiError {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack
    }
  }
  
  if (typeof error === 'string') {
    return { message: error }
  }
  
  if (error && typeof error === 'object') {
    const err = error as any
    return {
      message: err.message || err.error || 'Unknown error',
      status: err.status || err.statusCode,
      code: err.code,
      details: err.details || err.data
    }
  }
  
  return { message: 'An unexpected error occurred' }
}

/**
 * Handle API errors
 */
export function handleApiError(error: unknown, context?: any): ApiError {
  const apiError = normalizeError(error)
  
  // Log to error service
  errorLogger.logError(
    new Error(apiError.message),
    {
      ...context,
      status: apiError.status,
      code: apiError.code,
      details: apiError.details,
      type: 'api'
    },
    apiError.status && apiError.status >= 500 ? ErrorLevel.ERROR : ErrorLevel.WARNING
  )
  
  return apiError
}

/**
 * Create a fetch wrapper with error handling
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      const errorBody = await response.text()
      let errorData: any
      
      try {
        errorData = JSON.parse(errorBody)
      } catch {
        errorData = { message: errorBody }
      }
      
      const error = {
        message: errorData.message || errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        details: errorData
      }
      
      throw error
    }
    
    return response
  } catch (error) {
    // Network errors or other fetch failures
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw {
        message: 'Network error: Unable to connect to the server',
        code: 'NETWORK_ERROR',
        details: error
      }
    }
    
    throw error
  }
}

/**
 * Retry logic for failed requests
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000
): Promise<T> {
  let lastError: unknown
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Don't retry on 4xx errors
      const apiError = normalizeError(error)
      if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
        throw error
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}

/**
 * User-friendly error messages
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  // Network errors
  if (error.code === 'NETWORK_ERROR') {
    return 'ネットワーク接続に問題があります。インターネット接続を確認してください。'
  }
  
  // HTTP status codes
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'リクエストが無効です。入力内容を確認してください。'
      case 401:
        return 'ログインが必要です。'
      case 403:
        return 'アクセス権限がありません。'
      case 404:
        return 'リクエストされたリソースが見つかりません。'
      case 429:
        return 'リクエストが多すぎます。しばらくしてからもう一度お試しください。'
      case 500:
      case 502:
      case 503:
        return 'サーバーエラーが発生しました。しばらくしてからもう一度お試しください。'
      case 504:
        return 'サーバーの応答がタイムアウトしました。'
    }
  }
  
  // Default message
  return error.message || 'エラーが発生しました。'
}

/**
 * Show error notification to user
 */
export function showErrorNotification(error: ApiError, duration = 5000) {
  const message = getUserFriendlyErrorMessage(error)
  
  // You can integrate with your notification system here
  // For now, we'll use console and potentially a toast library
  console.error('User notification:', message)
  
  // Example: If using a toast library
  // toast.error(message, { duration })
  
  // Fallback: Create a simple notification element
  if (typeof window !== 'undefined') {
    const notification = document.createElement('div')
    notification.className = 'error-notification'
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    `
    
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, duration)
  }
}

// Add CSS animations for notifications
if (typeof window !== 'undefined' && !document.getElementById('error-handler-styles')) {
  const style = document.createElement('style')
  style.id = 'error-handler-styles'
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
}