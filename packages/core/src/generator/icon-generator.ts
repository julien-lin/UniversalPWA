import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import type { ManifestIcon, ManifestSplashScreen } from './manifest-generator.js'

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
  format?: 'png' | 'webp'
  quality?: number
}

export interface IconGenerationResult {
  icons: ManifestIcon[]
  splashScreens: ManifestSplashScreen[]
  generatedFiles: string[]
}

/**
 * Generates all PWA icons from a source image
 */
export async function generateIcons(options: IconGeneratorOptions): Promise<IconGenerationResult> {
  const {
    sourceImage,
    outputDir,
    iconSizes = STANDARD_ICON_SIZES,
    splashSizes = STANDARD_SPLASH_SIZES,
    format = 'png',
    quality = 90,
  } = options

  // Check that source image exists
  if (!existsSync(sourceImage)) {
    throw new Error(`Source image not found: ${sourceImage}`)
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

  // Generate icons
  for (const size of iconSizes) {
    const outputPath = join(outputDir, size.name)

    try {
      let pipeline = image.clone().resize(size.width, size.height, {
        fit: 'cover',
        position: 'center',
      })

      if (format === 'png') {
        pipeline = pipeline.png({ quality, compressionLevel: 9 })
      } else {
        pipeline = pipeline.webp({ quality })
      }

      await pipeline.toFile(outputPath)
      generatedFiles.push(outputPath)

      icons.push({
        src: `/${size.name}`,
        sizes: `${size.width}x${size.height}`,
        type: format === 'png' ? 'image/png' : 'image/webp',
        purpose: size.width >= 192 && size.width <= 512 ? 'any' : undefined,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to generate icon ${size.name}: ${message}`)
    }
  }

  // Generate splash screens
  for (const size of splashSizes) {
    const outputPath = join(outputDir, size.name)

    try {
      let pipeline = image.clone().resize(size.width, size.height, {
        fit: 'cover',
        position: 'center',
      })

      if (format === 'png') {
        pipeline = pipeline.png({ quality, compressionLevel: 9 })
      } else {
        pipeline = pipeline.webp({ quality })
      }

      await pipeline.toFile(outputPath)
      generatedFiles.push(outputPath)

      splashScreens.push({
        src: `/${size.name}`,
        sizes: `${size.width}x${size.height}`,
        type: format === 'png' ? 'image/png' : 'image/webp',
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to generate splash screen ${size.name}: ${message}`)
    }
  }

  // Generate apple-touch-icon.png (180x180) if PNG format
  if (format === 'png') {
    try {
      const appleIconPath = join(outputDir, 'apple-touch-icon.png')
      await image.clone()
        .resize(180, 180, {
          fit: 'cover',
          position: 'center',
        })
        .png({ quality, compressionLevel: 9 })
        .toFile(appleIconPath)
      generatedFiles.push(appleIconPath)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      // Don't fail generation if apple-touch-icon fails
      console.warn(`Warning: Failed to generate apple-touch-icon: ${message}`)
    }
  }

  return {
    icons,
    splashScreens,
    generatedFiles,
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

