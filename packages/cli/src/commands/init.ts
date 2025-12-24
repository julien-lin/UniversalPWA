import { scanProject } from '@julien-lin/universal-pwa-core'
import { generateManifest, generateAndWriteManifest } from '@julien-lin/universal-pwa-core'
import { generateIcons } from '@julien-lin/universal-pwa-core'
import { generateServiceWorker } from '@julien-lin/universal-pwa-core'
import { injectMetaTagsInFile } from '@julien-lin/universal-pwa-core'
import { checkProjectHttps } from '@julien-lin/universal-pwa-core'
import chalk from 'chalk'
import { existsSync } from 'fs'
import { glob } from 'glob'
import { join, resolve, relative, normalize } from 'path'
import type { Framework } from '@julien-lin/universal-pwa-core'
import type { Architecture } from '@julien-lin/universal-pwa-core'

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
 * Normalise un chemin de manière sécurisée en le convertissant en chemin relatif
 */
function relativePath(fullPath: string, basePath: string): string {
  try {
    const rel = relative(basePath, fullPath)
    // Normaliser et s'assurer que le chemin commence par /
    const normalized = normalize(rel).replace(/\\/g, '/')
    return normalized.startsWith('/') ? normalized : `/${normalized}`
  } catch {
    // En cas d'erreur, retourner le chemin tel quel (sera validé ailleurs)
    return fullPath
  }
}

/**
 * Commande init : scanne le projet et génère les fichiers PWA
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

  try {
    // Vérifier que le chemin existe
    if (!existsSync(result.projectPath)) {
      result.errors.push(`Project path does not exist: ${result.projectPath}`)
      return result
    }

    console.log(chalk.blue('🔍 Scanning project...'))
    
    // Scanner le projet
    const scanResult = await scanProject({
      projectPath: result.projectPath,
      includeAssets: true,
      includeArchitecture: true,
    })

    result.framework = scanResult.framework.framework
    result.architecture = scanResult.architecture.architecture

    console.log(chalk.green(`✓ Framework detected: ${result.framework ?? 'Unknown'}`))
    console.log(chalk.green(`✓ Architecture: ${result.architecture}`))

    // Vérifier HTTPS
    const httpsCheck = checkProjectHttps({ projectPath: result.projectPath })
    if (!httpsCheck.isSecure && !httpsCheck.isLocalhost) {
      result.warnings.push(httpsCheck.warning ?? 'HTTPS required for production PWA')
      console.log(chalk.yellow(`⚠ ${httpsCheck.warning}`))
    }

    // Déterminer le répertoire de sortie
    const finalOutputDir = outputDir ?? (result.framework === 'WordPress' ? join(result.projectPath, 'public') : join(result.projectPath, 'public'))

    // Générer le manifest
    console.log(chalk.blue('📝 Generating manifest.json...'))
    
    const appName = name ?? (result.framework ? `${result.framework} App` : 'My PWA')
    const appShortName = shortName ?? appName.substring(0, 12)

    // Générer les icônes si une source est fournie
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
          
          console.log(chalk.green(`✓ Generated ${result.iconsGenerated} icons`))
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          result.errors.push(`Failed to generate icons: ${errorMessage}`)
          console.log(chalk.red(`✗ Failed to generate icons: ${errorMessage}`))
        }
      } else {
        result.warnings.push(`Icon source not found: ${iconSourcePath}`)
      }
    }

    // Mettre à jour le manifest avec les icônes
    if (iconPaths.length > 0) {
      const manifestWithIcons = generateManifest({
        name: appName,
        shortName: appShortName,
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
      
      const manifestPath = generateAndWriteManifest(manifestWithIcons, finalOutputDir)
      result.manifestPath = manifestPath
    } else {
      // Si pas d'icônes, créer une icône placeholder ou utiliser une icône par défaut
      result.warnings.push('No icons provided. Manifest requires at least one icon. Please provide an icon source with --icon-source')
      console.log(chalk.yellow('⚠ Manifest not generated: icons are required'))
    }

    // Générer le service worker
    if (!skipServiceWorker) {
      console.log(chalk.blue('⚙️ Generating service worker...'))
      
      try {
        const swResult = await generateServiceWorker({
          projectPath: result.projectPath,
          outputDir: finalOutputDir,
          architecture: result.architecture,
          framework: result.framework,
          globDirectory: finalOutputDir,
          globPatterns: ['**/*.{html,js,css,png,jpg,jpeg,svg,webp,woff,woff2}'],
        })
        
        result.serviceWorkerPath = swResult.swPath
        console.log(chalk.green(`✓ Service worker generated: ${result.serviceWorkerPath}`))
        console.log(chalk.gray(`  Pre-cached ${swResult.count} files`))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push(`Failed to generate service worker: ${errorMessage}`)
        console.log(chalk.red(`✗ Failed to generate service worker: ${errorMessage}`))
      }
    }

    // Injecter les meta-tags dans les fichiers HTML
    if (!skipInjection) {
      console.log(chalk.blue('💉 Injecting meta-tags...'))
      
      try {
        // Trouver tous les fichiers HTML
        const htmlFiles = await glob('**/*.html', {
          cwd: result.projectPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.nuxt/**'],
          absolute: true,
        })

        let injectedCount = 0
        for (const htmlFile of htmlFiles.slice(0, 10)) {
          // Limiter à 10 fichiers pour éviter de surcharger
          try {
            // Normaliser les chemins de manière sécurisée
            const normalizePathForInjection = (fullPath: string | undefined, basePath: string, fallback: string): string => {
              if (!fullPath) return fallback
              try {
                const rel = relativePath(fullPath, basePath)
                return rel.startsWith('/') ? rel : `/${rel}`
              } catch {
                return fallback
              }
            }
            
            const injectionResult = injectMetaTagsInFile(htmlFile, {
              manifestPath: normalizePathForInjection(result.manifestPath, result.projectPath, '/manifest.json'),
              themeColor: themeColor ?? '#ffffff',
              backgroundColor: backgroundColor ?? '#000000',
              appleTouchIcon: iconPaths.find((p) => p.includes('180')) ?? '/apple-touch-icon.png',
              appleMobileWebAppCapable: true,
              serviceWorkerPath: normalizePathForInjection(result.serviceWorkerPath, result.projectPath, '/sw.js'),
            })
            
            if (injectionResult.injected.length > 0) {
              injectedCount++
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            result.warnings.push(`Failed to inject meta-tags in ${htmlFile}: ${errorMessage}`)
          }
        }
        
        result.htmlFilesInjected = injectedCount
        console.log(chalk.green(`✓ Injected meta-tags in ${injectedCount} HTML file(s)`))
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        result.errors.push(`Failed to inject meta-tags: ${errorMessage}`)
        console.log(chalk.red(`✗ Failed to inject meta-tags: ${errorMessage}`))
      }
    }

    result.success = result.errors.length === 0
    
    if (result.success) {
      console.log(chalk.green('\n✅ PWA setup completed successfully!'))
    } else {
      console.log(chalk.red(`\n❌ PWA setup completed with ${result.errors.length} error(s)`))
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    result.errors.push(`Unexpected error: ${errorMessage}`)
    console.log(chalk.red(`✗ Unexpected error: ${errorMessage}`))
    return result
  }
}

