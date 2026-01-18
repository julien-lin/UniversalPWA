/**
 * Service Worker Caching Strategies
 *
 * Defines caching strategies for different types of routes in a PWA
 * Integrates with Workbox for actual cache handling
 */

/**
 * Caching strategy definition for a route
 */
export interface CachingStrategy {
    /** Strategy name (Workbox handler) */
    name: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly' | 'CacheOnly'

    /** Cache name for this strategy */
    cacheName: string

    /** Network timeout for NetworkFirst/StaleWhileRevalidate (seconds) */
    networkTimeoutSeconds?: number

    /** Cache expiration rules */
    expiration?: {
        /** Maximum number of entries to keep in cache */
        maxEntries?: number
        /** Maximum age in seconds */
        maxAgeSeconds?: number
    }

    /** Headers to set in cached responses */
    headers?: Record<string, string>

    /** Additional Workbox options */
    workboxOptions?: Record<string, unknown>
}

/**
 * Route pattern with strategy
 */
export interface RouteConfig {
    /** URL pattern (glob or regex) */
    pattern: string | RegExp

    /** Type of pattern (auto-detected if not specified) */
    patternType?: 'regex' | 'glob'

    /** Caching strategy for this route */
    strategy: CachingStrategy

    /** Human-readable description */
    description?: string

    /** Route priority (higher = checked first) */
    priority?: number

    /** Per-route TTL override */
    ttl?: {
        /** Maximum age in seconds */
        maxAgeSeconds?: number
        /** Maximum number of entries */
        maxEntries?: number
    }

    /** Dependencies of this route (for cascade invalidation) */
    dependencies?: string[]

    /** Additional matching conditions */
    conditions?: {
        /** Required headers */
        headers?: Record<string, string>
        /** Allowed HTTP methods */
        methods?: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[]
        /** Allowed origins */
        origins?: string[]
    }

    /** Additional Workbox-specific options */
    workboxOptions?: Record<string, unknown>
}

/**
 * Advanced caching configuration
 */
export interface AdvancedCachingConfig {
    /** Routes with caching strategies */
    routes: RouteConfig[]

    /** Global configuration */
    global?: {
        /** Cache version (for invalidation) */
        version?: string
        /** Prefix for cache names */
        cacheNamePrefix?: string
        /** Default strategy if route not matched */
        defaultStrategy?: CachingStrategy
    }

    /** Versioning configuration */
    versioning?: {
        /** Auto-generate version from file hashes */
        autoVersion?: boolean
        /** Manual version */
        manualVersion?: string
        /** Auto-invalidate on file changes */
        autoInvalidate?: boolean
    }

    /** Dependency tracking */
    dependencies?: {
        /** Enable tracking */
        enabled: boolean
        /** Files to track */
        trackedFiles?: string[]
    }

    /** Invalidation strategies */
    invalidation?: {
        /** Invalidate on file change */
        onFileChange?: boolean
        /** Invalidate on version change */
        onVersionChange?: boolean
        /** File patterns to ignore for invalidation */
        ignorePatterns?: string[]
    }
}

/**
 * Service Worker configuration with route-based caching
 */
export interface ServiceWorkerConfig {
    /** Output destination for service worker */
    destination: string

    /** Routes for static assets (CSS, JS, fonts, etc.) */
    staticRoutes: RouteConfig[]

    /** Routes for API endpoints */
    apiRoutes: RouteConfig[]

    /** Routes for images */
    imageRoutes: RouteConfig[]

    /** Custom routes (merged after default ones) */
    customRoutes?: RouteConfig[]

    /** Advanced caching configuration */
    advanced?: AdvancedCachingConfig

    /** Offline handling configuration */
    offline?: {
        /** Fallback HTML page for offline */
        fallbackPage?: string
        /** Fallback image for broken images */
        fallbackImage?: string
    }

    /** Feature flags for framework-specific behavior */
    features?: {
        /** Enable prefetching (Next.js, Nuxt) */
        prefetch?: boolean
        /** Enable prerendering (Astro, Hugo) */
        prerender?: boolean
        /** ISR support (Next.js 12.2+) */
        isr?: boolean
        /** Hydration support (SSR) */
        hydration?: boolean
        /** Streaming support (React 18+) */
        streaming?: boolean
    }

    /** Security headers to set in service worker */
    securityHeaders?: Record<string, string>

    /** CORS origins to allow */
    corsOrigins?: string[]
}

/**
 * Preset caching strategies for common use cases
 */
export const PRESET_STRATEGIES = {
    StaticAssets: {
        name: 'CacheFirst' as const,
        cacheName: 'static-assets',
        expiration: {
            maxAgeSeconds: 31536000, // 1 year
            maxEntries: 50,
        },
    } satisfies CachingStrategy,

    ApiEndpoints: {
        name: 'NetworkFirst' as const,
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
            maxAgeSeconds: 3600, // 1 hour
            maxEntries: 100,
        },
    } satisfies CachingStrategy,

    Images: {
        name: 'StaleWhileRevalidate' as const,
        cacheName: 'image-cache',
        expiration: {
            maxAgeSeconds: 2592000, // 30 days
            maxEntries: 500,
        },
    } satisfies CachingStrategy,

    HtmlPages: {
        name: 'NetworkFirst' as const,
        cacheName: 'html-cache',
        networkTimeoutSeconds: 2,
        expiration: {
            maxAgeSeconds: 86400, // 1 day
            maxEntries: 50,
        },
    } satisfies CachingStrategy,

    FontFiles: {
        name: 'CacheFirst' as const,
        cacheName: 'font-cache',
        expiration: {
            maxAgeSeconds: 31536000, // 1 year
            maxEntries: 30,
        },
    } satisfies CachingStrategy,
}

/**
 * Validate caching strategy
 */
export function validateCachingStrategy(strategy: unknown): strategy is CachingStrategy {
    if (!strategy || typeof strategy !== 'object') return false

    const s = strategy as Record<string, unknown>

    // Check required properties
    if (typeof s.name !== 'string') return false
    if (typeof s.cacheName !== 'string') return false

    // Validate strategy name
    const validNames = ['CacheFirst', 'NetworkFirst', 'StaleWhileRevalidate', 'NetworkOnly', 'CacheOnly']
    if (!validNames.includes(s.name)) return false

    // Validate optional properties
    if (s.networkTimeoutSeconds !== undefined && typeof s.networkTimeoutSeconds !== 'number') return false

    if (s.expiration !== undefined) {
        if (typeof s.expiration !== 'object') return false
        const exp = s.expiration as Record<string, unknown>
        if (exp.maxEntries !== undefined && typeof exp.maxEntries !== 'number') return false
        if (exp.maxAgeSeconds !== undefined && typeof exp.maxAgeSeconds !== 'number') return false
    }

    if (s.headers !== undefined && typeof s.headers !== 'object') return false

    return true
}

/**
 * Validate route configuration
 */
export function validateRouteConfig(config: unknown): config is RouteConfig {
    if (!config || typeof config !== 'object') return false

    const c = config as Record<string, unknown>

    // Check pattern
    if (typeof c.pattern !== 'string' && !(c.pattern instanceof RegExp)) return false

    // Check strategy
    if (!validateCachingStrategy(c.strategy)) return false

    // Validate optional properties
    if (c.description !== undefined && typeof c.description !== 'string') return false
    if (c.priority !== undefined && typeof c.priority !== 'number') return false
    if (c.patternType !== undefined && !['regex', 'glob'].includes(c.patternType as string)) return false

    // Validate TTL
    if (c.ttl !== undefined) {
        if (typeof c.ttl !== 'object') return false
        const ttl = c.ttl as Record<string, unknown>
        if (ttl.maxAgeSeconds !== undefined && typeof ttl.maxAgeSeconds !== 'number') return false
        if (ttl.maxEntries !== undefined && typeof ttl.maxEntries !== 'number') return false
    }

    // Validate dependencies
    if (c.dependencies !== undefined) {
        if (!Array.isArray(c.dependencies) || !c.dependencies.every((d) => typeof d === 'string')) return false
    }

    // Validate conditions
    if (c.conditions !== undefined) {
        if (typeof c.conditions !== 'object') return false
        const cond = c.conditions as Record<string, unknown>
        if (cond.headers !== undefined && typeof cond.headers !== 'object') return false
        if (cond.methods !== undefined) {
            if (!Array.isArray(cond.methods) || !cond.methods.every((m) => typeof m === 'string')) return false
        }
        if (cond.origins !== undefined) {
            if (!Array.isArray(cond.origins) || !cond.origins.every((o) => typeof o === 'string')) return false
        }
    }

    // Validate workboxOptions
    if (c.workboxOptions !== undefined && typeof c.workboxOptions !== 'object') return false

    return true
}

/**
 * Validate service worker configuration
 */
export function validateServiceWorkerConfig(config: unknown): config is ServiceWorkerConfig {
    if (!config || typeof config !== 'object') return false

    const c = config as Record<string, unknown>

    // Check required properties
    if (typeof c.destination !== 'string') return false

    // Check route arrays
    if (!Array.isArray(c.staticRoutes) || !c.staticRoutes.every(validateRouteConfig)) return false
    if (!Array.isArray(c.apiRoutes) || !c.apiRoutes.every(validateRouteConfig)) return false
    if (!Array.isArray(c.imageRoutes) || !c.imageRoutes.every(validateRouteConfig)) return false

    // Check optional arrays
    if (c.customRoutes !== undefined) {
        if (!Array.isArray(c.customRoutes) || !c.customRoutes.every(validateRouteConfig)) return false
    }

    // Check optional offline
    if (c.offline !== undefined) {
        if (typeof c.offline !== 'object') return false
        const off = c.offline as Record<string, unknown>
        if (off.fallbackPage !== undefined && typeof off.fallbackPage !== 'string') return false
        if (off.fallbackImage !== undefined && typeof off.fallbackImage !== 'string') return false
    }

    // Check optional features
    if (c.features !== undefined) {
        if (typeof c.features !== 'object') return false
        const f = c.features as Record<string, unknown>
        Object.values(f).forEach((v) => {
            if (typeof v !== 'boolean') return false
        })
    }

    // Check optional security headers
    if (c.securityHeaders !== undefined && typeof c.securityHeaders !== 'object') return false

    // Check optional CORS origins
    if (c.corsOrigins !== undefined) {
        if (!Array.isArray(c.corsOrigins) || !c.corsOrigins.every((o) => typeof o === 'string')) return false
    }

    return true
}
