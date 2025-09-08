/**
 * Deploy Preview Manager
 * Manages preview deployments for documentation changes
 */

export interface PreviewConfig {
  // Preview environment prefix
  prefix: string
  
  // Maximum number of previews to keep
  maxPreviews: number
  
  // Expiration time for previews (in hours)
  expirationHours: number
  
  // Whether to require authentication for previews
  requireAuth: boolean
  
  // Allowed branches for preview deployments
  allowedBranches?: string[]
  
  // Custom domain for previews
  customDomain?: string
}

export interface PreviewDeployment {
  // Unique identifier for the preview
  id: string
  
  // Branch name
  branch: string
  
  // Commit SHA
  commit: string
  
  // Deployment URL
  url: string
  
  // Creation timestamp
  createdAt: Date
  
  // Expiration timestamp
  expiresAt: Date
  
  // Whether the preview is active
  active: boolean
  
  // Creator information
  creator?: {
    name: string
    email: string
  }
}

export interface DeployPreviewOptions {
  // Branch to deploy
  branch: string
  
  // Commit SHA
  commit: string
  
  // Build directory
  buildDir: string
  
  // Creator information
  creator?: {
    name: string
    email: string
  }
  
  // Custom preview URL
  customUrl?: string
}

export interface DeployPreviewResult {
  success: boolean
  preview?: PreviewDeployment
  error?: string
}

export class DeployPreviewManager {
  private previews: Map<string, PreviewDeployment> = new Map()
  private config: PreviewConfig

  constructor(config: PreviewConfig) {
    this.config = config
  }

  /**
   * Create a new preview deployment
   */
  async createPreview(options: DeployPreviewOptions): Promise<DeployPreviewResult> {
    try {
      // Validate branch
      if (this.config.allowedBranches && 
          !this.config.allowedBranches.includes(options.branch)) {
        throw new Error(`Branch ${options.branch} is not allowed for preview deployments`)
      }

      // Generate preview ID
      const previewId = this.generatePreviewId(options.branch, options.commit)
      
      // Check if preview already exists
      const existingPreview = this.previews.get(previewId)
      if (existingPreview && existingPreview.active) {
        console.log(`🔄 Preview already exists: ${existingPreview.url}`)
        return {
          success: true,
          preview: existingPreview
        }
      }

      // Generate preview URL
      const previewUrl = this.generatePreviewUrl(previewId, options.customUrl)
      
      // Calculate expiration time
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + this.config.expirationHours)
      
      // Create preview deployment object
      const preview: PreviewDeployment = {
        id: previewId,
        branch: options.branch,
        commit: options.commit,
        url: previewUrl,
        createdAt: new Date(),
        expiresAt,
        active: true,
        creator: options.creator
      }
      
      // Add to previews map
      this.previews.set(previewId, preview)
      
      // Clean up old previews
      await this.cleanupOldPreviews()
      
      console.log(`👁️  Created preview: ${preview.url}`)
      
      return {
        success: true,
        preview
      }
    } catch (error) {
      console.error('❌ Failed to create preview:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Deactivate a preview deployment
   */
  async deactivatePreview(previewId: string): Promise<boolean> {
    const preview = this.previews.get(previewId)
    if (preview) {
      preview.active = false
      console.log(`🚫 Deactivated preview: ${preview.url}`)
      return true
    }
    return false
  }

  /**
   * Get preview by ID
   */
  getPreview(previewId: string): PreviewDeployment | undefined {
    return this.previews.get(previewId)
  }

  /**
   * Get all active previews
   */
  getActivePreviews(): PreviewDeployment[] {
    return Array.from(this.previews.values()).filter(p => p.active)
  }

  /**
   * Get previews for a specific branch
   */
  getPreviewsForBranch(branch: string): PreviewDeployment[] {
    return Array.from(this.previews.values()).filter(
      p => p.branch === branch && p.active
    )
  }

  /**
   * Clean up expired previews
   */
  async cleanupOldPreviews(): Promise<void> {
    const now = new Date()
    let deactivatedCount = 0
    
    for (const [id, preview] of this.previews) {
      // Deactivate expired previews
      if (preview.expiresAt < now) {
        preview.active = false
        deactivatedCount++
        console.log(`⏰ Deactivated expired preview: ${preview.url}`)
      }
    }
    
    // Remove old inactive previews if we exceed maxPreviews
    const inactivePreviews = Array.from(this.previews.values())
      .filter(p => !p.active)
      .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())
    
    if (inactivePreviews.length > this.config.maxPreviews) {
      const toRemove = inactivePreviews.length - this.config.maxPreviews
      for (let i = 0; i < toRemove; i++) {
        const preview = inactivePreviews[i]
        this.previews.delete(preview.id)
        console.log(`🗑️  Removed old preview: ${preview.url}`)
      }
    }
    
    if (deactivatedCount > 0) {
      console.log(`🧹 Cleaned up ${deactivatedCount} expired previews`)
    }
  }

  /**
   * Generate preview ID
   */
  private generatePreviewId(branch: string, commit: string): string {
    // Create a unique ID based on branch and commit
    return `${this.config.prefix}-${branch}-${commit.substring(0, 8)}`
  }

  /**
   * Generate preview URL
   */
  private generatePreviewUrl(previewId: string, customUrl?: string): string {
    if (customUrl) {
      return customUrl
    }
    
    if (this.config.customDomain) {
      // Use custom domain with preview ID as subdomain
      return `https://${previewId}.${this.config.customDomain}`
    }
    
    // Default to localhost for development
    return `http://localhost:8000/previews/${previewId}`
  }

  /**
   * Validate preview configuration
   */
  validateConfig(): string[] {
    const errors: string[] = []
    
    if (!this.config.prefix) {
      errors.push('Preview prefix is required')
    }
    
    if (this.config.maxPreviews <= 0) {
      errors.push('maxPreviews must be greater than 0')
    }
    
    if (this.config.expirationHours <= 0) {
      errors.push('expirationHours must be greater than 0')
    }
    
    return errors
  }

  /**
   * Get preview statistics
   */
  getStats(): {
    totalPreviews: number
    activePreviews: number
    expiredPreviews: number
    maxPreviews: number
  } {
    const allPreviews = Array.from(this.previews.values())
    const activePreviews = allPreviews.filter(p => p.active).length
    const expiredPreviews = allPreviews.filter(p => !p.active).length
    
    return {
      totalPreviews: allPreviews.length,
      activePreviews,
      expiredPreviews,
      maxPreviews: this.config.maxPreviews
    }
  }

  /**
   * Extend preview expiration
   */
  extendPreviewExpiration(previewId: string, hours: number): boolean {
    const preview = this.previews.get(previewId)
    if (preview && preview.active) {
      preview.expiresAt = new Date(preview.expiresAt.getTime() + hours * 60 * 60 * 1000)
      console.log(`⏱️  Extended preview expiration: ${preview.url} now expires at ${preview.expiresAt}`)
      return true
    }
    return false
  }
}

// Default preview configuration
export const defaultPreviewConfig: PreviewConfig = {
  prefix: 'preview',
  maxPreviews: 10,
  expirationHours: 48, // 2 days
  requireAuth: false,
  allowedBranches: ['develop', 'feature/*', 'hotfix/*']
}