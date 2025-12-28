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

    it('should generate short name correctly', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          name: 'very-long-application-name',
        }),
      )

      const suggestion = suggestAppName(TEST_DIR, null)
      expect(suggestion.shortName.length).toBeLessThanOrEqual(12)
    })
  })

  describe('suggestIconPath', () => {
    it('should find icon in common locations', () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'public', 'logo.png'), 'fake png')

      const suggestions = suggestIconPath(TEST_DIR)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some((s) => s.path.includes('logo.png'))).toBe(true)
    })

    it('should find icon-like images', () => {
      mkdirSync(join(TEST_DIR, 'assets'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'assets', 'app-icon.png'), 'fake png')

      const suggestions = suggestIconPath(TEST_DIR)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should return empty array if no icons found', () => {
      const suggestions = suggestIconPath(TEST_DIR)
      expect(Array.isArray(suggestions)).toBe(true)
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

    it('should suggest default colors for unknown framework', () => {
      const suggestion = suggestColors(TEST_DIR, null)
      expect(suggestion.themeColor).toBeDefined()
      expect(suggestion.backgroundColor).toBeDefined()
      expect(suggestion.source).toBe('default')
      expect(suggestion.confidence).toBe('low')
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

    it('should suggest public/ by default', () => {
      const suggestion = suggestConfiguration(TEST_DIR, null, null)
      expect(suggestion.outputDir).toBe('public')
    })
  })

  describe('generateSuggestions', () => {
    it('should generate all suggestions', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          name: 'test-app',
        }),
      )

      const suggestions = generateSuggestions(TEST_DIR, 'react', 'spa')
      expect(suggestions.name).toBeDefined()
      expect(suggestions.icons).toBeDefined()
      expect(suggestions.colors).toBeDefined()
      expect(suggestions.configuration).toBeDefined()
    })
  })
})

