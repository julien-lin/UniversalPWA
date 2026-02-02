import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { rmSync } from 'node:fs'
import { SymfonyIntegration } from '../symfony.js'
import {
  createTestDir,
  cleanupTestDir,
  createSymfonyFixture,
} from '../../__tests__/test-helpers.js'

describe('SymfonyIntegration', () => {
    let integration: SymfonyIntegration
    let testDir: string

    beforeEach(() => {
        testDir = createTestDir('symfony')
    })

    afterEach(() => {
        if (testDir) {
            cleanupTestDir(testDir)
        }
    })

    describe('detect()', () => {
        it('should detect Symfony 6 project', () => {
            createSymfonyFixture(testDir, { version: '^6.4' })
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('symfony')
            expect(result.versions?.[0]).toBeTruthy()
        })

        it('should detect Symfony 7 project', () => {
            createSymfonyFixture(testDir, { version: '^7.0' })
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('symfony')
            expect(result.versions?.[0]).toBeTruthy()
        })

        it('should detect Symfony 8 project', () => {
            createSymfonyFixture(testDir, { version: '^8.0' })
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('symfony')
            expect(result.versions?.[0]).toBeTruthy()
        })

        it('should detect Symfony 5 project', () => {
            createSymfonyFixture(testDir, { version: '^5.4' })
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.framework).toBe('symfony')
        })

        it('should reject non-Symfony project', () => {
            createSymfonyFixture(testDir, { version: '^8.0' })
            // Remove Symfony dependency
            writeFileSync(
                join(testDir, 'composer.json'),
                JSON.stringify({ name: 'test/app', require: { 'php': '>=8.2' } })
            )
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(false)
        })

        it('should reject project without proper Symfony structure', () => {
            createSymfonyFixture(testDir)
            // Remove required folders
            rmSync(join(testDir, 'public'), { recursive: true })
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(false)
        })
    })

    describe('generateServiceWorkerConfig()', () => {
        it('should generate config with default routes', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const config = integration.generateServiceWorkerConfig()

            expect(config.destination).toBe('public/service-worker.js')
            expect(config.staticRoutes).toBeDefined()
            expect(config.apiRoutes).toBeDefined()
        })

        it('should include build routes', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const config = integration.generateServiceWorkerConfig()

            expect(config.staticRoutes.some(r => String(r.pattern).includes('/build'))).toBe(true)
        })

        it('should include bundle routes', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const config = integration.generateServiceWorkerConfig()

            expect(config.staticRoutes.some(r => String(r.pattern).includes('/bundles'))).toBe(true)
        })

        it('should include asset routes', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const config = integration.generateServiceWorkerConfig()

            const patterns = config.staticRoutes.map(r => String(r.pattern))
            expect(patterns.some(p => p.includes('js'))).toBe(true)
            expect(patterns.some(p => p.includes('css'))).toBe(true)
            expect(patterns.some(p => p.includes('woff'))).toBe(true)
        })

        it('should detect API Platform and include GraphQL', () => {
            createSymfonyFixture(testDir, { apiPlatform: true })
            integration = new SymfonyIntegration(testDir)
            const config = integration.generateServiceWorkerConfig()

            expect(config.apiRoutes.some(r => String(r.pattern) === '/graphql')).toBe(true)
        })

        it('should include offline fallback', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const config = integration.generateServiceWorkerConfig()

            expect(config.offline?.fallbackPage).toBe('/offline')
        })
    })

    describe('generateManifestVariables()', () => {
        it('should extract app name from composer.json', () => {
            createSymfonyFixture(testDir, { name: 'my-company/super-app' })
            // Don't include APP_NAME in .env for this test
            writeFileSync(join(testDir, '.env'), '')

            integration = new SymfonyIntegration(testDir)
            const manifest = integration.generateManifestVariables()

            expect(manifest.name).toBe('Super App')
            expect(manifest.short_name).toBeTruthy()
        })

        it('should use APP_NAME from .env', () => {
            createSymfonyFixture(testDir)
            writeFileSync(join(testDir, '.env'), 'APP_NAME="My Custom App"\nAPP_DESCRIPTION="Custom Desc"')
            integration = new SymfonyIntegration(testDir)
            const manifest = integration.generateManifestVariables()

            expect(manifest.name).toBe('My Custom App')
            expect(manifest.description).toBe('Custom Desc')
        })

        it('should have correct default values', () => {
            createSymfonyFixture(testDir)
            writeFileSync(join(testDir, '.env'), '')
            integration = new SymfonyIntegration(testDir)
            const manifest = integration.generateManifestVariables()

            expect(manifest.scope).toBe('/')
            expect(manifest.display).toBe('standalone')
            expect(manifest.orientation).toBe('portrait-primary')
            expect(manifest.background_color).toBe('#ffffff')
            expect(manifest.theme_color).toBe('#000000')
        })
    })

    describe('getSecureRoutes()', () => {
        it('should return standard Symfony security routes', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const routes = integration.getSecureRoutes()

            expect(routes).toContain('/login')
            expect(routes).toContain('/logout')
            expect(routes).toContain('/register')
            expect(routes).toContain('/admin/**')
            expect(routes).toContain('/api/auth/**')
        })
    })

    describe('Edge cases', () => {
        it('should handle malformed composer.json', () => {
            createSymfonyFixture(testDir)
            writeFileSync(join(testDir, 'composer.json'), 'invalid {')

            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()
            expect(result.detected).toBe(false)
        })

        it('should detect SPA mode with webpack.config.js', () => {
            createSymfonyFixture(testDir, { hasSPA: true })
            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()

            expect(result.detected).toBe(true)
            expect(result.indicators.some((i) => i.includes('SPA mode'))).toBe(true)
        })

        it('should handle project without .env file', () => {
            createSymfonyFixture(testDir)
            integration = new SymfonyIntegration(testDir)
            const manifest = integration.generateManifestVariables()

            expect(manifest.name).toBeTruthy()
            expect(manifest.description).toBeTruthy()
        })

        it('should handle concurrent operations', () => {
            createSymfonyFixture(testDir, { apiPlatform: true })
            integration = new SymfonyIntegration(testDir)
            const detected = integration.detect()
            const config = integration.generateServiceWorkerConfig()
            const manifest = integration.generateManifestVariables()

            expect(detected.detected).toBe(true)
            expect(config).toBeDefined()
            expect(manifest).toBeDefined()
        })

        it('should handle Symfony 8 with require-dev', () => {
            createSymfonyFixture(testDir)
            const composer = JSON.parse(
                require('node:fs').readFileSync(join(testDir, 'composer.json'), 'utf-8')
            ) as Record<string, unknown>

            const requires = composer.require as Record<string, string>
            delete requires['symfony/framework-bundle']

            const requiresDev = (composer['require-dev'] ??= {}) as Record<string, string>
            requiresDev['symfony/framework-bundle'] = '^8.0'

            writeFileSync(join(testDir, 'composer.json'), JSON.stringify(composer))

            integration = new SymfonyIntegration(testDir)
            const result = integration.detect()
            expect(result.detected).toBe(true)
        })
    })
})

