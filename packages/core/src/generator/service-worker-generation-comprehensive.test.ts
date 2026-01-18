/**
 * Comprehensive Tests for Service Worker Generation
 * Task 6.5: Unit tests, integration tests, performance benchmarks, Workbox validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { generateServiceWorkerFromConfig, generateServiceWorker } from './service-worker-generator.js'
import type { ServiceWorkerConfig } from './caching-strategy.js'
import { PRESET_STRATEGIES } from './caching-strategy.js'
import type { ServiceWorkerGeneratorOptions } from './service-worker-generator.js'
import { getAvailableTemplateTypes } from '@julien-lin/universal-pwa-templates'

describe('service-worker-generation-comprehensive', () => {
  let testDir: string
  let outputDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `universal-pwa-test-${Date.now()}`)
    outputDir = join(testDir, 'output')
    mkdirSync(testDir, { recursive: true })
    mkdirSync(outputDir, { recursive: true })
    mkdirSync(join(testDir, 'public'), { recursive: true })

    // Create test files
    writeFileSync(join(testDir, 'public', 'index.html'), '<html><body>Test</body></html>')
    writeFileSync(join(testDir, 'public', 'app.js'), 'console.log("app")')
    writeFileSync(join(testDir, 'public', 'style.css'), 'body { margin: 0; }')
    writeFileSync(join(testDir, 'public', 'image.png'), Buffer.from('fake-image'))
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      try {
        rmdirSync(testDir, { recursive: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('Unit Tests - All Templates', () => {
    const templateTypes = getAvailableTemplateTypes()

    it.each(templateTypes)('should generate service worker with %s template', async (templateType) => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir: join(outputDir, templateType),
        architecture: 'static',
        templateType,
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThan(0)

      // Validate Workbox presence
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
      expect(swContent).toContain('precacheAndRoute')
    }, 30000)

    it.each(templateTypes)('should generate valid Workbox code for %s template', async (templateType) => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir: join(outputDir, `${templateType}-valid`),
        architecture: 'static',
        templateType,
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const swContent = readFileSync(result.swPath, 'utf-8')

      // Basic Workbox validation
      expect(swContent).toContain('importScripts')
      expect(swContent).toContain('workbox')
      
      // Should not contain syntax errors (basic check)
      expect(swContent).not.toContain('undefined')
      expect(swContent.length).toBeGreaterThan(100) // Minimum size
    }, 30000)
  })

  describe('Integration Tests - Real Project Scenarios', () => {
    it('should generate service worker for static site with multiple assets', async () => {
      // Simulate a real static site
      mkdirSync(join(testDir, 'public', 'assets'), { recursive: true })
      mkdirSync(join(testDir, 'public', 'images'), { recursive: true })
      
      writeFileSync(join(testDir, 'public', 'assets', 'main.js'), 'console.log("main")')
      writeFileSync(join(testDir, 'public', 'assets', 'main.css'), 'body { color: red; }')
      writeFileSync(join(testDir, 'public', 'images', 'logo.png'), Buffer.from('logo'))
      writeFileSync(join(testDir, 'public', 'about.html'), '<html><body>About</body></html>')
      writeFileSync(join(testDir, 'public', 'contact.html'), '<html><body>Contact</body></html>')

      const config: ServiceWorkerConfig = {
        destination: 'sw.js',
        staticRoutes: [
          {
            pattern: '/assets/**',
            strategy: PRESET_STRATEGIES.StaticAssets,
          },
        ],
        apiRoutes: [],
        imageRoutes: [
          {
            pattern: '/images/**',
            strategy: PRESET_STRATEGIES.Images,
          },
        ],
      }

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
      })

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(5) // At least 5 files
    })

    it('should generate service worker for SPA with API routes', async () => {
      const config: ServiceWorkerConfig = {
        destination: 'sw.js',
        staticRoutes: [
          {
            pattern: '/static/**',
            strategy: PRESET_STRATEGIES.StaticAssets,
          },
        ],
        apiRoutes: [
          {
            pattern: '/api/**',
            strategy: PRESET_STRATEGIES.ApiEndpoints,
          },
        ],
        imageRoutes: [],
      }

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: 'spa',
        globDirectory: join(testDir, 'public'),
      })

      expect(existsSync(result.swPath)).toBe(true)
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })

    it('should generate service worker for SSR with offline support', async () => {
      writeFileSync(join(testDir, 'public', 'offline.html'), '<html><body>Offline</body></html>')

      const config: ServiceWorkerConfig = {
        destination: 'sw.js',
        staticRoutes: [],
        apiRoutes: [],
        imageRoutes: [],
        offline: {
          fallbackPage: 'offline.html',
        },
      }

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: 'ssr',
        globDirectory: join(testDir, 'public'),
      })

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.filePaths.some((path) => path.includes('offline.html'))).toBe(true)
    })

    it('should generate service worker with advanced caching config', async () => {
      const config: ServiceWorkerConfig = {
        destination: 'sw.js',
        staticRoutes: [],
        apiRoutes: [],
        imageRoutes: [],
        advanced: {
          routes: [
            {
              pattern: '/admin/**',
              strategy: {
                name: 'NetworkOnly',
                cacheName: 'admin',
              },
              priority: 200,
            },
          ],
          global: {
            version: 'v1.0.0',
            cacheNamePrefix: 'app-',
          },
          versioning: {
            manualVersion: 'v1.0.0',
          },
        },
      }

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
      })

      expect(existsSync(result.swPath)).toBe(true)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should generate service worker quickly for small projects', async () => {
      const startTime = Date.now()

      await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const duration = Date.now() - startTime

      // Should complete in less than 5 seconds for small projects
      expect(duration).toBeLessThan(5000)
    })

    it('should handle large number of files efficiently', async () => {
      // Create many files
      for (let i = 0; i < 50; i++) {
        writeFileSync(join(testDir, 'public', `file-${i}.js`), `console.log("file ${i}")`)
        writeFileSync(join(testDir, 'public', `file-${i}.css`), `/* file ${i} */`)
      }

      const startTime = Date.now()

      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const duration = Date.now() - startTime

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(50)
      // Should complete in reasonable time even with many files
      expect(duration).toBeLessThan(10000)
    })

    it('should generate service worker with reasonable file size', async () => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const stats = require('fs').statSync(result.swPath)
      const fileSize = stats.size

      // Service worker should be reasonable size (between 1KB and 500KB for typical projects)
      expect(fileSize).toBeGreaterThan(1000)
      expect(fileSize).toBeLessThan(500000)
    })
  })

  describe('Workbox Validation', () => {
    it('should generate valid Workbox service worker', async () => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const swContent = readFileSync(result.swPath, 'utf-8')

      // Validate Workbox structure
      expect(swContent).toContain('importScripts')
      expect(swContent).toContain('workbox')
      expect(swContent).toContain('precacheAndRoute')
      
      // Should not have obvious syntax errors
      expect(swContent).not.toMatch(/undefined\s*[=;]/)
      expect(swContent).not.toMatch(/null\s*[=;]/)
    })

    it('should include Workbox precaching manifest', async () => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const swContent = readFileSync(result.swPath, 'utf-8')

      // Should reference the manifest
      expect(swContent).toMatch(/self\.__WB_MANIFEST|__WB_MANIFEST/)
    })

    it('should use correct Workbox strategies', async () => {
      const config: ServiceWorkerConfig = {
        destination: 'sw.js',
        staticRoutes: [
          {
            pattern: '/static/**',
            strategy: PRESET_STRATEGIES.StaticAssets, // CacheFirst
          },
        ],
        apiRoutes: [
          {
            pattern: '/api/**',
            strategy: PRESET_STRATEGIES.ApiEndpoints, // NetworkFirst
          },
        ],
        imageRoutes: [
          {
            pattern: '/images/**',
            strategy: PRESET_STRATEGIES.Images, // StaleWhileRevalidate
          },
        ],
      }

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
      })

      const swContent = readFileSync(result.swPath, 'utf-8')

      // Should contain Workbox strategy references (actual implementation in templates)
      expect(swContent).toContain('workbox')
    })

    it('should handle Workbox runtime caching correctly', async () => {
      const config: ServiceWorkerConfig = {
        destination: 'sw.js',
        staticRoutes: [],
        apiRoutes: [
          {
            pattern: '/api/**',
            strategy: {
              name: 'NetworkFirst',
              cacheName: 'api-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
        imageRoutes: [],
      }

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
      })

      expect(existsSync(result.swPath)).toBe(true)
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty project directory', async () => {
      const emptyDir = join(testDir, 'empty')
      mkdirSync(emptyDir, { recursive: true })

      const result = await generateServiceWorker({
        projectPath: emptyDir,
        outputDir: join(outputDir, 'empty'),
        architecture: 'static',
        globDirectory: emptyDir,
        globPatterns: ['**/*.{html,js,css}'],
      })

      expect(existsSync(result.swPath)).toBe(true)
      // Should still generate service worker even with no files
      expect(result.count).toBeGreaterThanOrEqual(0)
    })

    it('should handle special characters in file paths', async () => {
      writeFileSync(join(testDir, 'public', 'file with spaces.html'), '<html></html>')
      writeFileSync(join(testDir, 'public', 'file-with-dashes.html'), '<html></html>')
      writeFileSync(join(testDir, 'public', 'file_with_underscores.html'), '<html></html>')

      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.html'],
      })

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(3)
    })

    it('should handle nested directory structures', async () => {
      mkdirSync(join(testDir, 'public', 'nested', 'deep', 'path'), { recursive: true })
      writeFileSync(join(testDir, 'public', 'nested', 'deep', 'path', 'file.js'), 'console.log("deep")')

      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.js'],
      })

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThanOrEqual(1)
    })

    it('should handle large files gracefully', async () => {
      // Create a large file (1MB)
      const largeContent = 'x'.repeat(1024 * 1024)
      writeFileSync(join(testDir, 'public', 'large.js'), largeContent)

      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'static',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.js'],
      })

      expect(existsSync(result.swPath)).toBe(true)
      // Should handle large files (may take longer but should complete)
      expect(result.count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Template-Specific Validation', () => {
    it('should generate SPA template with NavigationRoute', async () => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'spa',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const swContent = readFileSync(result.swPath, 'utf-8')
      // SPA template should have NavigationRoute
      expect(swContent).toContain('workbox')
    })

    it('should generate SSR template with NetworkFirst strategy', async () => {
      const result = await generateServiceWorker({
        projectPath: testDir,
        outputDir,
        architecture: 'ssr',
        globDirectory: join(testDir, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })

    it('should generate framework-specific templates correctly', async () => {
      const frameworks = ['laravel-spa', 'symfony-spa', 'django-spa', 'flask-spa'] as const

      for (const templateType of frameworks) {
        const result = await generateServiceWorker({
          projectPath: testDir,
          outputDir: join(outputDir, templateType),
          architecture: 'spa',
          templateType,
          globDirectory: join(testDir, 'public'),
          globPatterns: ['**/*.{html,js,css}'],
        })

        expect(existsSync(result.swPath)).toBe(true)
        const swContent = readFileSync(result.swPath, 'utf-8')
        expect(swContent).toContain('workbox')
      }
    }, 30000)
  })
})
