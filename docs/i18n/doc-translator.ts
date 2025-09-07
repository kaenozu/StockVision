/**
 * Document Translator for Markdown Documentation
 * Handles translation of documentation files
 */

import { TranslationManager } from './translation-manager'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface DocumentMetadata {
  title: string
  description: string
  keywords: string[]
  author?: string
  date?: string
  category?: string
  tags?: string[]
}

export interface TranslatedDocument {
  content: string
  metadata: DocumentMetadata
  language: string
  originalPath: string
  translatedPath: string
}

export class DocumentTranslator {
  private translationManager: TranslationManager
  private markdownParser: MarkdownParser

  constructor(translationManager: TranslationManager) {
    this.translationManager = translationManager
    this.markdownParser = new MarkdownParser()
  }

  /**
   * Translate a single document
   */
  async translateDocument(
    filePath: string,
    targetLanguage: string,
    outputDir: string
  ): Promise<TranslatedDocument> {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = this.markdownParser.parse(content)
    
    // Translate metadata
    const translatedMetadata = await this.translateMetadata(
      parsed.metadata,
      targetLanguage
    )
    
    // Translate content sections
    const translatedContent = await this.translateContent(
      parsed.content,
      targetLanguage
    )
    
    // Generate output path
    const fileName = path.basename(filePath, '.md')
    const translatedPath = path.join(outputDir, targetLanguage, `${fileName}.md`)
    
    // Combine translated parts
    const fullContent = this.combineContent(translatedMetadata, translatedContent)
    
    // Ensure output directory exists
    await fs.mkdir(path.dirname(translatedPath), { recursive: true })
    
    // Write translated file
    await fs.writeFile(translatedPath, fullContent)
    
    return {
      content: fullContent,
      metadata: translatedMetadata,
      language: targetLanguage,
      originalPath: filePath,
      translatedPath
    }
  }

  /**
   * Translate multiple documents
   */
  async translateDocuments(
    inputDir: string,
    targetLanguages: string[],
    outputDir: string
  ): Promise<TranslatedDocument[]> {
    const results: TranslatedDocument[] = []
    
    // Find all markdown files
    const files = await this.findMarkdownFiles(inputDir)
    
    for (const file of files) {
      for (const language of targetLanguages) {
        try {
          const translated = await this.translateDocument(file, language, outputDir)
          results.push(translated)
          console.log(`✅ Translated ${file} to ${language}`)
        } catch (error) {
          console.error(`❌ Failed to translate ${file} to ${language}:`, error)
        }
      }
    }
    
    return results
  }

  /**
   * Translate document metadata
   */
  private async translateMetadata(
    metadata: DocumentMetadata,
    targetLanguage: string
  ): Promise<DocumentMetadata> {
    const translated: DocumentMetadata = { ...metadata }
    
    // Translate title
    if (metadata.title) {
      translated.title = this.translationManager.getTranslation(
        metadata.title,
        targetLanguage,
        'metadata'
      )
    }
    
    // Translate description
    if (metadata.description) {
      translated.description = this.translationManager.getTranslation(
        metadata.description,
        targetLanguage,
        'metadata'
      )
    }
    
    // Translate keywords
    if (metadata.keywords) {
      translated.keywords = metadata.keywords.map(keyword =>
        this.translationManager.getTranslation(keyword, targetLanguage, 'keywords')
      )
    }
    
    // Translate tags
    if (metadata.tags) {
      translated.tags = metadata.tags.map(tag =>
        this.translationManager.getTranslation(tag, targetLanguage, 'tags')
      )
    }
    
    return translated
  }

  /**
   * Translate document content
   */
  private async translateContent(
    content: string,
    targetLanguage: string
  ): Promise<string> {
    const lines = content.split('\n')
    const translatedLines: string[] = []
    
    for (const line of lines) {
      if (this.shouldTranslateLine(line)) {
        const translatedLine = await this.translateLine(line, targetLanguage)
        translatedLines.push(translatedLine)
      } else {
        translatedLines.push(line)
      }
    }
    
    return translatedLines.join('\n')
  }

  /**
   * Check if a line should be translated
   */
  private shouldTranslateLine(line: string): boolean {
    // Don't translate code blocks
    if (line.startsWith('```') || line.startsWith('    ')) {
      return false
    }
    
    // Don't translate inline code
    if (line.includes('`') && line.match(/`[^`]+`/)) {
      return false
    }
    
    // Don't translate URLs
    if (line.includes('http://') || line.includes('https://')) {
      return false
    }
    
    // Don't translate empty lines
    if (line.trim() === '') {
      return false
    }
    
    return true
  }

  /**
   * Translate a single line
   */
  private async translateLine(
    line: string,
    targetLanguage: string
  ): Promise<string> {
    // Extract and preserve markdown formatting
    const formatting = this.extractFormatting(line)
    const plainText = this.stripFormatting(line)
    
    if (plainText.trim() === '') {
      return line
    }
    
    // Try to get existing translation
    const existing = this.translationManager.getTranslation(
      plainText,
      targetLanguage,
      'content'
    )
    
    if (existing !== plainText) {
      return this.applyFormatting(existing, formatting)
    }
    
    // Auto-translate if enabled
    // This would integrate with the translation service
    return line // Fallback to original
  }

  /**
   * Extract markdown formatting from text
   */
  private extractFormatting(text: string): FormatInfo {
    const formatting: FormatInfo = {
      prefix: '',
      suffix: '',
      inlineFormatting: []
    }
    
    // Extract heading level
    const headingMatch = text.match(/^(#+)\s/)
    if (headingMatch) {
      formatting.prefix = headingMatch[1] + ' '
    }
    
    // Extract list markers
    const listMatch = text.match(/^(\s*[-*+]\s)/)
    if (listMatch) {
      formatting.prefix = listMatch[1]
    }
    
    // Extract numbered list
    const numberedMatch = text.match(/^(\s*\d+\.\s)/)
    if (numberedMatch) {
      formatting.prefix = numberedMatch[1]
    }
    
    // Extract inline formatting
    const boldMatches = text.match(/\*\*[^*]+\*\*/g)
    if (boldMatches) {
      formatting.inlineFormatting.push(...boldMatches.map(m => ({ type: 'bold', text: m })))
    }
    
    const italicMatches = text.match(/\*[^*]+\*/g)
    if (italicMatches) {
      formatting.inlineFormatting.push(...italicMatches.map(m => ({ type: 'italic', text: m })))
    }
    
    return formatting
  }

  /**
   * Strip markdown formatting from text
   */
  private stripFormatting(text: string): string {
    return text
      .replace(/^#+\s/, '') // Remove headings
      .replace(/^\s*[-*+]\s/, '') // Remove list markers
      .replace(/^\s*\d+\.\s/, '') // Remove numbered list
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .trim()
  }

  /**
   * Apply formatting back to translated text
   */
  private applyFormatting(text: string, formatting: FormatInfo): string {
    let result = formatting.prefix + text + formatting.suffix
    
    // Apply inline formatting (simplified)
    for (const format of formatting.inlineFormatting) {
      // This is a simplified implementation
      // In practice, you'd need more sophisticated formatting preservation
    }
    
    return result
  }

  /**
   * Combine metadata and content
   */
  private combineContent(metadata: DocumentMetadata, content: string): string {
    let result = '---\n'
    
    result += `title: "${metadata.title}"\n`
    result += `description: "${metadata.description}"\n`
    
    if (metadata.keywords.length > 0) {
      result += `keywords: [${metadata.keywords.map(k => `"${k}"`).join(', ')}]\n`
    }
    
    if (metadata.author) {
      result += `author: "${metadata.author}"\n`
    }
    
    if (metadata.date) {
      result += `date: "${metadata.date}"\n`
    }
    
    if (metadata.category) {
      result += `category: "${metadata.category}"\n`
    }
    
    if (metadata.tags && metadata.tags.length > 0) {
      result += `tags: [${metadata.tags.map(t => `"${t}"`).join(', ')}]\n`
    }
    
    result += '---\n\n'
    result += content
    
    return result
  }

  /**
   * Find all markdown files in directory
   */
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
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
    
    return files
  }
}

interface FormatInfo {
  prefix: string
  suffix: string
  inlineFormatting: Array<{ type: string; text: string }>
}

/**
 * Simple Markdown Parser
 */
class MarkdownParser {
  parse(content: string): { metadata: DocumentMetadata; content: string } {
    const lines = content.split('\n')
    
    // Check for frontmatter
    if (lines[0] === '---') {
      const endIndex = lines.findIndex((line, index) => index > 0 && line === '---')
      
      if (endIndex > 0) {
        const frontmatter = lines.slice(1, endIndex).join('\n')
        const bodyContent = lines.slice(endIndex + 1).join('\n')
        
        const metadata = this.parseFrontmatter(frontmatter)
        
        return {
          metadata,
          content: bodyContent
        }
      }
    }
    
    // No frontmatter, extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : 'Untitled'
    
    return {
      metadata: {
        title,
        description: '',
        keywords: []
      },
      content
    }
  }

  private parseFrontmatter(frontmatter: string): DocumentMetadata {
    const metadata: Partial<DocumentMetadata> = {}
    
    const lines = frontmatter.split('\n')
    
    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) {
        const [, key, value] = match
        
        if (key === 'keywords' || key === 'tags') {
          // Parse array values
          const arrayMatch = value.match(/\[(.*)\]/)
          if (arrayMatch) {
            const items = arrayMatch[1]
              .split(',')
              .map(item => item.trim().replace(/['"]/g, ''))
            metadata[key as keyof DocumentMetadata] = items as any
          }
        } else {
          metadata[key as keyof DocumentMetadata] = value.replace(/['"]/g, '') as any
        }
      }
    }
    
    return {
      title: metadata.title || 'Untitled',
      description: metadata.description || '',
      keywords: metadata.keywords || [],
      author: metadata.author,
      date: metadata.date,
      category: metadata.category,
      tags: metadata.tags
    }
  }
}