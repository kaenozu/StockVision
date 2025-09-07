/**
 * Azure Translator Service
 * Microsoft Azure Translator API integration for documentation
 */

import { TranslationService, TranslationResult, TranslationOptions } from './translation-service-interface'

export interface AzureTranslatorConfig {
  subscriptionKey: string
  endpoint?: string
  region: string
  maxRetries?: number
  timeout?: number
}

export class AzureTranslatorService implements TranslationService {
  private config: AzureTranslatorConfig
  private apiUrl: string
  private rateLimiter: RateLimiter

  constructor(config: AzureTranslatorConfig) {
    this.config = {
      endpoint: 'https://api.cognitive.microsofttranslator.com',
      maxRetries: 3,
      timeout: 30000,
      ...config
    }
    
    this.apiUrl = this.config.endpoint!
    this.rateLimiter = new RateLimiter(2000000, 3600000) // 2M chars per hour
  }

  /**
   * Translate text using Azure Translator API
   */
  async translate(
    text: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<TranslationResult> {
    await this.rateLimiter.waitForToken(text.length)

    const params = new URLSearchParams({
      'api-version': '3.0',
      to: this.mapLanguageCode(targetLanguage)
    })

    if (options?.sourceLanguage) {
      params.append('from', this.mapLanguageCode(options.sourceLanguage))
    }

    if (options?.category) {
      params.append('category', options.category)
    }

    if (options?.format === 'html') {
      params.append('textType', 'html')
    }

    const requestBody = [{ text }]

    try {
      const response = await this.makeRequest('/translate', params, requestBody)
      const translation = response[0]
      
      return {
        translatedText: translation.translations[0].text,
        detectedLanguage: translation.detectedLanguage?.language,
        confidence: translation.detectedLanguage?.score || 0.8,
        alternativeTranslations: translation.translations.slice(1).map((t: any) => ({
          text: t.text,
          confidence: 0.7
        })),
        metadata: {
          service: 'azure',
          model: 'neural',
          timestamp: new Date()
        }
      }
    } catch (error) {
      throw new TranslationError(`Azure Translator failed: ${error.message}`, error)
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
    const batchSize = 100 // Azure's batch limit
    const results: TranslationResult[] = []
    const totalLength = texts.join('').length
    await this.rateLimiter.waitForToken(totalLength)

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      
      const params = new URLSearchParams({
        'api-version': '3.0',
        to: this.mapLanguageCode(targetLanguage)
      })

      if (options?.sourceLanguage) {
        params.append('from', this.mapLanguageCode(options.sourceLanguage))
      }

      if (options?.category) {
        params.append('category', options.category)
      }

      if (options?.format === 'html') {
        params.append('textType', 'html')
      }

      const requestBody = batch.map(text => ({ text }))

      try {
        const response = await this.makeRequest('/translate', params, requestBody)
        
        for (const translation of response) {
          results.push({
            translatedText: translation.translations[0].text,
            detectedLanguage: translation.detectedLanguage?.language,
            confidence: translation.detectedLanguage?.score || 0.8,
            alternativeTranslations: translation.translations.slice(1).map((t: any) => ({
              text: t.text,
              confidence: 0.7
            })),
            metadata: {
              service: 'azure',
              model: 'neural',
              timestamp: new Date()
            }
          })
        }
      } catch (error) {
        throw new TranslationError(`Azure batch translation failed: ${error.message}`, error)
      }
    }

    return results
  }

  /**
   * Detect language of text
   */
  async detectLanguage(text: string): Promise<{ language: string; confidence: number }> {
    const params = new URLSearchParams({
      'api-version': '3.0'
    })

    const requestBody = [{ text }]

    try {
      const response = await this.makeRequest('/detect', params, requestBody)
      const detection = response[0]
      
      return {
        language: this.unmapLanguageCode(detection.language),
        confidence: detection.score
      }
    } catch (error) {
      throw new TranslationError(`Language detection failed: ${error.message}`, error)
    }
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    const params = new URLSearchParams({
      'api-version': '3.0',
      scope: 'translation'
    })

    try {
      const response = await this.makeRequest('/languages', params, null, 'GET')
      
      return Object.keys(response.translation).map(code => this.unmapLanguageCode(code))
    } catch (error) {
      throw new TranslationError(`Failed to get supported languages: ${error.message}`, error)
    }
  }

  /**
   * Transliterate text (convert script)
   */
  async transliterate(
    text: string,
    language: string,
    fromScript: string,
    toScript: string
  ): Promise<string> {
    const params = new URLSearchParams({
      'api-version': '3.0',
      language: this.mapLanguageCode(language),
      fromScript,
      toScript
    })

    const requestBody = [{ text }]

    try {
      const response = await this.makeRequest('/transliterate', params, requestBody)
      return response[0].text
    } catch (error) {
      throw new TranslationError(`Transliteration failed: ${error.message}`, error)
    }
  }

  /**
   * Break sentence into smaller parts
   */
  async breakSentence(text: string, language?: string): Promise<string[]> {
    const params = new URLSearchParams({
      'api-version': '3.0'
    })

    if (language) {
      params.append('language', this.mapLanguageCode(language))
    }

    const requestBody = [{ text }]

    try {
      const response = await this.makeRequest('/breaksentence', params, requestBody)
      const sentLengths = response[0].sentLen
      
      const sentences: string[] = []
      let start = 0
      
      for (const length of sentLengths) {
        sentences.push(text.substring(start, start + length))
        start += length
      }
      
      return sentences
    } catch (error) {
      throw new TranslationError(`Sentence breaking failed: ${error.message}`, error)
    }
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest(
    endpoint: string,
    params: URLSearchParams,
    body: any,
    method: string = 'POST'
  ): Promise<any> {
    const url = `${this.apiUrl}${endpoint}?${params.toString()}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.config.maxRetries!; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout!)

        const requestOptions: RequestInit = {
          method,
          headers: {
            'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            'Ocp-Apim-Subscription-Region': this.config.region,
            'Content-Type': 'application/json',
            'X-ClientTraceId': this.generateTraceId()
          },
          signal: controller.signal
        }

        if (body) {
          requestOptions.body = JSON.stringify(body)
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
   * Generate trace ID for request tracking
   */
  private generateTraceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  /**
   * Map language codes to Azure's format
   */
  private mapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'zh': 'zh-Hans',
      'zh-tw': 'zh-Hant',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'pt': 'pt',
      'pt-br': 'pt-BR',
      'ru': 'ru',
      'it': 'it',
      'ar': 'ar',
      'hi': 'hi',
      'th': 'th',
      'vi': 'vi',
      'tr': 'tr',
      'nl': 'nl',
      'sv': 'sv',
      'da': 'da',
      'no': 'nb',
      'fi': 'fi',
      'pl': 'pl',
      'cs': 'cs',
      'hu': 'hu',
      'bg': 'bg',
      'ro': 'ro',
      'sk': 'sk',
      'sl': 'sl',
      'hr': 'hr',
      'sr': 'sr',
      'uk': 'uk',
      'el': 'el',
      'he': 'he'
    }

    return mapping[code] || code
  }

  /**
   * Unmap language codes from Azure's format
   */
  private unmapLanguageCode(code: string): string {
    const mapping: Record<string, string> = {
      'zh-Hans': 'zh',
      'zh-Hant': 'zh-tw',
      'pt-BR': 'pt-br',
      'nb': 'no'
    }

    return mapping[code] || code
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Character-based rate limiter for Azure Translator
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