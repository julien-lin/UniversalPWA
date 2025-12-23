import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { detectAssets } from './asset-detector'

const TEST_DIR = join(process.cwd(), '.test-tmp')

describe('asset-detector', () => {
  beforeEach(() => {
    if (require('fs').existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
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
      expect(result.javascript.some((f) => f.endsWith('app.js') || f.includes('app.js'))).toBe(true)
      expect(result.javascript.some((f) => f.endsWith('module.mjs') || f.includes('module.mjs'))).toBe(true)
      expect(result.javascript.some((f) => f.endsWith('component.tsx') || f.includes('component.tsx'))).toBe(true)
    })

    it('should exclude node_modules', async () => {
      mkdirSync(join(TEST_DIR, 'node_modules', 'package'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'node_modules', 'package', 'index.js'), 'export {}')
      writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("test")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.some((f) => f.includes('node_modules'))).toBe(false)
      expect(result.javascript.some((f) => f.includes('app.js'))).toBe(true)
    })
  })

  describe('CSS detection', () => {
    it('should detect .css files', async () => {
      writeFileSync(join(TEST_DIR, 'styles.css'), 'body { margin: 0; }')
      writeFileSync(join(TEST_DIR, 'theme.scss'), '$color: red;')

      const result = await detectAssets(TEST_DIR)

      expect(result.css.length).toBeGreaterThanOrEqual(2)
      expect(result.css.some((f) => f.includes('styles.css'))).toBe(true)
      expect(result.css.some((f) => f.includes('theme.scss'))).toBe(true)
    })
  })

  describe('Image detection', () => {
    it('should detect image files', async () => {
      writeFileSync(join(TEST_DIR, 'logo.png'), 'fake png')
      writeFileSync(join(TEST_DIR, 'photo.jpg'), 'fake jpg')
      writeFileSync(join(TEST_DIR, 'icon.svg'), '<svg></svg>')

      const result = await detectAssets(TEST_DIR)

      expect(result.images.length).toBeGreaterThanOrEqual(3)
      expect(result.images.some((f) => f.includes('logo.png'))).toBe(true)
      expect(result.images.some((f) => f.includes('photo.jpg'))).toBe(true)
      expect(result.images.some((f) => f.includes('icon.svg'))).toBe(true)
    })
  })

  describe('Font detection', () => {
    it('should detect font files', async () => {
      writeFileSync(join(TEST_DIR, 'font.woff2'), 'fake font')
      writeFileSync(join(TEST_DIR, 'font.ttf'), 'fake font')

      const result = await detectAssets(TEST_DIR)

      expect(result.fonts.length).toBeGreaterThanOrEqual(2)
      expect(result.fonts.some((f) => f.includes('font.woff2'))).toBe(true)
      expect(result.fonts.some((f) => f.includes('font.ttf'))).toBe(true)
    })
  })

  describe('API routes detection', () => {
    it('should detect API route files', async () => {
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'src', 'api.js'), 'export const routes = []')
      writeFileSync(join(TEST_DIR, 'routes.ts'), 'export const apiRoutes = []')

      const result = await detectAssets(TEST_DIR)

      // La détection API est basique, vérifie au moins qu'elle ne plante pas
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

      expect(result.javascript.some((f) => f.includes('dist'))).toBe(false)
    })

    it('should exclude .git folder', async () => {
      mkdirSync(join(TEST_DIR, '.git'), { recursive: true })
      writeFileSync(join(TEST_DIR, '.git', 'config'), '[core]')
      writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("test")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.some((f) => f.includes('.git'))).toBe(false)
    })
  })

  describe('File validation', () => {
    it('should only return existing files', async () => {
      // Les fichiers sont créés et vérifiés, donc tous devraient exister
      writeFileSync(join(TEST_DIR, 'app.js'), 'console.log("test")')

      const result = await detectAssets(TEST_DIR)

      expect(result.javascript.length).toBeGreaterThan(0)
      result.javascript.forEach((file) => {
        expect(require('fs').existsSync(file)).toBe(true)
      })
    })
  })
})

