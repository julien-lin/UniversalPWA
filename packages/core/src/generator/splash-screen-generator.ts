/**
 * Splash Screen Generator for iOS and Android
 * 
 * Generates splash screens for PWA with support for multiple platforms
 * and screen sizes/densities.
 */

import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { IconSource, SplashScreenConfig } from './icon-config.js'
import { logger } from '../utils/logger.js'

/**
 * Result of splash screen generation
 */
export interface SplashScreenResult {
  /** Paths to generated iOS splash screens */
  ios: string[]
  /** Paths to generated Android splash screens */
  android: string[]
  /** Path to Android XML resource file (if generated) */
  xml?: string
  /** All generated files */
  generatedFiles: string[]
}

/**
 * iOS splash screen sizes
 */
const IOS_SPLASH_SIZES = [
  { width: 640, height: 1136, name: 'Default@2x~iphone.png' }, // iPhone 5/5S/5C
  { width: 750, height: 1334, name: 'Default@2x~iphone.png' }, // iPhone 6/7/8
  { width: 828, height: 1792, name: 'Default@2x~iphone.png' }, // iPhone XR
  { width: 1125, height: 2436, name: 'Default@3x~iphone.png' }, // iPhone X/XS
  { width: 1242, height: 2208, name: 'Default@3x~iphone.png' }, // iPhone 6+/7+/8+
  { width: 1242, height: 2688, name: 'Default@3x~iphone.png' }, // iPhone XS Max
  { width: 1536, height: 2048, name: 'Default@2x~ipad.png' }, // iPad
  { width: 2048, height: 2732, name: 'Default@2x~ipadpro.png' }, // iPad Pro
]

/**
 * Android density sizes for splash screens
 */
const ANDROID_SPLASH_SIZES: Record<string, { width: number; height: number }> = {
  ldpi: { width: 200, height: 320 },
  mdpi: { width: 320, height: 480 },
  hdpi: { width: 480, height: 800 },
  xhdpi: { width: 720, height: 1280 },
  xxhdpi: { width: 1080, height: 1920 },
  xxxhdpi: { width: 1440, height: 2560 },
}

/**
 * Get splash screen size for Android density
 */
function getAndroidSplashSize(density: string): { width: number; height: number } {
  return ANDROID_SPLASH_SIZES[density] || ANDROID_SPLASH_SIZES.mdpi
}

/**
 * Generate a single splash screen
 */
async function generateSplashScreen(
  sourceImage: sharp.Sharp,
  width: number,
  height: number,
  backgroundColor: string,
  outputPath: string,
): Promise<void> {
  // Normalize color format
  const colorValue = backgroundColor.startsWith('#') ? backgroundColor : `#${backgroundColor}`

  // Create background with color
  const background = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: colorValue,
    },
  })

  // Resize source image to fit in center (50% of smallest dimension)
  const iconSize = Math.min(width, height) * 0.5
  const sourceBuffer = await sourceImage
    .clone()
    .resize(Math.floor(iconSize), Math.floor(iconSize), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
    })
    .toBuffer()

  // Get dimensions of resized source
  const sourceMetadata = await sharp(sourceBuffer).metadata()
  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error('Unable to read resized source image dimensions')
  }

  // Center the source image on background
  const left = Math.floor((width - sourceMetadata.width) / 2)
  const top = Math.floor((height - sourceMetadata.height) / 2)

  // Compose source on background
  await background
    .composite([
      {
        input: sourceBuffer,
        left,
        top,
      },
    ])
    .png()
    .toFile(outputPath)
}

/**
 * Generate Android splash screen XML resource
 */
function generateAndroidSplashXML(outputDir: string): string {
  const xmlDir = join(outputDir, 'android', 'drawable')
  mkdirSync(xmlDir, { recursive: true })

  const xmlPath = join(xmlDir, 'splash_screen.xml')
  
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="@android:color/white" />
        </shape>
    </item>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@drawable/splash_screen" />
    </item>
</layer-list>
`

  writeFileSync(xmlPath, xmlContent, 'utf-8')
  return xmlPath
}

/**
 * Generate splash screens for iOS and Android
 * 
 * @param source - Source icon for splash screen
 * @param config - Splash screen configuration
 * @param outputDir - Output directory for generated files
 * @returns Generated splash screen files and metadata
 */
export async function generateSplashScreens(
  source: IconSource,
  config: SplashScreenConfig,
  outputDir: string,
): Promise<SplashScreenResult> {
  const {
    themeColor = '#ffffff',
    backgroundColor,
    platforms = ['all'],
    densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'],
  } = config

  // Create output directory structure
  mkdirSync(outputDir, { recursive: true })

  const result: SplashScreenResult = {
    ios: [],
    android: [],
    generatedFiles: [],
  }

  // Load source image
  const sourceImage = sharp(source.path)
  const sourceMetadata = await sourceImage.metadata()

  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new Error('Unable to read source image dimensions')
  }

  const bgColor = backgroundColor || themeColor

  // Generate iOS splash screens
  if (platforms.includes('ios') || platforms.includes('all')) {
    const iosDir = join(outputDir, 'ios')
    mkdirSync(iosDir, { recursive: true })

    // Use custom sizes if provided, otherwise use standard iOS sizes
    const sizesToGenerate = config.sizes || IOS_SPLASH_SIZES

    for (const size of sizesToGenerate) {
      const outputPath = join(iosDir, size.name)

      try {
        await generateSplashScreen(sourceImage, size.width, size.height, bgColor, outputPath)
        result.ios.push(outputPath)
        result.generatedFiles.push(outputPath)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.warn(
          { module: 'splash-screen-generator', size: size.name },
          `Failed to generate iOS splash screen: ${message}`,
        )
      }
    }
  }

  // Generate Android splash screens
  if (platforms.includes('android') || platforms.includes('all')) {
    const androidDir = join(outputDir, 'android')
    mkdirSync(androidDir, { recursive: true })

    for (const density of densities) {
      const size = getAndroidSplashSize(density)
      const densityDir = join(androidDir, `drawable-${density}`)
      mkdirSync(densityDir, { recursive: true })

      const outputPath = join(densityDir, 'splash_screen.png')

      try {
        await generateSplashScreen(sourceImage, size.width, size.height, bgColor, outputPath)
        result.android.push(outputPath)
        result.generatedFiles.push(outputPath)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        logger.warn(
          { module: 'splash-screen-generator', density },
          `Failed to generate Android splash screen: ${message}`,
        )
      }
    }

    // Generate Android XML resource
    try {
      const xmlPath = generateAndroidSplashXML(outputDir)
      result.xml = xmlPath
      result.generatedFiles.push(xmlPath)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      logger.warn({ module: 'splash-screen-generator' }, `Failed to generate Android XML: ${message}`)
    }
  }

  logger.info(
    { module: 'splash-screen-generator', ios: result.ios.length, android: result.android.length },
    'Generated splash screens',
  )

  return result
}

/**
 * Generate splash screens from source with default configuration
 */
export async function generateSplashScreensFromSource(
  source: IconSource,
  backgroundColor: string,
  outputDir: string,
  platforms: ('ios' | 'android' | 'all')[] = ['all'],
): Promise<SplashScreenResult> {
  const config: SplashScreenConfig = {
    enabled: true,
    source,
    backgroundColor,
    platforms,
  }

  return generateSplashScreens(source, config, outputDir)
}
