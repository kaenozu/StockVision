/**
 * Translation Service Factory
 * Factory for creating and managing multiple translation services
 */

import { TranslationService } from './translation-service-interface'
import { GoogleTranslateService, GoogleTranslateConfig } from './google-translate-service'
import { DeepLService, DeepLConfig } from './deepl-service'
import { AzureTranslatorService, AzureTranslatorConfig } from './azure-translator-service'

export type TranslationProvider = 'google' | 'deepl' | 'azure'

export interface TranslationServiceConfigs {
  google?: GoogleTranslateConfig
  deepl?: DeepLConfig
  azure?: AzureTranslatorConfig
}

export interface TranslationServiceOptions {
  fallbackOrder?: TranslationProvider[]
  preferredProvider?: TranslationProvider
  autoFallback?: boolean
  maxRetries?: number
}

export class TranslationServiceFactory {
  private services: Map<TranslationProvider, TranslationService> = new Map()
  private configs: TranslationServiceConfigs
  private options: TranslationServiceOptions

  constructor(configs: TranslationServiceConfigs, options: TranslationServiceOptions = {}) {
    this.configs = configs
    this.options = {
      fallbackOrder: ['google', 'deepl', 'azure'],
      preferredProvider: 'google',
      autoFallback: true,
      maxRetries: 3,
      ...options
    }

    this.initializeServices()
  }

  /**
   * Initialize available translation services
   */
  private initializeServices(): void {
    if (this.configs.google) {
      this.services.set('google', new GoogleTranslateService(this.configs.google))
    }

    if (this.configs.deepl) {
      this.services.set('deepl', new DeepLService(this.configs.deepl))
    }

    if (this.configs.azure) {
      this.services.set('azure', new AzureTranslatorService(this.configs.azure))
    }

    if (this.services.size === 0) {
      throw new Error('No translation services configured')
    }
  }

  /**
   * Get translation service by provider
   */
  getService(provider: TranslationProvider): TranslationService {
    const service = this.services.get(provider)
    if (!service) {
      throw new Error(`Translation service '${provider}' not configured`)
    }
    return service
  }

  /**
   * Get preferred translation service
   */
  getPreferredService(): TranslationService {
    const preferred = this.options.preferredProvider!
    if (this.services.has(preferred)) {
      return this.services.get(preferred)!
    }

    // Fallback to first available service
    return this.services.values().next().value
  }

  /**
   * Get all available services
   */
  getAvailableProviders(): TranslationProvider[] {
    return Array.from(this.services.keys())
  }

  /**
   * Translate with fallback support
   */
  async translateWithFallback(
    text: string,
    targetLanguage: string,
    options?: any
  ): Promise<{ result: any; provider: TranslationProvider }> {
    if (!this.options.autoFallback) {
      const service = this.getPreferredService()
      const result = await service.translate(text, targetLanguage, options)
      return { result, provider: this.getProviderForService(service) }
    }

    const providers = this.getFallbackOrder()
    let lastError: Error | null = null

    for (const provider of providers) {
      if (!this.services.has(provider)) continue

      try {
        const service = this.services.get(provider)!
        const result = await service.translate(text, targetLanguage, options)
        return { result, provider }
      } catch (error) {
        lastError = error as Error
        console.warn(`Translation failed with ${provider}:`, error.message)
        continue
      }
    }

    throw new Error(`All translation services failed. Last error: ${lastError?.message}`)
  }

  /**
   * Batch translate with fallback support
   */
  async batchTranslateWithFallback(
    texts: string[],
    targetLanguage: string,
    options?: any
  ): Promise<{ results: any[]; provider: TranslationProvider }> {
    if (!this.options.autoFallback) {
      const service = this.getPreferredService()
      const results = await service.batchTranslate(texts, targetLanguage, options)
      return { results, provider: this.getProviderForService(service) }
    }

    const providers = this.getFallbackOrder()
    let lastError: Error | null = null

    for (const provider of providers) {
      if (!this.services.has(provider)) continue

      try {
        const service = this.services.get(provider)!
        const results = await service.batchTranslate(texts, targetLanguage, options)
        return { results, provider }
      } catch (error) {
        lastError = error as Error
        console.warn(`Batch translation failed with ${provider}:`, error.message)
        continue
      }
    }

    throw new Error(`All translation services failed. Last error: ${lastError?.message}`)
  }

  /**
   * Detect language with fallback support
   */
  async detectLanguageWithFallback(
    text: string
  ): Promise<{ result: { language: string; confidence: number }; provider: TranslationProvider }> {
    const providers = this.getFallbackOrder()
    let lastError: Error | null = null

    for (const provider of providers) {
      if (!this.services.has(provider)) continue

      try {
        const service = this.services.get(provider)!
        const result = await service.detectLanguage(text)
        return { result, provider }
      } catch (error) {
        lastError = error as Error
        console.warn(`Language detection failed with ${provider}:`, error.message)
        continue
      }
    }

    throw new Error(`All translation services failed. Last error: ${lastError?.message}`)
  }

  /**
   * Get supported languages from all services
   */
  async getAllSupportedLanguages(): Promise<Record<TranslationProvider, string[]>> {
    const results: Record<string, string[]> = {}

    for (const [provider, service] of this.services) {
      try {
        results[provider] = await service.getSupportedLanguages()
      } catch (error) {
        console.warn(`Failed to get supported languages for ${provider}:`, error.message)
        results[provider] = []
      }
    }

    return results as Record<TranslationProvider, string[]>
  }

  /**
   * Get common supported languages across all services
   */
  async getCommonSupportedLanguages(): Promise<string[]> {
    const allLanguages = await this.getAllSupportedLanguages()
    const providers = Object.keys(allLanguages)

    if (providers.length === 0) return []
    if (providers.length === 1) return allLanguages[providers[0]] || []

    // Find intersection of all language arrays
    return allLanguages[providers[0]].filter(lang =>
      providers.every(provider => allLanguages[provider].includes(lang))
    )
  }

  /**
   * Health check for all services
   */
  async healthCheck(): Promise<Record<TranslationProvider, boolean>> {
    const results: Record<string, boolean> = {}

    for (const [provider, service] of this.services) {
      try {
        // Simple test translation
        await service.translate('Hello', 'es')
        results[provider] = true
      } catch (error) {
        results[provider] = false
      }
    }

    return results as Record<TranslationProvider, boolean>
  }

  /**
   * Get service usage statistics (if supported)
   */
  async getUsageStatistics(): Promise<Record<TranslationProvider, any>> {
    const results: Record<string, any> = {}

    for (const [provider, service] of this.services) {
      try {
        if ('getUsage' in service && typeof service.getUsage === 'function') {
          results[provider] = await service.getUsage()
        } else {
          results[provider] = { status: 'Usage stats not supported' }
        }
      } catch (error) {
        results[provider] = { error: error.message }
      }
    }

    return results as Record<TranslationProvider, any>
  }

  /**
   * Load balance translation requests
   */
  async loadBalanceTranslate(
    text: string,
    targetLanguage: string,
    options?: any
  ): Promise<{ result: any; provider: TranslationProvider }> {
    const availableProviders = this.getAvailableProviders()
    
    // Simple round-robin load balancing
    const selectedProvider = availableProviders[Math.floor(Math.random() * availableProviders.length)]
    
    try {
      const service = this.services.get(selectedProvider)!
      const result = await service.translate(text, targetLanguage, options)
      return { result, provider: selectedProvider }
    } catch (error) {
      // Fallback on error
      return this.translateWithFallback(text, targetLanguage, options)
    }
  }

  /**
   * Get fallback order
   */
  private getFallbackOrder(): TranslationProvider[] {
    return this.options.fallbackOrder || Array.from(this.services.keys())
  }

  /**
   * Get provider name for a service instance
   */
  private getProviderForService(service: TranslationService): TranslationProvider {
    for (const [provider, s] of this.services) {
      if (s === service) return provider
    }
    return 'google' // fallback
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(provider: TranslationProvider, config: any): void {
    if (!this.services.has(provider)) {
      throw new Error(`Translation service '${provider}' not configured`)
    }

    // Remove existing service
    this.services.delete(provider)

    // Create new service with updated config
    switch (provider) {
      case 'google':
        this.services.set(provider, new GoogleTranslateService(config))
        break
      case 'deepl':
        this.services.set(provider, new DeepLService(config))
        break
      case 'azure':
        this.services.set(provider, new AzureTranslatorService(config))
        break
    }
  }

  /**
   * Remove a translation service
   */
  removeService(provider: TranslationProvider): void {
    this.services.delete(provider)
    
    if (this.services.size === 0) {
      throw new Error('Cannot remove last translation service')
    }
  }

  /**
   * Add a new translation service
   */
  addService(provider: TranslationProvider, config: any): void {
    switch (provider) {
      case 'google':
        this.services.set(provider, new GoogleTranslateService(config))
        break
      case 'deepl':
        this.services.set(provider, new DeepLService(config))
        break
      case 'azure':
        this.services.set(provider, new AzureTranslatorService(config))
        break
      default:
        throw new Error(`Unknown translation provider: ${provider}`)
    }
  }
}