/**
 * API Error Handler Utility
 * 
 * This module provides utilities for handling API errors consistently across the application,
 * including error code mapping and user-friendly error messages.
 */

// Define error code to message mapping
const ERROR_CODE_MESSAGES: Record<string, string> = {
  // HTTP Status Codes
  '400': '入力内容に問題があります。内容を確認してください。',
  '401': '認証に失敗しました。再度ログインしてください。',
  '403': 'アクセスが許可されていません。',
  '404': 'リクエストされたデータが見つかりません。',
  '409': 'リクエストが競合しています。再度お試しください。',
  '422': '入力内容の形式に問題があります。',
  '429': 'リクエストが多すぎます。しばらくしてから再度お試しください。',
  '500': 'サーバー内部でエラーが発生しました。しばらくしてから再度お試しください。',
  '502': 'ゲートウェイエラーが発生しました。しばらくしてから再度お試しください。',
  '503': 'サービスが一時的に利用できません。しばらくしてから再度お試しください。',
  '504': 'ゲートウェイタイムアウトが発生しました。しばらくしてから再度お試しください。',

  // Application Specific Error Codes
  'STOCK_NOT_FOUND': '指定された銘柄が見つかりません。',
  'INVALID_STOCK_CODE': '銘柄コードの形式が正しくありません。',
  'DUPLICATE_WATCHLIST_ITEM': 'この銘柄は既にウォッチリストに登録されています。',
  'WATCHLIST_ITEM_NOT_FOUND': 'ウォッチリストの項目が見つかりません。',
  'EXTERNAL_API_ERROR': '外部サービスでエラーが発生しました。しばらくしてから再度お試しください。',
  'DATABASE_CONNECTION_ERROR': 'データベース接続に失敗しました。しばらくしてから再度お試しください。',

  // Network Errors
  'NETWORK_ERROR': 'ネットワーク接続に問題があります。インターネット接続を確認してください。',
  'TIMEOUT_ERROR': 'リクエストがタイムアウトしました。しばらくしてから再度お試しください。',
  'CONNECTION_ERROR': 'サーバーへの接続に失敗しました。しばらくしてから再度お試しください。'
}

/**
 * Get user-friendly error message based on error code or status
 * @param error - The error object from the API response
 * @returns User-friendly error message
 */
export function getErrorMessage(error: any): string {
  // Handle HTTP errors with status codes
  if (error?.response?.status) {
    const statusCode = error.response.status.toString()
    if (ERROR_CODE_MESSAGES[statusCode]) {
      return ERROR_CODE_MESSAGES[statusCode]
    }
  }

  // Handle application specific error codes
  if (error?.code && ERROR_CODE_MESSAGES[error.code]) {
    return ERROR_CODE_MESSAGES[error.code]
  }

  // Handle network errors
  if (error?.message) {
    const message = error.message.toLowerCase()
    if (message.includes('network')) {
      return ERROR_CODE_MESSAGES['NETWORK_ERROR']
    }
    if (message.includes('timeout')) {
      return ERROR_CODE_MESSAGES['TIMEOUT_ERROR']
    }
    if (message.includes('connection')) {
      return ERROR_CODE_MESSAGES['CONNECTION_ERROR']
    }
  }

  // Default error message
  return 'エラーが発生しました。しばらくしてから再度お試しください。'
}

/**
 * Check if error is a network error
 * @param error - The error object
 * @returns True if it's a network error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false
  
  // Check for network error indicators
  if (error?.message && 
      (error.message.includes('Network Error') || 
       error.message.includes('network') ||
       error.message.includes('timeout') ||
       error.message.includes('ECONNREFUSED'))) {
    return true
  }
  
  // Check for HTTP status codes that typically indicate network issues
  if (error?.response?.status && 
      (error.response.status === 0 || 
       error.response.status >= 502)) {
    return true
  }
  
  return false
}

/**
 * Check if error is due to authentication issues
 * @param error - The error object
 * @returns True if it's an authentication error
 */
export function isAuthError(error: any): boolean {
  return error?.response?.status === 401
}

/**
 * Check if error is due to authorization issues
 * @param error - The error object
 * @returns True if it's an authorization error
 */
export function isForbiddenError(error: any): boolean {
  return error?.response?.status === 403
}

/**
 * Check if error is a client-side validation error
 * @param error - The error object
 * @returns True if it's a validation error
 */
export function isValidationError(error: any): boolean {
  return error?.response?.status === 422 || error?.response?.status === 400
}

/**
 * Handle API error with appropriate user feedback
 * @param error - The error object
 * @param customHandlers - Optional custom error handlers
 */
export function handleApiError(
  error: any, 
  customHandlers?: {
    onNetworkError?: () => void
    onAuthError?: () => void
    onForbiddenError?: () => void
    onValidationError?: () => void
    onGenericError?: () => void
  }
): string {
  // Get user-friendly error message
  const message = getErrorMessage(error)
  
  // Handle specific error types with custom handlers
  if (isNetworkError(error) && customHandlers?.onNetworkError) {
    customHandlers.onNetworkError()
    return message
  }
  
  if (isAuthError(error) && customHandlers?.onAuthError) {
    customHandlers.onAuthError()
    return message
  }
  
  if (isForbiddenError(error) && customHandlers?.onForbiddenError) {
    customHandlers.onForbiddenError()
    return message
  }
  
  if (isValidationError(error) && customHandlers?.onValidationError) {
    customHandlers.onValidationError()
    return message
  }
  
  // Generic error handler
  if (customHandlers?.onGenericError) {
    customHandlers.onGenericError()
  }
  
  return message
}

export default {
  getErrorMessage,
  isNetworkError,
  isAuthError,
  isForbiddenError,
  isValidationError,
  handleApiError
}