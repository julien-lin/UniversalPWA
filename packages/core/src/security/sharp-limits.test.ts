/**
 * Tests for P1.3: Sharp Memory and DoS Limits
 * @category Security
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SHARP_LIMITS,
  ICON_SHARP_LIMITS,
  validateImageDimensions,
  validateImageFileSize,
  validateImageFormat,
  validateImageArea,
  formatBytes,
  formatSharpLimits,
  SharpLimitError,
} from './sharp-limits.js'

describe('sharp-limits', () => {
  describe('DEFAULT_SHARP_LIMITS', () => {
    it('should define default limits', () => {
      expect(DEFAULT_SHARP_LIMITS.maxWidth).toBe(2048)
      expect(DEFAULT_SHARP_LIMITS.maxHeight).toBe(2048)
      expect(DEFAULT_SHARP_LIMITS.maxInputSize).toBe(10 * 1024 * 1024)
      expect(DEFAULT_SHARP_LIMITS.maxConcurrency).toBe(2)
    })

    it('should have conservative concurrency (2 by default)', () => {
      expect(DEFAULT_SHARP_LIMITS.maxConcurrency).toBeLessThanOrEqual(2)
    })

    it('should limit input size to 10MB', () => {
      expect(DEFAULT_SHARP_LIMITS.maxInputSize).toBe(10 * 1024 * 1024)
    })

    it('should allow safe image formats', () => {
      expect(DEFAULT_SHARP_LIMITS.allowedFormats).toContain('png')
      expect(DEFAULT_SHARP_LIMITS.allowedFormats).toContain('jpeg')
      expect(DEFAULT_SHARP_LIMITS.allowedFormats).toContain('webp')
    })
  })

  describe('ICON_SHARP_LIMITS', () => {
    it('should have smaller dimensions than default', () => {
      expect(ICON_SHARP_LIMITS.maxWidth).toBeLessThan(DEFAULT_SHARP_LIMITS.maxWidth)
      expect(ICON_SHARP_LIMITS.maxHeight).toBeLessThan(DEFAULT_SHARP_LIMITS.maxHeight)
    })

    it('should have max 512x512 for icons', () => {
      expect(ICON_SHARP_LIMITS.maxWidth).toBe(512)
      expect(ICON_SHARP_LIMITS.maxHeight).toBe(512)
    })

    it('should allow higher concurrency for icon batch processing', () => {
      expect(ICON_SHARP_LIMITS.maxConcurrency).toBeGreaterThan(DEFAULT_SHARP_LIMITS.maxConcurrency)
    })

    it('should have smaller max input size per icon', () => {
      expect(ICON_SHARP_LIMITS.maxInputSize).toBeLessThan(DEFAULT_SHARP_LIMITS.maxInputSize)
    })
  })

  describe('validateImageDimensions', () => {
    it('should accept dimensions within limits', () => {
      const result = validateImageDimensions(1024, 768, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject width exceeding limit', () => {
      const result = validateImageDimensions(3000, 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('width')
      expect(result.errors[0]).toContain('exceeds')
    })

    it('should reject height exceeding limit', () => {
      const result = validateImageDimensions(1024, 3000, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('height')
    })

    it('should warn when approaching dimension limits', () => {
      const result = validateImageDimensions(1900, 1900, DEFAULT_SHARP_LIMITS)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle missing dimensions', () => {
      const result = validateImageDimensions(undefined, 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('required')
    })

    it('should validate icon dimensions correctly', () => {
      const result = validateImageDimensions(256, 256, ICON_SHARP_LIMITS)
      expect(result.isValid).toBe(true)

      const tooLarge = validateImageDimensions(1024, 1024, ICON_SHARP_LIMITS)
      expect(tooLarge.isValid).toBe(false)
    })
  })

  describe('validateImageFileSize', () => {
    it('should accept file size within limits', () => {
      const result = validateImageFileSize(5 * 1024 * 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject file size exceeding limit', () => {
      const result = validateImageFileSize(15 * 1024 * 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('exceeds')
    })

    it('should warn when approaching file size limit', () => {
      // 8.5 MB out of 10 MB = 85%
      const result = validateImageFileSize(8.5 * 1024 * 1024, DEFAULT_SHARP_LIMITS)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle zero-sized files', () => {
      const result = validateImageFileSize(0, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(true)
    })

    it('should format bytes correctly in error messages', () => {
      const result = validateImageFileSize(15 * 1024 * 1024, DEFAULT_SHARP_LIMITS)
      expect(result.errors[0]).toContain('MB')
    })
  })

  describe('validateImageFormat', () => {
    it('should accept allowed formats', () => {
      for (const format of ['png', 'jpeg', 'jpg', 'webp']) {
        const result = validateImageFormat(format, DEFAULT_SHARP_LIMITS)
        expect(result.isValid).toBe(true)
      }
    })

    it('should reject unsupported formats', () => {
      const result = validateImageFormat('bmp', DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('not allowed')
    })

    it('should handle case-insensitive format matching', () => {
      const result1 = validateImageFormat('PNG', DEFAULT_SHARP_LIMITS)
      const result2 = validateImageFormat('jpeg', DEFAULT_SHARP_LIMITS)
      expect(result1.isValid).toBe(true)
      expect(result2.isValid).toBe(true)
    })

    it('should reject missing format', () => {
      const result = validateImageFormat(undefined, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('required')
    })

    it('should list allowed formats in error message', () => {
      const result = validateImageFormat('gif', DEFAULT_SHARP_LIMITS)
      expect(result.errors[0]).toContain('Allowed formats')
      expect(result.errors[0]).toContain('png')
    })
  })

  describe('validateImageArea', () => {
    it('should accept image area within limits', () => {
      const result = validateImageArea(1024, 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(true)
      expect(result.area).toBe(1048576)
    })

    it('should reject image area exceeding limit', () => {
      const result = validateImageArea(3000, 3000, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('area')
    })

    it('should prevent aspect ratio attacks', () => {
      // Thin but tall (aspect ratio attack)
      const result = validateImageArea(100, 50000, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
    })

    it('should warn when approaching area limit', () => {
      // 4194304 (2048x2048) is the max, 80% would be ~3355443 pixels
      // So 1900x1900 = 3610000 which is > 80% of 4194304
      const result = validateImageArea(1900, 1900, DEFAULT_SHARP_LIMITS)
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle missing dimensions', () => {
      const result = validateImageArea(undefined, 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('required')
    })

    it('should calculate area correctly', () => {
      const result = validateImageArea(800, 600, DEFAULT_SHARP_LIMITS)
      expect(result.area).toBe(480000)
    })
  })

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1024)).toContain('KB')
      expect(formatBytes(1024 * 1024)).toContain('MB')
      expect(formatBytes(1024 * 1024 * 1024)).toContain('GB')
    })

    it('should handle exact powers of 1024', () => {
      expect(formatBytes(1024 * 1024)).toMatch(/1\.00 MB/)
      expect(formatBytes(10 * 1024 * 1024)).toMatch(/10\.00 MB/)
    })
  })

  describe('formatSharpLimits', () => {
    it('should format default limits', () => {
      const result = formatSharpLimits(DEFAULT_SHARP_LIMITS)
      expect(result).toContain('Max: 2048x2048px')
      expect(result).toContain('Concurrency: 2')
    })

    it('should include max input size', () => {
      const result = formatSharpLimits(DEFAULT_SHARP_LIMITS)
      expect(result).toContain('Max Input')
      expect(result).toContain('MB')
    })

    it('should handle icon limits', () => {
      const result = formatSharpLimits(ICON_SHARP_LIMITS)
      expect(result).toContain('512x512')
      expect(result).toContain('Concurrency: 4')
    })
  })

  describe('SharpLimitError', () => {
    it('should create error with image path', () => {
      const error = new SharpLimitError('/path/to/image.png', 'Test error')
      expect(error.message).toBe('Test error')
      expect(error.imagePath).toBe('/path/to/image.png')
      expect(error.name).toBe('SharpLimitError')
    })

    it('should extend Error class', () => {
      const error = new SharpLimitError('/path/to/image.png', 'Test')
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('Security scenarios', () => {
    it('should prevent zip bomb through dimensions', () => {
      // 10000x10000 could compress to small file but expand to large memory
      const result = validateImageDimensions(10000, 10000, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
    })

    it('should prevent memory exhaustion through large areas', () => {
      // Even if individual dimensions are ok, area matters
      const result = validateImageArea(2048, 2048, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(true) // Exactly at limit

      const overLimit = validateImageArea(2049, 2049, DEFAULT_SHARP_LIMITS)
      expect(overLimit.isValid).toBe(false)
    })

    it('should prevent file size DoS', () => {
      const result = validateImageFileSize(20 * 1024 * 1024, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
    })

    it('should enforce icon limits for batch processing', () => {
      // Valid for general image, invalid for icon
      const asGeneral = validateImageDimensions(1024, 1024, DEFAULT_SHARP_LIMITS)
      expect(asGeneral.isValid).toBe(true)

      const asIcon = validateImageDimensions(1024, 1024, ICON_SHARP_LIMITS)
      expect(asIcon.isValid).toBe(false)
    })
  })

  describe('Framework usage patterns', () => {
    it('should handle typical React icon set (multiple small icons)', () => {
      // React icon set: typically 192x192, 512x512, etc
      const icon192 = validateImageDimensions(192, 192, ICON_SHARP_LIMITS)
      expect(icon192.isValid).toBe(true)

      const icon512 = validateImageDimensions(512, 512, ICON_SHARP_LIMITS)
      expect(icon512.isValid).toBe(true)

      // Too large for icon limits
      const tooLarge = validateImageDimensions(1024, 1024, ICON_SHARP_LIMITS)
      expect(tooLarge.isValid).toBe(false)
    })

    it('should handle typical web image sizes', () => {
      // Common web image: 1920x1080
      const result = validateImageDimensions(1920, 1080, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(true)
    })

    it('should allow safe source images for processing', () => {
      // Source image that will be resized: 3000x2000
      // This should fail (exceeds max width)
      const result = validateImageDimensions(3000, 2000, DEFAULT_SHARP_LIMITS)
      expect(result.isValid).toBe(false)
    })
  })
})
