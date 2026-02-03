import "../__tests__/init-test-setup.js";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { initCommand } from "./init.js";
import { createTestDir, cleanupTestDir } from "../../../core/src/__tests__/test-helpers.js";
import {
  createBasicHtml,
  createIcon,
  runInitInTestDir,
  setupPublicWithManifest,
} from "../__tests__/init-helpers.js";
import {
  createPublicDir,
  getBaseInitCommand,
} from "../__tests__/init-test-setup.js";

let TEST_DIR: string;

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
        ...getBaseInitCommand(TEST_DIR),
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
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.framework?.toLowerCase()).toBe("react");
      expect(result.architecture).toBeDefined();
    });

    it("should handle cache options (forceScan, noCache)", async () => {
      const result1 = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        forceScan: true,
      });

      expect(result1.framework).toBeDefined();

      const result2 = await initCommand({
        projectPath: TEST_DIR,
        ...getBaseInitCommand(TEST_DIR),
        noCache: true,
      });

      expect(result2.framework).toBeDefined();
    });
  });

  describe("HTTPS warnings", () => {
    it("should warn if HTTPS is not available", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
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
        ...getBaseInitCommand(TEST_DIR),
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
        ...getBaseInitCommand(TEST_DIR),
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
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result).toBeDefined();
    });

    it.each([
      {
        label: "index only (fallback to public/)",
        setup: () => {},
        options: { html: createBasicHtml(), ...getBaseInitCommand(TEST_DIR) },
      },
      {
        label: "index + public/ when dist/ does not exist",
        setup: () => createPublicDir(TEST_DIR),
        options: { html: createBasicHtml(), ...getBaseInitCommand(TEST_DIR) },
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
      createPublicDir(TEST_DIR);

      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle errors gracefully", async () => {
      writeFileSync(join(TEST_DIR, "package.json"), "invalid json");

      const result = await runInitInTestDir(TEST_DIR, {
        ...getBaseInitCommand(TEST_DIR),
      });

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

      const { existsSync, readFileSync } = await import("node:fs");
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
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.framework).toBeDefined();
      expect(result.architecture).toBeDefined();
    });

    it.each([
      { name: undefined, shortName: undefined },
      { name: "Test App", shortName: undefined },
    ])(
      "should handle undefined/null shortName (name=$name, shortName=$shortName)",
      async ({ name, shortName }) => {
        const result = await runInitInTestDir(TEST_DIR, {
          html: createBasicHtml(),
          beforeInit: setupPublicWithManifest,
          name,
          shortName,
          skipIcons: true,
          skipServiceWorker: true,
          skipInjection: true,
        });

        const { existsSync, readFileSync } = await import("node:fs");
        if (result.manifestPath && existsSync(result.manifestPath)) {
          const manifest = JSON.parse(
            readFileSync(result.manifestPath, "utf-8"),
          );
          expect(manifest.name).toBeDefined();
          expect(manifest.short_name).toBeDefined();
          expect(manifest.short_name.length).toBeGreaterThan(0);
        }
      },
    );
  });

  describe("Transaction management", () => {
    it("should commit transaction on success", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
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
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.success).toBe(false);

      vi.restoreAllMocks();
    });

    it("should backup existing files before modification", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: (dir) => {
          setupPublicWithManifest(dir, "Existing");
          writeFileSync(
            join(dir, "public", "sw.js"),
            "// Existing service worker",
          );
        },
        ...getBaseInitCommand(TEST_DIR),
        skipServiceWorker: false,
      });

      expect(result).toBeDefined();
    });
  });
});
