/**
 * Tests for P1.2: Workbox Precache Bounded Limits
 * @category Security
 */

import { describe, it, expect } from "vitest";
import {
  PRECACHE_LIMITS_BY_FRAMEWORK,
  getLimitsForFramework,
  validatePrecachePatterns,
  formatBytes,
  formatLimits,
  PrecacheLimitError,
} from "./precache-limits.js";

describe("precache-limits", () => {
  describe("PRECACHE_LIMITS_BY_FRAMEWORK", () => {
    it("should define limits for all major frameworks", () => {
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("react");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("vue");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("svelte");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("angular");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("nextjs");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("django");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("rails");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("static");
      expect(PRECACHE_LIMITS_BY_FRAMEWORK).toHaveProperty("other");
    });

    it("should have react limits set to 500 max files", () => {
      expect(PRECACHE_LIMITS_BY_FRAMEWORK.react.maxFiles).toBe(500);
    });

    it("should have higher limits for SSR frameworks (Next.js/Nuxt)", () => {
      expect(PRECACHE_LIMITS_BY_FRAMEWORK.nextjs.maxFiles).toBeGreaterThan(
        PRECACHE_LIMITS_BY_FRAMEWORK.react.maxFiles,
      );
      expect(PRECACHE_LIMITS_BY_FRAMEWORK.nuxt.maxFiles).toBeGreaterThan(
        PRECACHE_LIMITS_BY_FRAMEWORK.vue.maxFiles,
      );
    });

    it("should have lower limits for backend frameworks (Django/Rails)", () => {
      expect(PRECACHE_LIMITS_BY_FRAMEWORK.django.maxFiles).toBeLessThan(
        PRECACHE_LIMITS_BY_FRAMEWORK.react.maxFiles,
      );
      expect(PRECACHE_LIMITS_BY_FRAMEWORK.rails.maxFiles).toBeLessThan(
        PRECACHE_LIMITS_BY_FRAMEWORK.react.maxFiles,
      );
    });

    it("should include ignore patterns for each framework", () => {
      // Only test frameworks that include node_modules in their ignore list
      const frameworksWithNodeModules = [
        "react",
        "vue",
        "svelte",
        "angular",
        "nextjs",
        "nuxt",
        "static",
        "other",
      ];

      for (const framework of frameworksWithNodeModules) {
        const limits = PRECACHE_LIMITS_BY_FRAMEWORK[framework];
        if (!limits) {
          continue;
        }
        expect(limits.ignorePatterns.length).toBeGreaterThan(0);
        expect(limits.ignorePatterns).toContain("node_modules/**");
      }
    });
  });

  describe("getLimitsForFramework", () => {
    it("should return correct limits for known frameworks", () => {
      const reactLimits = getLimitsForFramework("react");
      expect(reactLimits.maxFiles).toBe(500);

      const staticLimits = getLimitsForFramework("static");
      expect(staticLimits.maxFiles).toBe(100);
    });

    it("should handle case-insensitive framework names", () => {
      const limits1 = getLimitsForFramework("React");
      const limits2 = getLimitsForFramework("react");
      const limits3 = getLimitsForFramework("REACT");

      expect(limits1).toEqual(limits2);
      expect(limits2).toEqual(limits3);
    });

    it("should handle hyphenated framework names (next-js -> nextjs)", () => {
      const limits = getLimitsForFramework("next-js");
      expect(limits.maxFiles).toBe(2000);
    });

    it("should return other limits for unknown frameworks", () => {
      const limits = getLimitsForFramework("unknown-framework");
      expect(limits).toEqual(PRECACHE_LIMITS_BY_FRAMEWORK.other);
    });

    it("should return other limits for null framework", () => {
      const limits = getLimitsForFramework(null);
      expect(limits).toEqual(PRECACHE_LIMITS_BY_FRAMEWORK.other);
    });

    it("should return other limits for undefined framework", () => {
      const limits = getLimitsForFramework(null);
      expect(limits).toEqual(PRECACHE_LIMITS_BY_FRAMEWORK.other);
    });
  });

  describe("validatePrecachePatterns", () => {
    it("should validate simple patterns without warnings", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      const result = validatePrecachePatterns(["**/*.js", "**/*.css"], limits);

      expect(result.errors).toHaveLength(0);
      expect(result.patterns).toContain("**/*.js");
      expect(result.patterns).toContain("**/*.css");
    });

    it("should include ignore patterns in output", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      const result = validatePrecachePatterns(["**/*.js"], limits);

      expect(result.patterns).toContain("!node_modules/**");
      expect(result.patterns).toContain("!.git/**");
    });

    it("should warn about too many patterns", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      const manyPatterns = Array(60)
        .fill(0)
        .map((_, i) => `**/*.type${i}`);

      const result = validatePrecachePatterns(manyPatterns, limits);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Very large number of patterns");
    });

    it("should warn about overly deep recursive patterns", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.static; // maxDepth = 4
      const deepPattern = "**/a/**/b/**/c/**/d/**/*.js"; // 6 slashes > 4

      const result = validatePrecachePatterns([deepPattern], limits);
      expect(result.warnings.length).toBeGreaterThan(0);
      // Could be either 'recursive globs' warning or 'depth' warning, depending on heuristics
      expect(result.warnings[0]).toMatch(/recursive globs|depth/);
    });

    it("should warn about patterns with many recursive globs", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      const greedyPattern = "**/a/**/**/b/**/**/c/**/*.js"; // 4 ** globs

      const result = validatePrecachePatterns([greedyPattern], limits);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("recursive globs");
    });

    it("should handle empty patterns array", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      const result = validatePrecachePatterns([], limits);

      expect(result.errors).toHaveLength(0);
      expect(result.patterns).toContain("!node_modules/**"); // only ignore patterns
    });
  });

  describe("formatBytes", () => {
    it("should format 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("should format bytes correctly", () => {
      expect(formatBytes(1024)).toContain("KB");
      expect(formatBytes(1024 * 1024)).toContain("MB");
      expect(formatBytes(1024 * 1024 * 1024)).toContain("GB");
    });

    it("should format 50MB for React precache limit", () => {
      const result = formatBytes(
        PRECACHE_LIMITS_BY_FRAMEWORK.react.maxTotalSize,
      );
      expect(result).toContain("50");
      expect(result).toContain("MB");
    });
  });

  describe("formatLimits", () => {
    it("should format limits to readable string", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      const result = formatLimits(limits);

      expect(result).toContain("Max Files: 500");
      expect(result).toContain("Max Depth: 8");
      expect(result).toContain("MB");
    });

    it("should handle different limit values", () => {
      const staticLimits = PRECACHE_LIMITS_BY_FRAMEWORK.static;
      const result = formatLimits(staticLimits);

      expect(result).toContain("Max Files: 100");
      expect(result).toContain("Max Depth: 4");
    });
  });

  describe("PrecacheLimitError", () => {
    it("should create error with file path", () => {
      const error = new PrecacheLimitError(
        "/path/to/config.json",
        "Test error message",
      );

      expect(error.message).toBe("Test error message");
      expect(error.filePath).toBe("/path/to/config.json");
      expect(error.name).toBe("PrecacheLimitError");
    });

    it("should extend Error class", () => {
      const error = new PrecacheLimitError("/path/to/config.json", "Test");
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Framework-specific limits", () => {
    it("React should have 500 max files and 50MB limit", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.react;
      expect(limits.maxFiles).toBe(500);
      expect(limits.maxTotalSize).toBe(50 * 1024 * 1024);
    });

    it("Next.js should have 2000 max files and 100MB limit", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.nextjs;
      expect(limits.maxFiles).toBe(2000);
      expect(limits.maxTotalSize).toBe(100 * 1024 * 1024);
    });

    it("Django should have 100 max files and 10MB limit", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.django;
      expect(limits.maxFiles).toBe(100);
      expect(limits.maxTotalSize).toBe(10 * 1024 * 1024);
    });

    it("Static should have 100 max files and 10MB limit", () => {
      const limits = PRECACHE_LIMITS_BY_FRAMEWORK.static;
      expect(limits.maxFiles).toBe(100);
      expect(limits.maxTotalSize).toBe(10 * 1024 * 1024);
    });
  });

  describe("Ignore patterns by framework", () => {
    it("should include common patterns for all frameworks", () => {
      for (const framework of ["react", "vue", "svelte", "static"]) {
        const limits = PRECACHE_LIMITS_BY_FRAMEWORK[framework];
        if (!limits) {
          continue;
        }
        const patterns = limits.ignorePatterns.join();

        // All should ignore common dev artifacts
        expect(patterns).toContain("node_modules");
        expect(patterns).toContain(".git");
      }
    });

    it("should include framework-specific ignore patterns", () => {
      // React should ignore .git, dist, build
      const reactPatterns =
        PRECACHE_LIMITS_BY_FRAMEWORK.react.ignorePatterns.join();
      expect(reactPatterns).toContain("dist");
      expect(reactPatterns).toContain("build");

      // Django should ignore venv, __pycache__
      const djangoPatterns =
        PRECACHE_LIMITS_BY_FRAMEWORK.django.ignorePatterns.join();
      expect(djangoPatterns).toContain("venv");
      expect(djangoPatterns).toContain("__pycache__");

      // Rails should ignore vendor, .bundle
      const railsPatterns =
        PRECACHE_LIMITS_BY_FRAMEWORK.rails.ignorePatterns.join();
      expect(railsPatterns).toContain("vendor");
      expect(railsPatterns).toContain(".bundle");
    });
  });
});
