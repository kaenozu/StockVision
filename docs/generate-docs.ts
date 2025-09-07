/**
 * Automated Documentation Generator
 * 
 * Generates comprehensive documentation from code, tests, and comments.
 */

import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface DocumentationConfig {
  sourceDir: string
  outputDir: string
  includeTests: boolean
  includeReadme: boolean
  includeApiDocs: boolean
  includeComponentDocs: boolean
  theme: 'default' | 'minimal' | 'custom'
  languages: string[]
}

interface FileInfo {
  path: string
  type: 'component' | 'hook' | 'utility' | 'service' | 'test'
  exports: string[]
  imports: string[]
  documentation: string
}

export class DocumentationGenerator {
  private config: DocumentationConfig
  private projectRoot: string

  constructor(config: Partial<DocumentationConfig> = {}) {
    this.projectRoot = process.cwd()
    this.config = {
      sourceDir: 'src',
      outputDir: 'docs/generated',
      includeTests: true,
      includeReadme: true,
      includeApiDocs: true,
      includeComponentDocs: true,
      theme: 'default',
      languages: ['en', 'ja'],
      ...config
    }
  }

  async generate(): Promise<void> {
    console.log('🚀 Starting documentation generation...')
    
    // Create output directory
    await this.ensureDirectory(this.config.outputDir)
    
    // Generate different types of documentation
    await Promise.all([
      this.generateTypeDocumentation(),
      this.generateComponentDocumentation(),
      this.generateAPIDocumentation(),
      this.generateTestDocumentation(),
      this.generateReadmeDocumentation(),
      this.generateArchitectureDocumentation(),
    ])
    
    // Generate index page
    await this.generateIndexPage()
    
    // Copy assets
    await this.copyAssets()
    
    console.log('✅ Documentation generation complete!')
  }

  private async generateTypeDocumentation(): Promise<void> {
    console.log('📚 Generating TypeScript documentation...')
    
    try {
      // Generate TypeDoc documentation
      await execAsync('npx typedoc --out docs/generated/api frontend/src --theme default --readme none --exclude "**/*.test.*" --exclude "**/test/**"')
      console.log('✅ TypeScript documentation generated')
    } catch (error) {
      console.warn('⚠️ TypeDoc generation failed:', error)
    }
  }

  private async generateComponentDocumentation(): Promise<void> {
    console.log('🧩 Generating component documentation...')
    
    const componentsDir = path.join(this.projectRoot, 'frontend', 'src', 'components')
    const components = await this.findComponentFiles(componentsDir)
    
    const componentDocs = await Promise.all(
      components.map(async (component) => {
        return await this.extractComponentDocumentation(component)
      })
    )
    
    // Generate component catalog
    const catalogHtml = this.generateComponentCatalog(componentDocs)
    await fs.promises.writeFile(
      path.join(this.config.outputDir, 'components.html'),
      catalogHtml
    )
    
    console.log(`✅ Generated documentation for ${components.length} components`)
  }

  private async generateAPIDocumentation(): Promise<void> {
    console.log('🌐 Generating API documentation...')
    
    if (!this.config.includeApiDocs) return
    
    const apiDir = path.join(this.projectRoot, 'src')
    const apiFiles = await this.findPythonFiles(apiDir)
    
    // Generate OpenAPI/Swagger documentation
    try {
      await execAsync('python -m src.docs.generate_api_docs')
      console.log('✅ API documentation generated')
    } catch (error) {
      console.warn('⚠️ API documentation generation failed:', error)
      
      // Fallback: Generate basic API docs from code analysis
      await this.generateBasicApiDocs(apiFiles)
    }
  }

  private async generateTestDocumentation(): Promise<void> {
    console.log('🧪 Generating test documentation...')
    
    if (!this.config.includeTests) return
    
    const testFiles = await this.findTestFiles()
    const testSuites = await this.analyzeTestFiles(testFiles)
    
    const testDocsHtml = this.generateTestDocumentationHtml(testSuites)
    await fs.promises.writeFile(
      path.join(this.config.outputDir, 'testing.html'),
      testDocsHtml
    )
    
    console.log(`✅ Generated test documentation for ${testFiles.length} test files`)
  }

  private async generateReadmeDocumentation(): Promise<void> {
    console.log('📖 Processing README files...')
    
    if (!this.config.includeReadme) return
    
    const readmeFiles = await this.findReadmeFiles()
    
    for (const readmeFile of readmeFiles) {
      const content = await fs.promises.readFile(readmeFile, 'utf-8')
      const processedContent = await this.processMarkdown(content)
      
      const outputPath = path.join(
        this.config.outputDir,
        path.relative(this.projectRoot, readmeFile).replace(/\.md$/, '.html')
      )
      
      await this.ensureDirectory(path.dirname(outputPath))
      await fs.promises.writeFile(outputPath, processedContent)
    }
    
    console.log(`✅ Processed ${readmeFiles.length} README files`)
  }

  private async generateArchitectureDocumentation(): Promise<void> {
    console.log('🏗️ Generating architecture documentation...')
    
    const archInfo = {
      frontend: await this.analyzeFrontendArchitecture(),
      backend: await this.analyzeBackendArchitecture(),
      database: await this.analyzeDatabaseSchema(),
      deployment: await this.analyzeDeploymentStructure()
    }
    
    const archDocsHtml = this.generateArchitectureHtml(archInfo)
    await fs.promises.writeFile(
      path.join(this.config.outputDir, 'architecture.html'),
      archDocsHtml
    )
    
    console.log('✅ Architecture documentation generated')
  }

  private async generateIndexPage(): Promise<void> {
    console.log('📑 Generating index page...')
    
    const indexHtml = this.generateIndexHtml()
    await fs.promises.writeFile(
      path.join(this.config.outputDir, 'index.html'),
      indexHtml
    )
    
    console.log('✅ Index page generated')
  }

  private async findComponentFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          files.push(...await this.findComponentFiles(fullPath))
        } else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files
  }

  private async findPythonFiles(dir: string): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          files.push(...await this.findPythonFiles(fullPath))
        } else if (entry.name.endsWith('.py') && !entry.name.startsWith('test_')) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files
  }

  private async findTestFiles(): Promise<string[]> {
    const testDirs = [
      'frontend/src/__tests__',
      'frontend/tests',
      'tests',
      'test'
    ]
    
    const files: string[] = []
    
    for (const testDir of testDirs) {
      const fullPath = path.join(this.projectRoot, testDir)
      
      try {
        const testFiles = await this.findFilesWithPattern(fullPath, /\.(test|spec)\.(ts|tsx|js|jsx|py)$/)
        files.push(...testFiles)
      } catch (error) {
        // Test directory doesn't exist
      }
    }
    
    return files
  }

  private async findReadmeFiles(): Promise<string[]> {
    const files: string[] = []
    
    const readmePattern = /^README\.md$/i
    const dirs = [this.projectRoot, path.join(this.projectRoot, 'frontend'), path.join(this.projectRoot, 'docs')]
    
    for (const dir of dirs) {
      try {
        const entries = await fs.promises.readdir(dir)
        for (const entry of entries) {
          if (readmePattern.test(entry)) {
            files.push(path.join(dir, entry))
          }
        }
      } catch (error) {
        // Directory doesn't exist
      }
    }
    
    return files
  }

  private async findFilesWithPattern(dir: string, pattern: RegExp): Promise<string[]> {
    const files: string[] = []
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          files.push(...await this.findFilesWithPattern(fullPath, pattern))
        } else if (pattern.test(entry.name)) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
    
    return files
  }

  private async extractComponentDocumentation(componentPath: string): Promise<any> {
    const content = await fs.promises.readFile(componentPath, 'utf-8')
    
    // Extract JSDoc comments
    const jsdocPattern = /\/\*\*\s*\n([\s\S]*?)\*\//g
    const comments = []
    let match
    
    while ((match = jsdocPattern.exec(content)) !== null) {
      comments.push(match[1])
    }
    
    // Extract component name
    const componentNameMatch = content.match(/(?:export\s+(?:default\s+)?(?:function|const)\s+(\w+)|interface\s+(\w+)Props)/)
    const componentName = componentNameMatch?.[1] || componentNameMatch?.[2] || path.basename(componentPath, '.tsx')
    
    // Extract props interface
    const propsPattern = new RegExp(`interface\\s+${componentName}Props\\s*{([\\s\\S]*?)}`)
    const propsMatch = content.match(propsPattern)
    
    return {
      name: componentName,
      path: path.relative(this.projectRoot, componentPath),
      documentation: comments.join('\n\n'),
      props: propsMatch?.[1] || '',
      exports: this.extractExports(content)
    }
  }

  private extractExports(content: string): string[] {
    const exports = []
    const exportPattern = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g
    let match
    
    while ((match = exportPattern.exec(content)) !== null) {
      exports.push(match[1])
    }
    
    return exports
  }

  private generateComponentCatalog(components: any[]): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Catalog - StockVision</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>📦 Component Catalog</h1>
        <p>Overview of all React components in the StockVision application</p>
    </header>
    
    <main>
        <div class="component-grid">
            ${components.map(component => `
                <div class="component-card">
                    <h3>${component.name}</h3>
                    <p class="component-path">${component.path}</p>
                    <div class="component-docs">
                        ${component.documentation.replace(/\n/g, '<br>')}
                    </div>
                    ${component.props ? `
                        <details>
                            <summary>Props</summary>
                            <pre><code>${component.props}</code></pre>
                        </details>
                    ` : ''}
                    <div class="component-exports">
                        <strong>Exports:</strong> ${component.exports.join(', ')}
                    </div>
                </div>
            `).join('')}
        </div>
    </main>
</body>
</html>
    `
  }

  private async analyzeTestFiles(testFiles: string[]): Promise<any[]> {
    const testSuites = []
    
    for (const testFile of testFiles) {
      const content = await fs.promises.readFile(testFile, 'utf-8')
      
      // Extract describe blocks
      const describePattern = /describe\s*\(\s*['"`]([^'"`]+)['"`]/g
      const testPattern = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g
      
      const describes = []
      const tests = []
      
      let match
      while ((match = describePattern.exec(content)) !== null) {
        describes.push(match[1])
      }
      
      while ((match = testPattern.exec(content)) !== null) {
        tests.push(match[1])
      }
      
      testSuites.push({
        file: path.relative(this.projectRoot, testFile),
        describes,
        tests,
        testCount: tests.length
      })
    }
    
    return testSuites
  }

  private generateTestDocumentationHtml(testSuites: any[]): string {
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.testCount, 0)
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Documentation - StockVision</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>🧪 Test Documentation</h1>
        <p>Overview of test coverage and test suites</p>
        <div class="stats">
            <span class="stat">
                <strong>${testSuites.length}</strong> Test Files
            </span>
            <span class="stat">
                <strong>${totalTests}</strong> Total Tests
            </span>
        </div>
    </header>
    
    <main>
        <div class="test-suites">
            ${testSuites.map(suite => `
                <div class="test-suite">
                    <h3>${suite.file}</h3>
                    <p class="test-count">${suite.testCount} tests</p>
                    
                    ${suite.describes.length > 0 ? `
                        <div class="describe-blocks">
                            <h4>Test Suites:</h4>
                            <ul>
                                ${suite.describes.map(desc => `<li>${desc}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <div class="test-cases">
                        <h4>Test Cases:</h4>
                        <ul>
                            ${suite.tests.map(test => `<li>${test}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `).join('')}
        </div>
    </main>
</body>
</html>
    `
  }

  private async analyzeFrontendArchitecture(): Promise<any> {
    return {
      framework: 'React + TypeScript',
      buildTool: 'Vite',
      stateManagement: 'React Hooks',
      routing: 'React Router',
      styling: 'Tailwind CSS',
      testing: 'Vitest + Playwright'
    }
  }

  private async analyzeBackendArchitecture(): Promise<any> {
    return {
      framework: 'FastAPI',
      language: 'Python 3.11+',
      database: 'SQLite/PostgreSQL',
      authentication: 'JWT',
      documentation: 'OpenAPI/Swagger'
    }
  }

  private async analyzeDatabaseSchema(): Promise<any> {
    // This would analyze actual database schema in a real implementation
    return {
      tables: ['users', 'stocks', 'watchlists', 'market_data'],
      relationships: 'user -> watchlist -> stock',
      indexes: 'Optimized for symbol lookups'
    }
  }

  private async analyzeDeploymentStructure(): Promise<any> {
    return {
      frontend: 'Static hosting (Vercel/Netlify)',
      backend: 'Container deployment',
      database: 'Managed database service',
      cdn: 'Global CDN for assets'
    }
  }

  private generateArchitectureHtml(archInfo: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Documentation - StockVision</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>🏗️ Architecture Documentation</h1>
        <p>System architecture and technical decisions</p>
    </header>
    
    <main>
        <div class="architecture-sections">
            <section class="arch-section">
                <h2>Frontend Architecture</h2>
                <ul>
                    ${Object.entries(archInfo.frontend).map(([key, value]) => `
                        <li><strong>${key}:</strong> ${value}</li>
                    `).join('')}
                </ul>
            </section>
            
            <section class="arch-section">
                <h2>Backend Architecture</h2>
                <ul>
                    ${Object.entries(archInfo.backend).map(([key, value]) => `
                        <li><strong>${key}:</strong> ${value}</li>
                    `).join('')}
                </ul>
            </section>
            
            <section class="arch-section">
                <h2>Database Schema</h2>
                <ul>
                    ${Object.entries(archInfo.database).map(([key, value]) => `
                        <li><strong>${key}:</strong> ${value}</li>
                    `).join('')}
                </ul>
            </section>
            
            <section class="arch-section">
                <h2>Deployment</h2>
                <ul>
                    ${Object.entries(archInfo.deployment).map(([key, value]) => `
                        <li><strong>${key}:</strong> ${value}</li>
                    `).join('')}
                </ul>
            </section>
        </div>
    </main>
</body>
</html>
    `
  }

  private generateIndexHtml(): string {
    const lastGenerated = new Date().toLocaleString()
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StockVision Documentation</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <h1>📚 StockVision Documentation</h1>
        <p>Comprehensive documentation for the StockVision application</p>
        <p class="generated-time">Last generated: ${lastGenerated}</p>
    </header>
    
    <main>
        <div class="doc-sections">
            <div class="doc-card">
                <h3>🧩 Components</h3>
                <p>React component documentation with props and usage examples</p>
                <a href="components.html" class="doc-link">View Components →</a>
            </div>
            
            <div class="doc-card">
                <h3>🌐 API Reference</h3>
                <p>Backend API endpoints and data models</p>
                <a href="api/index.html" class="doc-link">View API Docs →</a>
            </div>
            
            <div class="doc-card">
                <h3>🧪 Testing</h3>
                <p>Test documentation and coverage reports</p>
                <a href="testing.html" class="doc-link">View Tests →</a>
            </div>
            
            <div class="doc-card">
                <h3>🏗️ Architecture</h3>
                <p>System architecture and technical decisions</p>
                <a href="architecture.html" class="doc-link">View Architecture →</a>
            </div>
            
            <div class="doc-card">
                <h3>📖 Getting Started</h3>
                <p>Setup instructions and development guide</p>
                <a href="README.html" class="doc-link">View Guide →</a>
            </div>
            
            <div class="doc-card">
                <h3>🎨 Storybook</h3>
                <p>Interactive component playground</p>
                <a href="../storybook/index.html" class="doc-link">Open Storybook →</a>
            </div>
        </div>
    </main>
</body>
</html>
    `
  }

  private async processMarkdown(content: string): Promise<string> {
    // Simple markdown to HTML conversion
    // In a real implementation, you'd use a proper markdown parser like marked
    let html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\`(.*)\`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>')
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentation - StockVision</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="markdown-content">
        ${html}
    </div>
</body>
</html>
    `
  }

  private async generateBasicApiDocs(apiFiles: string[]): Promise<void> {
    const apiEndpoints = []
    
    for (const apiFile of apiFiles) {
      const content = await fs.promises.readFile(apiFile, 'utf-8')
      
      // Extract FastAPI routes
      const routePattern = /@app\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g
      let match
      
      while ((match = routePattern.exec(content)) !== null) {
        apiEndpoints.push({
          method: match[1].toUpperCase(),
          path: match[2],
          file: path.relative(this.projectRoot, apiFile)
        })
      }
    }
    
    const apiDocsHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - StockVision</title>
    <link rel="stylesheet" href="../styles.css">
</head>
<body>
    <header>
        <h1>🌐 API Documentation</h1>
        <p>REST API endpoints and specifications</p>
    </header>
    
    <main>
        <div class="api-endpoints">
            ${apiEndpoints.map(endpoint => `
                <div class="api-endpoint">
                    <span class="method method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                    <code class="path">${endpoint.path}</code>
                    <span class="file">${endpoint.file}</span>
                </div>
            `).join('')}
        </div>
    </main>
</body>
</html>
    `
    
    await this.ensureDirectory(path.join(this.config.outputDir, 'api'))
    await fs.promises.writeFile(
      path.join(this.config.outputDir, 'api', 'index.html'),
      apiDocsHtml
    )
  }

  private async copyAssets(): Promise<void> {
    console.log('🎨 Copying documentation assets...')
    
    const cssContent = `
/* Documentation Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f8f9fa;
}

header {
  background: #2c3e50;
  color: white;
  padding: 2rem;
  text-align: center;
}

header h1 {
  margin-bottom: 0.5rem;
}

main {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.doc-sections, .component-grid, .test-suites, .architecture-sections {
  display: grid;
  gap: 2rem;
  margin-top: 2rem;
}

.doc-sections {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.doc-card, .component-card, .test-suite, .arch-section {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  border-left: 4px solid #3498db;
}

.doc-card h3, .component-card h3, .test-suite h3, .arch-section h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.doc-link {
  display: inline-block;
  margin-top: 1rem;
  color: #3498db;
  text-decoration: none;
  font-weight: bold;
}

.doc-link:hover {
  text-decoration: underline;
}

.component-path {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
}

.component-docs {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.stats {
  margin-top: 1rem;
  display: flex;
  gap: 2rem;
  justify-content: center;
}

.stat {
  padding: 0.5rem 1rem;
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}

.method {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
  color: white;
}

.method-get { background: #27ae60; }
.method-post { background: #3498db; }
.method-put { background: #f39c12; }
.method-delete { background: #e74c3c; }
.method-patch { background: #9b59b6; }

.api-endpoint {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-radius: 4px;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.path {
  font-family: 'Consolas', monospace;
  background: #f8f9fa;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.file {
  font-size: 0.9rem;
  color: #666;
  margin-left: auto;
}

.generated-time {
  font-size: 0.9rem;
  opacity: 0.8;
  margin-top: 0.5rem;
}

.markdown-content {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

details {
  margin-top: 1rem;
}

summary {
  cursor: pointer;
  font-weight: bold;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

pre {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .stats {
    flex-direction: column;
    gap: 1rem;
  }
  
  .api-endpoint {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .file {
    margin-left: 0;
  }
}
    `
    
    await fs.promises.writeFile(
      path.join(this.config.outputDir, 'styles.css'),
      cssContent
    )
    
    console.log('✅ Assets copied')
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.promises.mkdir(dir, { recursive: true })
    } catch (error) {
      // Directory already exists or couldn't be created
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new DocumentationGenerator()
  generator.generate().catch(console.error)
}

export default DocumentationGenerator