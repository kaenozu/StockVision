/**
 * Stock Search Component
 * 
 * Provides stock code search functionality with validation,
 * real-time suggestions, and form handling.
 */

import React, { useState, useCallback } from 'react'
import { StockSearchFormData, ValidationResult } from '../../types/stock'
import { useStockSearch } from '../../hooks/useStock'
import { validateStockSearchForm, sanitizeStockCode } from '../../utils/validation'
import { formatStockCode } from '../../utils/formatters'
import Button from '../ui/Button'
import { InlineErrorMessage } from '../ui/ErrorMessage'

interface StockSearchProps {
  onSearch: (stockCode: string, useRealData: boolean) => void
  loading?: boolean
  disabled?: boolean
  initialValue?: string
  showRealDataOption?: boolean
  placeholder?: string
  className?: string
}

export function StockSearch({
  onSearch,
  loading = false,
  disabled = false,
  initialValue = '',
  showRealDataOption = true,
  placeholder = '銘柄コードを入力 (例: 7203)',
  className = ''
}: StockSearchProps) {
  const [formData, setFormData] = useState<StockSearchFormData>({
    stock_code: initialValue,
    use_real_data: false
  })
  
  const [validation, setValidation] = useState<ValidationResult>({
    is_valid: true,
    errors: [],
    warnings: []
  })

  const [touched, setTouched] = useState(false)

  const { searchQuery, setSearchQuery, isSearching } = useStockSearch(300)

  // Validate form on change
  const validateForm = useCallback((data: StockSearchFormData) => {
    const result = validateStockSearchForm(data)
    setValidation(result)
    return result.is_valid
  }, [])

  // Handle stock code input change
  const handleStockCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const sanitized = sanitizeStockCode(rawValue)
    
    const newFormData = { ...formData, stock_code: sanitized }
    setFormData(newFormData)
    setSearchQuery(sanitized)
    
    if (touched) {
      validateForm(newFormData)
    }
  }

  // Handle real data checkbox change
  const handleRealDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFormData = { ...formData, use_real_data: e.target.checked }
    setFormData(newFormData)
    
    if (touched) {
      validateForm(newFormData)
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    
    const isValid = validateForm(formData)
    if (isValid && formData.stock_code) {
      const formattedCode = formatStockCode(formData.stock_code)
      onSearch(formattedCode, formData.use_real_data)
    }
  }

  // Handle input blur (show validation)
  const handleBlur = () => {
    setTouched(true)
    validateForm(formData)
  }

  // Quick search buttons for common stocks
  const quickSearchStocks = [
    { code: '7203', name: 'トヨタ' },
    { code: '6758', name: 'ソニー' },
    { code: '9984', name: 'ソフトバンク' },
    { code: '6861', name: 'キーエンス' }
  ]

  const handleQuickSearch = (stockCode: string) => {
    const newFormData = { ...formData, stock_code: stockCode }
    setFormData(newFormData)
    setSearchQuery(stockCode)
    onSearch(stockCode, formData.use_real_data)
  }

  const hasErrors = touched && validation.errors.length > 0
  const hasWarnings = touched && validation.warnings.length > 0

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-6 ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            株式検索
          </h2>
          <p className="text-sm text-gray-600">
            4桁の銘柄コードを入力して株価情報を取得できます
          </p>
        </div>

        {/* Stock Code Input */}
        <div>
          <label htmlFor="stock-code" className="block text-sm font-medium text-gray-700 mb-2">
            銘柄コード
          </label>
          <div className="relative">
            <input
              id="stock-code"
              type="text"
              value={formData.stock_code}
              onChange={handleStockCodeChange}
              onBlur={handleBlur}
              placeholder={placeholder}
              maxLength={4}
              disabled={disabled}
              className={`
                w-full px-4 py-3 border rounded-lg text-lg font-mono
                focus:outline-none focus:ring-2 focus:border-transparent
                ${hasErrors 
                  ? 'border-red-300 focus:ring-red-500' 
                  : hasWarnings
                    ? 'border-yellow-300 focus:ring-yellow-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              `}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          
          {/* Validation Messages */}
          {hasErrors && (
            <InlineErrorMessage error={validation.errors.join(' / ')} className="mt-1" />
          )}
          {hasWarnings && !hasErrors && (
            <div className="mt-1 text-yellow-600 text-sm">
              {validation.warnings.join(' / ')}
            </div>
          )}
        </div>

        {/* Real Data Option */}
        {showRealDataOption && (
          <div className="flex items-center">
            <input
              id="use-real-data"
              type="checkbox"
              checked={formData.use_real_data}
              onChange={handleRealDataChange}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="use-real-data" className="ml-2 text-sm text-gray-700">
              リアルタイムデータを使用する
              <span className="text-gray-500 ml-1">(応答が遅くなる場合があります)</span>
            </label>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loading}
          disabled={disabled || !formData.stock_code || hasErrors}
          className="font-medium"
        >
          {loading ? '検索中...' : '株価を取得'}
        </Button>

        {/* Quick Search */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            クイック検索
          </p>
          <div className="flex flex-wrap gap-2">
            {quickSearchStocks.map((stock) => (
              <button
                key={stock.code}
                type="button"
                onClick={() => handleQuickSearch(stock.code)}
                disabled={disabled || loading}
                className="
                  px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 
                  text-gray-700 rounded-full transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                "
              >
                {stock.code} - {stock.name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  )
}

/**
 * Compact Stock Search (for navigation bars, etc.)
 */
export function CompactStockSearch({
  onSearch,
  loading = false,
  disabled = false,
  className = ''
}: Pick<StockSearchProps, 'onSearch' | 'loading' | 'disabled' | 'className'>) {
  const [stockCode, setStockCode] = useState('')
  const [isValid, setIsValid] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeStockCode(e.target.value)
    setStockCode(sanitized)
    setIsValid(sanitized.length === 4 && /^[0-9]{4}$/.test(sanitized))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValid && stockCode) {
      onSearch(formatStockCode(stockCode), false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <input
        type="text"
        value={stockCode}
        onChange={handleInputChange}
        placeholder="銘柄コード"
        maxLength={4}
        disabled={disabled}
        className="
          px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          w-24
        "
      />
      <Button
        type="submit"
        variant="primary"
        size="sm"
        loading={loading}
        disabled={disabled || !isValid}
      >
        検索
      </Button>
    </form>
  )
}

export default StockSearch