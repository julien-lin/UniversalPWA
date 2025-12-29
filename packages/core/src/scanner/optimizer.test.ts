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
} from './optimizer.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-optimizer')

// Helpers

const writeJSON = (filePath: string, data: unknown) => {
  writeFileSync(filePath, JSON.stringify(data), 'utf-8')
}

const makeAssets = (
  overrides: Partial<Parameters<typeof detectApiType>[1]> = {},
): Parameters<typeof detectApiType>[1] => ({
  javascript: [],
  css: [],
  images: [],
  fonts: [],
  apiRoutes: [],
  ...overrides,
})

const makeConfig = (
  overrides: Partial<Parameters<typeof optimizeProject>[2]> = {},
): Parameters<typeof optimizeProject>[2] => ({
  language: 'javascript',
  cssInJs: [],
  stateManagement: [],
  buildTool: null,
  ...overrides,
})

const createLargeFile = (filePath: string, sizeBytes: number) => {
  writeFileSync(filePath, 'x'.repeat(sizeBytes))
}

const createSharpImage = async (
  filePath: string,
  width: number,
  height: number,
  bg: { r: number; g: number; b: number; alpha: number },
  format: 'png' | 'jpeg' = 'png',
  pngOptions?: { compressionLevel?: number },
) => {
  const sharp = (await import('sharp')).default
  const img = sharp({
    create: { width, height, channels: 4, background: bg },
  })
  if (format === 'png') {
    await img.png(pngOptions ?? {}).toFile(filePath)
  } else {
    await img.jpeg().toFile(filePath)
  }
  return filePath
}

const expectStrategyIncludes = (
  strategies: Array<{ urlPattern: RegExp | string; handler: string }>,
  { patternIncludes, handler }: { patternIncludes?: string; handler?: string },
) => {
  if (patternIncludes) {
    expect(
      strategies.some((s) => s.urlPattern.toString().includes(patternIncludes)),
    ).toBe(true)
  }
  if (handler) {
    expect(strategies.some((s) => s.handler === handler)).toBe(true)
  }
}

const expectOptimizationResultOk = (result: Awaited<ReturnType<typeof optimizeProject>>) => {
  expect(result).toBeDefined()
  expect(result.cacheStrategies).toBeDefined()
  expect(result.manifestConfig).toBeDefined()
  expect(result.assetSuggestions).toBeDefined()
  expect(result.apiType).toBeDefined()
}

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
    it.each<{
      name: string
      pkg: Record<string, unknown> | null
      assets: Parameters<typeof detectApiType>[1]
      expected: 'REST' | 'GraphQL' | 'Mixed' | 'None'
    }>([
      {
        name: 'REST API',
        pkg: null,
        assets: makeAssets({ apiRoutes: ['/api/**'] }),
        expected: 'REST',
      },
      {
        name: 'GraphQL via package.json',
        pkg: { dependencies: { graphql: '^16.0.0' } },
        assets: makeAssets(),
        expected: 'GraphQL',
      },
      {
        name: 'Mixed API',
        pkg: { dependencies: { graphql: '^16.0.0' } },
        assets: makeAssets({ apiRoutes: ['/api/**', '/graphql'] }),
        expected: 'Mixed',
      },
      {
        name: 'No API',
        pkg: null,
        assets: makeAssets(),
        expected: 'None',
      },
    ])('should detect $name', ({ pkg, assets, expected }) => {
      if (pkg) writeJSON(join(TEST_DIR, 'package.json'), pkg)
      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe(expected)
    })
  })

  describe('generateAdaptiveCacheStrategies', () => {
    it.each([
      {
        name: 'REST API',
        apiType: 'REST' as const,
        assets: makeAssets({ apiRoutes: ['/api/**'] }),
        config: makeConfig(),
        expect: { patternIncludes: '/api/', handler: 'NetworkFirst' },
      },
      {
        name: 'GraphQL',
        apiType: 'GraphQL' as const,
        assets: makeAssets(),
        config: makeConfig(),
        expect: { patternIncludes: 'graphql' },
      },
      {
        name: 'Vite static assets',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ language: 'typescript', buildTool: 'vite' }),
        expect: { patternIncludes: '/assets/', handler: 'CacheFirst' },
      },
      {
        name: 'CSS-in-JS',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ cssInJs: ['styled-components'] }),
        expect: { patternIncludes: '.css', handler: 'StaleWhileRevalidate' },
      },
    ])('should generate strategies for $name', ({ apiType, assets, config, expect: exp }) => {
      const strategies = generateAdaptiveCacheStrategies(apiType, assets, config) as Array<{
        urlPattern: RegExp | string
        handler: string
      }>
      expect(strategies.length).toBeGreaterThan(0)
      expectStrategyIncludes(strategies, exp)
    })
  })

  describe('detectUnoptimizedImages', () => {
    it('should detect large images', () => {
      const largeImagePath = join(TEST_DIR, 'large-image.png')
      createLargeFile(largeImagePath, 2 * 1024 * 1024)

      const assets = makeAssets({ images: [largeImagePath] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.priority === 'high')).toBe(true)
    })

    it('should suggest WebP conversion for JPEG', () => {
      const jpegPath = join(TEST_DIR, 'image.jpg')
      writeFileSync(jpegPath, 'fake jpeg content')

      const assets = makeAssets({ images: [jpegPath] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.some((s) => s.suggestion.includes('WebP'))).toBe(true)
    })
  })

  describe('generateOptimalShortName', () => {
    it.each<[
      name: string,
      input: string,
      assertFn: (r: string) => void
    ]>([
      ['name already short', 'MyApp', (r) => expect(r).toBe('MyApp')],
      [
        'truncate long names',
        'My Very Long Application Name',
        (r) => expect(r.length).toBeLessThanOrEqual(12),
      ],
      [
        'generate initials',
        'Universal Progressive Web App',
        (r) => {
          expect(r.length).toBeLessThanOrEqual(12)
          expect(r).toMatch(/^[A-Z]+$/)
        },
      ],
      ['handle empty', '', (r) => expect(r).toBe('PWA')],
      ['single word', 'Application', (r) => expect(r).toBe('Application')],
      [
        'remove stop words',
        'The Best Application Ever',
        (r) => expect(r).not.toContain('The'),
      ],
    ])('should %s', (_name, input, assertFn) => {
      const result = generateOptimalShortName(input)
      assertFn(result)
    })
  })

  describe('suggestManifestColors', () => {
    it.each([
      ['react', ['#61dafb', '#282c34']],
      ['vue', ['#42b983', '#ffffff']],
      ['unknown', [undefined, undefined]],
    ])('should suggest colors for %s', (framework, expected) => {
      const colors = suggestManifestColors(TEST_DIR, framework)
      if (expected[0]) expect(colors.themeColor).toBe(expected[0])
      else expect(colors.themeColor).toBeDefined()
      if (expected[1]) expect(colors.backgroundColor).toBe(expected[1])
      else expect(colors.backgroundColor).toBeDefined()
    })
  })

  describe('optimizeProject', () => {
    it('should return complete optimization result', async () => {
      const assets = makeAssets({ apiRoutes: ['/api/**'] })
      const config = makeConfig({ language: 'typescript', buildTool: 'vite' })
      const result = await optimizeProject(TEST_DIR, assets, config, 'react')
      expectOptimizationResultOk(result)
    })

    it('should detect API type correctly', async () => {
      writeJSON(join(TEST_DIR, 'package.json'), { dependencies: { graphql: '^16.0.0' } })

      const assets = makeAssets({ apiRoutes: ['/graphql'] })
      const config = makeConfig()
      const result = await optimizeProject(TEST_DIR, assets, config, null)
      expect(result.apiType).toBe('GraphQL')
    })
  })

  describe('optimizeImage', () => {
    it('should optimize image and convert to WebP', async () => {
      const testImagePath = join(TEST_DIR, 'test-image.png')
      await createSharpImage(testImagePath, 1000, 1000, { r: 255, g: 0, b: 0, alpha: 1 })

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
      const testImagePath = join(TEST_DIR, 'test-image.png')
      await createSharpImage(testImagePath, 2000, 1500, { r: 0, g: 255, b: 0, alpha: 1 })

      const outputDir = join(TEST_DIR, 'responsive')
      const result = await generateResponsiveImageSizes(testImagePath, outputDir, [320, 640, 1024])

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((file) => file.includes('test-image'))).toBe(true)
    })

    it('should not upscale images', async () => {
      const testImagePath = join(TEST_DIR, 'small-image.png')
      await createSharpImage(testImagePath, 200, 200, { r: 0, g: 0, b: 255, alpha: 1 })

      const outputDir = join(TEST_DIR, 'responsive-small')
      const result = await generateResponsiveImageSizes(testImagePath, outputDir, [320, 640, 1024])

      expect(result.length).toBe(0)
    })
  })

  describe('optimizeProjectImages', () => {
    it('should optimize high priority images', async () => {
      const largeImagePath = join(TEST_DIR, 'large-image.png')
      await createSharpImage(
        largeImagePath,
        2000,
        2000,
        { r: 128, g: 128, b: 128, alpha: 1 },
        'png',
        { compressionLevel: 0 },
      )

      const assets = makeAssets({ images: [largeImagePath] })
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

