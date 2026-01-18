/**
 * Tests for Config Loader Utility
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadProjectConfig, mergeConfigWithOptions, getEffectiveConfig } from './config-loader.js'
import type { InitOptions } from '../commands/init.js'
import type { UniversalPWAConfig } from '@julien-lin/universal-pwa-core'

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

  describe('loadProjectConfig', () => {
    it('should return null if no config file found', async () => {
      const result = await loadProjectConfig(testDir)

      expect(result.config).toBeNull()
      expect(result.filePath).toBeNull()
    })

    it('should load JSON config file', async () => {
      const configContent = {
        app: {
          name: 'Test App',
          themeColor: '#000000',
        },
        icons: {
          generate: true,
        },
      }

      writeFileSync(join(testDir, 'universal-pwa.config.json'), JSON.stringify(configContent))

      const result = await loadProjectConfig(testDir)

      expect(result.config).toBeDefined()
      expect(result.config?.app?.name).toBe('Test App')
      expect(result.config?.app?.themeColor).toBe('#000000')
      expect(result.filePath).toBe(join(testDir, 'universal-pwa.config.json'))
      expect(result.format).toBe('json')
    })
  })

  describe('mergeConfigWithOptions', () => {
    it('should return CLI options if no config', () => {
      const cliOptions: InitOptions = {
        name: 'CLI App',
        themeColor: '#FF0000',
      }

      const result = mergeConfigWithOptions(null, cliOptions)

      expect(result.name).toBe('CLI App')
      expect(result.themeColor).toBe('#FF0000')
    })

    it('should merge config with CLI options', () => {
      const config: UniversalPWAConfig = {
        projectRoot: '.',
        app: {
          generate: true,
          destination: 'manifest.json',
          startUrl: '/',
          scope: '/',
          display: 'standalone',
          name: 'Config App',
          themeColor: '#000000',
        },
        icons: {
          generate: true,
          source: 'config-icon.png',
        },
        serviceWorker: {
          generate: true,
          destination: 'sw.js',
          skipWaiting: true,
          clientsClaim: true,
        },
        injection: {
          inject: true,
        },
        scanner: {
          autoDetectBackend: true,
          forceScan: false,
          noCache: false,
        },
        output: {
          dir: 'public',
          clean: false,
        },
      }

      const cliOptions: InitOptions = {
        name: 'CLI App', // Should override config
        // themeColor not provided, should use config
      }

      const result = mergeConfigWithOptions(config, cliOptions)

      // CLI options take precedence
      expect(result.name).toBe('CLI App')
      // Config values used when CLI option not provided
      expect(result.themeColor).toBe('#000000')
      expect(result.iconSource).toBe('config-icon.png')
    })

    it('should handle skip flags correctly', () => {
      const config: UniversalPWAConfig = {
        projectRoot: '.',
        icons: {
          generate: false, // Should result in skipIcons: true
        },
        serviceWorker: {
          generate: false, // Should result in skipServiceWorker: true
        },
        injection: {
          inject: false, // Should result in skipInjection: true
        },
      }

      const cliOptions: InitOptions = {}

      const result = mergeConfigWithOptions(config, cliOptions)

      expect(result.skipIcons).toBe(true)
      expect(result.skipServiceWorker).toBe(true)
      expect(result.skipInjection).toBe(true)
    })

    it('should prioritize CLI options over config', () => {
      const config: UniversalPWAConfig = {
        projectRoot: '.',
        app: {
          generate: true,
          destination: 'manifest.json',
          startUrl: '/',
          scope: '/',
          display: 'standalone',
          name: 'Config App',
        },
        output: {
          dir: 'dist',
        },
      }

      const cliOptions: InitOptions = {
        name: 'CLI App',
        outputDir: 'public',
      }

      const result = mergeConfigWithOptions(config, cliOptions)

      expect(result.name).toBe('CLI App')
      expect(result.outputDir).toBe('public') // CLI option takes precedence
    })
  })

  describe('getEffectiveConfig', () => {
    it('should return CLI options if no config file', async () => {
      const cliOptions: InitOptions = {
        name: 'CLI App',
      }

      const result = await getEffectiveConfig(testDir, cliOptions)

      expect(result.options.name).toBe('CLI App')
      expect(result.configFile.config).toBeNull()
    })

    it('should merge config file with CLI options', async () => {
      const configContent = {
        app: {
          name: 'Config App',
          themeColor: '#000000',
        },
        output: {
          dir: 'dist',
        },
      }

      writeFileSync(join(testDir, 'universal-pwa.config.json'), JSON.stringify(configContent))

      const cliOptions: InitOptions = {
        name: 'CLI App', // Should override config
      }

      const result = await getEffectiveConfig(testDir, cliOptions)

      expect(result.options.name).toBe('CLI App') // CLI takes precedence
      expect(result.options.themeColor).toBe('#000000') // From config
      expect(result.options.outputDir).toBe('dist') // From config
      expect(result.configFile.config).toBeDefined()
    })
  })
})
