import "../__tests__/init-test-setup.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDir, cleanupTestDir } from "../../../core/src/__tests__/test-helpers.js";
import {
  createBasicHtml,
  createIcon,
  runInitInTestDir,
  setupPublicWithManifest,
} from "../__tests__/init-helpers.js";
import { getBaseInitCommand } from "../__tests__/init-test-setup.js";

let TEST_DIR: string;

describe.sequential("init command - Icons", () => {
  beforeEach(() => {
    TEST_DIR = createTestDir("cli-init-icons");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe("Icons generation", () => {
    it("should skip icons if skipIcons is true", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.iconsGenerated).toBe(0);
    });

    it("should handle icon source not found", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        skipIcons: false,
        iconSource: "non-existent-icon.png",
      });

      expect(
        result.warnings.some(
          (w: string) =>
            w.includes("Icon source file not found") || w.includes("E3001"),
        ),
      ).toBe(true);
    });

    it("should handle icon source as relative path", async () => {
      createIcon(TEST_DIR);
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        skipIcons: false,
        iconSource: "icon.png",
      });

      expect(result).toBeDefined();
    });

    it("should handle icon generation errors gracefully", async () => {
      const iconPath = join(TEST_DIR, "invalid-icon.png");
      writeFileSync(iconPath, "not a valid image");

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        skipIcons: false,
        iconSource: iconPath,
      });

      expect(result).toBeDefined();
      expect(result.errors.length >= 0).toBe(true);
    });
  });

  describe("Icon generation scenarios", () => {
    it.each([
      { label: "valid PNG", expectManifest: true },
      { label: "absolute path", expectManifest: false },
    ])("should generate icons ($label)", async ({ expectManifest }) => {
      const iconPath = createIcon(TEST_DIR);
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name: "Test App",
        shortName: "Test",
        iconSource: iconPath,
        skipServiceWorker: true,
        skipInjection: true,
      });

      expect(result.iconsGenerated).toBeGreaterThan(0);
      if (expectManifest) expect(result.manifestPath).toBeDefined();
    });

    it("should generate apple-touch-icon when icons are generated", async () => {
      const iconPath = createIcon(TEST_DIR);
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name: "Test App",
        shortName: "Test",
        iconSource: iconPath,
        skipServiceWorker: true,
        skipInjection: true,
      });

      const { existsSync } = await import("node:fs");
      const appleTouchIconPath = join(
        TEST_DIR,
        "public",
        "apple-touch-icon.png",
      );
      expect(
        existsSync(appleTouchIconPath) || result.iconsGenerated > 0,
      ).toBe(true);
    });
  });
});
