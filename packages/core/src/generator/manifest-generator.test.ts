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
    it('should generate minimal manifest', () => {
      const options: ManifestGeneratorOptions = {
        name: 'My App',
        shortName: 'App',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      }

      const manifest = generateManifest(options)

      expect(manifest.name).toBe('My App')
      expect(manifest.short_name).toBe('App')
      expect(manifest.start_url).toBe('/')
      expect(manifest.scope).toBe('/')
      expect(manifest.display).toBe('standalone')
      expect(manifest.icons).toHaveLength(1)
    })

    it('should generate full manifest with all options', () => {
      const options: ManifestGeneratorOptions = {
        name: 'My Progressive Web App',
        shortName: 'MyPWA',
        description: 'A great PWA',
        startUrl: '/app',
        scope: '/app',
        display: 'standalone',
        orientation: 'portrait',
        themeColor: '#ffffff',
        backgroundColor: '#000000',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        splashScreens: [
          {
            src: '/splash.png',
            sizes: '1284x2778',
            type: 'image/png',
          },
        ],
        categories: ['productivity', 'utilities'],
        lang: 'fr',
        dir: 'ltr',
      }

      const manifest = generateManifest(options)

      expect(manifest.name).toBe('My Progressive Web App')
      expect(manifest.short_name).toBe('MyPWA')
      expect(manifest.description).toBe('A great PWA')
      expect(manifest.start_url).toBe('/app')
      expect(manifest.scope).toBe('/app')
      expect(manifest.display).toBe('standalone')
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
      const options: ManifestGeneratorOptions = {
        name: 'Test App',
        shortName: 'Test',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
          },
        ],
      }

      const manifest = generateManifest(options)
      const validated = ManifestSchema.parse(manifest)

      expect(validated).toEqual(manifest)
    })

    it('should throw error for invalid theme color', () => {
      const options: ManifestGeneratorOptions = {
        name: 'Test App',
        shortName: 'Test',
        themeColor: 'invalid-color',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
          },
        ],
      }

      expect(() => generateManifest(options)).toThrow()
    })

    it('should throw error for invalid background color', () => {
      const options: ManifestGeneratorOptions = {
        name: 'Test App',
        shortName: 'Test',
        backgroundColor: 'not-a-color',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
          },
        ],
      }

      expect(() => generateManifest(options)).toThrow()
    })

    it('should throw error for empty icons array', () => {
      const options: ManifestGeneratorOptions = {
        name: 'Test App',
        shortName: 'Test',
        icons: [],
      }

      expect(() => generateManifest(options)).toThrow()
    })

    it('should truncate short_name > 12 characters to 12 characters', () => {
      const options: ManifestGeneratorOptions = {
        name: 'Test App',
        shortName: 'This is too long',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
          },
        ],
      }

      const manifest = generateManifest(options)
      // La validation tronque automatiquement à 12 caractères
      // "This is too long" -> trim() -> substring(0, 12) -> "This is too " -> trim() final -> "This is too" (10 chars)
      expect(manifest.short_name.length).toBeLessThanOrEqual(12)
      expect(manifest.short_name).toBe('This is too')
    })

    it('should handle different display modes', () => {
      const displays: Array<'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'> = [
        'standalone',
        'fullscreen',
        'minimal-ui',
        'browser',
      ]

      displays.forEach((display) => {
        const options: ManifestGeneratorOptions = {
          name: 'Test App',
          shortName: 'Test',
          display,
          icons: [
            {
              src: '/icon.png',
              sizes: '192x192',
            },
          ],
        }

        const manifest = generateManifest(options)
        expect(manifest.display).toBe(display)
      })
    })
  })

  describe('writeManifest', () => {
    it('should write manifest.json to output directory', () => {
      const manifest = generateManifest({
        name: 'Test App',
        shortName: 'Test',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
          },
        ],
      })

      const manifestPath = writeManifest(manifest, TEST_DIR)

      expect(existsSync(manifestPath)).toBe(true)
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(content.name).toBe('Test App')
      expect(content.short_name).toBe('Test')
    })

    it('should write valid JSON', () => {
      const manifest = generateManifest({
        name: 'Test App',
        shortName: 'Test',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
          },
        ],
      })

      const manifestPath = writeManifest(manifest, TEST_DIR)
      const content = readFileSync(manifestPath, 'utf-8')

      expect(() => JSON.parse(content)).not.toThrow()
    })
  })

  describe('generateAndWriteManifest', () => {
    it('should generate and write manifest in one call', () => {
      const options: ManifestGeneratorOptions = {
        name: 'My App',
        shortName: 'App',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      }

      const manifestPath = generateAndWriteManifest(options, TEST_DIR)

      expect(existsSync(manifestPath)).toBe(true)
      const content = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      expect(content.name).toBe('My App')
      expect(content.short_name).toBe('App')
    })
  })
})

