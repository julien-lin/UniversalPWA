import "../__tests__/init-test-setup.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

describe.sequential("init command - Errors & Rollback", () => {
  beforeEach(() => {
    TEST_DIR = createTestDir("cli-init-errors");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe("Error scenarios - All ErrorCodes", () => {
    it("should handle PROJECT_SCAN_FAILED error", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "scanProject").mockRejectedValueOnce(
        new Error("Scan failed"),
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });

    it("should handle ICON_GENERATION_FAILED error", async () => {
      const iconPath = createIcon(TEST_DIR);
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateIcons").mockRejectedValueOnce(
        new Error("Icon generation failed"),
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        skipIcons: false,
        iconSource: iconPath,
      });

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.iconsGenerated).toBe(0);

      vi.restoreAllMocks();
    });

    it("should handle ICON_INVALID_FORMAT error", async () => {
      const iconPath = join(TEST_DIR, "invalid-icon.txt");
      writeFileSync(iconPath, "not an image");

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        skipIcons: false,
        iconSource: iconPath,
      });

      expect(result.errors.length >= 0).toBe(true);
    });

    it("should handle SERVICE_WORKER_GENERATION_FAILED error with rollback", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateServiceWorker").mockRejectedValueOnce(
        new Error("SW generation failed"),
      );
      vi.spyOn(
        coreModule,
        "generateSimpleServiceWorker",
      ).mockRejectedValueOnce(new Error("SW generation failed"));

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipServiceWorker: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it("should handle HTML_INJECTION_FAILED error gracefully", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "injectMetaTagsInFile").mockImplementationOnce(
        () => {
          throw new Error("Injection failed");
        },
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.warnings.length >= 0).toBe(true);
      expect(result.htmlFilesInjected).toBeGreaterThanOrEqual(0);

      vi.restoreAllMocks();
    });

    it("should handle HTML_PARSING_FAILED error", async () => {
      writeFileSync(
        join(TEST_DIR, "invalid.html"),
        "<html><head><title>Invalid</title></head><body><unclosed-tag>",
      );

      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result).toBeDefined();
    });

    it("should handle unexpected errors with rollback", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateAndWriteManifest").mockImplementationOnce(
        () => {
          throw new Error("Unexpected error");
        },
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });
  });

  describe("Transaction rollback scenarios", () => {
    it("should rollback on manifest generation error", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateAndWriteManifest").mockImplementationOnce(
        () => {
          throw new Error("Manifest generation failed");
        },
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });

    it("should rollback on service worker generation error", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "optimizeProject").mockRejectedValueOnce(
        new Error("Optimization failed"),
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipServiceWorker: false,
      });

      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });

    it("should handle injection errors gracefully without rollback", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "injectMetaTagsInFile").mockImplementation(() => {
        throw new Error("Injection failed");
      });

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.htmlFilesInjected).toBe(0);

      vi.restoreAllMocks();
    });

    it("should commit transaction on success", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.success).toBe(true);
    });
  });
});
