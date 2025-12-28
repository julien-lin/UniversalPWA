import { scanProject, optimizeProject } from '@julien-lin/universal-pwa-core'
import { generateManifest, generateAndWriteManifest } from '@julien-lin/universal-pwa-core'
import { generateIcons } from '@julien-lin/universal-pwa-core'
import { generateServiceWorker, generateSimpleServiceWorker } from '@julien-lin/universal-pwa-core'
import { injectMetaTagsInFile } from '@julien-lin/universal-pwa-core'
import { checkProjectHttps } from '@julien-lin/universal-pwa-core'
import chalk from 'chalk'
import { existsSync } from 'fs'
import { glob } from 'glob'
import { join, resolve, relative, normalize } from 'path'
import type { Framework } from '@julien-lin/universal-pwa-core'
import type { Architecture } from '@julien-lin/universal-pwa-core'
import { Transaction } from '../utils/transaction.js'
import { ErrorCode, formatError, detectErrorCode } from '../utils/error-codes.js'

export interface InitOptions {
  projectPath?: string
  name?: string
  shortName?: string
  iconSource?: string
  themeColor?: string
  backgroundColor?: string
  skipIcons?: boolean
  skipServiceWorker?: boolean
  skipInjection?: boolean
  outputDir?: string
  forceScan?: boolean
  noCache?: boolean
  maxHtmlFiles?: number // Optionnel : limite le nombre de fichiers HTML traités (par défaut: illimité)
}

export interface InitResult {
  success: boolean
  projectPath: string
  framework: Framework | null
  architecture: Architecture
  manifestPath?: string
  serviceWorkerPath?: string
  iconsGenerated: number
  htmlFilesInjected: number
  warnings: string[]
  errors: string[]
}

/**
 * Normalizes a path securely by converting it to a relative path
 */
function relativePath(fullPath: string, basePath: string): string {
  try {
    const rel = relative(basePath, fullPath)
    // Normalize and ensure path starts with /
    const normalized = normalize(rel).replace(/\\/g, '/')
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  } catch {
    // On error, return path as-is (will be validated elsewhere)
    return fullPath
  }
}

/**
 * Init command: scans project and generates PWA files
 */
export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const {
    projectPath = process.cwd(),
    name,
    shortName,
    iconSource,
    themeColor,
    backgroundColor,
    skipIcons = false,
    skipServiceWorker = false,
    skipInjection = false,
    outputDir,
    maxHtmlFiles,
  } = options

  const result: InitResult = {
    success: false,
    projectPath: resolve(projectPath),
    framework: null,
    architecture: 'static',
    iconsGenerated: 0,
    htmlFilesInjected: 0,
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

    console.log(chalk.blue('🔍 Scanning project...'))
    
    // Scan project (with cache support)
    const scanResult = await scanProject({
      projectPath: result.projectPath,
      includeAssets: true,
      includeArchitecture: true,
      useCache: options.noCache !== true,
      forceScan: options.forceScan === true,
    })

    result.framework = scanResult.framework.framework
    result.architecture = scanResult.architecture.architecture

    console.log(chalk.green(`✓ Framework detected: ${result.framework ?? 'Unknown'}`))
    console.log(chalk.green(`✓ Architecture: ${result.architecture}`))

    // Check HTTPS
    const httpsCheck = checkProjectHttps({ projectPath: result.projectPath })
    if (!httpsCheck.isSecure && !httpsCheck.isLocalhost) {
      result.warnings.push(httpsCheck.warning ?? 'HTTPS required for production PWA')
      console.log(chalk.yellow(`⚠ ${httpsCheck.warning}`))
    }

    // Determine output directory
    // Priority: explicit outputDir > dist/ (for React/Vite builds) > public/ > root
    let finalOutputDir: string
    if (outputDir) {
      finalOutputDir = resolve(outputDir)
    } else {
      // Auto-detect: prefer dist/ for React/Vite projects (production builds)
      const distDir = join(result.projectPath, 'dist')
      const publicDir = join(result.projectPath, 'public')
      
      // For React/Vite: prefer dist/ if it exists (production build), otherwise public/
      if ((result.framework === 'React' || result.framework === 'Vite') && existsSync(distDir)) {
        finalOutputDir = distDir
        console.log(chalk.gray(`  Using dist/ directory (production build detected)`))
      } else if (result.framework === 'WordPress') {
        finalOutputDir = publicDir
      } else if (existsSync(publicDir)) {
        finalOutputDir = publicDir
      } else if (existsSync(distDir)) {
        finalOutputDir = distDir
      } else {
        // Fallback to public/ (will be created if needed)
        finalOutputDir = publicDir
      }
    }

    // Initialize transaction after output directory is determined
    transaction = new Transaction({
      projectPath: result.projectPath,
      outputDir: relative(result.projectPath, finalOutputDir) || undefined,
      verbose: false,
    })

    // Backup existing files before modification
    const existingManifestPath = join(finalOutputDir, 'manifest.json')
    const existingSwPath = join(finalOutputDir, 'sw.js')
    
    if (existsSync(existingManifestPath)) {
      const manifestRelative = relative(result.projectPath, existingManifestPath)
      if (manifestRelative && !manifestRelative.startsWith('..')) {
        transaction.backupFile(manifestRelative)
      }
    }
    if (existsSync(existingSwPath)) {
      const swRelative = relative(result.projectPath, existingSwPath)
      if (swRelative && !swRelative.startsWith('..')) {
        transaction.backupFile(swRelative)
      }
    }

    // Generate manifest
    console.log(chalk.blue('📝 Generating manifest.json...'))
    
    const appName = name ?? (result.framework ? `${result.framework} App` : 'My PWA')
    // Ensure shortName is always defined and valid (max 12 characters, non-empty)
    // Normalize shortName (can be undefined, empty string, or valid)
    const normalizedShortName = shortName && typeof shortName === 'string' && shortName.trim().length > 0
      ? shortName.trim()
      : undefined
    
    let appShortName: string
    if (normalizedShortName && normalizedShortName.length > 0 && normalizedShortName.length <= 12) {
      appShortName = normalizedShortName
    } else {
      // Use appName as fallback, ensure it's not empty
      const fallbackName = appName && appName.length > 0 ? appName : 'My PWA'
      appShortName = fallbackName.substring(0, 12)
    }
    // Ensure appShortName is never empty or undefined
    if (!appShortName || appShortName.trim().length === 0) {
      appShortName = 'PWA'
    }
    // Ensure appShortName is a string (not undefined)
    appShortName = String(appShortName)

    // Generate icons if source is provided
    let iconPaths: string[] = []
    if (!skipIcons && iconSource) {
      const iconSourcePath = existsSync(iconSource) ? iconSource : join(result.projectPath, iconSource)
      
      if (existsSync(iconSourcePath)) {
        console.log(chalk.blue('🎨 Generating icons...'))
        
        try {
          const iconResult = await generateIcons({
            sourceImage: iconSourcePath,
            outputDir: finalOutputDir,
          })
          
          iconPaths = iconResult.icons.map((icon) => icon.src)
          result.iconsGenerated = iconResult.icons.length
          
          // Check if apple-touch-icon.png was generated
          const appleTouchIconPath = join(finalOutputDir, 'apple-touch-icon.png')
          if (existsSync(appleTouchIconPath)) {
            iconPaths.push('/apple-touch-icon.png')
          }
          
          console.log(chalk.green(`✓ Generated ${result.iconsGenerated} icons`))
          if (existsSync(appleTouchIconPath)) {
            console.log(chalk.green(`✓ Generated apple-touch-icon.png`))
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          result.errors.push(`Failed to generate icons: ${errorMessage}`)
          console.log(chalk.red(`✗ Failed to generate icons: ${errorMessage}`))
        }
      } else {
        const errorCode = ErrorCode.ICON_SOURCE_NOT_FOUND
        const warningMessage = formatError(errorCode, iconSourcePath)
        result.warnings.push(warningMessage)
        console.log(chalk.yellow(`⚠ ${warningMessage}`))
      }
    }

    // Generate manifest (with or without icons)
    // Final validation of appShortName before use - ensure it's always a valid string
    let finalShortName: string = 'PWA' // Default value
    
    if (appShortName && typeof appShortName === 'string' && appShortName.trim().length > 0) {
      finalShortName = appShortName.trim().substring(0, 12)
    } else if (appName && typeof appName === 'string' && appName.length > 0) {
      finalShortName = appName.substring(0, 12)
    }
    
    // Ensure finalShortName is never empty or undefined
    if (!finalShortName || finalShortName.trim().length === 0) {
      finalShortName = 'PWA'
    }
    
    // Double check: ensure it's a string
    finalShortName = String(finalShortName).trim().substring(0, 12) || 'PWA'
    
    let manifestPath: string | undefined
    try {
      if (iconPaths.length > 0) {
        // Manifest with generated icons
        const manifestWithIcons = generateManifest({
          name: appName,
          shortName: finalShortName,
          startUrl: '/',
          scope: '/',
          display: 'standalone',
          themeColor: themeColor ?? '#ffffff',
          backgroundColor: backgroundColor ?? '#000000',
          icons: iconPaths.map((src) => ({
            src,
            sizes: src.match(/(\d+)x(\d+)/)?.[0] ?? '192x192',
            type: 'image/png',
          })),
        })
        
        manifestPath = generateAndWriteManifest(manifestWithIcons, finalOutputDir)
        result.manifestPath = manifestPath
        
        // Track manifest if it's new (not backed up)
        const manifestRelative = relative(result.projectPath, manifestPath)
        if (manifestRelative && !manifestRelative.startsWith('..')) {
          const wasBackedUp = transaction.getState().backups.some(b => {
            const backupRelative = relative(result.projectPath, b.path)
            return backupRelative === manifestRelative
          })
          if (!wasBackedUp) {
            transaction.trackCreatedFile(manifestRelative)
          }
        }
        
        console.log(chalk.green(`✓ Manifest generated: ${manifestPath}`))
      } else {
        // Minimal manifest without icons (use placeholder icon)
        // Note: Manifest requires at least one icon according to Zod schema
        // Create manifest with placeholder icon that must be replaced
        result.warnings.push('No icons provided. Manifest generated with placeholder icon. Please provide an icon source with --icon-source for production.')
        console.log(chalk.yellow('⚠ Generating manifest with placeholder icon'))
        
        // Create manifest with placeholder icon
        // finalShortName is already validated above
        const manifestMinimal = generateManifest({
          name: appName,
          shortName: finalShortName,
          startUrl: '/',
          scope: '/',
          display: 'standalone',
          themeColor: themeColor ?? '#ffffff',
          backgroundColor: backgroundColor ?? '#000000',
          icons: [{
            src: '/icon-192x192.png', // Placeholder - user must add a real icon
            sizes: '192x192',
            type: 'image/png',
          }],
        })
        
        manifestPath = generateAndWriteManifest(manifestMinimal, finalOutputDir)
        result.manifestPath = manifestPath
        
        // Track manifest if it's new (not backed up)
        const manifestRelative = relative(result.projectPath, manifestPath)
        if (manifestRelative && !manifestRelative.startsWith('..')) {
          const wasBackedUp = transaction.getState().backups.some(b => {
            const backupRelative = relative(result.projectPath, b.path)
            return backupRelative === manifestRelative
          })
          if (!wasBackedUp) {
            transaction.trackCreatedFile(manifestRelative)
          }
        }
        
        console.log(chalk.green(`✓ Manifest generated: ${manifestPath}`))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorCode = detectErrorCode(error)
      const formattedError = formatError(errorCode, errorMessage)
      result.errors.push(formattedError)
      console.log(chalk.red(`✗ ${formattedError}`))
      
      // Rollback on critical error
      if (transaction) {
        transaction.rollback()
      }
      return result
    }

    // Generate service worker with adaptive cache strategies
    if (!skipServiceWorker) {
      console.log(chalk.blue('⚙️ Generating service worker...'))
      
      try {
        // Optimize project to get adaptive cache strategies
        const optimizationResult = await optimizeProject(
          result.projectPath,
          scanResult.assets,
          scanResult.framework.configuration,
          result.framework,
          iconSource,
        )

        // Convert adaptive cache strategies to runtime caching format
        const runtimeCaching = optimizationResult.cacheStrategies.map((strategy) => ({
          urlPattern: strategy.urlPattern,
          handler: strategy.handler,
          options: strategy.options,
        }))

        let swResult
        if (runtimeCaching.length > 0) {
          // Use generateSimpleServiceWorker when we have adaptive cache strategies
          console.log(chalk.gray(`  Detected ${optimizationResult.apiType} API, applying ${optimizationResult.cacheStrategies.length} adaptive cache strategy(ies)`))
          swResult = await generateSimpleServiceWorker({
            projectPath: result.projectPath,
            outputDir: finalOutputDir,
            architecture: result.architecture,
            globDirectory: finalOutputDir,
            globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,svg,webp,woff,woff2}'],
            runtimeCaching,
          })
        } else {
          // Use generateServiceWorker with template when no adaptive strategies
          swResult = await generateServiceWorker({
            projectPath: result.projectPath,
            outputDir: finalOutputDir,
            architecture: result.architecture,
            framework: result.framework,
            globDirectory: finalOutputDir,
            globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,svg,webp,woff,woff2}'],
          })
        }
        
        result.serviceWorkerPath = swResult.swPath
        console.log(chalk.green(`✓ Service worker generated: ${result.serviceWorkerPath}`))
        console.log(chalk.gray(`  Pre-cached ${swResult.count} files`))
        
        // Track service worker if it's new (not backed up)
        const swRelative = relative(result.projectPath, swResult.swPath)
        if (swRelative && !swRelative.startsWith('..')) {
          const wasBackedUp = transaction.getState().backups.some(b => {
            const backupRelative = relative(result.projectPath, b.path)
            return backupRelative === swRelative
          })
          if (!wasBackedUp) {
            transaction.trackCreatedFile(swRelative)
          }
        }
        
        // Log asset optimization suggestions if any
        if (optimizationResult.assetSuggestions.length > 0) {
          const highPrioritySuggestions = optimizationResult.assetSuggestions.filter((s) => s.priority === 'high')
          if (highPrioritySuggestions.length > 0) {
            console.log(chalk.yellow(`⚠ ${highPrioritySuggestions.length} high-priority asset optimization suggestion(s) found`))
            highPrioritySuggestions.slice(0, 3).forEach((suggestion) => {
              console.log(chalk.gray(`  - ${suggestion.suggestion}`))
            })
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorCode = detectErrorCode(error)
        const formattedError = formatError(errorCode, errorMessage)
        result.errors.push(formattedError)
        console.log(chalk.red(`✗ ${formattedError}`))
        
        // Rollback on critical error
        if (transaction) {
          transaction.rollback()
        }
        return result
      }
    }

    // Inject meta-tags into HTML files
    if (!skipInjection) {
      console.log(chalk.blue('💉 Injecting meta-tags...'))
      
      try {
        // Find all HTML files (including dist/ for production builds)
        // Priority: dist/ > public/ > root
        const htmlFiles = await glob('**/*.html', {
          cwd: result.projectPath,
          ignore: ['**/node_modules/**', '**/.next/**', '**/.nuxt/**'],
          absolute: true,
        })
        
        // Sort: dist/ files first, then public/, then others
        htmlFiles.sort((a, b) => {
          const aInDist = a.includes('/dist/')
          const bInDist = b.includes('/dist/')
          const aInPublic = a.includes('/public/')
          const bInPublic = b.includes('/public/')
          
          if (aInDist && !bInDist) return -1
          if (!aInDist && bInDist) return 1
          if (aInPublic && !bInPublic) return -1
          if (!aInPublic && bInPublic) return 1
          return 0
        })

        // Limiter le nombre de fichiers HTML si maxHtmlFiles est défini
        const htmlFilesToProcess = maxHtmlFiles && maxHtmlFiles > 0
          ? htmlFiles.slice(0, maxHtmlFiles)
          : htmlFiles

        if (htmlFiles.length > 0) {
          console.log(chalk.gray(`  Found ${htmlFiles.length} HTML file(s)${maxHtmlFiles && maxHtmlFiles > 0 ? ` (processing ${htmlFilesToProcess.length})` : ''}`))
        }

        // Backup HTML files before injection
        for (const htmlFile of htmlFilesToProcess) {
          const htmlRelativePath = relative(result.projectPath, htmlFile)
          if (htmlRelativePath && !htmlRelativePath.startsWith('..')) {
            transaction.backupFile(htmlRelativePath)
          }
        }

        let injectedCount = 0
        let processedCount = 0
        const totalFiles = htmlFilesToProcess.length

        for (const htmlFile of htmlFilesToProcess) {
          processedCount++
          // Log progression pour gros projets (tous les 50 fichiers ou à la fin)
          if (totalFiles > 50 && (processedCount % 50 === 0 || processedCount === totalFiles)) {
            console.log(chalk.gray(`  Processing ${processedCount}/${totalFiles} files...`))
          }

          try {
            // Normalize paths securely
            // For Vite/React, files in public/ or dist/ are served at root
            const normalizePathForInjection = (fullPath: string | undefined, basePath: string, outputDir: string, fallback: string): string => {
              if (!fullPath) return fallback
              try {
                // Check if HTML file is in dist/ (production build)
                const htmlInDist = htmlFile.includes('/dist/')
                const swInDist = fullPath.includes('/dist/')
                
                // If HTML is in dist/, paths should be relative to dist/ root
                if (htmlInDist && swInDist) {
                  // Both in dist/, use relative path from dist/ root
                  const distIndex = fullPath.indexOf('/dist/')
                  if (distIndex !== -1) {
                    const distPath = fullPath.substring(distIndex + 6) // Remove up to /dist/
                    return distPath.startsWith('/') ? distPath : `/${distPath}`
                  }
                }
                
                // If path is in outputDir (e.g., public/), it must be served at root
                const rel = relativePath(fullPath, basePath)
                let normalized = rel.startsWith('/') ? rel : `/${rel}`
                
                // For Vite/React, if file is in public/ or dist/, remove directory from path
                // Ex: /public/sw.js -> /sw.js
                // Ex: /dist/sw.js -> /sw.js
                // Ex: /public/manifest.json -> /manifest.json
                const outputDirName = outputDir.replace(basePath, '').replace(/^\/+|\/+$/g, '')
                if (outputDirName && normalized.startsWith(`/${outputDirName}/`)) {
                  normalized = normalized.replace(`/${outputDirName}/`, '/')
                }
                
                // Also handle dist/ directory if present
                if (normalized.includes('/dist/')) {
                  const distIndex = normalized.indexOf('/dist/')
                  normalized = normalized.substring(distIndex + 6)
                  normalized = normalized.startsWith('/') ? normalized : `/${normalized}`
                }
                
                return normalized
              } catch {
                return fallback
              }
            }
            
            // Determine apple-touch-icon path
            const appleTouchIconFullPath = join(finalOutputDir, 'apple-touch-icon.png')
            const appleTouchIconExists = existsSync(appleTouchIconFullPath)
            
            const injectionResult = injectMetaTagsInFile(htmlFile, {
              manifestPath: normalizePathForInjection(result.manifestPath, result.projectPath, finalOutputDir, '/manifest.json'),
              themeColor: themeColor ?? '#ffffff',
              backgroundColor: backgroundColor ?? '#000000',
              appleTouchIcon: appleTouchIconExists 
                ? normalizePathForInjection(appleTouchIconFullPath, result.projectPath, finalOutputDir, '/apple-touch-icon.png')
                : '/apple-touch-icon.png', // Placeholder if not generated
              appleMobileWebAppCapable: true,
              serviceWorkerPath: normalizePathForInjection(result.serviceWorkerPath, result.projectPath, finalOutputDir, '/sw.js'),
            })
            
            if (injectionResult.injected.length > 0) {
              injectedCount++
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            const errorCode = detectErrorCode(error)
            const warningMessage = formatError(errorCode, `${htmlFile}: ${errorMessage}`)
            result.warnings.push(warningMessage)
            console.log(chalk.yellow(`⚠ ${warningMessage}`))
          }
        }
        
        result.htmlFilesInjected = injectedCount
        console.log(chalk.green(`✓ Injected meta-tags in ${injectedCount} HTML file(s)`))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorCode = detectErrorCode(error)
        const formattedError = formatError(errorCode, errorMessage)
        result.errors.push(formattedError)
        console.log(chalk.red(`✗ ${formattedError}`))
        
        // Rollback on critical error
        if (transaction) {
          transaction.rollback()
        }
        return result
      }
    }

    result.success = result.errors.length === 0
    
    if (result.success) {
      // Commit transaction if everything succeeded
      if (transaction) {
        transaction.commit()
      }
      console.log(chalk.green('\n✅ PWA setup completed successfully!'))
    } else {
      // Rollback on errors
      if (transaction) {
        console.log(chalk.yellow('\n🔄 Rolling back changes due to errors...'))
        transaction.rollback()
      }
      console.log(chalk.red(`\n❌ PWA setup completed with ${result.errors.length} error(s)`))
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = detectErrorCode(error)
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

