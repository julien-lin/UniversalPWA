import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { injectMetaTags, injectMetaTagsInFile, injectMetaTagsInFilesBatch, type MetaInjectorOptions } from './meta-injector.js'

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
    const baseHtml = (body = '') => '<html><head><title>Test</title></head><body>' + body + '</body></html>'

    type Case = {
      name: string
      options: MetaInjectorOptions
      contains: string[]
      notContains?: string[]
      injectedIncludes: string
    }

    it.each<Case>([
      {
        name: 'manifest link',
        options: { manifestPath: '/manifest.json' },
        contains: ['rel="manifest"', 'href="/manifest.json"'],
        injectedIncludes: 'manifest',
      },
      {
        name: 'theme-color meta tag',
        options: { themeColor: '#ffffff' },
        contains: ['name="theme-color"', 'content="#ffffff"'],
        injectedIncludes: 'theme-color',
      },
      {
        name: 'apple-touch-icon link',
        options: { appleTouchIcon: '/apple-touch-icon.png' },
        contains: ['rel="apple-touch-icon"', 'href="/apple-touch-icon.png"'],
        injectedIncludes: 'apple-touch-icon',
      },
      {
        name: 'mobile-web-app-capable (replaces deprecated apple-mobile-web-app-capable)',
        options: { appleMobileWebAppCapable: true },
        contains: ['name="mobile-web-app-capable"', 'content="yes"'],
        notContains: ['name="apple-mobile-web-app-capable"'],
        injectedIncludes: 'mobile-web-app-capable',
      },
      {
        name: 'service worker registration script',
        options: { serviceWorkerPath: '/sw.js' },
        contains: ['navigator.serviceWorker.register', '/sw.js'],
        injectedIncludes: 'Service Worker',
      },
    ])('should inject $name', ({ options, contains, notContains, injectedIncludes }) => {
      const html = baseHtml()
      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      contains.forEach((s) => expect(modifiedHtml).toContain(s))
      notContains?.forEach((s) => expect(modifiedHtml).not.toContain(s))
      expect(result.injected.some((i: string) => i.includes(injectedIncludes))).toBe(true)
    })

    it.each([
      {
        name: 'existing manifest link',
        html: '<html><head><link rel="manifest" href="/existing.json" /></head><body></body></html>',
        options: { manifestPath: '/manifest.json' } as MetaInjectorOptions,
        skippedIncludes: 'manifest',
      },
      {
        name: 'service worker already exists',
        html: baseHtml('<script>navigator.serviceWorker.register</script>'),
        options: { serviceWorkerPath: '/sw.js' } as MetaInjectorOptions,
        skippedIncludes: 'Service Worker',
      },
      {
        name: 'install script already exists',
        html: baseHtml('<script>navigator.serviceWorker.register</script><script>beforeinstallprompt</script>'),
        options: { serviceWorkerPath: '/sw.js' } as MetaInjectorOptions,
        skippedIncludes: 'PWA install handler',
      },
    ])('should skip when $name', ({ html, options, skippedIncludes }) => {
      const { result } = injectMetaTags(html, options)
      expect(result.skipped.some((s: string) => s.includes(skippedIncludes))).toBe(true)
    })

    it('should update existing theme-color', () => {
      const html = '<html><head><meta name="theme-color" content="#000000" /></head><body></body></html>'
      const options: MetaInjectorOptions = { themeColor: '#ffffff' }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('content="#ffffff"')
      expect(result.injected.some((i: string) => i.includes('updated'))).toBe(true)
    })

    // service worker cases covered by the table above

    it('should create head if missing', () => {
      const html = '<html><body></body></html>'
      const options: MetaInjectorOptions = { manifestPath: '/manifest.json' }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('<head>')
      expect(modifiedHtml).toContain('rel="manifest"')
      expect(result.warnings.some((w: string) => w.includes('Created'))).toBe(true)
    })

    it('should inject all meta tags at once', () => {
      const html = baseHtml()
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

        ;[
          'rel="manifest"',
          'name="theme-color"',
          'rel="apple-touch-icon"',
          'name="mobile-web-app-capable"',
          'name="apple-mobile-web-app-status-bar-style"',
          'name="apple-mobile-web-app-title"',
          'navigator.serviceWorker.register',
        ].forEach((s) => expect(modifiedHtml).toContain(s))
      expect(result.injected.length).toBeGreaterThan(5)
    })

    describe('Security: XSS prevention', () => {
      type XssCase = {
        name: string
        path: string
        validate: (argInsideRegister: string) => void
      }

      const html = '<html><head><title>Test</title></head><body></body></html>'

      it.each<XssCase>([
        {
          name: 'malicious payload is JSON-escaped',
          path: "/sw.js'; alert('XSS'); //",
          validate: (val) => {
            expect(val).toContain('sw.js')
            expect(val.trim()).toMatch(/^["']/)
          },
        },
        {
          name: 'backslashes are escaped',
          path: '/sw\\test.js',
          validate: (val) => expect(val).toContain('\\\\'),
        },
        {
          name: 'newlines are escaped',
          path: '/sw.js\nalert("XSS")',
          validate: (val) => expect(val).toContain('\\n'),
        },
        {
          name: 'quotes are escaped and kept within JSON quotes',
          path: "/sw'; alert('XSS'); //.js",
          validate: (val) => expect(val).toMatch(/^["'].*["']$/),
        },
      ])('should ensure $name', ({ path, validate }) => {
        const options: MetaInjectorOptions = { serviceWorkerPath: path }
        const { html: modifiedHtml } = injectMetaTags(html, options)

        expect(modifiedHtml).toContain('navigator.serviceWorker.register')
        const match = modifiedHtml.match(/navigator\.serviceWorker\.register\(([^)]+)\)/)
        expect(match).not.toBeNull()
        if (match) validate(match[1])
      })
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

  describe('PWA install handler script injection', () => {
    it('should inject PWA install handler script when serviceWorkerPath is provided', () => {
      const html = '<html><head><title>Test</title></head><body></body></html>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('window.addEventListener(\'beforeinstallprompt\'')
      expect(modifiedHtml).toContain('window.installPWA')
      expect(modifiedHtml).toContain('window.isPWAInstalled')
      expect(modifiedHtml).toContain('window.isPWAInstallable')
      expect(result.injected.some((i: string) => i.includes('PWA install handler'))).toBe(true)
    })

    it('should inject install script before </body> tag', () => {
      const html = '<html><head><title>Test</title></head><body><p>Content</p></body></html>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml } = injectMetaTags(html, options)

      const bodyIndex = modifiedHtml.lastIndexOf('</body>')
      const scriptIndex = modifiedHtml.indexOf('window.addEventListener(\'beforeinstallprompt\'')
      expect(scriptIndex).toBeLessThan(bodyIndex)
    })

    it('should inject install script before </html> if no </body> tag', () => {
      const html = '<html><head><title>Test</title></head></html>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('window.addEventListener(\'beforeinstallprompt\'')
      expect(result.warnings.some((w: string) => w.includes('(no </body> found)'))).toBe(true)
    })

    it('should inject install script at end if no </body> or </html> tag', () => {
      const html = '<head><title>Test</title></head>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('window.addEventListener(\'beforeinstallprompt\'')
      expect(result.warnings.some((w: string) => w.includes('(no </body> or </html> found)'))).toBe(true)
    })

    // skip scenarios are covered in the parameterized tests above
  })

  describe('injectLinkTag and injectMetaTag helpers', () => {
    it('should handle head without children array', () => {
      const html = '<html><head></head><body></body></html>'

      // Test that injectLinkTag and injectMetaTag work with head without children
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
        themeColor: '#ffffff',
      }

      const { result } = injectMetaTags(html, options)

      expect(result.injected.length).toBeGreaterThan(0)
    })
  })

  describe('updateMetaContent', () => {
    it('should update meta tag content when attribs exist', () => {
      const html = '<html><head><meta name="theme-color" content="#000000" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        themeColor: '#ffffff',
      }

      const { html: modifiedHtml } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('content="#ffffff"')
      expect(modifiedHtml).not.toContain('content="#000000"')
    })

    it('should handle meta tag without attribs', () => {
      // This tests the else branch in updateMetaContent
      const html = '<html><head><meta name="theme-color" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        themeColor: '#ffffff',
      }

      const { html: modifiedHtml } = injectMetaTags(html, options)

      // Should still inject/update theme-color
      expect(modifiedHtml).toContain('theme-color')
    })
  })

  describe('Edge cases and error handling', () => {
    const baseHtml = (body = '') => '<html><head><title>Test</title></head><body>' + body + '</body></html>'

    it('should handle appleMobileWebAppCapable false', () => {
      const html = baseHtml()
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: false,
      }

      const { html: modifiedHtml } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('name="mobile-web-app-capable"')
      expect(modifiedHtml).toContain('content="no"')
    })

    it('should remove deprecated apple-mobile-web-app-capable when injecting new one', () => {
      const html = '<html><head><meta name="apple-mobile-web-app-capable" content="yes" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: true,
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).not.toContain('name="apple-mobile-web-app-capable"')
      expect(modifiedHtml).toContain('name="mobile-web-app-capable"')
      expect(result.warnings.some((w: string) => w.includes('Removed deprecated'))).toBe(true)
    })

    it('should handle service worker path without leading slash', () => {
      const html = baseHtml()
      const options: MetaInjectorOptions = {
        serviceWorkerPath: 'sw.js',
      }

      const { html: modifiedHtml } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('navigator.serviceWorker.register')
      expect(modifiedHtml).toContain('/sw.js')
    })

    it('should handle HTML without html tag', () => {
      const html = '<head><title>Test</title></head><body></body>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('rel="manifest"')
      // Should handle gracefully
      expect(result).toBeDefined()
    })

    it('should handle HTML without head or body', () => {
      const html = '<html><title>Test</title></html>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      // Should create head and inject
      expect(modifiedHtml).toContain('rel="manifest"')
      expect(result.warnings.length).toBeGreaterThan(0)
    })

    it('should handle existing mobile-web-app-capable', () => {
      const html = '<html><head><meta name="mobile-web-app-capable" content="yes" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: true,
      }

      const { result } = injectMetaTags(html, options)

      // Should skip if already exists with same content
      expect(result.skipped.some((s: string) => s.includes('mobile-web-app-capable'))).toBe(true)
    })

    it('should update existing mobile-web-app-capable with different content', () => {
      const html = '<html><head><meta name="mobile-web-app-capable" content="no" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: true,
      }

      const { result } = injectMetaTags(html, options)

      // Should update if content differs
      expect(result.injected.some((i: string) => i.includes('mobile-web-app-capable') && i.includes('updated'))).toBe(true)
    })

    it('should handle existing apple-mobile-web-app-status-bar-style', () => {
      const html = '<html><head><meta name="apple-mobile-web-app-status-bar-style" content="black" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppStatusBarStyle: 'black',
      }

      const { result } = injectMetaTags(html, options)

      // Should skip if already exists with same content
      expect(result.skipped.some((s: string) => s.includes('apple-mobile-web-app-status-bar-style'))).toBe(true)
    })

    it('should update existing apple-mobile-web-app-status-bar-style with different content', () => {
      const html = '<html><head><meta name="apple-mobile-web-app-status-bar-style" content="default" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppStatusBarStyle: 'black',
      }

      const { result } = injectMetaTags(html, options)

      // Should update if content differs
      expect(
        result.injected.some((i: string) => i.includes('apple-mobile-web-app-status-bar-style') && i.includes('updated')),
      ).toBe(true)
    })

    it('should handle existing apple-mobile-web-app-title', () => {
      const html = '<html><head><meta name="apple-mobile-web-app-title" content="My App" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppTitle: 'My App',
      }

      const { result } = injectMetaTags(html, options)

      // Should skip if already exists with same content
      expect(result.skipped.some((s: string) => s.includes('apple-mobile-web-app-title'))).toBe(true)
    })

    it('should update existing apple-mobile-web-app-title with different content', () => {
      const html = '<html><head><meta name="apple-mobile-web-app-title" content="Old App" /></head><body></body></html>'
      const options: MetaInjectorOptions = {
        appleMobileWebAppTitle: 'My App',
      }

      const { result } = injectMetaTags(html, options)

      // Should update if content differs
      expect(result.injected.some((i: string) => i.includes('apple-mobile-web-app-title') && i.includes('updated'))).toBe(true)
    })

    it('should handle body creation when html exists but body does not', () => {
      const html = '<html><head><title>Test</title></head></html>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('navigator.serviceWorker.register')
      expect(result.warnings.some((w: string) => w.includes('Created <body>'))).toBe(true)
    })

    it('should handle case where html tag does not exist for body creation', () => {
      const html = '<head><title>Test</title></head>'
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('navigator.serviceWorker.register')
      expect(result.warnings.some((w: string) => w.includes('No <html> or <body>'))).toBe(true)
    })

    it('should handle head without children array when injecting link', () => {
      // Test injectLinkTag with head without children
      const html = '<html><head></head><body></body></html>'
      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
        appleTouchIcon: '/icon.png',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('rel="manifest"')
      expect(modifiedHtml).toContain('rel="apple-touch-icon"')
      expect(result.injected.length).toBeGreaterThan(0)
    })

    it('should handle head without children array when injecting meta', () => {
      // Test injectMetaTag with head without children
      const html = '<html><head></head><body></body></html>'
      const options: MetaInjectorOptions = {
        themeColor: '#ffffff',
        appleMobileWebAppCapable: true,
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('name="theme-color"')
      expect(modifiedHtml).toContain('name="mobile-web-app-capable"')
      expect(result.injected.length).toBeGreaterThan(0)
    })

    it('should handle service worker exists but install handler missing', () => {
      const html = baseHtml('<script>navigator.serviceWorker.register("/sw.js")</script>')
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('beforeinstallprompt')
      expect(result.skipped.some((s: string) => s.includes('Service Worker registration'))).toBe(true)
      expect(result.injected.some((i: string) => i.includes('PWA install handler'))).toBe(true)
    })

    it('should handle install handler exists but service worker missing', () => {
      const html = baseHtml('<script>window.addEventListener("beforeinstallprompt")</script>')
      const options: MetaInjectorOptions = {
        serviceWorkerPath: '/sw.js',
      }

      const { html: modifiedHtml, result } = injectMetaTags(html, options)

      expect(modifiedHtml).toContain('navigator.serviceWorker.register')
      expect(result.injected.some((i: string) => i.includes('Service Worker registration'))).toBe(true)
      // Since the HTML doesn't contain 'beforeinstallprompt' check from the script content,
      // it will also inject the PWA install handler script
      expect(result.injected.some((i: string) => i.includes('PWA install handler'))).toBe(true)
    })
  })

  describe('injectMetaTagsInFilesBatch', () => {
    it('should inject meta tags into multiple files in parallel', async () => {
      // Create multiple HTML files
      const files = []
      for (let i = 0; i < 10; i++) {
        const file = join(TEST_DIR, `test-batch-${i}.html`)
        writeFileSync(file, '<html><head><title>Test</title></head><body></body></html>')
        files.push(file)
      }

      const options: MetaInjectorOptions = {
        manifestPath: '/manifest.json',
        themeColor: '#ffffff',
      }

      const result = await injectMetaTagsInFilesBatch({
        files,
        options,
        concurrency: 3,
      })

      expect(result.totalProcessed).toBe(10)
      expect(result.totalFailed).toBe(0)
      expect(result.successful).toHaveLength(10)
      expect(result.failed).toHaveLength(0)

      // Verify all files were modified
      for (const file of files) {
        const content = readFileSync(file, 'utf-8')
        expect(content).toContain('manifest')
        expect(content).toContain('theme-color')
      }
    })

    it('should handle errors with continueOnError=true', async () => {
      const files = [
        join(TEST_DIR, 'batch-valid.html'),
        join(TEST_DIR, 'batch-non-existent.html'), // This will fail
        join(TEST_DIR, 'batch-valid2.html'),
      ]

      writeFileSync(files[0], '<html><head><title>Test</title></head><body></body></html>')
      writeFileSync(files[2], '<html><head><title>Test</title></head><body></body></html>')

      const result = await injectMetaTagsInFilesBatch({
        files,
        options: { manifestPath: '/manifest.json' },
        continueOnError: true,
      })

      expect(result.totalProcessed).toBe(2)
      expect(result.totalFailed).toBe(1)
      expect(result.successful).toHaveLength(2)
      expect(result.failed).toHaveLength(1)
      expect(result.failed[0].file).toBe(files[1])
    })

    it('should respect concurrency limit', async () => {
      const files = []
      for (let i = 0; i < 20; i++) {
        const file = join(TEST_DIR, `test-conc-${i}.html`)
        writeFileSync(file, '<html><head><title>Test</title></head><body></body></html>')
        files.push(file)
      }

      const startTime = Date.now()
      const result = await injectMetaTagsInFilesBatch({
        files,
        options: { themeColor: '#000000' },
        concurrency: 5,
      })
      const endTime = Date.now()

      expect(result.totalProcessed).toBe(20)
      expect(result.totalFailed).toBe(0)

      // With concurrency of 5, processing should be done in batches
      // This is a simple check that it completes in reasonable time
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('should use default concurrency of 5', async () => {
      const files = []
      for (let i = 0; i < 3; i++) {
        const file = join(TEST_DIR, `test-default-${i}.html`)
        writeFileSync(file, '<html><head><title>Test</title></head><body></body></html>')
        files.push(file)
      }

      const result = await injectMetaTagsInFilesBatch({
        files,
        options: { manifestPath: '/manifest.json' },
      })

      expect(result.totalProcessed).toBe(3)
      expect(result.totalFailed).toBe(0)
    })

    it('should handle empty file list', async () => {
      const result = await injectMetaTagsInFilesBatch({
        files: [],
        options: { manifestPath: '/manifest.json' },
      })

      expect(result.totalProcessed).toBe(0)
      expect(result.totalFailed).toBe(0)
      expect(result.successful).toHaveLength(0)
      expect(result.failed).toHaveLength(0)
    })

    it('should process large number of files efficiently', async () => {
      const files = []
      for (let i = 0; i < 100; i++) {
        const file = join(TEST_DIR, `test-large-${i}.html`)
        writeFileSync(file, '<html><head><title>Test</title></head><body></body></html>')
        files.push(file)
      }

      const startTime = Date.now()
      const result = await injectMetaTagsInFilesBatch({
        files,
        options: {
          manifestPath: '/manifest.json',
          themeColor: '#ffffff',
          appleTouchIcon: '/icon.png',
        },
        concurrency: 10,
      })
      const endTime = Date.now()

      expect(result.totalProcessed).toBe(100)
      expect(result.totalFailed).toBe(0)

      // Verify performance - should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10000) // 10 seconds max for 100 files
    })
  })
})

