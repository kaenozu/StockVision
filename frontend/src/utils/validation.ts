/**
 * Validation Utilities
 * 
 * Centralized validation functions for form inputs, API responses, and data consistency.
 * Provides both synchronous validation for immediate feedback and asynchronous validation
 * for server-side checks.
 */

import {
  StockData,
  CurrentPriceResponse, 
  PriceHistoryItem,
  WatchlistItemAPI,
  AddWatchlistRequest,
  StockCodeValidation,
  ValidationResult,
  StockSearchFormData,
  WatchlistFormData,
  STOCK_CODE_PATTERN,
  MAX_DAYS_HISTORY,
  MIN_DAYS_HISTORY
} from '../types/stock'

/**
 * Stock Code Validation
 */
export function validateStockCode(code: string): StockCodeValidation {
  if (!code || typeof code !== 'string') {
    return {
      is_valid: false,
      error_message: '銘柄コードを入力してください'
    }
  }

  const trimmedCode = code.trim()
  
  if (trimmedCode.length === 0) {
    return {
      is_valid: false,
      error_message: '銘柄コードを入力してください'
    }
  }

  if (!STOCK_CODE_PATTERN.test(trimmedCode)) {
    return {
      is_valid: false,
      error_message: '銘柄コードは4桁の数字で入力してください（例: 7203）'
    }
  }

  return {
    is_valid: true,
    normalized_code: trimmedCode
  }
}

/**
 * Price Validation
 */
export function validatePrice(price: number | string | null | undefined): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (price === null || price === undefined || price === '') {
    return { is_valid: true, errors, warnings } // Optional field
  }

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price

  if (isNaN(numericPrice)) {
    errors.push('価格は数値で入力してください')
    return { is_valid: false, errors, warnings }
  }

  if (numericPrice <= 0) {
    errors.push('価格は0より大きい値を入力してください')
  }

  if (numericPrice > 1000000) {
    warnings.push('価格が非常に高く設定されています')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Days Parameter Validation
 */
export function validateDays(days: number | string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const numericDays = typeof days === 'string' ? parseInt(days, 10) : days

  if (isNaN(numericDays)) {
    errors.push('日数は数値で入力してください')
    return { is_valid: false, errors, warnings }
  }

  if (numericDays < MIN_DAYS_HISTORY) {
    errors.push(`日数は${MIN_DAYS_HISTORY}日以上で入力してください`)
  }

  if (numericDays > MAX_DAYS_HISTORY) {
    errors.push(`日数は${MAX_DAYS_HISTORY}日以下で入力してください`)
  }

  if (numericDays > 180) {
    warnings.push('長期間のデータは表示に時間がかかる場合があります')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Stock Search Form Validation
 */
export function validateStockSearchForm(data: StockSearchFormData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate stock code
  const stockCodeValidation = validateStockCode(data.stock_code)
  if (!stockCodeValidation.is_valid) {
    errors.push(stockCodeValidation.error_message || '無効な銘柄コード')
  }

  // Validate use_real_data flag
  if (typeof data.use_real_data !== 'boolean') {
    errors.push('リアルデータフラグは真偽値で指定してください')
  }

  if (data.use_real_data) {
    warnings.push('リアルデータを使用すると応答が遅くなる場合があります')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Watchlist Form Validation
 */
export function validateWatchlistForm(data: WatchlistFormData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate stock code
  const stockCodeValidation = validateStockCode(data.stock_code)
  if (!stockCodeValidation.is_valid) {
    errors.push(stockCodeValidation.error_message || '無効な銘柄コード')
  }

  // Validate alert price
  if (data.alert_price !== null && data.alert_price !== '') {
    const priceValidation = validatePrice(data.alert_price)
    if (!priceValidation.is_valid) {
      errors.push(...priceValidation.errors)
    }
    warnings.push(...priceValidation.warnings)
  }

  // Validate notes length
  if (data.notes && typeof data.notes === 'string' && data.notes.length > 500) {
    errors.push('メモは500文字以内で入力してください')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Add Watchlist Request Validation
 */
export function validateAddWatchlistRequest(data: AddWatchlistRequest): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate stock code
  const stockCodeValidation = validateStockCode(data.stock_code)
  if (!stockCodeValidation.is_valid) {
    errors.push(stockCodeValidation.error_message || '無効な銘柄コード')
  }

  // Validate alert price
  if (data.alert_price !== null && data.alert_price !== undefined) {
    const priceValidation = validatePrice(data.alert_price)
    if (!priceValidation.is_valid) {
      errors.push(...priceValidation.errors)
    }
    warnings.push(...priceValidation.warnings)
  }

  // Validate notes
  if (data.notes !== null && data.notes !== undefined) {
    if (typeof data.notes !== 'string') {
      errors.push('メモは文字列で入力してください')
    } else if (data.notes.length > 500) {
      errors.push('メモは500文字以内で入力してください')
    }
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * OHLC Data Consistency Validation
 */
export function validateOHLCData(item: PriceHistoryItem): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check basic numeric requirements
  if (item.high < item.low) {
    errors.push('高値は安値より高い値である必要があります')
  }

  if (item.high < item.open && item.high < item.close) {
    errors.push('高値は始値と終値の最大値以上である必要があります')
  }

  if (item.low > item.open && item.low > item.close) {
    errors.push('安値は始値と終値の最小値以下である必要があります')
  }

  if (item.volume < 0) {
    errors.push('出来高は0以上である必要があります')
  }

  // Check for unusual patterns (warnings)
  if (item.volume === 0) {
    warnings.push('出来高が0になっています（取引停止の可能性）')
  }

  const priceRange = item.high - item.low
  const avgPrice = (item.high + item.low) / 2
  if (priceRange / avgPrice > 0.2) { // 20% range
    warnings.push('価格変動が非常に大きいです')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Date Format Validation
 */
export function validateDateFormat(dateString: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!dateString || typeof dateString !== 'string') {
    errors.push('日付は文字列で指定してください')
    return { is_valid: false, errors, warnings }
  }

  // Check YYYY-MM-DD format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateString)) {
    errors.push('日付はYYYY-MM-DD形式で入力してください')
    return { is_valid: false, errors, warnings }
  }

  // Check if date is valid
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    errors.push('無効な日付です')
    return { is_valid: false, errors, warnings }
  }

  // Check if date is in the future
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to compare dates only
  
  if (date.getTime() > today.getTime()) {
    warnings.push('未来の日付が指定されています')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * ISO Timestamp Format Validation
 */
export function validateISOTimestamp(timestamp: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!timestamp || typeof timestamp !== 'string') {
    errors.push('タイムスタンプは文字列で指定してください')
    return { is_valid: false, errors, warnings }
  }

  // Check ISO 8601 format (basic check)
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
  if (!isoPattern.test(timestamp)) {
    errors.push('タイムスタンプはISO 8601形式（YYYY-MM-DDTHH:mm:ssZ）で指定してください')
    return { is_valid: false, errors, warnings }
  }

  // Check if timestamp is valid
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) {
    errors.push('無効なタイムスタンプです')
    return { is_valid: false, errors, warnings }
  }

  // Check if timestamp is too old (more than 1 year)
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  
  if (date.getTime() < oneYearAgo.getTime()) {
    warnings.push('タイムスタンプが1年以上古いです')
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Market Status Validation
 */
export function validateMarketStatus(status: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  const validStatuses = ['open', 'closed', 'pre_market', 'after_hours']
  
  if (!validStatuses.includes(status)) {
    errors.push(`無効な市場ステータスです。有効な値: ${validStatuses.join(', ')}`)
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Comprehensive Stock Data Validation
 */
export function validateStockDataResponse(data: StockData): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate stock code
  const stockCodeValidation = validateStockCode(data.stock_code)
  if (!stockCodeValidation.is_valid) {
    errors.push(`銘柄コード: ${stockCodeValidation.error_message}`)
  }

  // Validate prices
  const priceValidation = validatePrice(data.current_price)
  if (!priceValidation.is_valid) {
    errors.push(`現在価格: ${priceValidation.errors.join(', ')}`)
  }

  const prevCloseValidation = validatePrice(data.previous_close)
  if (!prevCloseValidation.is_valid) {
    errors.push(`前日終値: ${prevCloseValidation.errors.join(', ')}`)
  }

  // Validate price change consistency
  if (priceValidation.is_valid && prevCloseValidation.is_valid) {
    const expectedChange = data.current_price - data.previous_close
    const expectedPct = (expectedChange / data.previous_close) * 100

    if (Math.abs(data.price_change - expectedChange) > 0.01) {
      errors.push('価格変動の計算が正しくありません')
    }

    if (Math.abs(data.price_change_pct - expectedPct) > 0.01) {
      errors.push('価格変動率の計算が正しくありません')
    }
  }

  // Validate company name
  if (!data.company_name || data.company_name.trim().length === 0) {
    errors.push('会社名が設定されていません')
  }

  // Validate timestamp if present
  if (data.last_updated) {
    const timestampValidation = validateISOTimestamp(data.last_updated)
    if (!timestampValidation.is_valid) {
      errors.push(`更新日時: ${timestampValidation.errors.join(', ')}`)
    }
    warnings.push(...timestampValidation.warnings)
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Data Sanitization Functions
 */
export function sanitizeStockCode(code: string): string {
  if (!code || typeof code !== 'string') return ''
  return code.trim().replace(/[^0-9]/g, '').substring(0, 4)
}

export function sanitizePrice(price: string): string {
  if (!price || typeof price !== 'string') return ''
  return price.trim().replace(/[^0-9.]/g, '')
}

export function sanitizeNotes(notes: string): string {
  if (!notes || typeof notes !== 'string') return ''
  return notes.trim().substring(0, 500)
}

/**
 * Utility function to format validation errors for display
 */
export function formatValidationErrors(validation: ValidationResult): string {
  if (validation.is_valid) return ''
  return validation.errors.join(' / ')
}

/**
 * Utility function to format validation warnings for display
 */
export function formatValidationWarnings(validation: ValidationResult): string {
  return validation.warnings.join(' / ')
}

/**
 * Check if validation result has any issues (errors or warnings)
 */
export function hasValidationIssues(validation: ValidationResult): boolean {
  return validation.errors.length > 0 || validation.warnings.length > 0
}