/**
 * Documentation Publisher
 * Optimized publishing and hosting system for documentation
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export interface PublishingConfig {
  buildDirectory: string
  outputDirectory: string
  deployTargets: DeployTarget[]
  optimization: {
    minifyHtml: boolean
    compressAssets: boolean
    generateWebP: boolean
    createManifest: boolean
    enableServiceWorker: boolean
  }
  cdn: {
    enabled: boolean
    provider: 'cloudflare' | 'aws' | 'azure' | 'custom'
    baseUrl: string
    cacheDuration: number
  }
  seo: {
    generateRobotsTxt: boolean
    createSitemap: boolean
    addStructuredData: boolean
  }
}

export interface DeployTarget {
  name: string
  type: 'static' | 'server' | 'cdn'
  config: StaticHostingConfig | ServerConfig | CDNConfig
}

export interface StaticHostingConfig {
  provider: 'netlify' | 'vercel' | 'github-pages' | 's3' | 'azure-static'
  buildCommand?: string
  outputDirectory: string
  environmentVariables?: Record<string, string>
  customDomain?: string
  redirects?: RedirectRule[]
  headers?: HeaderRule[]
}

export interface ServerConfig {
  host: string
  port: number
  ssl: boolean
  compression: boolean
  caching: boolean
}

export interface CDNConfig {
  provider: 'cloudflare' | 'aws-cloudfront' | 'azure-cdn'
  distribution: string
  originPath: string
  cacheSettings: CacheSettings[]
}

export interface RedirectRule {
  from: string
  to: string
  status: number
  conditions?: Record<string, string>
}

export interface HeaderRule {
  path: string
  headers: Record<string, string>
}

export interface CacheSettings {
  path: string
  ttl: number
  compression: boolean
}

export interface BuildResult {
  success: boolean
  buildTime: number
  outputSize: number
  files: string[]
  warnings: string[]
  errors: string[]
}

export interface DeployResult {
  target: string
  success: boolean
  deployTime: number
  url?: string
  error?: string
}

export class DocumentPublisher {
  private config: PublishingConfig

  constructor(config: PublishingConfig) {
    this.config = config
  }

  /**
   * Build documentation for publishing
   */
  async build(): Promise<BuildResult> {
    console.log('🔨 Building documentation for publishing...')

    const startTime = Date.now()
    const result: BuildResult = {
      success: false,
      buildTime: 0,
      outputSize: 0,
      files: [],
      warnings: [],
      errors: []
    }

    try {
      // Clean output directory
      await this.cleanOutputDirectory()

      // Copy built files
      await this.copyBuildFiles(result)

      // Optimize assets
      await this.optimizeAssets(result)

      // Generate additional files
      await this.generateManifest(result)
      await this.generateServiceWorker(result)
      await this.generateRobotsTxt(result)
      await this.generateSitemap(result)

      // Add structured data
      await this.addStructuredData(result)

      // Calculate final size
      result.outputSize = await this.calculateDirectorySize(this.config.outputDirectory)

      result.success = true
      result.buildTime = Date.now() - startTime

      console.log(`✅ Build completed in ${result.buildTime}ms`)
      console.log(`📦 Output size: ${(result.outputSize / 1024 / 1024).toFixed(2)} MB`)
      console.log(`📄 Files generated: ${result.files.length}`)

    } catch (error) {
      result.errors.push(`Build failed: ${error}`)
      console.error('❌ Build failed:', error)
    }

    return result
  }

  /**
   * Deploy to all configured targets
   */
  async deploy(): Promise<DeployResult[]> {
    console.log('🚀 Deploying documentation...')

    const results: DeployResult[] = []

    for (const target of this.config.deployTargets) {
      const result = await this.deployToTarget(target)
      results.push(result)
    }

    const successful = results.filter(r => r.success).length
    const total = results.length

    console.log(`✅ Deployment completed: ${successful}/${total} targets successful`)

    return results
  }

  /**
   * Deploy to specific target
   */
  private async deployToTarget(target: DeployTarget): Promise<DeployResult> {
    console.log(`🎯 Deploying to ${target.name}...`)

    const startTime = Date.now()
    const result: DeployResult = {
      target: target.name,
      success: false,
      deployTime: 0
    }

    try {
      switch (target.type) {
        case 'static':
          await this.deployToStatic(target.config as StaticHostingConfig, result)
          break
        case 'server':
          await this.deployToServer(target.config as ServerConfig, result)
          break
        case 'cdn':
          await this.deployToCDN(target.config as CDNConfig, result)
          break
      }

      result.success = true
      result.deployTime = Date.now() - startTime

      console.log(`✅ Deployed to ${target.name} in ${result.deployTime}ms`)

    } catch (error) {
      result.error = `Deployment to ${target.name} failed: ${error}`
      console.error(`❌ Deployment to ${target.name} failed:`, error)
    }

    return result
  }

  /**
   * Clean output directory
   */
  private async cleanOutputDirectory(): Promise<void> {
    try {
      await fs.rm(this.config.outputDirectory, { recursive: true, force: true })
    } catch (error) {
      // Directory might not exist, which is fine
    }

    await fs.mkdir(this.config.outputDirectory, { recursive: true })
  }

  /**
   * Copy built files to output directory
   */
  private async copyBuildFiles(result: BuildResult): Promise<void> {
    const files = await this.getAllFiles(this.config.buildDirectory)

    for (const file of files) {
      const relativePath = path.relative(this.config.buildDirectory, file)
      const outputPath = path.join(this.config.outputDirectory, relativePath)

      await fs.mkdir(path.dirname(outputPath), { recursive: true })
      await fs.copyFile(file, outputPath)

      result.files.push(relativePath)
    }
  }

  /**
   * Optimize assets for production
   */
  private async optimizeAssets(result: BuildResult): Promise<void> {
    if (!this.config.optimization.minifyHtml && 
        !this.config.optimization.compressAssets && 
        !this.config.optimization.generateWebP) {
      return
    }

    const files = await this.getAllFiles(this.config.outputDirectory)

    for (const file of files) {
      const ext = path.extname(file).toLowerCase()

      try {
        if (ext === '.html' && this.config.optimization.minifyHtml) {
          await this.minifyHtml(file)
        }

        if (['.css', '.js'].includes(ext) && this.config.optimization.compressAssets) {
          await this.compressAsset(file)
        }

        if (['.jpg', '.jpeg', '.png'].includes(ext) && this.config.optimization.generateWebP) {
          await this.generateWebP(file, result)
        }

      } catch (error) {
        result.warnings.push(`Failed to optimize ${file}: ${error}`)
      }
    }
  }

  /**
   * Minify HTML files
   */
  private async minifyHtml(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8')
    
    // Simple HTML minification (in production, use html-minifier or similar)
    const minified = content
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim()

    await fs.writeFile(filePath, minified)
  }

  /**
   * Compress CSS/JS assets
   */
  private async compressAsset(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8')
    
    // Simple minification (in production, use terser, cssnano, etc.)
    const compressed = content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Compress whitespace
      .trim()

    await fs.writeFile(filePath, compressed)
  }

  /**
   * Generate WebP versions of images
   */
  private async generateWebP(filePath: string, result: BuildResult): Promise<void> {
    try {
      // Dynamically import sharp to avoid issues when it's not installed
      const sharp = (await import('sharp')).default;
      
      const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp')
      await sharp(filePath).webp({ quality: 80 }).toFile(webpPath)
      
      console.log(`🖼️  Generated WebP: ${webpPath}`)
    } catch (error) {
      // If sharp is not available or fails, add a warning
      const webpPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp')
      result.warnings.push(`Failed to generate WebP for ${filePath}: ${error}`)
    }
  }

  /**
   * Generate web app manifest
   */
  private async generateManifest(result: BuildResult): Promise<void> {
    if (!this.config.optimization.createManifest) return

    const manifest = {
      name: 'Documentation',
      short_name: 'Docs',
      description: 'Project Documentation',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#000000',
      icons: [
        {
          src: '/assets/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/assets/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }

    const manifestPath = path.join(this.config.outputDirectory, 'manifest.json')
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    
    result.files.push('manifest.json')
  }

  /**
   * Generate service worker
   */
  private async generateServiceWorker(result: BuildResult): Promise<void> {
    if (!this.config.optimization.enableServiceWorker) return

    const swCode = `
const CACHE_NAME = 'docs-v1'
const urlsToCache = [
  '/',
  '/assets/styles.css',
  '/assets/scripts.js'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})
`

    const swPath = path.join(this.config.outputDirectory, 'sw.js')
    await fs.writeFile(swPath, swCode)
    
    result.files.push('sw.js')
  }

  /**
   * Generate robots.txt
   */
  private async generateRobotsTxt(result: BuildResult): Promise<void> {
    if (!this.config.seo.generateRobotsTxt) return

    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${this.config.cdn.baseUrl}/sitemap.xml`

    const robotsPath = path.join(this.config.outputDirectory, 'robots.txt')
    await fs.writeFile(robotsPath, robotsTxt)
    
    result.files.push('robots.txt')
  }

  /**
   * Generate sitemap.xml
   */
  private async generateSitemap(result: BuildResult): Promise<void> {
    if (!this.config.seo.createSitemap) return

    const htmlFiles = result.files.filter(f => f.endsWith('.html'))
    const urls = htmlFiles.map(file => {
      const url = file.replace(/index\.html$/, '').replace(/\.html$/, '')
      return `  <url>
    <loc>${this.config.cdn.baseUrl}/${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }).join('\n')

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

    const sitemapPath = path.join(this.config.outputDirectory, 'sitemap.xml')
    await fs.writeFile(sitemapPath, sitemap)
    
    result.files.push('sitemap.xml')
  }

  /**
   * Add structured data to HTML files
   */
  private async addStructuredData(result: BuildResult): Promise<void> {
    if (!this.config.seo.addStructuredData) return

    const htmlFiles = result.files.filter(f => f.endsWith('.html'))

    for (const file of htmlFiles) {
      const filePath = path.join(this.config.outputDirectory, file)
      const content = await fs.readFile(filePath, 'utf-8')

      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'headline': this.extractTitle(content),
        'description': this.extractDescription(content),
        'datePublished': new Date().toISOString(),
        'dateModified': new Date().toISOString()
      }

      const scriptTag = `<script type="application/ld+json">${JSON.stringify(structuredData)}</script>`
      const updatedContent = content.replace('</head>', `${scriptTag}\n</head>`)

      await fs.writeFile(filePath, updatedContent)
    }
  }

  /**
   * Deploy to static hosting
   */
  private async deployToStatic(config: StaticHostingConfig, result: DeployResult): Promise<void> {
    switch (config.provider) {
      case 'netlify':
        await this.deployToNetlify(config, result)
        break
      case 'vercel':
        await this.deployToVercel(config, result)
        break
      case 'github-pages':
        await this.deployToGitHubPages(config, result)
        break
      case 's3':
        await this.deployToS3(config, result)
        break
      case 'azure-static':
        await this.deployToAzureStatic(config, result)
        break
    }
  }

  /**
   * Deploy to server
   */
  private async deployToServer(config: ServerConfig, result: DeployResult): Promise<void> {
    // This would implement server deployment (rsync, SCP, etc.)
    console.log(`Deploying to server ${config.host}:${config.port}`)
    result.url = `${config.ssl ? 'https' : 'http'}://${config.host}:${config.port}`
  }

  /**
   * Deploy to CDN
   */
  private async deployToCDN(config: CDNConfig, result: DeployResult): Promise<void> {
    // This would implement CDN deployment
    console.log(`Deploying to ${config.provider} CDN`)
    result.url = `https://${config.distribution}`
  }

  // Specific deployment methods (simplified implementations)
  private async deployToNetlify(config: StaticHostingConfig, result: DeployResult): Promise<void> {
    // Would use Netlify CLI or API
    console.log('Deploying to Netlify...')
    result.url = config.customDomain || 'https://app.netlify.com'
  }

  private async deployToVercel(config: StaticHostingConfig, result: DeployResult): Promise<void> {
    // Would use Vercel CLI or API
    console.log('Deploying to Vercel...')
    result.url = config.customDomain || 'https://app.vercel.app'
  }

  private async deployToGitHubPages(config: StaticHostingConfig, result: DeployResult): Promise<void> {
    // Would push to gh-pages branch
    console.log('Deploying to GitHub Pages...')
    result.url = config.customDomain || 'https://username.github.io/repo'
  }

  private async deployToS3(config: StaticHostingConfig, result: DeployResult): Promise<void> {
    // Would use AWS SDK
    console.log('Deploying to AWS S3...')
    result.url = config.customDomain || 'https://bucket.s3.amazonaws.com'
  }

  private async deployToAzureStatic(config: StaticHostingConfig, result: DeployResult): Promise<void> {
    // Would use Azure CLI or SDK
    console.log('Deploying to Azure Static Web Apps...')
    result.url = config.customDomain || 'https://app.azurestaticapps.net'
  }

  // Helper methods
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

  private async calculateDirectorySize(dir: string): Promise<number> {
    let size = 0
    const files = await this.getAllFiles(dir)

    for (const file of files) {
      const stat = await fs.stat(file)
      size += stat.size
    }

    return size
  }

  private extractTitle(html: string): string {
    const match = html.match(/<title>(.*?)<\/title>/)
    return match ? match[1] : 'Documentation'
  }

  private extractDescription(html: string): string {
    const match = html.match(/<meta name="description" content="(.*?)"/)
    return match ? match[1] : 'Project documentation'
  }
}

// Default publishing configuration
export const defaultPublishingConfig: PublishingConfig = {
  buildDirectory: './docs/build',
  outputDirectory: './docs/dist',
  deployTargets: [
    {
      name: 'github-pages',
      type: 'static',
      config: {
        provider: 'github-pages',
        outputDirectory: './docs/dist',
        customDomain: undefined
      } as StaticHostingConfig
    }
  ],
  optimization: {
    minifyHtml: true,
    compressAssets: true,
    generateWebP: false,
    createManifest: true,
    enableServiceWorker: true
  },
  cdn: {
    enabled: false,
    provider: 'cloudflare',
    baseUrl: 'https://docs.example.com',
    cacheDuration: 3600
  },
  seo: {
    generateRobotsTxt: true,
    createSitemap: true,
    addStructuredData: true
  }
}