/**
 * Elasticsearch-powered Document Search Engine
 * High-performance search with Elasticsearch backend
 */

import { ElasticsearchClient, ElasticsearchConfig } from './elasticsearch-client'
import { SearchDocument, SearchQuery, SearchResult, FacetData } from './search-engine'

export interface ElasticsearchSearchEngineConfig {
  elasticsearch: ElasticsearchConfig
  fallbackToLocal?: boolean
  cacheResults?: boolean
  cacheTTL?: number
}

export class ElasticsearchSearchEngine {
  private esClient: ElasticsearchClient
  private config: ElasticsearchSearchEngineConfig
  private localFallbackEnabled: boolean
  private localDocuments: Map<string, SearchDocument> = new Map()
  private cache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map()

  constructor(config: ElasticsearchSearchEngineConfig) {
    this.config = {
      fallbackToLocal: true,
      cacheResults: true,
      cacheTTL: 300000, // 5 minutes
      ...config
    }
    
    this.esClient = new ElasticsearchClient(this.config.elasticsearch)
    this.localFallbackEnabled = this.config.fallbackToLocal!
  }

  /**
   * Initialize the search engine
   */
  async initialize(): Promise<void> {
    try {
      await this.esClient.initializeIndex()
      console.log('Elasticsearch search engine initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Elasticsearch:', error.message)
      
      if (!this.localFallbackEnabled) {
        throw error
      }
      
      console.warn('Falling back to local search mode')
    }
  }

  /**
   * Add document to search index
   */
  async addDocument(document: SearchDocument): Promise<void> {
    // Always maintain local copy for fallback
    if (this.localFallbackEnabled) {
      this.localDocuments.set(document.id, document)
    }

    try {
      await this.esClient.indexDocument(document)
      this.clearCache() // Clear cache when index changes
    } catch (error) {
      console.error(`Failed to index document ${document.id} in Elasticsearch:`, error.message)
      
      if (!this.localFallbackEnabled) {
        throw error
      }
    }
  }

  /**
   * Add multiple documents to search index
   */
  async addDocuments(documents: SearchDocument[]): Promise<void> {
    if (documents.length === 0) return

    // Always maintain local copy for fallback
    if (this.localFallbackEnabled) {
      for (const document of documents) {
        this.localDocuments.set(document.id, document)
      }
    }

    try {
      await this.esClient.bulkIndex(documents)
      this.clearCache()
      console.log(`Successfully indexed ${documents.length} documents`)
    } catch (error) {
      console.error('Failed to bulk index documents in Elasticsearch:', error.message)
      
      if (!this.localFallbackEnabled) {
        throw error
      }
    }
  }

  /**
   * Remove document from search index
   */
  async removeDocument(documentId: string): Promise<void> {
    if (this.localFallbackEnabled) {
      this.localDocuments.delete(documentId)
    }

    try {
      await this.esClient.deleteDocument(documentId)
      this.clearCache()
    } catch (error) {
      console.error(`Failed to delete document ${documentId} from Elasticsearch:`, error.message)
      
      if (!this.localFallbackEnabled) {
        throw error
      }
    }
  }

  /**
   * Update document in search index
   */
  async updateDocument(documentId: string, document: Partial<SearchDocument>): Promise<void> {
    if (this.localFallbackEnabled && document.id) {
      const existing = this.localDocuments.get(documentId)
      if (existing) {
        this.localDocuments.set(documentId, { ...existing, ...document as SearchDocument })
      }
    }

    try {
      await this.esClient.updateDocument(documentId, document)
      this.clearCache()
    } catch (error) {
      console.error(`Failed to update document ${documentId} in Elasticsearch:`, error.message)
      
      if (!this.localFallbackEnabled) {
        throw error
      }
    }
  }

  /**
   * Search documents
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    // Check cache first
    if (this.config.cacheResults) {
      const cacheKey = this.generateCacheKey(query)
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.config.cacheTTL!) {
        return cached.results
      }
    }

    try {
      const results = await this.esClient.search(query)
      
      // Cache results
      if (this.config.cacheResults) {
        const cacheKey = this.generateCacheKey(query)
        this.cache.set(cacheKey, {
          results,
          timestamp: Date.now()
        })
      }
      
      return results
    } catch (error) {
      console.error('Elasticsearch search failed:', error.message)
      
      if (this.localFallbackEnabled) {
        console.warn('Falling back to local search')
        return this.localSearch(query)
      }
      
      throw error
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(text: string, limit: number = 5): Promise<string[]> {
    try {
      return await this.esClient.getSuggestions(text, limit)
    } catch (error) {
      console.error('Failed to get suggestions from Elasticsearch:', error.message)
      
      if (this.localFallbackEnabled) {
        return this.getLocalSuggestions(text, limit)
      }
      
      return []
    }
  }

  /**
   * Get facets for filtering
   */
  async getFacets(): Promise<{
    types: FacetData[]
    categories: FacetData[]
    tags: FacetData[]
    languages: FacetData[]
  }> {
    try {
      return await this.esClient.getFacets()
    } catch (error) {
      console.error('Failed to get facets from Elasticsearch:', error.message)
      
      if (this.localFallbackEnabled) {
        return this.getLocalFacets()
      }
      
      return { types: [], categories: [], tags: [], languages: [] }
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<SearchDocument | null> {
    try {
      return await this.esClient.getDocument(documentId)
    } catch (error) {
      console.error(`Failed to get document ${documentId} from Elasticsearch:`, error.message)
      
      if (this.localFallbackEnabled) {
        return this.localDocuments.get(documentId) || null
      }
      
      return null
    }
  }

  /**
   * Clear all documents from index
   */
  async clearIndex(): Promise<void> {
    if (this.localFallbackEnabled) {
      this.localDocuments.clear()
    }

    try {
      await this.esClient.clearIndex()
      this.clearCache()
    } catch (error) {
      console.error('Failed to clear Elasticsearch index:', error.message)
      
      if (!this.localFallbackEnabled) {
        throw error
      }
    }
  }

  /**
   * Get search engine statistics
   */
  async getStats(): Promise<{
    documentCount: number
    indexSize: string
    health: string
    backend: 'elasticsearch' | 'local'
  }> {
    try {
      const stats = await this.esClient.getIndexStats()
      return {
        ...stats,
        backend: 'elasticsearch'
      }
    } catch (error) {
      console.error('Failed to get Elasticsearch stats:', error.message)
      
      if (this.localFallbackEnabled) {
        return {
          documentCount: this.localDocuments.size,
          indexSize: this.calculateLocalIndexSize(),
          health: 'local',
          backend: 'local'
        }
      }
      
      throw error
    }
  }

  /**
   * Health check for the search engine
   */
  async healthCheck(): Promise<{
    elasticsearch: boolean
    local: boolean
    overall: boolean
  }> {
    let esHealthy = false
    
    try {
      await this.esClient.getIndexStats()
      esHealthy = true
    } catch (error) {
      console.warn('Elasticsearch health check failed:', error.message)
    }

    const localHealthy = this.localFallbackEnabled && this.localDocuments.size >= 0
    const overall = esHealthy || (this.localFallbackEnabled && localHealthy)

    return {
      elasticsearch: esHealthy,
      local: localHealthy,
      overall
    }
  }

  /**
   * Reindex all documents (useful for mapping changes)
   */
  async reindexAll(): Promise<void> {
    if (this.localDocuments.size === 0) {
      console.warn('No documents available for reindexing')
      return
    }

    try {
      const documents = Array.from(this.localDocuments.values())
      await this.esClient.clearIndex()
      await this.esClient.bulkIndex(documents)
      this.clearCache()
      console.log(`Reindexed ${documents.length} documents`)
    } catch (error) {
      console.error('Failed to reindex documents:', error.message)
      throw error
    }
  }

  /**
   * Generate cache key from search query
   */
  private generateCacheKey(query: SearchQuery): string {
    return JSON.stringify(query)
  }

  /**
   * Clear result cache
   */
  private clearCache(): void {
    this.cache.clear()
  }

  /**
   * Local fallback search implementation
   */
  private localSearch(query: SearchQuery): SearchResult[] {
    const results: SearchResult[] = []
    const searchTerms = this.tokenizeQuery(query.query)
    
    if (searchTerms.length === 0) {
      return []
    }

    for (const document of this.localDocuments.values()) {
      // Apply filters
      if (!this.documentMatchesFilters(document, query.filters)) {
        continue
      }

      const score = this.calculateLocalScore(document, searchTerms, query.query)
      
      if (score > 0) {
        results.push({
          document,
          score,
          highlights: this.generateLocalHighlights(document, query.query),
          matchedFields: this.getLocalMatchedFields(document, searchTerms)
        })
      }
    }

    // Sort and paginate
    results.sort((a, b) => b.score - a.score)
    
    if (query.pagination) {
      const start = (query.pagination.page - 1) * query.pagination.size
      const end = start + query.pagination.size
      return results.slice(start, end)
    }
    
    return results.slice(0, 20) // Default limit
  }

  /**
   * Get local suggestions fallback
   */
  private getLocalSuggestions(text: string, limit: number): string[] {
    const suggestions: string[] = []
    const normalizedQuery = text.toLowerCase()
    
    for (const document of this.localDocuments.values()) {
      if (document.title.toLowerCase().includes(normalizedQuery)) {
        suggestions.push(document.title)
      }
      
      for (const tag of document.tags) {
        if (tag.toLowerCase().includes(normalizedQuery)) {
          suggestions.push(tag)
        }
      }
    }
    
    return Array.from(new Set(suggestions)).slice(0, limit)
  }

  /**
   * Get local facets fallback
   */
  private getLocalFacets(): {
    types: FacetData[]
    categories: FacetData[]
    tags: FacetData[]
    languages: FacetData[]
  } {
    const facets = {
      types: new Map<string, number>(),
      categories: new Map<string, number>(),
      tags: new Map<string, number>(),
      languages: new Map<string, number>()
    }
    
    for (const document of this.localDocuments.values()) {
      facets.types.set(document.type, (facets.types.get(document.type) || 0) + 1)
      facets.categories.set(document.category, (facets.categories.get(document.category) || 0) + 1)
      facets.languages.set(document.language, (facets.languages.get(document.language) || 0) + 1)
      
      for (const tag of document.tags) {
        facets.tags.set(tag, (facets.tags.get(tag) || 0) + 1)
      }
    }
    
    return {
      types: Array.from(facets.types.entries()).map(([value, count]) => ({ value, count })),
      categories: Array.from(facets.categories.entries()).map(([value, count]) => ({ value, count })),
      tags: Array.from(facets.tags.entries()).map(([value, count]) => ({ value, count })),
      languages: Array.from(facets.languages.entries()).map(([value, count]) => ({ value, count }))
    }
  }

  /**
   * Simple local scoring algorithm
   */
  private calculateLocalScore(document: SearchDocument, terms: string[], originalQuery: string): number {
    let score = 0
    const titleLower = document.title.toLowerCase()
    const contentLower = document.content.toLowerCase()
    const excerptLower = document.excerpt.toLowerCase()
    const queryLower = originalQuery.toLowerCase()

    // Exact phrase match in title (highest score)
    if (titleLower.includes(queryLower)) {
      score += 100
    }

    // Exact phrase match in excerpt
    if (excerptLower.includes(queryLower)) {
      score += 50
    }

    // Exact phrase match in content
    if (contentLower.includes(queryLower)) {
      score += 30
    }

    // Individual term matches
    for (const term of terms) {
      if (titleLower.includes(term)) score += 10
      if (excerptLower.includes(term)) score += 5
      if (contentLower.includes(term)) score += 2
      
      // Tag matches
      if (document.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += 8
      }
    }

    return score
  }

  /**
   * Check if document matches filters
   */
  private documentMatchesFilters(document: SearchDocument, filters?: SearchQuery['filters']): boolean {
    if (!filters) return true

    if (filters.type && !filters.type.includes(document.type)) return false
    if (filters.category && !filters.category.includes(document.category)) return false
    if (filters.language && document.language !== filters.language) return false
    
    if (filters.difficulty && document.metadata.difficulty) {
      if (!filters.difficulty.includes(document.metadata.difficulty)) return false
    }
    
    if (filters.tags) {
      const hasMatchingTag = filters.tags.some(tag => document.tags.includes(tag))
      if (!hasMatchingTag) return false
    }

    return true
  }

  /**
   * Generate highlights for local search
   */
  private generateLocalHighlights(document: SearchDocument, query: string): string[] {
    const highlights: string[] = []
    const queryTerms = query.toLowerCase().split(/\s+/)
    
    // Check excerpt first
    const excerptLower = document.excerpt.toLowerCase()
    if (queryTerms.some(term => excerptLower.includes(term))) {
      let highlighted = document.excerpt
      for (const term of queryTerms) {
        const regex = new RegExp(`(${term})`, 'gi')
        highlighted = highlighted.replace(regex, '<mark>$1</mark>')
      }
      highlights.push(highlighted)
    }
    
    // Then check content sentences
    const sentences = document.content.split(/[.!?]+/)
    for (const sentence of sentences) {
      const sentenceLower = sentence.toLowerCase()
      
      if (queryTerms.some(term => sentenceLower.includes(term)) && highlights.length < 3) {
        let highlighted = sentence.trim()
        for (const term of queryTerms) {
          const regex = new RegExp(`(${term})`, 'gi')
          highlighted = highlighted.replace(regex, '<mark>$1</mark>')
        }
        highlights.push(highlighted)
      }
    }
    
    return highlights
  }

  /**
   * Get matched fields for local search
   */
  private getLocalMatchedFields(document: SearchDocument, terms: string[]): string[] {
    const fields: string[] = []
    
    for (const term of terms) {
      if (document.title.toLowerCase().includes(term)) fields.push('title')
      if (document.content.toLowerCase().includes(term)) fields.push('content')
      if (document.excerpt.toLowerCase().includes(term)) fields.push('excerpt')
      if (document.tags.some(tag => tag.toLowerCase().includes(term))) fields.push('tags')
    }
    
    return Array.from(new Set(fields))
  }

  /**
   * Tokenize query for local search
   */
  private tokenizeQuery(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2)
  }

  /**
   * Calculate local index size estimate
   */
  private calculateLocalIndexSize(): string {
    let totalSize = 0
    
    for (const document of this.localDocuments.values()) {
      totalSize += JSON.stringify(document).length
    }
    
    const units = ['B', 'KB', 'MB', 'GB']
    let size = totalSize
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
}