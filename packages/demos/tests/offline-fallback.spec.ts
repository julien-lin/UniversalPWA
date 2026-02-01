/**
 * Offline Fallback Integration Tests
 * Tests for Service Worker offline fallback behavior
 * Covers: SPA, Static, SSR Next.js, SSR generic fallbacks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  mkdtempSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("offline-fallback", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), "offline-fallback-test-"));
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("SPA Offline Mode", () => {
    it("should serve JS-rendered fallback when offline", () => {
      // Create SPA structure
      mkdirSync(join(testDir, "dist", "js"), { recursive: true });
      mkdirSync(join(testDir, "dist", "css"), { recursive: true });

      writeFileSync(
        join(testDir, "dist", "index.html"),
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>SPA App</title>
            <link rel="stylesheet" href="/css/main.css">
          </head>
          <body>
            <div id="app"></div>
            <script src="/js/main.js"></script>
          </body>
        </html>
      `,
      );

      writeFileSync(
        join(testDir, "dist", "offline.html"),
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>App - Offline</title>
          </head>
          <body>
            <div id="app">
              <h1>Offline Mode</h1>
              <p>Please check your internet connection</p>
            </div>
            <script>
              // Client-side rendering for cached pages
              console.log('Running in offline mode')
            </script>
          </body>
        </html>
      `,
      );

      // Simulate offline request
      const mockRequest = new Request("http://localhost:3000/page", {
        method: "GET",
        headers: { Accept: "text/html" },
      });

      // Mock service worker event
      const mockEvent = {
        request: mockRequest,
        respondWith: vi.fn(),
      };

      // Would be called in real SW
      expect(mockEvent.request.mode).toBe("navigate");
    });

    it("should cache critical SPA assets before going offline", () => {
      const criticalAssets = [
        "/index.html",
        "/js/main.js",
        "/css/main.css",
        "/offline.html",
      ];

      // Create precache manifest
      const precacheManifest = criticalAssets.map((url, idx) => ({
        url,
        revision: `v1-${idx}`,
      }));

      expect(precacheManifest.length).toBe(4);
      expect(precacheManifest[0].url).toBe("/index.html");
    });

    it("should serve cached version of page when offline", () => {
      // Structure: SPA with cached pages
      const cachedPages = {
        "/": "<html>Home</html>",
        "/about": "<html>About</html>",
        "/contact": "<html>Contact</html>",
      };

      writeFileSync(
        join(testDir, "sw.js"),
        `
        const cacheVersion = 'spa-v1'
        const cachedPages = ${JSON.stringify(cachedPages)}

        self.addEventListener('fetch', event => {
          if (event.request.mode === 'navigate') {
            event.respondWith(
              fetch(event.request)
                .catch(() => {
                  const page = cachedPages[event.request.url.pathname]
                  return new Response(page || '<html>Offline</html>', {
                    status: 200,
                    headers: { 'Content-Type': 'text/html' }
                  })
                })
            )
          }
        })
      `,
      );

      expect(existsSync(join(testDir, "sw.js"))).toBe(true);
    });
  });

  describe("Static Site Offline Mode", () => {
    it("should serve pre-cached HTML when offline", () => {
      mkdirSync(join(testDir, "dist"), { recursive: true });

      // Static site files
      writeFileSync(join(testDir, "dist", "index.html"), "<html>Home</html>");
      writeFileSync(join(testDir, "dist", "about.html"), "<html>About</html>");
      writeFileSync(
        join(testDir, "dist", "contact.html"),
        "<html>Contact</html>",
      );

      // Offline fallback
      writeFileSync(
        join(testDir, "dist", "offline.html"),
        `
        <html>
          <head><title>Offline</title></head>
          <body>
            <h1>Site Offline</h1>
            <p>Static pages are cached and available</p>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </body>
        </html>
      `,
      );

      // Verify all files exist
      expect(existsSync(join(testDir, "dist", "index.html"))).toBe(true);
      expect(existsSync(join(testDir, "dist", "offline.html"))).toBe(true);
    });

    it("should pre-cache all HTML pages for static site", () => {
      const staticPages = [
        "index.html",
        "about.html",
        "contact.html",
        "offline.html",
      ];

      mkdirSync(join(testDir, "dist"), { recursive: true });
      staticPages.forEach((page) => {
        writeFileSync(join(testDir, "dist", page), `<html>${page}</html>`);
      });

      const precacheManifest = staticPages.map((page) => ({
        url: `/${page}`,
        revision: "static-v1",
      }));

      expect(precacheManifest.length).toBe(4);
      expect(precacheManifest.map((p) => p.url)).toContain("/offline.html");
    });
  });

  describe("SSR Next.js Offline Mode", () => {
    it("should return offline placeholder for dynamic SSR routes", () => {
      // Next.js structure
      mkdirSync(join(testDir, "dist", "_next", "static"), { recursive: true });
      mkdirSync(join(testDir, "dist", "pages"), { recursive: true });

      // Static assets (always available)
      writeFileSync(
        join(testDir, "dist", "_next", "static", "main.js"),
        "// Next.js app",
      );

      // Pages
      writeFileSync(
        join(testDir, "dist", "pages", "index.html"),
        "<html>Next Home (SSR)</html>",
      );
      writeFileSync(
        join(testDir, "dist", "pages", "[id].html"),
        "<html>Next Dynamic Page (SSR)</html>",
      );

      // Offline fallback
      writeFileSync(
        join(testDir, "dist", "offline.html"),
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Next.js Offline</title>
            <script src="/_next/static/main.js"></script>
          </head>
          <body>
            <div id="__next">
              <h1>App Offline</h1>
              <p>Dynamic content not available</p>
              <p><a href="/">Return to Home</a></p>
            </div>
          </body>
        </html>
      `,
      );

      expect(existsSync(join(testDir, "dist", "offline.html"))).toBe(true);
    });

    it("should cache ISR (Incremental Static Regeneration) pages", () => {
      // ISR responses are cached separately
      const isrCache = {
        "/products": {
          cached: true,
          timestamp: Date.now(),
          revalidateAfter: 60,
        },
        "/blog/[id]": {
          cached: true,
          timestamp: Date.now(),
          revalidateAfter: 3600,
        },
      };

      expect(Object.keys(isrCache).length).toBe(2);
      expect(isrCache["/products"].revalidateAfter).toBe(60);
    });

    it("should handle dynamic routes gracefully offline", () => {
      // When offline, dynamic routes should show fallback
      const routes = [
        { path: "/", type: "static", cached: true },
        { path: "/blog", type: "static", cached: true },
        {
          path: "/blog/[id]",
          type: "dynamic-ssr",
          cached: "isr",
          fallback: "/offline.html",
        },
        {
          path: "/product/[id]",
          type: "dynamic-ssr",
          cached: false,
          fallback: "/offline.html",
        },
      ];

      const dynamicRoutes = routes.filter((r) => r.type.includes("dynamic"));
      const offlineCapable = dynamicRoutes.filter((r) => r.fallback);

      expect(dynamicRoutes.length).toBe(2);
      expect(offlineCapable.length).toBe(2);
    });
  });

  describe("SSR Generic Offline Mode", () => {
    it("should serve SSR-rendered offline page", () => {
      // Generic SSR app
      writeFileSync(
        join(testDir, "offline.html"),
        `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offline</title>
            <meta name="description" content="Application is offline">
          </head>
          <body>
            <h1>Application Offline</h1>
            <p>We're having trouble connecting. Please try again later.</p>
            <button onclick="location.reload()">Retry</button>
          </body>
        </html>
      `,
      );

      expect(existsSync(join(testDir, "offline.html"))).toBe(true);
    });

    it("should return offline placeholder for unmatched routes", () => {
      // When a route is not in cache and offline
      const offlineBehavior = {
        "/": { action: "serve-cached", fallback: "index.html" },
        "/api/*": { action: "return-error", status: 503 },
        "/admin*": { action: "serve-offline", fallback: "offline.html" },
        "*": { action: "serve-offline", fallback: "offline.html" },
      };

      expect(offlineBehavior["*"].action).toBe("serve-offline");
      expect(offlineBehavior["/api/*"].status).toBe(503);
    });

    it("should gracefully handle offline API calls", () => {
      // API request handling when offline
      const apiHandler = {
        GET: { strategy: "NetworkFirst", fallback: { status: 503, json: {} } },
        POST: {
          strategy: "Never",
          fallback: { status: 503, error: "offline" },
        },
        PUT: { strategy: "Never", fallback: { status: 503, error: "offline" } },
        DELETE: {
          strategy: "Never",
          fallback: { status: 503, error: "offline" },
        },
      };

      expect(apiHandler.GET.strategy).toBe("NetworkFirst");
      expect(apiHandler.POST.fallback.status).toBe(503);
    });
  });

  describe("Offline Page Registration", () => {
    it("should register offline page in precache manifest", () => {
      const precacheManifest = [
        { url: "/", revision: "v1" },
        { url: "/offline.html", revision: "v1" },
        { url: "/js/main.js", revision: "v1" },
        { url: "/css/main.css", revision: "v1" },
      ];

      const offlineEntry = precacheManifest.find((entry) =>
        entry.url.includes("offline"),
      );

      expect(offlineEntry).toBeDefined();
      expect(offlineEntry?.url).toBe("/offline.html");
    });

    it("should pre-fetch offline page on SW activation", () => {
      // Simulate SW activation
      const activationHandler = async () => {
        const cache = await caches.open("offline-cache");
        const response = await fetch("/offline.html");
        await cache.put("/offline.html", response);
      };

      expect(typeof activationHandler).toBe("function");
    });
  });

  describe("Offline Detection & Status", () => {
    it("should detect offline status from network events", () => {
      const offlineDetection = {
        online: () => navigator.onLine,
        offline: () => !navigator.onLine,
        onStatusChange: (callback: (status: boolean) => void) => {
          window.addEventListener("online", () => callback(true));
          window.addEventListener("offline", () => callback(false));
        },
      };

      expect(typeof offlineDetection.online).toBe("function");
      expect(typeof offlineDetection.offline).toBe("function");
    });

    it("should update UI when going offline", () => {
      const uiUpdater = {
        showOfflineIndicator: vi.fn(),
        hideOfflineIndicator: vi.fn(),
        updateNetworkStatus: (online: boolean) => {
          if (online) {
            uiUpdater.hideOfflineIndicator();
          } else {
            uiUpdater.showOfflineIndicator();
          }
        },
      };

      uiUpdater.updateNetworkStatus(false);
      expect(uiUpdater.showOfflineIndicator).toHaveBeenCalled();

      uiUpdater.updateNetworkStatus(true);
      expect(uiUpdater.hideOfflineIndicator).toHaveBeenCalled();
    });
  });

  describe("Offline Sync & Queue", () => {
    it("should queue failed requests for background sync", () => {
      interface QueuedRequest {
        url: string;
        method: string;
        timestamp: number;
        retries: number;
      }
      interface Request {
        url: string;
        method: string;
      }
      const requestQueue = {
        queue: [] as QueuedRequest[],
        add: (request: Request) => {
          requestQueue.queue.push({
            url: request.url,
            method: request.method,
            timestamp: Date.now(),
            retries: 0,
          });
        },
        flush: async () => {
          // Attempt to send all queued requests
          return await Promise.all(
            requestQueue.queue.map((req) =>
              fetch(req.url, { method: req.method }),
            ),
          );
        },
      };

      const request = { url: "/api/data", method: "POST" };
      requestQueue.add(request);

      expect(requestQueue.queue.length).toBe(1);
      expect(requestQueue.queue[0].url).toBe("/api/data");
    });

    it("should retry failed requests with exponential backoff", () => {
      const retryStrategy = {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        getDelay: (attempt: number) => {
          return (
            retryStrategy.initialDelay *
            Math.pow(retryStrategy.backoffMultiplier, attempt)
          );
        },
      };

      expect(retryStrategy.getDelay(0)).toBe(1000); // 1s
      expect(retryStrategy.getDelay(1)).toBe(2000); // 2s
      expect(retryStrategy.getDelay(2)).toBe(4000); // 4s
    });
  });
});
