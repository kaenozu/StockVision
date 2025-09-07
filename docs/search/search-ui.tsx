/**
 * Search UI Component for Documentation
 * React component for document search interface
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { DocumentSearchEngine, SearchQuery, SearchResult, SearchDocument } from './search-engine'
import { ElasticsearchSearchEngine } from './elasticsearch-search-engine'

interface SearchUIProps {
  searchEngine: DocumentSearchEngine | ElasticsearchSearchEngine
  onDocumentSelect?: (document: SearchDocument) => void
  placeholder?: string
  className?: string
}

interface SearchFilters {
  types: string[]
  categories: string[]
  tags: string[]
  language: string
  difficulty: string[]
}

export const SearchUI: React.FC<SearchUIProps> = ({
  searchEngine,
  onDocumentSelect,
  placeholder = "Search documentation...",
  className = ""
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    categories: [],
    tags: [],
    language: '',
    difficulty: []
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Get facets for filters
  const [facets, setFacets] = useState({ types: [], categories: [], tags: [], languages: [] })
  
  useEffect(() => {
    const loadFacets = async () => {
      try {
        const facetData = await searchEngine.getFacets()
        setFacets(facetData)
      } catch (error) {
        console.error('Failed to load facets:', error)
      }
    }
    loadFacets()
  }, [searchEngine])

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters) => {
      if (!searchQuery.trim()) {
        setResults([])
        return
      }

      setIsLoading(true)
      
      try {
        const searchParams: SearchQuery = {
          query: searchQuery,
          filters: {
            type: searchFilters.types.length > 0 ? searchFilters.types : undefined,
            category: searchFilters.categories.length > 0 ? searchFilters.categories : undefined,
            tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
            language: searchFilters.language || undefined,
            difficulty: searchFilters.difficulty.length > 0 ? searchFilters.difficulty : undefined
          },
          sorting: {
            field: sortBy,
            order: sortOrder
          },
          pagination: {
            page: currentPage,
            size: 10
          }
        }

        const searchResults = await searchEngine.search(searchParams)
        setResults(searchResults)
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    [searchEngine, sortBy, sortOrder, currentPage]
  )

  // Handle search input change
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setCurrentPage(1)
    
    if (value.length >= 2) {
      // Get suggestions
      searchEngine.getSuggestions(value)
        .then(newSuggestions => setSuggestions(newSuggestions))
        .catch(error => {
          console.error('Failed to get suggestions:', error)
          setSuggestions([])
        })
      
      // Perform search
      debouncedSearch(value, filters)
    } else {
      setSuggestions([])
      setResults([])
    }
  }, [debouncedSearch, filters, searchEngine])

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters)
    setCurrentPage(1)
    
    if (query.trim()) {
      debouncedSearch(query, newFilters)
    }
  }, [query, debouncedSearch])

  // Handle sorting changes
  const handleSortChange = useCallback((field: typeof sortBy, order: typeof sortOrder) => {
    setSortBy(field)
    setSortOrder(order)
    setCurrentPage(1)
  }, [])

  // Effect to trigger search when sort changes
  useEffect(() => {
    if (query.trim()) {
      debouncedSearch(query, filters)
    }
  }, [sortBy, sortOrder, currentPage])

  return (
    <div className={`search-ui ${className}`}>
      {/* Search Input */}
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder}
            className="search-input"
            aria-label="Search documentation"
          />
          <div className="search-actions">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="filter-toggle"
              aria-label="Toggle filters"
            >
              🔍
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {suggestions.length > 0 && query.length >= 2 && (
          <div className="search-suggestions">
            {suggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleQueryChange(suggestion)}
                className="suggestion-item"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <SearchFilters
          facets={facets}
          filters={filters}
          onFiltersChange={handleFilterChange}
        />
      )}

      {/* Search Controls */}
      {results.length > 0 && (
        <div className="search-controls">
          <div className="results-info">
            Found {results.length} results
          </div>
          
          <div className="sort-controls">
            <label htmlFor="sort-by">Sort by:</label>
            <select
              id="sort-by"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
                handleSortChange(field, order)
              }}
            >
              <option value="relevance-desc">Relevance</option>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
            </select>
          </div>
        </div>
      )}

      {/* Search Results */}
      <div className="search-results">
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner" />
            <span>Searching...</span>
          </div>
        )}

        {!isLoading && results.length === 0 && query.length >= 2 && (
          <div className="no-results">
            <h3>No results found</h3>
            <p>Try adjusting your search terms or filters.</p>
          </div>
        )}

        {!isLoading && results.map((result) => (
          <SearchResultItem
            key={result.document.id}
            result={result}
            onSelect={onDocumentSelect}
          />
        ))}
      </div>

      {/* Pagination */}
      {results.length >= 10 && (
        <div className="pagination">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="pagination-button"
          >
            Previous
          </button>
          
          <span className="pagination-info">
            Page {currentPage}
          </span>
          
          <button
            type="button"
            disabled={results.length < 10}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="pagination-button"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

interface SearchFiltersProps {
  facets: ReturnType<DocumentSearchEngine['getFacets']>
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
}

const SearchFilters: React.FC<SearchFiltersProps> = ({
  facets,
  filters,
  onFiltersChange
}) => {
  const handleFilterToggle = (category: keyof SearchFilters, value: string) => {
    const newFilters = { ...filters }
    
    if (category === 'language') {
      newFilters.language = newFilters.language === value ? '' : value
    } else {
      const filterArray = newFilters[category] as string[]
      const index = filterArray.indexOf(value)
      
      if (index > -1) {
        filterArray.splice(index, 1)
      } else {
        filterArray.push(value)
      }
    }
    
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      types: [],
      categories: [],
      tags: [],
      language: '',
      difficulty: []
    })
  }

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : filter !== ''
  )

  return (
    <div className="search-filters">
      <div className="filters-header">
        <h4>Filters</h4>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="clear-filters"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Document Types */}
      {facets.types.length > 0 && (
        <div className="filter-group">
          <h5>Document Type</h5>
          {facets.types.map(({ value, count }) => (
            <label key={value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.types.includes(value)}
                onChange={() => handleFilterToggle('types', value)}
              />
              <span>{value} ({count})</span>
            </label>
          ))}
        </div>
      )}

      {/* Categories */}
      {facets.categories.length > 0 && (
        <div className="filter-group">
          <h5>Category</h5>
          {facets.categories.map(({ value, count }) => (
            <label key={value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.categories.includes(value)}
                onChange={() => handleFilterToggle('categories', value)}
              />
              <span>{value} ({count})</span>
            </label>
          ))}
        </div>
      )}

      {/* Languages */}
      {facets.languages.length > 1 && (
        <div className="filter-group">
          <h5>Language</h5>
          {facets.languages.map(({ value, count }) => (
            <label key={value} className="filter-option">
              <input
                type="radio"
                name="language"
                checked={filters.language === value}
                onChange={() => handleFilterToggle('language', value)}
              />
              <span>{value} ({count})</span>
            </label>
          ))}
        </div>
      )}

      {/* Popular Tags */}
      {facets.tags.slice(0, 10).length > 0 && (
        <div className="filter-group">
          <h5>Tags</h5>
          {facets.tags.slice(0, 10).map(({ value, count }) => (
            <label key={value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.tags.includes(value)}
                onChange={() => handleFilterToggle('tags', value)}
              />
              <span>{value} ({count})</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

interface SearchResultItemProps {
  result: SearchResult
  onSelect?: (document: SearchDocument) => void
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  onSelect
}) => {
  const { document, score, highlights } = result

  const handleClick = () => {
    if (onSelect) {
      onSelect(document)
    } else {
      // Default behavior: navigate to document
      window.location.href = document.url
    }
  }

  return (
    <div className="search-result-item" onClick={handleClick}>
      <div className="result-header">
        <h3 className="result-title">{document.title}</h3>
        <div className="result-meta">
          <span className="result-type">{document.type}</span>
          <span className="result-category">{document.category}</span>
          {document.metadata.difficulty && (
            <span className="result-difficulty">{document.metadata.difficulty}</span>
          )}
          <span className="result-score">Score: {score.toFixed(1)}</span>
        </div>
      </div>

      {highlights.length > 0 && (
        <div className="result-highlights">
          {highlights.slice(0, 2).map((highlight, index) => (
            <div
              key={index}
              className="highlight"
              dangerouslySetInnerHTML={{ __html: highlight }}
            />
          ))}
        </div>
      )}

      <div className="result-footer">
        {document.tags.slice(0, 5).map(tag => (
          <span key={tag} className="result-tag">{tag}</span>
        ))}
        
        <div className="result-info">
          <span className="result-language">{document.language}</span>
          <span className="result-date">
            {document.lastModified.toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

export default SearchUI