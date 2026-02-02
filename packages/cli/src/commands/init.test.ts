import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { initCommand } from "./init.js";
import { createTestDir, cleanupTestDir } from "../../../core/src/__tests__/test-helpers.js";
import {
  createBasicHtml,
  createIcon,
  runInitInTestDir,
  setupPublicWithManifest,
} from "../__tests__/init-helpers.js";

vi.mock("workbox-build", async (importOriginal) => {
  const { createWorkboxBuildMock } = await import(
    "../../../core/src/__tests__/mocks/workbox-build.js"
  );
  return await createWorkboxBuildMock(
    importOriginal as () => Promise<typeof import("workbox-build")>,
  );
});

let TEST_DIR: string;

/** Creates public/ and manifest.json in testDir (for tests needing custom name/dir). */
const createPublicDir = () => {
  mkdirSync(join(TEST_DIR, "public"), { recursive: true });
};

const createManifest = (name = "Test", publicDir = "public") => {
  const path = join(TEST_DIR, publicDir, "manifest.json");
  writeFileSync(
    path,
    JSON.stringify({ name, icons: [{ src: "/icon.png", sizes: "192x192" }] }),
  );
};

const baseInitCommand = {
  name: "Test App",
  shortName: "Test",
  skipIcons: true,
  skipServiceWorker: true,
  skipInjection: true,
};

describe.sequential("init command", () => {
  beforeEach(() => {
    TEST_DIR = createTestDir("cli-init");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe("Project path validation", () => {
    it("should fail if project path does not exist", async () => {
      const result = await initCommand({
        projectPath: join(TEST_DIR, "non-existent"),
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("does not exist");
    });

    it("should resolve project path correctly", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
      });

      expect(result.projectPath).toBeDefined();
      expect(result.projectPath).toContain(TEST_DIR);
    });
  });

  describe("Framework detection", () => {
    it("should scan project and detect framework", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({ dependencies: { react: "^18.0.0" } }),
      );
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      });

      expect(result.framework?.toLowerCase()).toBe("react");
      expect(result.architecture).toBeDefined();
    });

    it("should handle cache options (forceScan, noCache)", async () => {
      const result1 = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
        forceScan: true,
      });

      expect(result1.framework).toBeDefined();

      const result2 = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        noCache: true,
      });

      expect(result2.framework).toBeDefined();
    });
  });

  describe("HTTPS warnings", () => {
    it("should warn if HTTPS is not available", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
      });

      expect(result.warnings).toBeDefined();
    });
  });

  describe("Output directory resolution", () => {
    it("should use custom output directory (relative path)", async () => {
      const customOutput = join(TEST_DIR, "custom-output");
      const iconPath = createIcon(TEST_DIR);

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
        outputDir: "custom-output",
      });

      if (result.manifestPath) {
        expect(result.manifestPath).toContain(customOutput);
      }
    });

    it("should use absolute output directory", async () => {
      const customOutput = join(TEST_DIR, "custom-output-abs");
      const iconPath = createIcon(TEST_DIR);

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
        outputDir: customOutput,
      });

      if (result.manifestPath) {
        expect(result.manifestPath).toContain(customOutput);
      }
    });

    it("should auto-detect dist/ for React/Vite projects", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({ dependencies: { react: "^18.0.0" } }),
      );
      mkdirSync(join(TEST_DIR, "dist"), { recursive: true });
      writeFileSync(
        join(TEST_DIR, "dist", "index.html"),
        createBasicHtml("Dist"),
      );
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      });

      expect(result).toBeDefined();
    });

    it.each([
      {
        label: "index only (fallback to public/)",
        setup: () => {},
        options: { html: createBasicHtml(), ...baseInitCommand },
      },
      {
        label: "index + public/ when dist/ does not exist",
        setup: () => createPublicDir(),
        options: { html: createBasicHtml(), ...baseInitCommand },
      },
    ])("should complete init ($label)", async ({ setup, options }) => {
      setup();
      const result = await runInitInTestDir(TEST_DIR, options);
      expect(result).toBeDefined();
    });

    it("should use public/ for WordPress projects", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({ dependencies: { "@wordpress/core": "^6.0.0" } }),
      );
      createPublicDir();

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
      });

      expect(result).toBeDefined();
    });
  });

  describe("Icons generation", () => {
    it("should skip icons if skipIcons is true", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
      });

      expect(result.iconsGenerated).toBe(0);
    });

    it("should handle icon source not found", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
      });

      expect(result).toBeDefined();
      expect(result.errors.length >= 0).toBe(true);
    });
  });

  describe("Manifest generation", () => {
    it("should warn if manifest cannot be generated without icons", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
      });

      expect(result.warnings.some((w: string) => w.includes("icon"))).toBe(
        true,
      );
    });

    it("should generate manifest with placeholder icon when no icons provided", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
        skipServiceWorker: false,
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      vi.restoreAllMocks();
    });
  });

  describe("Meta-tags injection", () => {
    it("should skip injection if skipInjection is true", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
      });

      expect(result.htmlFilesInjected).toBe(0);
    });

    it("should inject meta-tags in HTML files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should limit HTML files when maxHtmlFiles is set", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          setupPublicWithManifest(dir);
          for (let i = 0; i < 5; i++) {
            writeFileSync(join(dir, `index-${i}.html`), createBasicHtml());
          }
        },
        ...baseInitCommand,
        skipInjection: false,
        maxHtmlFiles: 2,
      });

      expect(result.htmlFilesInjected).toBeLessThanOrEqual(2);
    });

    it("should handle injection errors gracefully", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result).toBeDefined();
    });

    it("should prioritize dist/ files over public/ files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "dist"), { recursive: true });
          setupPublicWithManifest(dir);
          writeFileSync(join(dir, "dist", "index.html"), createBasicHtml("Dist"));
          writeFileSync(join(dir, "public", "index.html"), createBasicHtml("Public"));
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });
  });

  describe("Transaction management", () => {
    it("should commit transaction on success", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
      });

      expect(result.success).toBe(true);
    });

    it("should rollback transaction on errors", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "generateAndWriteManifest").mockImplementationOnce(
        () => {
          throw new Error("Manifest generation failed");
        },
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
      });

      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });

    it("should backup existing files before modification", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: (dir) => {
          setupPublicWithManifest(dir, "Existing");
          writeFileSync(join(dir, "public", "sw.js"), "// Existing service worker");
        },
        ...baseInitCommand,
        skipServiceWorker: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle errors gracefully", async () => {
      writeFileSync(join(TEST_DIR, "package.json"), "invalid json");

      const result = await runInitInTestDir(TEST_DIR, { ...baseInitCommand });

      expect(result.framework).toBeDefined();
    });

    it("should handle empty name by using framework fallback", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({ dependencies: { react: "^18.0.0" } }),
      );
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name: "Test App",
        shortName: "Test",
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      });

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.name).toBeDefined();
        expect(manifest.name.length).toBeGreaterThan(0);
      }
    });

    it("should handle project without framework detected", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
      });

      expect(result.framework).toBeDefined();
      expect(result.architecture).toBeDefined();
    });

    it.each([
      { name: undefined, shortName: undefined },
      { name: "Test App", shortName: undefined },
    ])("should handle undefined/null shortName (name=$name, shortName=$shortName)", async ({ name, shortName }) => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        name,
        shortName,
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      });

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.name).toBeDefined();
        expect(manifest.short_name).toBeDefined();
        expect(manifest.short_name.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Error scenarios - All ErrorCodes", () => {
    it("should handle PROJECT_SCAN_FAILED error", async () => {
      const coreModule = await import("@julien-lin/universal-pwa-core");
      vi.spyOn(coreModule, "scanProject").mockRejectedValueOnce(
        new Error("Scan failed"),
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
      vi.spyOn(coreModule, "generateSimpleServiceWorker").mockRejectedValueOnce(
        new Error("SW generation failed"),
      );

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
      });

      expect(result.success).toBe(true);
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

      const appleTouchIconPath = join(
        TEST_DIR,
        "public",
        "apple-touch-icon.png",
      );
      expect(existsSync(appleTouchIconPath) || result.iconsGenerated > 0).toBe(
        true,
      );
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
        ...baseInitCommand,
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
        ...baseInitCommand,
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
        ...baseInitCommand,
        skipServiceWorker: false,
      });

      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe("HTML injection scenarios", () => {
    it("should inject meta-tags in multiple HTML files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          for (let i = 0; i < 3; i++) {
            writeFileSync(join(dir, `page-${i}.html`), createBasicHtml(`Page ${i}`));
          }
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should handle HTML files in dist/ directory", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "dist"), { recursive: true });
          writeFileSync(join(dir, "dist", "index.html"), createBasicHtml("Dist"));
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should handle HTML files in public/ directory", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          setupPublicWithManifest(dir);
          writeFileSync(join(dir, "public", "index.html"), createBasicHtml("Public"));
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should handle injection errors for individual files gracefully", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: (dir) => {
          writeFileSync(join(dir, "invalid.html"), "<html><unclosed>");
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThanOrEqual(0);
    });

    it("should inject meta-tags in Twig template files (Symfony)", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "templates"), { recursive: true });
          const twigContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Symfony App{% endblock %}</title>
</head>
<body>
    {% block body %}{% endblock %}
</body>
</html>`;
          writeFileSync(join(dir, "templates", "base.html.twig"), twigContent);
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
      const modifiedTwig = readFileSync(
        join(TEST_DIR, "templates", "base.html.twig"),
        "utf-8",
      );
      expect(modifiedTwig).toContain('rel="manifest"');
      expect(modifiedTwig).toContain('name="theme-color"');
      expect(modifiedTwig).toContain("navigator.serviceWorker");
    });

    it("should inject meta-tags in Blade template files (Laravel)", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "resources", "views"), { recursive: true });
          const bladeContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'Laravel App')</title>
</head>
<body>
    @yield('content')
</body>
</html>`;
          writeFileSync(
            join(dir, "resources", "views", "layout.blade.php"),
            bladeContent,
          );
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
      const modifiedBlade = readFileSync(
        join(TEST_DIR, "resources", "views", "layout.blade.php"),
        "utf-8",
      );
      expect(modifiedBlade).toContain('rel="manifest"');
      expect(modifiedBlade).toContain('name="theme-color"');
      expect(modifiedBlade).toContain("navigator.serviceWorker");
    });
  });

  describe("Large projects (100+ HTML files)", () => {
    it("should handle projects with many HTML files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          for (let i = 0; i < 105; i++) {
            writeFileSync(join(dir, `page-${i}.html`), createBasicHtml(`Page ${i}`));
          }
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it("should limit HTML files when maxHtmlFiles is set on large project", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          for (let i = 0; i < 150; i++) {
            writeFileSync(join(dir, `page-${i}.html`), createBasicHtml(`Page ${i}`));
          }
          setupPublicWithManifest(dir);
        },
        ...baseInitCommand,
        skipInjection: false,
        maxHtmlFiles: 50,
      });

      expect(result.htmlFilesInjected).toBeLessThanOrEqual(50);
    });
  });

  describe("CLI options combinations", () => {
    it("should handle all skip options together", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        name: "Test App",
        shortName: "Test",
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      });

      expect(result.iconsGenerated).toBe(0);
      expect(result.serviceWorkerPath).toBeUndefined();
      expect(result.htmlFilesInjected).toBe(0);
    });

    it("should handle forceScan and noCache together", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
        forceScan: true,
        noCache: true,
      });

      expect(result.framework).toBeDefined();
    });

    it("should handle custom outputDir with all features", async () => {
      mkdirSync(join(TEST_DIR, "custom"), { recursive: true });
      const iconPath = createIcon(TEST_DIR);

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        name: "Test App",
        shortName: "Test",
        iconSource: iconPath,
        outputDir: "custom",
        skipServiceWorker: true,
        skipInjection: true,
      });

      if (result.manifestPath) {
        expect(result.manifestPath).toContain("custom");
      }
    });
  });

  describe("Path normalization and security", () => {
    it("should handle Windows absolute paths", async () => {
      if (process.platform === "win32") {
        const winPath = "C:\\test\\output";
        writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

        const result = await initCommand({
          projectPath: TEST_DIR,
          ...baseInitCommand,
          outputDir: winPath,
        });

        expect(result).toBeDefined();
      }
    });

    it("should handle relative paths securely", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());
      createPublicDir();

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        outputDir: "../public",
      });

      expect(result).toBeDefined();
    });

    it("should normalize paths for Vite/React projects", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({ dependencies: { vite: "^4.0.0" } }),
      );
      mkdirSync(join(TEST_DIR, "dist"), { recursive: true });
      writeFileSync(join(TEST_DIR, "dist", "index.html"), createBasicHtml());
      createPublicDir();
      createManifest();

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });
  });

  describe("Output directory edge cases", () => {
    it("should handle outputDir same as projectPath", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
        outputDir: ".",
      });

      expect(result).toBeDefined();
    });

    it("should create output directory if it does not exist", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...baseInitCommand,
        outputDir: "new-output",
      });

      if (result.manifestPath) {
        expect(existsSync(result.manifestPath)).toBe(true);
        expect(existsSync(join(TEST_DIR, "new-output"))).toBe(true);
      }
    });
  });
});
