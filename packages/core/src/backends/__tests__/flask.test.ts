import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FlaskIntegration } from '../flask.js'
import { existsSync, readFileSync } from 'node:fs'

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
            const requirementsTxt = 'Flask==3.0.0\nrequests==2.28.0'

            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('app.py') ||
                    pathStr.includes('requirements.txt') ||
                    pathStr.includes('static') ||
                    pathStr.includes('templates')
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
            expect(result.version).toBe('3.0.0')
        })

        it('should detect Flask with application.py', () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return pathStr.includes('application.py') || pathStr.includes('requirements.txt')
            })

            vi.mocked(readFileSync).mockImplementation((path) => {
                if (String(path).includes('requirements.txt')) {
                    return 'Flask>=2.0.0'
                }
                return ''
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
        })

        it('should detect Flask with Flask structure', () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return (
                    pathStr.includes('app.py') ||
                    pathStr.includes('static') ||
                    pathStr.includes('templates')
                )
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('high')
        })

        it('should not detect non-Flask project', () => {
            vi.mocked(existsSync).mockReturnValue(false)

            const result = integration.detect()
            expect(result.detected).toBe(false)
        })

        it('should have medium confidence with only app.py', () => {
            vi.mocked(existsSync).mockImplementation((path) => {
                const pathStr = typeof path === 'string' ? path : String(path)
                return pathStr.includes('app.py')
            })

            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.confidence).toBe('medium')
        })
    })

    describe('generateServiceWorkerConfig()', () => {
        it('should generate Flask-optimized service worker config', () => {
            const config = integration.generateServiceWorkerConfig()

            expect(config.runtimeCaching).toBeDefined()
            expect(Array.isArray(config.runtimeCaching)).toBe(true)
            expect(config.runtimeCaching.length).toBeGreaterThan(0)

            // Check for Flask-specific routes
            const patterns = config.runtimeCaching.map((r: { pattern: string }) => r.pattern)
            expect(patterns).toContain('/static/**')
            expect(patterns).toContain('/api/**')

            expect(config.skipWaiting).toBe(true)
            expect(config.clientsClaim).toBe(true)
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
        it('should return Flask-specific secure routes', () => {
            const routes = integration.getSecureRoutes()

            expect(routes).toContain('/api/auth/**')
            expect(routes).toContain('/admin/**')
        })
    })

    describe('getApiPatterns()', () => {
        it('should return API patterns', () => {
            const patterns = integration.getApiPatterns()

            expect(patterns).toContain('/api/**')
        })

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
        it('should return static asset patterns', () => {
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
