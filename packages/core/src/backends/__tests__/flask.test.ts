import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FlaskIntegration } from '../flask.js'
import { existsSync, readFileSync } from 'node:fs'
import { createFsMockForBackend } from './helpers/fs-mock.js'
import { expectBackendContract } from './helpers/expect-backend-contract.js'

// Mock fs module
vi.mock('node:fs')

describe('FlaskIntegration', () => {
    let integration: FlaskIntegration
    const projectRoot = '/test/flask'

    beforeEach(() => {
        integration = new FlaskIntegration(projectRoot)
        vi.clearAllMocks()
    })

    describe('detect()', () => {
        it('should detect Flask 3.0 project', () => {
            createFsMockForBackend({
                existsPaths: ['app.py', 'requirements.txt', 'static', 'templates'],
                readFileMap: { 'requirements.txt': 'Flask==3.0.0\nrequests==2.28.0' },
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
            expect(result.versions).toEqual(['3.0.0'])
        })

        it('should detect Flask with application.py', () => {
            createFsMockForBackend({
                existsPaths: ['application.py', 'requirements.txt'],
                readFileMap: { 'requirements.txt': 'Flask>=2.0.0' },
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
        })

        it('should detect Flask with Flask structure', () => {
            createFsMockForBackend({
                existsPaths: ['app.py', 'static', 'templates'],
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
        })

        it('should not detect non-Flask project', () => {
            createFsMockForBackend({ existsReturn: false })

            const result = integration.detect()
            expect(result.detected).toBe(false)
        })

        it('should have medium confidence with only app.py', () => {
            createFsMockForBackend({ existsPaths: ['app.py'] })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('medium')
        })
    })

    describe('generateServiceWorkerConfig()', () => {
        it('should generate Flask-optimized service worker config', () => {
            const config = integration.generateServiceWorkerConfig()

            expect(config.staticRoutes).toBeDefined()
            expect(Array.isArray(config.staticRoutes)).toBe(true)
            expect(config.staticRoutes.length).toBeGreaterThan(0)

            expect(config.apiRoutes).toBeDefined()
            expect(Array.isArray(config.apiRoutes)).toBe(true)
            expect(config.apiRoutes.length).toBeGreaterThan(0)

            // Check for Flask-specific routes
            const staticPatterns = config.staticRoutes.map((r) => r.pattern)
            const apiPatterns = config.apiRoutes.map((r) => r.pattern)
            expect(staticPatterns).toContain('/static/**')
            expect(apiPatterns).toContain('/api/**')

            expect(config.destination).toBe('sw.js')
        })

        it('should include CSRF token route if Flask-WTF is detected', () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                if (pathStr.includes('requirements.txt')) {
                    return true
                }
                return false
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('requirements.txt')) {
                    return 'Flask==3.0.0\nFlask-WTF==1.2.0'
                }
                return ''
            })

            const integrationWithWTF = new FlaskIntegration(projectRoot)
            const config = integrationWithWTF.generateServiceWorkerConfig()
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
        it('should return Flask-specific secure routes', () => {
            const routes = integration.getSecureRoutes()

            expect(routes).toContain('/api/auth/**')
            expect(routes).toContain('/admin/**')
        })
    })

    describe('getApiPatterns()', () => {
        it('should include RESTful patterns if Flask-RESTful is detected', () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                if (pathStr.includes('requirements.txt')) {
                    return true
                }
                return false
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('requirements.txt')) {
                    return 'Flask-RESTful==0.3.10'
                }
                return ''
            })

            const integrationWithRESTful = new FlaskIntegration(projectRoot)
            const patterns = integrationWithRESTful.getApiPatterns()

            expect(patterns.length).toBeGreaterThan(1)
        })
    })

    describe('getStaticAssetPatterns()', () => {
        it('should include static path', () => {
            const patterns = integration.getStaticAssetPatterns()

            expect(patterns).toContain('/static/**')
        })
    })

    describe('validateSetup()', () => {
        it('should validate Flask setup', async () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('app.py') ||
                    pathStr.includes('static') ||
                    pathStr.includes('templates')
                )
            })

            const result = await integration.validateSetup()

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should warn about missing app.py', async () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = await integration.validateSetup()

            expect(result.warnings.length).toBeGreaterThan(0)
        })
    })

    describe('injectMiddleware()', () => {
        it('should return Flask middleware injection code', () => {
            const middleware = integration.injectMiddleware()

            expect(middleware.code).toContain('Flask')
            expect(middleware.code).toContain('manifest.json')
            expect(middleware.code).toContain('sw.js')
            expect(middleware.path).toBe('app.py')
            expect(middleware.language).toBe('python')
            expect(middleware.instructions.length).toBeGreaterThan(0)
        })
    })

    describe('properties', () => {
        it('should have correct id, name, framework, and language', () => {
            expect(integration.id).toBe('flask')
            expect(integration.name).toBe('Flask')
            expect(integration.framework).toBe('flask')
            expect(integration.language).toBe('python')
        })
    })
})
