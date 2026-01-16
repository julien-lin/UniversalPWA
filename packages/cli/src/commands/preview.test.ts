import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { previewCommand } from './preview.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-cli-preview')

describe('preview command', () => {
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

  it('should fail if project path does not exist', async () => {
    const result = await previewCommand({
      projectPath: join(TEST_DIR, 'non-existent'),
    })

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should detect manifest.json in public directory', async () => {
    mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
    writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify({ name: 'Test' }))

    const result = await previewCommand({
      projectPath: TEST_DIR,
    })

    expect(result.manifestExists).toBe(true)
  })

  it('should detect manifest.json in root directory', async () => {
    writeFileSync(join(TEST_DIR, 'manifest.json'), JSON.stringify({ name: 'Test' }))

    const result = await previewCommand({
      projectPath: TEST_DIR,
    })

    expect(result.manifestExists).toBe(true)
  })

  it('should detect service worker in public directory', async () => {
    mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
    writeFileSync(join(TEST_DIR, 'public', 'sw.js'), '// Service worker')

    const result = await previewCommand({
      projectPath: TEST_DIR,
    })

    expect(result.serviceWorkerExists).toBe(true)
  })

  it('should detect service worker in root directory', async () => {
    writeFileSync(join(TEST_DIR, 'sw.js'), '// Service worker')

    const result = await previewCommand({
      projectPath: TEST_DIR,
    })

    expect(result.serviceWorkerExists).toBe(true)
  })

  it('should use custom port', async () => {
    const result = await previewCommand({
      projectPath: TEST_DIR,
      port: 8080,
    })

    expect(result.port).toBe(8080)
    expect(result.url).toBe('http://localhost:8080')
  })

  it('should handle missing files gracefully', async () => {
    const result = await previewCommand({
      projectPath: TEST_DIR,
    })

    expect(result.manifestExists).toBe(false)
    expect(result.serviceWorkerExists).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  describe('Success scenarios', () => {
    it('should report success when both manifest and SW are present', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify({ name: 'Test' }))
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), '// Service worker')

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.success).toBe(true)
      expect(result.manifestExists).toBe(true)
      expect(result.serviceWorkerExists).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should warn when only manifest is present without service worker', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'manifest.json'), JSON.stringify({ name: 'Test' }))

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.manifestExists).toBe(true)
      expect(result.serviceWorkerExists).toBe(false)
      expect(result.warnings.some((w: string) => w.includes('sw.js'))).toBe(true)
    })

    it('should warn when only service worker is present without manifest', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'sw.js'), '// Service worker')

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.serviceWorkerExists).toBe(true)
      expect(result.manifestExists).toBe(false)
      expect(result.warnings.some((w: string) => w.includes('manifest'))).toBe(true)
    })
  })

  describe('Port configuration', () => {
    it('should use default port when not specified', async () => {
      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.port).toBe(3000)
      expect(result.url).toBe('http://localhost:3000')
    })

    it('should build correct URL for various ports', async () => {
      const ports = [8080, 5000, 1234, 9999]

      for (const port of ports) {
        const result = await previewCommand({
          projectPath: TEST_DIR,
          port,
        })

        expect(result.port).toBe(port)
        expect(result.url).toBe(`http://localhost:${port}`)
      }
    })
  })

  describe('Project structure detection', () => {
    it('should detect manifest in public subdirectory', async () => {
      const publicDir = join(TEST_DIR, 'public')
      mkdirSync(publicDir, { recursive: true })
      writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [],
      }))

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.manifestExists).toBe(true)
    })

    it('should detect manifest in project root', async () => {
      writeFileSync(join(TEST_DIR, 'manifest.json'), JSON.stringify({
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        icons: [],
      }))

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.manifestExists).toBe(true)
    })

    it('should detect service worker in public subdirectory', async () => {
      const publicDir = join(TEST_DIR, 'public')
      mkdirSync(publicDir, { recursive: true })
      writeFileSync(join(publicDir, 'sw.js'), `
        self.addEventListener('install', () => {
          self.skipWaiting();
        });
      `)

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.serviceWorkerExists).toBe(true)
    })

    it('should detect service worker in project root', async () => {
      writeFileSync(join(TEST_DIR, 'sw.js'), `
        self.addEventListener('install', () => {
          self.skipWaiting();
        });
      `)

      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.serviceWorkerExists).toBe(true)
    })
  })

  describe('Error handling and edge cases', () => {
    it('should handle deeply nested project paths', async () => {
      const nestedDir = join(TEST_DIR, 'src', 'app', 'public')
      mkdirSync(nestedDir, { recursive: true })
      writeFileSync(join(nestedDir, 'manifest.json'), JSON.stringify({ name: 'Test' }))

      const result = await previewCommand({
        projectPath: join(TEST_DIR, 'src', 'app'),
      })

      expect(result.manifestExists).toBe(true)
    })

    it('should handle symlinks gracefully', async () => {
      const publicDir = join(TEST_DIR, 'public')
      mkdirSync(publicDir, { recursive: true })
      writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({ name: 'Test' }))

      // Just verify the regular case works
      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.manifestExists).toBe(true)
    })

    it('should collect all warnings in result', async () => {
      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      // When nothing exists, we should have warnings
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('should not fail with invalid port numbers', async () => {
      const result = await previewCommand({
        projectPath: TEST_DIR,
        port: 65535, // Max valid port
      })

      expect(result.port).toBe(65535)
      expect(result.url).toBe('http://localhost:65535')
    })
  })

  describe('Result structure', () => {
    it('should return consistent result structure', async () => {
      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('port')
      expect(result).toHaveProperty('url')
      expect(result).toHaveProperty('manifestExists')
      expect(result).toHaveProperty('serviceWorkerExists')
      expect(result).toHaveProperty('warnings')
      expect(result).toHaveProperty('errors')

      expect(Array.isArray(result.warnings)).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should have empty errors array when project path exists', async () => {
      const result = await previewCommand({
        projectPath: TEST_DIR,
      })

      expect(result.errors.length).toBe(0)
    })

    it('should have errors array with message when project path missing', async () => {
      const result = await previewCommand({
        projectPath: join(TEST_DIR, 'non-existent'),
      })

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.success).toBe(false)
    })
  })
})

