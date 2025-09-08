/**
 * AWS CloudFront Deployer
 * Deploys documentation to AWS CloudFront CDN
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { S3Client, PutObjectCommand, CreateInvalidationCommand } from '@aws-sdk/client-s3'
import { CloudFrontClient } from '@aws-sdk/client-cloudfront'

export interface AWSCloudFrontConfig {
  accessKey: string
  secretKey: string
  region: string
  bucket: string
  distributionId: string
  domain?: string
  caching?: {
    ttl?: number
    browserTTL?: number
    edgeTTL?: number
  }
  headers?: Record<string, string>
}

export interface DeployOptions {
  outputDir: string
  versioning?: boolean
  invalidateCache?: boolean
  parallel?: boolean
  maxConcurrency?: number
}

export interface DeployResult {
  success: boolean
  filesUploaded: number
  totalTime: number
  error?: string
}

export class AWSCloudFrontDeployer {
  private s3Client: S3Client
  private cloudFrontClient: CloudFrontClient
  private config: AWSCloudFrontConfig
  private options: DeployOptions

  constructor(config: AWSCloudFrontConfig, options: DeployOptions) {
    this.config = config
    this.options = options

    // Initialize AWS clients
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey
      }
    })

    this.cloudFrontClient = new CloudFrontClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey
      }
    })
  }

  /**
   * Deploy documentation to AWS CloudFront
   */
  async deploy(): Promise<DeployResult> {
    const startTime = Date.now()
    const result: DeployResult = {
      success: false,
      filesUploaded: 0,
      totalTime: 0
    }

    try {
      console.log(`🚀 Deploying to AWS CloudFront: ${this.config.distributionId}`)
      
      // Upload files to S3
      const files = await this.getAllFiles(this.options.outputDir)
      result.filesUploaded = await this.uploadFiles(files)
      
      // Invalidate CloudFront cache
      if (this.options.invalidateCache !== false) {
        await this.invalidateCache()
      }
      
      result.success = true
      result.totalTime = Date.now() - startTime
      
      console.log(`✅ AWS CloudFront deployment completed in ${result.totalTime}ms`)
      console.log(`📄 Files uploaded: ${result.filesUploaded}`)
      
      return result
    } catch (error) {
      console.error('❌ AWS CloudFront deployment failed:', error)
      result.error = error instanceof Error ? error.message : String(error)
      return result
    }
  }

  /**
   * Upload files to S3 bucket
   */
  private async uploadFiles(files: string[]): Promise<number> {
    let uploadedCount = 0
    const concurrency = this.options.maxConcurrency || 5
    const parallel = this.options.parallel !== false
    
    if (parallel) {
      // Upload files in parallel
      const chunks = this.chunkArray(files, concurrency)
      
      for (const chunk of chunks) {
        const promises = chunk.map(file => this.uploadFile(file))
        const results = await Promise.allSettled(promises)
        
        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            uploadedCount++
          }
        }
      }
    } else {
      // Upload files sequentially
      for (const file of files) {
        if (await this.uploadFile(file)) {
          uploadedCount++
        }
      }
    }
    
    return uploadedCount
  }

  /**
   * Upload a single file to S3
   */
  private async uploadFile(filePath: string): Promise<boolean> {
    try {
      const relativePath = path.relative(this.options.outputDir, filePath)
      const key = this.config.versioning 
        ? `${this.options.outputDir}/${Date.now()}/${relativePath}`
        : relativePath
      
      const fileContent = await fs.readFile(filePath)
      const contentType = this.getContentType(filePath)
      
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        CacheControl: this.getCacheControl(filePath),
        Metadata: this.config.headers
      })
      
      await this.s3Client.send(command)
      console.log(`📤 Uploaded: ${relativePath}`)
      return true
    } catch (error) {
      console.error(`❌ Failed to upload ${filePath}:`, error)
      return false
    }
  }

  /**
   * Invalidate CloudFront cache
   */
  private async invalidateCache(): Promise<void> {
    try {
      const command = new CreateInvalidationCommand({
        DistributionId: this.config.distributionId,
        InvalidationBatch: {
          CallerReference: `invalidation-${Date.now()}`,
          Paths: {
            Quantity: 1,
            Items: ['/*']
          }
        }
      })
      
      const response = await this.cloudFrontClient.send(command)
      console.log(`🔄 Cache invalidation created: ${response.Invalidation?.Id}`)
    } catch (error) {
      console.error('❌ Cache invalidation failed:', error)
      throw error
    }
  }

  /**
   * Get all files in directory
   */
  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await this.getAllFiles(fullPath)
        files.push(...subFiles)
      } else {
        files.push(fullPath)
      }
    }

    return files
  }

  /**
   * Get content type for file
   */
  private getContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.webp': 'image/webp',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    }
    
    return contentTypes[ext] || 'application/octet-stream'
  }

  /**
   * Get cache control header for file
   */
  private getCacheControl(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    
    // Default cache settings
    const browserTTL = this.config.caching?.browserTTL || 3600 // 1 hour
    const edgeTTL = this.config.caching?.edgeTTL || 86400 // 24 hours
    
    // Longer cache for static assets
    if (['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.woff', '.woff2'].includes(ext)) {
      return `public, max-age=${browserTTL}, s-maxage=${edgeTTL}`
    }
    
    // Shorter cache for HTML files
    if (ext === '.html') {
      const htmlTTL = this.config.caching?.ttl || 300 // 5 minutes
      return `public, max-age=${htmlTTL}, s-maxage=${htmlTTL}`
    }
    
    // Default cache
    const defaultTTL = this.config.caching?.ttl || 3600
    return `public, max-age=${defaultTTL}, s-maxage=${defaultTTL}`
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    
    return chunks
  }
}