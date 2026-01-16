/**
 * Base Backend Integration class
 * Abstract class with common logic for all backend integrations
 */

import type { Framework } from '../scanner/framework-detector.js'
import type {
    BackendIntegration,
    BackendDetectionResult,
    BackendLanguage,
} from './types.js'
import type { RouteConfig } from '../generator/caching-strategy.js'
import type { ServiceWorkerConfig } from '../generator/caching-strategy.js'
import { PRESET_STRATEGIES } from '../generator/caching-strategy.js'

/**
 * Abstract base class for backend integrations
 */
export abstract class BaseBackendIntegration implements BackendIntegration {
    abstract readonly id: string
    abstract readonly name: string
    abstract readonly framework: Framework
    abstract readonly language: BackendLanguage

    // Common route patterns used by most backends
    protected defaultStaticRoutes: RouteConfig[] = [
        { pattern: '/assets/**', strategy: PRESET_STRATEGIES.StaticAssets },
        { pattern: '/public/**', strategy: PRESET_STRATEGIES.StaticAssets },
        { pattern: '/static/**', strategy: PRESET_STRATEGIES.StaticAssets },
        { pattern: '*.{js,css,woff,woff2,ttf,otf}', strategy: PRESET_STRATEGIES.StaticAssets },
    ]

    protected defaultImageRoutes: RouteConfig[] = [
        { pattern: '*.{png,jpg,jpeg,svg,webp,gif}', strategy: PRESET_STRATEGIES.Images },
    ]

    protected defaultApiRoutes: RouteConfig[] = [
        { pattern: '/api/**', strategy: PRESET_STRATEGIES.ApiEndpoints },
    ]

    /**
     * Abstract methods to be implemented by subclasses
     */
    abstract detect(): BackendDetectionResult
    abstract generateServiceWorkerConfig(): ServiceWorkerConfig
    abstract generateManifestVariables(): Record<string, string | number>
    abstract getStartUrl(): string
    abstract validateSetup(): Promise<{
        isValid: boolean
        errors: string[]
        warnings: string[]
        suggestions: string[]
    }>

    /**
     * Default middleware injection (can be overridden)
     */
    injectMiddleware() {
        return {
            code: this.getDefaultMiddlewareCode(),
            path: this.getDefaultMiddlewarePath(),
            language: this.language,
            instructions: [
                `Add the following code to ${this.getDefaultMiddlewarePath()}`,
                'Restart your server',
                'The PWA routes will be automatically available',
            ],
        }
    }

    /**
     * Get secure routes that need CSRF/session protection
     */
    getSecureRoutes(): string[] {
        return ['/admin/**', '/api/auth/**', '/dashboard/**']
    }

    /**
     * Get API endpoint patterns (can be overridden per backend)
     */
    getApiPatterns(): string[] {
        return ['/api/**', '/json/**', '/graphql/**']
    }

    /**
     * Get static asset patterns
     */
    getStaticAssetPatterns(): string[] {
        return [
            '/assets/**',
            '/public/**',
            '/static/**',
            '**/*.{js,css,png,jpg,svg,webp,woff,woff2}',
        ]
    }

    /**
     * Default middleware code (should be overridden)
     */
    protected getDefaultMiddlewareCode(): string {
        return '// Add PWA middleware here'
    }

    /**
     * Default middleware path (should be overridden)
     */
    protected getDefaultMiddlewarePath(): string {
        return 'middleware/pwa.ts'
    }
}
