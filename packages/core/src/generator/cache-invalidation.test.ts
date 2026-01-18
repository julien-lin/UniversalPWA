/**
 * Tests for Cache Invalidation System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, unlinkSync, rmdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  generateCacheVersion,
  buildDependencyGraph,
  getCascadeInvalidation,
  shouldInvalidateCache,
  getTrackedFiles,
  shouldIgnoreFile,
  getOrGenerateCacheVersion,
  type CacheVersion,
} from './cache-invalidation.js'
import type { AdvancedCachingConfig, RouteConfig } from './caching-strategy.js'
import { PRESET_STRATEGIES } from './caching-strategy.js'

describe('cache-invalidation', () => {
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

  describe('generateCacheVersion', () => {
    it('should generate version from file hashes', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')
      writeFileSync(join(testDir, 'style.css'), 'body { color: red; }')

      const version = generateCacheVersion(testDir, ['**/*.js', '**/*.css'])

      expect(version.version).toBeDefined()
      expect(version.version.length).toBeGreaterThan(0)
      expect(version.timestamp).toBeGreaterThan(0)
      expect(Object.keys(version.fileHashes).length).toBe(2)
    })

    it('should generate same version for same files', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')

      const version1 = generateCacheVersion(testDir, ['**/*.js'])
      const version2 = generateCacheVersion(testDir, ['**/*.js'])

      expect(version1.version).toBe(version2.version)
    })

    it('should generate different version when file changes', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')

      const version1 = generateCacheVersion(testDir, ['**/*.js'])

      writeFileSync(join(testDir, 'app.js'), 'console.log("app v2")')

      const version2 = generateCacheVersion(testDir, ['**/*.js'])

      expect(version1.version).not.toBe(version2.version)
    })

    it('should respect ignore patterns', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')
      writeFileSync(join(testDir, 'app.js.map'), 'source map')

      const version1 = generateCacheVersion(testDir, ['**/*'], ['**/*.map'])
      const version2 = generateCacheVersion(testDir, ['**/*'], ['**/*.map'])

      // Should not include .map file
      expect(Object.keys(version1.fileHashes).every((f) => !f.endsWith('.map'))).toBe(true)
    })
  })

  describe('buildDependencyGraph', () => {
    it('should build dependency graph from routes', () => {
      const routes: RouteConfig[] = [
        {
          pattern: '/app.js',
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ['/app.css', '/vendor.js'],
        },
        {
          pattern: '/app.css',
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ['/fonts.css'],
        },
      ]

      const graph = buildDependencyGraph(routes)

      expect(graph.dependencies.get('/app.js')).toEqual(['/app.css', '/vendor.js'])
      expect(graph.dependents.get('/app.css')).toContain('/app.js')
      expect(graph.dependents.get('/fonts.css')).toContain('/app.css')
    })

    it('should handle routes without dependencies', () => {
      const routes: RouteConfig[] = [
        {
          pattern: '/app.js',
          strategy: PRESET_STRATEGIES.StaticAssets,
        },
      ]

      const graph = buildDependencyGraph(routes)

      expect(graph.dependencies.size).toBe(0)
      expect(graph.dependents.size).toBe(0)
    })
  })

  describe('getCascadeInvalidation', () => {
    it('should return cascade of invalidated files', () => {
      const routes: RouteConfig[] = [
        {
          pattern: '/app.js',
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ['/app.css', '/vendor.js'],
        },
        {
          pattern: '/app.css',
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ['/fonts.css'],
        },
      ]

      const graph = buildDependencyGraph(routes)
      const invalidated = getCascadeInvalidation('/fonts.css', graph)

      expect(invalidated).toContain('/fonts.css')
      expect(invalidated).toContain('/app.css')
      expect(invalidated).toContain('/app.js')
    })

    it('should handle circular dependencies', () => {
      const routes: RouteConfig[] = [
        {
          pattern: '/a.js',
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ['/b.js'],
        },
        {
          pattern: '/b.js',
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ['/a.js'],
        },
      ]

      const graph = buildDependencyGraph(routes)
      const invalidated = getCascadeInvalidation('/a.js', graph)

      expect(invalidated).toContain('/a.js')
      expect(invalidated).toContain('/b.js')
    })
  })

  describe('shouldInvalidateCache', () => {
    it('should invalidate on manual version change', () => {
      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: 'v1.0.0',
        },
      }

      const currentVersion: CacheVersion = {
        version: 'v0.9.0',
        timestamp: Date.now(),
        fileHashes: {},
      }

      const result = shouldInvalidateCache(testDir, currentVersion, config)

      expect(result.shouldInvalidate).toBe(true)
      expect(result.reason).toBe('Manual version changed')
      expect(result.newVersion).toBe('v1.0.0')
    })

    it('should not invalidate if manual version unchanged', () => {
      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: 'v1.0.0',
        },
      }

      const currentVersion: CacheVersion = {
        version: 'v1.0.0',
        timestamp: Date.now(),
        fileHashes: {},
      }

      const result = shouldInvalidateCache(testDir, currentVersion, config)

      expect(result.shouldInvalidate).toBe(false)
    })

    it('should invalidate on file changes with auto versioning', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')

      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ['**/*.js'],
        },
      }

      const currentVersion: CacheVersion = {
        version: 'old-version',
        timestamp: Date.now(),
        fileHashes: {
          [join(testDir, 'app.js')]: 'old-hash',
        },
      }

      const result = shouldInvalidateCache(testDir, currentVersion, config)

      expect(result.shouldInvalidate).toBe(true)
      expect(result.changedFiles).toBeDefined()
      expect(result.changedFiles!.length).toBeGreaterThan(0)
    })

    it('should not invalidate if files unchanged', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')

      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ['**/*.js'],
        },
      }

      // Generate current version from actual files
      const currentVersion = generateCacheVersion(testDir, ['**/*.js'])

      const result = shouldInvalidateCache(testDir, currentVersion, config)

      expect(result.shouldInvalidate).toBe(false)
    })
  })

  describe('getTrackedFiles', () => {
    it('should find files matching patterns', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')
      writeFileSync(join(testDir, 'style.css'), 'body { color: red; }')
      writeFileSync(join(testDir, 'index.html'), '<html></html>')

      const files = getTrackedFiles(testDir, ['**/*.js', '**/*.css'])

      expect(files.length).toBe(2)
      expect(files.some((f) => f.endsWith('app.js'))).toBe(true)
      expect(files.some((f) => f.endsWith('style.css'))).toBe(true)
    })

    it('should respect ignore patterns', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')
      writeFileSync(join(testDir, 'app.js.map'), 'source map')

      const files = getTrackedFiles(testDir, ['**/*'], ['**/*.map'])

      expect(files.some((f) => f.endsWith('.map'))).toBe(false)
    })
  })

  describe('shouldIgnoreFile', () => {
    it('should ignore files matching patterns', () => {
      // Use actual file paths for testing
      const testFile = join(testDir, 'file.map')
      writeFileSync(testFile, 'content')

      expect(shouldIgnoreFile(testFile, ['**/*.map'])).toBe(true)
      expect(shouldIgnoreFile(join(testDir, 'file.js'), ['**/*.map'])).toBe(false)
    })

    it('should handle multiple ignore patterns', () => {
      const dsStoreFile = join(testDir, '.DS_Store')
      writeFileSync(dsStoreFile, 'content')

      expect(shouldIgnoreFile(dsStoreFile, ['**/*.map', '**/.DS_Store'])).toBe(true)
      expect(shouldIgnoreFile(join(testDir, 'file.js'), ['**/*.map', '**/.DS_Store'])).toBe(false)
    })
  })

  describe('getOrGenerateCacheVersion', () => {
    it('should use manual version when provided', () => {
      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: 'v1.2.3',
        },
      }

      const version = getOrGenerateCacheVersion(testDir, config)

      expect(version.version).toBe('v1.2.3')
    })

    it('should generate auto version when enabled', () => {
      writeFileSync(join(testDir, 'app.js'), 'console.log("app")')

      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ['**/*.js'],
        },
      }

      const version = getOrGenerateCacheVersion(testDir, config)

      expect(version.version).toBeDefined()
      expect(version.version.length).toBeGreaterThan(0)
      expect(Object.keys(version.fileHashes).length).toBeGreaterThan(0)
    })

    it('should use timestamp as fallback', () => {
      const config: AdvancedCachingConfig = {
        routes: [],
      }

      const version = getOrGenerateCacheVersion(testDir, config)

      expect(version.version).toMatch(/^v\d+$/)
    })
  })
})
