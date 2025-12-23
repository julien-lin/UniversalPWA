import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { injectMetaTags, injectMetaTagsInFile, type MetaInjectorOptions } from './meta-injector'

const TEST_DIR = join(process.cwd(), '.test-tmp-meta-injector')

describe('meta-injector', () => {
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

  describe('injectMetaTags', () => {
    it('should inject manifest link', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('rel="manifest"')
      expect(modifiedHtml).toContain('href="/manifest.json"')
      expect(result.injected.length).toBeGreaterThan(0)
      expect(result.injected.some((i) => i.includes('manifest'))).toBe(true)
    })

    it('should inject theme-color meta tag', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        themeColor: '#ffffff',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('name="theme-color"')
      expect(modifiedHtml).toContain('content="#ffffff"')
      expect(result.injected.some((i) => i.includes('theme-color'))).toBe(true)
    })

    it('should inject apple-touch-icon', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleTouchIcon: '/apple-touch-icon.png',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('rel="apple-touch-icon"')
      expect(modifiedHtml).toContain('href="/apple-touch-icon.png"')
      expect(result.injected.some((i) => i.includes('apple-touch-icon'))).toBe(true)
    })

    it('should inject apple-mobile-web-app-capable', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: true,
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('name="apple-mobile-web-app-capable"')
      expect(modifiedHtml).toContain('content="yes"')
      expect(result.injected.some((i) => i.includes('apple-mobile-web-app-capable'))).toBe(true)
    })

    it('should skip existing manifest link', () => {
      const html = '<html><head><link rel="manifest" href="/existing.json" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
      }

      const { result } = injectMetaTags(html, options)

      expect(result.skipped.some((s) => s.includes('manifest'))).toBe(true)
    })

    it('should update existing theme-color', () => {
      const html = '<html><head><meta name="theme-color" content="#000000" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        themeColor: '#ffffff',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('content="#ffffff"')
      expect(result.injected.some((i) => i.includes('updated'))).toBe(true)
    })

    it('should inject service worker registration script', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('navigator.serviceWorker.register')
      expect(modifiedHtml).toContain('/sw.js')
      expect(result.injected.some((i) => i.includes('Service Worker'))).toBe(true)
    })

    it('should skip service worker if already exists', () => {
      const html = '<html><head><title>Test</title></head><body><script>navigator.serviceWorker.register</script></body></html>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { result } = injectMetaTags(html, options)

      expect(result.skipped.some((s) => s.includes('Service Worker'))).toBe(true)
    })

    it('should create head if missing', () => {
      const html = '<html><body></body></html>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('<head>')
      expect(modifiedHtml).toContain('rel="manifest"')
      expect(result.warnings.some((w) => w.includes('Created'))).toBe(true)
    })

    it('should inject all meta tags at once', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
        themeColor: '#ffffff',
        appleTouchIcon: '/apple-touch-icon.png',
        appleMobileWebAppCapable: true,
        appleMobileWebAppStatusBarStyle: 'black',
        appleMobileWebAppTitle: 'My App',
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('rel="manifest"')
      expect(modifiedHtml).toContain('name="theme-color"')
      expect(modifiedHtml).toContain('rel="apple-touch-icon"')
      expect(modifiedHtml).toContain('name="apple-mobile-web-app-capable"')
      expect(modifiedHtml).toContain('name="apple-mobile-web-app-status-bar-style"')
      expect(modifiedHtml).toContain('name="apple-mobile-web-app-title"')
      expect(modifiedHtml).toContain('navigator.serviceWorker.register')
      expect(result.injected.length).toBeGreaterThan(5)
    })
  })

  describe('injectMetaTagsInFile', () => {
    it('should inject meta tags in file', () => {
      const htmlPath = join(TEST_DIR, 'test.html')
      const html = '<html><head><title>Test</title></head><body></body></html>'
      writeFileSync(htmlPath, html)

      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
        themeColor: '#ffffff',
      }

      const result = injectMetaTagsInFile(htmlPath, options)

      expect(result.injected.length).toBeGreaterThan(0)
      const modifiedContent = readFileSync(htmlPath, 'utf-8')
      expect(modifiedContent).toContain('rel="manifest"')
      expect(modifiedContent).toContain('name="theme-color"')
    })
  })
})

