/**
 * Translation Manager for Documentation
 * Handles multilingual support for documentation
 */

import { TranslationServiceFactory, TranslationProvider, TranslationServiceConfigs } from './services/translation-service-factory'

export interface Translation {
  key: string
  value: string
  language: string
  namespace: string
  metadata?: {
    author?: string
    lastModified?: Date
    status?: 'draft' | 'review' | 'approved'
    context?: string
  }
}

export interface DocumentTranslation {
  id: string
  originalPath: string
  translations: Map<string, string> // language -> translated path
  metadata: {
    title: Record<string, string>
    description: Record<string, string>
    keywords: Record<string, string[]>
    lastUpdated: Record<string, Date>
  }
}

export interface TranslationConfig {
  defaultLanguage: string
  supportedLanguages: string[]
  fallbackLanguage: string
  translationsPath: string
  outputPath: string
  autoTranslate: boolean
  translationService?: TranslationProvider
  serviceConfigs?: TranslationServiceConfigs
  preferredProvider?: TranslationProvider
  fallbackProviders?: TranslationProvider[]
}

export class TranslationManager {
  private translations = new Map<string, Map<string, Translation>>()
  private documents = new Map<string, DocumentTranslation>()
  private config: TranslationConfig
  private translationServiceFactory: TranslationServiceFactory | null = null

  constructor(config: TranslationConfig) {
    this.config = config
    this.initializeTranslationServices()
  }

  /**
   * Initialize translation services
   */
  private initializeTranslationServices(): void {
    if (this.config.serviceConfigs && Object.keys(this.config.serviceConfigs).length > 0) {
      this.translationServiceFactory = new TranslationServiceFactory(
        this.config.serviceConfigs,
        {
          preferredProvider: this.config.preferredProvider || this.config.translationService,
          fallbackOrder: this.config.fallbackProviders || ['google', 'deepl', 'azure'],
          autoFallback: true
        }
      )
    }
  }

  /**
   * Load translations from files
   */
  async loadTranslations(): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')

    try {
      const translationsDir = this.config.translationsPath
      const files = await fs.readdir(translationsDir, { recursive: true })
      
      for (const file of files) {
        if (file.toString().endsWith('.json')) {
          const filePath = path.join(translationsDir, file.toString())
          const content = await fs.readFile(filePath, 'utf-8')
          const data = JSON.parse(content)
          
          const [namespace, language] = path.basename(file.toString(), '.json').split('.')
          
          if (!this.translations.has(namespace)) {
            this.translations.set(namespace, new Map())
          }
          
          const namespaceTranslations = this.translations.get(namespace)!
          
          for (const [key, value] of Object.entries(data)) {
            namespaceTranslations.set(`${language}.${key}`, {
              key,
              value: value as string,
              language,
              namespace
            })
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load translations:', error)
    }
  }

  /**
   * Get translation for a key
   */
  getTranslation(
    key: string, 
    language: string, 
    namespace: string = 'default'
  ): string {
    const translationKey = `${language}.${key}`
    const namespaceTranslations = this.translations.get(namespace)
    
    if (namespaceTranslations?.has(translationKey)) {
      return namespaceTranslations.get(translationKey)!.value
    }
    
    // Fallback to default language
    if (language !== this.config.fallbackLanguage) {
      const fallbackKey = `${this.config.fallbackLanguage}.${key}`
      if (namespaceTranslations?.has(fallbackKey)) {
        return namespaceTranslations.get(fallbackKey)!.value
      }
    }
    
    // Return key if no translation found
    return key
  }

  /**
   * Add or update translation
   */
  setTranslation(
    key: string,
    value: string,
    language: string,
    namespace: string = 'default',
    metadata?: Translation['metadata']
  ): void {
    if (!this.translations.has(namespace)) {
      this.translations.set(namespace, new Map())
    }
    
    const translationKey = `${language}.${key}`
    const namespaceTranslations = this.translations.get(namespace)!
    
    namespaceTranslations.set(translationKey, {
      key,
      value,
      language,
      namespace,
      metadata
    })
  }

  /**
   * Register document for translation
   */
  registerDocument(
    id: string,
    originalPath: string,
    metadata: DocumentTranslation['metadata']
  ): void {
    this.documents.set(id, {
      id,
      originalPath,
      translations: new Map(),
      metadata
    })
  }

  /**
   * Add translation path for document
   */
  addDocumentTranslation(
    documentId: string,
    language: string,
    translatedPath: string
  ): void {
    const document = this.documents.get(documentId)
    if (document) {
      document.translations.set(language, translatedPath)
    }
  }

  /**
   * Generate translation files
   */
  async generateTranslationFiles(): Promise<void> {
    const fs = await import('fs/promises')
    const path = await import('path')

    for (const [namespace, translations] of this.translations) {
      const languageGroups = new Map<string, Record<string, string>>()
      
      for (const translation of translations.values()) {
        if (!languageGroups.has(translation.language)) {
          languageGroups.set(translation.language, {})
        }
        
        languageGroups.get(translation.language)![translation.key] = translation.value
      }
      
      for (const [language, data] of languageGroups) {
        const fileName = `${namespace}.${language}.json`
        const filePath = path.join(this.config.translationsPath, fileName)
        
        await fs.mkdir(path.dirname(filePath), { recursive: true })
        await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      }
    }
  }

  /**
   * Auto-translate missing translations
   */
  async autoTranslate(
    fromLanguage: string,
    toLanguage: string,
    namespace?: string
  ): Promise<void> {
    if (!this.config.autoTranslate) {
      console.warn('Auto-translate is disabled')
      return
    }

    const namespacesToProcess = namespace 
      ? [namespace] 
      : Array.from(this.translations.keys())

    for (const ns of namespacesToProcess) {
      const translations = this.translations.get(ns)
      if (!translations) continue

      const sourceTranslations = new Map<string, string>()
      const targetKeys = new Set<string>()

      // Collect source translations and target keys
      for (const [key, translation] of translations) {
        const [lang, translationKey] = key.split('.', 2)
        
        if (lang === fromLanguage) {
          sourceTranslations.set(translationKey, translation.value)
        } else if (lang === toLanguage) {
          targetKeys.add(translationKey)
        }
      }

      // Find missing translations
      const missingKeys = Array.from(sourceTranslations.keys())
        .filter(key => !targetKeys.has(key))

      if (missingKeys.length > 0) {
        console.log(`Auto-translating ${missingKeys.length} keys for ${toLanguage} in ${ns}`)
        
        for (const key of missingKeys) {
          const sourceText = sourceTranslations.get(key)!
          
          try {
            const translatedText = await this.translateText(
              sourceText,
              fromLanguage,
              toLanguage
            )
            
            this.setTranslation(key, translatedText, toLanguage, ns, {
              author: 'auto-translator',
              lastModified: new Date(),
              status: 'draft'
            })
          } catch (error) {
            console.warn(`Failed to translate "${sourceText}":`, error)
          }
        }
      }
    }
  }

  /**
   * Translate text using configured service
   */
  private async translateText(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    if (this.translationServiceFactory) {
      try {
        const { result } = await this.translationServiceFactory.translateWithFallback(
          text,
          toLang,
          { sourceLanguage: fromLang }
        )
        return result.translatedText
      } catch (error) {
        console.warn('Translation service failed:', error.message)
      }
    }
    
    // Legacy fallback methods
    if (this.config.translationService === 'google') {
      return await this.googleTranslate(text, fromLang, toLang)
    } else if (this.config.translationService === 'deepl') {
      return await this.deeplTranslate(text, fromLang, toLang)
    } else if (this.config.translationService === 'azure') {
      return await this.azureTranslate(text, fromLang, toLang)
    }
    
    // Fallback: return original text with language prefix
    return `[${toLang}] ${text}`
  }

  /**
   * Google Translate integration (placeholder)
   */
  private async googleTranslate(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    // Implementation would use Google Translate API
    // For now, return a placeholder
    return `[GT:${toLang}] ${text}`
  }

  /**
   * DeepL integration (placeholder)
   */
  private async deeplTranslate(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    // Implementation would use DeepL API
    // For now, return a placeholder
    return `[DeepL:${toLang}] ${text}`
  }

  /**
   * Azure Translator integration (placeholder)
   */
  private async azureTranslate(
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<string> {
    // Implementation would use Azure Translator API
    // For now, return a placeholder
    return `[Azure:${toLang}] ${text}`
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.config.supportedLanguages
  }

  /**
   * Get available translations for a namespace
   */
  getAvailableTranslations(namespace: string): string[] {
    const translations = this.translations.get(namespace)
    if (!translations) return []
    
    const languages = new Set<string>()
    for (const [key] of translations) {
      const [language] = key.split('.', 1)
      languages.add(language)
    }
    
    return Array.from(languages)
  }

  /**
   * Export translations to different formats
   */
  async exportTranslations(
    format: 'json' | 'csv' | 'xlsx',
    outputPath: string
  ): Promise<void> {
    switch (format) {
      case 'json':
        await this.exportToJson(outputPath)
        break
      case 'csv':
        await this.exportToCsv(outputPath)
        break
      case 'xlsx':
        await this.exportToXlsx(outputPath)
        break
    }
  }

  private async exportToJson(outputPath: string): Promise<void> {
    const fs = await import('fs/promises')
    
    const exportData: Record<string, Record<string, Record<string, string>>> = {}
    
    for (const [namespace, translations] of this.translations) {
      exportData[namespace] = {}
      
      for (const translation of translations.values()) {
        if (!exportData[namespace][translation.language]) {
          exportData[namespace][translation.language] = {}
        }
        
        exportData[namespace][translation.language][translation.key] = translation.value
      }
    }
    
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2))
  }

  private async exportToCsv(outputPath: string): Promise<void> {
    const fs = await import('fs/promises')
    
    let csvContent = 'Namespace,Key,Language,Translation\n'
    
    for (const [namespace, translations] of this.translations) {
      for (const translation of translations.values()) {
        const escapedValue = translation.value.replace(/"/g, '""')
        csvContent += `"${namespace}","${translation.key}","${translation.language}","${escapedValue}"\n`
      }
    }
    
    await fs.writeFile(outputPath, csvContent)
  }

  private async exportToXlsx(outputPath: string): Promise<void> {
    // Placeholder for Excel export
    // Would use a library like 'xlsx' or 'exceljs'
    console.log('XLSX export not implemented yet')
  }

  /**
   * Get translation service factory
   */
  getTranslationServiceFactory(): TranslationServiceFactory | null {
    return this.translationServiceFactory
  }

  /**
   * Update translation service configuration
   */
  updateServiceConfig(provider: TranslationProvider, config: any): void {
    if (this.translationServiceFactory) {
      this.translationServiceFactory.updateServiceConfig(provider, config)
    } else {
      throw new Error('Translation services not initialized')
    }
  }

  /**
   * Batch translate using configured services
   */
  async batchTranslateTexts(
    texts: string[],
    fromLanguage: string,
    toLanguage: string
  ): Promise<string[]> {
    if (this.translationServiceFactory) {
      try {
        const { results } = await this.translationServiceFactory.batchTranslateWithFallback(
          texts,
          toLanguage,
          { sourceLanguage: fromLanguage }
        )
        return results.map(r => r.translatedText)
      } catch (error) {
        console.warn('Batch translation failed:', error.message)
      }
    }

    // Fallback to individual translations
    const translations: string[] = []
    for (const text of texts) {
      try {
        const translated = await this.translateText(text, fromLanguage, toLanguage)
        translations.push(translated)
      } catch (error) {
        console.warn(`Failed to translate "${text}":`, error)
        translations.push(`[FAILED] ${text}`)
      }
    }
    
    return translations
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    if (this.translationServiceFactory) {
      try {
        const { result } = await this.translationServiceFactory.detectLanguageWithFallback(text)
        return result
      } catch (error) {
        console.warn('Language detection failed:', error.message)
      }
    }

    // Fallback to simple heuristic
    return { language: 'unknown', confidence: 0.0 }
  }

  /**
   * Get health status of translation services
   */
  async getServicesHealthStatus(): Promise<Record<TranslationProvider, boolean>> {
    if (this.translationServiceFactory) {
      return await this.translationServiceFactory.healthCheck()
    }
    return {} as Record<TranslationProvider, boolean>
  }

  /**
   * Get usage statistics for translation services
   */
  async getUsageStatistics(): Promise<Record<TranslationProvider, any>> {
    if (this.translationServiceFactory) {
      return await this.translationServiceFactory.getUsageStatistics()
    }
    return {} as Record<TranslationProvider, any>
  }

  /**
   * Get all supported languages from all services
   */
  async getAllServiceSupportedLanguages(): Promise<Record<TranslationProvider, string[]>> {
    if (this.translationServiceFactory) {
      return await this.translationServiceFactory.getAllSupportedLanguages()
    }
    return {} as Record<TranslationProvider, string[]>
  }

  /**
   * Get common supported languages across all configured services
   */
  async getCommonSupportedLanguages(): Promise<string[]> {
    if (this.translationServiceFactory) {
      return await this.translationServiceFactory.getCommonSupportedLanguages()
    }
    return this.config.supportedLanguages
  }
}

// Default configuration
export const defaultTranslationConfig: TranslationConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ja', 'ko', 'zh', 'es', 'fr', 'de'],
  fallbackLanguage: 'en',
  translationsPath: './docs/i18n/translations',
  outputPath: './docs/dist/i18n',
  autoTranslate: false,
  translationService: 'google',
  preferredProvider: 'google',
  fallbackProviders: ['google', 'deepl', 'azure'],
  serviceConfigs: {
    // Service configurations should be provided by the user
    // google: { apiKey: 'your-key', projectId: 'your-project' },
    // deepl: { apiKey: 'your-key' },
    // azure: { subscriptionKey: 'your-key', region: 'your-region' }
  }
}