import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LaravelIntegration } from '../laravel.js'
import { existsSync, readFileSync } from 'node:fs'

// Mock fs module
vi.mock('node:fs')

describe('LaravelIntegration', () => {
    let integration: LaravelIntegration
    const projectRoot = '/test/laravel'

    beforeEach(() => {
        integration = new LaravelIntegration(projectRoot)
        vi.clearAllMocks()
    })

    describe('detect()', () => {
        it('should detect Laravel 11 project', () => {
            const composerJson = {
                require: {
                    'laravel/framework': '^11.0',
                },
            }

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('composer.json') ||
                    pathStr.includes('artisan') ||
                    pathStr.includes('config') ||
                    pathStr.includes('app')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('composer.json')) {
                    return JSON.stringify(composerJson)
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('laravel')
            expect(result.language).toBe('php')
            expect(result.confidence).toBe('high')
        })

        it('should detect Laravel 12 project', () => {
            const composerJson = {
                require: {
                    'laravel/framework': '^12.0',
                },
            }

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('composer.json') ||
                    pathStr.includes('artisan') ||
                    pathStr.includes('config') ||
                    pathStr.includes('app')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('composer.json')) {
                    return JSON.stringify(composerJson)
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('laravel')
            expect(result.language).toBe('php')
            expect(result.confidence).toBe('high')
            expect(result.versions?.[0]).toMatch(/^12\./)
        })

        it('should detect Laravel 10 project', () => {
            const composerJson = {
                require: {
                    'laravel/framework': '^10.0',
                },
            }

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('composer.json') ||
                    pathStr.includes('artisan') ||
                    pathStr.includes('config') ||
                    pathStr.includes('app')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('composer.json')) {
                    return JSON.stringify(composerJson)
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('laravel')
        })

        it('should NOT detect non-Laravel projects', () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = integration.detect()

            expect(result.detected).toBe(false)
            expect(result.framework).toBeNull()
            expect(result.confidence).toBe('low')
        })

        it('should detect Laravel without artisan file but with valid composer.json', () => {
            const composerJson = {
                require: {
                    'laravel/framework': '^11.0',
                },
            }

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                // No artisan file
                if (pathStr.includes('artisan')) return false
                // But has composer.json and other Laravel dirs
                return pathStr.includes('composer.json') || pathStr.includes('config') || pathStr.includes('app')
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('composer.json')) {
                    return JSON.stringify(composerJson)
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
        })

        it('should handle corrupted composer.json gracefully', () => {
            vi.mocked(existsSync).mockReturnValue(true)
            vi.mocked(readFileSync).mockReturnValue('invalid json {')

            const result = integration.detect()

            expect(result.detected).toBe(false)
            expect(result.framework).toBeNull()
        })

        it('should detect SPA mode with Vite + Vue', () => {
            const composerJson = {
                require: {
                    'laravel/framework': '^11.0',
                },
            }

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('composer.json') ||
                    pathStr.includes('artisan') ||
                    pathStr.includes('vite.config') ||
                    pathStr.includes('config') ||
                    pathStr.includes('app')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                if (pathStr.includes('composer.json')) {
                    return JSON.stringify(composerJson)
                }
                if (pathStr.includes('vite.config')) {
                    return "import vue from '@vitejs/plugin-vue'"
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.indicators).toContain('SPA mode (Vue/React/Inertia)')
        })

        it('should detect Livewire integration', () => {
            const composerJson = {
                require: {
                    'laravel/framework': '^11.0',
                    'livewire/livewire': '^3.0',
                },
            }

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('composer.json') ||
                    pathStr.includes('artisan') ||
                    pathStr.includes('config') ||
                    pathStr.includes('app')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('composer.json')) {
                    return JSON.stringify(composerJson)
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.indicators).toContain('Livewire')
        })
    })

    describe('generateServiceWorkerConfig()', () => {
        it('should generate config for SPA mode', () => {
            integration = new LaravelIntegration(projectRoot, { isSPA: true })
            const config = integration.generateServiceWorkerConfig()

            expect(config.destination).toBe('public/sw.js')
            expect(config.apiRoutes).toContainEqual(
                expect.objectContaining({
                    pattern: '/api/**',
                })
            )
            expect(config.features?.hydration).toBe(true)
        })

        it('should generate config for traditional server-rendered mode', () => {
            integration = new LaravelIntegration(projectRoot, { isSPA: false })
            const config = integration.generateServiceWorkerConfig()

            expect(config.destination).toBe('public/sw.js')
            expect(config.staticRoutes).toBeDefined()
        })

        it('should include Livewire route when enabled', () => {
            integration = new LaravelIntegration(projectRoot, { isSPA: true, isLivewire: true })
            const config = integration.generateServiceWorkerConfig()

            const livewireRoute = config.customRoutes?.find((r) =>
                typeof r.pattern === 'string'
                    ? r.pattern.includes('livewire')
                    : r.pattern.toString().includes('livewire')
            )
            expect(livewireRoute).toBeDefined()
            expect(livewireRoute?.priority).toBe(15)
        })
    })

    describe('generateManifestVariables()', () => {
        it('should return default manifest variables', () => {
            const manifest = integration.generateManifestVariables()

            expect(manifest.name).toBeDefined()
            expect(manifest.short_name).toBeDefined()
            expect(manifest.start_url).toBe('/')
            expect(manifest.scope).toBe('/')
            expect(manifest.display).toBe('standalone')
            expect(manifest.theme_color).toBe('#3B82F6')
        })

        it('should use APP_NAME from environment', () => {
            const originalEnv = process.env.APP_NAME
            process.env.APP_NAME = 'My Laravel App'

            const manifest = integration.generateManifestVariables()

            expect(manifest.name).toBe('My Laravel App')
            process.env.APP_NAME = originalEnv
        })
    })

    describe('injectMiddleware()', () => {
        it('should return middleware code', () => {
            const middleware = integration.injectMiddleware()

            expect(middleware.code).toContain('PWAMiddleware')
            expect(middleware.code).toContain('namespace App\\Http\\Middleware')
            expect(middleware.path).toBe('app/Http/Middleware/PWAMiddleware.php')
            expect(middleware.language).toBe('php')
            expect(middleware.instructions).toBeDefined()
            expect(middleware.instructions.length).toBeGreaterThan(0)
        })

        it('should handle manifest.json caching in middleware', () => {
            const middleware = integration.injectMiddleware()

            expect(middleware.code).toContain('manifest.json')
            expect(middleware.code).toContain('Cache-Control')
        })

        it('should handle service worker caching in middleware', () => {
            const middleware = integration.injectMiddleware()

            expect(middleware.code).toContain('sw.js')
            expect(middleware.code).toContain('Service-Worker-Allowed')
        })
    })

    describe('getSecureRoutes()', () => {
        it('should return authentication routes', () => {
            const routes = integration.getSecureRoutes()

            expect(routes).toContain('/login')
            expect(routes).toContain('/register')
            expect(routes).toContain('/logout')
            expect(routes).toContain('/api/auth/**')
        })

        it('should return admin routes', () => {
            const routes = integration.getSecureRoutes()

            expect(routes).toContain('/admin/**')
            expect(routes).toContain('/dashboard/**')
        })
    })

    describe('getApiPatterns()', () => {
        it('should include REST API patterns', () => {
            const patterns = integration.getApiPatterns()

            expect(patterns).toContain('/api/**')
        })

        it('should include GraphQL pattern', () => {
            const patterns = integration.getApiPatterns()

            expect(patterns).toContain('/graphql')
        })

        it('should include Livewire pattern', () => {
            const patterns = integration.getApiPatterns()

            expect(patterns).toContain('/livewire/**')
        })
    })

    describe('getStaticAssetPatterns()', () => {
        it('should include common asset extensions', () => {
            const patterns = integration.getStaticAssetPatterns()

            expect(patterns).toContainEqual(expect.stringContaining('js'))
            expect(patterns).toContainEqual(expect.stringContaining('css'))
            expect(patterns).toContainEqual(expect.stringContaining('woff'))
        })

        it('should include storage patterns', () => {
            const patterns = integration.getStaticAssetPatterns()

            expect(patterns).toContain('/storage/**')
        })

        it('should include image patterns', () => {
            const patterns = integration.getStaticAssetPatterns()

            const imagePattern = patterns.find((p) => p.includes('png'))
            expect(imagePattern).toBeDefined()
        })
    })

    describe('validateSetup()', () => {
        it('should warn about missing manifest.json', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = await integration.validateSetup()

            expect(result.warnings).toContainEqual(expect.stringContaining('manifest.json'))
        })

        it('should warn about missing service worker', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = await integration.validateSetup()

            expect(result.warnings).toContainEqual(expect.stringContaining('Service worker'))
        })

        it('should be valid when no errors present', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = await integration.validateSetup()

            expect(result.isValid).toBe(true)
            expect(result.errors.length).toBe(0)
        })

        it('should suggest offline view', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = await integration.validateSetup()

            expect(result.suggestions).toContainEqual(expect.stringContaining('offline'))
        })
    })

    describe('class properties', () => {
        it('should have correct id', () => {
            expect(integration.id).toBe('laravel')
        })

        it('should have correct name', () => {
            expect(integration.name).toBe('Laravel')
        })

        it('should have correct framework type', () => {
            expect(integration.framework).toBe('laravel')
        })

        it('should have correct language', () => {
            expect(integration.language).toBe('php')
        })
    })

    describe('createLaravelIntegration factory', () => {
        it('should create instance correctly', async () => {
            const { createLaravelIntegration } = await import('../laravel.js')
            const instance = createLaravelIntegration(projectRoot)

            expect(instance).toBeInstanceOf(LaravelIntegration)
            expect(instance.framework).toBe('laravel')
        })
    })
})
