/**
 * Route Pattern Resolver
 *
 * Converts and resolves route patterns for service worker caching
 * Supports glob patterns and regex patterns with priority handling
 */

import type { RouteConfig } from './caching-strategy.js'

/**
 * Converts glob patterns to regex
 *
 * Examples:
 *   '/api/**' → /^\/api\//
 *   '*.{js,css}' → /\.(js|css)$/
 *   '/images/*' → /^\/images\/[^/]+$/
 *   '/assets/**\/*.js' → /^\/assets\/.+\.js$/
 */
export class RoutePatternResolver {
    /**
     * Convert glob pattern to regex
     */
    static globToRegex(glob: string): RegExp {
        // Escape special regex characters except * and ? and {}
        let pattern = glob
            .replace(/\./g, '\\.')
            .replace(/\+/g, '\\+')
            .replace(/\^/g, '\\^')
            .replace(/\$/g, '\\$')
            .replace(/\|/g, '\\|')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')

        // Handle character classes {js,css,html} → (js|css|html)
        pattern = pattern.replace(/\{([^}]+)\}/g, (_, content: string) => {
            return `(${content.split(',').join('|')})`
        })

        // Handle ** (any number of path segments) - must be before single *
        pattern = pattern.replace(/\*\*/g, '<<<DOUBLE_STAR>>>')

        // Handle * (any segment except /)
        pattern = pattern.replace(/\*/g, '[^/]*')

        // Handle ? (single character)
        pattern = pattern.replace(/\?/g, '.')

        // Replace placeholder for double star
        pattern = pattern.replace(/<<<DOUBLE_STAR>>>/g, '.+')

        // Add anchors if not already present
        if (!pattern.startsWith('^')) pattern = '^' + pattern
        if (!pattern.endsWith('$')) pattern = pattern + '$'

        try {
            return new RegExp(pattern)
        } catch {
            // Fallback to exact match if regex is invalid
            return new RegExp(`^${glob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
        }
    }

    /**
     * Check if URL matches pattern (string or regex)
     */
    static matches(url: string, pattern: string | RegExp): boolean {
        if (typeof pattern === 'string') {
            const regex = this.globToRegex(pattern)
            return regex.test(url)
        }

        return pattern.test(url)
    }

    /**
     * Normalize URL for pattern matching
     * - Remove query strings
     * - Remove fragments
     * - Ensure leading slash
     */
    static normalizeUrl(url: string): string {
        // Remove fragment and query
        const normalized = url.split(/[?#]/)[0]

        // Ensure leading slash
        return normalized.startsWith('/') ? normalized : `/${normalized}`
    }

    /**
     * Sort routes by priority (higher first)
     * Default priority is 0
     */
    static sortByPriority(routes: RouteConfig[]): RouteConfig[] {
        return [...routes].sort((a, b) => {
            const priorityA = a.priority ?? 0
            const priorityB = b.priority ?? 0

            // Higher priority first
            if (priorityA !== priorityB) {
                return priorityB - priorityA
            }

            // If same priority, static routes before dynamic
            const isStaticA = typeof a.pattern === 'string' && !a.pattern.includes('*')
            const isStaticB = typeof b.pattern === 'string' && !b.pattern.includes('*')

            if (isStaticA && !isStaticB) return -1
            if (!isStaticA && isStaticB) return 1

            return 0
        })
    }

    /**
     * Deduplicate overlapping routes
     * Keeps the first (highest priority) match
     */
    static deduplicate(routes: RouteConfig[]): RouteConfig[] {
        const sorted = this.sortByPriority(routes)
        const seen = new Set<string>()
        const result: RouteConfig[] = []

        for (const route of sorted) {
            const key = JSON.stringify({
                pattern: route.pattern.toString(),
                cacheName: route.strategy.cacheName,
            })

            if (!seen.has(key)) {
                seen.add(key)
                result.push(route)
            }
        }

        return result
    }

    /**
     * Find the best matching route for a URL
     */
    static findBestMatch(url: string, routes: RouteConfig[]): RouteConfig | undefined {
        const normalized = this.normalizeUrl(url)
        const sorted = this.sortByPriority(routes)

        for (const route of sorted) {
            if (this.matches(normalized, route.pattern)) {
                return route
            }
        }

        return undefined
    }

    /**
     * Get all matching routes for a URL (in priority order)
     */
    static findMatches(url: string, routes: RouteConfig[]): RouteConfig[] {
        const normalized = this.normalizeUrl(url)
        const sorted = this.sortByPriority(routes)

        return sorted.filter((route) => this.matches(normalized, route.pattern))
    }

    /**
     * Convert RouteConfig patterns to Workbox format
     * Returns array suitable for Workbox runtimeCaching
     */
    static toWorkboxFormat(routes: RouteConfig[]): Array<{
        urlPattern: RegExp
        handler: string
        options?: Record<string, unknown>
    }> {
        const sorted = this.sortByPriority(routes)

        return sorted.map((route) => {
            const urlPattern = typeof route.pattern === 'string' ? this.globToRegex(route.pattern) : route.pattern

            const options: Record<string, unknown> = {
                cacheName: route.strategy.cacheName,
            }

            if (route.strategy.networkTimeoutSeconds !== undefined) {
                options.networkTimeoutSeconds = route.strategy.networkTimeoutSeconds
            }

            if (route.strategy.expiration !== undefined) {
                options.expiration = route.strategy.expiration
            }

            if (route.strategy.headers !== undefined) {
                options.headers = route.strategy.headers
            }

            if (route.strategy.workboxOptions !== undefined) {
                Object.assign(options, route.strategy.workboxOptions)
            }

            return {
                urlPattern,
                handler: route.strategy.name,
                options,
            }
        })
    }

    /**
     * Validate all patterns in routes
     * Returns validation errors if any
     */
    static validatePatterns(routes: RouteConfig[]): string[] {
        const errors: string[] = []

        routes.forEach((route, index) => {
            if (typeof route.pattern === 'string') {
                try {
                    this.globToRegex(route.pattern)
                } catch {
                    errors.push(`Route ${index}: Invalid glob pattern "${route.pattern}"`)
                }
            } else if (route.pattern instanceof RegExp) {
                // RegExp is valid if it can be created
            } else {
                errors.push(`Route ${index}: Pattern must be string or RegExp`)
            }

            if (!route.strategy) {
                errors.push(`Route ${index}: Strategy is required`)
                return
            }

            if (route.strategy.name && !['CacheFirst', 'NetworkFirst', 'StaleWhileRevalidate', 'NetworkOnly', 'CacheOnly'].includes(route.strategy.name)) {
                errors.push(`Route ${index}: Invalid strategy name "${route.strategy.name}"`)
            }
        })

        return errors
    }

    /**
     * Test pattern matching with example URLs
     * Useful for debugging patterns
     */
    static testPattern(pattern: string | RegExp, testUrls: string[]): Record<string, boolean> {
        const result: Record<string, boolean> = {}

        for (const url of testUrls) {
            result[url] = this.matches(url, pattern)
        }

        return result
    }
}
