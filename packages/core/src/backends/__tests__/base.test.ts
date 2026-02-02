/**
 * Tests for Backend Integration Layer
 * Basic structure and interface validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { ServiceWorkerConfig } from '../../generator/caching-strategy.js'
import { PRESET_STRATEGIES } from '../../generator/caching-strategy.js'
import { BaseBackendIntegration } from '../base.js'
import { resetBackendFactory } from '../factory.js'

/**
 * Mock implementation for testing
 */
class MockBackendIntegration extends BaseBackendIntegration {
    readonly id = 'mock'
    readonly name = 'Mock Backend'
    readonly framework = 'static' as const
    readonly language = 'javascript' as const

    detect() {
        return {
            detected: true,
            framework: 'static' as const,
            language: 'javascript' as const,
            confidence: 'high' as const,
            indicators: ['mock detected'],
        }
    }

    generateServiceWorkerConfig(): ServiceWorkerConfig {
        return {
            destination: 'public/sw.js',
            staticRoutes: this.defaultStaticRoutes,
            apiRoutes: this.defaultApiRoutes,
            imageRoutes: this.defaultImageRoutes,
        }
    }

    generateManifestVariables() {
        return {
            appName: 'Mock App',
            appDescription: 'Mock description',
        }
    }

    getStartUrl() {
        return '/'
    }

    async validateSetup() {

        async function _validate() { }
        await _validate()
        return {
            isValid: true,
            errors: [],
            warnings: [],
            suggestions: [],
        }
    }
}

describe('Backend Integration Layer', () => {
    beforeEach(() => {
        resetBackendFactory()
    })

    describe('BackendIntegration Interface', () => {
        it('should implement required properties', () => {
            const integration = new MockBackendIntegration()

            expect(integration.id).toBe('mock')
            expect(integration.name).toBe('Mock Backend')
            expect(integration.framework).toBe('static')
            expect(integration.language).toBe('javascript')
        })

        it('should implement detect() method', () => {
            const integration = new MockBackendIntegration()
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('static')
            expect(result.confidence).toBe('high')
            expect(result.indicators).toHaveLength(1)
        })

        it('should generate Service Worker config', () => {
            const integration = new MockBackendIntegration()
            const config = integration.generateServiceWorkerConfig()

            expect(config.destination).toBe('public/sw.js')
            expect(config.staticRoutes).toBeDefined()
            expect(config.apiRoutes).toBeDefined()
            expect(config.imageRoutes).toBeDefined()
        })

        it('should generate manifest variables', () => {
            const integration = new MockBackendIntegration()
            const vars = integration.generateManifestVariables()

            expect(vars.appName).toBe('Mock App')
            expect(vars.appDescription).toBeDefined()
        })

        it('should return start URL', () => {
            const integration = new MockBackendIntegration()
            expect(integration.getStartUrl()).toBe('/')
        })

        it('should provide middleware injection info', () => {
            const integration = new MockBackendIntegration()
            const middleware = integration.injectMiddleware()

            expect(middleware.code).toBeDefined()
            expect(middleware.path).toBeDefined()
            expect(middleware.language).toBe('javascript')
            expect(middleware.instructions).toBeDefined()
            expect(Array.isArray(middleware.instructions)).toBe(true)
        })

        it('should return secure routes', () => {
            const integration = new MockBackendIntegration()
            const routes = integration.getSecureRoutes()

            expect(Array.isArray(routes)).toBe(true)
            expect(routes.length).toBeGreaterThan(0)
        })

        it('should return API patterns', () => {
            const integration = new MockBackendIntegration()
            const patterns = integration.getApiPatterns()

            expect(Array.isArray(patterns)).toBe(true)
            expect(patterns.some(p => p.includes('api'))).toBe(true)
        })

        it('should return static asset patterns', () => {
            const integration = new MockBackendIntegration()
            const patterns = integration.getStaticAssetPatterns()

            expect(Array.isArray(patterns)).toBe(true)
            expect(patterns.length).toBeGreaterThan(0)
        })

        it('should validate setup', async () => {
            const integration = new MockBackendIntegration()
            const result = await integration.validateSetup()

            expect(result.isValid).toBeDefined()
            expect(Array.isArray(result.errors)).toBe(true)
            expect(Array.isArray(result.warnings)).toBe(true)
            expect(Array.isArray(result.suggestions)).toBe(true)
        })
    })

    describe('ServiceWorkerConfig Structure', () => {
        it('should have required route categories', () => {
            const config: ServiceWorkerConfig = {
                destination: 'public/sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(config.staticRoutes).toBeDefined()
            expect(config.apiRoutes).toBeDefined()
            expect(config.imageRoutes).toBeDefined()
        })

        it('should support custom routes', () => {
            const config: ServiceWorkerConfig = {
                destination: 'public/sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                customRoutes: [
                    {
                        pattern: '/custom/**',
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
            }

            expect(config.customRoutes).toHaveLength(1)
            expect(config.customRoutes![0].pattern).toBe('/custom/**')
        })

        it('should support offline configuration', () => {
            const config: ServiceWorkerConfig = {
                destination: 'public/sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                offline: {
                    fallbackPage: '/offline.html',
                    fallbackImage: '/images/offline.png',
                },
            }

            expect(config.offline?.fallbackPage).toBe('/offline.html')
            expect(config.offline?.fallbackImage).toBe('/images/offline.png')
        })

        it('should support feature flags', () => {
            const config: ServiceWorkerConfig = {
                destination: 'public/sw.js',
                staticRoutes: [],
                apiRoutes: [],
                imageRoutes: [],
                features: {
                    prefetch: true,
                    isr: true,
                    hydration: false,
                },
            }

            expect(config.features?.prefetch).toBe(true)
            expect(config.features?.isr).toBe(true)
            expect(config.features?.hydration).toBe(false)
        })

        it('should support route patterns with regex', () => {
            const config: ServiceWorkerConfig = {
                destination: 'public/sw.js',
                staticRoutes: [
                    {
                        pattern: /^\/api\/v\d+/,
                        strategy: PRESET_STRATEGIES.ApiEndpoints,
                    },
                ],
                apiRoutes: [],
                imageRoutes: [],
            }

            expect(config.staticRoutes[0].pattern instanceof RegExp).toBe(true)
        })
    })

    describe('Route Pattern Validation', () => {
        it('should support string patterns', () => {
            const pattern = {
                pattern: '/api/**',
                strategy: PRESET_STRATEGIES.ApiEndpoints,
            }

            expect(typeof pattern.pattern).toBe('string')
            expect(pattern.strategy.name).toBe('NetworkFirst')
        })

        it('should support regex patterns', () => {
            const pattern = {
                pattern: /^\/api\//,
                strategy: PRESET_STRATEGIES.ApiEndpoints,
            }

            expect(pattern.pattern instanceof RegExp).toBe(true)
        })

        it('should support expiration config', () => {
            const pattern = {
                pattern: '/cache/**',
                strategy: PRESET_STRATEGIES.StaticAssets,
            }

            expect(pattern.strategy.expiration?.maxAgeSeconds).toBeDefined()
        })

        it('should support custom headers', () => {
            const pattern = {
                pattern: '/api/**',
                strategy: PRESET_STRATEGIES.ApiEndpoints,
            }

            expect(pattern.strategy.name).toBe('NetworkFirst')
        })
    })

    describe('Default Route Patterns', () => {
        it('should provide default static routes', () => {
            const integration = new MockBackendIntegration()

            expect(integration['defaultStaticRoutes']).toBeDefined()
            expect(Array.isArray(integration['defaultStaticRoutes'])).toBe(true)
        })

        it('should provide default API routes', () => {
            const integration = new MockBackendIntegration()

            expect(integration['defaultApiRoutes']).toBeDefined()
            expect(Array.isArray(integration['defaultApiRoutes'])).toBe(true)
        })

        it('should provide default image routes', () => {
            const integration = new MockBackendIntegration()

            expect(integration['defaultImageRoutes']).toBeDefined()
            expect(Array.isArray(integration['defaultImageRoutes'])).toBe(true)
        })

        it('static routes should use CacheFirst strategy', () => {
            const integration = new MockBackendIntegration()

            integration['defaultStaticRoutes'].forEach(route => {
                expect(route.strategy.name).toBe('CacheFirst')
            })
        })

        it('API routes should use NetworkFirst strategy', () => {
            const integration = new MockBackendIntegration()

            integration['defaultApiRoutes'].forEach(route => {
                expect(route.strategy.name).toBe('NetworkFirst')
            })
        })

        it('image routes should use StaleWhileRevalidate strategy', () => {
            const integration = new MockBackendIntegration()

            integration['defaultImageRoutes'].forEach(route => {
                expect(route.strategy.name).toBe('StaleWhileRevalidate')
            })
        })
    })
})
