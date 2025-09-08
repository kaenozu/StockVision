/**
 * Search Analytics
 * Tracks and analyzes search queries for insights
 */

export interface SearchQueryLog {
  id: string
  query: string
  timestamp: Date
  resultsCount: number
  filters: Record<string, any>
  userId?: string
}

export interface SearchAnalyticsData {
  popularQueries: Array<{ query: string; count: number }>
  noResultQueries: Array<{ query: string; count: number }>
  queryTrends: Array<{ date: string; count: number }>
  filterUsage: Record<string, number>
}

export class SearchAnalytics {
  private queryLogs: SearchQueryLog[] = []
  private maxLogs: number = 10000

  /**
   * Log a search query
   */
  logQuery(query: string, resultsCount: number, filters: Record<string, any> = {}, userId?: string): void {
    const log: SearchQueryLog = {
      id: this.generateId(),
      query: query.toLowerCase(),
      timestamp: new Date(),
      resultsCount,
      filters,
      userId
    }

    // Add to logs
    this.queryLogs.push(log)

    // Maintain max size
    if (this.queryLogs.length > this.maxLogs) {
      this.queryLogs.shift()
    }

    console.log(`🔍 Search query logged: ${query}`)
  }

  /**
   * Get search analytics data
   */
  getAnalytics(): SearchAnalyticsData {
    const analytics: SearchAnalyticsData = {
      popularQueries: [],
      noResultQueries: [],
      queryTrends: [],
      filterUsage: {}
    }

    // Count queries
    const queryCounts: Record<string, number> = {}
    const noResultQueries: Record<string, number> = {}
    const dateCounts: Record<string, number> = {}
    const filterCounts: Record<string, number> = {}

    for (const log of this.queryLogs) {
      // Popular queries
      queryCounts[log.query] = (queryCounts[log.query] || 0) + 1

      // No result queries
      if (log.resultsCount === 0) {
        noResultQueries[log.query] = (noResultQueries[log.query] || 0) + 1
      }

      // Query trends (group by day)
      const date = log.timestamp.toISOString().split('T')[0]
      dateCounts[date] = (dateCounts[date] || 0) + 1

      // Filter usage
      for (const [key, value] of Object.entries(log.filters)) {
        const filterKey = `${key}:${value}`
        filterCounts[filterKey] = (filterCounts[filterKey] || 0) + 1
      }
    }

    // Convert to arrays and sort
    analytics.popularQueries = Object.entries(queryCounts)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    analytics.noResultQueries = Object.entries(noResultQueries)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)

    analytics.queryTrends = Object.entries(dateCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    analytics.filterUsage = filterCounts

    return analytics
  }

  /**
   * Get search suggestions based on popular queries
   */
  getSuggestions(partialQuery: string, limit: number = 10): string[] {
    const lowerPartial = partialQuery.toLowerCase()
    
    return this.queryLogs
      .filter(log => log.query.startsWith(lowerPartial))
      .map(log => log.query)
      .filter((query, index, self) => self.indexOf(query) === index) // Remove duplicates
      .slice(0, limit)
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.queryLogs = []
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }
}