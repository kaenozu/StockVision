/**
 * Documentation Search Engine
 * Full-text search functionality for documentation
 */

export interface SearchDocument {
  id: string
  title: string
  content: string
  url: string
  type: 'documentation' | 'api' | 'tutorial' | 'example'
  category: string
  tags: string[]
  language: string
  lastModified: Date
  metadata: {
    author?: string
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    readingTime?: number
    version?: string
  }
}

export interface SearchResult {
  document: SearchDocument
  score: number
  highlights: string[]
  matchedFields: string[]
}

export interface SearchQuery {
  query: string
  filters?: {
    type?: string[]
    category?: string[]
    tags?: string[]
    language?: string
    difficulty?: string[]
  }
  sorting?: {
    field: 'relevance' | 'date' | 'title'
    order: 'asc' | 'desc'
  }
  pagination?: {
    page: number
    size: number
  }
}

export interface SearchIndex {
  documents: Map<string, SearchDocument>
  termIndex: Map<string, Set<string>>
  titleIndex: Map<string, Set<string>>
  tagIndex: Map<string, Set<string>>
  categoryIndex: Map<string, Set<string>>
}

export class DocumentSearchEngine {
  private index: SearchIndex
  private stopWords: Set<string>
  private stemmer: Stemmer

  constructor() {
    this.index = {
      documents: new Map(),
      termIndex: new Map(),
      titleIndex: new Map(),
      tagIndex: new Map(),
      categoryIndex: new Map()
    }
    
    this.stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for',
      'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on',
      'that', 'the', 'to', 'was', 'will', 'with', 'the', 'this'
    ])
    
    this.stemmer = new Stemmer()
  }

  /**
   * Add document to search index
   */
  addDocument(document: SearchDocument): void {
    this.index.documents.set(document.id, document)
    
    // Index content terms
    const contentTerms = this.tokenize(document.content)
    for (const term of contentTerms) {
      if (!this.index.termIndex.has(term)) {
        this.index.termIndex.set(term, new Set())
      }
      this.index.termIndex.get(term)!.add(document.id)
    }
    
    // Index title terms
    const titleTerms = this.tokenize(document.title)
    for (const term of titleTerms) {
      if (!this.index.titleIndex.has(term)) {
        this.index.titleIndex.set(term, new Set())
      }
      this.index.titleIndex.get(term)!.add(document.id)
    }
    
    // Index tags
    for (const tag of document.tags) {
      const tagKey = tag.toLowerCase()
      if (!this.index.tagIndex.has(tagKey)) {
        this.index.tagIndex.set(tagKey, new Set())
      }
      this.index.tagIndex.get(tagKey)!.add(document.id)
    }
    
    // Index category
    const categoryKey = document.category.toLowerCase()
    if (!this.index.categoryIndex.has(categoryKey)) {
      this.index.categoryIndex.set(categoryKey, new Set())
    }
    this.index.categoryIndex.get(categoryKey)!.add(document.id)
  }

  /**
   * Remove document from search index
   */
  removeDocument(documentId: string): void {
    const document = this.index.documents.get(documentId)
    if (!document) return

    // Remove from documents
    this.index.documents.delete(documentId)
    
    // Remove from term index
    for (const [term, docIds] of this.index.termIndex) {
      docIds.delete(documentId)
      if (docIds.size === 0) {
        this.index.termIndex.delete(term)
      }
    }
    
    // Remove from title index
    for (const [term, docIds] of this.index.titleIndex) {
      docIds.delete(documentId)
      if (docIds.size === 0) {
        this.index.titleIndex.delete(term)
      }
    }
    
    // Remove from tag index
    for (const [tag, docIds] of this.index.tagIndex) {
      docIds.delete(documentId)
      if (docIds.size === 0) {
        this.index.tagIndex.delete(tag)
      }
    }
    
    // Remove from category index
    for (const [category, docIds] of this.index.categoryIndex) {
      docIds.delete(documentId)
      if (docIds.size === 0) {
        this.index.categoryIndex.delete(category)
      }
    }
  }

  /**
   * Search documents
   */
  search(query: SearchQuery): SearchResult[] {
    const searchTerms = this.tokenize(query.query)
    
    if (searchTerms.length === 0) {
      return []
    }
    
    // Find candidate documents
    const candidates = this.findCandidates(searchTerms)
    
    // Apply filters
    const filtered = this.applyFilters(candidates, query.filters)
    
    // Score and rank documents
    const scored = this.scoreDocuments(filtered, searchTerms, query.query)
    
    // Sort results
    const sorted = this.sortResults(scored, query.sorting)
    
    // Apply pagination
    const paginated = this.paginateResults(sorted, query.pagination)
    
    return paginated
  }

  /**
   * Get search suggestions
   */
  getSuggestions(partialQuery: string, limit: number = 10): string[] {
    const suggestions: string[] = []
    const normalizedQuery = partialQuery.toLowerCase()
    
    // Search in titles
    for (const document of this.index.documents.values()) {
      if (document.title.toLowerCase().includes(normalizedQuery)) {
        suggestions.push(document.title)
      }
    }
    
    // Search in tags
    for (const tag of this.index.tagIndex.keys()) {
      if (tag.includes(normalizedQuery)) {
        suggestions.push(tag)
      }
    }
    
    // Search in categories
    for (const category of this.index.categoryIndex.keys()) {
      if (category.includes(normalizedQuery)) {
        suggestions.push(category)
      }
    }
    
    return Array.from(new Set(suggestions)).slice(0, limit)
  }

  /**
   * Get facets for filters
   */
  getFacets(): {
    types: Array<{ value: string; count: number }>
    categories: Array<{ value: string; count: number }>
    tags: Array<{ value: string; count: number }>
    languages: Array<{ value: string; count: number }>
  } {
    const facets = {
      types: new Map<string, number>(),
      categories: new Map<string, number>(),
      tags: new Map<string, number>(),
      languages: new Map<string, number>()
    }
    
    for (const document of this.index.documents.values()) {
      // Count types
      facets.types.set(document.type, (facets.types.get(document.type) || 0) + 1)
      
      // Count categories
      facets.categories.set(document.category, (facets.categories.get(document.category) || 0) + 1)
      
      // Count tags
      for (const tag of document.tags) {
        facets.tags.set(tag, (facets.tags.get(tag) || 0) + 1)
      }
      
      // Count languages
      facets.languages.set(document.language, (facets.languages.get(document.language) || 0) + 1)
    }
    
    return {
      types: Array.from(facets.types.entries()).map(([value, count]) => ({ value, count })),
      categories: Array.from(facets.categories.entries()).map(([value, count]) => ({ value, count })),
      tags: Array.from(facets.tags.entries()).map(([value, count]) => ({ value, count })),
      languages: Array.from(facets.languages.entries()).map(([value, count]) => ({ value, count }))
    }
  }

  /**
   * Tokenize text into searchable terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2 && !this.stopWords.has(term))
      .map(term => this.stemmer.stem(term))
  }

  /**
   * Find candidate documents based on search terms
   */
  private findCandidates(terms: string[]): Set<string> {
    const candidates = new Set<string>()
    
    for (const term of terms) {
      // Search in content
      const contentMatches = this.index.termIndex.get(term) || new Set()
      for (const docId of contentMatches) {
        candidates.add(docId)
      }
      
      // Search in titles (with higher weight)
      const titleMatches = this.index.titleIndex.get(term) || new Set()
      for (const docId of titleMatches) {
        candidates.add(docId)
      }
      
      // Fuzzy matching for partial terms
      for (const [indexTerm, docIds] of this.index.termIndex) {
        if (this.calculateLevenshteinDistance(term, indexTerm) <= 2) {
          for (const docId of docIds) {
            candidates.add(docId)
          }
        }
      }
    }
    
    return candidates
  }

  /**
   * Apply filters to candidate documents
   */
  private applyFilters(candidates: Set<string>, filters?: SearchQuery['filters']): Set<string> {
    if (!filters) return candidates

    const filtered = new Set<string>()
    
    for (const docId of candidates) {
      const document = this.index.documents.get(docId)
      if (!document) continue
      
      // Filter by type
      if (filters.type && !filters.type.includes(document.type)) {
        continue
      }
      
      // Filter by category
      if (filters.category && !filters.category.includes(document.category)) {
        continue
      }
      
      // Filter by tags
      if (filters.tags) {
        const hasMatchingTag = filters.tags.some(tag => 
          document.tags.includes(tag)
        )
        if (!hasMatchingTag) continue
      }
      
      // Filter by language
      if (filters.language && document.language !== filters.language) {
        continue
      }
      
      // Filter by difficulty
      if (filters.difficulty && document.metadata.difficulty) {
        if (!filters.difficulty.includes(document.metadata.difficulty)) {
          continue
        }
      }
      
      filtered.add(docId)
    }
    
    return filtered
  }

  /**
   * Score documents based on relevance
   */
  private scoreDocuments(
    candidates: Set<string>, 
    terms: string[], 
    originalQuery: string
  ): SearchResult[] {
    const results: SearchResult[] = []
    
    for (const docId of candidates) {
      const document = this.index.documents.get(docId)
      if (!document) continue
      
      const score = this.calculateScore(document, terms, originalQuery)
      const highlights = this.generateHighlights(document, originalQuery)
      const matchedFields = this.getMatchedFields(document, terms)
      
      results.push({
        document,
        score,
        highlights,
        matchedFields
      })
    }
    
    return results
  }

  /**
   * Calculate relevance score for a document
   */
  private calculateScore(
    document: SearchDocument, 
    terms: string[], 
    originalQuery: string
  ): number {
    let score = 0
    
    // Title matches get higher score
    const titleTerms = this.tokenize(document.title)
    for (const term of terms) {
      if (titleTerms.includes(term)) {
        score += 10
      }
    }
    
    // Exact phrase matches
    if (document.content.toLowerCase().includes(originalQuery.toLowerCase())) {
      score += 15
    }
    
    // Content term frequency
    const contentTerms = this.tokenize(document.content)
    for (const term of terms) {
      const frequency = contentTerms.filter(t => t === term).length
      score += frequency * 2
    }
    
    // Tag matches
    for (const term of terms) {
      if (document.tags.some(tag => tag.toLowerCase().includes(term))) {
        score += 5
      }
    }
    
    // Boost based on document type
    switch (document.type) {
      case 'documentation':
        score *= 1.2
        break
      case 'tutorial':
        score *= 1.1
        break
      case 'api':
        score *= 1.0
        break
      case 'example':
        score *= 0.9
        break
    }
    
    // Recency boost (newer documents get slight preference)
    const daysSinceModified = (Date.now() - document.lastModified.getTime()) / (1000 * 60 * 60 * 24)
    const recencyBoost = Math.max(0, 1 - daysSinceModified / 365) * 2
    score += recencyBoost
    
    return score
  }

  /**
   * Generate highlights for search results
   */
  private generateHighlights(document: SearchDocument, query: string): string[] {
    const highlights: string[] = []
    const queryTerms = query.toLowerCase().split(/\s+/)
    
    // Search in content
    const sentences = document.content.split(/[.!?]+/)
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase()
      
      if (queryTerms.some(term => lowerSentence.includes(term))) {
        let highlighted = sentence.trim()
        
        // Highlight matching terms
        for (const term of queryTerms) {
          const regex = new RegExp(`(${term})`, 'gi')
          highlighted = highlighted.replace(regex, '<mark>$1</mark>')
        }
        
        highlights.push(highlighted)
        
        if (highlights.length >= 3) break
      }
    }
    
    return highlights
  }

  /**
   * Get matched fields for a document
   */
  private getMatchedFields(document: SearchDocument, terms: string[]): string[] {
    const fields: string[] = []
    
    const titleTerms = this.tokenize(document.title)
    const contentTerms = this.tokenize(document.content)
    
    for (const term of terms) {
      if (titleTerms.includes(term)) {
        fields.push('title')
      }
      if (contentTerms.includes(term)) {
        fields.push('content')
      }
      if (document.tags.some(tag => tag.toLowerCase().includes(term))) {
        fields.push('tags')
      }
    }
    
    return Array.from(new Set(fields))
  }

  /**
   * Sort search results
   */
  private sortResults(
    results: SearchResult[], 
    sorting?: SearchQuery['sorting']
  ): SearchResult[] {
    if (!sorting || sorting.field === 'relevance') {
      return results.sort((a, b) => b.score - a.score)
    }
    
    return results.sort((a, b) => {
      let compareValue = 0
      
      switch (sorting.field) {
        case 'date':
          compareValue = a.document.lastModified.getTime() - b.document.lastModified.getTime()
          break
        case 'title':
          compareValue = a.document.title.localeCompare(b.document.title)
          break
        default:
          compareValue = b.score - a.score
      }
      
      return sorting.order === 'desc' ? -compareValue : compareValue
    })
  }

  /**
   * Paginate search results
   */
  private paginateResults(
    results: SearchResult[], 
    pagination?: SearchQuery['pagination']
  ): SearchResult[] {
    if (!pagination) return results.slice(0, 20) // Default limit
    
    const start = (pagination.page - 1) * pagination.size
    const end = start + pagination.size
    
    return results.slice(start, end)
  }

  /**
   * Calculate Levenshtein distance for fuzzy matching
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  /**
   * Export search index for persistence
   */
  exportIndex(): any {
    return {
      documents: Array.from(this.index.documents.entries()),
      termIndex: Array.from(this.index.termIndex.entries()).map(([term, docs]) => [term, Array.from(docs)]),
      titleIndex: Array.from(this.index.titleIndex.entries()).map(([term, docs]) => [term, Array.from(docs)]),
      tagIndex: Array.from(this.index.tagIndex.entries()).map(([tag, docs]) => [tag, Array.from(docs)]),
      categoryIndex: Array.from(this.index.categoryIndex.entries()).map(([cat, docs]) => [cat, Array.from(docs)])
    }
  }

  /**
   * Import search index from persistence
   */
  importIndex(data: any): void {
    this.index.documents = new Map(data.documents)
    this.index.termIndex = new Map(data.termIndex.map(([term, docs]: [string, string[]]) => [term, new Set(docs)]))
    this.index.titleIndex = new Map(data.titleIndex.map(([term, docs]: [string, string[]]) => [term, new Set(docs)]))
    this.index.tagIndex = new Map(data.tagIndex.map(([tag, docs]: [string, string[]]) => [tag, new Set(docs)]))
    this.index.categoryIndex = new Map(data.categoryIndex.map(([cat, docs]: [string, string[]]) => [cat, new Set(docs)]))
  }
}

/**
 * Simple stemmer implementation
 */
class Stemmer {
  private suffixes = [
    'ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness', 'ment'
  ]

  stem(word: string): string {
    if (word.length <= 3) return word
    
    for (const suffix of this.suffixes) {
      if (word.endsWith(suffix)) {
        const stem = word.slice(0, -suffix.length)
        if (stem.length >= 3) {
          return stem
        }
      }
    }
    
    return word
  }
}