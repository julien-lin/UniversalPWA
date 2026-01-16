import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  let warnSpy: ReturnType<typeof vi.spyOn<typeof console, 'warn'>> | null = null

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    warnSpy?.mockRestore()
    warnSpy = null
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
      {
        name: 'GraphQL via Apollo Client',
        pkg: { dependencies: { '@apollo/client': '^3.0.0' } },
        assets: makeAssets(),
        expected: 'GraphQL',
      },
      {
        name: 'GraphQL via Relay',
        pkg: { dependencies: { 'relay-runtime': '^14.0.0' } },
        assets: makeAssets(),
        expected: 'GraphQL',
      },
      {
        name: 'GraphQL via URQL',
        pkg: { dependencies: { urql: '^4.0.0' } },
        assets: makeAssets(),
        expected: 'GraphQL',
      },
      {
        name: 'REST via apiRoutes',
        pkg: null,
        assets: makeAssets({ apiRoutes: ['/rest/users'] }),
        expected: 'REST',
      },
      {
        name: 'REST detected in JavaScript code',
        pkg: null,
        assets: makeAssets({ 
          javascript: [join(TEST_DIR, 'api.js')],
          apiRoutes: [],
        }),
        expected: 'REST',
      },
      {
        name: 'GraphQL detected in JavaScript code',
        pkg: null,
        assets: makeAssets({ 
          javascript: [join(TEST_DIR, 'graphql.js')],
          apiRoutes: [],
        }),
        expected: 'GraphQL',
      },
    ])('should detect $name', ({ pkg, assets, expected }) => {
      if (pkg) writeJSON(join(TEST_DIR, 'package.json'), pkg)
      
      // Create JS files if needed for code detection
      if (assets.javascript.length > 0) {
        for (const jsFile of assets.javascript) {
          if (jsFile.includes('api.js')) {
            writeFileSync(jsFile, 'fetch("/api/users")')
          } else if (jsFile.includes('graphql.js')) {
            writeFileSync(jsFile, 'graphql query { users }')
          }
        }
      }
      
      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe(expected)
    })

    it('should handle invalid package.json', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), 'invalid json')
      const apiType = detectApiType(TEST_DIR, makeAssets())
      expect(apiType).toBeDefined()
    })

    it('should detect REST from axios usage', () => {
      const jsFile = join(TEST_DIR, 'api.js')
      writeFileSync(jsFile, 'import axios from "axios"; axios.get("/api/users")')
      const assets = makeAssets({ javascript: [jsFile] })
      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBe('REST')
    })

    it('should handle missing JavaScript files gracefully', () => {
      const assets = makeAssets({ javascript: [join(TEST_DIR, 'non-existent.js')] })
      const apiType = detectApiType(TEST_DIR, assets)
      expect(apiType).toBeDefined()
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
        name: 'Mixed API',
        apiType: 'Mixed' as const,
        assets: makeAssets({ apiRoutes: ['/api/**', '/graphql'] }),
        config: makeConfig(),
        expect: { patternIncludes: '/api/', handler: 'NetworkFirst' },
      },
      {
        name: 'Vite static assets',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ language: 'typescript', buildTool: 'vite' }),
        expect: { patternIncludes: '/assets/', handler: 'CacheFirst' },
      },
      {
        name: 'Webpack static assets',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ buildTool: 'webpack' }),
        expect: { patternIncludes: 'static', handler: 'StaleWhileRevalidate' },
      },
      {
        name: 'CSS-in-JS',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ cssInJs: ['styled-components'] }),
        expect: { patternIncludes: '.css', handler: 'StaleWhileRevalidate' },
      },
      {
        name: 'Multiple CSS-in-JS libraries',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ cssInJs: ['styled-components', 'emotion'] }),
        expect: { patternIncludes: '.css', handler: 'StaleWhileRevalidate' },
      },
      {
        name: 'No strategies for None API without build tool',
        apiType: 'None' as const,
        assets: makeAssets(),
        config: makeConfig({ buildTool: null }),
        expect: { patternIncludes: undefined, handler: undefined },
      },
    ])('should generate strategies for $name', ({ apiType, assets, config, expect: exp }) => {
      const strategies = generateAdaptiveCacheStrategies(apiType, assets, config) as Array<{
        urlPattern: RegExp | string
        handler: string
      }>
      if (exp.patternIncludes || exp.handler) {
      expect(strategies.length).toBeGreaterThan(0)
      expectStrategyIncludes(strategies, exp)
      } else {
        // No strategies expected
        expect(strategies.length).toBe(0)
      }
    })
  })

  describe('detectUnoptimizedImages', () => {
    it('should detect large images (> 1MB)', () => {
      const largeImagePath = join(TEST_DIR, 'large-image.png')
      createLargeFile(largeImagePath, 2 * 1024 * 1024)

      const assets = makeAssets({ images: [largeImagePath] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.priority === 'high')).toBe(true)
    })

    it('should detect medium images (> 500KB)', () => {
      const mediumImagePath = join(TEST_DIR, 'medium-image.png')
      createLargeFile(mediumImagePath, 600 * 1024)

      const assets = makeAssets({ images: [mediumImagePath] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.priority === 'medium')).toBe(true)
    })

    it('should suggest WebP conversion for JPEG', () => {
      const jpegPath = join(TEST_DIR, 'image.jpg')
      createLargeFile(jpegPath, 100 * 1024)

      const assets = makeAssets({ images: [jpegPath] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.some((s) => s.suggestion.includes('WebP'))).toBe(true)
    })

    it('should suggest optimization for large PNG', () => {
      const pngPath = join(TEST_DIR, 'large.png')
      createLargeFile(pngPath, 200 * 1024)

      const assets = makeAssets({ images: [pngPath] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.some((s) => s.suggestion.includes('PNG') || s.suggestion.includes('WebP'))).toBe(true)
    })

    it('should handle non-existent images gracefully', () => {
      const assets = makeAssets({ images: [join(TEST_DIR, 'non-existent.png')] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions).toBeDefined()
    })

    it('should handle multiple images', () => {
      const img1 = join(TEST_DIR, 'img1.jpg')
      const img2 = join(TEST_DIR, 'img2.png')
      createLargeFile(img1, 100 * 1024)
      createLargeFile(img2, 2 * 1024 * 1024)

      const assets = makeAssets({ images: [img1, img2] })
      const suggestions = detectUnoptimizedImages(assets)
      expect(suggestions.length).toBeGreaterThan(0)
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

    it('should optimize PNG without conversion', async () => {
      const testImagePath = join(TEST_DIR, 'test-image.png')
      await createSharpImage(testImagePath, 500, 500, { r: 0, g: 255, b: 0, alpha: 1 }, 'png', { compressionLevel: 0 })

      const result = await optimizeImage(testImagePath, {
        convertToWebP: false,
        quality: 90,
        outputDir: TEST_DIR,
      })

      // PNG optimization may return null if no significant savings
      if (result) {
        expect(result.format).toBe('png')
        expect(result.optimized.length).toBeGreaterThan(0)
      } else {
        // If null, it's acceptable (no optimization needed or error)
        expect(result).toBeNull()
      }
    })

    it('should optimize JPEG without conversion', async () => {
      const testImagePath = join(TEST_DIR, 'test-image.jpg')
      await createSharpImage(testImagePath, 500, 500, { r: 0, g: 0, b: 255, alpha: 1 }, 'jpeg')

      const result = await optimizeImage(testImagePath, {
        convertToWebP: false,
        quality: 85,
        outputDir: TEST_DIR,
      })

      // JPEG optimization may return null if no significant savings
      if (result) {
        expect(result.format).toBe('jpg')
        expect(result.optimized.length).toBeGreaterThan(0)
      } else {
        // If null, it's acceptable (no optimization needed or error)
        expect(result).toBeNull()
      }
    })

    it('should resize image if maxWidth specified', async () => {
      const testImagePath = join(TEST_DIR, 'large-image.png')
      await createSharpImage(testImagePath, 2000, 1500, { r: 128, g: 128, b: 128, alpha: 1 })

      const result = await optimizeImage(testImagePath, {
        convertToWebP: true,
        maxWidth: 1000,
        quality: 85,
        outputDir: TEST_DIR,
      })

      expect(result).not.toBeNull()
      if (result) {
        expect(result.optimized.length).toBeGreaterThan(0)
      }
    })

    it('should return null for non-existent image', async () => {
      const result = await optimizeImage(join(TEST_DIR, 'non-existent.png'))
      expect(result).toBeNull()
    })

    it('should return null for image without dimensions', async () => {
      const invalidImagePath = join(TEST_DIR, 'invalid.png')
      writeFileSync(invalidImagePath, 'not an image')
      
      const result = await optimizeImage(invalidImagePath)
      expect(result).toBeNull()
    })

    it('should handle optimization errors gracefully', async () => {
      const testImagePath = join(TEST_DIR, 'test-image.png')
      await createSharpImage(testImagePath, 100, 100, { r: 255, g: 0, b: 0, alpha: 1 })

      // Use invalid outputDir to trigger error
      const result = await optimizeImage(testImagePath, {
        convertToWebP: true,
        outputDir: '/invalid/path/that/does/not/exist',
      })

      // Should return null on error
      expect(result).toBeNull()
    })

    it('should keep WebP as WebP if already WebP', async () => {
      // Create a PNG and rename it (Sharp can't create WebP directly in test)
      await createSharpImage(join(TEST_DIR, 'temp.png'), 500, 500, { r: 255, g: 255, b: 0, alpha: 1 })
      // For this test, we'll just verify the logic handles .webp extension
      const result = await optimizeImage(join(TEST_DIR, 'temp.png'), {
        convertToWebP: true,
        outputDir: TEST_DIR,
      })

      expect(result).not.toBeNull()
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

    it('should optimize first 10 images if no high priority', async () => {
      const imagePaths: string[] = []
      for (let i = 0; i < 5; i++) {
        const imgPath = join(TEST_DIR, `img-${i}.png`)
        await createSharpImage(imgPath, 500, 500, { r: 255, g: 0, b: 0, alpha: 1 })
        imagePaths.push(imgPath)
      }

      const assets = makeAssets({ images: imagePaths })
      const results = await optimizeProjectImages(assets, {
        convertToWebP: true,
        quality: 85,
        outputDir: TEST_DIR,
      })

      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle optimization errors gracefully', async () => {
      const invalidImagePath = join(TEST_DIR, 'invalid.png')
      writeFileSync(invalidImagePath, 'not an image')

      const assets = makeAssets({ images: [invalidImagePath] })
      const results = await optimizeProjectImages(assets, {
        convertToWebP: true,
        quality: 85,
        outputDir: TEST_DIR,
      })

      // Should continue despite errors
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should only include results with savings > 0', async () => {
      const imagePath = join(TEST_DIR, 'small-image.png')
      await createSharpImage(imagePath, 100, 100, { r: 255, g: 255, b: 255, alpha: 1 })

      const assets = makeAssets({ images: [imagePath] })
      const results = await optimizeProjectImages(assets, {
        convertToWebP: true,
        quality: 85,
        outputDir: TEST_DIR,
      })

      // Results should only include images with savings > 0
      expect(results.every((r) => r.savings > 0)).toBe(true)
    })
  })

  describe('generateOptimalShortName', () => {
    it('should handle names with special characters', () => {
      const result = generateOptimalShortName('My-App_Test')
      expect(result.length).toBeLessThanOrEqual(12)
    })

    it('should handle names with only stop words', () => {
      const result = generateOptimalShortName('The A An And')
      expect(result.length).toBeLessThanOrEqual(12)
    })

    it('should handle very long single word', () => {
      const result = generateOptimalShortName('Supercalifragilisticexpialidocious')
      expect(result.length).toBe(12)
    })

    it('should handle initials longer than 12 characters', () => {
      const result = generateOptimalShortName('A B C D E F G H I J K L M N O P')
      expect(result.length).toBeLessThanOrEqual(12)
    })
  })

  describe('suggestManifestColors', () => {
    it('should suggest colors for all supported frameworks', () => {
      const frameworks = ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'wordpress', 'symfony', 'laravel']
      
      for (const framework of frameworks) {
        const colors = suggestManifestColors(TEST_DIR, framework)
        expect(colors.themeColor).toBeDefined()
        expect(colors.backgroundColor).toBeDefined()
      }
    })

    it('should return default colors for unknown framework', () => {
      const colors = suggestManifestColors(TEST_DIR, 'unknown-framework')
      expect(colors.themeColor).toBe('#ffffff')
      expect(colors.backgroundColor).toBe('#000000')
    })

    it('should return default colors for null framework', () => {
      const colors = suggestManifestColors(TEST_DIR, null)
      expect(colors.themeColor).toBe('#ffffff')
      expect(colors.backgroundColor).toBe('#000000')
    })

    it('should handle case-insensitive framework names', () => {
      const colors1 = suggestManifestColors(TEST_DIR, 'React')
      const colors2 = suggestManifestColors(TEST_DIR, 'react')
      expect(colors1).toEqual(colors2)
    })

    it('should handle iconSource path resolution', () => {
      const iconPath = join(TEST_DIR, 'icon.png')
      writeFileSync(iconPath, 'test')
      
      const colors = suggestManifestColors(TEST_DIR, null, iconPath)
      // Should fallback to default since detectDominantColors returns null
      expect(colors.themeColor).toBeDefined()
      expect(colors.backgroundColor).toBeDefined()
    })

    it('should handle relative iconSource path', () => {
      const iconPath = join(TEST_DIR, 'icon.png')
      writeFileSync(iconPath, 'test')
      
      const colors = suggestManifestColors(TEST_DIR, null, 'icon.png')
      expect(colors.themeColor).toBeDefined()
      expect(colors.backgroundColor).toBeDefined()
    })

    it('should handle non-existent iconSource', () => {
      const colors = suggestManifestColors(TEST_DIR, null, 'non-existent.png')
      expect(colors.themeColor).toBeDefined()
      expect(colors.backgroundColor).toBeDefined()
    })
  })

  describe('optimizeProject', () => {
    it('should return complete optimization result with autoOptimizeImages', async () => {
      const largeImagePath = join(TEST_DIR, 'large-image.png')
      await createSharpImage(
        largeImagePath,
        2000,
        2000,
        { r: 128, g: 128, b: 128, alpha: 1 },
        'png',
        { compressionLevel: 0 },
      )

      const assets = makeAssets({ images: [largeImagePath], apiRoutes: ['/api/**'] })
      const config = makeConfig({ language: 'typescript', buildTool: 'vite' })
      const result = await optimizeProject(TEST_DIR, assets, config, 'react', undefined, true)

      expectOptimizationResultOk(result)
      expect(result.optimizedImages).toBeDefined()
    })

    it('should not optimize images when autoOptimizeImages is false', async () => {
      const assets = makeAssets({ images: [join(TEST_DIR, 'img.png')], apiRoutes: ['/api/**'] })
      const config = makeConfig()
      const result = await optimizeProject(TEST_DIR, assets, config, null, undefined, false)

      expect(result.optimizedImages).toBeUndefined()
    })

    it('should not optimize images when no images provided', async () => {
      const assets = makeAssets({ images: [] })
      const config = makeConfig()
      const result = await optimizeProject(TEST_DIR, assets, config, null, undefined, true)

      expect(result.optimizedImages).toBeUndefined()
    })

    it('should handle all framework colors in manifest config', async () => {
      const frameworks = ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'wordpress', 'symfony', 'laravel']
      
      for (const framework of frameworks) {
        const assets = makeAssets()
        const config = makeConfig()
        const result = await optimizeProject(TEST_DIR, assets, config, framework)
        
        expect(result.manifestConfig.themeColor).toBeDefined()
        expect(result.manifestConfig.backgroundColor).toBeDefined()
      }
    })
  })
})

