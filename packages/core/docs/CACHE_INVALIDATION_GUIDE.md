# Cache Invalidation Strategy Guide

## Table of Contents

1. [Overview](#overview)
2. [Versioning Strategies](#versioning-strategies)
3. [Invalidation Triggers](#invalidation-triggers)
4. [Dependency Graph & Cascade Invalidation](#dependency-graph--cascade-invalidation)
5. [Real-World Scenarios](#real-world-scenarios)
6. [Configuration](#configuration)
7. [Testing & Debugging](#testing--debugging)
8. [Best Practices](#best-practices)

---

## Overview

Universal PWA implements a sophisticated cache invalidation system to ensure users always receive fresh content while maintaining offline functionality. The system includes:

- **Versioning**: Automatic or manual version management
- **File Change Detection**: Tracks file hash changes to trigger invalidation
- **Dependency Tracking**: Maintains dependency graphs for cascade invalidation
- **Configurable Strategies**: Customize invalidation rules per project

### Key Interfaces

```typescript
// Core cache version structure
interface CacheVersion {
  version: string; // Version identifier (v1.0.0 or hash)
  timestamp: number; // When version was created
  fileHashes: Record<string, string>; // SHA-256 hash of each tracked file
}

// Invalidation result
interface InvalidationResult {
  shouldInvalidate: boolean; // Whether cache should be cleared
  reason?: string; // Why invalidation was triggered
  changedFiles?: string[]; // Which files changed
  newVersion?: string; // New version after invalidation
}

// Dependency graph for cascade invalidation
interface DependencyGraph {
  dependents: Map<string, string[]>; // file → [files that depend on it]
  dependencies: Map<string, string[]>; // file → [files it depends on]
}
```

---

## Versioning Strategies

Universal PWA supports three versioning approaches:

### 1. Manual Versioning

Explicitly set the cache version. Useful for controlled deployments.

```typescript
// universal-pwa.config.ts
export default {
  serviceWorker: {
    advanced: {
      versioning: {
        manualVersion: "v1.2.3",
      },
    },
  },
};
```

**When to use:**

- Coordinated releases across services
- Marketing campaigns (version bump for announcements)
- When you need explicit version control

**Invalidation triggers:**

- Version string changes (v1.2.3 → v1.2.4)

### 2. Auto Versioning

Automatically generate version from file hashes.

```typescript
export default {
  serviceWorker: {
    advanced: {
      versioning: {
        autoVersion: true,
      },
      dependencies: {
        enabled: true,
        trackedFiles: [
          "**/*.js",
          "**/*.css",
          "src/**/*.ts", // Include source if serving SSR
        ],
      },
    },
  },
};
```

**How it works:**

1. Scans project for tracked files
2. Computes SHA-256 hash of each file
3. Creates version hash: `sha256(sorted-hashes).substring(0, 8)`
4. Stores file hashes for change detection

**Invalidation triggers:**

- Any tracked file hash changes
- File deletion (if tracked)
- New file matching pattern

### 3. Timestamp Versioning (Default)

Simple timestamp-based versioning when neither manual nor auto is configured.

```typescript
// Auto-generated: v{timestamp}
version: "v1705000000000";
```

**When to use:**

- Development/testing
- Quick iterations
- When file change tracking isn't needed

---

## Invalidation Triggers

### File Change Detection

Compares current file hashes with stored version:

```typescript
// Detect which files changed
const changedFiles: string[] = [];

for (const [file, newHash] of Object.entries(newVersion.fileHashes)) {
  const oldHash = currentVersion.fileHashes[file];
  if (oldHash !== newHash) {
    changedFiles.push(file); // File was modified
  }
}

// Detect deleted files
for (const file of Object.keys(currentVersion.fileHashes)) {
  if (!(file in newVersion.fileHashes)) {
    changedFiles.push(file); // File was deleted
  }
}
```

### Ignore Patterns

Skip files that shouldn't trigger invalidation:

```typescript
export default {
  serviceWorker: {
    advanced: {
      invalidation: {
        ignorePatterns: [
          "**/*.map", // Source maps
          "**/.DS_Store", // macOS metadata
          "**/node_modules/**", // Dependencies
          "**/*.log", // Logs
          "**/coverage/**", // Test coverage
        ],
      },
    },
  },
};
```

---

## Dependency Graph & Cascade Invalidation

When one asset changes, dependent assets may become stale. Cascade invalidation intelligently invalidates related caches.

### Building the Graph

```typescript
const routes: RouteConfig[] = [
  {
    pattern: "/app.js",
    strategy: PRESET_STRATEGIES.StaticAssets,
    dependencies: ["/app.css", "/vendor.js"], // app.js depends on these
  },
  {
    pattern: "/app.css",
    strategy: PRESET_STRATEGIES.StaticAssets,
    dependencies: ["/fonts.css"],
  },
];

// Builds map of:
// - '/fonts.css' depends on: nothing
// - '/app.css' depends on: /fonts.css
// - '/app.js' depends on: /app.css, /vendor.js
```

### Cascade Detection

When `/fonts.css` changes:

1. Invalidate `/fonts.css` cache
2. Invalidate `/app.css` (depends on /fonts.css)
3. Invalidate `/app.js` (depends on /app.css)

```typescript
// Result: 3 caches invalidated instead of 1
const invalidated = getCascadeInvalidation("/fonts.css", graph);
// → ['/fonts.css', '/app.css', '/app.js']
```

### Example: Import Chains

```
entry.js
├── utils.js (changed)
├── config.json (depends on utils.js)
└── app.js (depends on config.json)

Cascade chain:
  utils.js → config.json → app.js
  (3 caches invalidated)
```

---

## Real-World Scenarios

### Scenario 1: JavaScript Bundle Update (SPA Framework)

**Setup:**

```typescript
export default {
  framework: "React",
  serviceWorker: {
    advanced: {
      versioning: { autoVersion: true },
      dependencies: {
        enabled: true,
        trackedFiles: ["dist/**/*.js", "dist/**/*.css", "public/index.html"],
      },
      routes: [
        {
          pattern: /^\/static\//,
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["index.html"], // HTML depends on assets
        },
      ],
    },
  },
};
```

**What happens:**

1. Developer builds React app: `pnpm build`
2. Hash of `dist/index.abc123.js` changes
3. Auto-version detects change
4. Cache invalidation triggered
5. User receives new bundle on next visit

**Result:**

- ✅ Old users get new code (cache cleared)
- ✅ Users on old version not affected mid-session
- ✅ Offline fallback still works until new assets loaded

---

### Scenario 2: API Backend Schema Update (Node.js/Express)

**Setup:**

```typescript
export default {
  framework: "Express",
  serviceWorker: {
    advanced: {
      versioning: { manualVersion: "v1.2.3" },
      routes: [
        {
          pattern: /^\/api\//,
          strategy: PRESET_STRATEGIES.ApiEndpoints,
          networkTimeoutSeconds: 3,
          // Don't cache API responses
        },
        {
          pattern: /^\/data\//,
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["/api/config"], // Data depends on API
        },
      ],
    },
  },
};
```

**What happens:**

1. Backend deploys new API schema (v1.2.3)
2. Developers bump version in config
3. Service worker version changes
4. Cache invalidated
5. Frontend requests fresh data

**Result:**

- ✅ Old cached responses don't break new frontend code
- ✅ API versioning stays in sync
- ✅ NetworkFirst strategy keeps users online

---

### Scenario 3: CSS/Image Asset CDN Update (Static Site)

**Setup:**

```typescript
export default {
  architecture: "static",
  serviceWorker: {
    advanced: {
      versioning: { autoVersion: true },
      dependencies: {
        enabled: true,
        trackedFiles: [
          "public/**/*.css",
          "public/**/*.{png,jpg,svg}",
          "src/**/*.html",
        ],
      },
      invalidation: {
        ignorePatterns: [
          "**/*.map",
          "**/fonts/*.woff2", // Long-lived assets
        ],
      },
      routes: [
        {
          pattern: /^\/images\//,
          strategy: {
            name: "CacheFirst",
            cacheName: "images-v1",
            expiration: {
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              maxEntries: 100,
            },
          },
          dependencies: ["index.html"], // Images needed by pages
        },
        {
          pattern: /^\/styles\//,
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["index.html"],
        },
      ],
    },
  },
};
```

**What happens:**

1. Designer updates `public/styles/theme.css`
2. Auto-version detects CSS file hash changed
3. Cache for styles invalidated
4. Images cached separately (won't invalidate unless they change)
5. User gets new styles, keeps cached images

**Result:**

- ✅ Granular invalidation (only CSS, not images)
- ✅ CDN images stay cached longer
- ✅ Reduced bandwidth usage

---

### Scenario 4: Framework Migration (Next.js SSR)

**Setup:**

```typescript
export default {
  framework: "Next.js",
  architecture: "ssr",
  serviceWorker: {
    advanced: {
      versioning: { manualVersion: "v2.0.0" }, // Major version for migration
      routes: [
        {
          pattern: /^\/api\/revalidate/,
          strategy: PRESET_STRATEGIES.NetworkFirst,
          networkTimeoutSeconds: 1,
        },
        {
          pattern: /^\/img\//,
          strategy: {
            name: "StaleWhileRevalidate",
            cacheName: "next-images",
            expiration: { maxAgeSeconds: 86400 }, // 24h
          },
          dependencies: ["/api/revalidate"],
        },
      ],
    },
  },
};
```

**What happens:**

1. Deploy Next.js v2 with new image loader
2. Version bumped: v1.9.9 → v2.0.0
3. Cache fully invalidated
4. ISR routes use NetworkFirst for fresh content
5. Images cached with background revalidation

**Result:**

- ✅ Clean migration without old version artifacts
- ✅ ISR (Incremental Static Regeneration) works
- ✅ Users gradually see new optimizations

---

## Configuration

### Advanced Caching Config

```typescript
interface AdvancedCachingConfig {
  routes: RouteConfig[];

  global?: {
    version?: string; // Override version
    cacheNamePrefix?: string; // e.g., 'myapp-v1-'
    defaultStrategy?: CachingStrategy;
  };

  versioning?: {
    autoVersion?: boolean; // Generate from file hashes
    manualVersion?: string; // e.g., 'v1.2.3'
    autoInvalidate?: boolean; // Automatically check for changes
  };

  dependencies?: {
    enabled: boolean;
    trackedFiles?: string[]; // glob patterns
  };

  invalidation?: {
    onFileChange?: boolean; // Invalidate if file changes
    onVersionChange?: boolean; // Invalidate if version changes
    ignorePatterns?: string[]; // Files that don't trigger invalidation
  };
}
```

### Example Configuration

```typescript
// universal-pwa.config.ts
import { defineConfig, PRESET_STRATEGIES } from "@julien-lin/universal-pwa";

export default defineConfig({
  name: "My App",
  shortName: "App",
  icons: "./src/logo.png",

  serviceWorker: {
    advanced: {
      versioning: {
        autoVersion: true,
        autoInvalidate: true,
      },
      dependencies: {
        enabled: true,
        trackedFiles: [
          "src/**/*.ts",
          "src/**/*.tsx",
          "public/**/*.css",
          "public/**/*.{png,svg,jpg}",
        ],
      },
      invalidation: {
        ignorePatterns: ["**/*.map", "node_modules/**", ".git/**"],
      },
      routes: [
        // Static assets
        {
          pattern: /^\/static\//,
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["/index.html"],
        },

        // API endpoints
        {
          pattern: /^\/api\//,
          strategy: PRESET_STRATEGIES.ApiEndpoints,
        },

        // Images
        {
          pattern: /^\/images\//,
          strategy: {
            name: "CacheFirst",
            cacheName: "images",
            expiration: {
              maxAgeSeconds: 2592000, // 30 days
              maxEntries: 50,
            },
          },
          dependencies: ["/index.html"],
        },
      ],
    },
  },
});
```

---

## Testing & Debugging

### 1. Check Current Cache Version

```typescript
// In your app
navigator.serviceWorker.controller?.postMessage({
  type: "GET_VERSION",
});

// In service worker
self.addEventListener("message", (event) => {
  if (event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      timestamp: CACHE_TIMESTAMP,
    });
  }
});
```

### 2. Monitor Cache Invalidation

```typescript
// Enable debugging in config
export default defineConfig({
  serviceWorker: {
    advanced: {
      versioning: { autoVersion: true },
    },
    debug: true, // Log invalidation events
  },
});

// Check browser console for:
// [SW] Cache invalidated: reason
// [SW] Changed files: app.js, config.json
// [SW] New version: abc12345
```

### 3. Test File Change Detection

```bash
# Modify a tracked file
echo "// update" >> src/app.js

# Rebuild and bump version
pnpm build

# Check if invalidation detected
# Look for "Changed files" log in SW
```

### 4. Inspect Service Worker Cache

```javascript
// In browser console
(async () => {
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    const requests = await cache.keys();
    console.log(`${name}: ${requests.length} entries`);
  }
})();
```

---

## Best Practices

### 1. Versioning Strategy Selection

| Strategy      | When to Use           | Pros              | Cons                   |
| ------------- | --------------------- | ----------------- | ---------------------- |
| **Manual**    | Controlled releases   | Explicit control  | Manual maintenance     |
| **Auto**      | Continuous deployment | Automatic updates | File scanning overhead |
| **Timestamp** | Development           | Simple            | Non-deterministic      |

### 2. File Tracking

```typescript
// ✅ DO: Track framework output
trackedFiles: ["dist/**/*.js", "dist/**/*.css", "build/**/*.html"];

// ❌ DON'T: Track source files in production
trackedFiles: [
  "src/**/*.ts", // Too granular, slow
  "src/**/*.jsx",
];

// ✅ DO: Ignore non-code files
ignorePatterns: [
  "**/*.map", // Source maps
  "**/node_modules/**", // Dependencies
  ".git/**", // Version control
  "**/.env*", // Configuration
];
```

### 3. Dependency Management

```typescript
// ✅ DO: Define true dependencies
routes: [
  {
    pattern: "/app.js",
    dependencies: [
      "/app.css", // CSS is imported by JS
      "/runtime.js", // Shared runtime
    ],
  },
];

// ❌ DON'T: Over-link everything
routes: [
  {
    pattern: "/app.js",
    dependencies: [
      "/fonts.woff2",
      "/images/logo.png", // Not imported by JS
      "/third-party.js", // External source
    ],
  },
];
```

### 4. Cache Naming

```typescript
// ✅ DO: Use semantic names
cacheName: "static-assets-v1";
cacheName: "api-responses";
cacheName: "images-cdn";

// ❌ DON'T: Use timestamps
cacheName: `cache-${Date.now()}`; // Creates new cache every build

// ✅ DO: Version cache names for migrations
cacheName: "images-v1"; // Can migrate to v2 later
```

### 5. Expiration Policies

```typescript
// ✅ DO: Different TTLs for different assets
{
  // Long-lived: versioned assets
  name: 'CacheFirst',
  expiration: {
    maxAgeSeconds: 365 * 24 * 60 * 60  // 1 year
  }
},
{
  // Short-lived: API responses
  name: 'NetworkFirst',
  expiration: {
    maxAgeSeconds: 60 * 60  // 1 hour
  }
},
{
  // Medium: CSS/JS
  name: 'StaleWhileRevalidate',
  expiration: {
    maxAgeSeconds: 7 * 24 * 60 * 60  // 1 week
  }
}
```

### 6. Production Checklist

- [ ] Version strategy decided (manual/auto/timestamp)
- [ ] File patterns defined and tested
- [ ] Ignore patterns include all non-code files
- [ ] Dependencies mapped correctly
- [ ] Cache TTLs set appropriately
- [ ] Version bumping automated in CI/CD
- [ ] Rollback strategy documented
- [ ] Monitoring/debugging enabled
- [ ] Tested with real network conditions (slow 3G)
- [ ] Tested across frameworks (React, Vue, Next.js, etc.)

---

## Advanced Topics

### Custom Invalidation Logic

```typescript
// Extend invalidation with custom logic
function customInvalidationCheck(
  projectPath: string,
  currentVersion: CacheVersion,
  config: AdvancedCachingConfig,
): boolean {
  // Check build number
  const buildNumber = readBuildNumber();
  const lastBuild = readLastBuildFromVersion(currentVersion);

  if (buildNumber !== lastBuild) {
    return true;
  }

  // Check environment
  if (process.env.CACHE_BUST === "true") {
    return true;
  }

  return false;
}
```

### Monitoring Cache Health

```typescript
// Track cache hits/misses
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        console.log(`[Cache HIT] ${event.request.url}`);
        return response;
      }

      console.log(`[Cache MISS] ${event.request.url}`);
      return fetch(event.request);
    }),
  );
});
```

---

## Troubleshooting

### Users Still Seeing Old Version

**Causes:**

1. Browser cached service worker file
2. Version not changed
3. CDN caching service worker

**Solutions:**

1. Add `Cache-Control: max-age=0` to service worker
2. Ensure version changes on deployment
3. Invalidate CDN cache

### Cache Growing Too Large

**Causes:**

1. No expiration policy
2. `maxEntries` too high
3. Long-lived cache names

**Solutions:**

1. Add `expiration` to caching strategies
2. Reduce `maxEntries` for non-critical caches
3. Implement cache versioning strategy

### Cascade Invalidation Not Working

**Causes:**

1. Dependencies not defined correctly
2. Dependency graph not built
3. Pattern not matching

**Solutions:**

1. Check RouteConfig.dependencies array
2. Verify buildDependencyGraph is called
3. Test patterns with test file paths

---

## See Also

- [Caching Strategies Guide](./CACHING_STRATEGIES.md)
- [Service Worker Configuration](./SERVICE_WORKER_CONFIG.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
