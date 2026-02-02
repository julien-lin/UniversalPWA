/**
 * Tests for Cache Invalidation System
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  generateCacheVersion,
  buildDependencyGraph,
  getCascadeInvalidation,
  shouldInvalidateCache,
  getTrackedFiles,
  shouldIgnoreFile,
  getOrGenerateCacheVersion,
  type CacheVersion,
} from "./cache-invalidation.js";
import type { AdvancedCachingConfig, RouteConfig } from "./caching-strategy.js";
import { PRESET_STRATEGIES } from "./caching-strategy.js";
import { createTestDir, cleanupTestDir } from "../__tests__/test-helpers.js";

describe("cache-invalidation", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir("cache-invalidation");
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe("generateCacheVersion", () => {
    it("should generate version from file hashes", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');
      writeFileSync(join(testDir, "style.css"), "body { color: red; }");

      const version = generateCacheVersion(testDir, ["**/*.js", "**/*.css"]);

      expect(version.version).toBeDefined();
      expect(version.version.length).toBeGreaterThan(0);
      expect(version.timestamp).toBeGreaterThan(0);
      expect(Object.keys(version.fileHashes).length).toBe(2);
    });

    it("should generate same version for same files", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');

      const version1 = generateCacheVersion(testDir, ["**/*.js"]);
      const version2 = generateCacheVersion(testDir, ["**/*.js"]);

      expect(version1.version).toBe(version2.version);
    });

    it("should generate different version when file changes", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');

      const version1 = generateCacheVersion(testDir, ["**/*.js"]);

      writeFileSync(join(testDir, "app.js"), 'console.log("app v2")');

      const version2 = generateCacheVersion(testDir, ["**/*.js"]);

      expect(version1.version).not.toBe(version2.version);
    });

    it("should respect ignore patterns", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');
      writeFileSync(join(testDir, "app.js.map"), "source map");

      const version1 = generateCacheVersion(testDir, ["**/*"], ["**/*.map"]);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _version2 = generateCacheVersion(testDir, ["**/*"], ["**/*.map"]);

      // Should not include .map file
      expect(
        Object.keys(version1.fileHashes).every((f) => !f.endsWith(".map")),
      ).toBe(true);
    });
  });

  describe("buildDependencyGraph", () => {
    it("should build dependency graph from routes", () => {
      const routes: RouteConfig[] = [
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

      expect(graph.dependencies.get("/app.js")).toEqual([
        "/app.css",
        "/vendor.js",
      ]);
      expect(graph.dependents.get("/app.css")).toContain("/app.js");
      expect(graph.dependents.get("/fonts.css")).toContain("/app.css");
    });

    it("should handle routes without dependencies", () => {
      const routes: RouteConfig[] = [
        {
          pattern: "/app.js",
          strategy: PRESET_STRATEGIES.StaticAssets,
        },
      ];

      const graph = buildDependencyGraph(routes);

      expect(graph.dependencies.size).toBe(0);
      expect(graph.dependents.size).toBe(0);
    });
  });

  describe("getCascadeInvalidation", () => {
    it("should return cascade of invalidated files", () => {
      const routes: RouteConfig[] = [
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

    it("should handle circular dependencies", () => {
      const routes: RouteConfig[] = [
        {
          pattern: "/a.js",
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["/b.js"],
        },
        {
          pattern: "/b.js",
          strategy: PRESET_STRATEGIES.StaticAssets,
          dependencies: ["/a.js"],
        },
      ];

      const graph = buildDependencyGraph(routes);
      const invalidated = getCascadeInvalidation("/a.js", graph);

      expect(invalidated).toContain("/a.js");
      expect(invalidated).toContain("/b.js");
    });
  });

  describe("shouldInvalidateCache", () => {
    it("should invalidate on manual version change", () => {
      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: "v1.0.0",
        },
      };

      const currentVersion: CacheVersion = {
        version: "v0.9.0",
        timestamp: Date.now(),
        fileHashes: {},
      };

      const result = shouldInvalidateCache(testDir, currentVersion, config);

      expect(result.shouldInvalidate).toBe(true);
      expect(result.reason).toBe("Manual version changed");
      expect(result.newVersion).toBe("v1.0.0");
    });

    it("should not invalidate if manual version unchanged", () => {
      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: "v1.0.0",
        },
      };

      const currentVersion: CacheVersion = {
        version: "v1.0.0",
        timestamp: Date.now(),
        fileHashes: {},
      };

      const result = shouldInvalidateCache(testDir, currentVersion, config);

      expect(result.shouldInvalidate).toBe(false);
    });

    it("should invalidate on file changes with auto versioning", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');

      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ["**/*.js"],
        },
      };

      const currentVersion: CacheVersion = {
        version: "old-version",
        timestamp: Date.now(),
        fileHashes: {
          [join(testDir, "app.js")]: "old-hash",
        },
      };

      const result = shouldInvalidateCache(testDir, currentVersion, config);

      expect(result.shouldInvalidate).toBe(true);
      expect(result.changedFiles).toBeDefined();
      expect(result.changedFiles!.length).toBeGreaterThan(0);
    });

    it("should not invalidate if files unchanged", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');

      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ["**/*.js"],
        },
      };

      // Generate current version from actual files
      const currentVersion = generateCacheVersion(testDir, ["**/*.js"]);

      const result = shouldInvalidateCache(testDir, currentVersion, config);

      expect(result.shouldInvalidate).toBe(false);
    });
  });

  describe("getTrackedFiles", () => {
    it("should find files matching patterns", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');
      writeFileSync(join(testDir, "style.css"), "body { color: red; }");
      writeFileSync(join(testDir, "index.html"), "<html></html>");

      const files = getTrackedFiles(testDir, ["**/*.js", "**/*.css"]);

      expect(files.length).toBe(2);
      expect(files.some((f) => f.endsWith("app.js"))).toBe(true);
      expect(files.some((f) => f.endsWith("style.css"))).toBe(true);
    });

    it("should respect ignore patterns", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');
      writeFileSync(join(testDir, "app.js.map"), "source map");

      const files = getTrackedFiles(testDir, ["**/*"], ["**/*.map"]);

      expect(files.some((f) => f.endsWith(".map"))).toBe(false);
    });
  });

  describe("shouldIgnoreFile", () => {
    it("should ignore files matching patterns", () => {
      // Use actual file paths for testing
      const testFile = join(testDir, "file.map");
      writeFileSync(testFile, "content");

      expect(shouldIgnoreFile(testFile, ["**/*.map"])).toBe(true);
      expect(shouldIgnoreFile(join(testDir, "file.js"), ["**/*.map"])).toBe(
        false,
      );
    });

    it("should handle multiple ignore patterns", () => {
      const dsStoreFile = join(testDir, ".DS_Store");
      writeFileSync(dsStoreFile, "content");

      expect(shouldIgnoreFile(dsStoreFile, ["**/*.map", "**/.DS_Store"])).toBe(
        true,
      );
      expect(
        shouldIgnoreFile(join(testDir, "file.js"), [
          "**/*.map",
          "**/.DS_Store",
        ]),
      ).toBe(false);
    });
  });

  describe("getOrGenerateCacheVersion", () => {
    it("should use manual version when provided", () => {
      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          manualVersion: "v1.2.3",
        },
      };

      const version = getOrGenerateCacheVersion(testDir, config);

      expect(version.version).toBe("v1.2.3");
    });

    it("should generate auto version when enabled", () => {
      writeFileSync(join(testDir, "app.js"), 'console.log("app")');

      const config: AdvancedCachingConfig = {
        routes: [],
        versioning: {
          autoVersion: true,
        },
        dependencies: {
          enabled: true,
          trackedFiles: ["**/*.js"],
        },
      };

      const version = getOrGenerateCacheVersion(testDir, config);

      expect(version.version).toBeDefined();
      expect(version.version.length).toBeGreaterThan(0);
      expect(Object.keys(version.fileHashes).length).toBeGreaterThan(0);
    });

    it("should use timestamp as fallback", () => {
      const config: AdvancedCachingConfig = {
        routes: [],
      };

      const version = getOrGenerateCacheVersion(testDir, config);

      expect(version.version).toMatch(/^v\d+$/);
    });
  });

  /**
   * Real-world scenario tests
   */
  describe("Real-world scenarios", () => {
    describe("Scenario 1: SPA Framework Bundle Update", () => {
      it("should detect React bundle update and invalidate cache", () => {
        // Setup: Initial build
        mkdirSync(join(testDir, "dist"), { recursive: true });
        writeFileSync(
          join(testDir, "dist", "index.abc123.js"),
          "const app = {}",
        );
        writeFileSync(join(testDir, "dist", "index.css"), "body {}");

        // Generate initial version
        const config: AdvancedCachingConfig = {
          routes: [
            {
              pattern: /^\/static\//,
              strategy: PRESET_STRATEGIES.StaticAssets,
              dependencies: ["index.html"],
            },
          ],
          versioning: { autoVersion: true },
          dependencies: {
            enabled: true,
            trackedFiles: ["dist/**/*.js", "dist/**/*.css"],
          },
        };

        const version1 = generateCacheVersion(testDir, [
          "dist/**/*.js",
          "dist/**/*.css",
        ]);

        // Simulate: Developer updates React code and rebuilds
        writeFileSync(
          join(testDir, "dist", "index.def456.js"),
          "const app = { v2: true }",
        );

        const version2 = generateCacheVersion(testDir, [
          "dist/**/*.js",
          "dist/**/*.css",
        ]);

        // Check: Version should change
        expect(version1.version).not.toBe(version2.version);

        // Check: Invalidation detected
        const result = shouldInvalidateCache(testDir, version1, config);
        expect(result.shouldInvalidate).toBe(true);
        expect(result.changedFiles).toBeDefined();
        expect(result.changedFiles?.length).toBeGreaterThan(0);
      });

      it("should handle CSS-in-JS updates without invalidating images", () => {
        mkdirSync(join(testDir, "dist"), { recursive: true });
        writeFileSync(join(testDir, "dist", "app.js"), "// app");
        writeFileSync(join(testDir, "dist", "styles.css"), "body {}");
        writeFileSync(join(testDir, "dist", "logo.png"), "fake png");

        const trackedFiles = ["dist/**/*.js", "dist/**/*.css"]; // Exclude images
        const version1 = generateCacheVersion(testDir, trackedFiles);

        // Update image (should not invalidate)
        writeFileSync(join(testDir, "dist", "logo.png"), "updated png");

        const version2 = generateCacheVersion(testDir, trackedFiles);

        // Version should be same (PNG not tracked)
        expect(version1.version).toBe(version2.version);

        // Update CSS (should invalidate)
        writeFileSync(
          join(testDir, "dist", "styles.css"),
          "body { color: red; }",
        );

        const version3 = generateCacheVersion(testDir, trackedFiles);

        // Version should change (CSS tracked)
        expect(version1.version).not.toBe(version3.version);
      });
    });

    describe("Scenario 2: Node.js API Backend Schema Update", () => {
      it("should invalidate on manual version bump for API schema change", () => {
        // Setup: Initial API version
        const config1: AdvancedCachingConfig = {
          routes: [
            {
              pattern: /^\/api\//,
              strategy: PRESET_STRATEGIES.ApiEndpoints,
            },
          ],
          versioning: { manualVersion: "v1.0.0" },
        };

        const version1 = getOrGenerateCacheVersion(testDir, config1);
        expect(version1.version).toBe("v1.0.0");

        // Simulate: API schema updated, version bumped
        const config2: AdvancedCachingConfig = {
          ...config1,
          versioning: { manualVersion: "v1.1.0" }, // Schema version changed
        };

        // Check: Manual version change triggers invalidation
        const result = shouldInvalidateCache(testDir, version1, config2);
        expect(result.shouldInvalidate).toBe(true);
        expect(result.reason).toBe("Manual version changed");
        expect(result.newVersion).toBe("v1.1.0");
      });
    });

    describe("Scenario 3: Static Site CSS/Image CDN Update", () => {
      it("should use dependency graph to cascade invalidate on font update", () => {
        // Setup: Define routes with dependencies
        const routes: RouteConfig[] = [
          {
            pattern: "/fonts.css",
            strategy: PRESET_STRATEGIES.StaticAssets,
            dependencies: [],
          },
          {
            pattern: "/app.css",
            strategy: PRESET_STRATEGIES.StaticAssets,
            dependencies: ["/fonts.css"],
          },
          {
            pattern: "/index.html",
            strategy: PRESET_STRATEGIES.StaticAssets,
            dependencies: ["/app.css"],
          },
        ];

        // Build graph
        const graph = buildDependencyGraph(routes);

        // Get cascade invalidation when fonts.css changes
        const invalidated = getCascadeInvalidation("/fonts.css", graph);

        // Check: Should invalidate fonts, app.css, and index.html
        expect(invalidated).toContain("/fonts.css");
        expect(invalidated).toContain("/app.css");
        expect(invalidated).toContain("/index.html");
      });

      it("should handle circular dependencies safely", () => {
        const routes: RouteConfig[] = [
          {
            pattern: "/a.js",
            strategy: PRESET_STRATEGIES.StaticAssets,
            dependencies: ["/b.js"],
          },
          {
            pattern: "/b.js",
            strategy: PRESET_STRATEGIES.StaticAssets,
            dependencies: ["/a.js"],
          },
        ];

        const graph = buildDependencyGraph(routes);
        const invalidated = getCascadeInvalidation("/a.js", graph);

        // Should handle circular dependency without infinite loop
        expect(invalidated).toContain("/a.js");
        expect(invalidated).toContain("/b.js");
        expect(invalidated.length).toBe(2); // Exactly 2, not infinite
      });
    });

    describe("Scenario 4: Framework Migration (Version Bump)", () => {
      it("should perform clean cache invalidation on major version change", () => {
        // Setup: Old Next.js v1 config
        mkdirSync(join(testDir, ".next", "static"), { recursive: true });
        writeFileSync(join(testDir, ".next", "static", "app.js"), "app v1");

        const oldConfig: AdvancedCachingConfig = {
          routes: [
            {
              pattern: /^\/api\//,
              strategy: PRESET_STRATEGIES.ApiEndpoints,
            },
          ],
          versioning: { manualVersion: "v1.9.9" },
        };

        const oldVersion = getOrGenerateCacheVersion(testDir, oldConfig);
        expect(oldVersion.version).toBe("v1.9.9");

        // Simulate: Upgrade to Next.js v2
        const newConfig: AdvancedCachingConfig = {
          routes: [
            {
              pattern: /^\/api\//,
              strategy: PRESET_STRATEGIES.ApiEndpoints,
            },
          ],
          versioning: { manualVersion: "v2.0.0" },
        };

        // Check: Version change triggers full invalidation
        const result = shouldInvalidateCache(testDir, oldVersion, newConfig);
        expect(result.shouldInvalidate).toBe(true);
        expect(result.newVersion).toBe("v2.0.0");
      });
    });

    describe("Scenario 5: Ignore Patterns in Production", () => {
      it("should ignore source maps and not trigger invalidation", () => {
        mkdirSync(join(testDir, "dist"), { recursive: true });
        writeFileSync(join(testDir, "dist", "app.js"), "console.log('app')");
        writeFileSync(join(testDir, "dist", "app.js.map"), '{"version":3}');

        const config: AdvancedCachingConfig = {
          routes: [],
          versioning: { autoVersion: true },
          dependencies: {
            enabled: true,
            trackedFiles: ["dist/**/*.js"],
          },
          invalidation: {
            ignorePatterns: ["**/*.map"],
          },
        };

        const version1 = generateCacheVersion(
          testDir,
          ["dist/**/*.js"],
          ["**/*.map"],
        );

        // Update source map (should be ignored)
        writeFileSync(
          join(testDir, "dist", "app.js.map"),
          '{"version":3,"updated":true}',
        );

        const version2 = generateCacheVersion(
          testDir,
          ["dist/**/*.js"],
          ["**/*.map"],
        );

        // Version should remain same
        expect(version1.version).toBe(version2.version);

        // Check invalidation
        const result = shouldInvalidateCache(testDir, version1, config);
        expect(result.shouldInvalidate).toBe(false);
      });

      it("should ignore multiple patterns (.env, .log, coverage)", () => {
        writeFileSync(join(testDir, "app.js"), "app");
        writeFileSync(join(testDir, ".env.local"), "SECRET=123");
        writeFileSync(join(testDir, "debug.log"), "log message");
        writeFileSync(join(testDir, "coverage.txt"), "coverage data");

        const ignorePatterns = [
          ".env*",
          "*.log",
          "coverage*",
          "node_modules/**",
        ];

        const version1 = generateCacheVersion(
          testDir,
          ["**/*.js"],
          ignorePatterns,
        );

        // Update all ignored files
        writeFileSync(join(testDir, ".env.local"), "SECRET=456");
        writeFileSync(join(testDir, "debug.log"), "new log");
        writeFileSync(join(testDir, "coverage.txt"), "new coverage");

        const version2 = generateCacheVersion(
          testDir,
          ["**/*.js"],
          ignorePatterns,
        );

        // Version should be same (all ignored)
        expect(version1.version).toBe(version2.version);
      });
    });

    describe("Scenario 6: File Deletion Detection", () => {
      it("should detect deleted tracked files and invalidate cache", () => {
        mkdirSync(join(testDir, "src"), { recursive: true });
        writeFileSync(join(testDir, "src", "app.js"), "app");
        writeFileSync(join(testDir, "src", "utils.js"), "utils");

        const config: AdvancedCachingConfig = {
          routes: [],
          versioning: { autoVersion: true },
          dependencies: {
            enabled: true,
            trackedFiles: ["src/**/*.js"],
          },
        };

        const version1 = generateCacheVersion(testDir, ["src/**/*.js"]);
        expect(Object.keys(version1.fileHashes).length).toBe(2);

        // Delete a file
        rmSync(join(testDir, "src", "utils.js"));

        // Get new version
        const version2 = generateCacheVersion(testDir, ["src/**/*.js"]);
        expect(Object.keys(version2.fileHashes).length).toBe(1);

        // Check: Version should change (file deleted)
        expect(version1.version).not.toBe(version2.version);

        // Check: Invalidation detected
        const result = shouldInvalidateCache(testDir, version1, config);
        expect(result.shouldInvalidate).toBe(true);
      });
    });

    describe("Scenario 7: Mixed Asset Types", () => {
      it("should handle complex project with multiple asset types", () => {
        // Setup: Realistic project structure
        mkdirSync(join(testDir, "dist", "js"), { recursive: true });
        mkdirSync(join(testDir, "dist", "css"), { recursive: true });
        mkdirSync(join(testDir, "dist", "img"), { recursive: true });

        writeFileSync(join(testDir, "dist", "js", "app.js"), "app");
        writeFileSync(join(testDir, "dist", "css", "style.css"), "style");
        writeFileSync(join(testDir, "dist", "img", "logo.png"), "logo");
        writeFileSync(join(testDir, "dist", "img", "favicon.ico"), "favicon");

        const version1 = generateCacheVersion(
          testDir,
          ["dist/**/*.js", "dist/**/*.css", "dist/**/*.png"],
          ["**/*.ico"],
        );

        // Update favicon (ignored)
        writeFileSync(join(testDir, "dist", "img", "favicon.ico"), "favicon2");

        const version2 = generateCacheVersion(
          testDir,
          ["dist/**/*.js", "dist/**/*.css", "dist/**/*.png"],
          ["**/*.ico"],
        );

        expect(version1.version).toBe(version2.version);

        // Update image
        writeFileSync(join(testDir, "dist", "img", "logo.png"), "logo2");

        const version3 = generateCacheVersion(
          testDir,
          ["dist/**/*.js", "dist/**/*.css", "dist/**/*.png"],
          ["**/*.ico"],
        );

        expect(version1.version).not.toBe(version3.version);
      });
    });
  });

  describe("Real-world Cache Invalidation Scenarios", () => {
    it("Scenario 1: Asset updated, pages depending on it should invalidate", () => {
      // Setup: Create a project with pages depending on shared assets
      mkdirSync(join(testDir, "dist", "pages"), { recursive: true });
      mkdirSync(join(testDir, "dist", "css"), { recursive: true });
      mkdirSync(join(testDir, "dist", "js"), { recursive: true });

      // Shared CSS that multiple pages depend on
      writeFileSync(join(testDir, "dist", "css", "theme.css"), "/* theme */");
      writeFileSync(join(testDir, "dist", "css", "layout.css"), "/* layout */");

      // Pages that import CSS
      writeFileSync(
        join(testDir, "dist", "pages", "index.html"),
        '<link rel="stylesheet" href="/css/theme.css"><link rel="stylesheet" href="/css/layout.css">',
      );
      writeFileSync(
        join(testDir, "dist", "pages", "about.html"),
        '<link rel="stylesheet" href="/css/theme.css">',
      );

      // Initial version
      const version1 = generateCacheVersion(
        testDir,
        ["dist/**/*.css", "dist/**/*.html"],
        [],
      );

      // Update shared CSS
      writeFileSync(
        join(testDir, "dist", "css", "theme.css"),
        "/* new theme */",
      );

      // Check version changed
      const version2 = generateCacheVersion(
        testDir,
        ["dist/**/*.css", "dist/**/*.html"],
        [],
      );

      expect(version1.version).not.toBe(version2.version);
    });

    it("Scenario 2: Multi-tier invalidation (CSS → HTML → pages)", () => {
      // Setup: Create hierarchy CSS -> HTML templates -> pages
      mkdirSync(join(testDir, "dist", "assets", "css"), { recursive: true });
      mkdirSync(join(testDir, "dist", "templates"), { recursive: true });
      mkdirSync(join(testDir, "dist", "pages"), { recursive: true });

      // Tier 1: Base CSS
      writeFileSync(
        join(testDir, "dist", "assets", "css", "base.css"),
        "/* v1 */",
      );

      // Tier 2: HTML template using CSS
      writeFileSync(
        join(testDir, "dist", "templates", "layout.html"),
        '<link href="/assets/css/base.css"><div id="content"></div>',
      );

      // Tier 3: Pages using template
      writeFileSync(
        join(testDir, "dist", "pages", "home.html"),
        "<!--@include layout.html--><h1>Home</h1>",
      );
      writeFileSync(
        join(testDir, "dist", "pages", "products.html"),
        "<!--@include layout.html--><h1>Products</h1>",
      );

      const version1 = generateCacheVersion(
        testDir,
        ["dist/**/*.css", "dist/**/*.html"],
        [],
      );

      // Modify base CSS - should trigger cascade
      writeFileSync(
        join(testDir, "dist", "assets", "css", "base.css"),
        "/* v2 - new styles */",
      );

      const version2 = generateCacheVersion(
        testDir,
        ["dist/**/*.css", "dist/**/*.html"],
        [],
      );

      // Version should be different
      expect(version1.version).not.toBe(version2.version);

      // Now modify template - should cascade further
      writeFileSync(
        join(testDir, "dist", "templates", "layout.html"),
        '<link href="/assets/css/base.css"><div id="main"></div>',
      );

      const version3 = generateCacheVersion(
        testDir,
        ["dist/**/*.css", "dist/**/*.html"],
        [],
      );

      expect(version2.version).not.toBe(version3.version);
    });

    it("Scenario 3: Version bump + date change + hash change", () => {
      // Setup: Complex project with multiple asset types
      mkdirSync(join(testDir, "dist", "js"), { recursive: true });
      mkdirSync(join(testDir, "dist", "css"), { recursive: true });
      mkdirSync(join(testDir, "dist", "img"), { recursive: true });

      // Create initial assets with metadata
      writeFileSync(join(testDir, "dist", "js", "app.1234.js"), "/* app v1 */");
      writeFileSync(
        join(testDir, "dist", "css", "style.5678.css"),
        "/* css v1 */",
      );
      writeFileSync(
        join(testDir, "dist", "img", "logo.abcd.png"),
        Buffer.from("PNG"),
      );
      writeFileSync(join(testDir, "package.json"), '{"version": "1.0.0"}');

      const version1 = generateCacheVersion(
        testDir,
        ["dist/**/*.{js,css,png}", "package.json"],
        [],
      );

      // Simulate version bump in package.json
      writeFileSync(join(testDir, "package.json"), '{"version": "1.1.0"}');

      const version2 = generateCacheVersion(
        testDir,
        ["dist/**/*.{js,css,png}", "package.json"],
        [],
      );

      expect(version1.version).not.toBe(version2.version);

      // Update JS bundle with new hash
      writeFileSync(join(testDir, "dist", "js", "app.1234.js"), "/* app v2 */");

      const version3 = generateCacheVersion(
        testDir,
        ["dist/**/*.{js,css,png}", "package.json"],
        [],
      );

      expect(version2.version).not.toBe(version3.version);

      // Update CSS
      writeFileSync(
        join(testDir, "dist", "css", "style.5678.css"),
        "/* css v2 */",
      );

      const version4 = generateCacheVersion(
        testDir,
        ["dist/**/*.{js,css,png}", "package.json"],
        [],
      );

      expect(version3.version).not.toBe(version4.version);
    });

    it("Scenario 4: Concurrent invalidations with dependency resolution", () => {
      // Setup: Create complex dependency graph
      mkdirSync(join(testDir, "dist", "components"), { recursive: true });
      mkdirSync(join(testDir, "dist", "styles"), { recursive: true });
      mkdirSync(join(testDir, "dist", "pages"), { recursive: true });

      // Component files
      writeFileSync(
        join(testDir, "dist", "components", "header.js"),
        "export const Header = () => {}",
      );
      writeFileSync(
        join(testDir, "dist", "components", "footer.js"),
        "export const Footer = () => {}",
      );

      // Shared styles
      writeFileSync(
        join(testDir, "dist", "styles", "components.css"),
        ".header { } .footer { }",
      );
      writeFileSync(
        join(testDir, "dist", "styles", "variables.css"),
        ":root { --primary: blue; }",
      );

      // Pages using components and styles
      writeFileSync(
        join(testDir, "dist", "pages", "index.html"),
        '<link href="/styles/variables.css"><link href="/styles/components.css"><script src="/components/header.js"></script>',
      );

      const version1 = generateCacheVersion(
        testDir,
        ["dist/**/*.js", "dist/**/*.css", "dist/**/*.html"],
        [],
      );

      // Concurrent changes: update multiple files simultaneously
      writeFileSync(
        join(testDir, "dist", "components", "header.js"),
        "export const Header = ({ title }) => <h1>{title}</h1>",
      );
      writeFileSync(
        join(testDir, "dist", "styles", "variables.css"),
        ":root { --primary: red; --secondary: blue; }",
      );
      writeFileSync(
        join(testDir, "dist", "styles", "components.css"),
        ".header { color: var(--primary); } .footer { }",
      );

      const version2 = generateCacheVersion(
        testDir,
        ["dist/**/*.js", "dist/**/*.css", "dist/**/*.html"],
        [],
      );

      // All concurrent changes should trigger invalidation
      expect(version1.version).not.toBe(version2.version);

      // Add new component - should also invalidate
      writeFileSync(
        join(testDir, "dist", "components", "sidebar.js"),
        "export const Sidebar = () => {}",
      );

      const version3 = generateCacheVersion(
        testDir,
        ["dist/**/*.js", "dist/**/*.css", "dist/**/*.html"],
        [],
      );

      expect(version2.version).not.toBe(version3.version);

      // Remove a file - should also invalidate
      rmSync(join(testDir, "dist", "components", "footer.js"));

      const version4 = generateCacheVersion(
        testDir,
        ["dist/**/*.js", "dist/**/*.css", "dist/**/*.html"],
        [],
      );

      expect(version3.version).not.toBe(version4.version);
    });
  });
});
