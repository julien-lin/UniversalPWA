import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  suggestAppName,
  suggestIconPath,
  suggestColors,
  suggestConfiguration,
  generateSuggestions,
} from './suggestions.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-suggestions')

describe('suggestions', () => {
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

  describe('suggestAppName', () => {
    it('should suggest name from package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          name: 'my-awesome-app',
          displayName: 'My Awesome App',
        }),
      )

      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.name).toBe('My Awesome App')
      expect(suggestion.source).toBe('package.json')
      expect(suggestion.confidence).toBe('high')
    })

    it('should use displayName over name in package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          name: 'internal-name',
          displayName: 'Public Display Name',
        }),
      )

      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.name).toBe('Public Display Name')
    })

    it('should suggest name from composer.json', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          name: 'vendor/my-php-app',
        }),
      )

      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.name).toBe('my php app')
      expect(suggestion.source).toBe('composer.json')
      expect(suggestion.confidence).toBe('high')
    })

    it('should suggest name from directory if no config files', () => {
      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.name).toBeDefined()
      expect(suggestion.source).toBe('directory')
      expect(suggestion.confidence).toBe('medium')
    })

    it('should generate short name correctly and limit to 12 chars', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          name: 'very-long-application-name-that-exceeds-limits',
        }),
      )

      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.shortName.length).toBeLessThanOrEqual(12)
    })

    it('should handle empty package.json gracefully', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), '{}')

      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.name).toBeDefined()
      expect(suggestion.source).toBe('directory')
    })
  })

  describe('suggestIconPath', () => {
    it('should find icon in common root locations', () => {
      writeFileSync(join(TEST_DIR, 'logo.png'), 'fake png')

      const suggestions = suggestIconPath(TEST_DIR)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.path === 'logo.png')).toBe(true)
      expect(suggestions[0].confidence).toBe('high')
    })

    it('should find icon in public folder', () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'icon.png'), 'fake png')

      const suggestions = suggestIconPath(TEST_DIR)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.path.includes('public'))).toBe(true)
    })

    it('should find icon in assets folder', () => {
      mkdirSync(join(TEST_DIR, 'assets'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'assets', 'app-icon.svg'), '<svg></svg>')

      const suggestions = suggestIconPath(TEST_DIR)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should return empty array if no icons found', () => {
      const suggestions = suggestIconPath(TEST_DIR)
      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('should ignore icons in node_modules', () => {
      mkdirSync(join(TEST_DIR, 'node_modules', 'some-package', 'assets'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'node_modules', 'some-package', 'assets', 'icon.png'), 'fake')

      const suggestions = suggestIconPath(TEST_DIR)
      const hasNodeModules = suggestions.some((s) => s.path.includes('node_modules'))
      expect(hasNodeModules).toBe(false)
    })
  })

  describe('suggestColors', () => {
    it('should suggest React colors', () => {
      const suggestion = suggestColors(TEST_DIR, 'react')
      expect(suggestion.themeColor).toBe('#61dafb')
      expect(suggestion.source).toBe('framework')
      expect(suggestion.confidence).toBe('high')
    })

    it('should suggest Vue colors', () => {
      const suggestion = suggestColors(TEST_DIR, 'vue')
      expect(suggestion.themeColor).toBe('#42b983')
      expect(suggestion.source).toBe('framework')
      expect(suggestion.confidence).toBe('high')
    })

    it('should suggest Next.js colors', () => {
      const suggestion = suggestColors(TEST_DIR, 'nextjs')
      expect(suggestion.themeColor).toBe('#000000')
      expect(suggestion.confidence).toBe('high')
    })

    it('should suggest default colors for unknown framework', () => {
      const suggestion = suggestColors(TEST_DIR, null)
      expect(suggestion.themeColor).toBeDefined()
      expect(suggestion.backgroundColor).toBeDefined()
      expect(suggestion.source).toBe('default')
      expect(suggestion.confidence).toBe('low')
    })

    it('should be case insensitive for framework names', () => {
      const suggestion = suggestColors(TEST_DIR, 'REACT')
      expect(suggestion.themeColor).toBe('#61dafb')
    })
  })

  describe('suggestConfiguration', () => {
    it('should suggest dist/ if dist directory exists', () => {
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), '<html></html>')

      const suggestion = suggestConfiguration(TEST_DIR, 'react', 'spa')
      expect(suggestion.outputDir).toBe('dist')
      expect(suggestion.reason).toContain('dist')
    })

    it('should suggest build/ if build directory exists', () => {
      mkdirSync(join(TEST_DIR, 'build'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'build', 'index.html'), '<html></html>')

      const suggestion = suggestConfiguration(TEST_DIR, 'react', 'spa')
      expect(suggestion.outputDir).toBe('build')
      expect(suggestion.reason).toContain('build')
    })

    it('should prefer dist over build', () => {
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'build'), { recursive: true })

      const suggestion = suggestConfiguration(TEST_DIR, null, null)
      expect(suggestion.outputDir).toBe('dist')
    })

    it('should suggest public/ for CMS frameworks', () => {
      const suggestion = suggestConfiguration(TEST_DIR, 'wordpress', null)
      expect(suggestion.outputDir).toBe('public')
      expect(suggestion.reason).toContain('CMS')
    })

    it('should always suggest generating icons and service worker', () => {
      const suggestion = suggestConfiguration(TEST_DIR, null, null)
      expect(suggestion.skipIcons).toBe(false)
      expect(suggestion.skipServiceWorker).toBe(false)
    })
  })

  describe('generateSuggestions', () => {
    it('should generate all suggestions together', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          name: 'test-app',
        }),
      )
      writeFileSync(join(TEST_DIR, 'logo.png'), 'fake')

      const suggestions = generateSuggestions(TEST_DIR, 'react', 'spa')
      expect(suggestions.name).toBeDefined()
      expect(suggestions.icons).toBeDefined()
      expect(suggestions.colors).toBeDefined()
      expect(suggestions.configuration).toBeDefined()
    })
  })
})
