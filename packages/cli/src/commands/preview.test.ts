import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { previewCommand } from './preview'

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
})

