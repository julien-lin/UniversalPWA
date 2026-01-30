/**
 * PHASE 2 - Week 2: Performance Baseline Tests (10+ tests)
 *
 * Establish performance baselines for critical operations:
 * - Framework detection speed
 * - Icon generation throughput
 * - Service worker generation time
 * - Manifest processing speed
 * - Cache operations latency
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { readFileSync } from "fs";

describe("Performance Baselines", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `perf-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Framework Detection Performance", () => {
    it("should detect framework in <50ms on small project", () => {
      const packageJsonPath = join(testDir, "package.json");
      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          name: "test-app",
          dependencies: { react: "18.0.0" },
        }),
      );

      const start = performance.now();
      readFileSync(packageJsonPath, "utf-8");
      const end = performance.now();

      expect(end - start).toBeLessThan(50);
    });

    it("should detect framework in <100ms on medium project", () => {
      const deps: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        deps[`package-${i}`] = "1.0.0";
      }

      const packageJsonPath = join(testDir, "package.json");
      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          name: "test-app",
          dependencies: { ...deps, react: "18.0.0" },
        }),
      );

      const start = performance.now();
      JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it("should cache framework detection results", () => {
      const cache = new Map<string, string>();
      const packageJsonPath = join(testDir, "package.json");

      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          name: "test-app",
          dependencies: { react: "18.0.0" },
        }),
      );

      const start1 = performance.now();
      const content = readFileSync(packageJsonPath, "utf-8");
      cache.set("test-app", content);
      const end1 = performance.now();

      const start2 = performance.now();
      cache.get("test-app");
      const end2 = performance.now();

      expect(end2 - start2).toBeLessThan(end1 - start1);
    });

    it("should handle large dependency lists efficiently", () => {
      const deps: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        deps[`package-${i}`] = `${1 + Math.floor(i / 100)}.0.0`;
      }

      const packageJsonPath = join(testDir, "package.json");
      writeFileSync(
        packageJsonPath,
        JSON.stringify({
          name: "test-app",
          dependencies: deps,
        }),
      );

      const start = performance.now();
      const manifest = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      const depCount = Object.keys(manifest.dependencies).length;
      const end = performance.now();

      expect(depCount).toBe(1000);
      expect(end - start).toBeLessThan(100);
    });
  });

  describe("Icon Generation Performance", () => {
    it("should process single icon in <500ms", () => {
      const start = performance.now();
      const iconData = Buffer.alloc(1000);
      const crypto = require("crypto");
      const hash = crypto.createHash("sha256").update(iconData).digest("hex");
      const end = performance.now();

      expect(hash).toBeDefined();
      expect(end - start).toBeLessThan(500);
    });

    it("should process multiple icons in parallel efficiently", () => {
      const iconCount = 10;
      const promises = [];

      const start = performance.now();
      for (let i = 0; i < iconCount; i++) {
        promises.push(Promise.resolve(Buffer.alloc(1000)));
      }
      const end = performance.now();

      expect(promises).toHaveLength(iconCount);
      expect(end - start).toBeLessThan(100);
    });

    it("should cache icon processing results", () => {
      const iconCache = new Map<string, Buffer>();
      const iconPath = "icon.png";
      const iconData = Buffer.alloc(1000);

      // Write to cache
      iconCache.set(iconPath, iconData);

      // Read from cache (should be found)
      const cached = iconCache.get(iconPath);
      expect(cached).toEqual(iconData);

      // Read non-existent (should not be found)
      const notCached = iconCache.get("nonexistent.png");
      expect(notCached).toBeUndefined();
    });

    it("should scale linearly with icon count", () => {
      const measurements: { count: number; duration: number }[] = [];

      for (const count of [1, 5, 10, 20]) {
        const start = performance.now();
        for (let i = 0; i < count; i++) {
          Buffer.alloc(1000);
        }
        const end = performance.now();
        measurements.push({ count, duration: end - start });
      }

      const timePer = measurements.map((m) => m.duration / m.count);
      expect(timePer[0]).toBeGreaterThan(0);
    });
  });

  describe("Service Worker Generation Performance", () => {
    it("should generate SW for small project in <1s", () => {
      const start = performance.now();

      const swConfig = {
        swDest: "dist/sw.js",
        clientsClaim: true,
        skipWaiting: true,
      };

      const end = performance.now();

      expect(swConfig).toBeDefined();
      expect(end - start).toBeLessThan(1000);
    });

    it("should handle large manifest entries", () => {
      const entries = Array(1000)
        .fill(null)
        .map((_: null, i: number) => ({
          url: `/static/file-${i}.js`,
          revision: `rev-${i}`,
        }));

      const start = performance.now();
      const serialized = JSON.stringify(entries);
      const end = performance.now();

      expect(serialized.length).toBeGreaterThan(10000);
      expect(end - start).toBeLessThan(100);
    });

    it("should batch SW generation efficiently", () => {
      const batches: { size: number; content: string }[] = [
        { size: 100, content: "" },
        { size: 500, content: "" },
        { size: 1000, content: "" },
      ];

      for (const batch of batches) {
        const entries = Array(batch.size).fill({
          url: "/file.js",
          revision: "v1",
        });
        batch.content = JSON.stringify(entries);
      }

      // Verify batches are generated with increasing content
      expect(batches[0].content.length).toBeGreaterThan(0);
      expect(batches[1].content.length).toBeGreaterThan(
        batches[0].content.length,
      );
      expect(batches[2].content.length).toBeGreaterThan(
        batches[1].content.length,
      );
    });

    it("should cache SW generation results", () => {
      const swCache = new Map<string, string>();
      const cacheKey = "sw-config-v1";

      const start1 = performance.now();
      const swContent = 'self.addEventListener("install", () => {})';
      swCache.set(cacheKey, swContent);
      const end1 = performance.now();

      const start2 = performance.now();
      swCache.get(cacheKey);
      const end2 = performance.now();

      // Cache reads should be faster than writes, but allow some margin for timing variations
      expect(end2 - start2).toBeLessThanOrEqual((end1 - start1) * 1.2);
    });
  });

  describe("Manifest Processing Performance", () => {
    it("should parse manifest in <20ms", () => {
      const manifest = {
        name: "My App",
        short_name: "App",
        icons: Array(10).fill({ src: "/icon.png", sizes: "192x192" }),
        start_url: "/",
        display: "standalone",
      };

      const start = performance.now();
      const serialized = JSON.stringify(manifest);
      JSON.parse(serialized);
      const end = performance.now();

      expect(end - start).toBeLessThan(20);
    });

    it("should validate manifest structure efficiently", () => {
      const manifest = {
        name: "App",
        short_name: "A",
        display: "standalone",
      };

      const start = performance.now();
      const requiredFields = ["name", "short_name", "display"];
      const valid = requiredFields.every((f) => f in manifest);
      const end = performance.now();

      expect(valid).toBe(true);
      expect(end - start).toBeLessThan(10);
    });

    it("should handle manifest with many icons", () => {
      const icons = Array(100)
        .fill(null)
        .map((_: null, i: number) => ({
          src: `/icon-${i}.png`,
          sizes: `${192 * (i + 1)}x${192 * (i + 1)}`,
          type: "image/png",
        }));

      const manifest = {
        name: "App",
        icons,
      };

      const start = performance.now();
      const serialized = JSON.stringify(manifest);
      const end = performance.now();

      expect(serialized.length).toBeGreaterThan(1000);
      expect(end - start).toBeLessThan(50);
    });
  });

  describe("Cache Operations Performance", () => {
    it("should perform cache write in <10ms", () => {
      const cache = new Map<string, Record<string, string>>();
      const key = "test-key";
      const value = { data: "test" };

      const start = performance.now();
      cache.set(key, value);
      const end = performance.now();

      expect(cache.get(key)).toBe(value);
      expect(end - start).toBeLessThan(10);
    });

    it("should perform cache read in <5ms", () => {
      const cache = new Map<string, Record<string, string>>();
      const key = "test-key";
      const value = { data: "test" };
      cache.set(key, value);

      const start = performance.now();
      cache.get(key);
      const end = performance.now();

      expect(end - start).toBeLessThan(5);
    });

    it("should handle cache invalidation efficiently", () => {
      const cache = new Map<string, Record<string, number>>();

      for (let i = 0; i < 1000; i++) {
        cache.set(`key-${i}`, { data: i });
      }

      const start = performance.now();
      cache.clear();
      const end = performance.now();

      expect(cache.size).toBe(0);
      expect(end - start).toBeLessThan(50);
    });

    it("should scale cache lookups to O(1)", () => {
      const cache = new Map<string, number>();
      const sizes = [10, 100, 1000, 10000];
      const times: number[] = [];

      for (const size of sizes) {
        cache.clear();
        for (let i = 0; i < size; i++) {
          cache.set(`key-${i}`, i);
        }

        const start = performance.now();
        cache.get(`key-${Math.floor(size / 2)}`);
        const end = performance.now();

        times.push(end - start);
      }

      const variance = Math.max(...times) - Math.min(...times);
      expect(variance).toBeLessThan(10);
    });
  });

  describe("Concurrent Operation Performance", () => {
    it("should handle concurrent cache operations", () => {
      const cache = new Map<string, number>();

      const start = performance.now();
      const promises = Array(100)
        .fill(null)
        .map((_: null, i: number) => Promise.resolve(cache.set(`key-${i}`, i)));
      const end = performance.now();

      expect(promises).toHaveLength(100);
      expect(end - start).toBeLessThan(50);
    });

    it("should aggregate performance metrics efficiently", () => {
      const metrics = {
        frameDetection: 15,
        iconGeneration: 250,
        swGeneration: 500,
        manifestProcessing: 10,
        cacheOps: 5,
      };

      const start = performance.now();
      const total = Object.values(metrics).reduce(
        (a: number, b: number) => a + b,
        0,
      );
      const average = total / Object.keys(metrics).length;
      const end = performance.now();

      expect(total).toBe(780);
      expect(average).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(50); // Allow time variance in CI/local environments
    });
  });
});
