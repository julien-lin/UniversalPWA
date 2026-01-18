/**
 * Adaptive Icon Generator for Android 8+ (API 26+)
 * 
 * Generates adaptive icons with foreground and background layers
 * following Android's adaptive icon specification.
 */

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IconSource, ColorSource, AdaptiveIconConfig } from './icon-config.js'
import { logger } from '../utils/logger.js'

/**
 * Result of adaptive icon generation
 */
export interface AdaptiveIconResult {
  /** Path to foreground icon (1024x1024) */
  foreground: string
  /** Path to background icon (1024x1024) or null if color background */
  background: string | null
  /** Paths to generated density-specific icons */
  densities: string[]
  /** Path to Android XML resource file */
  xml: string
  /** All generated files */
  generatedFiles: string[]
}

/**
 * Android density sizes for launcher icons
 */
const DENSITY_SIZES: Record<string, number> = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
}

/**
 * Get icon size for Android density
 */
function getDensitySize(density: string): number {
  return DENSITY_SIZES[density] || 48
}

/**
 * Generate Android adaptive icon XML resource
 */
function generateAdaptiveIconXML(
  outputDir: string,
  foregroundPath: string,
  backgroundPath: string | null,
): string {
  const xmlDir = join(outputDir, 'mipmap-anydpi-v26')
  mkdirSync(xmlDir, { recursive: true })

  const xmlPath = join(xmlDir, 'ic_launcher.xml')
  
  // Calculate relative paths from XML location
  const foregroundRelative = foregroundPath.replace(outputDir, '').replace(/^\//, '')
  const backgroundRelative = backgroundPath
    ? backgroundPath.replace(outputDir, '').replace(/^\//, '')
    : '@android:color/white' // Fallback to system color if no background image

  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="${backgroundRelative}" />
    <foreground android:drawable="${foregroundRelative}" />
</adaptive-icon>
`

  writeFileSync(xmlPath, xmlContent, 'utf-8')
  return xmlPath
}

/**
 * Generate adaptive icon for Android 8+ (API 26+)
 * 
 * @param foreground - Foreground icon source
 * @param background - Background icon source or color
 * @param outputDir - Output directory for generated files
 * @param config - Adaptive icon configuration
 * @returns Generated adaptive icon files and metadata
 */
export async function generateAdaptiveIcon(
  foreground: IconSource,
  background: IconSource | ColorSource,
  outputDir: string,
  config: AdaptiveIconConfig,
): Promise<AdaptiveIconResult> {
  const { safeZone = { width: 66, height: 66 }, outputFormats = ['png'] } = config

  // Create output directory structure
  mkdirSync(outputDir, { recursive: true })

  const generatedFiles: string[] = []
  const ADAPTIVE_ICON_SIZE = 1024

  // 1. Load and process foreground
  const fgImage = sharp(foreground.path)
  const fgMetadata = await fgImage.metadata()

  if (!fgMetadata.width || !fgMetadata.height) {
    throw new Error('Unable to read foreground image dimensions')
  }

  // Calculate safe zone dimensions
  const safeWidth = Math.floor(ADAPTIVE_ICON_SIZE * (safeZone.width / 100))
  const safeHeight = Math.floor(ADAPTIVE_ICON_SIZE * (safeZone.height / 100))
  const offsetX = Math.floor((ADAPTIVE_ICON_SIZE - safeWidth) / 2)
  const offsetY = Math.floor((ADAPTIVE_ICON_SIZE - safeHeight) / 2)

  // Resize foreground to fit safe zone (maintain aspect ratio)
  const resizedFg = await fgImage
    .resize(safeWidth, safeHeight, {
      fit: 'contain',
      position: 'center',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    })
    .toBuffer()

  // Create foreground icon (1024x1024) with transparent background
  const foregroundPath = join(outputDir, 'icon-foreground.png')
  await sharp({
    create: {
      width: ADAPTIVE_ICON_SIZE,
      height: ADAPTIVE_ICON_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: resizedFg,
        left: offsetX,
        top: offsetY,
      },
    ])
    .png()
    .toFile(foregroundPath)

  generatedFiles.push(foregroundPath)

  // 2. Create background (image or color)
  let backgroundPath: string | null = null
  let bgImage: sharp.Sharp

  if (background.type === 'color') {
    // Create solid color background
    const colorValue = background.value.startsWith('#') ? background.value : `#${background.value}`
    bgImage = sharp({
      create: {
        width: ADAPTIVE_ICON_SIZE,
        height: ADAPTIVE_ICON_SIZE,
        channels: 4,
        background: colorValue,
      },
    })
  } else {
    // Use image background
    bgImage = sharp(background.path)
    const bgMetadata = await bgImage.metadata()

    if (!bgMetadata.width || !bgMetadata.height) {
      throw new Error('Unable to read background image dimensions')
    }

    // Resize background to 1024x1024 (cover to fill entire area)
    bgImage = bgImage.resize(ADAPTIVE_ICON_SIZE, ADAPTIVE_ICON_SIZE, {
      fit: 'cover',
      position: 'center',
    })

    backgroundPath = join(outputDir, 'icon-background.png')
    await bgImage.png().toFile(backgroundPath)
    generatedFiles.push(backgroundPath)
  }

  // 3. Generate density-specific icons
  const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
  const densityResults: string[] = []

  for (const density of densities) {
    const size = getDensitySize(density)
    const densityDir = join(outputDir, `mipmap-${density}`)
    mkdirSync(densityDir, { recursive: true })

    // Generate launcher icon (composed foreground + background)
    const launcherPath = join(densityDir, 'ic_launcher.png')
    
    // Create composed icon for this density
    const composedBuffer = await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: background.type === 'color' 
          ? (background.value.startsWith('#') ? background.value : `#${background.value}`)
          : { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .composite([
        // Add background if it's an image
        ...(background.type !== 'color' && backgroundPath
          ? [
              {
                input: await sharp(backgroundPath)
                  .resize(size, size, { fit: 'cover' })
                  .toBuffer(),
                left: 0,
                top: 0,
              },
            ]
          : []),
        // Add foreground
        {
          input: await sharp(foregroundPath)
            .resize(size, size, { fit: 'contain' })
            .toBuffer(),
          left: 0,
          top: 0,
        },
      ])
      .png()
      .toBuffer()

    await sharp(composedBuffer).toFile(launcherPath)
    densityResults.push(launcherPath)
    generatedFiles.push(launcherPath)

    // Generate round launcher icon (same as regular for now)
    const roundPath = join(densityDir, 'ic_launcher_round.png')
    await sharp(composedBuffer).toFile(roundPath)
    densityResults.push(roundPath)
    generatedFiles.push(roundPath)

    // Generate foreground-only icon
    const foregroundOnlyPath = join(densityDir, 'ic_launcher_foreground.png')
    await sharp(foregroundPath)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(foregroundOnlyPath)
    densityResults.push(foregroundOnlyPath)
    generatedFiles.push(foregroundOnlyPath)
  }

  // 4. Generate Android XML resource
  const xmlPath = generateAdaptiveIconXML(outputDir, foregroundPath, backgroundPath)
  generatedFiles.push(xmlPath)

  logger.info(
    { module: 'adaptive-icon-generator', files: generatedFiles.length },
    'Generated adaptive icon files',
  )

  return {
    foreground: foregroundPath,
    background: backgroundPath,
    densities: densityResults,
    xml: xmlPath,
    generatedFiles,
  }
}

/**
 * Generate adaptive icon from single source (uses source as foreground, creates color background)
 */
export async function generateAdaptiveIconFromSource(
  source: IconSource,
  backgroundColor: string,
  outputDir: string,
  config?: Partial<AdaptiveIconConfig>,
): Promise<AdaptiveIconResult> {
  const adaptiveConfig: AdaptiveIconConfig = {
    enabled: true,
    foreground: source,
    background: {
      type: 'color',
      value: backgroundColor,
    },
    safeZone: config?.safeZone || { width: 66, height: 66 },
    outputFormats: config?.outputFormats || ['png'],
  }

  return generateAdaptiveIcon(source, adaptiveConfig.background!, outputDir, adaptiveConfig)
}
