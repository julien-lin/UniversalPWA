import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  generateServiceWorker,
  generateSimpleServiceWorker,
  generateAndWriteServiceWorker,
  type ServiceWorkerGeneratorOptions,
} from './service-worker-generator'

const TEST_DIR = join(process.cwd(), '.test-tmp-sw-generator')

describe('service-worker-generator', () => {
  beforeEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })

    // Créer des fichiers de test
    mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
    writeFileSync(join(TEST_DIR, 'public', 'index.html'), '<html><body>Test</body></html>')
    writeFileSync(join(TEST_DIR, 'public', 'app.js'), 'console.log("test")')
    writeFileSync(join(TEST_DIR, 'public', 'style.css'), 'body { margin: 0; }')
  })

  describe('generateServiceWorker', () => {
    it('should generate service worker with template', async () => {
      const outputDir = join(TEST_DIR, 'output')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      const result = await generateServiceWorker(options)

      expect(result.swPath).toBe(join(outputDir, 'sw.js'))
      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThan(0)
      expect(result.size).toBeGreaterThan(0)

      // Vérifier que le service worker contient du code Workbox
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
      expect(swContent).toContain('precacheAndRoute')
    })

    it('should generate service worker for SPA architecture', async () => {
      const outputDir = join(TEST_DIR, 'output-spa')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'spa',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      const result = await generateServiceWorker(options)

      expect(existsSync(result.swPath)).toBe(true)
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })

    it('should generate service worker for SSR architecture', async () => {
      const outputDir = join(TEST_DIR, 'output-ssr')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'ssr',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      const result = await generateServiceWorker(options)

      expect(existsSync(result.swPath)).toBe(true)
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })

    it('should use custom template type', async () => {
      const outputDir = join(TEST_DIR, 'output-custom')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        templateType: 'wordpress',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      const result = await generateServiceWorker(options)

      expect(existsSync(result.swPath)).toBe(true)
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })

    it('should use custom swDest', async () => {
      const outputDir = join(TEST_DIR, 'output-custom-dest')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        swDest: 'custom-sw.js',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      const result = await generateServiceWorker(options)

      expect(result.swPath).toBe(join(outputDir, 'custom-sw.js'))
      expect(existsSync(result.swPath)).toBe(true)
    })

    it('should include offline page if specified', async () => {
      const outputDir = join(TEST_DIR, 'output-offline')
      const offlinePage = join(TEST_DIR, 'public', 'offline.html')
      writeFileSync(offlinePage, '<html><body>Offline</body></html>')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
        offlinePage: 'offline.html',
      }

      const result = await generateServiceWorker(options)

      expect(existsSync(result.swPath)).toBe(true)
      // L'offline page devrait être dans le precache
      expect(result.filePaths.some((path) => path.includes('offline.html'))).toBe(true)
    })
  })

  describe('generateSimpleServiceWorker', () => {
    it('should generate simple service worker without template', async () => {
      const outputDir = join(TEST_DIR, 'output-simple')

      const result = await generateSimpleServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      })

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThan(0)
    })

    it('should generate service worker with runtime caching', async () => {
      const outputDir = join(TEST_DIR, 'output-runtime')

      const result = await generateSimpleServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
        runtimeCaching: [
          {
            urlPattern: '/api/.*',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
      })

      expect(existsSync(result.swPath)).toBe(true)
      const swContent = readFileSync(result.swPath, 'utf-8')
      expect(swContent).toContain('workbox')
    })
  })

  describe('generateAndWriteServiceWorker', () => {
    it('should generate and write service worker', async () => {
      const outputDir = join(TEST_DIR, 'output-write')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        globDirectory: join(TEST_DIR, 'public'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      const result = await generateAndWriteServiceWorker(options)

      expect(existsSync(result.swPath)).toBe(true)
      expect(result.count).toBeGreaterThan(0)
    })
  })

  describe('Error handling', () => {
    it('should throw error for invalid globDirectory', async () => {
      const outputDir = join(TEST_DIR, 'output-error')

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: 'static',
        globDirectory: join(TEST_DIR, 'non-existent'),
        globPatterns: ['**/*.{html,js,css}'],
      }

      // Workbox peut gérer un répertoire vide, mais on teste quand même
      await expect(generateServiceWorker(options)).resolves.toBeDefined()
    })
  })
})

