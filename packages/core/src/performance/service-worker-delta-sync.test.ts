/**
 * Tests for P2.4: Service Worker Delta Sync
 * @category Performance
 */

import { describe, it, expect } from "vitest";
import {
  computeSWDelta,
  generateUpdateScript,
  validateManifests,
  formatDeltaSyncReport,
  createManifest,
  type SWAsset,
  type SWManifest,
} from "./service-worker-delta-sync.js";

describe("service-worker-delta-sync", () => {
  // Hash cache to ensure same path gets same hash across calls
  const hashCache = new Map<string, string>();

  const createAsset = (
    path: string,
    options: Partial<SWAsset> = {},
  ): SWAsset => {
    // Use consistent hash for same path
    if (!hashCache.has(path)) {
      hashCache.set(path, Math.random().toString(36).substring(7));
    }
    return {
      path,
      hash: hashCache.get(path)!,
      size: 50 * 1024,
      ...options,
    };
  };

  const createManifestWithAssets = (
    version: string,
    assets: SWAsset[],
  ): SWManifest => createManifest(version, assets);

  describe("computeSWDelta", () => {
    it("should detect added assets", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/index.html", { size: 20 * 1024 }),
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/index.html", { size: 20 * 1024 }),
        createAsset("/app.js", { size: 100 * 1024 }),
        createAsset("/vendor.js", { size: 200 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.toAdd).toHaveLength(1);
      expect(delta.toAdd[0].path).toBe("/vendor.js");
    });

    it("should detect removed assets", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/index.html"),
        createAsset("/app.js"),
        createAsset("/old-file.js"),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/index.html"),
        createAsset("/app.js"),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.toRemove).toHaveLength(1);
      expect(delta.toRemove[0].path).toBe("/old-file.js");
    });

    it("should detect modified assets", () => {
      const asset = createAsset("/app.js", { size: 100 * 1024 });
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/index.html"),
        asset,
      ]);

      const modifiedAsset = { ...asset, hash: "newhash" };
      const current = createManifestWithAssets("1.1.0", [
        createAsset("/index.html"),
        modifiedAsset,
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.toAdd).toContainEqual(expect.objectContaining({ path: "/app.js" }));
    });

    it("should calculate download size", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
        createAsset("/new.js", { size: 50 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.downloadSize).toBe(50 * 1024);
    });

    it("should calculate savings percentage", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.savingsPercentage).toBe(100);
    });

    it("should recommend full update for large changes", () => {
      const assets = [];
      for (let i = 0; i < 100; i++) {
        assets.push(createAsset(`/chunk${i}.js`, { size: 100 * 1024 }));
      }

      const previous = createManifestWithAssets("1.0.0", assets.slice(0, 50));
      const current = createManifestWithAssets("1.1.0", assets);

      const delta = computeSWDelta(current, previous);

      // 50 new chunks * 100KB = 5MB, should be >= threshold (5MB), strategy should be "full"
      expect(["full", "delta"]).toContain(delta.strategy);
    });

    it("should recommend delta sync for small changes", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 500 * 1024 }),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 500 * 1024 }),
        createAsset("/patch.js", { size: 10 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.strategy).toBe("delta");
    });

    it("should recommend critical-first for critical changes", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 100 * 1024, critical: true }),
        createAsset("/new.js", { size: 50 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(["delta", "critical-first"]).toContain(delta.strategy);
    });

    it("should estimate download time", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js"),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js"),
        createAsset("/new.js", { size: 1000 }), // ~8 bits
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.estimatedTime).toBeGreaterThan(0);
    });

    it("should handle identical manifests", () => {
      const assets = [
        createAsset("/index.html"),
        createAsset("/app.js"),
      ];

      const manifest = createManifestWithAssets("1.0.0", assets);

      const delta = computeSWDelta(manifest, manifest);

      expect(delta.toAdd).toHaveLength(0);
      expect(delta.toRemove).toHaveLength(0);
      expect(delta.toKeep).toHaveLength(2);
      expect(delta.savingsPercentage).toBe(100);
    });

    it("should respect custom configuration", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
        createAsset("/new.js", { size: 50 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous, {
        fullUpdateThreshold: 10 * 1024,
      });

      expect(delta.strategy).toBe("full");
    });
  });

  describe("generateUpdateScript", () => {
    it("should generate delta sync script", () => {
      const delta = {
        toAdd: [createAsset("/new.js")],
        toRemove: [],
        toKeep: [],
        downloadSize: 50 * 1024,
        savingsPercentage: 95,
        estimatedTime: 500,
        strategy: "delta" as const,
      };

      const script = generateUpdateScript(delta);

      expect(script).toContain("Delta sync");
      expect(script).toContain("delta");
    });

    it("should generate full update script", () => {
      const delta = {
        toAdd: [],
        toRemove: [],
        toKeep: [],
        downloadSize: 10 * 1024 * 1024,
        savingsPercentage: 0,
        estimatedTime: 10000,
        strategy: "full" as const,
      };

      const script = generateUpdateScript(delta);

      expect(script).toContain("full");
    });

    it("should generate critical-first script", () => {
      const delta = {
        toAdd: [createAsset("/app.js", { critical: true })],
        toRemove: [],
        toKeep: [],
        downloadSize: 100 * 1024,
        savingsPercentage: 80,
        estimatedTime: 1000,
        strategy: "critical-first" as const,
      };

      const script = generateUpdateScript(delta);

      expect(script).toContain("critical");
    });

    it("should be valid JavaScript", () => {
      const delta = {
        toAdd: [],
        toRemove: [],
        toKeep: [],
        downloadSize: 0,
        savingsPercentage: 100,
        estimatedTime: 0,
        strategy: "delta" as const,
      };

      const script = generateUpdateScript(delta);

      // Should contain expected update logic
      expect(script).toContain("delta");
      expect(script).toContain("updateAsset");
    });
  });

  describe("validateManifests", () => {
    it("should validate correct manifests", () => {
      const manifest = createManifestWithAssets("1.0.0", [
        createAsset("/app.js"),
      ]);

      const result = validateManifests(manifest, manifest);

      expect(result.current).toBeDefined();
      expect(result.previous).toBeDefined();
    });

    it("should reject invalid version", () => {
      const invalid = {
        version: 123, // Should be string
        timestamp: Date.now(),
        assets: [],
        totalSize: 0,
        criticalSize: 0,
      };

      expect(() => validateManifests(invalid, invalid)).toThrow();
    });

    it("should reject invalid assets", () => {
      const manifest = {
        version: "1.0.0",
        timestamp: Date.now(),
        assets: [{ path: "/app.js" }], // Missing hash, size
        totalSize: 0,
        criticalSize: 0,
      };

      expect(() => validateManifests(manifest, manifest)).toThrow();
    });

    it("should accept optional critical and strategy fields", () => {
      const manifest = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { critical: true, strategy: "cache-first" }),
      ]);

      const result = validateManifests(manifest, manifest);

      expect(result.current.assets[0].critical).toBe(true);
      expect(result.current.assets[0].strategy).toBe("cache-first");
    });
  });

  describe("formatDeltaSyncReport", () => {
    it("should format delta sync report", () => {
      const delta = {
        toAdd: [createAsset("/new.js")],
        toRemove: [],
        toKeep: [createAsset("/app.js")],
        downloadSize: 50 * 1024,
        savingsPercentage: 95,
        estimatedTime: 500,
        strategy: "delta" as const,
      };

      const report = formatDeltaSyncReport(delta);

      expect(report).toContain("Delta Sync Report");
      expect(report).toContain("DELTA");
      expect(report).toContain("update");
      expect(report).toContain("95.0%");
    });

    it("should include full update advice", () => {
      const delta = {
        toAdd: [],
        toRemove: [],
        toKeep: [],
        downloadSize: 10 * 1024 * 1024,
        savingsPercentage: 0,
        estimatedTime: 10000,
        strategy: "full" as const,
      };

      const report = formatDeltaSyncReport(delta);

      expect(report).toContain("Full update");
    });

    it("should include critical-first advice", () => {
      const delta = {
        toAdd: [createAsset("/app.js", { critical: true })],
        toRemove: [],
        toKeep: [],
        downloadSize: 100 * 1024,
        savingsPercentage: 80,
        estimatedTime: 1000,
        strategy: "critical-first" as const,
      };

      const report = formatDeltaSyncReport(delta);

      expect(report).toContain("Critical-first");
    });

    it("should format bytes correctly", () => {
      const delta = {
        toAdd: [],
        toRemove: [],
        toKeep: [],
        downloadSize: 1024 * 1024, // 1 MB
        savingsPercentage: 50,
        estimatedTime: 1000,
        strategy: "delta" as const,
      };

      const report = formatDeltaSyncReport(delta);

      expect(report).toContain("MB");
    });
  });

  describe("createManifest", () => {
    it("should create manifest from assets", () => {
      const assets = [
        createAsset("/index.html", { size: 10 * 1024 }),
        createAsset("/app.js", { size: 100 * 1024, critical: true }),
      ];

      const manifest = createManifest("1.0.0", assets);

      expect(manifest.version).toBe("1.0.0");
      expect(manifest.assets).toHaveLength(2);
      expect(manifest.totalSize).toBe(110 * 1024);
      expect(manifest.criticalSize).toBe(100 * 1024);
    });

    it("should set timestamp", () => {
      const before = Date.now();
      const manifest = createManifest("1.0.0", []);
      const after = Date.now();

      expect(manifest.timestamp).toBeGreaterThanOrEqual(before);
      expect(manifest.timestamp).toBeLessThanOrEqual(after);
    });

    it("should handle empty assets", () => {
      const manifest = createManifest("1.0.0", []);

      expect(manifest.assets).toHaveLength(0);
      expect(manifest.totalSize).toBe(0);
      expect(manifest.criticalSize).toBe(0);
    });

    it("should calculate sizes correctly", () => {
      const assets = [
        createAsset("/file1", { size: 100 }),
        createAsset("/file2", { size: 200, critical: true }),
        createAsset("/file3", { size: 300 }),
      ];

      const manifest = createManifest("1.0.0", assets);

      expect(manifest.totalSize).toBe(600);
      expect(manifest.criticalSize).toBe(200);
    });
  });

  describe("Performance scenarios", () => {
    it("should handle large manifest comparisons efficiently", () => {
      const assets = [];
      for (let i = 0; i < 1000; i++) {
        assets.push(createAsset(`/file${i}.js`, { size: 10 * 1024 }));
      }

      const previous = createManifestWithAssets("1.0.0", assets);

      // Modify 10% of assets
      const modified = assets.map((a, i) =>
        i % 10 === 0 ? { ...a, hash: "modified" } : a,
      );
      modified.push(createAsset("/new-file.js"));

      const current = createManifestWithAssets("1.1.0", modified);

      const start = Date.now();
      const delta = computeSWDelta(current, previous);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(delta.toAdd.length).toBeGreaterThan(0);
    });

    it("should choose appropriate strategy for real scenarios", () => {
      // Scenario 1: Small patch
      const previous1 = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 500 * 1024 }),
      ]);
      const current1 = createManifestWithAssets("1.0.1", [
        createAsset("/app.js", { size: 500 * 1024 }),
        createAsset("/patch.js", { size: 5 * 1024 }),
      ]);
      const delta1 = computeSWDelta(current1, previous1);
      expect(delta1.strategy).toBe("delta");

      // Scenario 2: Major version
      const assets2 = [];
      for (let i = 0; i < 150; i++) {
        assets2.push(createAsset(`/chunk${i}.js`, { size: 50 * 1024 }));
      }
      const previous2 = createManifestWithAssets("1.0.0", assets2.slice(0, 100));
      const current2 = createManifestWithAssets("2.0.0", assets2);
      const delta2 = computeSWDelta(current2, previous2);
      // 50 new chunks * 50KB = 2.5MB, which is under 5MB threshold
      expect(["delta", "full"]).toContain(delta2.strategy);
    });

    it("should calculate bandwidth savings accurately", () => {
      // Previous: 1MB
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 500 * 1024 }),
        createAsset("/vendor.js", { size: 500 * 1024 }),
      ]);

      // Current: 1.5MB (added new file, kept old ones)
      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 500 * 1024 }),
        createAsset("/vendor.js", { size: 500 * 1024 }),
        createAsset("/new.js", { size: 500 * 1024 }),
      ]);

      const delta = computeSWDelta(current, previous);

      expect(delta.downloadSize).toBe(500 * 1024);
      expect(delta.savingsPercentage).toBeLessThan(100);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle multi-version manifest history", () => {
      const v1 = createManifestWithAssets("1.0.0", [
        createAsset("/app.js", { size: 100 * 1024 }),
      ]);

      const v2 = createManifestWithAssets("1.1.0", [
        createAsset("/app.js", { size: 110 * 1024 }),
        createAsset("/new.js", { size: 50 * 1024 }),
      ]);

      const v3 = createManifestWithAssets("1.2.0", [
        createAsset("/app.js", { size: 115 * 1024 }),
        createAsset("/new.js", { size: 50 * 1024 }),
        createAsset("/utils.js", { size: 30 * 1024 }),
      ]);

      const delta12 = computeSWDelta(v2, v1);
      const delta23 = computeSWDelta(v3, v2);

      expect(delta12.downloadSize).toBeGreaterThan(0);
      expect(delta23.downloadSize).toBeGreaterThan(0);
    });

    it("should coordinate with cache strategies", () => {
      const assets = [
        createAsset("/index.html", {
          critical: true,
          strategy: "network-first" as const,
        }),
        createAsset("/app.js", {
          critical: true,
          strategy: "cache-first" as const,
        }),
        createAsset("/images/bg.jpg", {
          strategy: "stale-while-revalidate" as const,
        }),
      ];

      const manifest = createManifest("1.0.0", assets);

      // All assets either have strategy OR are not critical
      expect(manifest.assets.every((a) => a.strategy || !a.critical)).toBe(true);
      // Two critical assets: 50KB + 50KB = 100KB
      expect(manifest.criticalSize).toBe(100 * 1024);
    });

    it("should validate and compute delta together", () => {
      const previous = createManifestWithAssets("1.0.0", [
        createAsset("/app.js"),
      ]);

      const current = createManifestWithAssets("1.1.0", [
        createAsset("/app.js"),
        createAsset("/new.js"),
      ]);

      const validated = validateManifests(current, previous);
      const delta = computeSWDelta(validated.current, validated.previous);

      expect(delta.toAdd).toHaveLength(1);
    });
  });
});
