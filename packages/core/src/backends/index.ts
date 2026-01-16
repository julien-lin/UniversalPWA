/**
 * Backend Integration Module
 * Provides abstraction layer for backend-specific PWA configurations
 */

export type {
    BackendLanguage,
    CacheStrategy,
    RoutePattern,
    BackendDetectionResult,
    BackendIntegration,
    BackendIntegrationFactory,
    BackendPWAOptions,
} from './types.js'

export type { ServiceWorkerConfig } from '../generator/caching-strategy.js'

export { BaseBackendIntegration } from './base.js'
export { DefaultBackendIntegrationFactory, getBackendFactory, setBackendFactory, resetBackendFactory } from './factory.js'

// Backend integrations will be exported here as they're implemented
// export { LaravelIntegration } from './laravel.ts'
// export { SymfonyIntegration } from './symfony.ts'
// export { DjangoIntegration } from './django.ts'
