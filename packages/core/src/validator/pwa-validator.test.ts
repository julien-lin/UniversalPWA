import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { validatePWA } from './pwa-validator.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-pwa-validator')

describe('pwa-validator', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  describe('validatePWA - Manifest validation', () => {
    it('should detect missing manifest.json', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.manifest.exists).toBe(false)
      expect(result.details.manifest.valid).toBe(false)
      expect(result.errors.some((e) => e.code === 'MANIFEST_MISSING')).toBe(true)
      expect(result.score).toBeLessThan(100)
    })

    it('should validate valid manifest.json', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#000000',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.manifest.exists).toBe(true)
      expect(result.details.manifest.valid).toBe(true)
      expect(result.errors.filter((e) => e.code.startsWith('MANIFEST_')).length).toBe(0)
    })

    it('should detect missing name field', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.errors.some((e) => e.code === 'MANIFEST_NAME_MISSING')).toBe(true)
    })

    it('should detect missing short_name field', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.errors.some((e) => e.code === 'MANIFEST_SHORT_NAME_MISSING')).toBe(true)
    })

    it('should detect short_name too long', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'This is way too long for a short name',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.errors.some((e) => e.code === 'MANIFEST_SHORT_NAME_TOO_LONG')).toBe(true)
    })

    it('should detect missing icons array', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.errors.some((e) => e.code === 'MANIFEST_ICONS_MISSING')).toBe(true)
    })

    it('should warn about missing theme_color', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.warnings.some((w) => w.code === 'MANIFEST_THEME_COLOR_MISSING')).toBe(true)
    })

    it('should warn about missing background_color', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.warnings.some((w) => w.code === 'MANIFEST_BACKGROUND_COLOR_MISSING')).toBe(true)
    })

    it('should detect invalid JSON in manifest.json', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), '{ invalid json }')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.errors.some((e) => e.code === 'MANIFEST_INVALID_JSON')).toBe(true)
    })
  })

  describe('validatePWA - Icons validation', () => {
    it('should detect missing 192x192 icon', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.icons.has192x192).toBe(false)
      expect(result.errors.some((e) => e.code === 'ICON_192X192_MISSING')).toBe(true)
    })

    it('should detect missing 512x512 icon', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.icons.has512x512).toBe(false)
      expect(result.errors.some((e) => e.code === 'ICON_512X512_MISSING')).toBe(true)
    })

    it('should validate icons when both 192x192 and 512x512 are present', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      // Create dummy icon files
      writeFileSync(join(TEST_DIR, 'public', 'icon-192x192.png'), 'dummy')
      writeFileSync(join(TEST_DIR, 'public', 'icon-512x512.png'), 'dummy')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.icons.has192x192).toBe(true)
      expect(result.details.icons.has512x512).toBe(true)
      expect(result.details.icons.valid).toBe(true)
    })

    it('should detect missing icon file', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))
      // Only create one icon file
      writeFileSync(join(TEST_DIR, 'public', 'icon-192x192.png'), 'dummy')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.errors.some((e) => e.code === 'ICON_FILE_MISSING')).toBe(true)
    })

    it('should handle icons with sizes array', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192 384x384', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))
      writeFileSync(join(TEST_DIR, 'public', 'icon-192x192.png'), 'dummy')
      writeFileSync(join(TEST_DIR, 'public', 'icon-512x512.png'), 'dummy')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.icons.has192x192).toBe(true)
      expect(result.details.icons.has512x512).toBe(true)
    })
  })

  describe('validatePWA - Service worker validation', () => {
    it('should detect missing service worker', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.serviceWorker.exists).toBe(false)
      expect(result.errors.some((e) => e.code === 'SERVICE_WORKER_MISSING')).toBe(true)
    })

    it('should validate service worker with Workbox', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const swContent = `
        importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');
        workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
      `
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), swContent)

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.serviceWorker.exists).toBe(true)
      expect(result.details.serviceWorker.valid).toBe(true)
      expect(result.errors.filter((e) => e.code.startsWith('SERVICE_WORKER_')).length).toBe(0)
    })

    it('should warn about service worker without Workbox', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), 'console.log("custom sw");')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.serviceWorker.exists).toBe(true)
      expect(result.warnings.some((w) => w.code === 'SERVICE_WORKER_INVALID')).toBe(true)
    })

    it('should warn about service worker without precache', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), 'importScripts("workbox-sw.js");')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.warnings.some((w) => w.code === 'SERVICE_WORKER_NO_PRECACHE')).toBe(true)
    })
  })

  describe('validatePWA - Meta tags validation', () => {
    it('should detect missing manifest link in HTML', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><head><title>Test</title></head><body></body></html>')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.errors.some((e) => e.code === 'META_MANIFEST_MISSING')).toBe(true)
    })

    it('should validate HTML with manifest link', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><head><link rel="manifest" href="/manifest.json"></head><body></body></html>',
      )

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.errors.filter((e) => e.code === 'META_MANIFEST_MISSING').length).toBe(0)
    })

    it('should warn about missing theme-color meta tag', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><head><title>Test</title></head><body></body></html>')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.warnings.some((w) => w.code === 'META_THEME_COLOR_MISSING')).toBe(true)
    })

    it('should validate HTML with theme-color meta tag', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><head><meta name="theme-color" content="#ffffff"></head><body></body></html>',
      )

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.warnings.filter((w) => w.code === 'META_THEME_COLOR_MISSING').length).toBe(0)
    })

    it('should warn about missing apple-mobile-web-app-capable', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><head><title>Test</title></head><body></body></html>')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.warnings.some((w) => w.code === 'META_APPLE_MOBILE_MISSING')).toBe(true)
    })

    it('should validate HTML with apple-mobile-web-app-capable', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><head><meta name="apple-mobile-web-app-capable" content="yes"></head><body></body></html>',
      )

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.warnings.filter((w) => w.code === 'META_APPLE_MOBILE_MISSING').length).toBe(0)
    })

    it('should warn about missing service worker registration', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), 'console.log("sw");')
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><head><title>Test</title></head><body></body></html>')

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.warnings.some((w) => w.code === 'META_SERVICE_WORKER_REGISTRATION_MISSING')).toBe(true)
    })

    it('should validate HTML with service worker registration', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), 'console.log("sw");')
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><head><title>Test</title></head><body><script>navigator.serviceWorker.register("/sw.js");</script></body></html>',
      )

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.warnings.filter((w) => w.code === 'META_SERVICE_WORKER_REGISTRATION_MISSING').length).toBe(0)
    })

    it('should handle missing HTML files gracefully', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.warnings.some((w) => w.code === 'HTML_FILES_MISSING')).toBe(true)
    })

    it('should validate all HTML files by default', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      // Create 15 HTML files
      for (let i = 0; i < 15; i++) {
        writeFileSync(join(TEST_DIR, `index-${i}.html`), '<html><head><title>Test</title></head><body></body></html>')
      }

      const htmlFiles = Array.from({ length: 15 }, (_, i) => join(TEST_DIR, `index-${i}.html`))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles,
      })

      // Should validate all 15 files
      const metaErrors = result.errors.filter((e) => e.code.startsWith('META_'))
      expect(metaErrors.length).toBeGreaterThanOrEqual(15 * 3) // At least 3 errors per file (manifest, theme-color, apple-mobile)
    })

    it('should limit HTML validation when maxHtmlFiles is set', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      // Create 15 HTML files
      for (let i = 0; i < 15; i++) {
        writeFileSync(join(TEST_DIR, `index-${i}.html`), '<html><head><title>Test</title></head><body></body></html>')
      }

      const htmlFiles = Array.from({ length: 15 }, (_, i) => join(TEST_DIR, `index-${i}.html`))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles,
        maxHtmlFiles: 5,
      })

      // Should only validate first 5 files
      const metaErrors = result.errors.filter((e) => e.code.startsWith('META_'))
      expect(metaErrors.length).toBeLessThanOrEqual(5 * 3) // Max 3 errors per file
    })
  })

  describe('validatePWA - HTTPS validation', () => {
    it('should warn about HTTPS not verified', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.https.isSecure).toBe(false)
      expect(result.warnings.some((w) => w.code === 'HTTPS_NOT_VERIFIED')).toBe(true)
    })
  })

  describe('validatePWA - Score calculation', () => {
    it('should return score 0 for completely invalid PWA', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThan(50) // Should be low score
    })

    it('should return high score for valid PWA', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#000000',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))
      writeFileSync(join(TEST_DIR, 'public', 'icon-192x192.png'), 'dummy')
      writeFileSync(join(TEST_DIR, 'public', 'icon-512x512.png'), 'dummy')
      writeFileSync(
        join(TEST_DIR, 'public', 'sw.js'),
        'importScripts("workbox-sw.js"); workbox.precaching.precacheAndRoute([]);',
      )
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><head><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#ffffff"><meta name="apple-mobile-web-app-capable" content="yes"><script>navigator.serviceWorker.register("/sw.js");</script></head><body></body></html>',
      )

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.score).toBeGreaterThan(70) // Should be high score
      expect(result.isValid).toBe(true)
    })

    it('should penalize missing manifest', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.manifest.exists).toBe(false)
      expect(result.score).toBeLessThan(80) // Should be penalized
    })

    it('should penalize missing icons', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.icons.exists).toBe(false)
      expect(result.score).toBeLessThan(80) // Should be penalized
    })

    it('should penalize missing service worker', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.details.serviceWorker.exists).toBe(false)
      expect(result.score).toBeLessThan(80) // Should be penalized
    })
  })

  describe('validatePWA - Suggestions', () => {
    it('should suggest generating manifest when missing', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.suggestions.some((s) => s.includes('manifest.json'))).toBe(true)
    })

    it('should suggest generating icons when missing', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.suggestions.some((s) => s.includes('icon'))).toBe(true)
    })

    it('should suggest generating service worker when missing', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
      })

      expect(result.suggestions.some((s) => s.includes('service worker'))).toBe(true)
    })
  })

  describe('validatePWA - Strict mode', () => {
    it('should treat warnings as errors in strict mode', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '192x192' }],
        // Missing theme_color and background_color (warnings)
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [],
        strict: true,
      })

      // In strict mode, warnings should make isValid false
      expect(result.warnings.length).toBeGreaterThan(0)
      // isValid should be false if there are warnings in strict mode
      expect(result.isValid).toBe(false)
    })
  })

  describe('validatePWA - Complete validation', () => {
    it('should validate complete PWA setup', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      // Create valid manifest
      const manifest = {
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#000000',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      }
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify(manifest))

      // Create icon files
      writeFileSync(join(TEST_DIR, 'public', 'icon-192x192.png'), 'dummy')
      writeFileSync(join(TEST_DIR, 'public', 'icon-512x512.png'), 'dummy')

      // Create service worker
      writeFileSync(
        join(TEST_DIR, 'public', 'sw.js'),
        'importScripts("workbox-sw.js"); workbox.precaching.precacheAndRoute([]);',
      )

      // Create HTML with all meta tags
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><head><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#ffffff"><meta name="apple-mobile-web-app-capable" content="yes"><script>navigator.serviceWorker.register("/sw.js");</script></head><body></body></html>',
      )

      const result = await validatePWA({
        projectPath: TEST_DIR,
        outputDir: 'public',
        htmlFiles: [join(TEST_DIR, 'index.html')],
      })

      expect(result.isValid).toBe(true)
      expect(result.details.manifest.valid).toBe(true)
      expect(result.details.icons.valid).toBe(true)
      expect(result.details.icons.has192x192).toBe(true)
      expect(result.details.icons.has512x512).toBe(true)
      expect(result.details.serviceWorker.valid).toBe(true)
      expect(result.details.metaTags.valid).toBe(true)
      expect(result.score).toBeGreaterThan(80)
    })
  })
})

