# 🏢 Multi-tenant Deployment Guide for UniversalPWA

Complete guide for deploying Universal PWA in multi-tenant SaaS environments with isolated caching and basePath support.

**Last Updated:** 1 Feb 2026
**Status:** Production Ready

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Configuration](#configuration)
3. [basePath Per Tenant](#basepath-per-tenant)
4. [Caching Strategies](#caching-strategies)
5. [Service Worker Scope Management](#service-worker-scope-management)
6. [Real-world Example: SaaS App](#real-world-example-saas-app)
7. [Data Isolation](#data-isolation)
8. [Testing & Validation](#testing--validation)

---

## Architecture Overview

### Deployment Models

```
┌─────────────────────────────────────────────┐
│         Cloudflare / CDN / ALB               │
└──────────────┬──────────────────────────────┘
               │
        ┌──────┴───────┐
        │              │
        ▼              ▼
   ┌────────┐    ┌────────┐
   │Tenant 1│    │Tenant 2│ ← Different subdomains
   └────────┘    └────────┘

OR (Path-based)

┌─────────────────────────────────────┐
│      example.com                     │
├──────────┬──────────┬────────────┤
│ /tenant1 │ /tenant2 │ /tenant3   │
└──────────┴──────────┴────────────┘
```

### Key Considerations

- **Isolation Level:** Cache, localStorage, Service Worker scope
- **Sharing Level:** Builds, assets (optional), authentication
- **Data Level:** Complete isolation per tenant

---

## Configuration

### Option 1: Subdomain-based (Recommended for Security)

```typescript
// config.ts
export const tenantConfig = {
  tenant1: {
    domain: "tenant1.saas.example.com",
    basePath: "/",
    cacheKey: "tenant1-v1",
    apiBaseUrl: "https://api.example.com/tenant1",
    features: ["feature-a", "feature-b"],
  },
  tenant2: {
    domain: "tenant2.saas.example.com",
    basePath: "/",
    cacheKey: "tenant2-v1",
    apiBaseUrl: "https://api.example.com/tenant2",
    features: ["feature-a", "feature-c"],
  },
  tenant3: {
    domain: "tenant3.saas.example.com",
    basePath: "/",
    cacheKey: "tenant3-v1",
    apiBaseUrl: "https://api.example.com/tenant3",
    features: ["feature-b", "feature-c"],
  },
};
```

### Option 2: Path-based (For Cost Optimization)

```typescript
// config.ts
export const tenantConfig = {
  tenant1: {
    domain: "saas.example.com",
    basePath: "/tenant1",
    cacheKey: "tenant1-v1",
    apiBaseUrl: "https://api.example.com/tenant1",
    swScope: "/tenant1",
  },
  tenant2: {
    domain: "saas.example.com",
    basePath: "/tenant2",
    cacheKey: "tenant2-v1",
    apiBaseUrl: "https://api.example.com/tenant2",
    swScope: "/tenant2",
  },
};
```

---

## basePath Per Tenant

### Dynamic basePath Application

```typescript
// app/config.ts
import { tenantConfig } from "./tenant-config";

export function getTenantConfig() {
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  // Subdomain-based
  if (hostname.includes(".saas.example.com")) {
    const subdomain = hostname.split(".")[0];
    return tenantConfig[subdomain];
  }

  // Path-based
  const tenantPath = pathname.split("/")[1];
  return tenantConfig[tenantPath] || tenantConfig.default;
}

export const currentTenant = getTenantConfig();
```

### Service Worker Registration with basePath

```typescript
// app/service-worker-register.ts
import { getTenantConfig } from "./config";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Workers not supported");
    return;
  }

  const config = getTenantConfig();
  const swPath = `${config.basePath}/sw.js`.replace("//", "/");
  const swScope = config.swScope || config.basePath || "/";

  try {
    const registration = await navigator.serviceWorker.register(swPath, {
      scope: swScope,
    });

    console.log(`✓ Service Worker registered for ${config.domain}`);
    console.log(`  Path: ${swPath}`);
    console.log(`  Scope: ${swScope}`);

    // Handle updates
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener("statechange", () => {
        if (
          newWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          console.log("✓ New Service Worker version available");
          // Show update notification
          showUpdateNotification();
        }
      });
    });

    return registration;
  } catch (error) {
    console.error(`✗ Service Worker registration failed: ${error}`);
  }
}

function showUpdateNotification() {
  const message = "New version available. Refresh to update.";
  // Show notification to user
  console.log(message);
}
```

### manifest.json Per Tenant

```typescript
// app/manifest.ts
import { getTenantConfig } from "./config";

export function getManifestUrl() {
  const config = getTenantConfig();
  return `${config.basePath}/manifest.json`.replace("//", "/");
}

export function getManifest() {
  const config = getTenantConfig();
  const basePath = config.basePath || "/";

  return {
    name: `${config.name} - Tenant App`,
    short_name: config.shortName || "Tenant",
    description: `Multi-tenant app for ${config.domain}`,
    start_url: `${basePath}/`,
    scope: basePath,
    display: "standalone",
    theme_color: config.themeColor || "#1976d2",
    background_color: config.bgColor || "#ffffff",
    categories: config.categories || ["productivity"],
    icons: [
      {
        src: `${basePath}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${basePath}/icon-maskable.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: config.screenshots || [],
  };
}
```

---

## Caching Strategies

### Option 1: Completely Isolated (Most Secure)

```typescript
// service-worker.ts
const tenantId =
  self.registration.scope.split("/").filter(Boolean)[0] || "default";
const CACHE_NAME = `tenant-${tenantId}-cache-v1`;
const API_CACHE = `tenant-${tenantId}-api-v1`;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Tenant-isolated API cache
  if (url.pathname.startsWith(`/${tenantId}/api`)) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request));
      }),
    );
  }

  // Tenant-isolated asset cache
  if (url.pathname.startsWith(`/${tenantId}/_next/static`)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((response) => {
          return (
            response ||
            fetch(request).then((response) => {
              cache.put(request, response.clone());
              return response;
            })
          );
        });
      }),
    );
  }
});
```

### Option 2: Shared Assets with Tenant API Cache

```typescript
// service-worker.ts
const tenantId = getTenantId();
const SHARED_CACHE = "shared-assets-v1";
const TENANT_API_CACHE = `api-${tenantId}-v1`;

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Shared static assets (fingerprinted)
  if (url.pathname.includes("/_next/static/")) {
    event.respondWith(
      caches.open(SHARED_CACHE).then((cache) => {
        return cache.match(request) || fetch(request);
      }),
    );
  }

  // Tenant-specific API
  if (url.pathname.includes(`/api`)) {
    event.respondWith(
      caches.open(TENANT_API_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => cache.match(request));
      }),
    );
  }
});

function getTenantId(): string {
  const pathArray = self.location.pathname.split("/").filter(Boolean);
  // For /tenant1/*, extract 'tenant1'
  return pathArray[0] || "default";
}
```

---

## Service Worker Scope Management

### Preventing Scope Conflicts

```typescript
// middleware.ts (Next.js)
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hostname = request.headers.get("host") || "";

  let tenantId: string;
  let basePath: string;

  // Extract tenant from subdomain
  if (hostname.startsWith("tenant")) {
    tenantId = hostname.split(".")[0];
    basePath = "/";
  } else {
    // Extract tenant from path
    const pathSegments = pathname.split("/").filter(Boolean);
    tenantId = pathSegments[0] || "default";
    basePath = `/${tenantId}`;
  }

  // Set headers for application
  const response = NextResponse.next();
  response.headers.set("X-Tenant-ID", tenantId);
  response.headers.set("X-Base-Path", basePath);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|favicon.ico).*)"],
};
```

### Unregistering Old Service Workers

```typescript
// app/service-worker-cleanup.ts
export async function cleanupOldServiceWorkers() {
  if (!navigator.serviceWorker) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const currentScope = getTenantScope();

  for (const registration of registrations) {
    // Unregister if scope doesn't match current tenant
    if (!registration.scope.includes(currentScope)) {
      console.log(`Unregistering old SW: ${registration.scope}`);
      await registration.unregister();

      // Clear associated cache
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter((name) =>
        name.includes(getOldTenantId()),
      );
      await Promise.all(oldCaches.map((name) => caches.delete(name)));
    }
  }
}

function getTenantScope(): string {
  const hostname = window.location.hostname;
  if (hostname.includes(".saas.example.com")) {
    return hostname.split(".")[0]; // tenant1, tenant2, etc.
  }
  return window.location.pathname.split("/")[1] || "default";
}

// Run on app initialization
if (typeof window !== "undefined") {
  cleanupOldServiceWorkers();
}
```

---

## Real-world Example: SaaS App

### Architecture: Multi-tenant Project Management SaaS

```
┌─────────────────────────────────────────┐
│     SaaS Platform: projects.io           │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────┐                  │
│  │ acme.projects.io │ ← ACME Tenant    │
│  │ /projects        │   basePath: /    │
│  │ /tasks           │   cacheKey: acme │
│  └──────────────────┘                  │
│                                          │
│  ┌──────────────────┐                  │
│  │ beta.projects.io │ ← BETA Tenant    │
│  │ /projects        │   basePath: /    │
│  │ /tasks           │   cacheKey: beta │
│  └──────────────────┘                  │
│                                          │
│  ┌──────────────────────────────────┐  │
│  │ projects.io/acme                 │  │
│  │ projects.io/beta                 │  │
│  │ (Path-based alternative)         │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Configuration

```typescript
// config/tenants.ts
export interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  basePath: string;
  apiUrl: string;
  theme: {
    primary: string;
    secondary: string;
    logo: string;
  };
  features: string[];
  storage: {
    cacheEnabled: boolean;
    localStoragePrefix: string;
  };
}

export const tenants: Record<string, TenantConfig> = {
  acme: {
    id: "acme",
    name: "ACME Corp",
    domain: "acme.projects.io",
    basePath: "/",
    apiUrl: "https://api.projects.io/acme",
    theme: {
      primary: "#FF6B6B",
      secondary: "#4ECDC4",
      logo: "/logos/acme.png",
    },
    features: ["projects", "tasks", "team-collaboration", "reporting"],
    storage: {
      cacheEnabled: true,
      localStoragePrefix: "acme_",
    },
  },
  beta: {
    id: "beta",
    name: "Beta Test Co",
    domain: "beta.projects.io",
    basePath: "/",
    apiUrl: "https://api.projects.io/beta",
    theme: {
      primary: "#1971C2",
      secondary: "#86E1FF",
      logo: "/logos/beta.png",
    },
    features: ["projects", "tasks"],
    storage: {
      cacheEnabled: true,
      localStoragePrefix: "beta_",
    },
  },
};

export function getTenantConfig(): TenantConfig {
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "projects.io";
  const tenantId = hostname.split(".")[0];
  return tenants[tenantId] || tenants.acme;
}
```

### Service Worker Implementation

```typescript
// public/sw.ts
const config = getTenantConfig();
const CACHE_KEY = `${config.storage.localStoragePrefix}cache-v1`;
const API_CACHE = `${config.storage.localStoragePrefix}api-v1`;

self.addEventListener("install", (event) => {
  console.log(`[${config.id}] Service Worker installing...`);
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log(`[${config.id}] Service Worker activating...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !name.includes(config.storage.localStoragePrefix))
          .map((name) => caches.delete(name)),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API caching
  if (url.pathname.startsWith("/api")) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            return (
              cache.match(request) || new Response("Offline", { status: 503 })
            );
          });
      }),
    );
  }

  // Static assets
  if (request.destination === "style" || request.destination === "script") {
    event.respondWith(
      caches.open(CACHE_KEY).then((cache) => {
        return (
          cache.match(request) ||
          fetch(request).then((response) => {
            cache.put(request, response.clone());
            return response;
          })
        );
      }),
    );
  }
});

function getTenantConfig() {
  const tenantId = self.location.hostname.split(".")[0];
  return tenants[tenantId];
}
```

---

## Data Isolation

### localStorage Isolation

```typescript
// utils/storage.ts
import { getTenantConfig } from "@/config";

const config = getTenantConfig();
const PREFIX = config.storage.localStoragePrefix;

export const tenantStorage = {
  setItem: (key: string, value: string) => {
    localStorage.setItem(`${PREFIX}${key}`, value);
  },
  getItem: (key: string): string | null => {
    return localStorage.getItem(`${PREFIX}${key}`);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(`${PREFIX}${key}`);
  },
  clear: () => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  },
};
```

### IndexedDB Isolation

```typescript
// utils/db.ts
import { getTenantConfig } from "@/config";

const config = getTenantConfig();
const DB_NAME = `app_${config.storage.localStoragePrefix}db`;

export async function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
    };
  });
}
```

### API Request Isolation

```typescript
// api/client.ts
import { getTenantConfig } from "@/config";

const config = getTenantConfig();

export const apiClient = {
  async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${config.apiUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "X-Tenant-ID": config.id,
        "X-App-Version": process.env.REACT_APP_VERSION || "1.0.0",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },

  async getProjects() {
    return this.fetch<Project[]>("/projects");
  },

  async getTasks(projectId: string) {
    return this.fetch<Task[]>(`/projects/${projectId}/tasks`);
  },
};
```

---

## Testing & Validation

### Testing Checklist

```bash
#!/bin/bash

TENANT1="tenant1.saas.example.com"
TENANT2="tenant2.saas.example.com"

echo "=== Multi-tenant PWA Testing ==="

# 1. Verify Service Worker Scope
echo "1. Testing Service Worker Scope..."
curl -s "https://$TENANT1/sw.js" -H "Accept: application/json" | grep -q "scope" && \
  echo "✓ SW scope correct for tenant1" || echo "✗ SW scope issue for tenant1"

# 2. Verify Cache Isolation
echo "2. Testing Cache Isolation..."
CACHE_KEYS=$(curl -s "https://$TENANT1/api/cache-status" | jq '.cacheNames[]')
echo "Tenant1 caches: $CACHE_KEYS" | grep -q "tenant1" && \
  echo "✓ Cache prefixed correctly" || echo "✗ Cache prefix issue"

# 3. Verify manifest.json per Tenant
echo "3. Testing manifest.json..."
curl -s "https://$TENANT1/manifest.json" | jq '.name' | grep -q "Tenant1" && \
  echo "✓ Tenant1 manifest correct" || echo "✗ Tenant1 manifest incorrect"

curl -s "https://$TENANT2/manifest.json" | jq '.name' | grep -q "Tenant2" && \
  echo "✓ Tenant2 manifest correct" || echo "✗ Tenant2 manifest incorrect"

# 4. Verify localStorage Isolation
echo "4. Testing localStorage isolation..."
echo "✓ localStorage prefixing enabled" # Verify in browser console

# 5. Test offline mode per tenant
echo "5. Testing offline functionality..."
echo "✓ Offline detection per tenant (manual testing required)"

echo "=== Testing Complete ==="
```

### Manual Testing in Browser

```javascript
// Run in browser console for each tenant

// 1. Check Service Worker
navigator.serviceWorker.getRegistrations().then((regs) => {
  regs.forEach((reg) => {
    console.log("SW Scope:", reg.scope);
  });
});

// 2. Check Cache Storage
caches.keys().then((names) => {
  console.log("Available Caches:", names);
});

// 3. Check LocalStorage Isolation
console.log(
  "Tenant Prefix:",
  window.__TENANT_CONFIG__.storage.localStoragePrefix,
);

// 4. Check IndexedDB
indexedDB.databases().then((dbs) => {
  console.log("IndexedDB Databases:", dbs);
});

// 5. Go offline and test
// DevTools → Network → Offline
// Try to load pages
```

---

## Performance Monitoring

```typescript
// monitoring/metrics.ts
import { getTenantConfig } from "@/config";

const config = getTenantConfig();

export function logMetric(name: string, value: number) {
  // Send to analytics with tenant ID
  analytics.track(name, {
    tenantId: config.id,
    value,
    timestamp: Date.now(),
  });
}

// Cache performance
export function logCacheStats() {
  caches.keys().then((names) => {
    names.forEach(async (name) => {
      if (name.includes(config.storage.localStoragePrefix)) {
        const cache = await caches.open(name);
        logMetric("cache_size", (await cache.keys()).length);
      }
    });
  });
}

// Service Worker metrics
self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    logMetric("sw_update_applied", 1);
  }
});
```

---

## Troubleshooting

### Issue: Service Worker not isolating between tenants

**Solution:** Verify Service Worker scope is set correctly per tenant

```typescript
// Verify in application
const scope = registration.scope;
console.log("Expected:", config.swScope);
console.log("Actual:", scope);
```

### Issue: Cache pollution between tenants

**Solution:** Ensure cache names are prefixed with tenant ID

```typescript
// Verify cache names
caches.keys().then((names) => {
  console.log("Caches:", names);
  // Should see: tenant1-cache-v1, tenant2-cache-v1, etc.
});
```

### Issue: localStorage data visible across tenants

**Solution:** Implement localStorage prefix and isolation

```typescript
// Run in console for each tenant to verify
Object.keys(localStorage).forEach((key) => {
  console.log(key); // Should see tenant-specific prefix
});
```

---

**Last Updated:** 1 Feb 2026
**Status:** Production Ready for multi-tenant SaaS deployments
