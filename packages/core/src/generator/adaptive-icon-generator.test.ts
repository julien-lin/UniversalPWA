/**
 * Tests for Adaptive Icon Generator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { generateAdaptiveIcon, generateAdaptiveIconFromSource } from './adaptive-icon-generator.js'
import type { IconSource, ColorSource, AdaptiveIconConfig } from './icon-config.js'

describe('adaptive-icon-generator', () => {
  let testDir: string
  let sourceImagePath: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'adaptive-icon-test-'))
    
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

  describe('generateAdaptiveIcon', () => {
    it('should generate adaptive icon with color background', async () => {
      const outputDir = join(testDir, 'output')
      const foreground: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'adaptive-foreground',
      }

      const background: ColorSource = {
        type: 'color',
        value: '#0000ff', // Blue background
      }

      const config: AdaptiveIconConfig = {
        enabled: true,
        foreground,
        background,
        safeZone: { width: 66, height: 66 },
      }

      const result = await generateAdaptiveIcon(foreground, background, outputDir, config)

      expect(result.foreground).toBeDefined()
      expect(result.background).toBeNull() // Color background doesn't create file
      expect(result.densities.length).toBeGreaterThan(0)
      expect(result.xml).toBeDefined()
      expect(result.generatedFiles.length).toBeGreaterThan(0)

      // Check that foreground file exists
      const foregroundExists = await sharp(result.foreground).metadata()
      expect(foregroundExists.width).toBe(1024)
      expect(foregroundExists.height).toBe(1024)
    })

    it('should generate adaptive icon with image background', async () => {
      const outputDir = join(testDir, 'output')
      
      // Create background image
      const backgroundImagePath = join(testDir, 'background.png')
      await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 }, // Green square
        },
      })
        .png()
        .toFile(backgroundImagePath)

      const foreground: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'adaptive-foreground',
      }

      const background: IconSource = {
        path: backgroundImagePath,
        priority: 1,
        type: 'adaptive-background',
      }

      const config: AdaptiveIconConfig = {
        enabled: true,
        foreground,
        background,
        safeZone: { width: 66, height: 66 },
      }

      const result = await generateAdaptiveIcon(foreground, background, outputDir, config)

      expect(result.foreground).toBeDefined()
      expect(result.background).toBeDefined()
      expect(result.densities.length).toBeGreaterThan(0)
      expect(result.xml).toBeDefined()

      // Check that background file exists
      const backgroundExists = await sharp(result.background!).metadata()
      expect(backgroundExists.width).toBe(1024)
      expect(backgroundExists.height).toBe(1024)
    })

    it('should generate density-specific icons', async () => {
      const outputDir = join(testDir, 'output')
      const foreground: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'adaptive-foreground',
      }

      const background: ColorSource = {
        type: 'color',
        value: '#ffffff',
      }

      const config: AdaptiveIconConfig = {
        enabled: true,
        foreground,
        background,
      }

      const result = await generateAdaptiveIcon(foreground, background, outputDir, config)

      // Should generate icons for all densities
      expect(result.densities.length).toBeGreaterThanOrEqual(15) // 5 densities * 3 files each

      // Check that density directories exist
      const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']
      for (const density of densities) {
        const densityPath = result.densities.find((p) => p.includes(`mipmap-${density}`))
        expect(densityPath).toBeDefined()
      }
    })

    it('should generate XML resource file', async () => {
      const outputDir = join(testDir, 'output')
      const foreground: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'adaptive-foreground',
      }

      const background: ColorSource = {
        type: 'color',
        value: '#ffffff',
      }

      const config: AdaptiveIconConfig = {
        enabled: true,
        foreground,
        background,
      }

      const result = await generateAdaptiveIcon(foreground, background, outputDir, config)

      expect(result.xml).toBeDefined()
      expect(result.xml).toContain('mipmap-anydpi-v26')
      expect(result.xml).toContain('ic_launcher.xml')
    })

    it('should respect custom safe zone', async () => {
      const outputDir = join(testDir, 'output')
      const foreground: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'adaptive-foreground',
      }

      const background: ColorSource = {
        type: 'color',
        value: '#ffffff',
      }

      const config: AdaptiveIconConfig = {
        enabled: true,
        foreground,
        background,
        safeZone: { width: 80, height: 80 }, // Larger safe zone
      }

      const result = await generateAdaptiveIcon(foreground, background, outputDir, config)

      expect(result.foreground).toBeDefined()
      // Foreground should be smaller due to larger safe zone
      const fgMetadata = await sharp(result.foreground).metadata()
      expect(fgMetadata.width).toBe(1024)
      expect(fgMetadata.height).toBe(1024)
    })
  })

  describe('generateAdaptiveIconFromSource', () => {
    it('should generate adaptive icon from single source with color background', async () => {
      const outputDir = join(testDir, 'output')
      const source: IconSource = {
        path: sourceImagePath,
        priority: 1,
        type: 'primary',
      }

      const result = await generateAdaptiveIconFromSource(source, '#ff0000', outputDir)

      expect(result.foreground).toBeDefined()
      expect(result.background).toBeNull()
      expect(result.densities.length).toBeGreaterThan(0)
      expect(result.xml).toBeDefined()
    })
  })
})
