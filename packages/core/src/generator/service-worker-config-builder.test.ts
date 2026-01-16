import { describe, it, expect } from 'vitest'
import { ServiceWorkerConfigBuilder } from './service-worker-config-builder.js'
import { PRESET_STRATEGIES, type ServiceWorkerConfig, type RouteConfig } from './caching-strategy.js'
import type { BackendIntegration } from '../backends/types.js'

// Mock BackendIntegration for testing
const mockBackendIntegration = (overrides?: Partial<BackendIntegration>): BackendIntegration => ({
    id: 'test-backend',
    name: 'Test Backend',
    framework: 'static' as const,
    language: 'javascript' as const,
    detect: async () => {

        async function _detect() { }
        await _detect()
        return { detected: true, framework: 'static', language: 'javascript', confidence: 'high', indicators: [] }
    },
    generateServiceWorkerConfig: () => ({
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
    }),
    generateManifestVariables: () => ({ name: 'Test App' }),
    getStartUrl: () => '/',
    injectMiddleware: () => ({
        code: 'middleware code',
        path: 'src/middleware.ts',
        language: 'typescript',
        instructions: ['Add to app'],
    }),
    getSecureRoutes: () => ['/admin', '/api/auth'],
    getApiPatterns: () => ['/api/**'],
    getStaticAssetPatterns: () => ['*.js', '*.css'],
    validateSetup: async () => {

        async function _validate() { }
        await _validate()
        return { isValid: true, errors: [], warnings: [], suggestions: [] }
    },
    ...overrides,
} as BackendIntegration)

describe('ServiceWorkerConfigBuilder', () => {
    describe('fromBackendIntegration', () => {
        it('should create config from backend integration', () => {
            const backend = mockBackendIntegration()
            const config = ServiceWorkerConfigBuilder.fromBackendIntegration(backend, 'sw.js')

            expect(config.destination).toBe('sw.js')
            expect(config.staticRoutes).toHaveLength(1)
            expect(config.apiRoutes).toHaveLength(1)
            expect(config.imageRoutes).toHaveLength(1)
        })

        it('should apply custom options', () => {
            const backend = mockBackendIntegration()
            const customRoutes: RouteConfig[] = [
                {
                    pattern: '/custom/**',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                },
            ]

            const config = ServiceWorkerConfigBuilder.fromBackendIntegration(backend, 'sw.js', {
                customRoutes,
            })

            expect(config.customRoutes).toHaveLength(1)
            expect(config.customRoutes?.[0].pattern).toBe('/custom/**')
        })

        it('should apply offline configuration', () => {
            const backend = mockBackendIntegration()
            const config = ServiceWorkerConfigBuilder.fromBackendIntegration(backend, 'sw.js', {
                offline: {
                    fallbackPage: '/offline.html',
                    fallbackImage: '/offline.png',
                },
            })

            expect(config.offline?.fallbackPage).toBe('/offline.html')
            expect(config.offline?.fallbackImage).toBe('/offline.png')
        })

        it('should apply feature flags', () => {
            const backend = mockBackendIntegration()
            const config = ServiceWorkerConfigBuilder.fromBackendIntegration(backend, 'sw.js', {
                features: {
                    prefetch: true,
                    isr: true,
                },
            })

            expect(config.features?.prefetch).toBe(true)
            expect(config.features?.isr).toBe(true)
        })

        it('should deduplicate routes by default', () => {
            const backend = mockBackendIntegration(
                {
                    generateServiceWorkerConfig: () => ({
                        destination: 'sw.js',
                        staticRoutes: [
                            {
                                pattern: '*.js',
                                strategy: PRESET_STRATEGIES.StaticAssets,
                            },
                            {
                                pattern: '*.js',
                                strategy: PRESET_STRATEGIES.StaticAssets,
                            },
                        ],
                        apiRoutes: [],
                        imageRoutes: [],
                    }),
                },
            )

            const config = ServiceWorkerConfigBuilder.fromBackendIntegration(backend, 'sw.js', {
                deduplicateRoutes: true,
            })

            expect(config.staticRoutes).toHaveLength(1)
        })
    })

    describe('merge', () => {
        it('should merge two configs', () => {
            const config1: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                ],
                apiRoutes: [],
                imageRoutes: [],
            }

            const config2: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [
                    {
                        pattern: '/api/**',
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
                imageRoutes: [],
            }

            const merged = ServiceWorkerConfigBuilder.merge(config1, config2)

            expect(merged.staticRoutes).toHaveLength(1)
            expect(merged.apiRoutes).toHaveLength(1)
        })

        it('should give precedence to later configs', () => {
            const config1: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: '/offline1.html',
                },
            }

            const config2: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: '/offline2.html',
                },
            }

            const merged = ServiceWorkerConfigBuilder.merge(config1, config2)

            expect(merged.offline?.fallbackPage).toBe('/offline2.html')
        })

        it('should throw on empty merge', () => {
            expect(() => ServiceWorkerConfigBuilder.merge()).toThrow()
        })

        it('should handle single config', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            }

            const result = ServiceWorkerConfigBuilder.merge(config)

            expect(result.destination).toBe('sw.js')
        })
    })

    describe('create (fluent API)', () => {
        it('should create builder instance', () => {
            const builder = ServiceWorkerConfigBuilder.create('sw.js')

            expect(builder).toBeDefined()
            expect(typeof builder.addStaticRoutes).toBe('function')
            expect(typeof builder.build).toBe('function')
        })

        it('should build config with fluent API', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .addStaticRoutes({
                    pattern: '*.js',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                })
                .addApiRoutes({
                    pattern: '/api/**',
                    strategy: PRESET_STRATEGIES.ApiEndpoints,
                })
                .setOffline('/offline.html', '/offline.png')
                .build()

            expect(config.destination).toBe('sw.js')
            expect(config.staticRoutes).toHaveLength(1)
            expect(config.apiRoutes).toHaveLength(1)
            expect(config.offline?.fallbackPage).toBe('/offline.html')
        })

        it('should add multiple routes at once', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .addStaticRoutes(
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                    {
                        pattern: '*.css',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                )
                .build()

            expect(config.staticRoutes).toHaveLength(2)
        })

        it('should set CORS origins', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .setCorsOrigins('https://example.com', 'https://api.example.com')
                .build()

            expect(config.corsOrigins).toHaveLength(2)
            expect(config.corsOrigins).toContain('https://example.com')
        })

        it('should build and validate in one call', () => {
            const { config, validation } = ServiceWorkerConfigBuilder.create('sw.js')
                .addStaticRoutes({
                    pattern: '*.js',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                })
                .addApiRoutes({
                    pattern: '/api/**',
                    strategy: PRESET_STRATEGIES.ApiEndpoints,
                })
                .buildAndValidate()

            expect(config.destination).toBe('sw.js')
            // Config should be valid with both static and API routes
            expect(validation.isValid).toBe(true)
        })
    })

    describe('validate', () => {
        it('should validate valid config', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                ],
                apiRoutes: [],
                imageRoutes: [],
            }

            const validation = ServiceWorkerConfigBuilder.validate(config)

            expect(validation.isValid).toBe(true)
            expect(validation.errors).toHaveLength(0)
        })

        it('should report missing destination', () => {
            const config = {
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            } as Record<string, unknown>

            const validation = ServiceWorkerConfigBuilder.validate(config)

            expect(validation.isValid).toBe(false)
            expect(validation.errors.some((e) => e.includes('destination'))).toBe(true)
        })

        it('should report missing route arrays', () => {
            const config = {
                destination: 'sw.js',
                staticRoutes: 'not-array',
                apiRoutes: [],
                imageRoutes: [],
            } as Record<string, unknown>

            const validation = ServiceWorkerConfigBuilder.validate(config)

            expect(validation.isValid).toBe(false)
            expect(validation.errors.some((e) => e.includes('staticRoutes'))).toBe(true)
        })

        it('should warn about empty routes', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            }

            const validation = ServiceWorkerConfigBuilder.validate(config)

            expect(validation.warnings.some((w) => w.includes('No routes'))).toBe(true)
        })

        it('should warn about duplicate patterns', () => {
            const config: ServiceWorkerConfig = {
                destination: 'sw.js',
                staticRoutes: [
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                    {
                        pattern: '*.js',
                        strategy: PRESET_STRATEGIES.StaticAssets,
                    },
                ],
                apiRoutes: [],
                imageRoutes: [],
            }

            const validation = ServiceWorkerConfigBuilder.validate(config)

            expect(validation.warnings.some((w) => w.includes('duplicate'))).toBe(true)
        })

        it('should validate offline configuration', () => {
            const config: ServiceWorkerConfig & Record<string, unknown> = {
                destination: 'sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: 123 as Record<string, unknown>,
                },
            }

            const validation = ServiceWorkerConfigBuilder.validate(config)

            expect(validation.isValid).toBe(false)
            expect(validation.errors.some((e) => e.includes('offline'))).toBe(true)
        })
    })

    describe('createDefault', () => {
        it('should create default config', () => {
            const config = ServiceWorkerConfigBuilder.createDefault('sw.js')

            expect(config.destination).toBe('sw.js')
            expect(config.staticRoutes.length).toBeGreaterThan(0)
            expect(config.apiRoutes.length).toBeGreaterThan(0)
            expect(config.imageRoutes.length).toBeGreaterThan(0)
        })

        it('should include offline fallback', () => {
            const config = ServiceWorkerConfigBuilder.createDefault('sw.js')

            expect(config.offline?.fallbackPage).toBe('/offline.html')
        })

        it('should have proper priorities', () => {
            const config = ServiceWorkerConfigBuilder.createDefault('sw.js')

            const allRoutes = [
                ...config.staticRoutes,
                ...config.apiRoutes,
                ...config.imageRoutes,
            ]

            const withPriority = allRoutes.filter((r) => r.priority !== undefined)
            expect(withPriority.length).toBeGreaterThan(0)
        })
    })

    describe('ConfigBuilderInstance methods', () => {
        it('addImageRoutes should add to imageRoutes', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .addImageRoutes({
                    pattern: '*.webp',
                    strategy: PRESET_STRATEGIES.Images,
                })
                .build()

            expect(config.imageRoutes).toHaveLength(1)
        })

        it('addCustomRoutes should add to customRoutes', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .addCustomRoutes({
                    pattern: '/special/**',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                })
                .build()

            expect(config.customRoutes).toHaveLength(1)
        })

        it('setSecurityHeaders should set headers', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .setSecurityHeaders({
                    'X-Custom-Header': 'value',
                    'Cache-Control': 'max-age=3600',
                })
                .build()

            expect(config.securityHeaders?.['X-Custom-Header']).toBe('value')
            expect(config.securityHeaders?.['Cache-Control']).toBe('max-age=3600')
        })

        it('setFeatures should set feature flags', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .setFeatures({
                    prefetch: true,
                    prerender: false,
                    isr: true,
                    hydration: true,
                    streaming: false,
                })
                .build()

            expect(config.features?.prefetch).toBe(true)
            expect(config.features?.isr).toBe(true)
            expect(config.features?.prerender).toBe(false)
        })

        it('should chain multiple additions', () => {
            const config = ServiceWorkerConfigBuilder.create('sw.js')
                .addStaticRoutes({
                    pattern: '*.js',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                })
                .addStaticRoutes({
                    pattern: '*.css',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                })
                .addApiRoutes({
                    pattern: '/api/**',
                    strategy: PRESET_STRATEGIES.ApiEndpoints,
                })
                .addImageRoutes({
                    pattern: '*.png',
                    strategy: PRESET_STRATEGIES.Images,
                })
                .addCustomRoutes({
                    pattern: '/custom/**',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                })
                .setOffline('/offline.html')
                .setSecurityHeaders({ 'X-Custom': 'test' })
                .build()

            expect(config.staticRoutes).toHaveLength(2)
            expect(config.apiRoutes).toHaveLength(1)
            expect(config.imageRoutes).toHaveLength(1)
            expect(config.customRoutes).toHaveLength(1)
            expect(config.offline?.fallbackPage).toBe('/offline.html')
            expect(config.securityHeaders?.['X-Custom']).toBe('test')
        })
    })
})
