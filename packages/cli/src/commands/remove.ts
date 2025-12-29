import { scanProject, parseHTML } from '@julien-lin/universal-pwa-core'
import chalk from 'chalk'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { join, resolve, relative } from 'path'
import { Transaction } from '../utils/transaction.js'
import { ErrorCode, formatError } from '../utils/error-codes.js'
import { detectEnvironment } from '../utils/environment-detector.js'

// List of PWA files to remove from output directory
const PWA_FILES_TO_REMOVE = [
  'manifest.json',
  'sw.js',
  'apple-touch-icon.png',
  'icon-72x72.png',
  'icon-96x96.png',
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-152x152.png',
  'icon-192x192.png',
  'icon-384x384.png',
  'icon-512x512.png',
]

/**
 * Check if a script contains PWA-related code
 */
function isPWAScript(content: string): boolean {
  const lowerContent = content.toLowerCase()
  return (
    lowerContent.includes('serviceworker') ||
    lowerContent.includes('navigator.serviceworker') ||
    (lowerContent.includes('register') && lowerContent.includes('sw')) ||
    lowerContent.includes('sw.js') ||
    lowerContent.includes('beforeinstallprompt') ||
    lowerContent.includes('window.installpwa') ||
    lowerContent.includes('ispwainstalled') ||
    lowerContent.includes('ispwainstallable') ||
    lowerContent.includes('deferredprompt')
  )
}

export interface RemoveOptions {
  projectPath?: string
  outputDir?: string
  skipHtmlRestore?: boolean
  skipFiles?: boolean
  force?: boolean
}

export interface RemoveResult {
  success: boolean
  projectPath: string
  outputDir: string
  filesRemoved: string[]
  htmlFilesRestored: number
  warnings: string[]
  errors: string[]
}

type DOMElement = {
  type: string
  tagName?: string
  attribs?: Record<string, string>
  children?: DOMElement[]
  data?: string
}

/**
 * Remove PWA meta-tags from HTML content
 */
async function removeMetaTags(htmlContent: string): Promise<{ html: string; removed: string[] }> {
  const parsed = parseHTML(htmlContent)
  const removed: string[] = []

  if (!parsed.head) {
    return { html: htmlContent, removed: [] }
  }

  const head = parsed.head
  if (!head.children) {
    head.children = []
  }

  // Define PWA meta-tags to remove
  const tagsToRemove = [
    { type: 'link', attr: 'rel', value: 'manifest', name: 'manifest link' },
    { type: 'meta', attr: 'name', value: 'theme-color', name: 'theme-color meta tag' },
    { type: 'link', attr: 'rel', value: 'apple-touch-icon', name: 'apple-touch-icon link' },
    { type: 'meta', attr: 'name', value: 'mobile-web-app-capable', name: 'mobile-web-app-capable meta tag' },
  ]

  // Remove each tag type
  for (const tag of tagsToRemove) {
    const index = head.children.findIndex((child: DOMElement) => {
      return (
        child.type === 'tag' &&
        child.tagName === tag.type &&
        child.attribs?.[tag.attr] === tag.value
      )
    })
    if (index !== -1) {
      head.children.splice(index, 1)
      removed.push(tag.name)
    }
  }

  // Recursive function to find and remove all PWA script tags
  const findAndRemoveScripts = (node: DOMElement): void => {
    if (!node?.children) return

    // Process children in reverse to safely remove while iterating
    for (let i = node.children.length - 1; i >= 0; i--) {
      const child = node.children[i]

      if (child.type === 'tag' && child.tagName === 'script') {
        const content = child.children?.[0]?.data || ''
        if (isPWAScript(content)) {
          node.children.splice(i, 1)
          removed.push('service worker registration script')
        }
      } else if (child.children) {
        findAndRemoveScripts(child)
      }
    }
  }

  // Find and remove all PWA scripts in the document
  if (parsed.document) {
    findAndRemoveScripts(parsed.document)
  }

  // Serialize back to HTML
  const { render } = await import('dom-serializer')
  const html = render(parsed.document)

  return { html, removed }
}

/**
 * Remove command: removes PWA files and restores HTML files
 */
export async function removeCommand(options: RemoveOptions = {}): Promise<RemoveResult> {
  const {
    projectPath = process.cwd(),
    outputDir,
    skipHtmlRestore = false,
    skipFiles = false,
  } = options

  const result: RemoveResult = {
    success: false,
    projectPath: resolve(projectPath),
    outputDir: '',
    filesRemoved: [],
    htmlFilesRestored: 0,
    warnings: [],
    errors: [],
  }

  // Initialize transaction for rollback support
  let transaction: Transaction | null = null

  try {
    // Check that path exists
    if (!existsSync(result.projectPath)) {
      const errorCode = ErrorCode.PROJECT_PATH_NOT_FOUND
      const errorMessage = formatError(errorCode, result.projectPath)
      result.errors.push(errorMessage)
      console.log(chalk.red(`✗ ${errorMessage}`))
      return result
    }

    console.log(chalk.blue('🔍 Scanning project for PWA files...'))

    // Scan project to detect framework
    const scanResult = await scanProject({
      projectPath: result.projectPath,
      includeAssets: false,
      includeArchitecture: false,
    })

    // Determine output directory
    let finalOutputDir: string
    if (outputDir) {
      // If outputDir is absolute, use it directly; otherwise resolve relative to projectPath
      finalOutputDir = outputDir.startsWith('/') || (process.platform === 'win32' && /^[A-Z]:/.test(outputDir))
        ? resolve(outputDir)
        : join(result.projectPath, outputDir)
    } else {
      // Auto-detect output directory
      const envDetection = detectEnvironment(result.projectPath, scanResult.framework.framework)
      const distDir = join(result.projectPath, 'dist')
      const publicDir = join(result.projectPath, 'public')

      if (envDetection.suggestedOutputDir === 'dist' && existsSync(distDir)) {
        finalOutputDir = distDir
      } else if (envDetection.suggestedOutputDir === 'build' && existsSync(join(result.projectPath, 'build'))) {
        finalOutputDir = join(result.projectPath, 'build')
      } else if (existsSync(publicDir)) {
        finalOutputDir = publicDir
      } else if (existsSync(distDir)) {
        finalOutputDir = distDir
      } else {
        finalOutputDir = publicDir
      }
    }

    result.outputDir = finalOutputDir

    console.log(chalk.gray(`  Output directory: ${finalOutputDir}`))

    // Initialize transaction
    transaction = new Transaction({
      projectPath: result.projectPath,
      outputDir: relative(result.projectPath, finalOutputDir) || undefined,
      verbose: false,
    })

    // Build list of PWA files to remove (base files + workbox files)
    const pwaFiles = [...PWA_FILES_TO_REMOVE]

    // Find workbox-*.js files
    if (existsSync(finalOutputDir)) {
      const workboxFiles = await glob('workbox-*.js', {
        cwd: finalOutputDir,
        absolute: true,
      })
      pwaFiles.push(...workboxFiles.map((f) => relative(finalOutputDir, f)))
    }

    // Remove PWA files
    if (!skipFiles) {
      console.log(chalk.blue('🗑️  Removing PWA files...'))

      for (const file of pwaFiles) {
        const filePath = join(finalOutputDir, file)
        if (existsSync(filePath)) {
          try {
            // Backup before removal
            const fileRelative = relative(result.projectPath, filePath)
            if (fileRelative && !fileRelative.startsWith('..')) {
              transaction.backupFile(fileRelative)
            }

            rmSync(filePath, { force: true })
            result.filesRemoved.push(file)
            console.log(chalk.green(`  ✓ Removed ${file}`))
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            result.warnings.push(`Failed to remove ${file}: ${errorMessage}`)
            console.log(chalk.yellow(`  ⚠ Failed to remove ${file}: ${errorMessage}`))
          }
        }
      }

      if (result.filesRemoved.length === 0) {
        console.log(chalk.gray('  No PWA files found to remove'))
      } else {
        console.log(chalk.green(`✓ Removed ${result.filesRemoved.length} file(s)`))
      }
    }

    // Restore HTML files (remove meta-tags)
    if (!skipHtmlRestore) {
      console.log(chalk.blue('💉 Restoring HTML files...'))

      // Find all HTML files
      const htmlFiles = await glob('**/*.html', {
        cwd: result.projectPath,
        ignore: ['**/node_modules/**', '**/.next/**', '**/.nuxt/**'],
        absolute: true,
      })

      if (htmlFiles.length > 0) {
        console.log(chalk.gray(`  Found ${htmlFiles.length} HTML file(s)`))

        for (const htmlFile of htmlFiles) {
          try {
            // Backup HTML file before modification
            const htmlRelative = relative(result.projectPath, htmlFile)
            if (htmlRelative && !htmlRelative.startsWith('..')) {
              transaction.backupFile(htmlRelative)
            }

            const htmlContent = readFileSync(htmlFile, 'utf-8')
            const { html: restoredHtml, removed } = await removeMetaTags(htmlContent)

            if (removed.length > 0) {
              writeFileSync(htmlFile, restoredHtml, 'utf-8')
              result.htmlFilesRestored++
              console.log(chalk.green(`  ✓ Restored ${htmlRelative} (removed ${removed.length} PWA element(s))`))
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            result.warnings.push(`Failed to restore ${htmlFile}: ${errorMessage}`)
            console.log(chalk.yellow(`  ⚠ Failed to restore ${htmlFile}: ${errorMessage}`))
          }
        }

        if (result.htmlFilesRestored > 0) {
          console.log(chalk.green(`✓ Restored ${result.htmlFilesRestored} HTML file(s)`))
        } else {
          console.log(chalk.gray('  No PWA meta-tags found in HTML files'))
        }
      } else {
        console.log(chalk.gray('  No HTML files found'))
      }
    }

    result.success = result.errors.length === 0

    if (result.success) {
      // Commit transaction if everything succeeded
      if (transaction) {
        transaction.commit()
      }
      console.log(chalk.green('\n✅ PWA removal completed successfully!'))
      console.log(chalk.gray(`  Files removed: ${result.filesRemoved.length}`))
      console.log(chalk.gray(`  HTML files restored: ${result.htmlFilesRestored}`))
    } else {
      // Rollback on errors
      if (transaction) {
        console.log(chalk.yellow('\n🔄 Rolling back changes due to errors...'))
        transaction.rollback()
      }
      console.log(chalk.red(`\n❌ PWA removal completed with ${result.errors.length} error(s)`))
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = ErrorCode.UNEXPECTED_ERROR
    const formattedError = formatError(errorCode, errorMessage)
    result.errors.push(formattedError)
    console.log(chalk.red(`✗ ${formattedError}`))

    // Rollback on unexpected error
    if (transaction) {
      console.log(chalk.yellow('\n🔄 Rolling back changes due to unexpected error...'))
      transaction.rollback()
    }

    return result
  }
}

