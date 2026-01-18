import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DjangoIntegration } from '../django.js'
import { existsSync, readFileSync } from 'node:fs'

// Mock fs module
vi.mock('node:fs')

describe('DjangoIntegration', () => {
    let integration: DjangoIntegration
    const projectRoot = '/test/django'

    beforeEach(() => {
        integration = new DjangoIntegration(projectRoot)
        vi.clearAllMocks()
    })

    describe('detect()', () => {
        it('should detect Django 4.2 project', () => {
            const requirementsTxt = 'Django==4.2.0\nrequests==2.28.0'

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('manage.py') ||
                    pathStr.includes('settings.py') ||
                    pathStr.includes('urls.py') ||
                    pathStr.includes('requirements.txt')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('requirements.txt')) {
                    return requirementsTxt
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
            expect(result.version).toBe('4.2.0')
        })

        it('should detect Django 5.0 project', () => {
            const requirementsTxt = 'Django>=5.0.0'

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('manage.py') ||
                    pathStr.includes('settings.py') ||
                    pathStr.includes('requirements.txt')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('requirements.txt')) {
                    return requirementsTxt
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
            expect(result.version).toBe('5.0.0')
        })

        it('should detect Django with pyproject.toml', () => {
            const pyprojectToml = '[project]\ndependencies = ["django>=4.2"]'

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('manage.py') ||
                    pathStr.includes('settings.py') ||
                    pathStr.includes('pyproject.toml')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('pyproject.toml')) {
                    return pyprojectToml
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
        })

        it('should not detect non-Django project', () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = integration.detect()

            expect(result.detected).toBe(false)
        })

        it('should have medium confidence with only manage.py', () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return pathStr.includes('manage.py')
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('medium')
        })
    })

    describe('generateServiceWorkerConfig()', () => {
        it('should generate Django-optimized service worker config', () => {
            const config = integration.generateServiceWorkerConfig()

            expect(config.runtimeCaching).toBeDefined()
            expect(Array.isArray(config.runtimeCaching)).toBe(true)
            expect(config.runtimeCaching.length).toBeGreaterThan(0)

            // Check for Django-specific routes
            const patterns = config.runtimeCaching.map((r: { pattern: string }) => r.pattern)
            expect(patterns).toContain('/static/**')
            expect(patterns).toContain('/media/**')
            expect(patterns).toContain('/api/**')
            expect(patterns).toContain('/admin/**')

            expect(config.skipWaiting).toBe(true)
            expect(config.clientsClaim).toBe(true)
        })

        it('should include CSRF token route', () => {
            const config = integration.generateServiceWorkerConfig()
            const patterns = config.runtimeCaching.map((r: { pattern: string }) => r.pattern)
            expect(patterns).toContain('/csrf-token/**')
        })
    })

    describe('generateManifestVariables()', () => {
        it('should generate manifest variables', () => {
            const variables = integration.generateManifestVariables()

            expect(variables.start_url).toBe('/')
            expect(variables.scope).toBe('/')
            expect(variables.display).toBe('standalone')
        })
    })

    describe('getStartUrl()', () => {
        it('should return root path', () => {
            expect(integration.getStartUrl()).toBe('/')
        })
    })

    describe('getSecureRoutes()', () => {
        it('should return Django-specific secure routes', () => {
            const routes = integration.getSecureRoutes()

            expect(routes).toContain('/admin/**')
            expect(routes).toContain('/api/auth/**')
        })
    })

    describe('getApiPatterns()', () => {
        it('should return API patterns', () => {
            const patterns = integration.getApiPatterns()

            expect(patterns).toContain('/api/**')
        })

        it('should include REST framework patterns if detected', () => {
            // Mock detection of Django REST Framework
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                if (pathStr.includes('requirements.txt')) {
                    return true
                }
                return false
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('requirements.txt')) {
                    return 'djangorestframework==3.14.0'
                }
                if (String(path).includes('settings.py')) {
                    return "INSTALLED_APPS = ['rest_framework']"
                }
                return ''
            })

            const integrationWithREST = new DjangoIntegration(projectRoot)
            const patterns = integrationWithREST.getApiPatterns()

            expect(patterns.length).toBeGreaterThan(1)
        })
    })

    describe('getStaticAssetPatterns()', () => {
        it('should return static asset patterns', () => {
            const patterns = integration.getStaticAssetPatterns()

            expect(patterns).toContain('/static/**')
            expect(patterns).toContain('/media/**')
        })
    })

    describe('validateSetup()', () => {
        it('should validate Django setup', async () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('manage.py') ||
                    pathStr.includes('settings.py') ||
                    pathStr.includes('urls.py')
                )
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('settings.py')) {
                    return 'STATIC_URL = "/static/"\nSTATIC_ROOT = BASE_DIR / "staticfiles"'
                }
                return ''
            })

            const result = await integration.validateSetup()

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should report errors for missing files', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = await integration.validateSetup()

            expect(result.isValid).toBe(false)
            expect(result.errors.length).toBeGreaterThan(0)
        })

        it('should warn about missing STATIC_URL', async () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return pathStr.includes('settings.py') || pathStr.includes('manage.py')
            })

            vi.mocked(readFileSync).mockImplementation(() => {
                return '# No STATIC_URL configured'
            })

            const result = await integration.validateSetup()

            expect(result.warnings.length).toBeGreaterThan(0)
        })
    })

    describe('injectMiddleware()', () => {
        it('should return Django middleware injection code', () => {
            const middleware = integration.injectMiddleware()

            expect(middleware.code).toContain('MIDDLEWARE')
            expect(middleware.code).toContain('STATIC_URL')
            expect(middleware.path).toBe('settings.py')
            expect(middleware.language).toBe('python')
            expect(middleware.instructions.length).toBeGreaterThan(0)
        })
    })

    describe('properties', () => {
        it('should have correct id, name, framework, and language', () => {
            expect(integration.id).toBe('django')
            expect(integration.name).toBe('Django')
            expect(integration.framework).toBe('django')
            expect(integration.language).toBe('python')
        })
    })
})
