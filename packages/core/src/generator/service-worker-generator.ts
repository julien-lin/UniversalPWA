import { injectManifest, generateSW } from 'workbox-build'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getServiceWorkerTemplate, determineTemplateType, type ServiceWorkerTemplateType } from '@universal-pwa/templates'
import type { Architecture } from '../scanner/architecture-detector.js'
// Utiliser string pour éviter les problèmes de type lint dans cette unité
// import type { Framework } from '../scanner/framework-detector'

type StrategyName = 'CacheFirst' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate' | 'CacheOnly'

export interface ServiceWorkerGeneratorOptions {
  projectPath: string
  outputDir: string
  architecture: Architecture
  framework?: string | null
  templateType?: ServiceWorkerTemplateType
  globDirectory?: string
  globPatterns?: string[]
  swDest?: string
  swSrc?: string
  skipWaiting?: boolean
  clientsClaim?: boolean
  offlinePage?: string
  runtimeCaching?: Array<{
    urlPattern: RegExp | string
    handler: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'
    options?: {
      cacheName?: string
      expiration?: {
        maxEntries?: number
        maxAgeSeconds?: number
      }
    }
  }>
}

export interface ServiceWorkerGenerationResult {
  swPath: string
  count: number
  size: number
  warnings: string[]
  filePaths: string[]
}

/**
 * Génère un service worker avec Workbox
 */
export async function generateServiceWorker(
  options: ServiceWorkerGeneratorOptions,
): Promise<ServiceWorkerGenerationResult> {
  const {
    projectPath,
    outputDir,
    architecture,
    framework,
    templateType,
    globDirectory,
    globPatterns = ['**/*.{js,css,html,png,jpg,jpeg,svg,webp,woff,woff2,ttf,otf}'],
    swDest = 'sw.js',
    offlinePage,
  } = options

  // Créer le répertoire de sortie si nécessaire
  mkdirSync(outputDir, { recursive: true })

  // Déterminer le type de template
  const finalTemplateType = templateType ?? determineTemplateType(architecture, framework ?? null)
  const template = getServiceWorkerTemplate(finalTemplateType)

  // Créer un fichier source temporaire avec le template
  const swSrcPath = join(outputDir, 'sw-src.js')
  writeFileSync(swSrcPath, template.content, 'utf-8')

  const swDestPath = join(outputDir, swDest)

  // Configuration Workbox (injectManifest accepte seulement globDirectory, globPatterns, swDest, swSrc, injectionPoint)
  const workboxConfig: Parameters<typeof injectManifest>[0] = {
    globDirectory: globDirectory ?? projectPath,
    globPatterns,
    swDest: swDestPath,
    swSrc: swSrcPath,
    // Injection du manifest dans le template
    injectionPoint: 'self.__WB_MANIFEST',
  }

  // Ajouter une page offline si spécifiée
  if (offlinePage) {
    workboxConfig.globPatterns = [...(workboxConfig.globPatterns ?? []), offlinePage]
  }

  try {
    // Utiliser injectManifest pour injecter le precache manifest dans le template
    const result = await injectManifest(workboxConfig)

    // Nettoyer le fichier source temporaire
    try {
      if (existsSync(swSrcPath)) {
        // On garde le fichier source pour debug, mais on pourrait le supprimer
        // rmSync(swSrcPath)
      }
    } catch {
      // Ignore cleanup errors
    }

    const resultFilePaths = result.filePaths ?? []
    // Ajoute offlinePage au rapport si spécifiée et absente (robuste pour certains comportements Workbox)
    const normalizedOffline = offlinePage ? offlinePage.replace(/^\.\//, '') : undefined
    const finalFilePaths = normalizedOffline && !resultFilePaths.some((p) => p.includes(normalizedOffline))
      ? [...resultFilePaths, normalizedOffline]
      : resultFilePaths

    return {
      swPath: swDestPath,
      count: result.count,
      size: result.size,
      warnings: result.warnings ?? [],
      filePaths: finalFilePaths,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate service worker: ${message}`)
  }
}

/**
 * Génère un service worker simple sans template (utilise generateSW)
 */
export async function generateSimpleServiceWorker(
  options: Omit<ServiceWorkerGeneratorOptions, 'templateType' | 'swSrc'>,
): Promise<ServiceWorkerGenerationResult> {
  const {
    projectPath,
    outputDir,
    globDirectory,
    globPatterns = ['**/*.{js,css,html,png,jpg,jpeg,svg,webp,woff,woff2,ttf,otf}'],
    swDest = 'sw.js',
    skipWaiting = true,
    clientsClaim = true,
    runtimeCaching,
  } = options

  // Créer le répertoire de sortie si nécessaire
  mkdirSync(outputDir, { recursive: true })

  const swDestPath = join(outputDir, swDest)

  // Configuration Workbox
  const workboxConfig: Parameters<typeof generateSW>[0] = {
    globDirectory: globDirectory ?? projectPath,
    globPatterns,
    swDest: swDestPath,
    skipWaiting,
    clientsClaim,
    mode: 'production' as const,
    sourcemap: false,
  }

  // Ajouter runtime caching si spécifié
  if (runtimeCaching && runtimeCaching.length > 0) {
    workboxConfig.runtimeCaching = runtimeCaching.map((cache) => {
      const handlerMap: Record<string, StrategyName> = {
        NetworkFirst: 'NetworkFirst',
        CacheFirst: 'CacheFirst',
        StaleWhileRevalidate: 'StaleWhileRevalidate',
        NetworkOnly: 'NetworkOnly',
        CacheOnly: 'CacheOnly',
      }
      const handler = handlerMap[cache.handler] ?? cache.handler
      return {
        urlPattern: typeof cache.urlPattern === 'string' ? new RegExp(cache.urlPattern) : cache.urlPattern,
        handler: handler,
        options: cache.options
          ? {
            cacheName: cache.options.cacheName,
            expiration: cache.options.expiration
              ? {
                maxEntries: cache.options.expiration.maxEntries,
                maxAgeSeconds: cache.options.expiration.maxAgeSeconds,
              }
              : undefined,
          }
          : undefined,
      }
    })
  }

  try {
    const result = await generateSW(workboxConfig)

    return {
      swPath: swDestPath,
      count: result.count,
      size: result.size,
      warnings: result.warnings ?? [],
      filePaths:
        ((result as { manifestEntries?: Array<string | { url: string }> }).manifestEntries ?? []).map((entry) =>
          typeof entry === 'string' ? entry : entry.url,
        ),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate service worker: ${message}`)
  }
}

/**
 * Génère et écrit le service worker avec template
 */
export async function generateAndWriteServiceWorker(
  options: ServiceWorkerGeneratorOptions,
): Promise<ServiceWorkerGenerationResult> {
  return generateServiceWorker(options)
}

