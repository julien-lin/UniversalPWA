import { existsSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'
import type { AssetDetectionResult } from './asset-detector.js'
import type { ProjectConfiguration } from './framework-detector.js'

export type CacheStrategy = 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'
export type ApiType = 'REST' | 'GraphQL' | 'Mixed' | 'None'

export interface AdaptiveCacheStrategy {
  urlPattern: string | RegExp
  handler: CacheStrategy
  options?: {
    cacheName?: string
    expiration?: {
      maxEntries?: number
      maxAgeSeconds?: number
    }
    networkTimeoutSeconds?: number
  }
}

export interface OptimizedManifestConfig {
  themeColor?: string
  backgroundColor?: string
  shortName?: string
}

export interface AssetOptimizationSuggestion {
  file: string
  suggestion: string
  priority: 'high' | 'medium' | 'low'
}

export interface OptimizationResult {
  cacheStrategies: AdaptiveCacheStrategy[]
  manifestConfig: OptimizedManifestConfig
  assetSuggestions: AssetOptimizationSuggestion[]
  apiType: ApiType
}

/**
 * Détecte le type d'API (REST, GraphQL, Mixed, None)
 */
export function detectApiType(projectPath: string, assets: AssetDetectionResult): ApiType {
  const indicators: string[] = []
  let hasRest = false
  let hasGraphQL = false

  // Détecter GraphQL
  const graphqlIndicators = [
    'graphql',
    'gql',
    'apollo',
    'relay',
    'urql',
  ]

  // Chercher dans les fichiers JS/TS
  const checkFiles = async (files: string[], patterns: string[]): Promise<boolean> => {
    for (const file of files.slice(0, 20)) {
      // Limiter à 20 fichiers pour performance
      try {
        const content = readFileSync(file, 'utf-8').toLowerCase()
        for (const pattern of patterns) {
          if (content.includes(pattern)) {
            return true
          }
        }
      } catch {
        // Ignore read errors
      }
    }
    return false
  }

  // Vérifier package.json pour GraphQL
  const packageJsonPath = join(projectPath, 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const packageContent = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const dependencies = {
        ...(packageContent.dependencies ?? {}),
        ...(packageContent.devDependencies ?? {}),
      }

      // GraphQL
      if (
        dependencies['graphql'] ||
        dependencies['apollo-client'] ||
        dependencies['@apollo/client'] ||
        dependencies['relay-runtime'] ||
        dependencies['urql']
      ) {
        hasGraphQL = true
        indicators.push('GraphQL library detected')
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Vérifier les routes API détectées
  if (assets.apiRoutes.length > 0) {
    hasRest = assets.apiRoutes.some((route) => route.includes('/api/') || route.includes('/rest/'))
    if (assets.apiRoutes.some((route) => route.includes('/graphql'))) {
      hasGraphQL = true
    }
  }

  // Vérifier dans les fichiers source (async mais on fait une version synchrone simplifiée)
  if (assets.javascript.length > 0) {
    const jsContent = assets.javascript.slice(0, 10).map((file) => {
      try {
        return readFileSync(file, 'utf-8').toLowerCase()
      } catch {
        return ''
      }
    }).join(' ')

    if (graphqlIndicators.some((ind) => jsContent.includes(ind))) {
      hasGraphQL = true
      indicators.push('GraphQL usage in code')
    }

    if (jsContent.includes('/api/') || jsContent.includes('fetch(') || jsContent.includes('axios')) {
      hasRest = true
      indicators.push('REST API usage in code')
    }
  }

  if (hasGraphQL && hasRest) {
    return 'Mixed'
  }
  if (hasGraphQL) {
    return 'GraphQL'
  }
  if (hasRest) {
    return 'REST'
  }
  return 'None'
}

/**
 * Génère des stratégies de cache adaptatives selon le type d'API et la configuration
 */
export function generateAdaptiveCacheStrategies(
  apiType: ApiType,
  assets: AssetDetectionResult,
  configuration: ProjectConfiguration,
): AdaptiveCacheStrategy[] {
  const strategies: AdaptiveCacheStrategy[] = []

  // Stratégie pour les APIs REST
  if (apiType === 'REST' || apiType === 'Mixed') {
    strategies.push({
      urlPattern: '/api/.*',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-rest-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes pour REST
        },
        networkTimeoutSeconds: 3,
      },
    })
  }

  // Stratégie pour GraphQL
  if (apiType === 'GraphQL' || apiType === 'Mixed') {
    strategies.push({
      urlPattern: '/graphql',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-graphql-cache',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 2 * 60, // 2 minutes pour GraphQL (plus court car souvent mutations)
        },
        networkTimeoutSeconds: 5, // Plus long pour GraphQL
      },
    })
  }

  // Stratégie adaptative selon le build tool
  if (configuration.buildTool === 'vite') {
    // Vite génère des assets avec hash, on peut utiliser CacheFirst
    strategies.push({
      urlPattern: '/assets/.*',
      handler: 'CacheFirst',
      options: {
        cacheName: 'vite-assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
        },
      },
    })
  } else if (configuration.buildTool === 'webpack') {
    // Webpack aussi génère des hash, mais souvent dans un dossier spécifique
    strategies.push({
      urlPattern: '/(static|_next|assets)/.*',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'webpack-assets-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
        },
      },
    })
  }

  // Stratégie pour CSS-in-JS (les styles sont souvent injectés dynamiquement)
  if (configuration.cssInJs.length > 0) {
    strategies.push({
      urlPattern: '/.*\\.css',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'css-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
        },
      },
    })
  }

  return strategies
}

/**
 * Détecte les images non optimisées et suggère des optimisations
 */
export function detectUnoptimizedImages(assets: AssetDetectionResult): AssetOptimizationSuggestion[] {
  const suggestions: AssetOptimizationSuggestion[] = []

  for (const imagePath of assets.images) {
    try {
      const stats = statSync(imagePath)
      const sizeInMB = stats.size / (1024 * 1024)
      const ext = imagePath.toLowerCase().split('.').pop()

      // Détecter images lourdes
      if (sizeInMB > 1) {
        suggestions.push({
          file: imagePath,
          suggestion: `Image > 1MB (${sizeInMB.toFixed(2)}MB). Considérer compression ou conversion WebP.`,
          priority: 'high',
        })
      } else if (sizeInMB > 0.5) {
        suggestions.push({
          file: imagePath,
          suggestion: `Image > 500KB (${sizeInMB.toFixed(2)}MB). Considérer optimisation.`,
          priority: 'medium',
        })
      }

      // Détecter formats non optimaux
      if (ext === 'png' && sizeInMB > 0.1) {
        suggestions.push({
          file: imagePath,
          suggestion: 'PNG volumineux. Considérer conversion WebP ou JPEG si pas de transparence.',
          priority: 'medium',
        })
      }

      if (ext === 'jpg' || ext === 'jpeg') {
        suggestions.push({
          file: imagePath,
          suggestion: 'JPEG détecté. Considérer conversion WebP pour meilleure compression.',
          priority: 'low',
        })
      }
    } catch {
      // Ignore stat errors
    }
  }

  return suggestions
}

/**
 * Génère un short_name optimal depuis un nom
 */
export function generateOptimalShortName(name: string): string {
  if (!name || name.trim().length === 0) {
    return 'PWA'
  }

  const cleanName = name.trim()

  // Si déjà court, retourner tel quel (max 12 caractères)
  if (cleanName.length <= 12) {
    return cleanName
  }

  // Essayer d'extraire les initiales des mots
  const words = cleanName.split(/[\s\-_]+/).filter((w) => w.length > 0)
  if (words.length > 1) {
    const initials = words.map((w) => w[0].toUpperCase()).join('')
    if (initials.length <= 12) {
      return initials
    }
  }

  // Prendre les premiers caractères significatifs
  // Enlever les articles et mots communs
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']
  const significantWords = words.filter((w) => !stopWords.includes(w.toLowerCase()))
  
  if (significantWords.length > 0) {
    const firstWord = significantWords[0]
    if (firstWord.length <= 12) {
      return firstWord.substring(0, 12)
    }
    return firstWord.substring(0, 12)
  }

  // Fallback: premiers 12 caractères
  return cleanName.substring(0, 12)
}

/**
 * Détecte les couleurs dominantes depuis une image (version simplifiée)
 * Note: Pour une implémentation complète, utiliser une librairie comme 'colorthief' ou 'node-vibrant'
 */
export async function detectDominantColors(imagePath: string): Promise<{ themeColor: string; backgroundColor: string } | null> {
  // Pour l'instant, on retourne null car cela nécessiterait une dépendance externe
  // Cette fonction peut être étendue plus tard avec une librairie de détection de couleurs
  // Pour Phase 3.2, on se concentre sur la structure, l'implémentation complète sera en Phase 3.2.3
  return null
}

/**
 * Suggère theme_color et background_color basés sur le framework ou des images
 */
export async function suggestManifestColors(
  projectPath: string,
  framework: string | null,
  iconSource?: string,
): Promise<{ themeColor: string; backgroundColor: string }> {
  // Si une icône source est fournie, essayer de détecter les couleurs
  if (iconSource) {
    const iconPath = existsSync(iconSource) ? iconSource : join(projectPath, iconSource)
    if (existsSync(iconPath)) {
      const colors = await detectDominantColors(iconPath)
      if (colors) {
        return colors
      }
    }
  }

  // Fallback: couleurs par défaut selon le framework
  const frameworkColors: Record<string, { themeColor: string; backgroundColor: string }> = {
    react: { themeColor: '#61dafb', backgroundColor: '#282c34' },
    vue: { themeColor: '#42b983', backgroundColor: '#ffffff' },
    angular: { themeColor: '#dd0031', backgroundColor: '#ffffff' },
    nextjs: { themeColor: '#000000', backgroundColor: '#ffffff' },
    nuxt: { themeColor: '#00dc82', backgroundColor: '#ffffff' },
    svelte: { themeColor: '#ff3e00', backgroundColor: '#ffffff' },
    wordpress: { themeColor: '#21759b', backgroundColor: '#ffffff' },
    symfony: { themeColor: '#000000', backgroundColor: '#ffffff' },
    laravel: { themeColor: '#ff2d20', backgroundColor: '#ffffff' },
  }

  if (framework && frameworkColors[framework.toLowerCase()]) {
    return frameworkColors[framework.toLowerCase()]
  }

  // Défaut universel
  return { themeColor: '#ffffff', backgroundColor: '#000000' }
}

/**
 * Fonction principale d'optimisation
 */
export async function optimizeProject(
  projectPath: string,
  assets: AssetDetectionResult,
  configuration: ProjectConfiguration,
  framework: string | null,
  iconSource?: string,
): Promise<OptimizationResult> {
  // Détecter le type d'API
  const apiType = detectApiType(projectPath, assets)

  // Générer stratégies de cache adaptatives
  const cacheStrategies = generateAdaptiveCacheStrategies(apiType, assets, configuration)

  // Détecter images non optimisées
  const assetSuggestions = detectUnoptimizedImages(assets)

  // Suggérer couleurs pour manifest
  const manifestColors = await suggestManifestColors(projectPath, framework, iconSource)

  return {
    cacheStrategies,
    manifestConfig: {
      themeColor: manifestColors.themeColor,
      backgroundColor: manifestColors.backgroundColor,
    },
    assetSuggestions,
    apiType,
  }
}

