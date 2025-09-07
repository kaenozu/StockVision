import { useState } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export interface SortOption {
  value: string
  label: string
}

export interface FilterOption {
  key: string
  label: string
  checked: boolean
}

interface WatchListControlsProps {
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void
  onFilterChange: (filters: FilterOption[]) => void
  onSearch: (searchTerm: string) => void
}

export function WatchListControls({ 
  onSortChange, 
  onFilterChange, 
  onSearch 
}: WatchListControlsProps) {
  const { theme } = useTheme()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('stock_code')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filters, setFilters] = useState<FilterOption[]>([
    { key: 'has_notes', label: 'メモあり', checked: false },
    { key: 'has_alert', label: 'アラート設定あり', checked: false },
    { key: 'price_increase', label: '価格上昇', checked: false },
    { key: 'price_decrease', label: '価格下降', checked: false },
  ])

  const sortOptions: SortOption[] = [
    { value: 'stock_code', label: '銘柄コード' },
    { value: 'company_name', label: '会社名' },
    { value: 'current_price', label: '現在価格' },
    { value: 'change_percent', label: '変動率' },
    { value: 'created_at', label: '追加日' },
  ]

  const handleSortChange = (newSortBy: string) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(newSortBy)
    setSortOrder(newSortOrder)
    onSortChange(newSortBy, newSortOrder)
  }

  const handleFilterToggle = (key: string) => {
    const newFilters = filters.map(filter => 
      filter.key === key ? { ...filter, checked: !filter.checked } : filter
    )
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    onSearch(value)
  }

  const clearAllFilters = () => {
    const clearedFilters = filters.map(filter => ({ ...filter, checked: false }))
    setFilters(clearedFilters)
    onFilterChange(clearedFilters)
    setSearchTerm('')
    onSearch('')
  }

  const activeFiltersCount = filters.filter(f => f.checked).length

  return (
    <div className={`p-4 rounded-lg mb-4 ${
      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
    } border ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
      
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="銘柄コードや会社名で検索..."
            className={`w-full px-4 py-2 pl-10 border rounded-md ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 placeholder-gray-500'
            } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">ソート:</label>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className={`px-3 py-1 rounded border text-sm ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            } focus:ring-2 focus:ring-blue-500`}
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => handleSortChange(sortBy)}
            className={`p-1 rounded hover:bg-opacity-20 ${
              theme === 'dark' ? 'hover:bg-gray-600' : 'hover:bg-gray-200'
            }`}
            title={sortOrder === 'asc' ? '昇順' : '降順'}
          >
            <svg 
              className={`h-4 w-4 transition-transform ${
                sortOrder === 'desc' ? 'transform rotate-180' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm font-medium">フィルター:</label>
          {filters.map(filter => (
            <label
              key={filter.key}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                filter.checked
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : theme === 'dark'
                    ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={filter.checked}
                onChange={() => handleFilterToggle(filter.key)}
                className="sr-only"
              />
              {filter.label}
              {filter.checked && (
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </label>
          ))}
          
          {(activeFiltersCount > 0 || searchTerm) && (
            <button
              onClick={clearAllFilters}
              className="px-2 py-1 text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 underline"
            >
              クリア ({activeFiltersCount + (searchTerm ? 1 : 0)})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}