import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  generateIcons,
  generateIconsOnly,
  generateSplashScreensOnly,
  generateFavicon,
  generateAppleTouchIcon,
  STANDARD_ICON_SIZES,
  STANDARD_SPLASH_SIZES,
} from './icon-generator'

const TEST_DIR = join(process.cwd(), '.test-tmp-icon-generator')

describe('icon-generator', () => {
  let sourceImage: string

  beforeEach(async () => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })

    // Créer une image source de test (PNG 512x512)
    sourceImage = join(TEST_DIR, 'source.png')
    // Créer un PNG minimal valide (1x1 pixel)
    // Pour les tests, on utilisera sharp pour créer une vraie image
    const sharp = (await import('sharp')).default
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(sourceImage)
  })

  describe('generateIcons', () => {
    it('should generate all standard icons and splash screens', async () => {
      const outputDir = join(TEST_DIR, 'output')

      const result = await generateIcons({
        sourceImage,
        outputDir,
      })

      expect(result.icons).toHaveLength(STANDARD_ICON_SIZES.length)
      expect(result.splashScreens).toHaveLength(STANDARD_SPLASH_SIZES.length)
      expect(result.generatedFiles.length).toBeGreaterThan(0)

      // Vérifier que les fichiers ont été créés
      for (const file of result.generatedFiles) {
        expect(existsSync(file)).toBe(true)
      }

      // Vérifier la structure des icônes
      result.icons.forEach((icon, index) => {
        expect(icon.src).toContain(STANDARD_ICON_SIZES[index].name)
        expect(icon.sizes).toBe(`${STANDARD_ICON_SIZES[index].width}x${STANDARD_ICON_SIZES[index].height}`)
        expect(icon.type).toBe('image/png')
      })
    })

    it('should generate custom icon sizes', async () => {
      const outputDir = join(TEST_DIR, 'output-custom')
      const customSizes = [
        { width: 192, height: 192, name: 'icon-192.png' },
        { width: 512, height: 512, name: 'icon-512.png' },
      ]

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes: customSizes,
        splashSizes: [],
      })

      expect(result.icons).toHaveLength(2)
      expect(result.splashScreens).toHaveLength(0)
      expect(result.generatedFiles).toHaveLength(2)
    })

    it('should generate WebP format when specified', async () => {
      const outputDir = join(TEST_DIR, 'output-webp')

      const result = await generateIcons({
        sourceImage,
        outputDir,
        format: 'webp',
        iconSizes: [{ width: 192, height: 192, name: 'icon-192.webp' }],
        splashSizes: [],
      })

      expect(result.icons[0].type).toBe('image/webp')
      expect(result.icons[0].src).toContain('.webp')
    })

    it('should throw error if source image does not exist', async () => {
      const outputDir = join(TEST_DIR, 'output')

      await expect(
        generateIcons({
          sourceImage: join(TEST_DIR, 'non-existent.png'),
          outputDir,
        }),
      ).rejects.toThrow('Source image not found')
    })

    it('should create output directory if it does not exist', async () => {
      const outputDir = join(TEST_DIR, 'new-output-dir')

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes: [{ width: 192, height: 192, name: 'icon-192.png' }],
        splashSizes: [],
      })

      expect(existsSync(outputDir)).toBe(true)
      expect(result.generatedFiles.length).toBeGreaterThan(0)
    })

    it('should use custom quality setting', async () => {
      const outputDir = join(TEST_DIR, 'output-quality')

      const result = await generateIcons({
        sourceImage,
        outputDir,
        quality: 50,
        iconSizes: [{ width: 192, height: 192, name: 'icon-192.png' }],
        splashSizes: [],
      })

      expect(result.icons).toHaveLength(1)
      // Les fichiers devraient être créés même avec une qualité réduite
      expect(result.generatedFiles.length).toBeGreaterThan(0)
    })
  })

  describe('generateIconsOnly', () => {
    it('should generate only icons without splash screens', async () => {
      const outputDir = join(TEST_DIR, 'output-icons-only')

      const result = await generateIconsOnly({
        sourceImage,
        outputDir,
        iconSizes: [
          { width: 192, height: 192, name: 'icon-192.png' },
          { width: 512, height: 512, name: 'icon-512.png' },
        ],
      })

      expect(result.icons).toHaveLength(2)
      expect(result.generatedFiles).toHaveLength(2)
    })
  })

  describe('generateSplashScreensOnly', () => {
    it('should generate only splash screens without icons', async () => {
      const outputDir = join(TEST_DIR, 'output-splash-only')

      const result = await generateSplashScreensOnly({
        sourceImage,
        outputDir,
        splashSizes: [
          { width: 750, height: 1334, name: 'splash-750x1334.png' },
          { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
        ],
      })

      expect(result.splashScreens).toHaveLength(2)
      expect(result.generatedFiles).toHaveLength(2)
    })
  })

  describe('generateFavicon', () => {
    it('should generate favicon.ico', async () => {
      const outputDir = join(TEST_DIR, 'output-favicon')

      const faviconPath = await generateFavicon(sourceImage, outputDir)

      expect(existsSync(faviconPath)).toBe(true)
      expect(faviconPath).toContain('favicon.ico')
    })

    it('should throw error if source image does not exist', async () => {
      const outputDir = join(TEST_DIR, 'output-favicon')

      await expect(generateFavicon(join(TEST_DIR, 'non-existent.png'), outputDir)).rejects.toThrow(
        'Source image not found',
      )
    })
  })

  describe('generateAppleTouchIcon', () => {
    it('should generate apple-touch-icon.png (180x180)', async () => {
      const outputDir = join(TEST_DIR, 'output-apple')

      const appleIconPath = await generateAppleTouchIcon(sourceImage, outputDir)

      expect(existsSync(appleIconPath)).toBe(true)
      expect(appleIconPath).toContain('apple-touch-icon.png')
    })

    it('should throw error if source image does not exist', async () => {
      const outputDir = join(TEST_DIR, 'output-apple')

      await expect(generateAppleTouchIcon(join(TEST_DIR, 'non-existent.png'), outputDir)).rejects.toThrow(
        'Source image not found',
      )
    })
  })
})

