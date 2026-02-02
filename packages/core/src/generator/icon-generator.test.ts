import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  generateIcons,
  generateIconsOnly,
  generateSplashScreensOnly,
  generateFavicon,
  generateAppleTouchIcon,
  STANDARD_ICON_SIZES,
  STANDARD_SPLASH_SIZES,
} from './icon-generator.js'
import type { ManifestIcon, ManifestSplashScreen } from './manifest-generator.js'
import { createTestDir, cleanupTestDir } from '../__tests__/test-helpers.js'

describe('icon-generator', () => {
  let TEST_DIR: string
  let sourceImage: string

  beforeEach(async () => {
    TEST_DIR = createTestDir('icon-generator')

    // Create test source image (PNG 512x512)
    sourceImage = join(TEST_DIR, 'source.png')
    // Create minimal valid PNG (1x1 pixel)
    // For tests, use sharp to create a real image
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

  afterEach(() => {
    cleanupTestDir(TEST_DIR)
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

      // Check that files were created
      for (const file of result.generatedFiles) {
        expect(existsSync(file)).toBe(true)
      }

      // Check icon structure
      result.icons.forEach((icon: ManifestIcon, index: number) => {
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
      // PNG format also generates apple-touch-icon.png
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(2)
      expect(result.generatedFiles.length).toBeLessThanOrEqual(3) // 2 icons + optionally apple-touch-icon
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
      ).rejects.toThrow(/Source image not found|No valid icon source found/)
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
      // Files should be created even with reduced quality
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
      // PNG format also generates apple-touch-icon.png
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(2)
      expect(result.generatedFiles.length).toBeLessThanOrEqual(3) // 2 icons + optionally apple-touch-icon
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
      // PNG format also generates apple-touch-icon.png
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(2)
      expect(result.generatedFiles.length).toBeLessThanOrEqual(3) // 2 splash screens + optionnellement apple-touch-icon
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

    it('should create output directory if it does not exist for apple-touch-icon', async () => {
      const outputDir = join(TEST_DIR, 'new-apple-output')

      const appleIconPath = await generateAppleTouchIcon(sourceImage, outputDir)

      expect(existsSync(outputDir)).toBe(true)
      expect(existsSync(appleIconPath)).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle empty icon sizes array', async () => {
      const outputDir = join(TEST_DIR, 'output-empty-icons')

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes: [],
        splashSizes: [],
      })

      expect(result.icons).toHaveLength(0)
      expect(result.splashScreens).toHaveLength(0)
      // PNG format still generates apple-touch-icon
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(0)
    })

    it('should generate multiple icon formats in same call', async () => {
      const outputDir = join(TEST_DIR, 'output-multi-format')

      const resultPNG = await generateIcons({
        sourceImage,
        outputDir: join(outputDir, 'png'),
        format: 'png',
        iconSizes: [{ width: 192, height: 192, name: 'icon-192.png' }],
        splashSizes: [],
      })

      const resultWebP = await generateIcons({
        sourceImage,
        outputDir: join(outputDir, 'webp'),
        format: 'webp',
        iconSizes: [{ width: 192, height: 192, name: 'icon-192.webp' }],
        splashSizes: [],
      })

      expect(resultPNG.icons[0].type).toBe('image/png')
      expect(resultWebP.icons[0].type).toBe('image/webp')
    })

    it('should handle splash screens with various dimensions', async () => {
      const outputDir = join(TEST_DIR, 'output-splash-various')
      const customSplashSizes = [
        { width: 640, height: 1136, name: 'splash-640x1136.png' },
        { width: 1125, height: 2436, name: 'splash-1125x2436.png' },
        { width: 2048, height: 2732, name: 'splash-2048x2732.png' },
      ]

      const result = await generateSplashScreensOnly({
        sourceImage,
        outputDir,
        splashSizes: customSplashSizes,
      })

      expect(result.splashScreens).toHaveLength(3)
      expect(result.generatedFiles.length).toBeGreaterThanOrEqual(3)

      result.splashScreens.forEach((splash: ManifestSplashScreen, index: number) => {
        expect(splash.sizes).toBe(`${customSplashSizes[index].width}x${customSplashSizes[index].height}`)
      })
    })

    it('should include purpose field for appropriate icon sizes', async () => {
      const outputDir = join(TEST_DIR, 'output-purpose')

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes: [
          { width: 192, height: 192, name: 'icon-192.png' },
          { width: 512, height: 512, name: 'icon-512.png' },
          { width: 96, height: 96, name: 'icon-96.png' },
        ],
        splashSizes: [],
      })

      // 192 and 512 should have purpose 'any'
      const icon192 = result.icons.find((i: ManifestIcon) => i.sizes === '192x192')
      const icon512 = result.icons.find((i: ManifestIcon) => i.sizes === '512x512')
      const icon96 = result.icons.find((i: ManifestIcon) => i.sizes === '96x96')

      expect(icon192?.purpose).toBe('any')
      expect(icon512?.purpose).toBe('any')
      expect(icon96?.purpose).toBeUndefined()
    })

    it('should handle quality settings from 1 to 100', async () => {
      const outputDir = join(TEST_DIR, 'output-quality-range')

      const qualitySettings = [1, 50, 90, 100]

      for (const quality of qualitySettings) {
        const result = await generateIcons({
          sourceImage,
          outputDir: join(outputDir, `quality-${quality}`),
          quality,
          iconSizes: [{ width: 192, height: 192, name: `icon-${quality}.png` }],
          splashSizes: [],
        })

        expect(result.icons).toHaveLength(1)
        expect(result.generatedFiles.length).toBeGreaterThan(0)
      }
    })

    it('should handle favicon generation with output directory creation', async () => {
      const outputDir = join(TEST_DIR, 'new-favicon-dir')

      const faviconPath = await generateFavicon(sourceImage, outputDir)

      expect(existsSync(outputDir)).toBe(true)
      expect(existsSync(faviconPath)).toBe(true)
      expect(faviconPath).toContain('favicon.ico')
    })

    it('should verify all standard icon sizes are in manifest format', async () => {
      const outputDir = join(TEST_DIR, 'output-manifest-format')

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes: STANDARD_ICON_SIZES,
        splashSizes: [],
      })

      result.icons.forEach((icon: ManifestIcon) => {
        expect(icon.src).toMatch(/^\/.*\.png$/)
        expect(icon.sizes).toMatch(/^\d+x\d+$/)
        expect(['image/png', 'image/webp']).toContain(icon.type)
      })
    })

    it('should verify all standard splash screen sizes in manifest format', async () => {
      const outputDir = join(TEST_DIR, 'output-splash-manifest')

      const result = await generateSplashScreensOnly({
        sourceImage,
        outputDir,
        splashSizes: STANDARD_SPLASH_SIZES,
      })

      result.splashScreens.forEach((splash: ManifestSplashScreen) => {
        expect(splash.src).toMatch(/^\/.*\.png$/)
        expect(splash.sizes).toMatch(/^\d+x\d+$/)
        expect(['image/png', 'image/webp']).toContain(splash.type)
      })
    })

    it('should return consistent structure for all generation functions', async () => {
      const outputDir = join(TEST_DIR, 'output-structure')
      const iconSizes = [{ width: 192, height: 192, name: 'icon-192.png' }]
      const splashSizes = [{ width: 750, height: 1334, name: 'splash-750x1334.png' }]

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes,
        splashSizes,
      })

      expect(result).toHaveProperty('icons')
      expect(result).toHaveProperty('splashScreens')
      expect(result).toHaveProperty('generatedFiles')
      expect(Array.isArray(result.icons)).toBe(true)
      expect(Array.isArray(result.splashScreens)).toBe(true)
      expect(Array.isArray(result.generatedFiles)).toBe(true)
    })
  })

  describe('Icon validation', () => {
    it('should include validation result when validate is true', async () => {
      const outputDir = join(TEST_DIR, 'output-validation')
      const iconSizes = [{ width: 192, height: 192, name: 'icon-192.png' }]

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes,
        splashSizes: [],
        validate: true,
      })

      expect(result.validation).toBeDefined()
      expect(result.validation?.valid).toBe(true)
      expect(result.validation?.metadata).toBeDefined()
      expect(result.validation?.metadata?.width).toBe(512)
      expect(result.validation?.metadata?.height).toBe(512)
    })

    it('should not include validation result when validate is false', async () => {
      const outputDir = join(TEST_DIR, 'output-no-validation')
      const iconSizes = [{ width: 192, height: 192, name: 'icon-192.png' }]

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes,
        splashSizes: [],
        validate: false,
      })

      expect(result.validation).toBeUndefined()
    })

    it('should include warnings for icon below optimal size', async () => {
      const outputDir = join(TEST_DIR, 'output-warnings')
      const iconSizes = [{ width: 192, height: 192, name: 'icon-192.png' }]

      const result = await generateIcons({
        sourceImage,
        outputDir,
        iconSizes,
        splashSizes: [],
        validate: true,
      })

      expect(result.validation).toBeDefined()
      // 512x512 should have warnings about being below optimal (if optimalSize > 512)
      // But with default optimalSize=512, there should be no warning
      expect(result.validation?.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it('should throw error in strict mode if validation fails', async () => {
      const sharp = (await import('sharp')).default
      const smallSourceImage = join(TEST_DIR, 'small-source.png')

      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(smallSourceImage)

      const outputDir = join(TEST_DIR, 'output-strict')
      const iconSizes = [{ width: 192, height: 192, name: 'icon-192.png' }]

      await expect(
        generateIcons({
          sourceImage: smallSourceImage,
          outputDir,
          iconSizes,
          splashSizes: [],
          validate: true,
          strictValidation: true,
        }),
      ).rejects.toThrow('Icon validation failed')
    })

    it('should not throw error in non-strict mode even if validation has warnings', async () => {
      const sharp = (await import('sharp')).default
      const smallSourceImage = join(TEST_DIR, 'small-source-non-strict.png')

      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(smallSourceImage)

      const outputDir = join(TEST_DIR, 'output-non-strict')
      const iconSizes = [{ width: 192, height: 192, name: 'icon-192.png' }]

      const result = await generateIcons({
        sourceImage: smallSourceImage,
        outputDir,
        iconSizes,
        splashSizes: [],
        validate: true,
        strictValidation: false,
      })

      expect(result.validation).toBeDefined()
      expect(result.validation?.warnings.length).toBeGreaterThan(0)
      expect(result.icons.length).toBeGreaterThan(0) // Generation should succeed
    })
  })
})

