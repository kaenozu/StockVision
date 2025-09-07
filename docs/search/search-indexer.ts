/**
 * Documentation Search Indexer
 * Builds and maintains search index from documentation files
 */

import { DocumentSearchEngine, SearchDocument } from './search-engine'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface IndexerConfig {
  inputDirectories: string[]
  outputFile?: string
  excludePatterns?: string[]
  includePatterns?: string[]
  defaultLanguage: string
  extractMetadata: boolean
  watchForChanges: boolean
}

export interface DocumentProcessor {
  canProcess(filePath: string): boolean
  process(filePath: string, content: string): Promise<SearchDocument>
}

export class SearchIndexer {
  private searchEngine: DocumentSearchEngine
  private config: IndexerConfig
  private processors: DocumentProcessor[]
  private watchedFiles = new Map<string, Date>()

  constructor(config: IndexerConfig) {
    this.searchEngine = new DocumentSearchEngine()
    this.config = config
    this.processors = [
      new MarkdownProcessor(config.defaultLanguage),
      new JsonProcessor(config.defaultLanguage),
      new TypeScriptProcessor(config.defaultLanguage)
    ]
  }

  /**
   * Build search index from configured directories
   */
  async buildIndex(): Promise<void> {
    console.log('🔨 Building search index...')

    for (const directory of this.config.inputDirectories) {
      await this.indexDirectory(directory)
    }

    // Save index to file if configured
    if (this.config.outputFile) {
      await this.saveIndex(this.config.outputFile)
    }

    // Start watching for changes if configured
    if (this.config.watchForChanges) {
      this.startWatching()
    }

    console.log('✅ Search index built successfully')
  }

  /**
   * Index a single directory
   */
  private async indexDirectory(directory: string): Promise<void> {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name)

        // Skip excluded files
        if (this.shouldExclude(fullPath)) {
          continue
        }

        if (entry.isDirectory()) {
          await this.indexDirectory(fullPath)
        } else if (entry.isFile()) {
          await this.indexFile(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Failed to index directory ${directory}:`, error)
    }
  }

  /**
   * Index a single file
   */
  private async indexFile(filePath: string): Promise<void> {
    try {
      // Check if file should be included
      if (!this.shouldInclude(filePath)) {
        return
      }

      // Find appropriate processor
      const processor = this.processors.find(p => p.canProcess(filePath))
      if (!processor) {
        console.warn(`No processor found for file: ${filePath}`)
        return
      }

      // Read file content
      const content = await fs.readFile(filePath, 'utf-8')
      
      // Process file to create search document
      const document = await processor.process(filePath, content)
      
      // Add to search index
      this.searchEngine.addDocument(document)
      
      // Track file for change detection
      const stats = await fs.stat(filePath)
      this.watchedFiles.set(filePath, stats.mtime)

      console.log(`📄 Indexed: ${filePath}`)
    } catch (error) {
      console.warn(`Failed to index file ${filePath}:`, error)
    }
  }

  /**
   * Check if file should be excluded
   */
  private shouldExclude(filePath: string): boolean {
    if (!this.config.excludePatterns) return false

    return this.config.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern)
      return regex.test(filePath)
    })
  }

  /**
   * Check if file should be included
   */
  private shouldInclude(filePath: string): boolean {
    if (!this.config.includePatterns) return true

    return this.config.includePatterns.some(pattern => {
      const regex = new RegExp(pattern)
      return regex.test(filePath)
    })
  }

  /**
   * Save search index to file
   */
  private async saveIndex(outputPath: string): Promise<void> {
    const indexData = this.searchEngine.exportIndex()
    const data = {
      index: indexData,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        documentCount: indexData.documents.length
      }
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2))

    console.log(`💾 Index saved to: ${outputPath}`)
  }

  /**
   * Load search index from file
   */
  async loadIndex(indexPath: string): Promise<void> {
    try {
      const content = await fs.readFile(indexPath, 'utf-8')
      const data = JSON.parse(content)
      
      this.searchEngine.importIndex(data.index)
      
      console.log(`📂 Index loaded from: ${indexPath}`)
    } catch (error) {
      console.warn(`Failed to load index from ${indexPath}:`, error)
    }
  }

  /**
   * Start watching for file changes
   */
  private startWatching(): void {
    console.log('👀 Starting file watcher...')
    
    // Simple polling-based watcher (in production, use chokidar or similar)
    setInterval(async () => {
      await this.checkForChanges()
    }, 5000) // Check every 5 seconds
  }

  /**
   * Check for file changes and update index
   */
  private async checkForChanges(): Promise<void> {
    const changedFiles: string[] = []

    for (const [filePath, lastModified] of this.watchedFiles) {
      try {
        const stats = await fs.stat(filePath)
        
        if (stats.mtime > lastModified) {
          changedFiles.push(filePath)
          this.watchedFiles.set(filePath, stats.mtime)
        }
      } catch (error) {
        // File might have been deleted
        this.searchEngine.removeDocument(this.generateDocumentId(filePath))
        this.watchedFiles.delete(filePath)
      }
    }

    // Re-index changed files
    for (const filePath of changedFiles) {
      console.log(`🔄 Re-indexing changed file: ${filePath}`)
      await this.indexFile(filePath)
    }
  }

  /**
   * Get search engine instance
   */
  getSearchEngine(): DocumentSearchEngine {
    return this.searchEngine
  }

  /**
   * Generate consistent document ID from file path
   */
  private generateDocumentId(filePath: string): string {
    return Buffer.from(filePath).toString('base64')
  }
}

/**
 * Markdown Document Processor
 */
class MarkdownProcessor implements DocumentProcessor {
  constructor(private defaultLanguage: string) {}

  canProcess(filePath: string): boolean {
    return filePath.endsWith('.md') || filePath.endsWith('.mdx')
  }

  async process(filePath: string, content: string): Promise<SearchDocument> {
    // Parse frontmatter and content
    const { metadata, body } = this.parseMarkdown(content)
    
    // Generate URL from file path
    const url = this.generateUrl(filePath)
    
    return {
      id: Buffer.from(filePath).toString('base64'),
      title: metadata.title || this.extractTitle(body) || path.basename(filePath, '.md'),
      content: this.stripMarkdown(body),
      url,
      type: this.determineType(filePath, metadata),
      category: metadata.category || this.inferCategory(filePath),
      tags: metadata.tags || this.extractTags(body),
      language: metadata.language || this.defaultLanguage,
      lastModified: new Date(),
      metadata: {
        author: metadata.author,
        difficulty: metadata.difficulty,
        readingTime: this.calculateReadingTime(body),
        version: metadata.version
      }
    }
  }

  private parseMarkdown(content: string): { metadata: any; body: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)
    
    if (match) {
      const frontmatter = match[1]
      const body = match[2]
      
      // Parse YAML frontmatter (simplified)
      const metadata = this.parseYamlFrontmatter(frontmatter)
      
      return { metadata, body }
    }
    
    return { metadata: {}, body: content }
  }

  private parseYamlFrontmatter(yaml: string): any {
    const metadata: any = {}
    
    const lines = yaml.split('\n')
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) {
        const [, key, value] = match
        
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          metadata[key] = value.slice(1, -1).split(',').map(s => s.trim().replace(/['"]/g, ''))
        } else {
          metadata[key] = value.replace(/['"]/g, '')
        }
      }
    }
    
    return metadata
  }

  private extractTitle(content: string): string | null {
    const titleMatch = content.match(/^#\s+(.+)$/m)
    return titleMatch ? titleMatch[1] : null
  }

  private stripMarkdown(content: string): string {
    return content
      .replace(/^#{1,6}\s+/gm, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // Remove images
      .trim()
  }

  private determineType(filePath: string, metadata: any): SearchDocument['type'] {
    if (metadata.type) {
      return metadata.type
    }
    
    if (filePath.includes('api')) return 'api'
    if (filePath.includes('tutorial')) return 'tutorial'
    if (filePath.includes('example')) return 'example'
    
    return 'documentation'
  }

  private inferCategory(filePath: string): string {
    const pathParts = filePath.split(path.sep)
    
    // Find meaningful directory name
    for (let i = pathParts.length - 2; i >= 0; i--) {
      const part = pathParts[i]
      if (part && part !== 'docs' && part !== 'documentation') {
        return part
      }
    }
    
    return 'general'
  }

  private extractTags(content: string): string[] {
    const tags = new Set<string>()
    
    // Extract from hashtags
    const hashtagMatches = content.match(/#\w+/g)
    if (hashtagMatches) {
      for (const match of hashtagMatches) {
        tags.add(match.slice(1))
      }
    }
    
    // Extract technical terms
    const techTerms = ['react', 'typescript', 'javascript', 'api', 'component', 'hook']
    const lowerContent = content.toLowerCase()
    
    for (const term of techTerms) {
      if (lowerContent.includes(term)) {
        tags.add(term)
      }
    }
    
    return Array.from(tags)
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

  private generateUrl(filePath: string): string {
    // Convert file path to URL
    const relativePath = path.relative(process.cwd(), filePath)
    return '/' + relativePath.replace(/\\/g, '/').replace(/\.md$/, '')
  }
}

/**
 * JSON Document Processor (for API specs, config files, etc.)
 */
class JsonProcessor implements DocumentProcessor {
  constructor(private defaultLanguage: string) {}

  canProcess(filePath: string): boolean {
    return filePath.endsWith('.json') && !filePath.includes('node_modules')
  }

  async process(filePath: string, content: string): Promise<SearchDocument> {
    try {
      const data = JSON.parse(content)
      
      return {
        id: Buffer.from(filePath).toString('base64'),
        title: data.title || data.name || path.basename(filePath, '.json'),
        content: this.extractSearchableContent(data),
        url: this.generateUrl(filePath),
        type: this.determineType(filePath, data),
        category: this.inferCategory(filePath),
        tags: data.tags || data.keywords || [],
        language: this.defaultLanguage,
        lastModified: new Date(),
        metadata: {
          version: data.version
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse JSON file: ${error}`)
    }
  }

  private extractSearchableContent(data: any): string {
    const searchableFields = ['description', 'summary', 'content', 'text']
    const parts: string[] = []
    
    const extractRecursive = (obj: any) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          if (searchableFields.includes(key.toLowerCase())) {
            parts.push(value)
          }
        } else if (typeof value === 'object' && value !== null) {
          extractRecursive(value)
        }
      }
    }
    
    extractRecursive(data)
    return parts.join(' ')
  }

  private determineType(filePath: string, data: any): SearchDocument['type'] {
    if (filePath.includes('api') || data.openapi || data.swagger) {
      return 'api'
    }
    
    return 'documentation'
  }

  private inferCategory(filePath: string): string {
    if (filePath.includes('api')) return 'api'
    if (filePath.includes('config')) return 'configuration'
    
    return 'data'
  }

  private generateUrl(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath)
    return '/' + relativePath.replace(/\\/g, '/')
  }
}

/**
 * TypeScript Document Processor (for extracting JSDoc comments)
 */
class TypeScriptProcessor implements DocumentProcessor {
  constructor(private defaultLanguage: string) {}

  canProcess(filePath: string): boolean {
    return (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) && 
           !filePath.includes('node_modules') &&
           !filePath.endsWith('.d.ts')
  }

  async process(filePath: string, content: string): Promise<SearchDocument> {
    const docs = this.extractJSDoc(content)
    
    if (docs.length === 0) {
      throw new Error('No JSDoc comments found')
    }
    
    const mainDoc = docs[0]
    
    return {
      id: Buffer.from(filePath).toString('base64'),
      title: mainDoc.title || path.basename(filePath, path.extname(filePath)),
      content: docs.map(doc => doc.description).join('\n\n'),
      url: this.generateUrl(filePath),
      type: 'api',
      category: this.inferCategory(filePath),
      tags: this.extractTags(content),
      language: this.defaultLanguage,
      lastModified: new Date(),
      metadata: {
        version: mainDoc.version
      }
    }
  }

  private extractJSDoc(content: string): Array<{ title: string; description: string; version?: string }> {
    const jsDocRegex = /\/\*\*([\s\S]*?)\*\//g
    const docs: Array<{ title: string; description: string; version?: string }> = []
    
    let match
    while ((match = jsDocRegex.exec(content)) !== null) {
      const comment = match[1]
      const lines = comment.split('\n').map(line => line.replace(/^\s*\*\s?/, ''))
      
      const title = lines.find(line => line.trim() && !line.startsWith('@'))?.trim() || ''
      const description = lines
        .filter(line => !line.startsWith('@') && line.trim())
        .join('\n')
        .trim()
      
      const versionMatch = comment.match(/@version\s+(\S+)/)
      const version = versionMatch ? versionMatch[1] : undefined
      
      if (description) {
        docs.push({ title, description, version })
      }
    }
    
    return docs
  }

  private extractTags(content: string): string[] {
    const tags = new Set<string>()
    
    // Extract from imports
    const importMatches = content.match(/import.*from\s+['"]([^'"]+)['"]/g)
    if (importMatches) {
      for (const match of importMatches) {
        const moduleMatch = match.match(/from\s+['"]([^'"]+)['"]/)
        if (moduleMatch) {
          const module = moduleMatch[1]
          if (!module.startsWith('.')) {
            tags.add(module.split('/')[0])
          }
        }
      }
    }
    
    // Extract TypeScript/React specific terms
    const techTerms = ['component', 'hook', 'interface', 'type', 'function', 'class']
    const lowerContent = content.toLowerCase()
    
    for (const term of techTerms) {
      if (lowerContent.includes(term)) {
        tags.add(term)
      }
    }
    
    return Array.from(tags)
  }

  private inferCategory(filePath: string): string {
    if (filePath.includes('components')) return 'components'
    if (filePath.includes('hooks')) return 'hooks'
    if (filePath.includes('utils')) return 'utilities'
    if (filePath.includes('services')) return 'services'
    
    return 'code'
  }

  private generateUrl(filePath: string): string {
    const relativePath = path.relative(process.cwd(), filePath)
    return '/code/' + relativePath.replace(/\\/g, '/')
  }
}

// Default configuration
export const defaultIndexerConfig: IndexerConfig = {
  inputDirectories: ['./docs', './src'],
  outputFile: './docs/search/search-index.json',
  excludePatterns: [
    'node_modules',
    '\\.git',
    'dist',
    'build',
    '\\.cache',
    'coverage'
  ],
  includePatterns: [
    '\\.md$',
    '\\.mdx$',
    '\\.json$',
    '\\.ts$',
    '\\.tsx$'
  ],
  defaultLanguage: 'en',
  extractMetadata: true,
  watchForChanges: false
}