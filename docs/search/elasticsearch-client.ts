/**
 * Elasticsearch Client
 * Provides methods to interact with Elasticsearch for indexing and searching documents
 */

import { Client } from '@elastic/elasticsearch'
import { documentationIndexConfig } from './elasticsearch-config'
import { SearchDocument } from './search-engine'

export class ElasticsearchClient {
  private client: Client
  private indexName: string

  constructor(node: string, indexName: string) {
    this.client = new Client({ node })
    this.indexName = indexName
  }

  /**
   * Create index with Japanese analyzer settings
   */
  async createIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: this.indexName })
      
      if (!indexExists) {
        await this.client.indices.create({
          index: this.indexName,
          body: documentationIndexConfig
        })
        console.log(`✅ Created index: ${this.indexName}`)
      } else {
        console.log(`ℹ️  Index already exists: ${this.indexName}`)
      }
    } catch (error) {
      console.error('Failed to create index:', error)
      throw error
    }
  }

  /**
   * Delete index
   */
  async deleteIndex(): Promise<void> {
    try {
      const indexExists = await this.client.indices.exists({ index: this.indexName })
      
      if (indexExists) {
        await this.client.indices.delete({ index: this.indexName })
        console.log(`🗑️  Deleted index: ${this.indexName}`)
      } else {
        console.log(`ℹ️  Index does not exist: ${this.indexName}`)
      }
    } catch (error) {
      console.error('Failed to delete index:', error)
      throw error
    }
  }

  /**
   * Index a document
   */
  async indexDocument(document: SearchDocument): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: document.id,
        document: {
          ...document,
          lastModified: document.lastModified.toISOString()
        }
      })
      console.log(`📄 Indexed document: ${document.id}`)
    } catch (error) {
      console.error(`Failed to index document ${document.id}:`, error)
      throw error
    }
  }

  /**
   * Remove a document from index
   */
  async removeDocument(documentId: string): Promise<void> {
    try {
      await this.client.delete({
        index: this.indexName,
        id: documentId
      })
      console.log(`🗑️  Removed document: ${documentId}`)
    } catch (error) {
      console.error(`Failed to remove document ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string, filters?: any, size: number = 20): Promise<any[]> {
    try {
      // Build function score query for better scoring
      const functionScoreQuery = {
        query: {
          multi_match: {
            query: query,
            fields: [
              "title^3", 
              "content^1", 
              "tags^2", 
              "category^1.5"
            ],
            type: "best_fields",
            tie_breaker: 0.3
          }
        },
        functions: [
          // Boost newer documents
          {
            gauss: {
              lastModified: {
                origin: "now",
                scale: "30d",
                offset: "7d",
                decay: 0.5
              }
            }
          },
          // Boost by reading time (shorter docs get boost)
          {
            field_value_factor: {
              field: "metadata.readingTime",
              factor: -0.1,
              modifier: "reciprocal",
              missing: 1
            }
          }
        ],
        boost_mode: "multiply",
        score_mode: "multiply"
      };

      const searchQuery: any = {
        index: this.indexName,
        size,
        body: {
          query: functionScoreQuery
        }
      }

      // Apply filters if provided
      if (filters) {
        searchQuery.body.query.bool.filter = []
        
        if (filters.type) {
          searchQuery.body.query.bool.filter.push({
            term: { type: filters.type }
          })
        }
        
        if (filters.category) {
          searchQuery.body.query.bool.filter.push({
            term: { category: filters.category }
          })
        }
        
        if (filters.tags) {
          searchQuery.body.query.bool.filter.push({
            term: { tags: filters.tags }
          })
        }
      }

      const result = await this.client.search(searchQuery)
      return result.hits.hits.map((hit: any) => ({
        id: hit._id,
        ...hit._source,
        score: hit._score
      }))
    } catch (error) {
      console.error('Failed to search documents:', error)
      throw error
    }
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(partialQuery: string, field: string = 'title', size: number = 10): Promise<string[]> {
    try {
      const result = await this.client.search({
        index: this.indexName,
        size: 0,
        body: {
          suggest: {
            suggestions: {
              prefix: partialQuery,
              completion: {
                field: `${field}.suggest`,
                size: size,
                skip_duplicates: true
              }
            }
          }
        }
      })

      if (result.suggest && result.suggest.suggestions) {
        return result.suggest.suggestions[0].options.map((option: any) => option.text)
      }
      
      return []
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      throw error
    }
  }

  /**
   * Get facets for filters
   */
  async getFacets(): Promise<any> {
    try {
      const result = await this.client.search({
        index: this.indexName,
        size: 0,
        body: {
          aggs: {
            types: {
              terms: { field: 'type' }
            },
            categories: {
              terms: { field: 'category' }
            },
            tags: {
              terms: { field: 'tags' }
            },
            languages: {
              terms: { field: 'language' }
            }
          }
        }
      })

      return {
        types: result.aggregations.types.buckets,
        categories: result.aggregations.categories.buckets,
        tags: result.aggregations.tags.buckets,
        languages: result.aggregations.languages.buckets
      }
    } catch (error) {
      console.error('Failed to get facets:', error)
      throw error
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndexDocuments(documents: SearchDocument[]): Promise<void> {
    try {
      const body = documents.flatMap(doc => [
        { index: { _index: this.indexName, _id: doc.id } },
        { ...doc, lastModified: doc.lastModified.toISOString() }
      ])

      const result = await this.client.bulk({ refresh: true, body })
      
      if (result.errors) {
        const erroredDocuments = result.items.filter(item => item.index?.error)
        console.error('Failed to index some documents:', erroredDocuments)
      }
      
      console.log(`📦 Bulk indexed ${documents.length} documents`)
    } catch (error) {
      console.error('Failed to bulk index documents:', error)
      throw error
    }
  }
}