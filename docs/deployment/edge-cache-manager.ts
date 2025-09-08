/**
 * Edge Cache Manager
 * Manages caching strategies for CDN deployment
 */

export interface CacheConfig {
  // Default TTL for all resources (in seconds)
  defaultTTL: number
  
  // Browser cache TTL (in seconds)
  browserTTL: number
  
  // Edge cache TTL (in seconds)
  edgeTTL: number
  
  // Cache policies for different file types
  policies: CachePolicy[]
  
  // Cache warming options
  warmCache?: boolean
  
  // Cache invalidation patterns
  invalidationPatterns?: string[]
}

export interface CachePolicy {
  // File pattern to match (e.g., "*.js", "/api/*")
  pattern: string
  
  // Cache TTL for this pattern (in seconds)
  ttl: number
  
  // Whether to cache on the edge
  edgeCache: boolean
  
  // Whether to cache in the browser
  browserCache: boolean
  
  // Custom headers to add
  headers?: Record<string, string>
}

export interface CacheHeaders {
  'Cache-Control': string
  'ETag'?: string
  'Last-Modified'?: string
  'Expires'?: string
  [key: string]: string | undefined
}

export class EdgeCacheManager {
  constructor(private config: CacheConfig) {}

  /**
   * Generate cache headers for a file
   */
  generateCacheHeaders(filePath: string, fileSize?: number, lastModified?: Date): CacheHeaders {
    const policy = this.findMatchingPolicy(filePath)
    const ttl = policy?.ttl || this.config.defaultTTL
    
    // Build Cache-Control header
    const cacheControlParts = []
    
    if (policy?.browserCache !== false) {
      cacheControlParts.push(`public`)
      cacheControlParts.push(`max-age=${this.config.browserTTL}`)
    } else {
      cacheControlParts.push(`private`)
      cacheControlParts.push(`max-age=0`)
    }
    
    if (policy?.edgeCache !== false) {
      cacheControlParts.push(`s-maxage=${this.config.edgeTTL}`)
    }
    
    const headers: CacheHeaders = {
      'Cache-Control': cacheControlParts.join(', ')
    }
    
    // Add ETag for cache validation
    if (fileSize && lastModified) {
      const etag = this.generateETag(filePath, fileSize, lastModified)
      headers['ETag'] = etag
      headers['Last-Modified'] = lastModified.toUTCString()
    }
    
    // Add custom headers from policy
    if (policy?.headers) {
      Object.assign(headers, policy.headers)
    }
    
    // Add Expires header
    const expires = new Date(Date.now() + ttl * 1000)
    headers['Expires'] = expires.toUTCString()
    
    return headers
  }

  /**
   * Find matching cache policy for a file
   */
  private findMatchingPolicy(filePath: string): CachePolicy | undefined {
    // Sort policies by specificity (longer patterns first)
    const sortedPolicies = [...this.config.policies].sort((a, b) => 
      b.pattern.length - a.pattern.length
    )
    
    for (const policy of sortedPolicies) {
      if (this.matchPattern(filePath, policy.pattern)) {
        return policy
      }
    }
    
    return undefined
  }

  /**
   * Check if file path matches pattern
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.') // Escape dots
      .replace(/\*/g, '.*')  // Convert * to .*
      .replace(/\?/g, '.')   // Convert ? to .
    
    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(filePath)
  }

  /**
   * Generate ETag for cache validation
   */
  private generateETag(filePath: string, fileSize: number, lastModified: Date): string {
    // Simple ETag generation based on file path, size and modification time
    const content = `${filePath}-${fileSize}-${lastModified.getTime()}`
    let hash = 0
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return `"${Math.abs(hash).toString(16)}"`
  }

  /**
   * Generate cache invalidation paths
   */
  getInvalidationPaths(): string[] {
    if (this.config.invalidationPatterns && this.config.invalidationPatterns.length > 0) {
      return this.config.invalidationPatterns
    }
    
    // Default invalidation patterns
    return ['/*']
  }

  /**
   * Warm up cache by pre-fetching key resources
   */
  async warmCache(urls: string[]): Promise<void> {
    if (!this.config.warmCache) {
      return
    }
    
    console.log(`🔥 Warming up cache for ${urls.length} URLs...`)
    
    try {
      const fetchPromises = urls.map(url => 
        fetch(url, { 
          method: 'HEAD', // Use HEAD request to avoid downloading content
          headers: {
            'User-Agent': 'EdgeCacheManager/1.0'
          }
        })
      )
      
      await Promise.allSettled(fetchPromises)
      console.log('✅ Cache warm-up completed')
    } catch (error) {
      console.warn('⚠️  Cache warm-up failed:', error)
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { 
    totalPolicies: number; 
    defaultTTL: number; 
    browserTTL: number; 
    edgeTTL: number 
  } {
    return {
      totalPolicies: this.config.policies.length,
      defaultTTL: this.config.defaultTTL,
      browserTTL: this.config.browserTTL,
      edgeTTL: this.config.edgeTTL
    }
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  defaultTTL: 3600, // 1 hour
  browserTTL: 3600, // 1 hour
  edgeTTL: 86400,   // 24 hours
  policies: [
    {
      pattern: '*.html',
      ttl: 300, // 5 minutes for HTML files
      edgeCache: true,
      browserCache: true,
      headers: {
        'X-Cache-Policy': 'html'
      }
    },
    {
      pattern: '/api/*',
      ttl: 60, // 1 minute for API responses
      edgeCache: true,
      browserCache: false, // Don't cache API responses in browser
      headers: {
        'X-Cache-Policy': 'api'
      }
    },
    {
      pattern: '*.js',
      ttl: 31536000, // 1 year for JavaScript files
      edgeCache: true,
      browserCache: true,
      headers: {
        'X-Cache-Policy': 'static'
      }
    },
    {
      pattern: '*.css',
      ttl: 31536000, // 1 year for CSS files
      edgeCache: true,
      browserCache: true,
      headers: {
        'X-Cache-Policy': 'static'
      }
    },
    {
      pattern: '*.(png|jpg|jpeg|gif|svg|webp|ico)',
      ttl: 31536000, // 1 year for images
      edgeCache: true,
      browserCache: true,
      headers: {
        'X-Cache-Policy': 'static'
      }
    }
  ],
  warmCache: true,
  invalidationPatterns: ['/*']
}