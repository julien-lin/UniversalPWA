# Backend Integration Layer

**Module**: `packages/core/src/backends/`  
**Purpose**: Framework-specific PWA generation configurations  
**Status**: 🔴 Phase 1 - In Development

---

## Overview

The Backend Integration Layer provides abstraction and framework-specific optimizations for PWA generation.

Instead of generic PWA configs, each backend (Laravel, Symfony, Django, Rails, etc.) gets:
- ✅ Custom Service Worker configuration
- ✅ Framework-specific route patterns
- ✅ Security headers & CSRF token handling
- ✅ Offline fallbacks
- ✅ Framework feature detection (ISR, prefetch, etc.)

---

## Architecture

```
backends/
├── types.ts              # Core interfaces & types
├── base.ts               # BaseBackendIntegration abstract class
├── factory.ts            # Factory for managing integrations
├── index.ts              # Exports
├── __tests__/
│   ├── base.test.ts      # Interface validation tests
│   ├── laravel.test.ts   # (Phase 1)
│   ├── symfony.test.ts   # (Phase 1)
│   └── django.test.ts    # (Phase 1)
├── laravel.ts            # LaravelIntegration (Phase 1)
├── symfony.ts            # SymfonyIntegration (Phase 1)
├── django.ts             # DjangoIntegration (Phase 1)
└── flask.ts              # FlaskIntegration (Phase 1)
```

---

## Core Interfaces

### BackendIntegration

```typescript
interface BackendIntegration {
  // Identification
  id: string
  name: string
  framework: Framework
  language: BackendLanguage
  
  // Detection
  detect(): BackendDetectionResult
  
  // Configuration
  generateServiceWorkerConfig(architecture: Architecture): ServiceWorkerConfig
  generateManifestVariables(): Record<string, string | number>
  getStartUrl(): string
  
  // Integration
  injectMiddleware(): { code, path, language, instructions }
  
  // Routes
  getSecureRoutes(): string[]
  getApiPatterns(): string[]
  getStaticAssetPatterns(): string[]
  
  // Validation
  validateSetup(): Promise<{ isValid, errors, warnings, suggestions }>
}
```

### ServiceWorkerConfig

```typescript
interface ServiceWorkerConfig {
  destination: string
  staticRoutes: RoutePattern[]      // CacheFirst by default
  apiRoutes: RoutePattern[]         // NetworkFirst by default
  imageRoutes: RoutePattern[]       // StaleWhileRevalidate
  customRoutes?: RoutePattern[]
  
  offline?: {
    fallbackPage?: string
    fallbackImage?: string
  }
  
  features?: {
    prefetch?: boolean              // Next.js
    prerender?: boolean             // Astro
    isr?: boolean                   // Next.js
    hydration?: boolean             // SSR
    streaming?: boolean             // React 18
  }
  
  securityHeaders?: Record<string, string>
  corsOrigins?: string[]
}
```

### RoutePattern

```typescript
interface RoutePattern {
  pattern: string | RegExp
  strategy: CacheStrategy
  cacheName?: string
  networkTimeoutSeconds?: number
  expiration?: {
    maxAgeSeconds?: number
    maxEntries?: number
  }
  headers?: Record<string, string>
}
```

---

## Implementing a New Backend Integration

### Step 1: Create the class

```typescript
// backends/laravel.ts

import { BaseBackendIntegration } from './base.js'
import type { BackendDetectionResult, ServiceWorkerConfig } from './types.js'
import type { Architecture } from '../scanner/architecture-detector.js'

export class LaravelIntegration extends BaseBackendIntegration {
  readonly id = 'laravel'
  readonly name = 'Laravel'
  readonly framework = 'laravel' as const
  readonly language = 'php' as const

  detect(): BackendDetectionResult {
    // Implementation: check files, directories, composer.json
  }

  generateServiceWorkerConfig(architecture: Architecture): ServiceWorkerConfig {
    // Implementation: return Laravel-optimized config
  }

  generateManifestVariables() {
    // Implementation: return Laravel-specific manifest values
  }

  getStartUrl() {
    return '/'
  }

  async validateSetup() {
    // Implementation: validate Laravel PWA setup
  }
}
```

### Step 2: Implement detection

```typescript
detect(): BackendDetectionResult {
  const indicators: string[] = []
  
  // Check composer.json
  const hasComposerJson = existsSync(join(this.projectPath, 'composer.json'))
  if (!hasComposerJson) {
    return { detected: false, ... }
  }
  
  const composerContent = readFileSync(...)
  const dependencies = JSON.parse(composerContent)
  
  if (!dependencies.require?.['laravel/framework']) {
    return { detected: false, ... }
  }
  
  indicators.push('composer.json: laravel/framework')
  
  // Check for Laravel-specific directories
  if (existsSync(join(this.projectPath, 'app'))) {
    indicators.push('app/')
  }
  if (existsSync(join(this.projectPath, 'config'))) {
    indicators.push('config/')
  }
  if (existsSync(join(this.projectPath, 'routes'))) {
    indicators.push('routes/')
  }
  
  // Calculate confidence
  const confidence = indicators.length >= 3 ? 'high' : 'medium'
  
  return {
    detected: true,
    framework: 'laravel',
    language: 'php',
    confidence,
    indicators,
  }
}
```

### Step 3: Generate Service Worker config

```typescript
generateServiceWorkerConfig(architecture: Architecture): ServiceWorkerConfig {
  return {
    destination: 'public/sw.js',
    
    staticRoutes: [
      // Laravel public folder
      this.createRoutePattern('/app/**', 'CacheFirst', {
        cacheName: 'laravel-app',
        expiration: { maxAgeSeconds: 31536000 },
      }),
      ...this.defaultStaticRoutes,
    ],
    
    apiRoutes: [
      // Laravel API routes with CSRF
      this.createRoutePattern('/api/**', 'NetworkFirst', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': 'from-manifest',
        },
      }),
      ...this.defaultApiRoutes,
    ],
    
    imageRoutes: this.defaultImageRoutes,
    
    offline: {
      fallbackPage: '/offline.html',
    },
    
    securityHeaders: {
      'X-CSRF-TOKEN': 'from-manifest',
    },
  }
}
```

### Step 4: Write tests

```typescript
// backends/__tests__/laravel.test.ts

describe('LaravelIntegration', () => {
  it('should detect Laravel projects', () => {
    // Create test Laravel project structure
    // Call detect()
    // Assert detection works
  })
  
  it('should generate correct SW config', () => {
    // Create integration
    // Call generateServiceWorkerConfig()
    // Assert config matches Laravel needs
  })
  
  it('should handle CSRF tokens', () => {
    // Assert CSRF headers in API routes
  })
})
```

### Step 5: Register in factory

```typescript
// backends/factory.ts

import { LaravelIntegration } from './laravel.js'

private initializeIntegrations(): void {
  this.registerIntegration(new LaravelIntegration())
  // More integrations...
}
```

---

## Usage

### From CLI

```typescript
import { getBackendFactory } from '@julien-lin/universal-pwa-core'

const factory = getBackendFactory()
const laravel = factory.getIntegration('laravel')

if (laravel) {
  const config = laravel.generateServiceWorkerConfig('spa')
  // Use config to generate optimized SW
}
```

### From Core

```typescript
import { scanProject } from '@julien-lin/universal-pwa-core'
import { getBackendFactory } from '@julien-lin/universal-pwa-core/backends'

const scanResult = await scanProject({ projectPath })
const framework = scanResult.framework.framework // e.g., 'laravel'

const factory = getBackendFactory()
const integration = factory.getIntegration(framework)

if (integration) {
  // Use framework-specific config
} else {
  // Fallback to generic config
}
```

---

## Supported Frameworks (Roadmap)

### Phase 1 (Jan-Feb 2026) 🔴
- [ ] Laravel (PHP)
- [ ] Symfony (PHP)
- [ ] Django (Python)
- [ ] Flask (Python)

### Phase 2 (Mar-May 2026)
- [ ] Rails (Ruby)
- [ ] Spring Boot (Java)

### Phase 3 (June-Aug 2026)
- [ ] Go (native, Fiber, Gin, Echo)

### Phase 4+ Future
- [ ] ASP.NET Core (.NET)
- [ ] Express.js (Node.js)
- [ ] Fastify (Node.js)
- [ ] And more...

---

## Detection Patterns

See [BACKEND_DETECTION_PATTERNS.md](./BACKEND_DETECTION_PATTERNS.md) for detailed detection logic.

Each backend checks:
1. **Files**: composer.json, package.json, Gemfile, go.mod, etc.
2. **Directories**: app/, config/, src/, etc.
3. **Configuration**: Version detection, dependency parsing
4. **Confidence**: Score based on indicators

---

## Architecture Decisions

See [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) for design rationale.

Key decisions:
- ✅ Backend abstraction for modularity
- ✅ Framework-specific templates
- ✅ Multi-language SDKs (Phase 2-4)
- ✅ Manual middleware injection (safe)
- ✅ Feature flags for optimizations
- ✅ Comprehensive testing

---

## Testing Strategy

```
__tests__/
├── base.test.ts              # Interface validation
├── laravel.test.ts
│   ├── detection.test.ts     # Detection accuracy
│   ├── config.test.ts        # Config generation
│   └── fixtures/
│       └── laravel-project/  # Real Laravel project
├── symfony.test.ts
└── django.test.ts
```

Each integration tested with:
- Unit tests (mocked structures)
- Integration tests (real fixtures)
- E2E tests (full PWA generation)

---

## Performance Considerations

Detection performance:
```
Fast path (cached):     <100ms
Quick checks:           ~500ms
Full detection:         ~2s
```

Optimization strategies:
1. File existence checks first (fastest)
2. Cache results
3. Parallel detection if needed
4. Skip slow checks when confidence is high

---

## Adding a New Language SDK

When supporting a new language (e.g., Python), create:

```
packages/sdk-python/
├── universal_pwa/
│   ├── backends/
│   │   ├── base.py           # Base class (translated from TS)
│   │   ├── django.py         # Django integration
│   │   ├── flask.py          # Flask integration
│   │   └── types.py          # Type definitions
│   └── __init__.py
├── tests/
├── pyproject.toml
└── README.md
```

---

## Common Patterns

### Detecting Framework with Multiple Indicators

```typescript
detect(): BackendDetectionResult {
  const indicators: string[] = []
  const confidence = 'high' // Start high, lower if needed
  
  // Check multiple files
  if (hasFile('composer.json') && hasDependency('laravel/framework')) {
    indicators.push('composer.json: laravel/framework')
  }
  
  if (hasDir('app')) indicators.push('app/')
  if (hasDir('config')) indicators.push('config/')
  if (hasFile('artisan')) indicators.push('artisan file')
  
  // If multiple indicators, very confident
  if (indicators.length >= 3) {
    return { detected: true, confidence: 'high', indicators }
  }
  
  if (indicators.length >= 1) {
    return { detected: true, confidence: 'medium', indicators }
  }
  
  return { detected: false, ... }
}
```

### Handling Framework Versions

```typescript
generateServiceWorkerConfig(architecture: Architecture): ServiceWorkerConfig {
  const version = this.detectVersion() // Parse from composer.json
  
  if (version?.major === 5) {
    // Laravel 5-specific config
    return this.generateLaravel5Config()
  } else if (version?.major === 6) {
    // Laravel 6-specific config
    return this.generateLaravel6Config()
  } else {
    // Modern Laravel (7+)
    return this.generateModernLaravelConfig()
  }
}
```

---

## Contributing

To add support for a new backend:

1. Create new class extending `BaseBackendIntegration`
2. Implement all abstract methods
3. Add comprehensive tests (unit + integration)
4. Document detection patterns
5. Add to factory
6. Submit PR with evidence from real projects

---

## References

- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - Design rationale
- [BACKEND_DETECTION_PATTERNS.md](./BACKEND_DETECTION_PATTERNS.md) - Detection patterns
- [TODOLIST_IMPLEMENTATION.md](../../TODOLIST_IMPLEMENTATION.md) - Roadmap & tasks

---

**Status**: 🔴 Phase 1 - In Development  
**Last Updated**: 2026-01-16  
**Maintainer**: @julien-lin
