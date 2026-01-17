/**
 * Backend Integration Module
 * Provides abstraction layer for backend-specific PWA configurations
 */

export type {
    BackendLanguage,
    RoutePattern,
    BackendDetectionResult,
    BackendIntegration,
    BackendIntegrationFactory,
    BackendPWAOptions,
} from './types.js'

export type { ServiceWorkerConfig } from '../generator/caching-strategy.js'

export { BaseBackendIntegration } from './base.js'
export { DefaultBackendIntegrationFactory, getBackendFactory, setBackendFactory, resetBackendFactory } from './factory.js'

// Backend integrations
export { LaravelIntegration } from './laravel.js'
export { SymfonyIntegration } from './symfony.js'
