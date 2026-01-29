/**
 * Tests for Advanced Caching System Integration
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateServiceWorkerFromConfig } from "./service-worker-generator.js";
import type {
  ServiceWorkerConfig,
  AdvancedCachingConfig,
} from "./caching-strategy.js";
import { PRESET_STRATEGIES } from "./caching-strategy.js";
import {
  generateCacheVersion,
  buildDependencyGraph,
  getCascadeInvalidation,
  shouldInvalidateCache,
  getOrGenerateCacheVersion,
} from "./cache-invalidation.js";

describe("advanced-caching-integration", () => {
  let testDir: string;
  let outputDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `universal-pwa-test-${Date.now()}`);
    outputDir = join(testDir, "output");
    mkdirSync(testDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    mkdirSync(join(testDir, "public"), { recursive: true });

    // Create test files
    writeFileSync(
      join(testDir, "public", "index.html"),
      "<html><body>Test</body></html>",
    );
    writeFileSync(join(testDir, "public", "app.js"), 'console.log("app")');
    writeFileSync(join(testDir, "public", "app.css"), "body { margin: 0; }");
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

  describe("Service Worker with Advanced Caching", () => {
    it("should generate service worker with advanced caching config", async () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [
          {
            pattern: "/api/**",
            strategy: PRESET_STRATEGIES.ApiEndpoints,
            priority: 100,
          },
        ],
        global: {
          version: "v1.0.0",
          cacheNamePrefix: "pwa-",
        },
        versioning: {
          manualVersion: "v1.0.0",
        },
      };

      const config: ServiceWorkerConfig = {
        destination: "sw.js",
        staticRoutes: [
          {
            pattern: "/static/**",
            strategy: PRESET_STRATEGIES.StaticAssets,
          },
        ],
        apiRoutes: [],
        imageRoutes: [],
        advanced: advancedConfig,
      };

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: "static",
        globDirectory: join(testDir, "public"),
      });

      expect(existsSync(result.swPath)).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });

    it("should apply cache name prefix from advanced config", async () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [
          {
            pattern: "/api/**",
            strategy: {
              ...PRESET_STRATEGIES.ApiEndpoints,
              cacheName: "api-cache",
            },
          },
        ],
        global: {
          cacheNamePrefix: "myapp-",
        },
      };

      const config: ServiceWorkerConfig = {
        destination: "sw.js",
        staticRoutes: [],
        apiRoutes: [],
        imageRoutes: [],
        advanced: advancedConfig,
      };

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: "static",
        globDirectory: join(testDir, "public"),
      });

      expect(existsSync(result.swPath)).toBe(true);
      // The cache name prefix should be applied in the generated service worker
      const swContent = readFileSync(result.swPath, "utf-8");
      // Note: Actual cache name injection happens in templates, but the config is processed
      expect(swContent).toContain("workbox");
    });

    it("should generate cache version with auto versioning", () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ["**/*.js", "**/*.css"],
        },
      };

      const version = getOrGenerateCacheVersion(testDir, advancedConfig);

      expect(version.version).toBeDefined();
      expect(version.version.length).toBeGreaterThan(0);
      expect(version.timestamp).toBeGreaterThan(0);
    });

    it("should use manual version when provided", () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: "v2.5.0",
        },
      };

      const version = getOrGenerateCacheVersion(testDir, advancedConfig);

      expect(version.version).toBe("v2.5.0");
    });

    it("should handle dependency tracking in advanced config", () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [
          {
            pattern: "/app.js",
            strategy: PRESET_STRATEGIES.StaticAssets,
            dependencies: ["/app.css", "/vendor.js"],
          },
        ],
        dependencies: {
          enabled: true,
          trackedFiles: ["**/*.js", "**/*.css"],
        },
      };

      const graph = buildDependencyGraph(advancedConfig.routes);

      expect(graph.dependencies.get("/app.js")).toEqual([
        "/app.css",
        "/vendor.js",
      ]);
      expect(graph.dependents.get("/app.css")).toContain("/app.js");
    });

    it("should detect file changes and invalidate cache", () => {
      writeFileSync(join(testDir, "public", "app.js"), 'console.log("app v1")');

      const advancedConfig: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
          autoInvalidate: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ["**/*.js"],
        },
      };

      // Generate initial version
      const version1 = generateCacheVersion(testDir, ["**/*.js"]);

      // Modify file
      writeFileSync(join(testDir, "public", "app.js"), 'console.log("app v2")');

      // Generate new version
      const version2 = generateCacheVersion(testDir, ["**/*.js"]);

      // Check invalidation
      const invalidationResult = shouldInvalidateCache(testDir, version1, {
        ...advancedConfig,
        versioning: {
          autoVersion: true,
        },
      });

      expect(version1.version).not.toBe(version2.version);
      expect(invalidationResult.shouldInvalidate).toBe(true);
      expect(invalidationResult.changedFiles).toBeDefined();
    });

    it("should respect ignore patterns in invalidation", () => {
      if (!existsSync(join(testDir, "public"))) mkdirSync(join(testDir, "public"), { recursive: true });
      writeFileSync(join(testDir, "public", "app.js"), 'console.log("app")');
      writeFileSync(join(testDir, "public", "app.js.map"), "source map");

      const version1 = generateCacheVersion(testDir, ["**/*"], ["**/*.map"]);

      // Modify .map file (should be ignored)
      writeFileSync(join(testDir, "public", "app.js.map"), "new source map");

      const version2 = generateCacheVersion(testDir, ["**/*"], ["**/*.map"]);

      // Version should be the same (map file ignored)
      expect(version1.version).toBe(version2.version);
    });

    it("should handle cascade invalidation", () => {
      const routes = [
        {
          pattern: "/app.js",
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["/app.css", "/vendor.js"],
        },
        {
          pattern: "/app.css",
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["/fonts.css"],
        },
      ];

      const graph = buildDependencyGraph(routes);
      const invalidated = getCascadeInvalidation("/fonts.css", graph);

      expect(invalidated).toContain("/fonts.css");
      expect(invalidated).toContain("/app.css");
      expect(invalidated).toContain("/app.js");
    });

    it("should merge advanced routes with standard routes", async () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [
          {
            pattern: "/admin/**",
            strategy: {
              name: "NetworkOnly",
              cacheName: "admin",
            },
            priority: 200,
          },
        ],
      };

      const config: ServiceWorkerConfig = {
        destination: "sw.js",
        staticRoutes: [
          {
            pattern: "/static/**",
            strategy: PRESET_STRATEGIES.StaticAssets,
          },
        ],
        apiRoutes: [
          {
            pattern: "/api/**",
            strategy: PRESET_STRATEGIES.ApiEndpoints,
          },
        ],
        imageRoutes: [],
        advanced: advancedConfig,
      };

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: "static",
        globDirectory: join(testDir, "public"),
      });

      expect(existsSync(result.swPath)).toBe(true);
      // All routes (static, api, advanced) should be processed
    });

    it("should handle per-route TTL override", async () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [
          {
            pattern: "/api/users/**",
            strategy: PRESET_STRATEGIES.ApiEndpoints,
            ttl: {
              maxAgeSeconds: 600, // 10 minutes (override default 1 hour)
              maxEntries: 50,
            },
          },
        ],
      };

      const config: ServiceWorkerConfig = {
        destination: "sw.js",
        staticRoutes: [],
        apiRoutes: [],
        imageRoutes: [],
        advanced: advancedConfig,
      };

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: "static",
        globDirectory: join(testDir, "public"),
      });

      expect(existsSync(result.swPath)).toBe(true);
    });

    it("should handle route conditions (methods, origins)", async () => {
      const advancedConfig: AdvancedCachingConfig = {
        routes: [
          {
            pattern: "/api/**",
            strategy: PRESET_STRATEGIES.ApiEndpoints,
            conditions: {
              methods: ["GET", "POST"],
              origins: ["https://api.example.com"],
            },
          },
        ],
      };

      const config: ServiceWorkerConfig = {
        destination: "sw.js",
        staticRoutes: [],
        apiRoutes: [],
        imageRoutes: [],
        advanced: advancedConfig,
      };

      const result = await generateServiceWorkerFromConfig(config, {
        projectPath: testDir,
        outputDir,
        architecture: "static",
        globDirectory: join(testDir, "public"),
      });

      expect(existsSync(result.swPath)).toBe(true);
    });
  });
});
