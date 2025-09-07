/**
 * Documentation I18n Manager
 * Comprehensive internationalization system for documentation
 */

import { TranslationManager, TranslationConfig } from './translation-manager'
import { DocumentTranslator } from './doc-translator'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface I18nConfig extends TranslationConfig {
  contentDirectory: string
  templateDirectory: string
  staticResourcesDirectory: string
  buildDirectory: string
  localizableAssets: {
    images: boolean
    videos: boolean
    downloads: boolean
  }
  urlStrategy: 'prefix' | 'subdomain' | 'domain'
  seo: {
    generateSitemaps: boolean
    hrefLang: boolean
    localizedMetadata: boolean
  }
}

export interface LocalizedSite {
  language: string
  baseUrl: string
  title: string
  description: string
  directory: string
  pages: LocalizedPage[]
  assets: LocalizedAsset[]
  navigation: NavigationItem[]
}

export interface LocalizedPage {
  id: string
  originalPath: string
  localizedPath: string
  title: string
  description: string
  content: string
  metadata: PageMetadata
  lastModified: Date
}

export interface LocalizedAsset {
  type: 'image' | 'video' | 'download' | 'document'
  originalPath: string
  localizedPath: string
  altText?: string
  caption?: string
}

export interface NavigationItem {
  label: string
  url: string
  children?: NavigationItem[]
  icon?: string
}

export interface PageMetadata {
  keywords: string[]
  author: string
  category: string
  tags: string[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  readingTime?: number
  lastUpdated: Date
}

export class DocumentI18nManager {
  private translationManager: TranslationManager
  private documentTranslator: DocumentTranslator
  private config: I18nConfig
  private sites = new Map<string, LocalizedSite>()

  constructor(config: I18nConfig) {
    this.config = config
    this.translationManager = new TranslationManager(config)
    this.documentTranslator = new DocumentTranslator(this.translationManager)
  }

  /**
   * Initialize i18n system
   */
  async initialize(): Promise<void> {
    console.log('🌐 Initializing i18n system...')

    // Load existing translations
    await this.translationManager.loadTranslations()

    // Setup directory structure
    await this.setupDirectoryStructure()

    // Load navigation templates
    await this.loadNavigationTemplates()

    console.log('✅ I18n system initialized')
  }

  /**
   * Build all localized sites
   */
  async buildAllSites(): Promise<void> {
    console.log('🏗️ Building all localized sites...')

    const languages = this.config.supportedLanguages

    for (const language of languages) {
      await this.buildSiteForLanguage(language)
    }

    // Generate cross-language resources
    await this.generateSitemaps()
    await this.generateLanguageSwitcher()
    await this.generateHrefLangTags()

    console.log('✅ All localized sites built')
  }

  /**
   * Build site for specific language
   */
  private async buildSiteForLanguage(language: string): Promise<void> {
    console.log(`🔨 Building site for ${language}...`)

    const site: LocalizedSite = {
      language,
      baseUrl: this.generateBaseUrl(language),
      title: this.getLocalizedSiteTitle(language),
      description: this.getLocalizedSiteDescription(language),
      directory: path.join(this.config.buildDirectory, language),
      pages: [],
      assets: [],
      navigation: await this.buildNavigation(language)
    }

    // Ensure directory exists
    await fs.mkdir(site.directory, { recursive: true })

    // Build pages
    await this.buildPages(site)

    // Copy and localize assets
    await this.buildAssets(site)

    // Generate index pages
    await this.generateIndexPages(site)

    // Generate search index for this language
    await this.generateSearchIndex(site)

    this.sites.set(language, site)

    console.log(`✅ Site built for ${language} at ${site.directory}`)
  }

  /**
   * Build all pages for a language
   */
  private async buildPages(site: LocalizedSite): Promise<void> {
    const contentDir = this.config.contentDirectory
    const files = await this.findMarkdownFiles(contentDir)

    for (const filePath of files) {
      try {
        const page = await this.buildPage(filePath, site.language)
        site.pages.push(page)

        // Write localized page
        const outputPath = path.join(site.directory, page.localizedPath)
        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        
        const html = await this.renderPageTemplate(page, site)
        await fs.writeFile(outputPath, html)

      } catch (error) {
        console.warn(`Failed to build page ${filePath} for ${site.language}:`, error)
      }
    }
  }

  /**
   * Build single page
   */
  private async buildPage(filePath: string, language: string): Promise<LocalizedPage> {
    const content = await fs.readFile(filePath, 'utf-8')
    const translatedDoc = await this.documentTranslator.translateDocument(
      filePath,
      language,
      this.config.buildDirectory
    )

    const relativePath = path.relative(this.config.contentDirectory, filePath)
    const localizedPath = this.generateLocalizedPath(relativePath, language)

    return {
      id: this.generatePageId(filePath),
      originalPath: filePath,
      localizedPath,
      title: translatedDoc.metadata.title,
      description: translatedDoc.metadata.description,
      content: translatedDoc.content,
      metadata: {
        keywords: translatedDoc.metadata.keywords,
        author: translatedDoc.metadata.author || '',
        category: translatedDoc.metadata.category || '',
        tags: translatedDoc.metadata.tags || [],
        difficulty: translatedDoc.metadata.difficulty,
        readingTime: this.calculateReadingTime(translatedDoc.content),
        lastUpdated: new Date()
      },
      lastModified: new Date()
    }
  }

  /**
   * Build navigation for language
   */
  private async buildNavigation(language: string): Promise<NavigationItem[]> {
    const navigationTemplate = await this.loadNavigationTemplate()
    return this.translateNavigation(navigationTemplate, language)
  }

  /**
   * Build assets for language
   */
  private async buildAssets(site: LocalizedSite): Promise<void> {
    if (!this.config.localizableAssets) return

    const assetsDir = this.config.staticResourcesDirectory
    if (!await this.directoryExists(assetsDir)) return

    const files = await this.findAssetFiles(assetsDir)

    for (const filePath of files) {
      try {
        const asset = await this.buildAsset(filePath, site.language)
        site.assets.push(asset)

        // Copy asset to localized directory
        const outputPath = path.join(site.directory, 'assets', asset.localizedPath)
        await fs.mkdir(path.dirname(outputPath), { recursive: true })
        await fs.copyFile(asset.originalPath, outputPath)

      } catch (error) {
        console.warn(`Failed to build asset ${filePath} for ${site.language}:`, error)
      }
    }
  }

  /**
   * Build single asset
   */
  private async buildAsset(filePath: string, language: string): Promise<LocalizedAsset> {
    const ext = path.extname(filePath).toLowerCase()
    const type = this.getAssetType(ext)
    
    const relativePath = path.relative(this.config.staticResourcesDirectory, filePath)
    const localizedPath = this.generateLocalizedAssetPath(relativePath, language, type)

    const asset: LocalizedAsset = {
      type,
      originalPath: filePath,
      localizedPath
    }

    // Add localized metadata for images
    if (type === 'image') {
      const altTextKey = `asset.${path.basename(filePath, ext)}.alt`
      const captionKey = `asset.${path.basename(filePath, ext)}.caption`
      
      asset.altText = this.translationManager.getTranslation(altTextKey, language, 'assets')
      asset.caption = this.translationManager.getTranslation(captionKey, language, 'assets')
    }

    return asset
  }

  /**
   * Render page template
   */
  private async renderPageTemplate(page: LocalizedPage, site: LocalizedSite): Promise<string> {
    const template = await this.loadPageTemplate()
    
    // Replace template variables
    let html = template
      .replace(/{{LANG}}/g, site.language)
      .replace(/{{TITLE}}/g, page.title)
      .replace(/{{DESCRIPTION}}/g, page.description)
      .replace(/{{CONTENT}}/g, page.content)
      .replace(/{{BASE_URL}}/g, site.baseUrl)
      .replace(/{{SITE_TITLE}}/g, site.title)
      .replace(/{{SITE_DESCRIPTION}}/g, site.description)
      .replace(/{{KEYWORDS}}/g, page.metadata.keywords.join(', '))
      .replace(/{{AUTHOR}}/g, page.metadata.author)
      .replace(/{{LAST_UPDATED}}/g, page.metadata.lastUpdated.toISOString())

    // Add navigation
    const navigationHtml = this.renderNavigation(site.navigation, site.language)
    html = html.replace(/{{NAVIGATION}}/g, navigationHtml)

    // Add language switcher
    const languageSwitcherHtml = this.renderLanguageSwitcher(page.id, site.language)
    html = html.replace(/{{LANGUAGE_SWITCHER}}/g, languageSwitcherHtml)

    // Add SEO tags
    const seoTags = this.generateSeoTags(page, site)
    html = html.replace(/{{SEO_TAGS}}/g, seoTags)

    return html
  }

  /**
   * Generate SEO tags
   */
  private generateSeoTags(page: LocalizedPage, site: LocalizedSite): string {
    const tags: string[] = []

    // Basic meta tags
    tags.push(`<meta name="description" content="${page.description}">`)
    tags.push(`<meta name="keywords" content="${page.metadata.keywords.join(', ')}">`)
    tags.push(`<meta name="author" content="${page.metadata.author}">`)
    tags.push(`<meta name="language" content="${site.language}">`)

    // Open Graph tags
    tags.push(`<meta property="og:title" content="${page.title}">`)
    tags.push(`<meta property="og:description" content="${page.description}">`)
    tags.push(`<meta property="og:url" content="${site.baseUrl}${page.localizedPath}">`)
    tags.push(`<meta property="og:locale" content="${this.getLocaleCode(site.language)}">`)

    // Twitter Card tags
    tags.push(`<meta name="twitter:title" content="${page.title}">`)
    tags.push(`<meta name="twitter:description" content="${page.description}">`)

    // Canonical URL
    tags.push(`<link rel="canonical" href="${site.baseUrl}${page.localizedPath}">`)

    // Hreflang tags
    if (this.config.seo.hrefLang) {
      for (const [lang, localizedSite] of this.sites) {
        const alternatePage = localizedSite.pages.find(p => p.id === page.id)
        if (alternatePage) {
          tags.push(`<link rel="alternate" hreflang="${lang}" href="${localizedSite.baseUrl}${alternatePage.localizedPath}">`)
        }
      }
    }

    return tags.join('\n    ')
  }

  /**
   * Generate sitemaps for all languages
   */
  private async generateSitemaps(): Promise<void> {
    if (!this.config.seo.generateSitemaps) return

    console.log('🗺️ Generating sitemaps...')

    // Generate sitemap for each language
    for (const [language, site] of this.sites) {
      const sitemap = this.generateSitemapXml(site)
      const sitemapPath = path.join(site.directory, 'sitemap.xml')
      await fs.writeFile(sitemapPath, sitemap)
    }

    // Generate sitemap index
    const sitemapIndex = this.generateSitemapIndex()
    const indexPath = path.join(this.config.buildDirectory, 'sitemap.xml')
    await fs.writeFile(indexPath, sitemapIndex)

    console.log('✅ Sitemaps generated')
  }

  /**
   * Generate sitemap XML for a site
   */
  private generateSitemapXml(site: LocalizedSite): string {
    const urls = site.pages.map(page => {
      const url = `${site.baseUrl}${page.localizedPath}`
      const lastmod = page.lastModified.toISOString().split('T')[0]
      
      return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
  }

  /**
   * Generate sitemap index
   */
  private generateSitemapIndex(): string {
    const sitemaps = Array.from(this.sites.values()).map(site => {
      return `  <sitemap>
    <loc>${site.baseUrl}/sitemap.xml</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`
    }).join('\n')

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`
  }

  /**
   * Generate language switcher
   */
  private async generateLanguageSwitcher(): Promise<void> {
    console.log('🔄 Generating language switcher...')

    const switcherData = {
      languages: Array.from(this.sites.values()).map(site => ({
        code: site.language,
        name: this.getLanguageDisplayName(site.language),
        url: site.baseUrl
      }))
    }

    const switcherPath = path.join(this.config.buildDirectory, 'language-switcher.json')
    await fs.writeFile(switcherPath, JSON.stringify(switcherData, null, 2))

    console.log('✅ Language switcher generated')
  }

  // Helper methods
  private async setupDirectoryStructure(): Promise<void> {
    const dirs = [
      this.config.buildDirectory,
      this.config.translationsPath,
      path.join(this.config.buildDirectory, 'assets')
    ]

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  private generateBaseUrl(language: string): string {
    switch (this.config.urlStrategy) {
      case 'prefix':
        return language === this.config.defaultLanguage 
          ? '/' 
          : `/${language}/`
      case 'subdomain':
        return language === this.config.defaultLanguage
          ? '/'
          : `https://${language}.example.com/`
      case 'domain':
        return '/' // Would be handled by different domains
      default:
        return `/${language}/`
    }
  }

  private getLocalizedSiteTitle(language: string): string {
    return this.translationManager.getTranslation('site.title', language, 'global')
  }

  private getLocalizedSiteDescription(language: string): string {
    return this.translationManager.getTranslation('site.description', language, 'global')
  }

  private generateLocalizedPath(originalPath: string, language: string): string {
    const ext = path.extname(originalPath)
    const pathWithoutExt = originalPath.replace(ext, '')
    return `${pathWithoutExt}.html`
  }

  private generateLocalizedAssetPath(
    originalPath: string, 
    language: string, 
    type: LocalizedAsset['type']
  ): string {
    if (!this.config.localizableAssets[type as keyof typeof this.config.localizableAssets]) {
      return originalPath
    }

    const ext = path.extname(originalPath)
    const pathWithoutExt = originalPath.replace(ext, '')
    return `${pathWithoutExt}.${language}${ext}`
  }

  private generatePageId(filePath: string): string {
    return Buffer.from(filePath).toString('base64')
  }

  private getAssetType(extension: string): LocalizedAsset['type'] {
    switch (extension) {
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.svg':
      case '.webp':
        return 'image'
      case '.mp4':
      case '.webm':
      case '.ogg':
        return 'video'
      case '.pdf':
      case '.doc':
      case '.docx':
        return 'document'
      default:
        return 'download'
    }
  }

  private getLocaleCode(language: string): string {
    const locales: Record<string, string> = {
      'en': 'en_US',
      'ja': 'ja_JP',
      'ko': 'ko_KR',
      'zh': 'zh_CN',
      'es': 'es_ES',
      'fr': 'fr_FR',
      'de': 'de_DE'
    }

    return locales[language] || language
  }

  private getLanguageDisplayName(language: string): string {
    const names: Record<string, string> = {
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch'
    }

    return names[language] || language
  }

  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200
    const wordCount = content.split(/\s+/).length
    return Math.ceil(wordCount / wordsPerMinute)
  }

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

  private async findAssetFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await this.findAssetFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        files.push(fullPath)
      }
    }

    return files
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir)
      return stat.isDirectory()
    } catch {
      return false
    }
  }

  // Template loading methods (would load from actual template files)
  private async loadPageTemplate(): Promise<string> {
    // This would load from a template file
    return `<!DOCTYPE html>
<html lang="{{LANG}}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - {{SITE_TITLE}}</title>
    {{SEO_TAGS}}
</head>
<body>
    <header>
        <h1>{{SITE_TITLE}}</h1>
        {{NAVIGATION}}
        {{LANGUAGE_SWITCHER}}
    </header>
    <main>
        <h1>{{TITLE}}</h1>
        <div class="content">{{CONTENT}}</div>
    </main>
</body>
</html>`
  }

  private async loadNavigationTemplate(): Promise<NavigationItem[]> {
    // This would load from a navigation config file
    return [
      { label: 'home', url: '/' },
      { label: 'documentation', url: '/docs' },
      { label: 'api', url: '/api' },
      { label: 'examples', url: '/examples' }
    ]
  }

  private translateNavigation(items: NavigationItem[], language: string): NavigationItem[] {
    return items.map(item => ({
      ...item,
      label: this.translationManager.getTranslation(item.label, language, 'navigation'),
      children: item.children ? this.translateNavigation(item.children, language) : undefined
    }))
  }

  private renderNavigation(items: NavigationItem[], language: string): string {
    const renderItem = (item: NavigationItem): string => {
      const children = item.children 
        ? `<ul>${item.children.map(renderItem).join('')}</ul>`
        : ''
      
      return `<li><a href="${item.url}">${item.label}</a>${children}</li>`
    }

    return `<nav><ul>${items.map(renderItem).join('')}</ul></nav>`
  }

  private renderLanguageSwitcher(pageId: string, currentLanguage: string): string {
    const options = Array.from(this.sites.values())
      .filter(site => site.language !== currentLanguage)
      .map(site => {
        const page = site.pages.find(p => p.id === pageId)
        const url = page ? `${site.baseUrl}${page.localizedPath}` : site.baseUrl
        
        return `<option value="${url}">${this.getLanguageDisplayName(site.language)}</option>`
      })
      .join('')

    return `<select onchange="window.location.href=this.value">
      <option value="">${this.getLanguageDisplayName(currentLanguage)}</option>
      ${options}
    </select>`
  }

  private async generateSearchIndex(site: LocalizedSite): Promise<void> {
    // Generate search index for this language
    const searchIndex = {
      language: site.language,
      documents: site.pages.map(page => ({
        id: page.id,
        title: page.title,
        content: page.content,
        url: page.localizedPath,
        category: page.metadata.category,
        tags: page.metadata.tags
      }))
    }

    const indexPath = path.join(site.directory, 'search-index.json')
    await fs.writeFile(indexPath, JSON.stringify(searchIndex, null, 2))
  }

  private async generateIndexPages(site: LocalizedSite): Promise<void> {
    // Generate category index pages
    const categories = new Set(site.pages.map(p => p.metadata.category))
    
    for (const category of categories) {
      const categoryPages = site.pages.filter(p => p.metadata.category === category)
      const indexPage = this.generateCategoryIndex(category, categoryPages, site)
      
      const indexPath = path.join(site.directory, category, 'index.html')
      await fs.mkdir(path.dirname(indexPath), { recursive: true })
      await fs.writeFile(indexPath, indexPage)
    }
  }

  private generateCategoryIndex(
    category: string, 
    pages: LocalizedPage[], 
    site: LocalizedSite
  ): string {
    const pageList = pages.map(page => 
      `<li><a href="${page.localizedPath}">${page.title}</a></li>`
    ).join('')

    return `<!DOCTYPE html>
<html lang="${site.language}">
<head>
    <title>${category} - ${site.title}</title>
</head>
<body>
    <h1>${category}</h1>
    <ul>${pageList}</ul>
</body>
</html>`
  }
}

// Default i18n configuration
export const defaultI18nConfig: I18nConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ja'],
  fallbackLanguage: 'en',
  translationsPath: './docs/i18n/translations',
  outputPath: './docs/dist/i18n',
  autoTranslate: false,
  contentDirectory: './docs/content',
  templateDirectory: './docs/templates',
  staticResourcesDirectory: './docs/assets',
  buildDirectory: './docs/build',
  localizableAssets: {
    images: true,
    videos: true,
    downloads: false
  },
  urlStrategy: 'prefix',
  seo: {
    generateSitemaps: true,
    hrefLang: true,
    localizedMetadata: true
  }
}