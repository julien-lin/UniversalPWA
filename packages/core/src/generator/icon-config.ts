/**
 * Advanced Icon Generation Configuration
 * Based on ICON-GENERATION-DESIGN.md
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import type { IconSize, SplashScreenSize } from './icon-generator.js'

/**
 * Source d'icône avec priorité
 */
export interface IconSource {
  /** Chemin vers l'image source */
  path: string
  /** Priorité (1 = plus haute, plus élevé = fallback) */
  priority: number
  /** Type de source */
  type?: 'primary' | 'fallback' | 'adaptive-foreground' | 'adaptive-background'
  /** Métadonnées de l'image */
  metadata?: {
    width?: number
    height?: number
    format?: string
  }
}

/**
 * Source de couleur pour adaptive icon background
 */
export interface ColorSource {
  type: 'color'
  value: string // Couleur hex (#RRGGBB)
}

/**
 * Configuration pour adaptive icons (Android 8+)
 */
export interface AdaptiveIconConfig {
  enabled: boolean
  foreground?: IconSource // Image foreground (requis si enabled)
  background?: IconSource | ColorSource // Image ou couleur de fond
  safeZone?: {
    width: number // Pourcentage de safe zone (défaut: 66%)
    height: number
  }
  outputFormats?: ('png' | 'webp')[] // Formats de sortie
}

/**
 * Configuration pour splash screens
 */
export interface SplashScreenConfig {
  enabled: boolean
  source?: IconSource // Source pour générer les splash screens
  themeColor?: string // Couleur de thème pour fond
  backgroundColor?: string // Couleur de fond
  platforms?: ('ios' | 'android' | 'all')[] // Plateformes cibles
  densities?: ('ldpi' | 'mdpi' | 'hdpi' | 'xhdpi' | 'xxhdpi' | 'xxxhdpi')[] // Densités Android
  sizes?: SplashScreenSize[] // Tailles personnalisées
}

/**
 * Configuration avancée pour la génération d'icônes
 */
export interface IconGenerationConfig {
  /** Sources d'icônes (hiérarchie de fallback) */
  sources: IconSource[]
  /** Configuration de génération */
  outputDir: string
  /** Format de sortie */
  format?: 'png' | 'webp' | 'auto' // 'auto' = PNG pour compatibilité, WebP si supporté
  /** Qualité (0-100, défaut: 90) */
  quality?: number
  /** Tailles d'icônes personnalisées */
  iconSizes?: IconSize[]
  /** Configuration adaptive icons (Android) */
  adaptiveIcons?: AdaptiveIconConfig
  /** Configuration splash screens */
  splashScreens?: SplashScreenConfig
  /** Options de validation */
  validate?: boolean
  strictValidation?: boolean
  /** Options de performance */
  parallel?: boolean // Génération parallèle (défaut: true)
  concurrency?: number // Nombre de générations simultanées (défaut: 10)
  /** Options d'optimisation */
  optimize?: boolean // Optimisation automatique (défaut: true)
  compressionLevel?: number // Niveau de compression PNG (0-9, défaut: 9)
}

/**
 * Détecte les sources d'icônes disponibles dans le projet
 */
export async function detectIconSources(projectPath: string): Promise<IconSource[]> {
  const commonPaths = [
    'icon.png',
    'logo.png',
    'favicon.png',
    'assets/icon.png',
    'assets/logo.png',
    'public/icon.png',
    'public/logo.png',
    'src/assets/icon.png',
    'src/assets/logo.png',
    'static/icon.png',
    'static/logo.png',
  ]

  const sources: IconSource[] = []
  let priority = 1

  for (const path of commonPaths) {
    const fullPath = join(projectPath, path)
    if (existsSync(fullPath)) {
      try {
        const metadata = await sharp(fullPath).metadata()
        sources.push({
          path: fullPath,
          priority: priority++,
          type: priority === 2 ? 'primary' : 'fallback',
          metadata: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
          },
        })
      } catch {
        // Ignore files that can't be read as images
      }
    }
  }

  return sources.sort((a, b) => a.priority - b.priority)
}

/**
 * Trouve la meilleure source d'icône disponible
 */
export function findBestIconSource(sources: IconSource[]): IconSource | null {
  if (sources.length === 0) {
    return null
  }

  // Retourner la source avec la priorité la plus haute (priority = 1)
  return sources.find((s) => s.priority === 1) || sources[0] || null
}

/**
 * Détecte le meilleur format selon le support navigateur
 */
export function determineOptimalFormat(
  config: IconGenerationConfig,
  _userAgent?: string,
): 'png' | 'webp' {
  if (config.format === 'png') return 'png'
  if (config.format === 'webp') return 'webp'

  // Auto: WebP si supporté, sinon PNG
  if (config.format === 'auto') {
    // WebP est largement supporté maintenant, on peut l'utiliser par défaut
    // mais on garde PNG pour apple-touch-icon et favicon pour compatibilité
    return 'webp'
  }

  return 'png' // Par défaut
}

/**
 * Optimise la qualité selon la taille de l'icône
 */
export function getOptimalQuality(size: IconSize, baseQuality: number = 90): number {
  // Petites icônes : qualité plus élevée
  if (size.width <= 96) {
    return Math.min(100, baseQuality + 5)
  }

  // Grandes icônes : qualité légèrement réduite (gain de taille)
  if (size.width >= 512) {
    return Math.max(80, baseQuality - 5)
  }

  return baseQuality
}
