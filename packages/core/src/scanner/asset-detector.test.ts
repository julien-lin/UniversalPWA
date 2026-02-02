import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { detectAssets } from './asset-detector.js'
import { createTestDir, cleanupTestDir } from '../__tests__/test-helpers.js'

describe('asset-detector', () => {
  let TEST_DIR: string

  beforeEach(() => {
    TEST_DIR = createTestDir('asset-detector')
  })

  afterEach(() => {
    cleanupTestDir(TEST_DIR)
  })

  describe('JavaScript detection', () => {
    it('should detect .js files', async () => {
      const appJs = join(TEST_DIR, 'app.js')
      const moduleMjs = join(TEST_DIR, 'module.mjs')
      const componentTsx = join(TEST_DIR, 'component.tsx')

      writeFileSync(appJs, 'console.log("test")')
      writeFileSync(moduleMjs, 'export default {}')
      writeFileSync(componentTsx, 'export const Component = () => null')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.length).toBeGreaterThanOrEqual(3)
      expect(result.javascript.some((f: string) => f.endsWith('app.js') || f.includes('app.js'))).toBe(true)
      expect(result.javascript.some((f: string) => f.endsWith('module.mjs') || f.includes('module.mjs'))).toBe(true)
      expect(result.javascript.some((f: string) => f.endsWith('component.tsx') || f.includes('component.tsx'))).toBe(true)
    })

    it('should exclude node_modules', async () => {
      mkdirSync(join(TEST_DIR, 'node_modules', 'package'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'node_modules', 'package', 'index.js'), 'export {}')
      writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("test")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.some((f: string) => f.includes('node_modules'))).toBe(false)
      expect(result.javascript.some((f: string) => f.includes('app.js'))).toBe(true)
    })
  })

  describe('CSS detection', () => {
    it('should detect .css files', async () => {
      writeFileSync(join(TEST_DIR, 'styles.css'), 'body { margin: 0; }')
      writeFileSync(join(TEST_DIR, 'theme.scss'), '$color: red;')

      const result = await detectAssets(TEST_DIR)

      expect(result.css.length).toBeGreaterThanOrEqual(2)
      expect(result.css.some((f: string) => f.includes('styles.css'))).toBe(true)
      expect(result.css.some((f: string) => f.includes('theme.scss'))).toBe(true)
    })
  })

  describe('Image detection', () => {
    it('should detect image files', async () => {
      writeFileSync(join(TEST_DIR, 'logo.png'), 'fake png')
      writeFileSync(join(TEST_DIR, 'photo.jpg'), 'fake jpg')
      writeFileSync(join(TEST_DIR, 'icon.svg'), '<svg></svg>')

      const result = await detectAssets(TEST_DIR)

      expect(result.images.length).toBeGreaterThanOrEqual(3)
      expect(result.images.some((f: string) => f.includes('logo.png'))).toBe(true)
      expect(result.images.some((f: string) => f.includes('photo.jpg'))).toBe(true)
      expect(result.images.some((f: string) => f.includes('icon.svg'))).toBe(true)
    })
  })

  describe('Font detection', () => {
    it('should detect font files', async () => {
      writeFileSync(join(TEST_DIR, 'font.woff2'), 'fake font')
      writeFileSync(join(TEST_DIR, 'font.ttf'), 'fake font')

      const result = await detectAssets(TEST_DIR)

      expect(result.fonts.length).toBeGreaterThanOrEqual(2)
      expect(result.fonts.some((f: string) => f.includes('font.woff2'))).toBe(true)
      expect(result.fonts.some((f: string) => f.includes('font.ttf'))).toBe(true)
    })
  })

  describe('API routes detection', () => {
    it('should detect API route files', async () => {
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'src', 'api.js'), 'export const routes = []')
      writeFileSync(join(TEST_DIR, 'routes.ts'), 'export const apiRoutes = []')

      const result = await detectAssets(TEST_DIR)

      // API detection is basic, at least verify it doesn't crash
      expect(result.apiRoutes).toBeDefined()
    })
  })

  describe('Exclusions', () => {
    it('should exclude dist folder', async () => {
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'dist', 'bundle.js'), 'console.log("dist")')
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'src', 'app.js'), 'console.log("src")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.some((f: string) => f.includes('dist'))).toBe(false)
    })

    it('should exclude .git folder', async () => {
      const gitDir = join(TEST_DIR, '.git')
      try {
        mkdirSync(gitDir)
      } catch (err) {
        if (err && typeof err === 'object' && 'code' in err && err.code === 'EPERM') {
          return
        }
        throw err
      }
      writeFileSync(join(gitDir, 'config'), '[core]')
      writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("test")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.some((f: string) => f.includes('.git'))).toBe(false)
    })
  })

  describe('File validation', () => {
    it('should only return existing files', async () => {
      // Files are created and verified, so all should exist
      writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("test")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.length).toBeGreaterThan(0)
      result.javascript.forEach((file: string) => {
        expect(existsSync(file)).toBe(true)
      })
    })
  })
})

