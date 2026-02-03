import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DjangoIntegration } from '../django.js'
import { getPythonPackageVersion, hasPythonPackage } from '../python-deps.js'
import { existsSync, readFileSync } from 'node:fs'
import { createFsMockForBackend } from './helpers/fs-mock.js'
import { expectBackendContract } from './helpers/expect-backend-contract.js'

// Mock fs for backend detection (manage.py, settings, etc.)
vi.mock('node:fs')

// Mock python-deps so version/presence is controlled per test (parsing tested in python-deps.test.ts)
vi.mock('../python-deps.js', () => ({
    getPythonPackageVersion: vi.fn(),
    hasPythonPackage: vi.fn(),
}))

describe('DjangoIntegration', () => {
    let integration: DjangoIntegration
    const projectRoot = '/test/django'

    beforeEach(() => {
        integration = new DjangoIntegration(projectRoot)
        vi.clearAllMocks()
        vi.mocked(hasPythonPackage).mockReturnValue(true)
    })

    describe('detect()', () => {
        it('should detect Django 4.2 project', () => {
            createFsMockForBackend({
                existsPaths: ['manage.py', 'settings.py', 'urls.py', 'requirements.txt'],
                readFileMap: { 'requirements.txt': 'Django==4.2.0\nrequests==2.28.0' },
            })
            vi.mocked(getPythonPackageVersion).mockReturnValue('4.2.0')
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
            expect(result.versions).toEqual(['4.2.0'])
        })

        it('should detect Django 5.0 project', () => {
            createFsMockForBackend({
                existsPaths: ['manage.py', 'settings.py', 'requirements.txt'],
                readFileMap: { 'requirements.txt': 'Django>=5.0.0' },
            })
            vi.mocked(getPythonPackageVersion).mockReturnValue('5.0.0')
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
            expect(result.versions).toEqual(['5.0.0'])
        })

        it('should detect Django with pyproject.toml', () => {
            createFsMockForBackend({
                existsPaths: ['manage.py', 'settings.py', 'pyproject.toml'],
                readFileMap: { 'pyproject.toml': '[project]\ndependencies = ["django>=4.2"]' },
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
        })

        it('should not detect non-Django project', () => {
            createFsMockForBackend({ existsReturn: false })
            vi.mocked(hasPythonPackage).mockReturnValue(false)

            const result = integration.detect()

            expect(result.detected).toBe(false)
        })

        it('should have medium confidence with only manage.py', () => {
            createFsMockForBackend({ existsPaths: ['manage.py'] })
            vi.mocked(hasPythonPackage).mockReturnValue(false)

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('medium')
        })
    })

    describe('generateServiceWorkerConfig()', () => {
        it('should generate Django-optimized service worker config', () => {
            const config = integration.generateServiceWorkerConfig()

            expect(config.staticRoutes).toBeDefined()
            expect(Array.isArray(config.staticRoutes)).toBe(true)
            expect(config.staticRoutes.length).toBeGreaterThan(0)

            expect(config.apiRoutes).toBeDefined()
            expect(Array.isArray(config.apiRoutes)).toBe(true)

            // Check for Django-specific routes
            const staticPatterns = config.staticRoutes.map((r) => r.pattern)
            const apiPatterns = config.apiRoutes.map((r) => r.pattern)
            const imagePatterns = config.imageRoutes.map((r) => r.pattern)
            const customPatterns = (config.customRoutes || []).map((r) => r.pattern)
            const allPatterns = [...staticPatterns, ...apiPatterns, ...imagePatterns, ...customPatterns]
            expect(allPatterns).toContain('/static/**')
            expect(allPatterns).toContain('/media/**')
            expect(allPatterns).toContain('/api/**')
            expect(allPatterns).toContain('/admin/**')

            expect(config.destination).toBe('sw.js')
        })

        it('should include CSRF token route', () => {
            const config = integration.generateServiceWorkerConfig()
            const customPatterns = (config.customRoutes || []).map((r) => r.pattern)
            expect(customPatterns).toContain('/csrf-token/**')
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

    describe('Backend contract', () => {
        it('should satisfy common backend contract', () => {
            expectBackendContract(integration)
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
        it('should include media patterns', () => {
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
