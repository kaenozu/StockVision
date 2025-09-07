/**
 * DeepL API Service
 * DeepL Translation API integration for documentation
 */

import { TranslationService, TranslationResult, TranslationOptions } from './translation-service-interface'

export interface DeepLConfig {
  apiKey: string
  isPro?: boolean
  maxRetries?: number
  timeout?: number
}

export class DeepLService implements TranslationService {
  private config: DeepLConfig
  private apiUrl: string
  private rateLimiter: RateLimiter

  constructor(config: DeepLConfig) {
    this.config = {
      isPro: false,
      maxRetries: 3,
      timeout: 30000,
      ...config
    }
    
    this.apiUrl = this.config.isPro 
      ? 'https://api.deepl.com/v2' 
      : 'https://api-free.deepl.com/v2'
    this.rateLimiter = new RateLimiter(500000, 3600000) // 500,000 chars per hour
  }

  /**
   * Translate text using DeepL API
   */
  async translate(
    text: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<TranslationResult> {
    await this.rateLimiter.waitForToken(text.length)

    const params = new URLSearchParams({
      text,
      target_lang: this.mapLanguageCode(targetLanguage).toUpperCase(),
      preserve_formatting: '1',
      tag_handling: options?.format === 'html' ? 'html' : 'xml'
    })

    if (options?.sourceLanguage) {
      params.append('source_lang', this.mapLanguageCode(options.sourceLanguage).toUpperCase())
    }

    if (options?.formality) {
      params.append('formality', options.formality)
    }

    try {
      const response = await this.makeRequest('/translate', params)
      const translation = response.translations[0]
      
      return {
        translatedText: translation.text,
        detectedLanguage: translation.detected_source_language?.toLowerCase(),
        confidence: this.calculateConfidence(translation),
        alternativeTranslations: [],
        metadata: {
          service: 'deepl',
          model: 'neural',
          timestamp: new Date()
        }
      }
    } catch (error) {
      throw new TranslationError(`DeepL translation failed: ${error.message}`, error)
    }
  }

  /**
   * Batch translate multiple texts
   */
  async batchTranslate(
    texts: string[],
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<TranslationResult[]> {
    const totalLength = texts.join('').length
    await this.rateLimiter.waitForToken(totalLength)

    const params = new URLSearchParams({
      target_lang: this.mapLanguageCode(targetLanguage).toUpperCase(),
      preserve_formatting: '1',
      tag_handling: options?.format === 'html' ? 'html' : 'xml'
    })

    // Add all texts
    texts.forEach(text => params.append('text', text))

    if (options?.sourceLanguage) {
      params.append('source_lang', this.mapLanguageCode(options.sourceLanguage).toUpperCase())
    }

    if (options?.formality) {
      params.append('formality', options.formality)
    }

    try {
      const response = await this.makeRequest('/translate', params)
      
      return response.translations.map((translation: any) => ({
        translatedText: translation.text,
        detectedLanguage: translation.detected_source_language?.toLowerCase(),
        confidence: this.calculateConfidence(translation),
        alternativeTranslations: [],
        metadata: {
          service: 'deepl',
          model: 'neural',
          timestamp: new Date()
        }
      }))
    } catch (error) {
      throw new TranslationError(`DeepL batch translation failed: ${error.message}`, error)
    }
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    // DeepL doesn't have dedicated language detection
    // We'll use a small translation to detect language
    try {
      const result = await this.translate(text.substring(0, 100), 'en')
      return {
        language: result.detectedLanguage || 'unknown',
        confidence: result.confidence || 0.5
      }
    } catch (error) {
      throw new TranslationError(`Language detection failed: ${error.message}`, error)
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      const response = await this.makeRequest('/languages', new URLSearchParams({ type: 'target' }), 'GET')
      
      return response.map((lang: any) => this.unmapLanguageCode(lang.language))
    } catch (error) {
      throw new TranslationError(`Failed to get supported languages: ${error.message}`, error)
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<{ characterCount: number; characterLimit: number }> {
    try {
      const response = await this.makeRequest('/usage', new URLSearchParams(), 'GET')
      
      return {
        characterCount: response.character_count,
        characterLimit: response.character_limit
      }
    } catch (error) {
      throw new TranslationError(`Failed to get usage statistics: ${error.message}`, error)
    }
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    params: URLSearchParams,
    method: string = 'POST'
  ): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)

        const requestOptions: RequestInit = {
          method,
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.config.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          signal: controller.signal
        }

        if (method === 'POST') {
          requestOptions.body = params
        } else {
          url += '?' + params.toString()
        }

        const response = await fetch(url, requestOptions)
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorBody = await response.text()
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.maxRetries! - 1) {
          await this.delay(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError
  }

  /**
   * Map language codes to DeepL's format
   */
  private mapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'en': 'EN',
      'ja': 'JA',
      'ko': 'KO',
      'zh': 'ZH',
      'es': 'ES',
      'fr': 'FR',
      'de': 'DE',
      'pt': 'PT-PT',
      'pt-br': 'PT-BR',
      'ru': 'RU',
      'it': 'IT',
      'nl': 'NL',
      'pl': 'PL',
      'sv': 'SV',
      'da': 'DA',
      'fi': 'FI',
      'no': 'NB',
      'cs': 'CS',
      'sk': 'SK',
      'sl': 'SL',
      'et': 'ET',
      'lv': 'LV',
      'lt': 'LT',
      'bg': 'BG',
      'hu': 'HU',
      'ro': 'RO',
      'el': 'EL',
      'tr': 'TR'
    }

    return mapping[code] || code.toUpperCase()
  }

  /**
   * Unmap language codes from DeepL's format
   */
  private unmapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'EN': 'en',
      'JA': 'ja',
      'KO': 'ko',
      'ZH': 'zh',
      'ES': 'es',
      'FR': 'fr',
      'DE': 'de',
      'PT-PT': 'pt',
      'PT-BR': 'pt-br',
      'RU': 'ru',
      'IT': 'it',
      'NL': 'nl',
      'PL': 'pl',
      'SV': 'sv',
      'DA': 'da',
      'FI': 'fi',
      'NB': 'no',
      'CS': 'cs',
      'SK': 'sk',
      'SL': 'sl',
      'ET': 'et',
      'LV': 'lv',
      'LT': 'lt',
      'BG': 'bg',
      'HU': 'hu',
      'RO': 'ro',
      'EL': 'el',
      'TR': 'tr'
    }

    return mapping[code] || code.toLowerCase()
  }

  /**
   * Calculate translation confidence score
   */
  private calculateConfidence(translation: any): number {
    // DeepL provides high-quality translations
    let confidence = 0.95

    // Adjust based on detected source language
    if (translation.detected_source_language) {
      confidence = Math.min(confidence + 0.05, 1.0)
    }

    return confidence
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Character-based rate limiter for DeepL
 */
class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number
  private lastRefill: number

  constructor(maxTokens: number, refillInterval: number) {
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.refillRate = refillInterval
    this.lastRefill = Date.now()
  }

  async waitForToken(characterCount: number = 1): Promise<void> {
    this.refill()

    if (this.tokens < characterCount) {
      const waitTime = this.refillRate - (Date.now() - this.lastRefill)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.refill()
    }

    this.tokens -= characterCount
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill

    if (timePassed >= this.refillRate) {
      this.tokens = this.maxTokens
      this.lastRefill = now
    }
  }
}

/**
 * Translation error class
 */
export class TranslationError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'TranslationError'
  }
}