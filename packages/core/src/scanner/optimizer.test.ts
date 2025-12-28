import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  detectApiType,
  generateAdaptiveCacheStrategies,
  detectUnoptimizedImages,
  generateOptimalShortName,
  suggestManifestColors,
  optimizeProject,
  optimizeImage,
  optimizeProjectImages,
  generateResponsiveImageSizes,
  type AssetDetectionResult,
  type ProjectConfiguration,
} from './optimizer.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-optimizer')

describe('optimizer', () => {
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

  describe('detectApiType', () => {
    it('should detect REST API', () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: ['/api/**'],
      }

      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe('REST')
    })

    it('should detect GraphQL API from package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            graphql: '^16.0.0',
          },
        }),
      )

      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: [],
      }

      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe('GraphQL')
    })

    it('should detect Mixed API', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            graphql: '^16.0.0',
          },
        }),
      )

      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: ['/api/**', '/graphql'],
      }

      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe('Mixed')
    })

    it('should detect None when no API', () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: [],
      }

      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe('None')
    })
  })

  describe('generateAdaptiveCacheStrategies', () => {
    it('should generate REST API cache strategy', () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: ['/api/**'],
      }

      const config: ProjectConfiguration = {
        language: 'javascript',
        cssInJs: [],
        stateManagement: [],
        buildTool: null,
      }

      const strategies = generateAdaptiveCacheStrategies('REST', assets, config)
      expect(strategies.length).toBeGreaterThan(0)
      expect(strategies.some((s) => s.urlPattern.toString().includes('/api/'))).toBe(true)
      expect(strategies.some((s) => s.handler === 'NetworkFirst')).toBe(true)
    })

    it('should generate GraphQL cache strategy', () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: [],
      }

      const config: ProjectConfiguration = {
        language: 'javascript',
        cssInJs: [],
        stateManagement: [],
        buildTool: null,
      }

      const strategies = generateAdaptiveCacheStrategies('GraphQL', assets, config)
      expect(strategies.length).toBeGreaterThan(0)
      expect(strategies.some((s) => s.urlPattern.toString().includes('graphql'))).toBe(true)
    })

    it('should generate Vite-specific cache strategy', () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: [],
      }

      const config: ProjectConfiguration = {
        language: 'typescript',
        cssInJs: [],
        stateManagement: [],
        buildTool: 'vite',
      }

      const strategies = generateAdaptiveCacheStrategies('None', assets, config)
      expect(strategies.some((s) => s.urlPattern.toString().includes('/assets/'))).toBe(true)
      expect(strategies.some((s) => s.handler === 'CacheFirst')).toBe(true)
    })

    it('should generate CSS-in-JS cache strategy', () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: [],
      }

      const config: ProjectConfiguration = {
        language: 'typescript',
        cssInJs: ['styled-components'],
        stateManagement: [],
        buildTool: null,
      }

      const strategies = generateAdaptiveCacheStrategies('None', assets, config)
      expect(strategies.some((s) => s.urlPattern.toString().includes('.css'))).toBe(true)
      expect(strategies.some((s) => s.handler === 'StaleWhileRevalidate')).toBe(true)
    })
  })

  describe('detectUnoptimizedImages', () => {
    it('should detect large images', () => {
      // Créer un fichier image fictif (on simule avec un fichier texte)
      const largeImagePath = join(TEST_DIR, 'large-image.png')
      // Écrire 2MB de données
      writeFileSync(largeImagePath, 'x'.repeat(2 * 1024 * 1024))

      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [largeImagePath],
        fonts: [],
        apiRoutes: [],
      }

      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.priority === 'high')).toBe(true)
    })

    it('should suggest WebP conversion for JPEG', () => {
      const jpegPath = join(TEST_DIR, 'image.jpg')
      writeFileSync(jpegPath, 'fake jpeg content')

      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [jpegPath],
        fonts: [],
        apiRoutes: [],
      }

      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.some((s) => s.suggestion.includes('WebP'))).toBe(true)
    })
  })

  describe('generateOptimalShortName', () => {
    it('should return name if already short', () => {
      expect(generateOptimalShortName('MyApp')).toBe('MyApp')
    })

    it('should truncate long names', () => {
      const result = generateOptimalShortName('My Very Long Application Name')
      expect(result.length).toBeLessThanOrEqual(12)
    })

    it('should generate initials from multiple words', () => {
      const result = generateOptimalShortName('Universal Progressive Web App')
      expect(result.length).toBeLessThanOrEqual(12)
      // Devrait être "UPWA" ou similaire
      expect(result).toMatch(/^[A-Z]+$/)
    })

    it('should handle empty string', () => {
      expect(generateOptimalShortName('')).toBe('PWA')
    })

    it('should handle single word', () => {
      expect(generateOptimalShortName('Application')).toBe('Application')
    })

    it('should remove stop words', () => {
      const result = generateOptimalShortName('The Best Application Ever')
      expect(result).not.toContain('The')
    })
  })

  describe('suggestManifestColors', () => {
    it('should suggest React colors', async () => {
      const colors = await suggestManifestColors(TEST_DIR, 'react')
      expect(colors.themeColor).toBe('#61dafb')
      expect(colors.backgroundColor).toBe('#282c34')
    })

    it('should suggest Vue colors', async () => {
      const colors = await suggestManifestColors(TEST_DIR, 'vue')
      expect(colors.themeColor).toBe('#42b983')
      expect(colors.backgroundColor).toBe('#ffffff')
    })

    it('should suggest default colors for unknown framework', async () => {
      const colors = await suggestManifestColors(TEST_DIR, 'unknown')
      expect(colors.themeColor).toBeDefined()
      expect(colors.backgroundColor).toBeDefined()
    })
  })

  describe('optimizeProject', () => {
    it('should return complete optimization result', async () => {
      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: ['/api/**'],
      }

      const config: ProjectConfiguration = {
        language: 'typescript',
        cssInJs: [],
        stateManagement: [],
        buildTool: 'vite',
      }

      const result = await optimizeProject(TEST_DIR, assets, config, 'react')

      expect(result).toBeDefined()
      expect(result.cacheStrategies).toBeDefined()
      expect(result.manifestConfig).toBeDefined()
      expect(result.assetSuggestions).toBeDefined()
      expect(result.apiType).toBeDefined()
    })

    it('should detect API type correctly', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            graphql: '^16.0.0',
          },
        }),
      )

      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [],
        fonts: [],
        apiRoutes: ['/graphql'],
      }

      const config: ProjectConfiguration = {
        language: 'javascript',
        cssInJs: [],
        stateManagement: [],
        buildTool: null,
      }

      const result = await optimizeProject(TEST_DIR, assets, config, null)

      expect(result.apiType).toBe('GraphQL')
    })
  })

  describe('optimizeImage', () => {
    it('should optimize image and convert to WebP', async () => {
      // Créer une image PNG de test
      const testImagePath = join(TEST_DIR, 'test-image.png')
      // Utiliser sharp pour créer une image de test
      const sharp = (await import('sharp')).default
      await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(testImagePath)

      const result = await optimizeImage(testImagePath, {
        convertToWebP: true,
        quality: 85,
        outputDir: TEST_DIR,
      })

      expect(result).not.toBeNull()
      if (result) {
        expect(result.optimized.length).toBeGreaterThan(0)
        expect(result.format).toBe('webp')
        expect(result.originalSize).toBeGreaterThan(0)
        expect(result.optimizedSize).toBeGreaterThan(0)
      }
    })

    it('should return null for non-existent image', async () => {
      const result = await optimizeImage(join(TEST_DIR, 'non-existent.png'))
      expect(result).toBeNull()
    })
  })

  describe('generateResponsiveImageSizes', () => {
    it('should generate responsive image sizes', async () => {
      // Créer une image de test
      const testImagePath = join(TEST_DIR, 'test-image.png')
      const sharp = (await import('sharp')).default
      await sharp({
        create: {
          width: 2000,
          height: 1500,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(testImagePath)

      const outputDir = join(TEST_DIR, 'responsive')
      const result = await generateResponsiveImageSizes(testImagePath, outputDir, [320, 640, 1024])

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((file) => file.includes('test-image'))).toBe(true)
    })

    it('should not upscale images', async () => {
      // Créer une petite image
      const testImagePath = join(TEST_DIR, 'small-image.png')
      const sharp = (await import('sharp')).default
      await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(testImagePath)

      const outputDir = join(TEST_DIR, 'responsive-small')
      const result = await generateResponsiveImageSizes(testImagePath, outputDir, [320, 640, 1024])

      // Ne devrait générer que des tailles <= 200
      expect(result.length).toBe(0) // Aucune taille générée car toutes > 200
    })
  })

  describe('optimizeProjectImages', () => {
    it('should optimize high priority images', async () => {
      // Créer une grande image (> 1MB simulé)
      const largeImagePath = join(TEST_DIR, 'large-image.png')
      const sharp = (await import('sharp')).default
      // Créer une image assez grande
      await sharp({
        create: {
          width: 2000,
          height: 2000,
          channels: 4,
          background: { r: 128, g: 128, b: 128, alpha: 1 },
        },
      })
        .png({ compressionLevel: 0 }) // Pas de compression pour créer un gros fichier
        .toFile(largeImagePath)

      const assets: AssetDetectionResult = {
        javascript: [],
        css: [],
        images: [largeImagePath],
        fonts: [],
        apiRoutes: [],
      }

      const results = await optimizeProjectImages(assets, {
        convertToWebP: true,
        quality: 85,
        outputDir: TEST_DIR,
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].savings).toBeGreaterThanOrEqual(0)
    })
  })
})

