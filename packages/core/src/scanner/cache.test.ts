import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import {
  loadCache,
  saveCache,
  isCacheValid,
  getCachedResult,
  updateCache,
  cleanCache,
  removeCacheEntry,
  type ScanCache,
} from './cache.js'
import type { ScannerResult } from './index.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-cache')

// Helpers
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K]
}

const writeJSON = (filePath: string, data: unknown) => {
  writeFileSync(filePath, JSON.stringify(data), 'utf-8')
}

const nowISO = () => new Date().toISOString()
const hoursAgoISO = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

const makeResult = (projectPath: string, overrides: DeepPartial<ScannerResult> = {}): ScannerResult => ({
  framework: {
    framework: null,
    confidence: 'low',
    confidenceScore: 0,
    indicators: [],
    version: null,
    configuration: {
      language: null,
      cssInJs: [],
      stateManagement: [],
      buildTool: null,
      ...(overrides.framework?.configuration as Partial<ScannerResult['framework']['configuration']> ?? {}),
    },
    ...(overrides.framework as Partial<ScannerResult['framework']> ?? {}),
  },
  assets: {
    javascript: [],
    css: [],
    images: [],
    fonts: [],
    apiRoutes: [],
    ...(overrides.assets as Partial<ScannerResult['assets']> ?? {}),
  },
  architecture: {
    architecture: 'static',
    buildTool: null,
    confidence: 'low',
    indicators: [],
    ...(overrides.architecture as Partial<ScannerResult['architecture']> ?? {}),
  },
  timestamp: (overrides.timestamp as string) ?? nowISO(),
  projectPath,
})

const withUpdatedCache = (projectPath: string, result: ScannerResult, cache: ScanCache | null) =>
  updateCache(projectPath, result, cache)

const createPackageJson = (dir: string, data: Record<string, unknown>) =>
  writeJSON(join(dir, 'package.json'), data)

const expectCacheHit = (dir: string, cache: ScanCache | null, expected: boolean) => {
  expect(isCacheValid(dir, cache)).toBe(expected)
}

describe('cache', () => {
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

  describe('loadCache and saveCache', () => {
    it('should return null if cache file does not exist', () => {
      const cache = loadCache(join(TEST_DIR, 'non-existent.json'))
      expect(cache).toBeNull()
    })

    it('should load and save cache', () => {
      const cacheFile = join(TEST_DIR, 'cache.json')
      const cache: ScanCache = { version: '1.0.0', entries: {} }
      saveCache(cache, cacheFile)
      expect(existsSync(cacheFile)).toBe(true)
      const loaded = loadCache(cacheFile)
      expect(loaded)?.not.toBeNull()
      expect(loaded?.version).toBe('1.0.0')
    })

    it('should return null for invalid cache version', () => {
      const cacheFile = join(TEST_DIR, 'invalid-cache.json')
      writeJSON(cacheFile, { version: '0.9.0', entries: {} })
      const loaded = loadCache(cacheFile)
      expect(loaded).toBeNull()
    })
  })

  describe('isCacheValid', () => {
    it.each<[
      name: string,
      cache: ScanCache | null,
      options: { force?: boolean } | undefined,
      expected: boolean
    ]>([
      ['cache is null', null, undefined, false],
      ['force true', { version: '1.0.0', entries: {} }, { force: true }, false],
      ['no entry', { version: '1.0.0', entries: {} }, undefined, false],
    ])('should return false when %s', (_name, cache, options, expected) => {
      expect(isCacheValid(TEST_DIR, cache, options)).toBe(expected)
    })

    it('should return true for valid cache entry', () => {
      const cacheFile = join(TEST_DIR, 'cache.json')
      createPackageJson(TEST_DIR, { name: 'test' })

      const result = makeResult(TEST_DIR)
      const cache = withUpdatedCache(TEST_DIR, result, { version: '1.0.0', entries: {} })
      saveCache(cache, cacheFile)

      const loadedCache = loadCache(cacheFile)
      expectCacheHit(TEST_DIR, loadedCache, true)
    })

    it('should return false if file has changed', () => {
      const cacheFile = join(TEST_DIR, 'cache.json')
      createPackageJson(TEST_DIR, { name: 'test' })

      const result = makeResult(TEST_DIR)
      const cache = withUpdatedCache(TEST_DIR, result, { version: '1.0.0', entries: {} })
      saveCache(cache, cacheFile)

      // Modifier package.json
      createPackageJson(TEST_DIR, { name: 'modified' })

      const loadedCache = loadCache(cacheFile)
      expectCacheHit(TEST_DIR, loadedCache, false)
    })
  })

  describe('getCachedResult', () => {
    it('should return null if cache is null', () => {
      expect(getCachedResult(TEST_DIR, null)).toBeNull()
    })

    it('should return cached result', () => {
      const result = makeResult(TEST_DIR, {
        framework: {
          framework: 'react',
          confidence: 'high',
          confidenceScore: 90,
          indicators: ['package.json: react'],
          configuration: { language: 'typescript', buildTool: 'vite' },
        },
        architecture: { architecture: 'spa', buildTool: 'vite', confidence: 'high' },
      })

      const cache = updateCache(TEST_DIR, result, { version: '1.0.0', entries: {} })
      const cachedResult = getCachedResult(TEST_DIR, cache)

      expect(cachedResult).not.toBeNull()
      expect(cachedResult?.framework.framework).toBe('react')
    })
  })

  describe('updateCache', () => {
    it('should create new cache entry', () => {
      const result = makeResult(TEST_DIR)
      const cache = updateCache(TEST_DIR, result, null)
      expect(cache.entries).toBeDefined()
      expect(Object.keys(cache.entries).length).toBe(1)
    })

    it('should update existing cache entry', () => {
      const result1 = makeResult(TEST_DIR)
      let cache = updateCache(TEST_DIR, result1, null)

      const result2 = makeResult(TEST_DIR, { framework: { framework: 'react' } })
      cache = updateCache(TEST_DIR, result2, cache)
      expect(Object.keys(cache.entries).length).toBe(1) // Même clé, donc même entrée
    })
  })

  describe('cleanCache', () => {
    it('should remove expired entries', () => {
      const oldTimestamp = hoursAgoISO(25)
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {
          key1: {
            result: makeResult(TEST_DIR, { timestamp: oldTimestamp }),
            timestamp: oldTimestamp,
            fileHashes: {},
            ttl: 24 * 60 * 60,
          },
        },
      }

      const cleaned = cleanCache(cache, 24 * 60 * 60)
      expect(cleaned).toBeNull()
    })

    it('should keep non-expired entries', () => {
      const recentTimestamp = nowISO()
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {
          key1: {
            result: makeResult(TEST_DIR, { timestamp: recentTimestamp }),
            timestamp: recentTimestamp,
            fileHashes: {},
            ttl: 24 * 60 * 60,
          },
        },
      }

      const cleaned = cleanCache(cache, 24 * 60 * 60)
      expect(cleaned).not.toBeNull()
      expect(Object.keys(cleaned?.entries ?? {}).length).toBe(1)
    })
  })

  describe('removeCacheEntry', () => {
    it('should remove specific entry', () => {
      const result = makeResult(TEST_DIR)
      const cache = updateCache(TEST_DIR, result, null)
      expect(Object.keys(cache.entries).length).toBe(1)

      const updatedCache = removeCacheEntry(TEST_DIR, cache)
      expect(updatedCache).toBeNull() // Cache vide après suppression
    })
  })
})

