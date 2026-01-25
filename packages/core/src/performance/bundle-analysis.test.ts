/**
 * Tests for P2.2: Incremental Bundle Analysis
 * @category Performance
 */

import { describe, it, expect } from "vitest";
import {
  estimateGzipSize,
  estimateBrotliSize,
  analyzeBundleSize,
  compareBundleSnapshots,
  formatBundleAnalysis,
  formatBytes,
  type BundleChunk,
  type BundleSnapshot,
  BundleAnalysisError,
} from "./bundle-analysis.js";

describe("bundle-analysis", () => {
  const createChunk = (
    id: string,
    name: string,
    size: number,
    files: string[] = [],
  ): BundleChunk => ({
    id,
    name,
    size,
    files,
    dependencies: [],
  });

  const createSnapshot = (
    buildId: string,
    chunks: BundleChunk[],
  ): BundleSnapshot => ({
    timestamp: new Date().toISOString(),
    buildId,
    totalSize: chunks.reduce((sum, c) => sum + c.size, 0),
    chunks,
  });

  describe("estimateGzipSize", () => {
    it("should estimate gzip size as 25% of original", () => {
      const original = 1000;
      const estimated = estimateGzipSize(original);

      expect(estimated).toBe(250);
    });

    it("should handle large sizes", () => {
      const original = 1000000; // 1 MB
      const estimated = estimateGzipSize(original);

      expect(estimated).toBe(250000);
    });

    it("should handle zero size", () => {
      expect(estimateGzipSize(0)).toBe(0);
    });
  });

  describe("estimateBrotliSize", () => {
    it("should estimate brotli size as 20% of original", () => {
      const original = 1000;
      const estimated = estimateBrotliSize(original);

      expect(estimated).toBe(200);
    });

    it("should be more compressed than gzip", () => {
      const original = 1000;
      const gzip = estimateGzipSize(original);
      const brotli = estimateBrotliSize(original);

      expect(brotli).toBeLessThan(gzip);
    });
  });

  describe("analyzeBundleSize", () => {
    it("should pass small bundles", () => {
      const chunks = [createChunk("chunk1", "main", 100 * 1024)];
      const snapshot = createSnapshot("build1", chunks);

      const alerts = analyzeBundleSize(snapshot);

      expect(alerts).toHaveLength(0);
    });

    it("should warn on oversized chunks", () => {
      const chunks = [createChunk("chunk1", "vendor", 600 * 1024)];
      const snapshot = createSnapshot("build1", chunks);

      const alerts = analyzeBundleSize(snapshot);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toContain("exceeds warning");
    });

    it("should warn on oversized bundle", () => {
      const chunks = [
        createChunk("chunk1", "a", 2 * 1024 * 1024),
        createChunk("chunk2", "b", 2 * 1024 * 1024),
        createChunk("chunk3", "c", 2 * 1024 * 1024),
      ];
      const snapshot = createSnapshot("build1", chunks);

      const alerts = analyzeBundleSize(snapshot);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some((a) => a.includes("Total bundle"))).toBe(true);
    });

    it("should detect duplicate dependencies", () => {
      const chunk: BundleChunk = {
        ...createChunk("chunk1", "main", 100 * 1024),
        dependencies: ["dep1", "dep2", "dep1"],
      };
      const snapshot = createSnapshot("build1", [chunk]);

      const alerts = analyzeBundleSize(snapshot);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0]).toContain("duplicate dependencies");
    });

    it("should respect custom config", () => {
      const chunks = [createChunk("chunk1", "main", 600 * 1024)];
      const snapshot = createSnapshot("build1", chunks);

      const alerts = analyzeBundleSize(snapshot, {
        chunkSizeWarning: 700 * 1024,
      });

      expect(alerts).toHaveLength(0);
    });
  });

  describe("compareBundleSnapshots", () => {
    it("should detect new chunks", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 100 * 1024),
        createChunk("chunk2", "vendor", 50 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.addedChunks).toHaveLength(1);
      expect(analysis.addedChunks[0].name).toBe("vendor");
    });

    it("should detect removed chunks", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
        createChunk("chunk2", "old", 50 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.removedChunks).toHaveLength(1);
      expect(analysis.removedChunks[0].name).toBe("old");
    });

    it("should track chunk size deltas", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 150 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.chunkDeltas).toHaveLength(1);
      const delta = analysis.chunkDeltas[0];
      expect(delta.sizeDelta).toBe(50 * 1024);
      expect(delta.percentChange).toBe(50); // 50% growth
    });

    it("should calculate total bundle delta", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "a", 100 * 1024),
        createChunk("chunk2", "b", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "a", 120 * 1024),
        createChunk("chunk2", "b", 100 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.totalSizeDelta).toBe(20 * 1024);
    });

    it("should detect oversized chunks", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 600 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.oversizedChunks).toHaveLength(1);
    });

    it("should generate growth alerts", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 200 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous, {
        maxChunkGrowth: 50 * 1024,
      });

      expect(analysis.alerts.some((a) => a.includes("grew"))).toBe(true);
    });

    it("should handle empty previous snapshot", () => {
      const previous = createSnapshot("build1", []);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.addedChunks).toHaveLength(1);
      expect(analysis.totalSizeDelta).toBe(100 * 1024);
    });
  });

  describe("formatBundleAnalysis", () => {
    it("should format basic analysis", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 120 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);
      const formatted = formatBundleAnalysis(analysis);

      expect(formatted).toContain("Bundle Analysis Report");
      expect(formatted).toContain("Summary");
      expect(formatted).toContain("Current size");
    });

    it("should show added chunks section", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 100 * 1024),
        createChunk("chunk2", "vendor", 50 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);
      const formatted = formatBundleAnalysis(analysis);

      expect(formatted).toContain("Added Chunks");
      expect(formatted).toContain("vendor");
    });

    it("should show removed chunks section", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
        createChunk("chunk2", "old", 50 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);
      const formatted = formatBundleAnalysis(analysis);

      expect(formatted).toContain("Removed Chunks");
      expect(formatted).toContain("old");
    });

    it("should show oversized chunks section", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 600 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);
      const formatted = formatBundleAnalysis(analysis);

      expect(formatted).toContain("Oversized Chunks");
    });

    it("should show alerts section", () => {
      const previous = createSnapshot("build1", [
        createChunk("chunk1", "main", 100 * 1024),
      ]);
      const current = createSnapshot("build2", [
        createChunk("chunk1", "main", 600 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);
      const formatted = formatBundleAnalysis(analysis);

      expect(formatted).toContain("Alerts");
    });
  });

  describe("formatBytes", () => {
    it("should format various sizes", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toContain("KB");
      expect(formatBytes(1024 * 1024)).toContain("MB");
      expect(formatBytes(1024 * 1024 * 1024)).toContain("GB");
    });

    it("should handle negative values", () => {
      const formatted = formatBytes(-500 * 1024);
      expect(formatted).toContain("-");
    });
  });

  describe("BundleAnalysisError", () => {
    it("should create error with message", () => {
      const error = new BundleAnalysisError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("BundleAnalysisError");
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Performance scenarios", () => {
    it("should handle large bundle with many chunks", () => {
      const chunks: BundleChunk[] = [];
      for (let i = 0; i < 100; i++) {
        chunks.push(createChunk(`chunk${i}`, `chunk${i}`, 100 * 1024));
      }

      const previous = createSnapshot("build1", chunks);

      // Add/modify some chunks
      const current = createSnapshot("build2", [
        ...chunks.slice(0, 98),
        createChunk("chunk98", "chunk98", 150 * 1024), // Modified
        createChunk("chunk100", "new-chunk", 100 * 1024), // Added
      ]);

      const start = Date.now();
      const analysis = compareBundleSnapshots(current, previous);
      const elapsed = Date.now() - start;

      // 98 unchanged + 1 modified + 1 added + 1 removed (chunk99) = 101 total deltas
      expect(analysis.chunkDeltas).toHaveLength(101);
      expect(elapsed).toBeLessThan(50); // Should be fast
    });

    it("should detect code splitting improvements", () => {
      // Before: single large chunk
      const previous = createSnapshot("build1", [
        createChunk("main", "main", 500 * 1024),
      ]);

      // After: split into multiple chunks
      const current = createSnapshot("build2", [
        createChunk("main", "main", 200 * 1024),
        createChunk("vendor", "vendor", 150 * 1024),
        createChunk("routes", "routes", 150 * 1024),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      // Main chunk modified, vendor and routes added
      expect(analysis.addedChunks).toHaveLength(2);
      expect(analysis.addedChunks.map((c) => c.name)).toEqual([
        "vendor",
        "routes",
      ]);
      expect(analysis.totalSizeDelta).toBe(0); // Main: 500KB -> 200KB, Vendor: 150KB, Routes: 150KB = 500KB total
    });
  });

  describe("Integration scenarios", () => {
    it("should track bundle across multiple builds", () => {
      // Build 1
      const build1 = createSnapshot("build1", [
        createChunk("main", "main", 100 * 1024),
        createChunk("vendor", "vendor", 50 * 1024),
      ]);

      // Build 2: main grows
      const build2 = createSnapshot("build2", [
        createChunk("main", "main", 120 * 1024),
        createChunk("vendor", "vendor", 50 * 1024),
      ]);

      // Build 3: split main
      const build3 = createSnapshot("build3", [
        createChunk("main", "main", 80 * 1024),
        createChunk("routes", "routes", 50 * 1024),
        createChunk("vendor", "vendor", 50 * 1024),
      ]);

      const analysis12 = compareBundleSnapshots(build2, build1);
      const analysis23 = compareBundleSnapshots(build3, build2);

      expect(analysis12.totalSizeDelta).toBe(20 * 1024);
      expect(analysis23.totalSizeDelta).toBe(10 * 1024); // 80 + 50 + 50 = 180 vs 120 + 50 = 170, delta = +10
    });

    it("should identify dependency optimization opportunities", () => {
      const previous = createSnapshot("build1", [
        createChunk("c1", "chunk1", 100 * 1024, ["dep1", "dep2", "dep3"]),
        createChunk("c2", "chunk2", 100 * 1024, ["dep1", "dep2", "dep4"]),
      ]);

      const current = createSnapshot("build2", [
        createChunk("c1", "chunk1", 100 * 1024, ["dep1", "dep2", "dep3"]),
        createChunk("c2", "chunk2", 100 * 1024, ["dep1", "dep2", "dep4"]),
        createChunk("vendor", "common-deps", 50 * 1024, ["dep1", "dep2"]),
      ]);

      const analysis = compareBundleSnapshots(current, previous);

      expect(analysis.addedChunks).toHaveLength(1);
      expect(analysis.addedChunks[0].name).toBe("common-deps");
    });
  });
});
