import chalk from 'chalk'
import { existsSync } from 'fs'
import { join, resolve } from 'path'
import { checkProjectHttps } from '@julien-lin/universal-pwa-core'

export interface PreviewOptions {
  projectPath?: string
  port?: number
  open?: boolean
}

export interface PreviewResult {
  success: boolean
  port: number
  url: string
  manifestExists: boolean
  serviceWorkerExists: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Preview command: launches a local server to preview the PWA
 */
export function previewCommand(options: PreviewOptions = {}): Promise<PreviewResult> {
  const {
    projectPath = process.cwd(),
    port = 3000,
  } = options

  const result: PreviewResult = {
    success: false,
    port,
    url: `http://localhost:${port}`,
    manifestExists: false,
    serviceWorkerExists: false,
    warnings: [],
    errors: [],
  }

  try {
    const resolvedPath = resolve(projectPath)

    if (!existsSync(resolvedPath)) {
      result.errors.push(`Project path does not exist: ${resolvedPath}`)
      return result
    }

    console.log(chalk.blue('🔍 Checking PWA setup...'))

    // Check manifest
    const manifestPath = join(resolvedPath, 'public', 'manifest.json')
    const manifestPathAlt = join(resolvedPath, 'manifest.json')
    
    if (existsSync(manifestPath) || existsSync(manifestPathAlt)) {
      result.manifestExists = true
      console.log(chalk.green('✓ manifest.json found'))
    } else {
      result.warnings.push('manifest.json not found')
      console.log(chalk.yellow('⚠ manifest.json not found'))
    }

    // Check service worker
    const swPath = join(resolvedPath, 'public', 'sw.js')
    const swPathAlt = join(resolvedPath, 'sw.js')
    
    if (existsSync(swPath) || existsSync(swPathAlt)) {
      result.serviceWorkerExists = true
      console.log(chalk.green('✓ Service worker found'))
    } else {
      result.warnings.push('Service worker (sw.js) not found')
      console.log(chalk.yellow('⚠ Service worker (sw.js) not found'))
    }

    // Check HTTPS (for production)
    try {
      const httpsCheck = checkProjectHttps({ projectPath: resolvedPath })
      if (!httpsCheck.isSecure && !httpsCheck.isLocalhost && httpsCheck.warning) {
        result.warnings.push(httpsCheck.warning)
        console.log(chalk.yellow(`⚠ ${httpsCheck.warning}`))
      }
    } catch {
      // Ignore HTTPS check errors
    }

    // For now, just simulate the check
    // In a full version, would launch a local HTTP server
    console.log(chalk.blue(`\n📦 PWA Preview would be available at: ${result.url}`))
    console.log(chalk.gray('   (Server not started in preview mode - use a static server like `serve` or `http-server`)'))

    result.success = result.errors.length === 0

    if (result.success) {
      console.log(chalk.green('\n✅ PWA preview check completed'))
    } else {
      console.log(chalk.red(`\n❌ PWA preview check failed with ${result.errors.length} error(s)`))
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    result.errors.push(`Unexpected error: ${errorMessage}`)
    console.log(chalk.red(`✗ Unexpected error: ${errorMessage}`))
    return result
  }
}

