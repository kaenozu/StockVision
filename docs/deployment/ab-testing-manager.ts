/**
 * A/B Testing Manager
 * Manages A/B testing for documentation deployments
 */

export interface ABTestConfig {
  // Test identifier
  id: string
  
  // Test name
  name: string
  
  // Test variants
  variants: ABTestVariant[]
  
  // Traffic allocation (0-1)
  trafficAllocation: number
  
  // Targeting rules
  targeting?: ABTestTargeting
  
  // Duration settings
  startDate?: Date
  endDate?: Date
  
  // Whether the test is active
  active: boolean
}

export interface ABTestVariant {
  // Variant identifier
  id: string
  
  // Variant name
  name: string
  
  // Traffic weight (for allocation)
  weight: number
  
  // Configuration changes for this variant
  configOverrides?: Record<string, any>
  
  // Custom properties
  properties?: Record<string, any>
}

export interface ABTestTargeting {
  // Target specific countries
  countries?: string[]
  
  // Target specific regions
  regions?: string[]
  
  // Target specific user segments
  userSegments?: string[]
  
  // Target specific URLs
  urls?: string[]
  
  // Target specific devices
  devices?: ('desktop' | 'mobile' | 'tablet')[]
}

export interface ABTestContext {
  // User identifier
  userId?: string
  
  // Session identifier
  sessionId: string
  
  // Country code
  country?: string
  
  // Region
  region?: string
  
  // Device type
  deviceType?: 'desktop' | 'mobile' | 'tablet'
  
  // Current URL
  url?: string
  
  // User segments
  userSegments?: string[]
}

export interface ABTestResult {
  // Test identifier
  testId: string
  
  // Selected variant
  variantId: string
  
  // Whether user is part of test
  isInTest: boolean
  
  // Test configuration
  configOverrides?: Record<string, any>
}

export class ABTestingManager {
  private tests: Map<string, ABTestConfig> = new Map()
  private userAssignments: Map<string, Map<string, string>> = new Map() // userId -> testId -> variantId

  /**
   * Add a new A/B test
   */
  addTest(test: ABTestConfig): void {
    if (test.trafficAllocation < 0 || test.trafficAllocation > 1) {
      throw new Error('Traffic allocation must be between 0 and 1')
    }
    
    // Validate variant weights sum to 100
    const totalWeight = test.variants.reduce((sum, variant) => sum + variant.weight, 0)
    if (Math.abs(totalWeight - 100) > 0.01) {
      throw new Error('Variant weights must sum to 100')
    }
    
    this.tests.set(test.id, test)
    console.log(`🔬 Added A/B test: ${test.name} (${test.id})`)
  }

  /**
   * Remove an A/B test
   */
  removeTest(testId: string): void {
    this.tests.delete(testId)
    console.log(`🗑️  Removed A/B test: ${testId}`)
  }

  /**
   * Get test result for a user
   */
  getTestResult(testId: string, context: ABTestContext): ABTestResult {
    const test = this.tests.get(testId)
    
    // Check if test exists and is active
    if (!test || !test.active) {
      return {
        testId,
        variantId: 'control',
        isInTest: false
      }
    }
    
    // Check if test is running
    const now = new Date()
    if (test.startDate && test.startDate > now) {
      return {
        testId,
        variantId: 'control',
        isInTest: false
      }
    }
    
    if (test.endDate && test.endDate < now) {
      return {
        testId,
        variantId: 'control',
        isInTest: false
      }
    }
    
    // Check targeting rules
    if (test.targeting && !this.matchesTargeting(test.targeting, context)) {
      return {
        testId,
        variantId: 'control',
        isInTest: false
      }
    }
    
    // Check traffic allocation
    if (!this.isInTrafficAllocation(test, context)) {
      return {
        testId,
        variantId: 'control',
        isInTest: false
      }
    }
    
    // Assign variant
    const variantId = this.assignVariant(test, context)
    
    // Get variant config overrides
    const variant = test.variants.find(v => v.id === variantId)
    const configOverrides = variant?.configOverrides
    
    return {
      testId,
      variantId,
      isInTest: true,
      configOverrides
    }
  }

  /**
   * Check if user matches targeting rules
   */
  private matchesTargeting(targeting: ABTestTargeting, context: ABTestContext): boolean {
    // Check countries
    if (targeting.countries && context.country) {
      if (!targeting.countries.includes(context.country)) {
        return false
      }
    }
    
    // Check regions
    if (targeting.regions && context.region) {
      if (!targeting.regions.includes(context.region)) {
        return false
      }
    }
    
    // Check user segments
    if (targeting.userSegments && context.userSegments) {
      const hasMatchingSegment = targeting.userSegments.some(segment => 
        context.userSegments?.includes(segment)
      )
      if (!hasMatchingSegment) {
        return false
      }
    }
    
    // Check URLs
    if (targeting.urls && context.url) {
      const hasMatchingUrl = targeting.urls.some(urlPattern => 
        new RegExp(urlPattern).test(context.url || '')
      )
      if (!hasMatchingUrl) {
        return false
      }
    }
    
    // Check devices
    if (targeting.devices && context.deviceType) {
      if (!targeting.devices.includes(context.deviceType)) {
        return false
      }
    }
    
    return true
  }

  /**
   * Check if user is in traffic allocation
   */
  private isInTrafficAllocation(test: ABTestConfig, context: ABTestContext): boolean {
    // Use userId or sessionId for consistent assignment
    const identifier = context.userId || context.sessionId
    
    // Hash identifier to get consistent value between 0 and 1
    const hash = this.hashString(identifier + test.id)
    return hash < test.trafficAllocation
  }

  /**
   * Assign variant to user
   */
  private assignVariant(test: ABTestConfig, context: ABTestContext): string {
    // Use userId or sessionId for consistent assignment
    const identifier = context.userId || context.sessionId
    
    // Check if user already has assignment
    const userAssignments = this.userAssignments.get(identifier) || new Map()
    const existingAssignment = userAssignments.get(test.id)
    
    if (existingAssignment) {
      return existingAssignment
    }
    
    // Assign new variant based on weights
    const hash = this.hashString(identifier + test.id + 'variant')
    const percentage = hash * 100
    
    let cumulativeWeight = 0
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight
      if (percentage <= cumulativeWeight) {
        // Store assignment
        userAssignments.set(test.id, variant.id)
        this.userAssignments.set(identifier, userAssignments)
        return variant.id
      }
    }
    
    // Fallback to first variant
    return test.variants[0].id
  }

  /**
   * Hash string to number between 0 and 1
   */
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to positive number and normalize to 0-1 range
    return Math.abs(hash) / 2147483647 // Max 32-bit integer
  }

  /**
   * Get all active tests
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.tests.values()).filter(test => test.active)
  }

  /**
   * Get test by ID
   */
  getTest(testId: string): ABTestConfig | undefined {
    return this.tests.get(testId)
  }

  /**
   * Update test status
   */
  updateTestStatus(testId: string, active: boolean): void {
    const test = this.tests.get(testId)
    if (test) {
      test.active = active
      console.log(`🧪 ${active ? 'Activated' : 'Deactivated'} A/B test: ${testId}`)
    }
  }

  /**
   * Get user assignments
   */
  getUserAssignments(userId: string): Map<string, string> {
    return this.userAssignments.get(userId) || new Map()
  }

  /**
   * Clear user assignments (for testing)
   */
  clearUserAssignments(userId?: string): void {
    if (userId) {
      this.userAssignments.delete(userId)
    } else {
      this.userAssignments.clear()
    }
  }
}

// Default A/B test configuration
export const defaultABTestConfig: ABTestConfig = {
  id: 'documentation-layout-test',
  name: 'Documentation Layout Test',
  variants: [
    {
      id: 'control',
      name: 'Original Layout',
      weight: 50
    },
    {
      id: 'variant-a',
      name: 'New Layout with Sidebar',
      weight: 25,
      configOverrides: {
        layout: 'sidebar',
        tocPosition: 'left'
      }
    },
    {
      id: 'variant-b',
      name: 'New Layout with Top Navigation',
      weight: 25,
      configOverrides: {
        layout: 'topnav',
        tocPosition: 'right'
      }
    }
  ],
  trafficAllocation: 0.2, // 20% of traffic
  active: true
}