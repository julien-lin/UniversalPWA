import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  generateManifest,
  writeManifest,
  generateAndWriteManifest,
  ManifestSchema,
  type ManifestGeneratorOptions,
} from './manifest-generator'

const TEST_DIR = join(process.cwd(), '.test-tmp-manifest')

// Helpers
const makeIcon = (src: string, sizes: string, type = 'image/png') => ({ src, sizes, type })

const makeOptions = (overrides: Partial<ManifestGeneratorOptions> = {}): ManifestGeneratorOptions => ({
  name: 'Test App',
  shortName: 'Test',
  icons: [makeIcon('/icon.png', '192x192')],
  ...overrides,
})

const readManifest = (path: string) => JSON.parse(readFileSync(path, 'utf-8'))

describe('manifest-generator', () => {
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

  describe('generateManifest', () => {
    it('should generate minimal manifest with defaults', () => {
      const manifest = generateManifest(makeOptions())

      expect(manifest.name).toBe('Test App')
      expect(manifest.short_name).toBe('Test')
      expect(manifest.start_url).toBe('/')
      expect(manifest.scope).toBe('/')
      expect(manifest.display).toBe('standalone')
      expect(manifest.icons).toHaveLength(1)
      expect(manifest.theme_color).toBe('#ffffff')
      expect(manifest.background_color).toBe('#ffffff')
    })

    it('should generate full manifest with all options', () => {
      const manifest = generateManifest(
        makeOptions({
          name: 'My Progressive Web App',
          shortName: 'MyPWA',
          description: 'A great PWA',
          startUrl: '/app',
          scope: '/app',
          display: 'fullscreen',
          orientation: 'portrait',
          themeColor: '#ffffff',
          backgroundColor: '#000000',
          icons: [makeIcon('/icon-192.png', '192x192'), makeIcon('/icon-512.png', '512x512')],
          splashScreens: [makeIcon('/splash.png', '1284x2778')],
          categories: ['productivity', 'utilities'],
          lang: 'fr',
          dir: 'ltr',
        }),
      )

      expect(manifest.name).toBe('My Progressive Web App')
      expect(manifest.short_name).toBe('MyPWA')
      expect(manifest.description).toBe('A great PWA')
      expect(manifest.start_url).toBe('/app')
      expect(manifest.scope).toBe('/app')
      expect(manifest.display).toBe('fullscreen')
      expect(manifest.orientation).toBe('portrait')
      expect(manifest.theme_color).toBe('#ffffff')
      expect(manifest.background_color).toBe('#000000')
      expect(manifest.icons).toHaveLength(2)
      expect(manifest.splash_screens).toHaveLength(1)
      expect(manifest.categories).toEqual(['productivity', 'utilities'])
      expect(manifest.lang).toBe('fr')
      expect(manifest.dir).toBe('ltr')
    })

    it('should validate manifest with Zod schema', () => {
      const manifest = generateManifest(makeOptions())
      const validated = ManifestSchema.parse(manifest)
      expect(validated).toEqual(manifest)
    })

    it.each([
      { field: 'themeColor', value: 'invalid-color', label: 'theme color' },
      { field: 'backgroundColor', value: 'not-a-color', label: 'background color' },
    ])('should throw error for invalid $label', ({ field, value }) => {
      expect(() => generateManifest(makeOptions({ [field]: value }))).toThrow()
    })

    it('should throw error for empty icons array', () => {
      expect(() => generateManifest(makeOptions({ icons: [] }))).toThrow()
    })

    it('should truncate short_name > 12 characters', () => {
      const manifest = generateManifest(makeOptions({ shortName: 'This is too long' }))
      expect(manifest.short_name.length).toBeLessThanOrEqual(12)
      expect(manifest.short_name).toBe('This is too')
    })

    it.each<'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'>([
      'standalone',
      'fullscreen',
      'minimal-ui',
      'browser',
    ])('should handle display mode: %s', (display) => {
      const manifest = generateManifest(makeOptions({ display }))
      expect(manifest.display).toBe(display)
    })
  })

  describe('writeManifest', () => {
    it('should write manifest.json and return path', () => {
      const manifest = generateManifest(makeOptions())
      const manifestPath = writeManifest(manifest, TEST_DIR)

      expect(existsSync(manifestPath)).toBe(true)
      const content = readManifest(manifestPath)
      expect(content.name).toBe('Test App')
      expect(content.short_name).toBe('Test')
    })

    it('should write valid JSON', () => {
      const manifest = generateManifest(makeOptions())
      const manifestPath = writeManifest(manifest, TEST_DIR)
      const content = readFileSync(manifestPath, 'utf-8')
      expect(() => JSON.parse(content)).not.toThrow()
    })
  })

  describe('generateAndWriteManifest', () => {
    it('should generate and write manifest in one call', () => {
      const options = makeOptions({ name: 'My App', shortName: 'App' })
      const manifestPath = generateAndWriteManifest(options, TEST_DIR)

      expect(existsSync(manifestPath)).toBe(true)
      const content = readManifest(manifestPath)
      expect(content.name).toBe('My App')
      expect(content.short_name).toBe('App')
    })
  })
})
