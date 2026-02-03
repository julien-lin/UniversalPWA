import "../__tests__/init-test-setup.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, existsSync, readFileSync } from "node:fs";
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

describe.sequential("init command - Manifest & Service worker", () => {
  beforeEach(() => {
    TEST_DIR = createTestDir("cli-init-manifest-sw");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe("Manifest generation", () => {
    it("should warn if manifest cannot be generated without icons", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.warnings.some((w: string) => w.includes("icon"))).toBe(
        true,
      );
    });

    it("should generate manifest with placeholder icon when no icons provided", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(
        result.warnings.some((w: string) => w.includes("placeholder icon")),
      ).toBe(true);
      expect(result.manifestPath).toBeDefined();
    });

    it("should use themeColor and backgroundColor when provided", async () => {
      createIcon(TEST_DIR);
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name: "Test App",
        shortName: "Test",
        iconSource: join(TEST_DIR, "icon.png"),
        themeColor: "#ffffff",
        backgroundColor: "#000000",
        skipServiceWorker: true,
        skipInjection: true,
      });

      expect(result).toBeDefined();
      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.theme_color).toBeDefined();
        expect(manifest.background_color).toBeDefined();
      }
    });

    it("should normalize shortName correctly (max 12 characters)", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name: "Test App",
        shortName: "Very Long Name That Exceeds Twelve Characters",
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      });

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.short_name.length).toBeLessThanOrEqual(12);
      }
    });

    it("should handle empty shortName by using name fallback", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name: "Test App",
        shortName: "",
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      });

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.short_name).toBeDefined();
        expect(manifest.short_name.length).toBeGreaterThan(0);
      }
    });

    it("should handle manifest generation errors with rollback", async () => {
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
  });

  describe("Service worker generation", () => {
    it("should skip service worker if skipServiceWorker is true", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.serviceWorkerPath).toBeUndefined();
    });

    it("should handle service worker generation errors with rollback", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateServiceWorker").mockImplementationOnce(
        () => {
          throw new Error("Service worker generation failed");
        },
      );

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
  });

  describe("Service worker generation scenarios", () => {
    it("should generate service worker with adaptive cache strategies", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({ dependencies: { "apollo-client": "^3.0.0" } }),
      );
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "optimizeProject").mockResolvedValueOnce({
        cacheStrategies: [
          {
            urlPattern: "/graphql",
            handler: "NetworkFirst",
            options: { cacheName: "graphql-cache" },
          },
        ],
        manifestConfig: {},
        assetSuggestions: [],
        apiType: "GraphQL",
      } as Awaited<ReturnType<typeof coreModule.optimizeProject>>);
      const publicSwPath = join(TEST_DIR, "public", "sw.js");
      vi.spyOn(coreModule, "generateSimpleServiceWorker").mockResolvedValueOnce({
        swPath: publicSwPath,
        count: 1,
        size: 34,
        warnings: [],
        filePaths: [publicSwPath],
      });

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipServiceWorker: false,
        skipInjection: true,
      });

      expect(result.serviceWorkerPath).toBeDefined();
      vi.restoreAllMocks();
    });

    it("should generate service worker without adaptive strategies", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipServiceWorker: false,
        skipInjection: true,
      });

      expect(result.serviceWorkerPath).toBeDefined();
    });

    it("should handle Workbox errors gracefully", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateServiceWorker").mockRejectedValueOnce(
        new Error("Workbox error"),
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
  });
});
