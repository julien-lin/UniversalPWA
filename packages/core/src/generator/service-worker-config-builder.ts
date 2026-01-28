/**
 * Service Worker Config Builder
 *
 * Builds ServiceWorkerConfig from BackendIntegration or custom configuration
 * Handles route merging, deduplication, and validation
 */

import type { BackendIntegration } from '../backends/types.js'
import type { RouteConfig, ServiceWorkerConfig } from './caching-strategy.js'
import { PRESET_STRATEGIES } from './caching-strategy.js'
import { RoutePatternResolver } from './route-pattern-resolver.js'
import { logger } from '../utils/logger.js'

/**
 * Validation result from configuration checks
 */
export interface ValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
}

/**
 * Options for building configuration
 */
export interface BuildOptions {
    /** Custom routes to add to the configuration */
    customRoutes?: RouteConfig[]

    /** Offline handling configuration */
    offline?: ServiceWorkerConfig['offline']

    /** Feature flags for framework-specific behavior */
    features?: ServiceWorkerConfig['features']

    /** Security headers to set */
    securityHeaders?: Record<string, string>

    /** CORS origins to allow */
    corsOrigins?: string[]

    /** Whether to deduplicate overlapping routes */
    deduplicateRoutes?: boolean

    /** Whether to validate the configuration */
    validate?: boolean
}

/**
 * Builds ServiceWorkerConfig from various sources
 */
export class ServiceWorkerConfigBuilder {
    /**
     * Build config from BackendIntegration
     */
    static fromBackendIntegration(
        integration: BackendIntegration,
        destination: string,
        options?: BuildOptions,
    ): ServiceWorkerConfig {
        // Get base config from backend integration
        const baseConfig = integration.generateServiceWorkerConfig()

        // Apply options on top of base config
        const config: ServiceWorkerConfig = {
            destination,
            staticRoutes: baseConfig.staticRoutes || [],
            apiRoutes: baseConfig.apiRoutes || [],
            imageRoutes: baseConfig.imageRoutes || [],
            customRoutes: baseConfig.customRoutes || [],
            offline: options?.offline || baseConfig.offline,
            features: options?.features || baseConfig.features,
            securityHeaders: options?.securityHeaders || baseConfig.securityHeaders,
            corsOrigins: options?.corsOrigins || baseConfig.corsOrigins,
        }

        // Add custom routes if provided
        if (options?.customRoutes && options.customRoutes.length > 0) {
            config.customRoutes = [...(config.customRoutes || []), ...options.customRoutes]
        }

        // Deduplicate if requested
        if (options?.deduplicateRoutes !== false) {
            config.staticRoutes = RoutePatternResolver.deduplicate(config.staticRoutes)
            config.apiRoutes = RoutePatternResolver.deduplicate(config.apiRoutes)
            config.imageRoutes = RoutePatternResolver.deduplicate(config.imageRoutes)
            if (config.customRoutes) {
                config.customRoutes = RoutePatternResolver.deduplicate(config.customRoutes)
            }
        }

        // Validate if requested
        if (options?.validate !== false) {
            const validation = this.validate(config)
            if (!validation.isValid) {
                logger.warn({ module: 'service-worker-config-builder', errors: validation.errors }, 'ServiceWorkerConfig validation warnings')
            }
        }

        return config
    }

    /**
     * Merge multiple configs (later ones override earlier)
     */
    static merge(...configs: ServiceWorkerConfig[]): ServiceWorkerConfig {
        if (configs.length === 0) {
            throw new Error('At least one config is required to merge')
        }

        if (configs.length === 1) {
            return { ...configs[0] }
        }

        const merged: ServiceWorkerConfig = {
            destination: configs[configs.length - 1].destination,
            staticRoutes: [],
            apiRoutes: [],
            imageRoutes: [],
            customRoutes: [],
        }

        // Merge routes from all configs
        for (const config of configs) {
            merged.staticRoutes.push(...(config.staticRoutes || []))
            merged.apiRoutes.push(...(config.apiRoutes || []))
            merged.imageRoutes.push(...(config.imageRoutes || []))
            merged.customRoutes?.push(...(config.customRoutes || []))

            // Last config wins for these properties
            if (config.offline) {
                merged.offline = config.offline
            }
            if (config.features) {
                merged.features = config.features
            }
            if (config.securityHeaders) {
                merged.securityHeaders = config.securityHeaders
            }
            if (config.corsOrigins) {
                merged.corsOrigins = config.corsOrigins
            }
        }

        // Deduplicate all route arrays
        merged.staticRoutes = RoutePatternResolver.deduplicate(merged.staticRoutes)
        merged.apiRoutes = RoutePatternResolver.deduplicate(merged.apiRoutes)
        merged.imageRoutes = RoutePatternResolver.deduplicate(merged.imageRoutes)
        merged.customRoutes = RoutePatternResolver.deduplicate(merged.customRoutes || [])

        return merged
    }

    /**
     * Create a builder instance for fluent API
     */
    static create(destination: string): ConfigBuilderInstance {
        return new ConfigBuilderInstance(destination)
    }

    /**
     * Validate service worker configuration
     */
    static validate(config: ServiceWorkerConfig): ValidationResult {
        const errors: string[] = []
        const warnings: string[] = []

        // Check destination
        if (!config.destination) {
            errors.push('destination is required')
        }

        // Check route arrays
        if (!Array.isArray(config.staticRoutes)) {
            errors.push('staticRoutes must be an array')
        }
        if (!Array.isArray(config.apiRoutes)) {
            errors.push('apiRoutes must be an array')
        }
        if (!Array.isArray(config.imageRoutes)) {
            errors.push('imageRoutes must be an array')
        }

        // Validate all routes
        const allRoutes = [
            ...(config.staticRoutes || []),
            ...(config.apiRoutes || []),
            ...(config.imageRoutes || []),
            ...(config.customRoutes || []),
            ...(config.advanced?.routes || []),
        ]

        const patternErrors = RoutePatternResolver.validatePatterns(allRoutes)
        errors.push(...patternErrors)

        // Check for empty routes
        if (config.staticRoutes.length === 0 && config.apiRoutes.length === 0 && config.imageRoutes.length === 0) {
            warnings.push('No routes configured (staticRoutes, apiRoutes, imageRoutes are all empty)')
        }

        // Check for overlapping routes
        const allPatterns = allRoutes
            .map((r) => r?.pattern?.toString())
            .filter((p) => p !== undefined)
        const duplicates = allPatterns.filter((p, i) => allPatterns.indexOf(p) !== i)
        if (duplicates.length > 0) {
            warnings.push(`Found ${duplicates.length} duplicate route patterns`)
        }

        // Check offline config
        if (config.offline) {
            if (config.offline.fallbackPage && typeof config.offline.fallbackPage !== 'string') {
                errors.push('offline.fallbackPage must be a string')
            }
            if (config.offline.fallbackImage && typeof config.offline.fallbackImage !== 'string') {
                errors.push('offline.fallbackImage must be a string')
            }
        }

        // Check features
        if (config.features) {
            const validFeatures = ['prefetch', 'prerender', 'isr', 'hydration', 'streaming']
            for (const key of Object.keys(config.features)) {
                if (!validFeatures.includes(key)) {
                    warnings.push(`Unknown feature flag: ${key}`)
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        }
    }

    /**
     * Create default config with preset strategies
     */
    static createDefault(destination: string, basePath: string = '/'): ServiceWorkerConfig {
        // Normalize basePath for offline page URL
        const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
        
        return {
            destination,
            staticRoutes: [
                {
                    pattern: '*.{js,css,woff,woff2,ttf,otf}',
                    strategy: PRESET_STRATEGIES.StaticAssets,
                    description: 'JavaScript, CSS, and font files',
                    priority: 10,
                },
            ],
            apiRoutes: [
                {
                    pattern: '/api/**',
                    strategy: PRESET_STRATEGIES.ApiEndpoints,
                    description: 'API endpoints',
                    priority: 20,
                },
            ],
            imageRoutes: [
                {
                    pattern: '*.{png,jpg,jpeg,svg,webp,gif,ico}',
                    strategy: PRESET_STRATEGIES.Images,
                    description: 'Image files',
                    priority: 5,
                },
            ],
            offline: {
                fallbackPage: `${normalizedBasePath}offline.html`,
            },
        }
    }
}

/**
 * Fluent builder instance for ServiceWorkerConfig
 */
export class ConfigBuilderInstance {
    private config: ServiceWorkerConfig

    constructor(destination: string) {
        this.config = {
            destination,
            staticRoutes: [],
            apiRoutes: [],
            imageRoutes: [],
        }
    }

    /**
     * Add static asset routes
     */
    addStaticRoutes(...routes: RouteConfig[]): this {
        this.config.staticRoutes.push(...routes)
        return this
    }

    /**
     * Add API routes
     */
    addApiRoutes(...routes: RouteConfig[]): this {
        this.config.apiRoutes.push(...routes)
        return this
    }

    /**
     * Add image routes
     */
    addImageRoutes(...routes: RouteConfig[]): this {
        this.config.imageRoutes.push(...routes)
        return this
    }

    /**
     * Add custom routes
     */
    addCustomRoutes(...routes: RouteConfig[]): this {
        if (!this.config.customRoutes) {
            this.config.customRoutes = []
        }
        this.config.customRoutes.push(...routes)
        return this
    }

    /**
     * Set offline configuration
     */
    setOffline(fallbackPage?: string, fallbackImage?: string): this {
        this.config.offline = {
            fallbackPage,
            fallbackImage,
        }
        return this
    }

    /**
     * Set feature flags
     */
    setFeatures(features: ServiceWorkerConfig['features']): this {
        this.config.features = features
        return this
    }

    /**
     * Set security headers
     */
    setSecurityHeaders(headers: Record<string, string>): this {
        this.config.securityHeaders = headers
        return this
    }

    /**
     * Set CORS origins
     */
    setCorsOrigins(...origins: string[]): this {
        this.config.corsOrigins = origins
        return this
    }

    /**
     * Get the built configuration
     */
    build(): ServiceWorkerConfig {
        // Deduplicate all routes
        return {
            ...this.config,
            staticRoutes: RoutePatternResolver.deduplicate(this.config.staticRoutes),
            apiRoutes: RoutePatternResolver.deduplicate(this.config.apiRoutes),
            imageRoutes: RoutePatternResolver.deduplicate(this.config.imageRoutes),
            customRoutes: this.config.customRoutes ? RoutePatternResolver.deduplicate(this.config.customRoutes) : undefined,
        }
    }

    /**
     * Build and validate
     */
    buildAndValidate(): { config: ServiceWorkerConfig; validation: ValidationResult } {
        const config = this.build()
        const validation = ServiceWorkerConfigBuilder.validate(config)
        return { config, validation }
    }
}
