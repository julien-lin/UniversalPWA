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
  type CacheEntry,
} from './cache.js'
import type { ScannerResult } from './index.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-cache')

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
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {},
      }

      saveCache(cache, cacheFile)
      expect(existsSync(cacheFile)).toBe(true)

      const loaded = loadCache(cacheFile)
      expect(loaded).not.toBeNull()
      expect(loaded?.version).toBe('1.0.0')
    })

    it('should return null for invalid cache version', () => {
      const cacheFile = join(TEST_DIR, 'invalid-cache.json')
      const invalidCache = {
        version: '0.9.0',
        entries: {},
      }
      writeFileSync(cacheFile, JSON.stringify(invalidCache), 'utf-8')

      const loaded = loadCache(cacheFile)
      expect(loaded).toBeNull()
    })
  })

  describe('isCacheValid', () => {
    it('should return false if cache is null', () => {
      expect(isCacheValid(TEST_DIR, null)).toBe(false)
    })

    it('should return false if force is true', () => {
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {},
      }
      expect(isCacheValid(TEST_DIR, cache, { force: true })).toBe(false)
    })

    it('should return false if entry does not exist', () => {
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {},
      }
      expect(isCacheValid(TEST_DIR, cache)).toBe(false)
    })

    it('should return true for valid cache entry', () => {
      const cacheFile = join(TEST_DIR, 'cache.json')
      const packageJsonPath = join(TEST_DIR, 'package.json')
      writeFileSync(packageJsonPath, JSON.stringify({ name: 'test' }), 'utf-8')

      const result: ScannerResult = {
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
          },
        },
        assets: {
          javascript: [],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: 'static',
          buildTool: null,
          confidence: 'low',
          indicators: [],
        },
        timestamp: new Date().toISOString(),
        projectPath: TEST_DIR,
      }

      let cache: ScanCache | null = {
        version: '1.0.0',
        entries: {},
      }

      cache = updateCache(TEST_DIR, result, cache)
      saveCache(cache, cacheFile)

      const loadedCache = loadCache(cacheFile)
      expect(isCacheValid(TEST_DIR, loadedCache)).toBe(true)
    })

    it('should return false if file has changed', () => {
      const cacheFile = join(TEST_DIR, 'cache.json')
      const packageJsonPath = join(TEST_DIR, 'package.json')
      writeFileSync(packageJsonPath, JSON.stringify({ name: 'test' }), 'utf-8')

      const result: ScannerResult = {
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
          },
        },
        assets: {
          javascript: [],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: 'static',
          buildTool: null,
          confidence: 'low',
          indicators: [],
        },
        timestamp: new Date().toISOString(),
        projectPath: TEST_DIR,
      }

      let cache: ScanCache | null = {
        version: '1.0.0',
        entries: {},
      }

      cache = updateCache(TEST_DIR, result, cache)
      saveCache(cache, cacheFile)

      // Modifier package.json
      writeFileSync(packageJsonPath, JSON.stringify({ name: 'modified' }), 'utf-8')

      const loadedCache = loadCache(cacheFile)
      expect(isCacheValid(TEST_DIR, loadedCache)).toBe(false)
    })
  })

  describe('getCachedResult', () => {
    it('should return null if cache is null', () => {
      expect(getCachedResult(TEST_DIR, null)).toBeNull()
    })

    it('should return cached result', () => {
      const result: ScannerResult = {
        framework: {
          framework: 'react',
          confidence: 'high',
          confidenceScore: 90,
          indicators: ['package.json: react'],
          version: null,
          configuration: {
            language: 'typescript',
            cssInJs: [],
            stateManagement: [],
            buildTool: 'vite',
          },
        },
        assets: {
          javascript: [],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: 'spa',
          buildTool: 'vite',
          confidence: 'high',
          indicators: [],
        },
        timestamp: new Date().toISOString(),
        projectPath: TEST_DIR,
      }

      let cache: ScanCache | null = {
        version: '1.0.0',
        entries: {},
      }

      cache = updateCache(TEST_DIR, result, cache)
      const cachedResult = getCachedResult(TEST_DIR, cache)

      expect(cachedResult).not.toBeNull()
      expect(cachedResult?.framework.framework).toBe('react')
    })
  })

  describe('updateCache', () => {
    it('should create new cache entry', () => {
      const result: ScannerResult = {
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
          },
        },
        assets: {
          javascript: [],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: 'static',
          buildTool: null,
          confidence: 'low',
          indicators: [],
        },
        timestamp: new Date().toISOString(),
        projectPath: TEST_DIR,
      }

      const cache = updateCache(TEST_DIR, result, null)
      expect(cache.entries).toBeDefined()
      expect(Object.keys(cache.entries).length).toBe(1)
    })

    it('should update existing cache entry', () => {
      const result1: ScannerResult = {
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
          },
        },
        assets: {
          javascript: [],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: 'static',
          buildTool: null,
          confidence: 'low',
          indicators: [],
        },
        timestamp: new Date().toISOString(),
        projectPath: TEST_DIR,
      }

      let cache = updateCache(TEST_DIR, result1, null)

      const result2: ScannerResult = {
        ...result1,
        framework: {
          ...result1.framework,
          framework: 'react',
        },
      }

      cache = updateCache(TEST_DIR, result2, cache)
      expect(Object.keys(cache.entries).length).toBe(1) // Même clé, donc même entrée
    })
  })

  describe('cleanCache', () => {
    it('should remove expired entries', () => {
      const oldTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString() // 25 heures
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {
          'key1': {
            result: {
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
                },
              },
              assets: {
                javascript: [],
                css: [],
                images: [],
                fonts: [],
                apiRoutes: [],
              },
              architecture: {
                architecture: 'static',
                buildTool: null,
                confidence: 'low',
                indicators: [],
              },
              timestamp: oldTimestamp,
              projectPath: TEST_DIR,
            },
            timestamp: oldTimestamp,
            fileHashes: {},
            ttl: 24 * 60 * 60,
          },
        },
      }

      const cleaned = cleanCache(cache, 24 * 60 * 60)
      expect(cleaned).toBeNull() // Toutes les entrées expirées
    })

    it('should keep non-expired entries', () => {
      const recentTimestamp = new Date().toISOString()
      const cache: ScanCache = {
        version: '1.0.0',
        entries: {
          'key1': {
            result: {
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
                },
              },
              assets: {
                javascript: [],
                css: [],
                images: [],
                fonts: [],
                apiRoutes: [],
              },
              architecture: {
                architecture: 'static',
                buildTool: null,
                confidence: 'low',
                indicators: [],
              },
              timestamp: recentTimestamp,
              projectPath: TEST_DIR,
            },
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
      const result: ScannerResult = {
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
          },
        },
        assets: {
          javascript: [],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: 'static',
          buildTool: null,
          confidence: 'low',
          indicators: [],
        },
        timestamp: new Date().toISOString(),
        projectPath: TEST_DIR,
      }

      let cache = updateCache(TEST_DIR, result, null)
      expect(Object.keys(cache.entries).length).toBe(1)

      cache = removeCacheEntry(TEST_DIR, cache)
      expect(cache).toBeNull() // Cache vide après suppression
    })
  })
})

