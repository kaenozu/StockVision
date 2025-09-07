/**
 * Elasticsearch Client for Documentation Search
 * High-performance search engine integration
 */

import { SearchDocument, SearchQuery, SearchResult, FacetData } from './search-engine'

export interface ElasticsearchConfig {
  endpoint: string
  username?: string
  password?: string
  apiKey?: string
  cloudId?: string
  index: string
  version?: string
  timeout?: number
  maxRetries?: number
  ssl?: {
    ca?: string
    cert?: string
    key?: string
    rejectUnauthorized?: boolean
  }
}

export interface ElasticsearchDocument {
  id: string
  title: string
  content: string
  excerpt: string
  type: string
  category: string
  tags: string[]
  url: string
  language: string
  lastModified: string
  metadata: {
    difficulty?: string
    readingTime?: number
    author?: string
    version?: string
  }
  vector?: number[] // For semantic search
}

export interface SearchResponse {
  took: number
  timed_out: boolean
  _shards: {
    total: number
    successful: number
    skipped: number
    failed: number
  }
  hits: {
    total: {
      value: number
      relation: string
    }
    max_score: number
    hits: Array<{
      _index: string
      _type: string
      _id: string
      _score: number
      _source: ElasticsearchDocument
      highlight?: Record<string, string[]>
    }>
  }
  aggregations?: Record<string, any>
}

export class ElasticsearchClient {
  private config: ElasticsearchConfig
  private baseUrl: string

  constructor(config: ElasticsearchConfig) {
    this.config = {
      version: '8.0',
      timeout: 30000,
      maxRetries: 3,
      ...config
    }
    
    this.baseUrl = this.config.cloudId 
      ? `https://${this.config.cloudId}.es.${this.getCloudRegion()}.aws.cloud.es.io`
      : this.config.endpoint
  }

  /**
   * Initialize index with mapping
   */
  async initializeIndex(): Promise<void> {
    const mapping = {
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: { 
            type: 'text',
            analyzer: 'standard',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'completion' }
            }
          },
          content: { 
            type: 'text',
            analyzer: 'standard',
            term_vector: 'with_positions_offsets'
          },
          excerpt: { type: 'text', analyzer: 'standard' },
          type: { type: 'keyword' },
          category: { type: 'keyword' },
          tags: { type: 'keyword' },
          url: { type: 'keyword' },
          language: { type: 'keyword' },
          lastModified: { type: 'date' },
          'metadata.difficulty': { type: 'keyword' },
          'metadata.readingTime': { type: 'integer' },
          'metadata.author': { type: 'keyword' },
          'metadata.version': { type: 'keyword' },
          vector: { 
            type: 'dense_vector',
            dims: 768, // For BERT embeddings
            similarity: 'cosine'
          }
        }
      },
      settings: {
        analysis: {
          analyzer: {
            custom_text_analyzer: {
              tokenizer: 'standard',
              filter: ['lowercase', 'stop', 'stemmer']
            }
          }
        },
        'index.max_result_window': 50000
      }
    }

    try {
      const exists = await this.indexExists()
      if (!exists) {
        await this.request('PUT', `/${this.config.index}`, mapping)
      }
    } catch (error) {
      throw new Error(`Failed to initialize index: ${error.message}`)
    }
  }

  /**
   * Check if index exists
   */
  async indexExists(): Promise<boolean> {
    try {
      await this.request('HEAD', `/${this.config.index}`)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Index a single document
   */
  async indexDocument(document: SearchDocument): Promise<void> {
    const esDoc: ElasticsearchDocument = {
      id: document.id,
      title: document.title,
      content: document.content,
      excerpt: document.excerpt,
      type: document.type,
      category: document.category,
      tags: document.tags,
      url: document.url,
      language: document.language,
      lastModified: document.lastModified.toISOString(),
      metadata: document.metadata
    }

    try {
      await this.request('PUT', `/${this.config.index}/_doc/${document.id}`, esDoc)
    } catch (error) {
      throw new Error(`Failed to index document ${document.id}: ${error.message}`)
    }
  }

  /**
   * Bulk index multiple documents
   */
  async bulkIndex(documents: SearchDocument[]): Promise<void> {
    if (documents.length === 0) return

    const body: string[] = []
    
    for (const document of documents) {
      const esDoc: ElasticsearchDocument = {
        id: document.id,
        title: document.title,
        content: document.content,
        excerpt: document.excerpt,
        type: document.type,
        category: document.category,
        tags: document.tags,
        url: document.url,
        language: document.language,
        lastModified: document.lastModified.toISOString(),
        metadata: document.metadata
      }

      body.push(JSON.stringify({ index: { _index: this.config.index, _id: document.id } }))
      body.push(JSON.stringify(esDoc))
    }

    try {
      const response = await this.request('POST', '/_bulk', body.join('\n') + '\n', {
        'Content-Type': 'application/x-ndjson'
      })

      if (response.errors) {
        const errors = response.items
          .filter((item: any) => item.index?.error)
          .map((item: any) => item.index.error)
        
        throw new Error(`Bulk indexing errors: ${JSON.stringify(errors)}`)
      }
    } catch (error) {
      throw new Error(`Failed to bulk index documents: ${error.message}`)
    }
  }

  /**
   * Search documents
   */
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const searchBody = this.buildSearchQuery(query)
    
    try {
      const response: SearchResponse = await this.request('POST', `/${this.config.index}/_search`, searchBody)
      return this.parseSearchResponse(response)
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`)
    }
  }

  /**
   * Get suggestions for autocomplete
   */
  async getSuggestions(text: string, size: number = 5): Promise<string[]> {
    const suggestBody = {
      suggest: {
        title_suggest: {
          prefix: text,
          completion: {
            field: 'title.suggest',
            size,
            skip_duplicates: true
          }
        }
      }
    }

    try {
      const response = await this.request('POST', `/${this.config.index}/_search`, suggestBody)
      const suggestions = response.suggest?.title_suggest?.[0]?.options || []
      return suggestions.map((option: any) => option.text)
    } catch (error) {
      console.warn('Failed to get suggestions:', error.message)
      return []
    }
  }

  /**
   * Get faceted search data
   */
  async getFacets(): Promise<{
    types: FacetData[]
    categories: FacetData[]
    tags: FacetData[]
    languages: FacetData[]
  }> {
    const facetQuery = {
      size: 0,
      aggs: {
        types: {
          terms: { field: 'type', size: 20 }
        },
        categories: {
          terms: { field: 'category', size: 20 }
        },
        tags: {
          terms: { field: 'tags', size: 50 }
        },
        languages: {
          terms: { field: 'language', size: 10 }
        }
      }
    }

    try {
      const response = await this.request('POST', `/${this.config.index}/_search`, facetQuery)
      const aggs = response.aggregations

      return {
        types: this.parseFacetBuckets(aggs.types),
        categories: this.parseFacetBuckets(aggs.categories),
        tags: this.parseFacetBuckets(aggs.tags),
        languages: this.parseFacetBuckets(aggs.languages)
      }
    } catch (error) {
      console.warn('Failed to get facets:', error.message)
      return { types: [], categories: [], tags: [], languages: [] }
    }
  }

  /**
   * Delete document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    try {
      await this.request('DELETE', `/${this.config.index}/_doc/${id}`)
    } catch (error) {
      throw new Error(`Failed to delete document ${id}: ${error.message}`)
    }
  }

  /**
   * Update document
   */
  async updateDocument(id: string, document: Partial<SearchDocument>): Promise<void> {
    const updateBody = {
      doc: {
        ...document,
        lastModified: document.lastModified?.toISOString() || new Date().toISOString()
      }
    }

    try {
      await this.request('POST', `/${this.config.index}/_update/${id}`, updateBody)
    } catch (error) {
      throw new Error(`Failed to update document ${id}: ${error.message}`)
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<SearchDocument | null> {
    try {
      const response = await this.request('GET', `/${this.config.index}/_doc/${id}`)
      
      if (!response.found) {
        return null
      }

      const esDoc = response._source as ElasticsearchDocument
      return {
        id: esDoc.id,
        title: esDoc.title,
        content: esDoc.content,
        excerpt: esDoc.excerpt,
        type: esDoc.type,
        category: esDoc.category,
        tags: esDoc.tags,
        url: esDoc.url,
        language: esDoc.language,
        lastModified: new Date(esDoc.lastModified),
        metadata: esDoc.metadata
      }
    } catch (error) {
      throw new Error(`Failed to get document ${id}: ${error.message}`)
    }
  }

  /**
   * Clear all documents from index
   */
  async clearIndex(): Promise<void> {
    try {
      await this.request('POST', `/${this.config.index}/_delete_by_query`, {
        query: { match_all: {} }
      })
    } catch (error) {
      throw new Error(`Failed to clear index: ${error.message}`)
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<{
    documentCount: number
    indexSize: string
    health: string
  }> {
    try {
      const [stats, health] = await Promise.all([
        this.request('GET', `/${this.config.index}/_stats`),
        this.request('GET', `/_cluster/health/${this.config.index}`)
      ])

      return {
        documentCount: stats.indices[this.config.index].total.docs.count,
        indexSize: this.formatBytes(stats.indices[this.config.index].total.store.size_in_bytes),
        health: health.status
      }
    } catch (error) {
      throw new Error(`Failed to get index stats: ${error.message}`)
    }
  }

  /**
   * Build Elasticsearch query from SearchQuery
   */
  private buildSearchQuery(query: SearchQuery): any {
    const searchBody: any = {
      from: ((query.pagination?.page || 1) - 1) * (query.pagination?.size || 10),
      size: query.pagination?.size || 10,
      query: {
        bool: {
          must: [],
          filter: []
        }
      },
      highlight: {
        fields: {
          title: {},
          content: {},
          excerpt: {}
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      }
    }

    // Main search query
    if (query.query.trim()) {
      searchBody.query.bool.must.push({
        multi_match: {
          query: query.query,
          fields: [
            'title^3',
            'content^1',
            'excerpt^2',
            'tags^2'
          ],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      })
    } else {
      searchBody.query.bool.must.push({ match_all: {} })
    }

    // Apply filters
    if (query.filters) {
      if (query.filters.type?.length) {
        searchBody.query.bool.filter.push({
          terms: { type: query.filters.type }
        })
      }

      if (query.filters.category?.length) {
        searchBody.query.bool.filter.push({
          terms: { category: query.filters.category }
        })
      }

      if (query.filters.tags?.length) {
        searchBody.query.bool.filter.push({
          terms: { tags: query.filters.tags }
        })
      }

      if (query.filters.language) {
        searchBody.query.bool.filter.push({
          term: { language: query.filters.language }
        })
      }

      if (query.filters.difficulty?.length) {
        searchBody.query.bool.filter.push({
          terms: { 'metadata.difficulty': query.filters.difficulty }
        })
      }
    }

    // Apply sorting
    if (query.sorting) {
      const sortField = query.sorting.field
      const sortOrder = query.sorting.order

      if (sortField === 'relevance') {
        searchBody.sort = [{ _score: { order: sortOrder } }]
      } else if (sortField === 'date') {
        searchBody.sort = [{ lastModified: { order: sortOrder } }]
      } else if (sortField === 'title') {
        searchBody.sort = [{ 'title.keyword': { order: sortOrder } }]
      }
    }

    return searchBody
  }

  /**
   * Parse Elasticsearch search response
   */
  private parseSearchResponse(response: SearchResponse): SearchResult[] {
    return response.hits.hits.map(hit => {
      const document: SearchDocument = {
        id: hit._source.id,
        title: hit._source.title,
        content: hit._source.content,
        excerpt: hit._source.excerpt,
        type: hit._source.type,
        category: hit._source.category,
        tags: hit._source.tags,
        url: hit._source.url,
        language: hit._source.language,
        lastModified: new Date(hit._source.lastModified),
        metadata: hit._source.metadata
      }

      const highlights: string[] = []
      if (hit.highlight) {
        Object.values(hit.highlight).forEach(highlightArray => {
          highlights.push(...highlightArray)
        })
      }

      return {
        document,
        score: hit._score,
        highlights
      }
    })
  }

  /**
   * Parse facet buckets from aggregation response
   */
  private parseFacetBuckets(aggregation: any): FacetData[] {
    if (!aggregation || !aggregation.buckets) return []
    
    return aggregation.buckets.map((bucket: any) => ({
      value: bucket.key,
      count: bucket.doc_count
    }))
  }

  /**
   * Make HTTP request to Elasticsearch
   */
  private async request(
    method: string,
    path: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`
    
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    }

    // Add authentication
    if (this.config.apiKey) {
      requestHeaders['Authorization'] = `ApiKey ${this.config.apiKey}`
    } else if (this.config.username && this.config.password) {
      const credentials = btoa(`${this.config.username}:${this.config.password}`)
      requestHeaders['Authorization'] = `Basic ${credentials}`
    }

    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders
    }

    if (body && method !== 'HEAD') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    let lastError: Error
    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        if (method === 'HEAD') {
          return {}
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.maxRetries! - 1) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError!
  }

  /**
   * Get cloud region from cloud ID
   */
  private getCloudRegion(): string {
    // Parse cloud region from cloudId if needed
    // This is a simplified implementation
    return 'us-east-1'
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}