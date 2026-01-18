/**
 * Tests for Splash Screen Generator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { generateSplashScreens, generateSplashScreensFromSource } from './splash-screen-generator.js'
import type { IconSource, SplashScreenConfig } from './icon-config.js'

describe('splash-screen-generator', () => {
  let testDir: string
  let sourceImagePath: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'splash-screen-test-'))
    
    // Create a test source image (512x512 PNG)
    sourceImagePath = join(testDir, 'source.png')
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }, // Red square
      },
    })
      .png()
      .toFile(sourceImagePath)
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  describe('generateSplashScreens', () => {
    it('should generate iOS splash screens', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const config: SplashScreenConfig = {
        enabled: true,
        source,
        backgroundColor: '#ffffff',
        platforms: ['ios'],
      }

      const result = await generateSplashScreens(source, config, outputDir)

      expect(result.ios.length).toBeGreaterThan(0)
      expect(result.android.length).toBe(0)
      expect(result.generatedFiles.length).toBeGreaterThan(0)

      // Check that iOS files exist and have correct dimensions
      for (const iosPath of result.ios) {
        const metadata = await sharp(iosPath).metadata()
        expect(metadata.width).toBeGreaterThan(0)
        expect(metadata.height).toBeGreaterThan(0)
        expect(metadata.format).toBe('png')
      }
    })

    it('should generate Android splash screens', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const config: SplashScreenConfig = {
        enabled: true,
        source,
        backgroundColor: '#000000',
        platforms: ['android'],
        densities: ['mdpi', 'hdpi', 'xhdpi'],
      }

      const result = await generateSplashScreens(source, config, outputDir)

      expect(result.ios.length).toBe(0)
      expect(result.android.length).toBe(3) // 3 densities
      expect(result.generatedFiles.length).toBeGreaterThan(0)
      expect(result.xml).toBeDefined()

      // Check that Android files exist
      for (const androidPath of result.android) {
        const metadata = await sharp(androidPath).metadata()
        expect(metadata.width).toBeGreaterThan(0)
        expect(metadata.height).toBeGreaterThan(0)
        expect(metadata.format).toBe('png')
      }
    })

    it('should generate both iOS and Android splash screens', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const config: SplashScreenConfig = {
        enabled: true,
        source,
        backgroundColor: '#ff0000',
        platforms: ['all'],
        densities: ['mdpi', 'hdpi'],
      }

      const result = await generateSplashScreens(source, config, outputDir)

      expect(result.ios.length).toBeGreaterThan(0)
      expect(result.android.length).toBe(2) // 2 densities
      expect(result.generatedFiles.length).toBeGreaterThan(result.ios.length + result.android.length)
    })

    it('should use themeColor as fallback for backgroundColor', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const config: SplashScreenConfig = {
        enabled: true,
        source,
        themeColor: '#00ff00', // Green
        platforms: ['ios'],
      }

      const result = await generateSplashScreens(source, config, outputDir)

      expect(result.ios.length).toBeGreaterThan(0)
      
      // Check that background color is green
      const firstSplash = result.ios[0]
      const metadata = await sharp(firstSplash).metadata()
      expect(metadata.width).toBeGreaterThan(0)
    })

    it('should generate Android XML resource', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const config: SplashScreenConfig = {
        enabled: true,
        source,
        backgroundColor: '#ffffff',
        platforms: ['android'],
      }

      const result = await generateSplashScreens(source, config, outputDir)

      expect(result.xml).toBeDefined()
      expect(result.xml).toContain('drawable')
      expect(result.xml).toContain('splash_screen.xml')
    })

    it('should handle custom sizes', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const config: SplashScreenConfig = {
        enabled: true,
        source,
        backgroundColor: '#ffffff',
        platforms: ['ios'],
        sizes: [
          { width: 100, height: 200, name: 'custom-100x200.png' },
          { width: 300, height: 400, name: 'custom-300x400.png' },
        ],
      }

      const result = await generateSplashScreens(source, config, outputDir)

      expect(result.ios.length).toBe(2)
      
      // Check custom sizes
      const firstSplash = result.ios[0]
      const metadata = await sharp(firstSplash).metadata()
      expect(metadata.width).toBe(100)
      expect(metadata.height).toBe(200)
    })
  })

  describe('generateSplashScreensFromSource', () => {
    it('should generate splash screens with default config', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const result = await generateSplashScreensFromSource(source, '#ffffff', outputDir, ['all'])

      expect(result.ios.length).toBeGreaterThan(0)
      expect(result.android.length).toBeGreaterThan(0)
    })
  })
})
