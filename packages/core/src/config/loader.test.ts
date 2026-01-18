/**
 * Tests for Configuration Loader
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadConfig, findConfigFile, ConfigLoadError, ConfigValidationError } from './loader.js'
import { validateConfig } from './validator.js'

describe('config-loader', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `universal-pwa-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
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

  describe('findConfigFile', () => {
    it('should find JSON config file', async () => {
      writeFileSync(join(testDir, 'universal-pwa.config.json'), JSON.stringify({}))

      const filePath = await findConfigFile(testDir)

      expect(filePath).toBe(join(testDir, 'universal-pwa.config.json'))
    })

    it('should find JS config file', async () => {
      writeFileSync(join(testDir, 'universal-pwa.config.js'), 'module.exports = {}')

      const filePath = await findConfigFile(testDir)

      expect(filePath).toBe(join(testDir, 'universal-pwa.config.js'))
    })

    it('should return null if no config file found', async () => {
      const filePath = await findConfigFile(testDir)

      expect(filePath).toBeNull()
    })

    it('should prioritize .ts over .js over .json', async () => {
      writeFileSync(join(testDir, 'universal-pwa.config.json'), JSON.stringify({}))
      writeFileSync(join(testDir, 'universal-pwa.config.js'), 'module.exports = {}')
      writeFileSync(join(testDir, 'universal-pwa.config.ts'), 'export default {}')

      const filePath = await findConfigFile(testDir)

      // Should find .ts first (first in the list)
      expect(filePath).toBe(join(testDir, 'universal-pwa.config.ts'))
    })
  })

  describe('loadConfig - JSON', () => {
    it('should load valid JSON config', async () => {
      const configContent = {
        app: {
          name: 'Test App',
          themeColor: '#000000',
        },
      }

      writeFileSync(join(testDir, 'config.json'), JSON.stringify(configContent))

      const result = await loadConfig(join(testDir, 'config.json'))

      expect(result.config.app?.name).toBe('Test App')
      expect(result.config.app?.themeColor).toBe('#000000')
      expect(result.format).toBe('json')
      expect(result.validated).toBe(true)
    })

    it('should merge with defaults', async () => {
      writeFileSync(join(testDir, 'config.json'), JSON.stringify({}))

      const result = await loadConfig(join(testDir, 'config.json'))

      expect(result.config.app?.generate).toBe(true)
      expect(result.config.icons?.generate).toBe(true)
      expect(result.config.serviceWorker?.generate).toBe(true)
    })

    it('should throw error for invalid JSON', async () => {
      writeFileSync(join(testDir, 'config.json'), '{ invalid json }')

      await expect(loadConfig(join(testDir, 'config.json'))).rejects.toThrow(ConfigLoadError)
    })
  })

  describe('loadConfig - JavaScript', () => {
    it('should load JS config with default export', async () => {
      writeFileSync(
        join(testDir, 'config.js'),
        'module.exports = { app: { name: "Test App" } }',
      )

      const result = await loadConfig(join(testDir, 'config.js'))

      expect(result.config.app?.name).toBe('Test App')
      expect(result.format).toBe('js')
    })

    it('should load JS config with module.exports.config', async () => {
      writeFileSync(
        join(testDir, 'config.js'),
        'module.exports.config = { app: { name: "Test App" } }',
      )

      const result = await loadConfig(join(testDir, 'config.js'))

      expect(result.config.app?.name).toBe('Test App')
    })
  })

  describe('loadConfig - YAML', () => {
    it('should load simple YAML config', async () => {
      const yamlContent = `
app:
  name: Test App
  themeColor: "#000000"
icons:
  generate: true
`

      writeFileSync(join(testDir, 'config.yaml'), yamlContent)

      const result = await loadConfig(join(testDir, 'config.yaml'))

      expect(result.config.app?.name).toBe('Test App')
      expect(result.config.app?.themeColor).toBe('#000000')
      expect(result.config.icons?.generate).toBe(true)
      expect(result.format).toBe('yaml')
    })

    it('should handle YAML with comments', async () => {
      const yamlContent = `
# This is a comment
app:
  name: Test App
  # Another comment
  themeColor: "#000000"
`

      writeFileSync(join(testDir, 'config.yaml'), yamlContent)

      const result = await loadConfig(join(testDir, 'config.yaml'))

      expect(result.config.app?.name).toBe('Test App')
    })
  })

  describe('loadConfig - Validation', () => {
    it('should validate config by default', async () => {
      const configContent = {
        app: {
          name: 'Test App',
        },
      }

      writeFileSync(join(testDir, 'config.json'), JSON.stringify(configContent))

      const result = await loadConfig(join(testDir, 'config.json'))

      expect(result.validated).toBe(true)
    })

    it('should throw validation error in strict mode', async () => {
      const configContent = {
        app: {
          display: 'invalid-display', // Invalid enum value
        },
      }

      writeFileSync(join(testDir, 'config.json'), JSON.stringify(configContent))

      await expect(loadConfig(join(testDir, 'config.json'), { strict: true })).rejects.toThrow(
        ConfigValidationError,
      )
    })

    it('should not throw in non-strict mode', async () => {
      const configContent = {
        app: {
          display: 'invalid-display',
        },
      }

      writeFileSync(join(testDir, 'config.json'), JSON.stringify(configContent))

      // Should not throw, but validated should be false
      const result = await loadConfig(join(testDir, 'config.json'), { strict: false })

      expect(result.validated).toBe(false)
    })

    it('should skip validation if requested', async () => {
      writeFileSync(join(testDir, 'config.json'), JSON.stringify({}))

      const result = await loadConfig(join(testDir, 'config.json'), { validate: false })

      expect(result.validated).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should throw ConfigLoadError for missing file', async () => {
      await expect(loadConfig(join(testDir, 'nonexistent.json'))).rejects.toThrow(ConfigLoadError)
    })

    it('should throw ConfigLoadError for unsupported format', async () => {
      writeFileSync(join(testDir, 'config.xml'), '<config></config>')

      await expect(loadConfig(join(testDir, 'config.xml'))).rejects.toThrow(ConfigLoadError)
    })
  })
})
