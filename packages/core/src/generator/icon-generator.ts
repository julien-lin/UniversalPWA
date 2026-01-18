import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ManifestIcon, ManifestSplashScreen } from './manifest-generator.js'
import { validateIconSource, type IconValidationResult } from '../validator/icon-validator.js'
import { logger } from '../utils/logger.js'
import {
  type IconGenerationConfig,
  type IconSource,
  detectIconSources,
  findBestIconSource,
  determineOptimalFormat,
  getOptimalQuality,
} from './icon-config.js'
import { processInParallel } from '../utils/parallel-processor.js'

export interface IconSize {
  width: number
  height: number
  name: string
}

export interface SplashScreenSize {
  width: number
  height: number
  name: string
}

// Standard PWA icon sizes
export const STANDARD_ICON_SIZES: IconSize[] = [
  { width: 72, height: 72, name: 'icon-72x72.png' },
  { width: 96, height: 96, name: 'icon-96x96.png' },
  { width: 128, height: 128, name: 'icon-128x128.png' },
  { width: 144, height: 144, name: 'icon-144x144.png' },
  { width: 152, height: 152, name: 'icon-152x152.png' },
  { width: 192, height: 192, name: 'icon-192x192.png' },
  { width: 384, height: 384, name: 'icon-384x384.png' },
  { width: 512, height: 512, name: 'icon-512x512.png' },
]

// iOS/Android splash screen sizes
export const STANDARD_SPLASH_SIZES: SplashScreenSize[] = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' }, // iPhone 5
  { width: 750, height: 1334, name: 'splash-750x1334.png' }, // iPhone 6/7/8
  { width: 828, height: 1792, name: 'splash-828x1792.png' }, // iPhone XR
  { width: 1125, height: 2436, name: 'splash-1125x2436.png' }, // iPhone X/XS
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' }, // iPhone XS Max
  { width: 1536, height: 2048, name: 'splash-1536x2048.png' }, // iPad
  { width: 2048, height: 2732, name: 'splash-2048x2732.png' }, // iPad Pro
]

export interface IconGeneratorOptions {
  sourceImage: string
  outputDir: string
  iconSizes?: IconSize[]
  splashSizes?: SplashScreenSize[]
  format?: 'png' | 'webp' | 'auto'
  quality?: number
  validate?: boolean // Validate icon before generation (default: false)
  strictValidation?: boolean // If true, throw error on validation failure (default: false)
  // Options avancées
  optimize?: boolean // Optimisation automatique (défaut: true)
  parallel?: boolean // Génération parallèle (défaut: true)
  concurrency?: number // Nombre de générations simultanées (défaut: 10)
}

export interface IconGenerationResult {
  icons: ManifestIcon[]
  splashScreens: ManifestSplashScreen[]
  generatedFiles: string[]
  validation?: IconValidationResult
}

/**
 * Generates all PWA icons from a source image (legacy API)
 * @deprecated Use generateIconsAdvanced for multi-source support
 */
export async function generateIcons(options: IconGeneratorOptions): Promise<IconGenerationResult> {
  // Convert legacy options to new config format
  const config: IconGenerationConfig = {
    sources: [
      {
        path: options.sourceImage,
        priority: 1,
        type: 'primary',
      },
    ],
    outputDir: options.outputDir,
    format: options.format || 'png',
    quality: options.quality || 90,
    iconSizes: options.iconSizes,
    validate: options.validate,
    strictValidation: options.strictValidation,
    optimize: options.optimize !== false,
    parallel: options.parallel !== false,
    concurrency: options.concurrency || 10,
  }

  return generateIconsAdvanced(config, {
    splashSizes: options.splashSizes,
  })
}

/**
 * Generates all PWA icons using advanced configuration with multi-source support
 */
export async function generateIconsAdvanced(
  config: IconGenerationConfig,
  options?: {
    splashSizes?: SplashScreenSize[]
  },
): Promise<IconGenerationResult> {
  const {
    sources,
    outputDir,
    format = 'png',
    quality = 90,
    iconSizes = STANDARD_ICON_SIZES,
    validate = false,
    strictValidation = false,
    optimize = true,
    parallel = true,
    concurrency = 10,
  } = config

  // Find best source or use first available
  const bestSource = findBestIconSource(sources)
  if (!bestSource || !existsSync(bestSource.path)) {
    throw new Error(`No valid icon source found. Checked ${sources.length} source(s)`)
  }

  const sourceImage = bestSource.path

  // Validate icon if requested
  let validation: IconValidationResult | undefined
  if (validate) {
    validation = await validateIconSource({
      sourceImage,
      strict: strictValidation,
    })

    if (strictValidation && !validation.valid) {
      const errorMessages = validation.errors.join('; ')
      throw new Error(`Icon validation failed: ${errorMessages}`)
    }
  }

  // Create output directory if necessary
  mkdirSync(outputDir, { recursive: true })

  const generatedFiles: string[] = []
  const icons: ManifestIcon[] = []
  const splashScreens: ManifestSplashScreen[] = []

  // Load source image with Sharp
  const image = sharp(sourceImage)
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to read image dimensions')
  }

  // Determine optimal format
  const finalFormat = determineOptimalFormat(config)

  // Generate icons (parallel or sequential)
  if (parallel) {
    const iconResults = await processInParallel(
      iconSizes,
      async (size) => {
        const outputPath = join(outputDir, size.name)
        const optimalQuality = optimize ? getOptimalQuality(size, quality) : quality

        try {
          let pipeline = image.clone().resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          })

          if (finalFormat === 'png') {
            pipeline = pipeline.png({
              quality: optimalQuality,
              compressionLevel: config.compressionLevel || 9,
            })
          } else {
            pipeline = pipeline.webp({ quality: optimalQuality })
          }

          await pipeline.toFile(outputPath)

          return {
            success: true as const,
            file: outputPath,
            icon: {
              src: `/${size.name}`,
              sizes: `${size.width}x${size.height}`,
              type: finalFormat === 'png' ? 'image/png' : 'image/webp',
              purpose: size.width >= 192 && size.width <= 512 ? 'any' : undefined,
            },
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          throw new Error(`Failed to generate icon ${size.name}: ${message}`)
        }
      },
      {
        concurrency,
        continueOnError: false,
      },
    )

    for (const result of iconResults.successful) {
      generatedFiles.push(result.result.file)
      icons.push(result.result.icon)
    }

    if (iconResults.failed.length > 0) {
      const errors = iconResults.failed.map((f) => f.error).join('; ')
      throw new Error(`Icon generation failed: ${errors}`)
    }
  } else {
    // Sequential generation (fallback)
    for (const size of iconSizes) {
      const outputPath = join(outputDir, size.name)
      const optimalQuality = optimize ? getOptimalQuality(size, quality) : quality

      try {
        let pipeline = image.clone().resize(size.width, size.height, {
          fit: 'cover',
          position: 'center',
        })

        if (finalFormat === 'png') {
          pipeline = pipeline.png({
            quality: optimalQuality,
            compressionLevel: config.compressionLevel || 9,
          })
        } else {
          pipeline = pipeline.webp({ quality: optimalQuality })
        }

        await pipeline.toFile(outputPath)

        generatedFiles.push(outputPath)
        icons.push({
          src: `/${size.name}`,
          sizes: `${size.width}x${size.height}`,
          type: finalFormat === 'png' ? 'image/png' : 'image/webp',
          purpose: size.width >= 192 && size.width <= 512 ? 'any' : undefined,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        throw new Error(`Failed to generate icon ${size.name}: ${message}`)
      }
    }
  }

  // Generate splash screens if requested
  const splashSizes = options?.splashSizes || STANDARD_SPLASH_SIZES
  if (splashSizes.length > 0) {
    const splashResults = await Promise.all(
      splashSizes.map(async (size) => {
        const outputPath = join(outputDir, size.name)

        try {
          let pipeline = image.clone().resize(size.width, size.height, {
            fit: 'cover',
            position: 'center',
          })

          if (finalFormat === 'png') {
            pipeline = pipeline.png({
              quality: optimize ? getOptimalQuality({ width: size.width, height: size.height, name: size.name }, quality) : quality,
              compressionLevel: config.compressionLevel || 9,
            })
          } else {
            pipeline = pipeline.webp({
              quality: optimize ? getOptimalQuality({ width: size.width, height: size.height, name: size.name }, quality) : quality,
            })
          }

          await pipeline.toFile(outputPath)

          return {
            success: true as const,
            file: outputPath,
            splash: {
              src: `/${size.name}`,
              sizes: `${size.width}x${size.height}`,
              type: finalFormat === 'png' ? ('image/png' as const) : ('image/webp' as const),
            },
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          throw new Error(`Failed to generate splash screen ${size.name}: ${message}`)
        }
      })
    )

    for (const result of splashResults) {
      if (result.success) {
        generatedFiles.push(result.file)
        splashScreens.push(result.splash)
      }
    }
  }

  // Generate apple-touch-icon.png (180x180) - always PNG for iOS compatibility
  try {
    const appleIconPath = join(outputDir, 'apple-touch-icon.png')
    await image.clone()
      .resize(180, 180, {
        fit: 'cover',
        position: 'center',
      })
      .png({
        quality: optimize ? getOptimalQuality({ width: 180, height: 180, name: 'apple-touch-icon.png' }, quality) : quality,
        compressionLevel: config.compressionLevel || 9,
      })
      .toFile(appleIconPath)
    generatedFiles.push(appleIconPath)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    // Don't fail generation if apple-touch-icon fails
    logger.warn({ module: 'icon-generator' }, `Failed to generate apple-touch-icon: ${message}`)
  }

  return {
    icons,
    splashScreens,
    generatedFiles,
    validation,
  }
}

/**
 * Generates only icons (without splash screens)
 */
export async function generateIconsOnly(options: IconGeneratorOptions): Promise<{
  icons: ManifestIcon[]
  generatedFiles: string[]
}> {
  const result = await generateIcons({
    ...options,
    splashSizes: [],
  })

  return {
    icons: result.icons,
    generatedFiles: result.generatedFiles,
  }
}

/**
 * Generates only splash screens (without icons)
 */
export async function generateSplashScreensOnly(options: IconGeneratorOptions): Promise<{
  splashScreens: ManifestSplashScreen[]
  generatedFiles: string[]
}> {
  const result = await generateIcons({
    ...options,
    iconSizes: [],
  })

  return {
    splashScreens: result.splashScreens,
    generatedFiles: result.generatedFiles,
  }
}

/**
 * Generates a favicon.ico from the source image
 */
export async function generateFavicon(sourceImage: string, outputDir: string): Promise<string> {
  if (!existsSync(sourceImage)) {
    throw new Error(`Source image not found: ${sourceImage}`)
  }

  mkdirSync(outputDir, { recursive: true })
  const faviconPath = join(outputDir, 'favicon.ico')

  try {
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toFile(faviconPath)

    return faviconPath
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate favicon: ${message}`)
  }
}

/**
 * Generates an apple-touch-icon (180x180)
 */
export async function generateAppleTouchIcon(sourceImage: string, outputDir: string): Promise<string> {
  if (!existsSync(sourceImage)) {
    throw new Error(`Source image not found: ${sourceImage}`)
  }

  mkdirSync(outputDir, { recursive: true })
  const appleIconPath = join(outputDir, 'apple-touch-icon.png')

  try {
    await sharp(sourceImage)
      .resize(180, 180, {
        fit: 'cover',
        position: 'center',
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(appleIconPath)

    return appleIconPath
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to generate apple-touch-icon: ${message}`)
  }
}

