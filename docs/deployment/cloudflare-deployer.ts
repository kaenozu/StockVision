/**
 * Cloudflare Pages Deployer
 * Deploys documentation to Cloudflare Pages
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface CloudflarePagesConfig {
  accountId: string
  projectName: string
  directory: string
  branch?: string
  envVars?: Record<string, string>
}

export interface DeployResult {
  success: boolean
  url?: string
  aliasUrl?: string
  error?: string
}

export class CloudflarePagesDeployer {
  constructor(private config: CloudflarePagesConfig) {}

  /**
   * Deploy to Cloudflare Pages
   */
  async deploy(): Promise<DeployResult> {
    try {
      // Validate configuration
      if (!this.config.accountId || !this.config.projectName || !this.config.directory) {
        throw new Error('Missing required configuration: accountId, projectName, or directory')
      }

      // Check if wrangler is installed
      await this.checkWrangler()

      // Deploy using wrangler
      const deployCommand = this.buildDeployCommand()
      console.log(`🚀 Deploying to Cloudflare Pages: ${deployCommand}`)
      
      const { stdout, stderr } = await execAsync(deployCommand)
      
      if (stderr) {
        console.warn('Cloudflare Pages deployment warning:', stderr)
      }
      
      // Parse deployment URL from output
      const urlMatch = stdout.match(/https:\/\/[^\s]+\.pages\.dev/)
      const aliasMatch = stdout.match(/https:\/\/[^\s]+\.cloudflareaccess\.com/)
      
      console.log('✅ Cloudflare Pages deployment completed')
      console.log(stdout)
      
      return {
        success: true,
        url: urlMatch ? urlMatch[0] : undefined,
        aliasUrl: aliasMatch ? aliasMatch[0] : undefined
      }
    } catch (error) {
      console.error('❌ Cloudflare Pages deployment failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check if wrangler is installed
   */
  private async checkWrangler(): Promise<void> {
    try {
      await execAsync('wrangler --version')
    } catch (error) {
      throw new Error('Wrangler CLI is not installed. Please install it with: npm install -g wrangler')
    }
  }

  /**
   * Build the deploy command
   */
  private buildDeployCommand(): string {
    const args = [
      'wrangler',
      'pages',
      'deploy',
      this.config.directory,
      '--project-name',
      this.config.projectName,
      '--accountId',
      this.config.accountId
    ]

    if (this.config.branch) {
      args.push('--branch', this.config.branch)
    }

    // Add environment variables
    if (this.config.envVars) {
      for (const [key, value] of Object.entries(this.config.envVars)) {
        args.push('--env', `${key}=${value}`)
      }
    }

    return args.join(' ')
  }

  /**
   * Create wrangler.toml configuration file
   */
  async createWranglerConfig(): Promise<void> {
    const wranglerConfig = `
name = "${this.config.projectName}"
compatibility_date = "${new Date().toISOString().split('T')[0]}"
account_id = "${this.config.accountId}"

[build]
command = "npm run build:docs"
publish = "${this.config.directory}"

[env.production]
name = "${this.config.projectName}-prod"

[env.staging]
name = "${this.config.projectName}-staging"
`

    const configPath = path.join(process.cwd(), 'wrangler.toml')
    await fs.writeFile(configPath, wranglerConfig.trim())
    console.log(`📄 Created wrangler.toml at ${configPath}`)
  }
}