/**
 * Documentation Quality Management System
 * Comprehensive quality assurance for documentation
 */

import * as fs from 'fs/promises'
import * as path from 'path'

export interface QualityConfig {
  directories: string[]
  rules: QualityRule[]
  output: {
    reportPath: string
    format: 'json' | 'html' | 'markdown'
    includeDetails: boolean
  }
  thresholds: {
    minScore: number
    maxWarnings: number
    maxErrors: number
  }
  autoFix: boolean
  excludePatterns: string[]
}

export interface QualityRule {
  id: string
  name: string
  description: string
  category: 'structure' | 'content' | 'style' | 'accessibility' | 'seo' | 'technical'
  severity: 'error' | 'warning' | 'info'
  enabled: boolean
  check: (document: DocumentInfo) => QualityIssue[]
  fix?: (document: DocumentInfo) => DocumentFix | null
}

export interface DocumentInfo {
  filePath: string
  content: string
  frontmatter: Record<string, any>
  metadata: {
    title: string
    headings: HeadingInfo[]
    links: LinkInfo[]
    images: ImageInfo[]
    codeBlocks: CodeBlockInfo[]
    wordCount: number
    readingTime: number
    lastModified: Date
  }
}

export interface HeadingInfo {
  level: number
  text: string
  id?: string
  line: number
}

export interface LinkInfo {
  url: string
  text: string
  isExternal: boolean
  isValid?: boolean
  line: number
}

export interface ImageInfo {
  src: string
  alt: string
  title?: string
  isValid?: boolean
  line: number
}

export interface CodeBlockInfo {
  language: string
  content: string
  line: number
}

export interface QualityIssue {
  ruleId: string
  severity: 'error' | 'warning' | 'info'
  message: string
  line?: number
  column?: number
  context?: string
  suggestion?: string
}

export interface DocumentFix {
  content: string
  changes: Change[]
}

export interface Change {
  type: 'insert' | 'delete' | 'replace'
  line: number
  column?: number
  originalText: string
  newText: string
}

export interface QualityReport {
  summary: {
    totalDocuments: number
    totalIssues: number
    errorCount: number
    warningCount: number
    infoCount: number
    overallScore: number
    passedDocuments: number
    failedDocuments: number
  }
  documents: DocumentReport[]
  ruleStats: RuleStats[]
  generatedAt: Date
}

export interface DocumentReport {
  filePath: string
  score: number
  status: 'pass' | 'fail' | 'warning'
  issues: QualityIssue[]
  metadata: DocumentInfo['metadata']
}

export interface RuleStats {
  ruleId: string
  name: string
  violations: number
  documentsAffected: number
}

export class DocumentQualityManager {
  private config: QualityConfig
  private rules: Map<string, QualityRule>

  constructor(config: QualityConfig) {
    this.config = config
    this.rules = new Map()
    this.setupRules()
  }

  /**
   * Analyze all documents and generate quality report
   */
  async analyzeAll(): Promise<QualityReport> {
    console.log('🔍 Starting documentation quality analysis...')

    const documents = await this.findDocuments()
    const documentReports: DocumentReport[] = []
    const ruleStatsMap = new Map<string, { violations: number; documents: Set<string> }>()

    for (const filePath of documents) {
      try {
        const report = await this.analyzeDocument(filePath)
        documentReports.push(report)

        // Update rule statistics
        for (const issue of report.issues) {
          if (!ruleStatsMap.has(issue.ruleId)) {
            ruleStatsMap.set(issue.ruleId, { violations: 0, documents: new Set() })
          }
          const stats = ruleStatsMap.get(issue.ruleId)!
          stats.violations++
          stats.documents.add(filePath)
        }

      } catch (error) {
        console.warn(`Failed to analyze ${filePath}:`, error)
      }
    }

    // Calculate summary statistics
    const totalIssues = documentReports.reduce((sum, doc) => sum + doc.issues.length, 0)
    const errorCount = documentReports.reduce((sum, doc) => 
      sum + doc.issues.filter(issue => issue.severity === 'error').length, 0)
    const warningCount = documentReports.reduce((sum, doc) => 
      sum + doc.issues.filter(issue => issue.severity === 'warning').length, 0)
    const infoCount = documentReports.reduce((sum, doc) => 
      sum + doc.issues.filter(issue => issue.severity === 'info').length, 0)

    const passedDocuments = documentReports.filter(doc => doc.status === 'pass').length
    const failedDocuments = documentReports.filter(doc => doc.status === 'fail').length

    const averageScore = documentReports.length > 0 
      ? documentReports.reduce((sum, doc) => sum + doc.score, 0) / documentReports.length 
      : 100

    // Convert rule statistics
    const ruleStats: RuleStats[] = Array.from(ruleStatsMap.entries()).map(([ruleId, stats]) => ({
      ruleId,
      name: this.rules.get(ruleId)?.name || ruleId,
      violations: stats.violations,
      documentsAffected: stats.documents.size
    })).sort((a, b) => b.violations - a.violations)

    const report: QualityReport = {
      summary: {
        totalDocuments: documentReports.length,
        totalIssues,
        errorCount,
        warningCount,
        infoCount,
        overallScore: Math.round(averageScore),
        passedDocuments,
        failedDocuments
      },
      documents: documentReports.sort((a, b) => a.score - b.score),
      ruleStats,
      generatedAt: new Date()
    }

    console.log(`✅ Analysis complete: ${report.summary.totalDocuments} documents, ${totalIssues} issues`)

    return report
  }

  /**
   * Analyze single document
   */
  async analyzeDocument(filePath: string): Promise<DocumentReport> {
    const documentInfo = await this.parseDocument(filePath)
    const issues: QualityIssue[] = []

    // Run all enabled rules
    for (const rule of this.rules.values()) {
      if (rule.enabled) {
        try {
          const ruleIssues = rule.check(documentInfo)
          issues.push(...ruleIssues)
        } catch (error) {
          console.warn(`Rule ${rule.id} failed for ${filePath}:`, error)
        }
      }
    }

    // Calculate document score
    const score = this.calculateScore(issues)
    const status = this.getDocumentStatus(score, issues)

    return {
      filePath,
      score,
      status,
      issues: issues.sort((a, b) => {
        const severityOrder = { error: 3, warning: 2, info: 1 }
        return severityOrder[b.severity] - severityOrder[a.severity]
      }),
      metadata: documentInfo.metadata
    }
  }

  /**
   * Auto-fix documents where possible
   */
  async autoFix(filePaths?: string[]): Promise<{ fixed: number; failed: string[] }> {
    if (!this.config.autoFix) {
      throw new Error('Auto-fix is disabled in configuration')
    }

    console.log('🔧 Starting auto-fix...')

    const documents = filePaths || await this.findDocuments()
    const failed: string[] = []
    let fixed = 0

    for (const filePath of documents) {
      try {
        const documentInfo = await this.parseDocument(filePath)
        let content = documentInfo.content
        let hasChanges = false

        // Apply fixes from rules
        for (const rule of this.rules.values()) {
          if (rule.enabled && rule.fix) {
            try {
              const fix = rule.fix(documentInfo)
              if (fix) {
                content = fix.content
                hasChanges = true
                console.log(`📝 Applied fix from ${rule.id} to ${filePath}`)
              }
            } catch (error) {
              console.warn(`Fix failed for rule ${rule.id} on ${filePath}:`, error)
            }
          }
        }

        if (hasChanges) {
          await fs.writeFile(filePath, content)
          fixed++
        }

      } catch (error) {
        console.error(`Failed to fix ${filePath}:`, error)
        failed.push(filePath)
      }
    }

    console.log(`✅ Auto-fix complete: ${fixed} documents fixed, ${failed.length} failed`)

    return { fixed, failed }
  }

  /**
   * Generate quality report
   */
  async generateReport(report: QualityReport): Promise<void> {
    console.log(`📊 Generating quality report...`)

    await fs.mkdir(path.dirname(this.config.output.reportPath), { recursive: true })

    switch (this.config.output.format) {
      case 'json':
        await this.generateJsonReport(report)
        break
      case 'html':
        await this.generateHtmlReport(report)
        break
      case 'markdown':
        await this.generateMarkdownReport(report)
        break
    }

    console.log(`✅ Report generated: ${this.config.output.reportPath}`)
  }

  /**
   * Setup default quality rules
   */
  private setupRules(): void {
    const defaultRules: QualityRule[] = [
      // Structure rules
      {
        id: 'missing-title',
        name: 'Missing Title',
        description: 'Document must have a title',
        category: 'structure',
        severity: 'error',
        enabled: true,
        check: (doc) => {
          if (!doc.metadata.title || doc.metadata.title.trim() === '') {
            return [{
              ruleId: 'missing-title',
              severity: 'error',
              message: 'Document is missing a title',
              line: 1,
              suggestion: 'Add a title using # Title or frontmatter'
            }]
          }
          return []
        },
        fix: (doc) => {
          if (!doc.metadata.title) {
            const fileName = path.basename(doc.filePath, '.md')
            const title = fileName.replace(/[-_]/g, ' ').replace(/\w\S*/g, 
              txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
            
            return {
              content: `# ${title}\n\n${doc.content}`,
              changes: [{
                type: 'insert',
                line: 1,
                originalText: '',
                newText: `# ${title}\n\n`
              }]
            }
          }
          return null
        }
      },

      {
        id: 'heading-structure',
        name: 'Proper Heading Structure',
        description: 'Headings should follow proper hierarchy',
        category: 'structure',
        severity: 'warning',
        enabled: true,
        check: (doc) => {
          const issues: QualityIssue[] = []
          const headings = doc.metadata.headings

          for (let i = 1; i < headings.length; i++) {
            const current = headings[i]
            const previous = headings[i - 1]

            if (current.level > previous.level + 1) {
              issues.push({
                ruleId: 'heading-structure',
                severity: 'warning',
                message: `Heading level skips from H${previous.level} to H${current.level}`,
                line: current.line,
                suggestion: `Use H${previous.level + 1} instead of H${current.level}`
              })
            }
          }

          return issues
        }
      },

      // Content rules
      {
        id: 'min-content-length',
        name: 'Minimum Content Length',
        description: 'Document should have sufficient content',
        category: 'content',
        severity: 'warning',
        enabled: true,
        check: (doc) => {
          const minWords = 50
          if (doc.metadata.wordCount < minWords) {
            return [{
              ruleId: 'min-content-length',
              severity: 'warning',
              message: `Document has only ${doc.metadata.wordCount} words (minimum: ${minWords})`,
              suggestion: 'Add more content to provide value to readers'
            }]
          }
          return []
        }
      },

      {
        id: 'broken-links',
        name: 'Broken Links',
        description: 'All links should be valid',
        category: 'content',
        severity: 'error',
        enabled: true,
        check: (doc) => {
          const issues: QualityIssue[] = []
          
          for (const link of doc.metadata.links) {
            if (link.isValid === false) {
              issues.push({
                ruleId: 'broken-links',
                severity: 'error',
                message: `Broken link: ${link.url}`,
                line: link.line,
                suggestion: 'Check and fix the link URL'
              })
            }
          }

          return issues
        }
      },

      // Accessibility rules
      {
        id: 'missing-alt-text',
        name: 'Missing Alt Text',
        description: 'Images should have alt text',
        category: 'accessibility',
        severity: 'error',
        enabled: true,
        check: (doc) => {
          const issues: QualityIssue[] = []
          
          for (const image of doc.metadata.images) {
            if (!image.alt || image.alt.trim() === '') {
              issues.push({
                ruleId: 'missing-alt-text',
                severity: 'error',
                message: `Image missing alt text: ${image.src}`,
                line: image.line,
                suggestion: 'Add descriptive alt text for accessibility'
              })
            }
          }

          return issues
        }
      },

      // SEO rules
      {
        id: 'missing-description',
        name: 'Missing Description',
        description: 'Document should have a description for SEO',
        category: 'seo',
        severity: 'warning',
        enabled: true,
        check: (doc) => {
          if (!doc.frontmatter.description || doc.frontmatter.description.trim() === '') {
            return [{
              ruleId: 'missing-description',
              severity: 'warning',
              message: 'Document is missing a description',
              suggestion: 'Add a description in frontmatter for better SEO'
            }]
          }
          return []
        }
      }
    ]

    for (const rule of [...defaultRules, ...this.config.rules]) {
      this.rules.set(rule.id, rule)
    }
  }

  /**
   * Parse document and extract information
   */
  private async parseDocument(filePath: string): Promise<DocumentInfo> {
    const content = await fs.readFile(filePath, 'utf-8')
    const { frontmatter, body } = this.parseFrontmatter(content)

    // Extract metadata
    const headings = this.extractHeadings(body)
    const links = this.extractLinks(body)
    const images = this.extractImages(body)
    const codeBlocks = this.extractCodeBlocks(body)
    
    const title = frontmatter.title || this.extractTitleFromContent(body) || ''
    const wordCount = this.countWords(body)
    const readingTime = Math.ceil(wordCount / 200) // 200 words per minute

    const stats = await fs.stat(filePath)

    return {
      filePath,
      content,
      frontmatter,
      metadata: {
        title,
        headings,
        links,
        images,
        codeBlocks,
        wordCount,
        readingTime,
        lastModified: stats.mtime
      }
    }
  }

  /**
   * Parse frontmatter from markdown content
   */
  private parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
    const match = content.match(frontmatterRegex)

    if (match) {
      const frontmatterYaml = match[1]
      const body = match[2]
      
      // Simple YAML parsing (in production, use a proper YAML parser)
      const frontmatter: Record<string, any> = {}
      const lines = frontmatterYaml.split('\n')
      
      for (const line of lines) {
        const colonIndex = line.indexOf(':')
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim()
          const value = line.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '')
          frontmatter[key] = value
        }
      }

      return { frontmatter, body }
    }

    return { frontmatter: {}, body: content }
  }

  /**
   * Extract headings from markdown content
   */
  private extractHeadings(content: string): HeadingInfo[] {
    const headings: HeadingInfo[] = []
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(/^(#{1,6})\s+(.+)$/)
      
      if (match) {
        const level = match[1].length
        const text = match[2].trim()
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')

        headings.push({
          level,
          text,
          id,
          line: i + 1
        })
      }
    }

    return headings
  }

  /**
   * Extract links from markdown content
   */
  private extractLinks(content: string): LinkInfo[] {
    const links: LinkInfo[] = []
    const lines = content.split('\n')
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      let match

      while ((match = linkRegex.exec(line)) !== null) {
        const text = match[1]
        const url = match[2]
        const isExternal = url.startsWith('http') || url.startsWith('//')

        links.push({
          text,
          url,
          isExternal,
          line: i + 1
        })
      }
    }

    return links
  }

  /**
   * Extract images from markdown content
   */
  private extractImages(content: string): ImageInfo[] {
    const images: ImageInfo[] = []
    const lines = content.split('\n')
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)(?:\s+"([^"]+)")?\)/g

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      let match

      while ((match = imageRegex.exec(line)) !== null) {
        const alt = match[1] || ''
        const src = match[2]
        const title = match[3]

        images.push({
          alt,
          src,
          title,
          line: i + 1
        })
      }
    }

    return images
  }

  /**
   * Extract code blocks from markdown content
   */
  private extractCodeBlocks(content: string): CodeBlockInfo[] {
    const codeBlocks: CodeBlockInfo[] = []
    const lines = content.split('\n')
    let inCodeBlock = false
    let currentBlock: { language: string; content: string; startLine: number } | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // Starting code block
          const language = line.slice(3).trim()
          currentBlock = {
            language: language || 'text',
            content: '',
            startLine: i + 1
          }
          inCodeBlock = true
        } else {
          // Ending code block
          if (currentBlock) {
            codeBlocks.push({
              language: currentBlock.language,
              content: currentBlock.content.trim(),
              line: currentBlock.startLine
            })
          }
          currentBlock = null
          inCodeBlock = false
        }
      } else if (inCodeBlock && currentBlock) {
        currentBlock.content += line + '\n'
      }
    }

    return codeBlocks
  }

  /**
   * Extract title from markdown content
   */
  private extractTitleFromContent(content: string): string | null {
    const match = content.match(/^#\s+(.+)$/m)
    return match ? match[1].trim() : null
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  /**
   * Calculate document score based on issues
   */
  private calculateScore(issues: QualityIssue[]): number {
    let score = 100
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'error':
          score -= 15
          break
        case 'warning':
          score -= 5
          break
        case 'info':
          score -= 1
          break
      }
    }

    return Math.max(0, score)
  }

  /**
   * Get document status based on score and issues
   */
  private getDocumentStatus(score: number, issues: QualityIssue[]): 'pass' | 'fail' | 'warning' {
    const errorCount = issues.filter(i => i.severity === 'error').length
    const warningCount = issues.filter(i => i.severity === 'warning').length

    if (errorCount > this.config.thresholds.maxErrors || score < this.config.thresholds.minScore) {
      return 'fail'
    }

    if (warningCount > this.config.thresholds.maxWarnings) {
      return 'warning'
    }

    return 'pass'
  }

  /**
   * Find all documents to analyze
   */
  private async findDocuments(): Promise<string[]> {
    const documents: string[] = []

    for (const directory of this.config.directories) {
      const files = await this.findMarkdownFiles(directory)
      documents.push(...files)
    }

    // Filter out excluded patterns
    return documents.filter(file => {
      return !this.config.excludePatterns.some(pattern => {
        const regex = new RegExp(pattern)
        return regex.test(file)
      })
    })
  }

  /**
   * Find all markdown files in directory
   */
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          const subFiles = await this.findMarkdownFiles(fullPath)
          files.push(...subFiles)
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dir}:`, error)
    }

    return files
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(report: QualityReport): Promise<void> {
    const reportPath = this.config.output.reportPath.replace(/\.[^.]+$/, '.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(report: QualityReport): Promise<void> {
    const reportPath = this.config.output.reportPath.replace(/\.[^.]+$/, '.html')
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Documentation Quality Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .document { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 4px; }
    .pass { border-left: 5px solid #28a745; }
    .warning { border-left: 5px solid #ffc107; }
    .fail { border-left: 5px solid #dc3545; }
    .issue { margin: 5px 0; padding: 8px; border-radius: 3px; }
    .error { background: #f8d7da; }
    .warning { background: #fff3cd; }
    .info { background: #d1ecf1; }
  </style>
</head>
<body>
  <h1>Documentation Quality Report</h1>
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Total Documents:</strong> ${report.summary.totalDocuments}</p>
    <p><strong>Overall Score:</strong> ${report.summary.overallScore}%</p>
    <p><strong>Total Issues:</strong> ${report.summary.totalIssues}</p>
    <p><strong>Passed:</strong> ${report.summary.passedDocuments} | <strong>Failed:</strong> ${report.summary.failedDocuments}</p>
  </div>
  
  <h2>Document Details</h2>
  ${report.documents.map(doc => `
    <div class="document ${doc.status}">
      <h3>${doc.filePath} (Score: ${doc.score}%)</h3>
      ${doc.issues.map(issue => `
        <div class="issue ${issue.severity}">
          <strong>${issue.severity.toUpperCase()}:</strong> ${issue.message}
          ${issue.line ? ` (Line ${issue.line})` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}
  
  <p><em>Generated on ${report.generatedAt.toISOString()}</em></p>
</body>
</html>`

    await fs.writeFile(reportPath, html)
  }

  /**
   * Generate Markdown report
   */
  private async generateMarkdownReport(report: QualityReport): Promise<void> {
    const reportPath = this.config.output.reportPath.replace(/\.[^.]+$/, '.md')
    
    const markdown = `# Documentation Quality Report

## Summary

- **Total Documents:** ${report.summary.totalDocuments}
- **Overall Score:** ${report.summary.overallScore}%
- **Total Issues:** ${report.summary.totalIssues}
- **Passed:** ${report.summary.passedDocuments}
- **Failed:** ${report.summary.failedDocuments}

## Document Details

${report.documents.map(doc => `
### ${doc.filePath} (Score: ${doc.score}%)

Status: ${doc.status.toUpperCase()}

${doc.issues.length > 0 ? `
Issues:
${doc.issues.map(issue => `
- **${issue.severity.toUpperCase()}:** ${issue.message}${issue.line ? ` (Line ${issue.line})` : ''}
`).join('')}
` : 'No issues found.'}
`).join('')}

---
*Generated on ${report.generatedAt.toISOString()}*`

    await fs.writeFile(reportPath, markdown)
  }
}

// Default configuration
export const defaultQualityConfig: QualityConfig = {
  directories: ['./docs', './README.md'],
  rules: [],
  output: {
    reportPath: './docs/quality/quality-report.json',
    format: 'html',
    includeDetails: true
  },
  thresholds: {
    minScore: 80,
    maxWarnings: 10,
    maxErrors: 0
  },
  autoFix: false,
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.cache'
  ]
}