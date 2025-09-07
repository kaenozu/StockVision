#!/usr/bin/env node

/**
 * I18n CLI Tool for Documentation Translation
 * Command-line interface for managing documentation translations
 */

import { TranslationManager, defaultTranslationConfig } from './translation-manager'
import { DocumentTranslator } from './doc-translator'
import * as fs from 'fs/promises'
import * as path from 'path'

interface CLICommand {
  name: string
  description: string
  handler: (args: string[]) => Promise<void>
}

class I18nCLI {
  private translationManager: TranslationManager
  private documentTranslator: DocumentTranslator
  private commands: CLICommand[]

  constructor() {
    this.translationManager = new TranslationManager(defaultTranslationConfig)
    this.documentTranslator = new DocumentTranslator(this.translationManager)
    this.setupCommands()
  }

  private setupCommands(): void {
    this.commands = [
      {
        name: 'init',
        description: 'Initialize translation configuration',
        handler: this.handleInit.bind(this)
      },
      {
        name: 'extract',
        description: 'Extract translatable strings from documents',
        handler: this.handleExtract.bind(this)
      },
      {
        name: 'translate',
        description: 'Translate documents to target languages',
        handler: this.handleTranslate.bind(this)
      },
      {
        name: 'sync',
        description: 'Sync translations with source documents',
        handler: this.handleSync.bind(this)
      },
      {
        name: 'validate',
        description: 'Validate translation completeness',
        handler: this.handleValidate.bind(this)
      },
      {
        name: 'export',
        description: 'Export translations to various formats',
        handler: this.handleExport.bind(this)
      },
      {
        name: 'import',
        description: 'Import translations from external files',
        handler: this.handleImport.bind(this)
      },
      {
        name: 'status',
        description: 'Show translation status',
        handler: this.handleStatus.bind(this)
      },
      {
        name: 'help',
        description: 'Show help information',
        handler: this.handleHelp.bind(this)
      }
    ]
  }

  async run(args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.handleHelp([])
      return
    }

    const commandName = args[0]
    const command = this.commands.find(cmd => cmd.name === commandName)

    if (!command) {
      console.error(`❌ Unknown command: ${commandName}`)
      await this.handleHelp([])
      return
    }

    try {
      await command.handler(args.slice(1))
    } catch (error) {
      console.error(`❌ Error executing ${commandName}:`, error)
      process.exit(1)
    }
  }

  private async handleInit(args: string[]): Promise<void> {
    const configPath = args[0] || './docs/i18n/config.json'

    console.log('🔧 Initializing i18n configuration...')

    const config = {
      ...defaultTranslationConfig,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }

    await fs.mkdir(path.dirname(configPath), { recursive: true })
    await fs.writeFile(configPath, JSON.stringify(config, null, 2))

    // Create directory structure
    await fs.mkdir(config.translationsPath, { recursive: true })
    await fs.mkdir(config.outputPath, { recursive: true })

    console.log(`✅ Configuration created at ${configPath}`)
    console.log(`📁 Translation files directory: ${config.translationsPath}`)
    console.log(`📁 Output directory: ${config.outputPath}`)
  }

  private async handleExtract(args: string[]): Promise<void> {
    const inputDir = args[0] || './docs'
    const outputFile = args[1] || './docs/i18n/extracted-strings.json'

    console.log(`🔍 Extracting translatable strings from ${inputDir}...`)

    const extractor = new StringExtractor()
    const strings = await extractor.extractFromDirectory(inputDir)

    await fs.mkdir(path.dirname(outputFile), { recursive: true })
    await fs.writeFile(outputFile, JSON.stringify(strings, null, 2))

    console.log(`✅ Extracted ${strings.length} strings to ${outputFile}`)
  }

  private async handleTranslate(args: string[]): Promise<void> {
    const inputDir = args[0] || './docs'
    const targetLanguages = args[1]?.split(',') || ['ja']
    const outputDir = args[2] || './docs/dist'

    console.log(`🌐 Translating documents in ${inputDir}...`)
    console.log(`🎯 Target languages: ${targetLanguages.join(', ')}`)

    await this.translationManager.loadTranslations()

    const results = await this.documentTranslator.translateDocuments(
      inputDir,
      targetLanguages,
      outputDir
    )

    console.log(`✅ Translated ${results.length} documents`)

    // Generate language index
    await this.generateLanguageIndex(outputDir, targetLanguages)
  }

  private async handleSync(args: string[]): Promise<void> {
    const sourceDir = args[0] || './docs'
    const translationsDir = args[1] || './docs/i18n/translations'

    console.log(`🔄 Syncing translations with source documents...`)

    await this.translationManager.loadTranslations()

    // Find new or modified documents
    const sourceFiles = await this.findModifiedFiles(sourceDir)
    
    for (const file of sourceFiles) {
      console.log(`📝 Processing ${file}...`)
      // Extract new strings and update translation files
      // This would implement the sync logic
    }

    console.log(`✅ Sync completed`)
  }

  private async handleValidate(args: string[]): Promise<void> {
    const translationsDir = args[0] || './docs/i18n/translations'

    console.log(`✅ Validating translations...`)

    await this.translationManager.loadTranslations()

    const validator = new TranslationValidator(this.translationManager)
    const report = await validator.validate(translationsDir)

    console.log(`📊 Validation Report:`)
    console.log(`  Total languages: ${report.languages.length}`)
    console.log(`  Complete translations: ${report.completeTranslations}`)
    console.log(`  Missing translations: ${report.missingTranslations}`)
    console.log(`  Outdated translations: ${report.outdatedTranslations}`)

    if (report.issues.length > 0) {
      console.log(`⚠️  Issues found:`)
      for (const issue of report.issues) {
        console.log(`    - ${issue}`)
      }
    }
  }

  private async handleExport(args: string[]): Promise<void> {
    const format = args[0] || 'json'
    const outputPath = args[1] || `./docs/i18n/export.${format}`

    console.log(`📤 Exporting translations to ${format}...`)

    await this.translationManager.loadTranslations()
    await this.translationManager.exportTranslations(format as any, outputPath)

    console.log(`✅ Exported to ${outputPath}`)
  }

  private async handleImport(args: string[]): Promise<void> {
    const inputPath = args[0]
    const format = args[1] || 'json'

    if (!inputPath) {
      console.error('❌ Input path is required')
      return
    }

    console.log(`📥 Importing translations from ${inputPath}...`)

    const importer = new TranslationImporter(this.translationManager)
    await importer.import(inputPath, format as any)

    console.log(`✅ Import completed`)
  }

  private async handleStatus(args: string[]): Promise<void> {
    const translationsDir = args[0] || './docs/i18n/translations'

    console.log(`📊 Translation Status:`)

    await this.translationManager.loadTranslations()

    const supportedLanguages = this.translationManager.getSupportedLanguages()
    
    for (const language of supportedLanguages) {
      const available = this.translationManager.getAvailableTranslations('default')
      const isAvailable = available.includes(language)
      
      console.log(`  ${language}: ${isAvailable ? '✅' : '❌'}`)
    }
  }

  private async handleHelp(args: string[]): Promise<void> {
    console.log(`📖 I18n Documentation CLI`)
    console.log(``)
    console.log(`Usage: i18n-cli <command> [options]`)
    console.log(``)
    console.log(`Commands:`)

    for (const command of this.commands) {
      console.log(`  ${command.name.padEnd(12)} ${command.description}`)
    }

    console.log(``)
    console.log(`Examples:`)
    console.log(`  i18n-cli init`)
    console.log(`  i18n-cli extract ./docs`)
    console.log(`  i18n-cli translate ./docs ja,ko ./docs/dist`)
    console.log(`  i18n-cli validate`)
    console.log(`  i18n-cli status`)
  }

  private async generateLanguageIndex(
    outputDir: string,
    languages: string[]
  ): Promise<void> {
    const indexContent = {
      languages: languages.map(lang => ({
        code: lang,
        name: this.getLanguageName(lang),
        path: `./${lang}/`
      })),
      generatedAt: new Date().toISOString()
    }

    const indexPath = path.join(outputDir, 'languages.json')
    await fs.writeFile(indexPath, JSON.stringify(indexContent, null, 2))
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'en': 'English',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch'
    }

    return names[code] || code
  }

  private async findModifiedFiles(dir: string): Promise<string[]> {
    // This would implement logic to find files modified since last sync
    // For now, return all markdown files
    const files: string[] = []
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        const subFiles = await this.findModifiedFiles(fullPath)
        files.push(...subFiles)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath)
      }
    }
    
    return files
  }
}

class StringExtractor {
  async extractFromDirectory(dir: string): Promise<any[]> {
    // This would implement string extraction from markdown files
    // For now, return empty array
    return []
  }
}

class TranslationValidator {
  constructor(private translationManager: TranslationManager) {}

  async validate(dir: string): Promise<any> {
    // This would implement validation logic
    return {
      languages: [],
      completeTranslations: 0,
      missingTranslations: 0,
      outdatedTranslations: 0,
      issues: []
    }
  }
}

class TranslationImporter {
  constructor(private translationManager: TranslationManager) {}

  async import(path: string, format: string): Promise<void> {
    // This would implement import logic
    console.log(`Importing from ${path} (${format})`)
  }
}

// CLI Entry point
if (require.main === module) {
  const cli = new I18nCLI()
  const args = process.argv.slice(2)
  
  cli.run(args).catch(error => {
    console.error('❌ CLI Error:', error)
    process.exit(1)
  })
}

export { I18nCLI }