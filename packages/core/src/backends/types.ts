/**
 * Backend Integration Types & Interfaces
 * Defines abstractions for backend-specific PWA configurations
 */

import type { Framework } from '../scanner/framework-detector.js'
import type { ServiceWorkerConfig } from '../generator/caching-strategy.js'

/**
 * Language supported by backends
 */
export type BackendLanguage =
    | 'javascript'
    | 'typescript'
    | 'php'
    | 'python'
    | 'ruby'
    | 'java'
    | 'go'
    | 'csharp'
    | 'kotlin'

/**
 * Cache strategy type
 */
export type CacheStrategy =
    | 'CacheFirst'
    | 'NetworkFirst'
    | 'NetworkOnly'
    | 'StaleWhileRevalidate'
    | 'CacheOnly'

/**
 * Route pattern configuration
 */
export interface RoutePattern {
    pattern: string | RegExp           // e.g., '/api/*', '/assets/**'
    strategy: CacheStrategy
    cacheName?: string                 // Custom cache name
    networkTimeoutSeconds?: number     // For NetworkFirst
    expiration?: {
        maxAgeSeconds?: number
        maxEntries?: number
    }
    headers?: Record<string, string>   // Custom headers to preserve
}


/**
 * Backend detection result
 */
export interface BackendDetectionResult {
    detected: boolean
    framework: Framework | null
    language: BackendLanguage | null
    versions?: string[]                // Supported versions
    confidence: 'high' | 'medium' | 'low'
    indicators: string[]               // What led to detection
}

/**
 * Backend integration interface
 * Implemented by each supported backend (Laravel, Symfony, Django, etc.)
 */
export interface BackendIntegration {
    /**
     * Backend/framework identifier
     */
    readonly id: string
    readonly name: string
    readonly framework: Framework
    readonly language: BackendLanguage

    /**
     * Detect if backend is present in project
     */
    detect(): BackendDetectionResult

    /**
     * Generate optimized Service Worker configuration
     * Returns base configuration for this backend
     */
    generateServiceWorkerConfig(): ServiceWorkerConfig

    /**
     * Generate manifest.json variables/metadata
     * Returns key-value pairs to inject into manifest
     */
    generateManifestVariables(): Record<string, string | number>

    /**
     * Get recommended start URL for PWA
     */
    getStartUrl(): string

    /**
     * Inject middleware/helper code into project
     * Returns code snippet that developer should add to their project
     */
    injectMiddleware(): {
        code: string
        path: string                     // Where to add code
        language: string                 // php, python, ruby, go, etc.
        instructions: string[]           // Step-by-step instructions
    }

    /**
     * Get framework-specific routes that need special handling
     */
    getSecureRoutes(): string[]        // Routes that need CSRF/session protection

    /**
     * Get API endpoint patterns for this backend
     */
    getApiPatterns(): string[]         // e.g., ['/api/*', '/ajax/*']

    /**
     * Get static asset patterns
     */
    getStaticAssetPatterns(): string[]

    /**
     * Validate backend-specific PWA setup
     */
    validateSetup(): Promise<{
        isValid: boolean
        errors: string[]
        warnings: string[]
        suggestions: string[]
    }>
}

/**
 * Factory for backend integrations
 */
export interface BackendIntegrationFactory {
    /**
     * Get integration for detected framework
     */
    getIntegration(framework: Framework): BackendIntegration | null

    /**
     * Get all available integrations
     */
    getAllIntegrations(): BackendIntegration[]

    /**
     * Detect which backend is in use
     */
    detectBackend(projectPath: string): BackendIntegration | null
}

/**
 * Backend-specific PWA options
 */
export interface BackendPWAOptions {
    // Which middleware to inject
    injectMiddleware?: boolean

    // Which routes to optimize
    secureRoutes?: string[]
    apiRoutes?: string[]

    // Framework-specific features to enable
    enableFeatures?: string[]          // 'prefetch', 'prerender', etc.

    // Custom backend config
    customConfig?: Record<string, unknown>
}
