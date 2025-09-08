/**
 * Google Translate API Service
 * Google Cloud Translation API integration for documentation
 */

import { TranslationService, TranslationResult, TranslationOptions } from './translation-service-interface'

export interface GoogleTranslateConfig {
  apiKey: string
  projectId: string
  location?: string
  model?: 'base' | 'nmt'
  maxRetries?: number
  timeout?: number
}

export class GoogleTranslateService implements TranslationService {
  private config: GoogleTranslateConfig
  private apiUrl: string
  private rateLimiter: RateLimiter

  constructor(config: GoogleTranslateConfig) {
    this.config = {
      location: 'global',
      model: 'nmt',
      maxRetries: 3,
      timeout: 30000,
      ...config
    }
    
    this.apiUrl = `https://translation.googleapis.com/v3/projects/${this.config.projectId}/locations/${this.config.location}`
    this.rateLimiter = new RateLimiter(100, 60000) // 100 requests per minute
  }

  /**
   * Translate text using Google Translate API
   */
  async translate(
    text: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<TranslationResult> {
    await this.rateLimiter.waitForToken()

    const requestBody = {
      contents: [text],
      targetLanguageCode: this.mapLanguageCode(targetLanguage),
      sourceLanguageCode: options?.sourceLanguage ? this.mapLanguageCode(options.sourceLanguage) : undefined,
      mimeType: options?.format === 'html' ? 'text/html' : 'text/plain',
      model: this.config.model,
      glossaryConfig: options?.glossary ? {
        glossary: `projects/${this.config.projectId}/locations/${this.config.location}/glossaries/${options.glossary}`
      } : undefined
    }

    try {
      const response = await this.makeRequest('/translateText', requestBody)
      
      return {
        translatedText: response.translations[0].translatedText,
        detectedLanguage: response.translations[0].detectedLanguageCode,
        confidence: this.calculateConfidence(response),
        alternativeTranslations: [],
        metadata: {
          service: 'google',
          model: this.config.model,
          timestamp: new Date()
        }
      }
    } catch (error) {
      throw new TranslationError(`Google Translate failed: ${error.message}`, error)
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
    const batchSize = 100 // Google's batch limit
    const results: TranslationResult[] = []

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      await this.rateLimiter.waitForToken()

      const requestBody = {
        contents: batch,
        targetLanguageCode: this.mapLanguageCode(targetLanguage),
        sourceLanguageCode: options?.sourceLanguage ? this.mapLanguageCode(options.sourceLanguage) : undefined,
        mimeType: options?.format === 'html' ? 'text/html' : 'text/plain',
        model: this.config.model
      }

      try {
        const response = await this.makeRequest('/translateText', requestBody)
        
        for (const translation of response.translations) {
          results.push({
            translatedText: translation.translatedText,
            detectedLanguage: translation.detectedLanguageCode,
            confidence: this.calculateConfidence({ translations: [translation] }),
            alternativeTranslations: [],
            metadata: {
              service: 'google',
              model: this.config.model,
              timestamp: new Date()
            }
          })
        }
      } catch (error) {
        throw new TranslationError(`Batch translation failed: ${error.message}`, error)
      }
    }

    return results
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    await this.rateLimiter.waitForToken()

    const requestBody = {
      content: text,
      mimeType: 'text/plain'
    }

    try {
      const response = await this.makeRequest('/detectLanguage', requestBody)
      const detection = response.languages[0]
      
      return {
        language: this.unmapLanguageCode(detection.languageCode),
        confidence: detection.confidence
      }
    } catch (error) {
      throw new TranslationError(`Language detection failed: ${error.message}`, error)
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    await this.rateLimiter.waitForToken()

    try {
      const response = await this.makeRequest('/supportedLanguages', {
        displayLanguageCode: 'en'
      })
      
      return response.languages.map((lang: any) => this.unmapLanguageCode(lang.languageCode))
    } catch (error) {
      throw new TranslationError(`Failed to get supported languages: ${error.message}`, error)
    }
  }

  /**
   * Create or update glossary for domain-specific translations
   */
  async createGlossary(
    glossaryId: string,
    terms: Map<string, Map<string, string>>
  ): Promise<void> {
    const glossaryPath = `projects/${this.config.projectId}/locations/${this.config.location}/glossaries/${glossaryId}`
    
    // Convert terms to Google's format
    const languagePairs: any[] = []
    for (const [sourceLang, translations] of terms) {
      for (const [targetLang, translation] of translations) {
        languagePairs.push({
          sourceLanguageCode: this.mapLanguageCode(sourceLang),
          targetLanguageCode: this.mapLanguageCode(targetLang)
        })
      }
    }

    const requestBody = {
      name: glossaryPath,
      languagePairs,
      inputConfig: {
        gcsSource: {
          inputUri: `gs://${this.config.projectId}-glossaries/${glossaryId}.csv`
        }
      }
    }

    try {
      await this.makeRequest('/glossaries', requestBody, 'POST')
    } catch (error) {
      throw new TranslationError(`Failed to create glossary: ${error.message}`, error)
    }
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    body: any,
    method: string = 'POST'
  ): Promise<any> {
    const url = `${this.apiUrl}${endpoint}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await this.getAccessToken()}`,
            'x-goog-api-key': this.config.apiKey
          },
          body: JSON.stringify(body),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.maxRetries! - 1) {
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
        }
      }
    }

    throw lastError
  }

  /**
   * Get access token for authentication
   */
  private async getAccessToken(): Promise<string> {
    // In production, implement proper OAuth2 flow
    // This is a simplified version
    return this.config.apiKey
  }

  /**
   * Map language codes to Google's format
   */
  private mapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh-CN',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'pt': 'pt',
      'ru': 'ru',
      'it': 'it'
    }

    return mapping[code] || code
  }

  /**
   * Unmap language codes from Google's format
   */
  private unmapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'zh-CN': 'zh',
      'zh-TW': 'zh-tw',
      'pt-BR': 'pt-br',
      'pt-PT': 'pt'
    }

    return mapping[code] || code
  }

  /**
   * Calculate translation confidence score
   */
  private calculateConfidence(response: any): number {
    // Google doesn't provide direct confidence scores
    // Calculate based on various factors
    let confidence = 0.8 // Base confidence

    if (response.translations[0].detectedLanguageCode) {
      confidence += 0.1 // Language was detected successfully
    }

    if (response.translations[0].model === 'nmt') {
      confidence += 0.1 // Neural model is more accurate
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Rate limiter for API requests
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

  async waitForToken(): Promise<void> {
    this.refill()

    if (this.tokens <= 0) {
      const waitTime = this.refillRate - (Date.now() - this.lastRefill)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      this.refill()
    }

    this.tokens--
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