import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, utimesSync } from 'fs'
import { join } from 'path'
import { detectEnvironment } from './environment-detector.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-env-detector')

describe('environment-detector', () => {
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

  describe('detectEnvironment', () => {
    it('should detect local environment when no dist/ or build/ exists', () => {
      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('local')
      expect(result.suggestedOutputDir).toBe('public')
      expect(result.indicators.length).toBeGreaterThan(0)
      expect(result.indicators[0]).toContain('No production build detected')
    })

    it('should detect production when dist/ exists with recent files', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })

      // Create recent files (within 24h)
      const recentFile = join(distDir, 'index.js')
      writeFileSync(recentFile, 'console.log("test")')
      // Set mtime to now (recent)
      const now = new Date()
      utimesSync(recentFile, now, now)

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('high')
      expect(result.suggestedOutputDir).toBe('dist')
      expect(result.indicators.some(i => i.includes('recent files'))).toBe(true)
    })

    it('should detect production when dist/ exists with old files', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })

      // Create old files (more than 24h old)
      const oldFile = join(distDir, 'index.js')
      writeFileSync(oldFile, 'console.log("test")')
      // Set mtime to 2 days ago
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      utimesSync(oldFile, twoDaysAgo, twoDaysAgo)

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('medium')
      expect(result.suggestedOutputDir).toBe('dist')
      expect(result.indicators.some(i => i.includes('old'))).toBe(true)
    })

    it('should detect production when build/ exists with files', () => {
      const buildDir = join(TEST_DIR, 'build')
      mkdirSync(buildDir, { recursive: true })

      writeFileSync(join(buildDir, 'index.js'), 'console.log("test")')
      writeFileSync(join(buildDir, 'index.css'), 'body { margin: 0; }')

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('high')
      expect(result.suggestedOutputDir).toBe('build')
      expect(result.indicators.some(i => i.includes('build/'))).toBe(true)
    })

    it('should prefer dist/ over build/ when both exist', () => {
      const distDir = join(TEST_DIR, 'dist')
      const buildDir = join(TEST_DIR, 'build')
      mkdirSync(distDir, { recursive: true })
      mkdirSync(buildDir, { recursive: true })

      const recentFile = join(distDir, 'index.js')
      writeFileSync(recentFile, 'console.log("test")')
      const now = new Date()
      utimesSync(recentFile, now, now)

      writeFileSync(join(buildDir, 'index.js'), 'console.log("test")')

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.suggestedOutputDir).toBe('dist')
    })

    it('should handle empty dist/ directory', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })
      // dist/ exists but is empty

      const result = detectEnvironment(TEST_DIR)

      expect(result.indicators.some(i => i.includes('empty'))).toBe(true)
    })

    it('should return local when dist/ exists but has no build files', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })

      // Create a non-build file (e.g., README)
      writeFileSync(join(distDir, 'README.md'), '# Test')

      const result = detectEnvironment(TEST_DIR)

      // Should still detect local since no .js/.css/.html files
      expect(result.environment).toBe('local')
      expect(result.suggestedOutputDir).toBe('public')
    })

    it('should handle errors gracefully', () => {
      // Test with invalid path (should not throw)
      const result = detectEnvironment('/invalid/path/that/does/not/exist')

      expect(result).toBeDefined()
      expect(result.environment).toBe('local')
      expect(result.suggestedOutputDir).toBe('public')
    })

    it('should detect React project with dist/ as production', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })
      const file = join(distDir, 'index.js')
      writeFileSync(file, 'console.log("test")')
      // Set to recent so we get 'high' confidence
      const now = new Date()
      utimesSync(file, now, now)

      const result = detectEnvironment(TEST_DIR, 'React')

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('high')
      expect(result.suggestedOutputDir).toBe('dist')
      expect(result.indicators.some(i => i.includes('dist/'))).toBe(true)
      expect(result.indicators.some(i => i.includes('recent'))).toBe(true)
    })

    it('should detect Vite project with dist/ as production', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })
      const file = join(distDir, 'index.js')
      writeFileSync(file, 'console.log("test")')
      // Set to recent so we get 'high' confidence
      const now = new Date()
      utimesSync(file, now, now)

      const result = detectEnvironment(TEST_DIR, 'Vite')

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('high')
      expect(result.suggestedOutputDir).toBe('dist')
      expect(result.indicators.some(i => i.includes('dist/'))).toBe(true)
      expect(result.indicators.some(i => i.includes('recent'))).toBe(true)
    })

    it('should handle dist/ with multiple built files', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })

      // Create multiple recent files
      writeFileSync(join(distDir, 'index.js'), 'code')
      writeFileSync(join(distDir, 'style.css'), 'css')
      writeFileSync(join(distDir, 'app.html'), '<html></html>')

      const now = new Date()
      utimesSync(join(distDir, 'index.js'), now, now)
      utimesSync(join(distDir, 'style.css'), now, now)
      utimesSync(join(distDir, 'app.html'), now, now)

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some(i => i.includes('3 built files'))).toBe(true)
    })

    it('should handle dist/ with recent and old files mixed', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })

      // Create one recent file
      const recentFile = join(distDir, 'index.js')
      writeFileSync(recentFile, 'code')
      const now = new Date()
      utimesSync(recentFile, now, now)

      // Create one old file
      const oldFile = join(distDir, 'old.js')
      writeFileSync(oldFile, 'old code')
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      utimesSync(oldFile, twoDaysAgo, twoDaysAgo)

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some(i => i.includes('recent files'))).toBe(true)
    })

    it('should handle null framework parameter', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })
      writeFileSync(join(distDir, 'index.js'), 'code')

      const result = detectEnvironment(TEST_DIR, null)

      expect(result).toBeDefined()
      expect(result.environment).toBe('production')
      expect(result.suggestedOutputDir).toBe('dist')
    })

    it('should handle undefined framework parameter', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })
      writeFileSync(join(distDir, 'index.js'), 'code')

      const result = detectEnvironment(TEST_DIR, undefined)

      expect(result).toBeDefined()
      expect(result.environment).toBe('production')
      expect(result.suggestedOutputDir).toBe('dist')
    })

    it('should have correct structure in result', () => {
      const result = detectEnvironment(TEST_DIR)

      expect(result).toHaveProperty('environment')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('indicators')
      expect(result).toHaveProperty('suggestedOutputDir')

      expect(typeof result.environment).toBe('string')
      expect(['high', 'medium', 'low']).toContain(result.confidence)
      expect(Array.isArray(result.indicators)).toBe(true)
      expect(typeof result.suggestedOutputDir).toBe('string')
    })

    it('should handle dist/ with only one recent file', () => {
      const distDir = join(TEST_DIR, 'dist')
      mkdirSync(distDir, { recursive: true })

      const file = join(distDir, 'app.js')
      writeFileSync(file, 'code')
      const now = new Date()
      utimesSync(file, now, now)

      const result = detectEnvironment(TEST_DIR)

      expect(result.environment).toBe('production')
      expect(result.indicators.some(i => i.includes('1 recent'))).toBe(true)
    })
  })
})

