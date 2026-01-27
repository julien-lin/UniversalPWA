import { describe, it, expect } from 'vitest'
import {
    PRESET_STRATEGIES,
    validateCachingStrategy,
    validateRouteConfig,
    validateServiceWorkerConfig,
    type CachingStrategy,
    type RouteConfig,
    type ServiceWorkerConfig,
} from './caching-strategy.js'

describe('caching-strategy', () => {
    describe('CachingStrategy', () => {
        it('should have CacheFirst strategy preset', () => {
            const strategy = PRESET_STRATEGIES.StaticAssets
            expect(strategy.name).toBe('CacheFirst')
            expect(strategy.cacheName).toBe('static-assets')
            expect(strategy.expiration?.maxAgeSeconds).toBe(31536000)
        })

        it('should have NetworkFirst strategy preset', () => {
            const strategy = PRESET_STRATEGIES.ApiEndpoints
            expect(strategy.name).toBe('NetworkFirst')
            expect(strategy.cacheName).toBe('api-cache')
            expect(strategy.networkTimeoutSeconds).toBe(3)
        })

        it('should have StaleWhileRevalidate strategy preset', () => {
            const strategy = PRESET_STRATEGIES.Images
            expect(strategy.name).toBe('StaleWhileRevalidate')
            expect(strategy.cacheName).toBe('image-cache')
        })

        it('should create custom CachingStrategy', () => {
            const strategy: CachingStrategy = {
                name: 'NetworkOnly',
                cacheName: 'custom-cache',
                networkTimeoutSeconds: 5,
            }

            expect(strategy.name).toBe('NetworkOnly')
            expect(strategy.cacheName).toBe('custom-cache')
            expect(strategy.networkTimeoutSeconds).toBe(5)
        })
    })

    describe('validateCachingStrategy', () => {
        it('should validate CacheFirst strategy', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should validate strategy with all properties', () => {
            const strategy: CachingStrategy = {
                name: 'NetworkFirst',
                cacheName: 'api',
                networkTimeoutSeconds: 3,
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 3600,
                },
                headers: { 'X-Custom': 'value' },
                workboxOptions: { customField: true },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should reject invalid strategy name', () => {
            const invalid = {
                name: 'InvalidStrategy',
                cacheName: 'test',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should reject missing cacheName', () => {
            const invalid = {
                name: 'CacheFirst',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should reject non-object', () => {
            expect(validateCachingStrategy('not an object')).toBe(false)
            expect(validateCachingStrategy(null)).toBe(false)
            expect(validateCachingStrategy(undefined)).toBe(false)
        })

        it('should reject invalid networkTimeoutSeconds', () => {
            const invalid = {
                name: 'NetworkFirst',
                cacheName: 'api',
                networkTimeoutSeconds: 'invalid',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should reject invalid expiration type', () => {
            const invalid = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: 'not-object',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should reject invalid expiration maxEntries type', () => {
            const invalid = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: {
                    maxEntries: 'not-a-number',
                },
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should reject invalid expiration maxAgeSeconds type', () => {
            const invalid = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: {
                    maxAgeSeconds: 'not-a-number',
                },
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should accept valid expiration with only maxEntries', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: {
                    maxEntries: 100,
                },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept valid expiration with only maxAgeSeconds', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: {
                    maxAgeSeconds: 3600,
                },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should reject invalid headers type', () => {
            const invalid = {
                name: 'CacheFirst',
                cacheName: 'test',
                headers: 'not-an-object',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should accept valid headers', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                headers: {
                    'Cache-Control': 'public, max-age=31536000',
                    'X-Custom-Header': 'value',
                },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept empty headers object', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                headers: {},
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept CacheOnly strategy', () => {
            const strategy: CachingStrategy = {
                name: 'CacheOnly',
                cacheName: 'offline-only',
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept NetworkOnly strategy', () => {
            const strategy: CachingStrategy = {
                name: 'NetworkOnly',
                cacheName: 'network-only',
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should validate all 5 strategy names', () => {
            const names = ['CacheFirst', 'NetworkFirst', 'StaleWhileRevalidate', 'NetworkOnly', 'CacheOnly']

            names.forEach((name) => {
                const strategy = {
                    name,
                    cacheName: 'test',
                }

                expect(validateCachingStrategy(strategy)).toBe(true)
            })
        })

        it('should reject case-sensitive invalid strategy name', () => {
            const invalid = {
                name: 'cachefirst',
                cacheName: 'test',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should reject missing name property', () => {
            const invalid = {
                cacheName: 'test',
            }

            expect(validateCachingStrategy(invalid)).toBe(false)
        })

        it('should validate with workboxOptions', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                workboxOptions: {
                    plugins: [],
                    customOption: 'value',
                },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept zero networkTimeoutSeconds', () => {
            const strategy: CachingStrategy = {
                name: 'NetworkFirst',
                cacheName: 'test',
                networkTimeoutSeconds: 0,
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept large networkTimeoutSeconds', () => {
            const strategy: CachingStrategy = {
                name: 'NetworkFirst',
                cacheName: 'test',
                networkTimeoutSeconds: 600,
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept zero maxEntries', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: {
                    maxEntries: 0,
                },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })

        it('should accept large maxEntries', () => {
            const strategy: CachingStrategy = {
                name: 'CacheFirst',
                cacheName: 'test',
                expiration: {
                    maxEntries: 10000,
                },
            }

            expect(validateCachingStrategy(strategy)).toBe(true)
        })
    })

    describe('validateRouteConfig', () => {
        it('should validate route with string pattern', () => {
            const route: RouteConfig = {
                pattern: '/api/**',
                strategy: PRESET_STRATEGIES.ApiEndpoints,
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should validate route with regex pattern', () => {
            const route: RouteConfig = {
                pattern: /^\/api\//,
                strategy: PRESET_STRATEGIES.ApiEndpoints,
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should validate route with all properties', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                description: 'JavaScript files',
                priority: 10,
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject missing pattern', () => {
            const invalid = {
                strategy: PRESET_STRATEGIES.StaticAssets,
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject missing strategy', () => {
            const invalid = {
                pattern: '*.js',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject invalid priority', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                priority: 'invalid',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject invalid patternType', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                patternType: 'invalid',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid patternType regex', () => {
            const route: RouteConfig = {
                pattern: /\.js$/,
                strategy: PRESET_STRATEGIES.StaticAssets,
                patternType: 'regex',
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should accept valid patternType glob', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                patternType: 'glob',
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject invalid TTL', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                ttl: 'invalid',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid TTL with maxAgeSeconds', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                ttl: {
                    maxAgeSeconds: 7200,
                },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should accept valid TTL with maxEntries', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                ttl: {
                    maxEntries: 100,
                },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject invalid TTL maxAgeSeconds', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                ttl: {
                    maxAgeSeconds: 'invalid',
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject invalid TTL maxEntries', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                ttl: {
                    maxEntries: 'invalid',
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject invalid dependencies', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                dependencies: 'not-array',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject dependencies with non-string values', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                dependencies: ['valid', 123],
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid dependencies', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                dependencies: ['*.css', '*.html'],
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject invalid conditions', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: 'not-object',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject invalid condition headers', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    headers: 'not-object',
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid condition headers', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    headers: { 'Accept': 'application/json' },
                },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject invalid condition methods', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    methods: 'not-array',
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject condition methods with non-string values', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    methods: ['GET', 123],
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid condition methods', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    methods: ['GET', 'POST'],
                },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject invalid condition origins', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    origins: 'not-array',
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should reject condition origins with non-string values', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    origins: ['https://example.com', 123],
                },
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid condition origins', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                conditions: {
                    origins: ['https://example.com', 'https://api.example.com'],
                },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should reject invalid workboxOptions', () => {
            const invalid = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                workboxOptions: 'not-object',
            }

            expect(validateRouteConfig(invalid)).toBe(false)
        })

        it('should accept valid workboxOptions', () => {
            const route: RouteConfig = {
                pattern: '*.js',
                strategy: PRESET_STRATEGIES.StaticAssets,
                workboxOptions: { customOption: 'value' },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })

        it('should validate route with all properties', () => {
            const route: RouteConfig = {
                pattern: /^\/api\//,
                patternType: 'regex',
                strategy: PRESET_STRATEGIES.ApiEndpoints,
                description: 'API endpoints',
                priority: 20,
                ttl: {
                    maxAgeSeconds: 3600,
                    maxEntries: 50,
                },
                dependencies: ['manifest.json'],
                conditions: {
                    headers: { 'Authorization': 'Bearer' },
                    methods: ['GET', 'POST'],
                    origins: ['https://api.example.com'],
                },
                workboxOptions: { customField: true },
            }

            expect(validateRouteConfig(route)).toBe(true)
        })
    })

    describe('validateServiceWorkerConfig', () => {
        it('should validate minimal config', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should validate full config', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                ],
                apiRoutes: [
                    {
                        pattern: '/api/**',
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
                imageRoutes: [
                    {
                        pattern: '*.png',
                        strategy: PRESET_STRATEGIES.Images,
                    },
                ],
                customRoutes: [
                    {
                        pattern: '/custom/**',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                ],
                offline: {
                    fallbackPage: '/offline.html',
                    fallbackImage: '/offline.png',
                },
                features: {
                    prefetch: true,
                    prerender: false,
                    isr: true,
                },
                securityHeaders: {
                    'X-Custom': 'value',
                },
                corsOrigins: ['https://example.com'],
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject missing destination', () => {
            const invalid = {
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject non-array routes', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: 'not-array',
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject invalid offline configuration', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: 123,
                },
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject invalid CORS origins', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                corsOrigins: [123, 'https://example.com'],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should allow optional customRoutes', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject invalid features field type', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                features: 'not-object',
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should accept all feature flags as true', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                features: {
                    prefetch: true,
                    prerender: true,
                    isr: true,
                    hydration: true,
                    streaming: true,
                },
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should accept mixed feature flags', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                features: {
                    prefetch: true,
                    prerender: false,
                    isr: true,
                    hydration: false,
                    streaming: true,
                },
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject invalid securityHeaders', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                securityHeaders: 'not-object',
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should accept valid securityHeaders', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                securityHeaders: {
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                },
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject non-array corsOrigins', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                corsOrigins: 'not-array',
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject corsOrigins with mixed types', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                corsOrigins: ['https://example.com', 123, true],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should accept multiple corsOrigins', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                corsOrigins: [
                    'https://example.com',
                    'https://api.example.com',
                    'https://cdn.example.com',
                ],
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject invalid offline configuration type', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: 'not-object',
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject offline with invalid fallbackPage type', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: 123,
                },
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject offline with invalid fallbackImage type', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackImage: true,
                },
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should accept offline with both fallback pages', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: '/offline.html',
                    fallbackImage: '/offline.png',
                },
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject invalid customRoutes array content', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                customRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                    'not-a-route-config',
                ],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should accept complex customRoutes', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                customRoutes: [
                    {
                        pattern: '/service-worker/**',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                        priority: 100,
                    },
                    {
                        pattern: /^\/admin\//,
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })

        it('should reject missing staticRoutes array', () => {
            const invalid = {
                destination: 'sw.js',
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject missing apiRoutes array', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject missing imageRoutes array', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject invalid route in staticRoutes', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                    {
                        pattern: '*.css',
                        // missing strategy
                    },
                ],
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject invalid route in apiRoutes', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [
                    {
                        // missing pattern
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
                imageRoutes: [],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should reject invalid route in imageRoutes', () => {
            const invalid = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [
                    {
                        pattern: '*.png',
                        strategy: {
                            name: 'InvalidStrategy',
                            cacheName: 'images',
                        },
                    },
                ],
            }

            expect(validateServiceWorkerConfig(invalid)).toBe(false)
        })

        it('should validate with multiple routes in all categories', () => {
            const config: ServiceWorkerConfig = {
                destination: 'public/sw.js',
                staticRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                    {
                        pattern: '*.css',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                ],
                apiRoutes: [
                    {
                        pattern: '/api/**',
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                    {
                        pattern: /^\/graphql/,
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
                imageRoutes: [
                    {
                        pattern: '*.png',
                        strategy: PRESET_STRATEGIES.Images,
                    },
                    {
                        pattern: '*.jpg',
                        strategy: PRESET_STRATEGIES.Images,
                    },
                    {
                        pattern: '*.webp',
                        strategy: PRESET_STRATEGIES.Images,
                    },
                ],
            }

            expect(validateServiceWorkerConfig(config)).toBe(true)
        })
    })

    describe('PRESET_STRATEGIES', () => {
        it('should provide all standard strategies', () => {
            expect(PRESET_STRATEGIES.StaticAssets).toBeDefined()
            expect(PRESET_STRATEGIES.ApiEndpoints).toBeDefined()
            expect(PRESET_STRATEGIES.Images).toBeDefined()
            expect(PRESET_STRATEGIES.HtmlPages).toBeDefined()
            expect(PRESET_STRATEGIES.FontFiles).toBeDefined()
        })

        it('should all be valid CachingStrategy', () => {
            Object.values(PRESET_STRATEGIES).forEach((strategy) => {
                expect(validateCachingStrategy(strategy)).toBe(true)
            })
        })

        it('StaticAssets should cache for 1 year', () => {
            expect(PRESET_STRATEGIES.StaticAssets.expiration?.maxAgeSeconds).toBe(31536000)
        })

        it('Images should cache for 30 days', () => {
            expect(PRESET_STRATEGIES.Images.expiration?.maxAgeSeconds).toBe(2592000)
        })

        it('ApiEndpoints should timeout at 3 seconds', () => {
            expect(PRESET_STRATEGIES.ApiEndpoints.networkTimeoutSeconds).toBe(3)
        })
    })
})
