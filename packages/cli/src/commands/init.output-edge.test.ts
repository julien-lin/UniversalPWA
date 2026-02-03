import "../__tests__/init-test-setup.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { initCommand } from "./init.js";
import { createTestDir, cleanupTestDir } from "../../../core/src/__tests__/test-helpers.js";
import {
  createBasicHtml,
  createIcon,
  runInitInTestDir,
} from "../__tests__/init-helpers.js";
import {
  createPublicDir,
  createManifest,
  getBaseInitCommand,
} from "../__tests__/init-test-setup.js";

let TEST_DIR: string;

describe.sequential("init command - Output & Edge", () => {
  beforeEach(() => {
    TEST_DIR = createTestDir("cli-init-output-edge");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
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
        ...getBaseInitCommand(TEST_DIR),
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
          ...getBaseInitCommand(TEST_DIR),
          outputDir: winPath,
        });

        expect(result).toBeDefined();
      }
    });

    it("should handle relative paths securely", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());
      createPublicDir(TEST_DIR);

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...getBaseInitCommand(TEST_DIR),
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
      createPublicDir(TEST_DIR);
      createManifest(TEST_DIR);

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });
  });

  describe("Output directory edge cases", () => {
    it("should handle outputDir same as projectPath", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        outputDir: ".",
      });

      expect(result).toBeDefined();
    });

    it("should create output directory if it does not exist", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
        outputDir: "new-output",
      });

      if (result.manifestPath) {
        expect(existsSync(result.manifestPath)).toBe(true);
        expect(existsSync(join(TEST_DIR, "new-output"))).toBe(true);
      }
    });
  });
});
