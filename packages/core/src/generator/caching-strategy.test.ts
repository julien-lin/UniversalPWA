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
