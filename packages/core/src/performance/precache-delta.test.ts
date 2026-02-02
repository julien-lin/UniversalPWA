/**
 * Tests for P2.1: Workbox Precache Delta
 * @category Performance
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  calculateFileRevision,
  generateCurrentManifest,
  loadPreviousManifest,
  saveCurrentManifest,
  computePrecacheDelta,
  formatPrecacheDelta,
  formatBytes,
  DEFAULT_DELTA_CONFIG,
  type PrecacheEntry,
  DeltaCacheError,
} from "./precache-delta.js";
import { createTestDir, cleanupTestDir } from "../__tests__/test-helpers.js";

describe("precache-delta", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir("precache-delta");
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe("calculateFileRevision", () => {
    it("should calculate consistent revision for file", () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "content");

      const rev1 = calculateFileRevision(filePath);
      const rev2 = calculateFileRevision(filePath);

      expect(rev1).toBe(rev2);
      expect(rev1).toMatch(/^[a-f0-9]{64}$/); // SHA256 = 64 chars
    });

    it("should detect file changes", () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "content1");
      const rev1 = calculateFileRevision(filePath);

      writeFileSync(filePath, "content2");
      const rev2 = calculateFileRevision(filePath);

      expect(rev1).not.toBe(rev2);
    });

    it("should support MD5 algorithm", () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "content");

      const rev = calculateFileRevision(filePath, "md5");
      expect(rev).toMatch(/^[a-f0-9]{32}$/); // MD5 = 32 chars
    });

    it("should handle missing file", () => {
      const rev = calculateFileRevision(join(testDir, "nonexistent.txt"));
      expect(rev).toBe("");
    });
  });

  describe("generateCurrentManifest", () => {
    it("should generate manifest with file revisions", () => {
      const filePath1 = join(testDir, "file1.js");
      const filePath2 = join(testDir, "file2.js");

      writeFileSync(filePath1, "console.log('1')");
      writeFileSync(filePath2, "console.log('2')");

      const files = [
        { url: "/file1.js", filePath: filePath1 },
        { url: "/file2.js", filePath: filePath2 },
      ];

      const manifest = generateCurrentManifest(files);

      expect(manifest).toHaveLength(2);
      expect(manifest[0]).toHaveProperty("url", "/file1.js");
      expect(manifest[0]).toHaveProperty("revision");
      expect(manifest[0]).toHaveProperty("size");
      expect(manifest[0]).toHaveProperty("mtime");
    });

    it("should skip missing files", () => {
      const files = [
        { url: "/file1.js", filePath: join(testDir, "file1.js") },
        { url: "/missing.js", filePath: join(testDir, "missing.js") },
      ];

      writeFileSync(files[0].filePath, "content");

      const manifest = generateCurrentManifest(files);
      expect(manifest).toHaveLength(1);
      expect(manifest[0].url).toBe("/file1.js");
    });

    it("should respect min file size", () => {
      const file1 = join(testDir, "small.txt");
      const file2 = join(testDir, "large.txt");

      writeFileSync(file1, "x"); // 1 byte
      writeFileSync(file2, "x".repeat(1000)); // 1000 bytes

      const files = [
        { url: "/small.txt", filePath: file1 },
        { url: "/large.txt", filePath: file2 },
      ];

      const manifest = generateCurrentManifest(files, {
        ...DEFAULT_DELTA_CONFIG,
        minFileSize: 100,
      });

      expect(manifest).toHaveLength(1);
      expect(manifest[0].url).toBe("/large.txt");
    });

    it("should respect max file size", () => {
      const file1 = join(testDir, "small.txt");
      const file2 = join(testDir, "large.txt");

      writeFileSync(file1, "x".repeat(100));
      writeFileSync(file2, "x".repeat(1000));

      const files = [
        { url: "/small.txt", filePath: file1 },
        { url: "/large.txt", filePath: file2 },
      ];

      const manifest = generateCurrentManifest(files, {
        ...DEFAULT_DELTA_CONFIG,
        maxFileSize: 500,
      });

      expect(manifest).toHaveLength(1);
      expect(manifest[0].url).toBe("/small.txt");
    });
  });

  describe("loadPreviousManifest", () => {
    it("should load manifest from file", () => {
      const manifestPath = join(testDir, "manifest.json");
      const manifest: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "abc123",
          size: 100,
          mtime: Date.now(),
        },
      ];

      writeFileSync(manifestPath, JSON.stringify(manifest));

      const loaded = loadPreviousManifest(manifestPath);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].url).toBe("/file.js");
    });

    it("should return empty array if file missing", () => {
      const loaded = loadPreviousManifest(join(testDir, "missing.json"));
      expect(loaded).toEqual([]);
    });

    it("should handle corrupted manifest", () => {
      const manifestPath = join(testDir, "manifest.json");
      writeFileSync(manifestPath, "invalid json");

      const loaded = loadPreviousManifest(manifestPath);
      expect(loaded).toEqual([]);
    });
  });

  describe("saveCurrentManifest", () => {
    it("should save manifest to file", () => {
      const manifestPath = join(testDir, "cache", "manifest.json");
      const manifest: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "abc123",
          size: 100,
          mtime: Date.now(),
        },
      ];

      saveCurrentManifest(manifestPath, manifest);

      expect(existsSync(manifestPath)).toBe(true);
      const loaded = loadPreviousManifest(manifestPath);
      expect(loaded).toHaveLength(1);
    });

    it("should preserve previous manifest", () => {
      const manifestPath = join(testDir, "manifest.json");
      const backupPath = `${manifestPath}.backup`;

      const manifest1: PrecacheEntry[] = [
        {
          url: "/file1.js",
          revision: "rev1",
          size: 100,
          mtime: Date.now(),
        },
      ];
      const manifest2: PrecacheEntry[] = [
        {
          url: "/file2.js",
          revision: "rev2",
          size: 200,
          mtime: Date.now(),
        },
      ];

      saveCurrentManifest(manifestPath, manifest1);
      saveCurrentManifest(manifestPath, manifest2, true);

      expect(existsSync(backupPath)).toBe(true);
      const backup = loadPreviousManifest(backupPath);
      expect(backup[0].url).toBe("/file1.js");
    });

    it("should not preserve previous if disabled", () => {
      const manifestPath = join(testDir, "manifest.json");
      const manifest1: PrecacheEntry[] = [
        {
          url: "/file1.js",
          revision: "rev1",
          size: 100,
          mtime: Date.now(),
        },
      ];

      saveCurrentManifest(manifestPath, manifest1);
      const manifest2: PrecacheEntry[] = [
        {
          url: "/file2.js",
          revision: "rev2",
          size: 200,
          mtime: Date.now(),
        },
      ];

      saveCurrentManifest(manifestPath, manifest2, false);

      expect(existsSync(`${manifestPath}.backup`)).toBe(false);
    });
  });

  describe("computePrecacheDelta", () => {
    it("should detect new files", () => {
      const current: PrecacheEntry[] = [
        {
          url: "/new.js",
          revision: "abc123",
          size: 100,
          mtime: Date.now(),
        },
      ];

      const result = computePrecacheDelta(current, []);

      expect(result.filesToCache).toHaveLength(1);
      expect(result.filesToRemove).toHaveLength(0);
      expect(result.deltas[0].changeType).toBe("added");
    });

    it("should detect modified files", () => {
      const previous: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "old_rev",
          size: 100,
          mtime: Date.now(),
        },
      ];
      const current: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "new_rev",
          size: 120,
          mtime: Date.now(),
        },
      ];

      const result = computePrecacheDelta(current, previous);

      expect(result.filesToCache).toHaveLength(1);
      expect(result.filesToCache[0].url).toBe("/file.js");
      expect(result.deltas[0].changeType).toBe("modified");
    });

    it("should detect deleted files", () => {
      const previous: PrecacheEntry[] = [
        {
          url: "/deleted.js",
          revision: "abc123",
          size: 100,
          mtime: Date.now(),
        },
      ];

      const result = computePrecacheDelta([], previous);

      expect(result.filesToRemove).toHaveLength(1);
      expect(result.filesToRemove[0]).toBe("/deleted.js");
      expect(result.deltas[0].changeType).toBe("deleted");
    });

    it("should preserve unchanged files in deltas", () => {
      const unchanged: PrecacheEntry = {
        url: "/unchanged.js",
        revision: "same_rev",
        size: 100,
        mtime: Date.now(),
      };

      const result = computePrecacheDelta([unchanged], [unchanged]);

      expect(result.filesToCache).toHaveLength(0);
      expect(result.deltas[0].changeType).toBe("unchanged");
      expect(result.deltas[0].hasChanged).toBe(false);
    });

    it("should calculate size savings", () => {
      const unchanged: PrecacheEntry = {
        url: "/file.js",
        revision: "same",
        size: 1000,
        mtime: Date.now(),
      };

      const result = computePrecacheDelta([unchanged], [unchanged]);

      expect(result.sizeSavings).toBe(1000);
    });

    it("should calculate size savings for multiple files", () => {
      const files: PrecacheEntry[] = [
        { url: "/a.js", revision: "rev_a", size: 100, mtime: Date.now() },
        { url: "/b.js", revision: "rev_b", size: 200, mtime: Date.now() },
        {
          url: "/c.js",
          revision: "rev_c_old",
          size: 300,
          mtime: Date.now(),
        },
      ];

      const current: PrecacheEntry[] = [
        { url: "/a.js", revision: "rev_a", size: 100, mtime: Date.now() },
        { url: "/b.js", revision: "rev_b", size: 200, mtime: Date.now() },
        {
          url: "/c.js",
          revision: "rev_c_new",
          size: 350,
          mtime: Date.now(),
        },
        { url: "/d.js", revision: "rev_d", size: 150, mtime: Date.now() },
      ];

      const result = computePrecacheDelta(current, files);

      // Savings from unchanged A (100) + unchanged B (200) + deleted C (300) = 600
      expect(result.sizeSavings).toBeGreaterThanOrEqual(600);
    });

    it("should populate metadata", () => {
      const manifest: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "abc123",
          size: 100,
          mtime: Date.now(),
        },
      ];

      const result = computePrecacheDelta(manifest, []);

      expect(result.metadata.timestamp).toBeTruthy();
      expect(result.metadata.totalFiles).toBe(1);
      expect(result.metadata.changedFiles).toBe(1);
      expect(result.metadata.unchangedFiles).toBe(0);
    });
  });

  describe("formatPrecacheDelta", () => {
    it("should format delta result for logging", () => {
      const result = computePrecacheDelta([], []);
      const formatted = formatPrecacheDelta(result);

      expect(formatted).toContain("Precache Delta Summary");
      expect(formatted).toContain("Total files");
      expect(formatted).toContain("Changed files");
      expect(formatted).toContain("Size savings");
    });

    it("should include file counts", () => {
      const files: PrecacheEntry[] = [
        { url: "/a.js", revision: "rev_a", size: 100, mtime: Date.now() },
        { url: "/b.js", revision: "rev_b", size: 200, mtime: Date.now() },
      ];

      const result = computePrecacheDelta(files, files);
      const formatted = formatPrecacheDelta(result);

      expect(formatted).toContain("Total files: 2");
      expect(formatted).toContain("Unchanged files: 2");
    });
  });

  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1024)).toContain("KB");
      expect(formatBytes(1024 * 1024)).toContain("MB");
      expect(formatBytes(1024 * 1024 * 1024)).toContain("GB");
    });

    it("should handle exact powers", () => {
      expect(formatBytes(1024 * 1024)).toMatch(/1\.00 MB/);
      expect(formatBytes(10 * 1024 * 1024)).toMatch(/10\.00 MB/);
    });
  });

  describe("DeltaCacheError", () => {
    it("should create error with operation name", () => {
      const error = new DeltaCacheError("compute_delta", "Test error");
      expect(error.message).toBe("Test error");
      expect(error.operation).toBe("compute_delta");
      expect(error.name).toBe("DeltaCacheError");
    });

    it("should extend Error class", () => {
      const error = new DeltaCacheError("test", "Test");
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Performance scenarios", () => {
    it("should handle large manifests efficiently", () => {
      const files: PrecacheEntry[] = [];
      for (let i = 0; i < 1000; i++) {
        files.push({
          url: `/file${i}.js`,
          revision: `rev${i}`,
          size: 100 + i,
          mtime: Date.now(),
        });
      }

      const start = Date.now();
      const result = computePrecacheDelta(files, []);
      const elapsed = Date.now() - start;

      expect(result.filesToCache).toHaveLength(1000);
      expect(elapsed).toBeLessThan(100); // Should be fast
    });

    it("should handle incremental changes efficiently", () => {
      // Build 1: 100 files
      const build1: PrecacheEntry[] = [];
      for (let i = 0; i < 100; i++) {
        build1.push({
          url: `/file${i}.js`,
          revision: `rev1`,
          size: 100,
          mtime: Date.now(),
        });
      }

      // Build 2: 99 unchanged + 1 new + 1 modified
      const build2: PrecacheEntry[] = build1.slice(0, 99);
      build2.push({
        ...build1[99],
        revision: "rev2_new", // Modified
      });
      build2.push({
        url: `/file100.js`,
        revision: "rev100",
        size: 100,
        mtime: Date.now(),
      });

      const result = computePrecacheDelta(build2, build1);

      expect(result.filesToCache).toHaveLength(2);
      // Size savings: 99 unchanged * 100 bytes = 9900
      // + 100 bytes from modified file = 10000
      expect(result.sizeSavings).toBeGreaterThanOrEqual(9900);
    });
  });

  describe("Integration scenarios", () => {
    it("should track file changes across builds", () => {
      const manifestPath = join(testDir, "manifest.json");

      // Build 1
      const build1: PrecacheEntry[] = [
        {
          url: "/index.js",
          revision: "v1",
          size: 1000,
          mtime: Date.now(),
        },
      ];
      saveCurrentManifest(manifestPath, build1);

      // Build 2: Modify one file, add new file
      const build2: PrecacheEntry[] = [
        {
          url: "/index.js",
          revision: "v2",
          size: 1100,
          mtime: Date.now(),
        },
        {
          url: "/utils.js",
          revision: "v1",
          size: 500,
          mtime: Date.now(),
        },
      ];

      const previous = loadPreviousManifest(manifestPath);
      const delta = computePrecacheDelta(build2, previous);

      expect(delta.filesToCache).toHaveLength(2);
      expect(
        delta.deltas.filter((d) => d.changeType === "modified"),
      ).toHaveLength(1);
    });

    it("should support manifest versioning", () => {
      const cacheDir = join(testDir, "cache");
      const v1Path = join(cacheDir, "manifest-v1.json");
      const v2Path = join(cacheDir, "manifest-v2.json");

      const manifest1: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "rev1",
          size: 100,
          mtime: Date.now(),
        },
      ];
      const manifest2: PrecacheEntry[] = [
        {
          url: "/file.js",
          revision: "rev2",
          size: 110,
          mtime: Date.now(),
        },
      ];

      saveCurrentManifest(v1Path, manifest1);
      saveCurrentManifest(v2Path, manifest2);

      expect(existsSync(v1Path)).toBe(true);
      expect(existsSync(v2Path)).toBe(true);

      const loaded1 = loadPreviousManifest(v1Path);
      const loaded2 = loadPreviousManifest(v2Path);

      expect(loaded1[0].revision).toBe("rev1");
      expect(loaded2[0].revision).toBe("rev2");
    });
  });
});
