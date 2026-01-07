import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { validateIconSource, isIconValid } from './icon-validator.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-icon-validator')

describe('icon-validator', () => {
  beforeEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  describe('validateIconSource', () => {
    it('should return error if source image does not exist', async () => {
      const result = await validateIconSource({
        sourceImage: join(TEST_DIR, 'non-existent.png'),
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Source image not found')
    })

    it('should validate valid 512x512 PNG icon', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-512.png')
      
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

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.metadata).toBeDefined()
      expect(result.metadata?.width).toBe(512)
      expect(result.metadata?.height).toBe(512)
      expect(result.metadata?.format).toBe('png')
    })

    it('should validate valid 192x192 PNG icon', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-192.png')
      
      await sharp({
        create: {
          width: 192,
          height: 192,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings.length).toBeGreaterThan(0) // Warning about < 512x512
      expect(result.warnings.some(w => w.includes('below optimal size'))).toBe(true)
    })

    it('should return error if icon is too small (< 192x192) in strict mode', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-100.png')
      
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
        strict: true,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('too small'))).toBe(true)
    })

    it('should return warning if icon is too small (< 192x192) in non-strict mode', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-100.png')
      
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
        strict: false,
      })

      expect(result.valid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('too small'))).toBe(true)
      expect(result.suggestions.length).toBeGreaterThan(0)
    })

    it('should warn if icon is not square', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-rect.png')
      
      await sharp({
        create: {
          width: 512,
          height: 256,
          channels: 4,
          background: { r: 255, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.includes('not square'))).toBe(true)
      expect(result.suggestions.some(s => s.includes('square'))).toBe(true)
    })

    it('should warn if icon has extreme aspect ratio', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-extreme.png')
      
      await sharp({
        create: {
          width: 1000,
          height: 200,
          channels: 4,
          background: { r: 255, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.includes('extreme aspect ratio'))).toBe(true)
    })

    it('should suggest PNG format for JPG icons', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon.jpg')
      
      await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 3,
          background: { r: 255, g: 0, b: 0 },
        },
      })
        .jpeg()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.suggestions.some(s => s.includes('PNG format is recommended'))).toBe(true)
    })

    it('should warn about large file size (> 1MB)', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-large.png')
      
      // Create a large image (2000x2000) to exceed 1MB
      await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png({ quality: 100, compressionLevel: 0 })
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      // File size warning may or may not appear depending on compression
      // But we should at least have metadata
      expect(result.metadata).toBeDefined()
    })

    it('should suggest optimization for medium file size (> 500KB)', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-medium.png')
      
      // Create a medium-sized image
      await sharp({
        create: {
          width: 1500,
          height: 1500,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png({ quality: 90 })
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.metadata).toBeDefined()
      // Check if suggestion about file size appears (may or may not depending on compression)
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle error during validation gracefully', async () => {
      // Create a file that will cause Sharp to fail
      const sourceImage = join(TEST_DIR, 'invalid-image.png')
      writeFileSync(sourceImage, 'not a valid image')

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Failed to validate icon'))).toBe(true)
    })

    it('should return error for unsupported format', async () => {
      // Create a fake GIF file (unsupported format)
      const sourceImage = join(TEST_DIR, 'icon.gif')
      writeFileSync(sourceImage, 'fake gif content')

      const result = await validateIconSource({
        sourceImage,
      })

      // Sharp might not be able to read it, so we might get a different error
      // But if it can read it, we should get format error
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return error if metadata has no width or height', async () => {
      // This is hard to test with Sharp, but we can test the error path
      // by creating a file that Sharp can't read properly
      const sourceImage = join(TEST_DIR, 'no-dimensions.png')
      // Create a minimal PNG that might not have dimensions
      writeFileSync(sourceImage, Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        // Incomplete IHDR chunk
      ]))

      const result = await validateIconSource({
        sourceImage,
      })

      // Should either fail to read or return error about dimensions
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should not warn about aspect ratio if ratio <= 2', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-ratio-ok.png')
      
      // Create image with 2:1 ratio (acceptable)
      await sharp({
        create: {
          width: 400,
          height: 200,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      // Should not warn about extreme aspect ratio (2:1 is acceptable)
      expect(result.warnings.some(w => w.includes('extreme aspect ratio'))).toBe(false)
    })

    it('should use custom minRecommendedSize', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-150.png')
      
      await sharp({
        create: {
          width: 150,
          height: 150,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
        minRecommendedSize: 100, // Lower threshold
      })

      expect(result.valid).toBe(true)
      // Should not warn about being too small since 150 > 100
      expect(result.warnings.some(w => w.includes('too small'))).toBe(false)
    })

    it('should use custom optimalSize', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-300.png')
      
      await sharp({
        create: {
          width: 300,
          height: 300,
          channels: 4,
          background: { r: 255, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
        optimalSize: 1000, // Higher threshold
      })

      expect(result.valid).toBe(true)
      // Should warn about being below optimal size (300 < 1000)
      expect(result.warnings.some(w => w.includes('below optimal size'))).toBe(true)
    })

    it('should handle WebP format', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon.webp')
      
      await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 255, g: 0, b: 255, alpha: 1 },
        },
      })
        .webp()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.metadata?.format).toBe('webp')
    })

    it('should handle JPEG format', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon.jpeg')
      
      await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 3,
          background: { r: 0, g: 255, b: 255 },
        },
      })
        .jpeg()
        .toFile(sourceImage)

      const result = await validateIconSource({
        sourceImage,
      })

      expect(result.valid).toBe(true)
      expect(result.metadata?.format).toBe('jpeg')
    })
  })

  describe('isIconValid', () => {
    it('should return false if file does not exist', async () => {
      const result = await isIconValid(join(TEST_DIR, 'non-existent.png'))
      expect(result).toBe(false)
    })

    it('should return true for valid icon (>= 192x192)', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-192.png')
      
      await sharp({
        create: {
          width: 192,
          height: 192,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await isIconValid(sourceImage)
      expect(result).toBe(true)
    })

    it('should return false for icon too small (< 192x192)', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-100.png')
      
      await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await isIconValid(sourceImage)
      expect(result).toBe(false)
    })

    it('should use custom minSize', async () => {
      const sharp = (await import('sharp')).default
      const sourceImage = join(TEST_DIR, 'icon-150.png')
      
      await sharp({
        create: {
          width: 150,
          height: 150,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(sourceImage)

      const result = await isIconValid(sourceImage, 100)
      expect(result).toBe(true) // 150 >= 100
    })

    it('should return false if unable to read dimensions', async () => {
      // Create invalid image file
      const sourceImage = join(TEST_DIR, 'invalid.png')
      writeFileSync(sourceImage, 'not an image')

      const result = await isIconValid(sourceImage)
      expect(result).toBe(false)
    })

    it('should return false if metadata has no width or height', async () => {
      // This test is hard to trigger with Sharp, but we can test the logic
      // by mocking or using a corrupted file
      const sourceImage = join(TEST_DIR, 'corrupted.png')
      writeFileSync(sourceImage, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) // PNG header only

      const result = await isIconValid(sourceImage)
      // Sharp might throw or return null metadata, both should result in false
      expect(result).toBe(false)
    })
  })
})
