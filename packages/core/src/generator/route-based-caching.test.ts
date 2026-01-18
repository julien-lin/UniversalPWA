/**
 * Tests for Route-based Caching Advanced Features
 */

import { describe, it, expect } from 'vitest'
import { RoutePatternResolver } from './route-pattern-resolver.js'
import { PRESET_STRATEGIES } from './caching-strategy.js'
import type { RouteConfig } from './caching-strategy.js'

describe('route-based-caching-advanced', () => {
  describe('patternType support', () => {
    it('should handle explicit regex pattern type', () => {
      const route: RouteConfig = {
        pattern: '^/api/v1/.*$',
        patternType: 'regex',
        strategy: PRESET_STRATEGIES.ApiEndpoints,
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].urlPattern.test('/api/v1/users')).toBe(true)
      expect(workboxRoutes[0].urlPattern.test('/api/v2/users')).toBe(false)
    })

    it('should handle explicit glob pattern type', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        patternType: 'glob',
        strategy: PRESET_STRATEGIES.ApiEndpoints,
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].urlPattern.test('/api/users')).toBe(true)
      expect(workboxRoutes[0].urlPattern.test('/api/v1/users')).toBe(true)
    })

    it('should auto-detect glob pattern with wildcards', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        // patternType not specified - should auto-detect as glob
        strategy: PRESET_STRATEGIES.ApiEndpoints,
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].urlPattern.test('/api/users')).toBe(true)
    })

    it('should handle RegExp pattern directly', () => {
      const route: RouteConfig = {
        pattern: /^\/api\/v\d+\/.*$/,
        strategy: PRESET_STRATEGIES.ApiEndpoints,
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].urlPattern.test('/api/v1/users')).toBe(true)
      expect(workboxRoutes[0].urlPattern.test('/api/v2/users')).toBe(true)
      expect(workboxRoutes[0].urlPattern.test('/api/users')).toBe(false)
    })
  })

  describe('TTL override', () => {
    it('should use route TTL when provided', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          expiration: {
            maxAgeSeconds: 3600, // 1 hour (from strategy)
            maxEntries: 100,
          },
        },
        ttl: {
          maxAgeSeconds: 600, // 10 minutes (override)
          maxEntries: 50,
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.expiration).toEqual({
        maxAgeSeconds: 600, // Should use route TTL
        maxEntries: 50,
      })
    })

    it('should use strategy expiration when route TTL not provided', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          expiration: {
            maxAgeSeconds: 3600,
            maxEntries: 100,
          },
        },
        // No ttl override
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.expiration).toEqual({
        maxAgeSeconds: 3600,
        maxEntries: 100,
      })
    })
  })

  describe('cache name prefix', () => {
    it('should apply cache name prefix from global config', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          cacheName: 'api-cache',
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route], {
        cacheNamePrefix: 'pwa-',
      })

      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.cacheName).toBe('pwa-api-cache')
    })

    it('should not apply prefix when not provided', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          cacheName: 'api-cache',
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])

      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.cacheName).toBe('api-cache')
    })
  })

  describe('conditions', () => {
    it('should include methods in workbox options', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: PRESET_STRATEGIES.ApiEndpoints,
        conditions: {
          methods: ['GET', 'POST'],
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.method).toEqual(['GET', 'POST'])
    })

    it('should include origins in workbox options', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: PRESET_STRATEGIES.ApiEndpoints,
        conditions: {
          origins: ['https://api.example.com', 'https://api2.example.com'],
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.origin).toEqual([
        'https://api.example.com',
        'https://api2.example.com',
      ])
    })
  })

  describe('workboxOptions', () => {
    it('should merge route workboxOptions', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          workboxOptions: {
            customOption: 'strategy-value',
          },
        },
        workboxOptions: {
          customOption: 'route-value', // Should override
          anotherOption: 'route-only',
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.customOption).toBe('route-value')
      expect(workboxRoutes[0].options?.anotherOption).toBe('route-only')
    })

    it('should use strategy workboxOptions when route options not provided', () => {
      const route: RouteConfig = {
        pattern: '/api/**',
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          workboxOptions: {
            customOption: 'strategy-value',
          },
        },
      }

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat([route])
      expect(workboxRoutes.length).toBe(1)
      expect(workboxRoutes[0].options?.customOption).toBe('strategy-value')
    })
  })

  describe('priority handling', () => {
    it('should sort routes by priority in workbox format', () => {
      const routes: RouteConfig[] = [
        {
          pattern: '/static/**',
          priority: 10,
          strategy: PRESET_STRATEGIES.StaticAssets,
        },
        {
          pattern: '/api/**',
          priority: 50,
          strategy: PRESET_STRATEGIES.ApiEndpoints,
        },
        {
          pattern: '/admin/**',
          priority: 100,
          strategy: {
            name: 'NetworkOnly',
            cacheName: 'admin',
          },
        },
      ]

      const workboxRoutes = RoutePatternResolver.toWorkboxFormat(routes)

      // Should be sorted by priority (highest first)
      expect(workboxRoutes[0].urlPattern.test('/admin/users')).toBe(true)
      expect(workboxRoutes[1].urlPattern.test('/api/users')).toBe(true)
      expect(workboxRoutes[2].urlPattern.test('/static/app.js')).toBe(true)
    })
  })

  describe('dependencies tracking', () => {
    it('should preserve dependencies in route config', () => {
      const route: RouteConfig = {
        pattern: '/app.js',
        strategy: PRESET_STRATEGIES.StaticAssets,
        dependencies: ['/app.css', '/vendor.js'],
      }

      // Dependencies are metadata, not used in Workbox format directly
      // But should be preserved in RouteConfig
      expect(route.dependencies).toEqual(['/app.css', '/vendor.js'])
    })
  })
})
