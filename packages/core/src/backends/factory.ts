/**
 * Backend Integration Factory
 * Manages available backend integrations and detection
 */

import type { BackendIntegration, BackendIntegrationFactory } from './types.js'
import type { Framework } from '../scanner/framework-detector.js'

/**
 * Default factory implementation
 * Will be extended as we add more backend integrations
 */
export class DefaultBackendIntegrationFactory implements BackendIntegrationFactory {
    private integrations: Map<Framework, BackendIntegration> = new Map()

    constructor() {
        this.initializeIntegrations()
    }

    /**
     * Initialize available integrations
     * This will be expanded as we implement each backend
     */
    private initializeIntegrations(): void {
        // Integrations will be registered here as they're implemented
        // Example structure (to be filled in Phase 1):
        // this.registerIntegration(new LaravelIntegration())
        // this.registerIntegration(new SymfonyIntegration())
        // this.registerIntegration(new DjangoIntegration())
    }

    /**
     * Register a new backend integration
     */
    private registerIntegration(integration: BackendIntegration): void {
        this.integrations.set(integration.framework, integration)
    }

    /**
     * Get integration for a specific framework
     */
    getIntegration(framework: Framework): BackendIntegration | null {
        return this.integrations.get(framework) ?? null
    }

    /**
     * Get all registered integrations
     */
    getAllIntegrations(): BackendIntegration[] {
        return Array.from(this.integrations.values())
    }

    /**
     * Detect which backend is in use (placeholder)
     * Will be implemented in phase 1 to detect from project structure
     */
    detectBackend(_projectPath: string): BackendIntegration | null {
        // TODO: Implement detection logic
        // 1. Scan project
        // 2. Try each integration's detect() method
        // 3. Return best match
        return null
    }
}

/**
 * Global factory instance
 */
let globalFactory: BackendIntegrationFactory | null = null

/**
 * Get or create the global factory
 */
export function getBackendFactory(): BackendIntegrationFactory {
    if (!globalFactory) {
        globalFactory = new DefaultBackendIntegrationFactory()
    }
    return globalFactory
}

/**
 * Set custom factory (useful for testing)
 */
export function setBackendFactory(factory: BackendIntegrationFactory): void {
    globalFactory = factory
}

/**
 * Reset to default factory
 */
export function resetBackendFactory(): void {
    globalFactory = null
}
