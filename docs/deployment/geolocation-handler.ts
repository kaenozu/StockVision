/**
 * Geolocation Handler
 * Manages geolocation-based content delivery and routing
 */

export interface GeolocationConfig {
  // Default region when geolocation fails
  defaultRegion: string
  
  // Region mapping configuration
  regionMap: RegionMapping[]
  
  // Fallback behavior
  fallbackStrategy: 'default' | 'closest' | 'redirect'
  
  // Header name for region detection
  regionHeader: string
  
  // Cookie name for region preference
  regionCookie: string
}

export interface RegionMapping {
  // ISO 3166-1 alpha-2 country codes
  countries: string[]
  
  // Target region/endpoint
  region: string
  
  // Optional specific endpoint URL
  endpoint?: string
  
  // Optional weighting for load balancing
  weight?: number
}

export interface GeolocationResult {
  country: string
  region: string
  endpoint?: string
  isFallback: boolean
}

export class GeolocationHandler {
  constructor(private config: GeolocationConfig) {}

  /**
   * Determine region based on country code
   */
  getRegionByCountry(countryCode: string): GeolocationResult {
    // Normalize country code to uppercase
    const normalizedCountry = countryCode.toUpperCase()
    
    // Find matching region
    for (const mapping of this.config.regionMap) {
      if (mapping.countries.includes(normalizedCountry)) {
        return {
          country: normalizedCountry,
          region: mapping.region,
          endpoint: mapping.endpoint,
          isFallback: false
        }
      }
    }
    
    // No match found, apply fallback strategy
    return this.applyFallback(normalizedCountry)
  }

  /**
   * Apply fallback strategy when no region match is found
   */
  private applyFallback(countryCode: string): GeolocationResult {
    switch (this.config.fallbackStrategy) {
      case 'default':
        return {
          country: countryCode,
          region: this.config.defaultRegion,
          isFallback: true
        }
      
      case 'closest':
        const closestRegion = this.findClosestRegion(countryCode)
        return {
          country: countryCode,
          region: closestRegion,
          isFallback: true
        }
      
      case 'redirect':
        // This would typically trigger an HTTP redirect
        // For now, we'll just return the default region
        return {
          country: countryCode,
          region: this.config.defaultRegion,
          isFallback: true
        }
      
      default:
        return {
          country: countryCode,
          region: this.config.defaultRegion,
          isFallback: true
        }
    }
  }

  /**
   * Find closest region based on geographical proximity
   */
  private findClosestRegion(countryCode: string): string {
    // Simplified geographical proximity mapping
    // In a real implementation, this would use a more sophisticated algorithm
    // or external service to determine actual geographical distances
    
    const regionProximity: Record<string, string[]> = {
      'US': ['NA', 'EU', 'AS'],
      'CA': ['NA', 'EU', 'AS'],
      'GB': ['EU', 'NA', 'AS'],
      'DE': ['EU', 'NA', 'AS'],
      'FR': ['EU', 'NA', 'AS'],
      'JP': ['AS', 'NA', 'EU'],
      'CN': ['AS', 'NA', 'EU'],
      'IN': ['AS', 'NA', 'EU'],
      'AU': ['OC', 'AS', 'NA'],
      'BR': ['SA', 'NA', 'EU']
    }
    
    const proximityList = regionProximity[countryCode] || [this.config.defaultRegion]
    return proximityList[0]
  }

  /**
   * Get region from HTTP headers
   */
  getRegionFromHeaders(headers: Record<string, string>): GeolocationResult | null {
    const regionHeader = headers[this.config.regionHeader.toLowerCase()]
    if (regionHeader) {
      return {
        country: 'HEADER',
        region: regionHeader,
        isFallback: false
      }
    }
    
    const cfCountry = headers['cf-ipcountry'] // Cloudflare header
    if (cfCountry) {
      return this.getRegionByCountry(cfCountry)
    }
    
    const xCountry = headers['x-country'] // Custom header
    if (xCountry) {
      return this.getRegionByCountry(xCountry)
    }
    
    return null
  }

  /**
   * Get region from cookies
   */
  getRegionFromCookies(cookies: string): GeolocationResult | null {
    const regionCookie = this.parseCookie(cookies, this.config.regionCookie)
    if (regionCookie) {
      return {
        country: 'COOKIE',
        region: regionCookie,
        isFallback: false
      }
    }
    
    return null
  }

  /**
   * Parse cookie value
   */
  private parseCookie(cookieHeader: string, cookieName: string): string | undefined {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=')
      if (name === cookieName) {
        return value
      }
    }
    return undefined
  }

  /**
   * Generate region-specific URL
   */
  generateRegionUrl(baseUrl: string, region: string): string {
    // Add region as subdomain or path prefix
    try {
      const url = new URL(baseUrl)
      
      // Add region as subdomain
      if (url.hostname !== 'localhost') {
        url.hostname = `${region}.${url.hostname}`
      }
      
      return url.toString()
    } catch (error) {
      // If URL parsing fails, append region as path
      const separator = baseUrl.endsWith('/') ? '' : '/'
      return `${baseUrl}${separator}${region}/`
    }
  }

  /**
   * Get all available regions
   */
  getAvailableRegions(): string[] {
    const regions = new Set<string>()
    for (const mapping of this.config.regionMap) {
      regions.add(mapping.region)
    }
    regions.add(this.config.defaultRegion)
    return Array.from(regions)
  }

  /**
   * Validate if a region is supported
   */
  isSupportedRegion(region: string): boolean {
    return this.getAvailableRegions().includes(region)
  }
}

// Default geolocation configuration
export const defaultGeolocationConfig: GeolocationConfig = {
  defaultRegion: 'US',
  regionHeader: 'x-region',
  regionCookie: 'region',
  fallbackStrategy: 'default',
  regionMap: [
    {
      countries: ['US', 'CA', 'MX'],
      region: 'NA', // North America
      weight: 3
    },
    {
      countries: ['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'AT', 'CH', 'BE', 'LU', 'IE', 'PT', 'GR'],
      region: 'EU', // Europe
      weight: 2
    },
    {
      countries: ['JP', 'CN', 'IN', 'KR', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'AU', 'NZ'],
      region: 'AS', // Asia Pacific
      weight: 2
    },
    {
      countries: ['BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'BO', 'PY', 'UY', 'FK'],
      region: 'SA' // South America
    },
    {
      countries: ['ZA', 'NG', 'EG', 'KE', 'MA', 'GH', 'TZ', 'UG', 'ZW', 'ZM'],
      region: 'AF' // Africa
    },
    {
      countries: ['AU', 'NZ', 'FJ', 'PG', 'NC', 'SB', 'VU', 'WS', 'TO', 'TV'],
      region: 'OC' // Oceania
    }
  ]
}