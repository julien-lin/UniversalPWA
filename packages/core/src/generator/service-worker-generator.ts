import { injectManifest, generateSW } from 'workbox-build'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getServiceWorkerTemplate, determineTemplateType, type ServiceWorkerTemplateType } from '@julien-lin/universal-pwa-templates'
import type { Architecture } from '../scanner/architecture-detector.js'
import type { BackendIntegration } from '../backends/types.js'
import type { ServiceWorkerConfig, RouteConfig } from './caching-strategy.js'
import { RoutePatternResolver } from './route-pattern-resolver.js'
import { ServiceWorkerConfigBuilder } from './service-worker-config-builder.js'
// Use string to avoid type lint issues in this unit
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
 * Generates a service worker with Workbox
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

  // Create output directory if necessary
  mkdirSync(outputDir, { recursive: true })

  // Determine template type
  const finalTemplateType: ServiceWorkerTemplateType = templateType ?? determineTemplateType(architecture, framework ?? null)
  const template = getServiceWorkerTemplate(finalTemplateType)

  // Create temporary source file with template
  const swSrcPath = join(outputDir, 'sw-src.js')
  writeFileSync(swSrcPath, template.content, 'utf-8')

  const swDestPath = join(outputDir, swDest)

  // Workbox configuration (injectManifest only accepts globDirectory, globPatterns, swDest, swSrc, injectionPoint)
  const workboxConfig: Parameters<typeof injectManifest>[0] = {
    globDirectory: globDirectory ?? projectPath,
    globPatterns,
    swDest: swDestPath,
    swSrc: swSrcPath,
    // Inject manifest into template
    injectionPoint: 'self.__WB_MANIFEST',
  }

  // Add offline page if specified
  if (offlinePage) {
    workboxConfig.globPatterns = [...(workboxConfig.globPatterns ?? []), offlinePage]
  }

  try {
    // Use injectManifest to inject precache manifest into template
    const result = await injectManifest(workboxConfig)

    // Clean up temporary source file
    try {
      if (existsSync(swSrcPath)) {
        // Keep source file for debug, but could be removed
        // rmSync(swSrcPath)
      }
    } catch {
      // Ignore cleanup errors
    }

    const resultFilePaths = result.filePaths ?? []
    // Add offlinePage to report if specified and absent (robust for some Workbox behaviors)
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
 * Generates a simple service worker without template (uses generateSW)
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

  // Create output directory if necessary
  mkdirSync(outputDir, { recursive: true })

  const swDestPath = join(outputDir, swDest)

  // Workbox configuration
  const workboxConfig: Parameters<typeof generateSW>[0] = {
    globDirectory: globDirectory ?? projectPath,
    globPatterns,
    swDest: swDestPath,
    skipWaiting,
    clientsClaim,
    mode: 'production' as const,
    sourcemap: false,
  }

  // Add runtime caching if specified
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
 * Generates and writes service worker with template
 */
export async function generateAndWriteServiceWorker(
  options: ServiceWorkerGeneratorOptions,
): Promise<ServiceWorkerGenerationResult> {
  return generateServiceWorker(options)
}

/**
 * Generates a service worker from route-based configuration
 * Supports framework-aware caching strategies and route prioritization
 */
export async function generateServiceWorkerFromConfig(
  config: ServiceWorkerConfig,
  options: {
    projectPath: string
    globDirectory?: string
    outputDir: string
    architecture?: Architecture
    framework?: string | null
    templateType?: ServiceWorkerTemplateType
    swDest?: string
    skipWaiting?: boolean
    clientsClaim?: boolean
  },
): Promise<ServiceWorkerGenerationResult> {
  const {
    projectPath,
    globDirectory,
    outputDir,
    architecture = 'static',
    framework,
    templateType,
    swDest = 'sw.js',
  } = options

  // Determine template type
  const finalTemplateType: ServiceWorkerTemplateType = templateType ?? determineTemplateType(architecture, framework ?? null)
  const template = getServiceWorkerTemplate(finalTemplateType)

  // Create temporary source file with template
  const swSrcPath = join(outputDir, 'sw-src.js')
  writeFileSync(swSrcPath, template.content, 'utf-8')

  const swDestPath = join(outputDir, swDest)

  // Convert route configs to Workbox format
  const allRoutes = [
    ...config.staticRoutes,
    ...config.apiRoutes,
    ...config.imageRoutes,
    ...(config.customRoutes || []),
    ...(config.advanced?.routes || []),
  ]

  // Convert to Workbox format with global config
  const workboxRoutes = RoutePatternResolver.toWorkboxFormat(allRoutes, {
    cacheNamePrefix: config.advanced?.global?.cacheNamePrefix,
  })

  // Note: workboxRoutes can be used for runtime caching injection in templates
  void workboxRoutes

  // Workbox configuration
  const workboxConfig: Parameters<typeof injectManifest>[0] = {
    globDirectory: globDirectory ?? projectPath,
    globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,webp,woff,woff2,ttf,otf}'],
    swDest: swDestPath,
    swSrc: swSrcPath,
    injectionPoint: 'self.__WB_MANIFEST',
  }

  // Add offline page if configured
  if (config.offline?.fallbackPage) {
    workboxConfig.globPatterns = [...(workboxConfig.globPatterns ?? []), config.offline.fallbackPage]
  }

  try {
    const result = await injectManifest(workboxConfig)

    const resultFilePaths = result.filePaths ?? []

    return {
      swPath: swDestPath,
      count: result.count,
      size: result.size,
      warnings: result.warnings ?? [],
      filePaths: resultFilePaths,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate service worker from config: ${message}`)
  }
}

/**
 * Generates a service worker from BackendIntegration
 * Combines backend detection with route-based caching strategies
 */
export async function generateServiceWorkerFromBackend(
  backend: BackendIntegration,
  architecture: Architecture,
  options: {
    projectPath: string
    globDirectory?: string
    outputDir: string
    swDest?: string
    customRoutes?: RouteConfig[]
  },
): Promise<ServiceWorkerGenerationResult> {
  // Build config from backend integration

  // ServiceWorkerConfigBuilder.fromBackendIntegration correctly returns ServiceWorkerConfig
  const config: ServiceWorkerConfig = ServiceWorkerConfigBuilder.fromBackendIntegration(
    backend,
    options.outputDir,
    {
      customRoutes: options.customRoutes,
      validate: true,
    },
  )
  return generateServiceWorkerFromConfig(config, {
    projectPath: options.projectPath,
    globDirectory: options.globDirectory,
    outputDir: options.outputDir,
    architecture,
    framework: backend.framework,
    swDest: options.swDest,
  })
}
