import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { initCommand } from "./init.js";
import { createTestDir, cleanupTestDir } from "../../../core/src/__tests__/test-helpers.js";
import { createBasicHtml } from "../__tests__/init-helpers.js";

vi.mock("workbox-build", async (importOriginal) => {
  const { createWorkboxBuildMock } = await import(
    "../../../core/src/__tests__/mocks/workbox-build.js"
  );
  return await createWorkboxBuildMock(
    importOriginal as () => Promise<typeof import("workbox-build")>,
  );
});

let TEST_DIR: string;

beforeEach(() => {
  TEST_DIR = createTestDir("cli-init-basepath");
});

afterEach(() => {
  cleanupTestDir(TEST_DIR);
});

describe("initCommand - BasePath Support", () => {
  const baseInitCommand = {
    name: "Test App",
    shortName: "Test",
    skipIcons: true,
    skipServiceWorker: false,
    skipInjection: true,
  };

  describe("basePath normalization", () => {
    it("should use default basePath / when not specified", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/",
        outputDir: ".",
      });

      expect(result.success).toBe(true);
      expect(result.manifestPath).toBeDefined();

      if (result.manifestPath) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.start_url).toBe("/");
        expect(manifest.scope).toBe("/");
      }
    });

    it("should normalize /app to /app/", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/app",
        outputDir: ".",
      });

      expect(result.success).toBe(true);
      expect(result.manifestPath).toBeDefined();

      if (result.manifestPath) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.start_url).toBe("/app/");
        expect(manifest.scope).toBe("/app/");
      }
    });

    it("should preserve /app/ as /app/", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/app/",
        outputDir: ".",
      });

      expect(result.success).toBe(true);
      expect(result.manifestPath).toBeDefined();

      if (result.manifestPath) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.start_url).toBe("/app/");
        expect(manifest.scope).toBe("/app/");
      }
    });

    it("should normalize /creativehub/ to /creativehub/", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/creativehub/",
        outputDir: ".",
      });

      expect(result.success).toBe(true);
      expect(result.manifestPath).toBeDefined();

      if (result.manifestPath) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.start_url).toBe("/creativehub/");
        expect(manifest.scope).toBe("/creativehub/");
      }
    });

    it("should handle nested paths like /api/v1/pwa", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/api/v1/pwa",
        outputDir: ".",
      });

      expect(result.success).toBe(true);
      expect(result.manifestPath).toBeDefined();

      if (result.manifestPath) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));
        expect(manifest.start_url).toBe("/api/v1/pwa/");
        expect(manifest.scope).toBe("/api/v1/pwa/");
      }
    });
  });

  describe("basePath validation", () => {
    it("should reject invalid basePath: https://", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "https://example.com/app",
        outputDir: ".",
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Invalid basePath");
    });

    it("should reject invalid basePath: without leading /", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "app",
        outputDir: ".",
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Invalid basePath");
    });

    it("should reject invalid basePath: with parent refs", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/../app",
        outputDir: ".",
      });

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Invalid basePath");
    });
  });

  describe("manifest generation with basePath", () => {
    it("should generate valid manifest with basePath=/app/", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), createBasicHtml());

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        basePath: "/app/",
        outputDir: "public",
      });

      expect(result.success).toBe(true);
      expect(result.manifestPath).toBeDefined();

      if (result.manifestPath) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, "utf-8"));

        // Verify manifest structure
        expect(manifest).toHaveProperty("name");
        expect(manifest).toHaveProperty("short_name");
        expect(manifest).toHaveProperty("start_url", "/app/");
        expect(manifest).toHaveProperty("scope", "/app/");
        expect(manifest).toHaveProperty("display", "standalone");
        expect(manifest).toHaveProperty("icons");
        expect(Array.isArray(manifest.icons)).toBe(true);
      }
    });
  });
});
