/**
 * Flask Framework Integration
 *
 * Detects and configures PWA for Flask applications.
 * Supported features:
 * - Flask 1.x, 2.x, 3.x
 * - Static files configuration
 * - Blueprint detection
 * - CSRF token handling (Flask-WTF)
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { BackendDetectionResult, BackendLanguage } from './types.js'
import type { ServiceWorkerConfig } from '../generator/caching-strategy.js'
import { PRESET_STRATEGIES } from '../generator/caching-strategy.js'
import { BaseBackendIntegration } from './base.js'

export interface FlaskConfig {
    projectRoot: string
    version?: string
    staticUrl?: string
    staticFolder?: string
    hasFlaskWTF?: boolean
    hasFlaskRESTful?: boolean
}

/**
 * Detects Flask version from requirements.txt or pyproject.toml
 */
function detectFlaskVersion(projectRoot: string): string | null {
    // Try requirements.txt first
    try {
        const requirementsPath = join(projectRoot, 'requirements.txt')
        if (existsSync(requirementsPath)) {
            const content = readFileSync(requirementsPath, 'utf-8')
            // Match patterns like: Flask==3.0.0, Flask>=2.0, Flask~=3.0
            const match = content.match(/Flask[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i)
            if (match) {
                const major = match[1] ?? '0'
                const minor = match[2] ?? '0'
                const patch = match[3] ?? '0'
                return `${major}.${minor}.${patch}`
            }
        }
    } catch {
        // Continue to next method
    }

    // Try pyproject.toml
    try {
        const pyprojectPath = join(projectRoot, 'pyproject.toml')
        if (existsSync(pyprojectPath)) {
            const content = readFileSync(pyprojectPath, 'utf-8')
            // Match Flask in dependencies
            const match = content.match(/flask\s*=\s*["']?[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i)
            if (match) {
                const major = match[1] ?? '0'
                const minor = match[2] ?? '0'
                const patch = match[3] ?? '0'
                return `${major}.${minor}.${patch}`
            }
        }
    } catch {
        // Return null if both methods fail
    }

    return null
}

function hasFlaskDependency(projectRoot: string): boolean {
    try {
        // Check requirements.txt
        const requirementsPath = join(projectRoot, 'requirements.txt')
        if (existsSync(requirementsPath)) {
            const content = readFileSync(requirementsPath, 'utf-8')
            if (/Flask/i.test(content)) {
                return true
            }
        }

        // Check pyproject.toml
        const pyprojectPath = join(projectRoot, 'pyproject.toml')
        if (existsSync(pyprojectPath)) {
            const content = readFileSync(pyprojectPath, 'utf-8')
            if (/flask/i.test(content)) {
                return true
            }
        }

        return false
    } catch {
        return false
    }
}

/**
 * Detects Flask-WTF (CSRF protection)
 */
function detectFlaskWTF(projectRoot: string): boolean {
    try {
        const requirementsPath = join(projectRoot, 'requirements.txt')
        if (existsSync(requirementsPath)) {
            const content = readFileSync(requirementsPath, 'utf-8')
            if (/Flask-WTF|flask-wtf/i.test(content)) {
                return true
            }
        }

        // Check app.py or application.py for Flask-WTF usage
        const appFiles = ['app.py', 'application.py']
        for (const file of appFiles) {
            const appPath = join(projectRoot, file)
            if (existsSync(appPath)) {
                const content = readFileSync(appPath, 'utf-8')
                if (/from flask_wtf|import FlaskForm|CSRFProtect/i.test(content)) {
                    return true
                }
            }
        }

        return false
    } catch {
        return false
    }
}

/**
 * Detects Flask-RESTful
 */
function detectFlaskRESTful(projectRoot: string): boolean {
    try {
        const requirementsPath = join(projectRoot, 'requirements.txt')
        if (existsSync(requirementsPath)) {
            const content = readFileSync(requirementsPath, 'utf-8')
            if (/Flask-RESTful|flask-restful/i.test(content)) {
                return true
            }
        }

        // Check app.py or application.py for Flask-RESTful usage
        const appFiles = ['app.py', 'application.py']
        for (const file of appFiles) {
            const appPath = join(projectRoot, file)
            if (existsSync(appPath)) {
                const content = readFileSync(appPath, 'utf-8')
                if (/from flask_restful|import Api|import Resource/i.test(content)) {
                    return true
                }
            }
        }

        return false
    } catch {
        return false
    }
}

/**
 * Extracts static folder configuration from Flask app
 */
function extractStaticFilesConfig(projectRoot: string): { staticUrl?: string; staticFolder?: string } {
    const result: { staticUrl?: string; staticFolder?: string } = {}

    try {
        const appFiles = ['app.py', 'application.py']
        for (const file of appFiles) {
            const appPath = join(projectRoot, file)
            if (existsSync(appPath)) {
                const content = readFileSync(appPath, 'utf-8')
                
                // Extract static_folder from Flask app
                const staticFolderMatch = content.match(/static_folder\s*=\s*['"]([^'"]+)['"]/)
                if (staticFolderMatch) {
                    result.staticFolder = staticFolderMatch[1]
                }

                // Extract static_url_path
                const staticUrlMatch = content.match(/static_url_path\s*=\s*['"]([^'"]+)['"]/)
                if (staticUrlMatch) {
                    result.staticUrl = staticUrlMatch[1]
                }
            }
        }
    } catch {
        // Return empty result on error
    }

    return result
}

/**
 * Flask Framework Integration
 */
export class FlaskIntegration extends BaseBackendIntegration {
    readonly id = 'flask'
    readonly name = 'Flask'
    readonly framework = 'flask' as const
    readonly language = 'python' as const

    private config: FlaskConfig

    constructor(projectRoot: string, config?: Partial<FlaskConfig>) {
        super()
        const staticConfig = extractStaticFilesConfig(projectRoot)
        this.config = {
            projectRoot,
            hasFlaskWTF: detectFlaskWTF(projectRoot),
            hasFlaskRESTful: detectFlaskRESTful(projectRoot),
            staticUrl: staticConfig.staticUrl,
            staticFolder: staticConfig.staticFolder,
            ...config,
        }
    }

    /**
     * Detect if project is a Flask application
     */
    detect(): BackendDetectionResult {
        const projectRoot = this.config.projectRoot
        const indicators: string[] = []
        let confidence: 'high' | 'medium' | 'low' = 'low'

        // Check for app.py or application.py (strong indicator)
        if (existsSync(join(projectRoot, 'app.py')) || existsSync(join(projectRoot, 'application.py'))) {
            indicators.push('app.py or application.py')
            confidence = 'medium'
        }

        // Check for Flask dependency
        if (hasFlaskDependency(projectRoot)) {
            indicators.push('Flask dependency in requirements.txt or pyproject.toml')
            if (confidence === 'medium') {
                confidence = 'high'
            }
        }

        // Check for typical Flask structure
        if (existsSync(join(projectRoot, 'templates')) || existsSync(join(projectRoot, 'static'))) {
            indicators.push('Flask structure (templates/ or static/)')
            if (confidence === 'medium') {
                confidence = 'high'
            }
        }

        const version = detectFlaskVersion(projectRoot)

        return {
            detected: indicators.length > 0,
            framework: 'flask',
            language: 'python',
            confidence,
            indicators,
            versions: version ? [version] : undefined,
        }
    }

    /**
     * Generate Flask-optimized Service Worker configuration
     */
    generateServiceWorkerConfig(): ServiceWorkerConfig {
        const staticRoutes = [
            {
                pattern: '/static/**',
                strategy: {
                    ...PRESET_STRATEGIES.StaticAssets,
                    cacheName: 'flask-static-cache',
                    expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 86400 * 30, // 30 days
                    },
                },
                priority: 10,
                description: 'Flask static files',
            },
        ]

        const apiRoutes = [
            {
                pattern: '/api/**',
                strategy: {
                    ...PRESET_STRATEGIES.ApiEndpoints,
                    cacheName: 'flask-api-cache',
                    networkTimeoutSeconds: 3,
                    expiration: {
                        maxEntries: 50,
                        maxAgeSeconds: 300, // 5 minutes
                    },
                },
                priority: 20,
                description: 'Flask API endpoints',
            },
        ]

        const imageRoutes = [
            {
                pattern: '*.{png,jpg,jpeg,svg,webp,gif}',
                strategy: {
                    ...PRESET_STRATEGIES.Images,
                    cacheName: 'flask-images-cache',
                    expiration: {
                        maxEntries: 60,
                        maxAgeSeconds: 86400 * 30, // 30 days
                    },
                },
                priority: 5,
                description: 'Flask images',
            },
        ]

        const customRoutes = this.config.hasFlaskWTF
            ? [
                {
                    pattern: '/csrf-token/**',
                    strategy: {
                        name: 'NetworkOnly' as const,
                        cacheName: 'flask-csrf-cache',
                    },
                    priority: 30,
                    description: 'CSRF token (always fresh)',
                },
            ]
            : []

        return {
            destination: 'sw.js',
            staticRoutes,
            apiRoutes,
            imageRoutes,
            customRoutes,
        }
    }

    /**
     * Generate manifest.json variables for Flask
     */
    generateManifestVariables(): Record<string, string | number> {
        return {
            start_url: this.getStartUrl(),
            scope: '/',
            display: 'standalone',
            theme_color: '#ffffff',
            background_color: '#ffffff',
        }
    }

    /**
     * Get recommended start URL for Flask PWA
     */
    getStartUrl(): string {
        return '/'
    }

    /**
     * Get secure routes that need CSRF/session protection
     */
    getSecureRoutes(): string[] {
        const routes = ['/api/auth/**', '/admin/**']
        if (this.config.hasFlaskWTF) {
            routes.push('/csrf-token/**')
        }
        return routes
    }

    /**
     * Get API endpoint patterns
     */
    getApiPatterns(): string[] {
        const patterns = ['/api/**']
        if (this.config.hasFlaskRESTful) {
            patterns.push('/api/v1/**', '/api/v2/**')
        }
        return patterns
    }

    /**
     * Get static asset patterns
     */
    getStaticAssetPatterns(): string[] {
        const patterns = ['/static/**']
        if (this.config.staticUrl) {
            // Remove leading/trailing slashes and add pattern
            const staticPath = this.config.staticUrl.replace(/^\/|\/$/g, '')
            if (staticPath && staticPath !== 'static') {
                patterns.push(`/${staticPath}/**`)
            }
        }
        return patterns
    }

    /**
     * Validate Flask-specific PWA setup
     */
    async validateSetup(): Promise<{
        isValid: boolean
        errors: string[]
        warnings: string[]
        suggestions: string[]
    }> {
        const errors: string[] = []
        const warnings: string[] = []
        const suggestions: string[] = []

        const projectRoot = this.config.projectRoot

        // Check for app.py or application.py
        if (!existsSync(join(projectRoot, 'app.py')) && !existsSync(join(projectRoot, 'application.py'))) {
            warnings.push('app.py or application.py not found')
        }

        // Check for static folder
        if (!existsSync(join(projectRoot, 'static'))) {
            suggestions.push('Consider creating a static/ folder for static assets')
        }

        // Check for templates folder
        if (!existsSync(join(projectRoot, 'templates'))) {
            suggestions.push('Consider creating a templates/ folder for Jinja2 templates')
        }

        // Suggest Flask-WTF for CSRF protection
        if (!this.config.hasFlaskWTF) {
            suggestions.push('Consider using Flask-WTF for CSRF protection in production')
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            suggestions,
        }
    }

    /**
     * Inject middleware code for Flask
     */
    injectMiddleware(): {
        code: string
        path: string
        language: BackendLanguage
        instructions: string[]
    } {
        return {
            code: `# Add PWA support to Flask app
from flask import Flask, send_from_directory

app = Flask(__name__)

# Serve PWA manifest and service worker
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

# Ensure HTTPS in production
if __name__ == '__main__':
    app.run(ssl_context='adhoc' if app.debug else None)`,
            path: 'app.py',
            language: 'python' as BackendLanguage,
            instructions: [
                'Add PWA routes to your Flask app',
                'Place manifest.json and sw.js in the static/ folder',
                'Ensure HTTPS is enabled in production',
                'Consider using Flask-WTF for CSRF protection',
            ],
        }
    }
}
