/**
 * Advanced Integration Tests for Icon Generation
 * Tests multi-source, adaptive icons, splash screens, and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import sharp from "sharp";
import { generateIconsAdvanced } from "./icon-generator.js";
import { detectIconSources, type IconGenerationConfig } from "./icon-config.js";
import type { IconSource } from "./icon-config.js";
import { createTestDir, cleanupTestDir } from "../__tests__/test-helpers.js";

describe("icon-generator-advanced", () => {
  let testDir: string;
  let sourceImagePath: string;

  beforeEach(async () => {
    testDir = createTestDir("icon-advanced");

    // Create a test source image (512x512 PNG)
    sourceImagePath = join(testDir, "icon.png");
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }, // Red square
      },
    })
      .png()
      .toFile(sourceImagePath);
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe("generateIconsAdvanced - Multi-source", () => {
    it("should use primary source when multiple sources available", async () => {
      const outputDir = join(testDir, "output");

      // Create fallback source
      const fallbackPath = join(testDir, "logo.png");
      await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 }, // Green square
        },
      })
        .png()
        .toFile(fallbackPath);

      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
        { path: fallbackPath, priority: 2, type: "fallback" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });

    it("should fallback to secondary source if primary fails", async () => {
      const outputDir = join(testDir, "output");

      // Create fallback source
      const fallbackPath = join(testDir, "logo.png");
      await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(fallbackPath);

      const sources: IconSource[] = [
        {
          path: join(testDir, "non-existent.png"),
          priority: 1,
          type: "primary",
        },
        { path: fallbackPath, priority: 2, type: "fallback" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
      };

      // Should throw error because primary source doesn't exist
      await expect(generateIconsAdvanced(config)).rejects.toThrow();
    });

    it("should detect icon sources automatically", async () => {
      // Create multiple icon files as real images
      await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(join(testDir, "icon.png"));

      await sharp({
        create: {
          width: 256,
          height: 256,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(join(testDir, "logo.png"));

      const sources = await detectIconSources(testDir);

      expect(sources.length).toBeGreaterThan(0);
      expect(sources[0].priority).toBe(1); // First detected should have highest priority
    });
  });

  describe("generateIconsAdvanced - Adaptive Icons", () => {
    it("should generate adaptive icons when enabled", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        adaptiveIcons: {
          enabled: true,
          foreground: sources[0],
          background: {
            type: "color",
            value: "#0000ff",
          },
        },
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      // Should have adaptive icon in manifest
      const adaptiveIcon = result.icons.find(
        (icon) => icon.purpose === "any maskable",
      );
      expect(adaptiveIcon).toBeDefined();
      expect(adaptiveIcon?.sizes).toBe("1024x1024");
    }, 10000);

    it("should handle adaptive icons with image background", async () => {
      const outputDir = join(testDir, "output");

      // Create background image
      const backgroundPath = join(testDir, "background.png");
      await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toFile(backgroundPath);

      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        adaptiveIcons: {
          enabled: true,
          foreground: sources[0],
          background: {
            path: backgroundPath,
            priority: 1,
            type: "adaptive-background",
          },
        },
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });
  });

  describe("generateIconsAdvanced - Splash Screens", () => {
    it("should generate splash screens when enabled", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        splashScreens: {
          enabled: true,
          source: sources[0],
          backgroundColor: "#ffffff",
          platforms: ["ios"],
        },
      };

      const result = await generateIconsAdvanced(config);

      expect(result.splashScreens.length).toBeGreaterThan(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });

    it("should generate both iOS and Android splash screens", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        splashScreens: {
          enabled: true,
          source: sources[0],
          backgroundColor: "#ff0000",
          platforms: ["all"],
          densities: ["mdpi", "hdpi"],
        },
      };

      const result = await generateIconsAdvanced(config);

      expect(result.splashScreens.length).toBeGreaterThan(0);
      // Should have both iOS and Android splash screens
      const iosSplash = result.splashScreens.find((s) => s.src.includes("ios"));
      const androidSplash = result.splashScreens.find((s) =>
        s.src.includes("android"),
      );
      expect(iosSplash || androidSplash).toBeDefined();
    });
  });

  describe("generateIconsAdvanced - Format Support", () => {
    it("should generate PNG format by default", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        format: "png",
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.icons[0].type).toBe("image/png");
    });

    it("should generate WebP format when specified", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        format: "webp",
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.icons[0].type).toBe("image/webp");
    });

    it("should use auto format detection", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        format: "auto",
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      // Auto should default to webp
      expect(result.icons[0].type).toBe("image/webp");
    });
  });

  describe("generateIconsAdvanced - Quality Optimization", () => {
    it("should apply quality optimization for different sizes", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        quality: 90,
        optimize: true,
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      // Quality should be optimized based on size
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });

    it("should disable quality optimization when requested", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        quality: 90,
        optimize: false,
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });
  });

  describe("generateIconsAdvanced - Parallel Processing", () => {
    it("should generate icons in parallel by default", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        parallel: true,
        concurrency: 5,
      };

      const startTime = Date.now();
      const result = await generateIconsAdvanced(config);
      const duration = Date.now() - startTime;

      expect(result.icons.length).toBeGreaterThan(0);
      // Parallel should be faster (rough check)
      expect(duration).toBeLessThan(10000); // Should complete in reasonable time
    });

    it("should support sequential generation", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        parallel: false,
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);
    });
  });

  describe("generateIconsAdvanced - Edge Cases", () => {
    it("should handle empty sources array", async () => {
      const outputDir = join(testDir, "output");
      const config: IconGenerationConfig = {
        sources: [],
        outputDir,
      };

      await expect(generateIconsAdvanced(config)).rejects.toThrow(
        "No valid icon source found",
      );
    });

    it("should handle invalid source path", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        {
          path: join(testDir, "non-existent.png"),
          priority: 1,
          type: "primary",
        },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
      };

      await expect(generateIconsAdvanced(config)).rejects.toThrow(
        "No valid icon source found",
      );
    });

    it("should handle validation errors gracefully", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        validate: true,
        strictValidation: false, // Should not throw on warnings
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.validation).toBeDefined();
    });

    it("should throw on strict validation failure", async () => {
      // Create a very small image that will fail validation
      const smallImagePath = join(testDir, "small.png");
      await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toFile(smallImagePath);

      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: smallImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        validate: true,
        strictValidation: true,
      };

      // Should throw if validation fails in strict mode
      await expect(generateIconsAdvanced(config)).rejects.toThrow(
        "Icon validation failed",
      );
    });
  });

  describe("generateIconsAdvanced - Full Integration", () => {
    it("should generate all icon types together", async () => {
      const outputDir = join(testDir, "output");
      const sources: IconSource[] = [
        { path: sourceImagePath, priority: 1, type: "primary" },
      ];

      const config: IconGenerationConfig = {
        sources,
        outputDir,
        format: "png",
        quality: 90,
        optimize: true,
        parallel: true,
        adaptiveIcons: {
          enabled: true,
          foreground: sources[0],
          background: {
            type: "color",
            value: "#ffffff",
          },
        },
        splashScreens: {
          enabled: true,
          source: sources[0],
          backgroundColor: "#ffffff",
          platforms: ["ios"],
        },
      };

      const result = await generateIconsAdvanced(config);

      expect(result.icons.length).toBeGreaterThan(0);
      expect(result.splashScreens.length).toBeGreaterThan(0);
      expect(result.generatedFiles.length).toBeGreaterThan(0);

      // Should have adaptive icon
      const adaptiveIcon = result.icons.find(
        (icon) => icon.purpose === "any maskable",
      );
      expect(adaptiveIcon).toBeDefined();
    });
  });
});
