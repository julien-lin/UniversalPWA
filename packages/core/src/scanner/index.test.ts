import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  scanProject,
  generateReport,
  validateProjectPath,
  type ScannerResult,
} from "./index.js";
import { createTestDir, cleanupTestDir } from "../__tests__/test-helpers.js";

describe("scanner orchestrator", () => {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  let warnSpy: ReturnType<typeof vi.spyOn> | null;
  let TEST_DIR: string;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    TEST_DIR = createTestDir("scanner");
  });

  afterEach(() => {
    warnSpy?.mockRestore();
    warnSpy = null;
    cleanupTestDir(TEST_DIR);
  });

  describe("scanProject", () => {
    it("should scan WordPress project", async () => {
      writeFileSync(join(TEST_DIR, "wp-config.php"), "<?php");
      mkdirSync(join(TEST_DIR, "wp-content"), { recursive: true });
      writeFileSync(join(TEST_DIR, "index.html"), "<html><body></body></html>");

      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      expect(result.framework.framework).toBe("wordpress");
      expect(result.framework.confidence).toBe("high");
      expect(result.assets).toBeDefined();
      expect(result.architecture).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.projectPath).toBe(TEST_DIR);
    });

    it("should use cache when valid (timestamp unchanged)", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), "<html><body></body></html>");

      const first = await scanProject({
        projectPath: TEST_DIR,
        useCache: true,
      });
      const second = await scanProject({
        projectPath: TEST_DIR,
        useCache: true,
      });

      expect(second.timestamp).toBe(first.timestamp);
      expect(second.projectPath).toBe(first.projectPath);
      expect(second.framework.framework).toBe(first.framework.framework);
    });

    it("should bypass cache when forceScan is true (timestamp changes)", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), "<html><body></body></html>");

      const first = await scanProject({
        projectPath: TEST_DIR,
        useCache: true,
      });
      const second = await scanProject({
        projectPath: TEST_DIR,
        useCache: true,
        forceScan: true,
      });

      expect(second.timestamp).not.toBe(first.timestamp);
    });

    it("should scan Symfony project", async () => {
      writeFileSync(
        join(TEST_DIR, "composer.json"),
        JSON.stringify({
          require: {
            "symfony/symfony": "^6.0",
          },
        }),
      );
      mkdirSync(join(TEST_DIR, "public"), { recursive: true });
      writeFileSync(join(TEST_DIR, "public", "index.php"), "<?php");

      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      expect(result.framework.framework).toBe("symfony");
      expect(result.framework.confidence).toBe("high");
      expect(result.assets).toBeDefined();
      expect(result.architecture).toBeDefined();
    });

    it("should scan React project", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({
          dependencies: {
            react: "^18.0.0",
          },
        }),
      );
      writeFileSync(
        join(TEST_DIR, "index.html"),
        '<html><body><div id="root"></div></body></html>',
      );
      mkdirSync(join(TEST_DIR, "src"), { recursive: true });
      writeFileSync(
        join(TEST_DIR, "src", "App.jsx"),
        "export const App = () => null",
      );

      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      expect(result.framework.framework).toBe("react");
      expect(result.framework.confidence).toBe("high");
      expect(result.assets.javascript.length).toBeGreaterThan(0);
      expect(result.architecture.architecture).toBe("spa");
    });

    it("should scan Next.js project", async () => {
      writeFileSync(
        join(TEST_DIR, "package.json"),
        JSON.stringify({
          dependencies: {
            next: "^15.0.0",
          },
        }),
      );
      mkdirSync(join(TEST_DIR, ".next"), { recursive: true });

      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      expect(result.framework.framework).toBe("nextjs");
      expect(result.framework.confidence).toBe("high");
      expect(result.architecture.architecture).toBe("ssr");
      expect(result.architecture.buildTool).toBeDefined();
    });

    it("should scan static project", async () => {
      writeFileSync(
        join(TEST_DIR, "index.html"),
        "<html><body><h1>Hello</h1></body></html>",
      );
      writeFileSync(join(TEST_DIR, "styles.css"), "body { margin: 0; }");

      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      expect(result.framework.framework).toBe("static");
      expect(result.framework.confidence).toBe("medium");
      expect(result.assets.css.length).toBeGreaterThan(0);
      expect(result.architecture.architecture).toBe("static");
    });

    it("should handle options to exclude assets", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), "<html><body></body></html>");

      const result = await scanProject({
        projectPath: TEST_DIR,
        includeAssets: false,
      });

      expect(result.assets.javascript).toEqual([]);
      expect(result.assets.css).toEqual([]);
      expect(result.architecture).toBeDefined();
    });

    it("should handle options to exclude architecture", async () => {
      writeFileSync(join(TEST_DIR, "index.html"), "<html><body></body></html>");

      const result = await scanProject({
        projectPath: TEST_DIR,
        includeArchitecture: false,
      });

      expect(result.assets).toBeDefined();
      expect(result.architecture.architecture).toBe("static");
      expect(result.architecture.indicators).toEqual([]);
    });

    it("should handle empty project", async () => {
      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      expect(result.framework.framework).toBeNull();
      expect(result.framework.confidence).toBe("low");
      expect(result.assets.javascript).toEqual([]);
      expect(result.architecture.architecture).toBe("static");
    });
  });

  describe("generateReport", () => {
    it("should generate valid JSON report", () => {
      const result: ScannerResult = {
        framework: {
          framework: "react",
          confidence: "high",
          confidenceScore: 95,
          indicators: ["package.json: react"],
          version: { major: 19, minor: 0, patch: 0, raw: "19.0.0" },
          configuration: {
            language: "typescript",
            cssInJs: [],
            stateManagement: [],
            buildTool: "vite",
          },
        },
        assets: {
          javascript: ["/path/to/app.js"],
          css: [],
          images: [],
          fonts: [],
          apiRoutes: [],
        },
        architecture: {
          architecture: "spa",
          buildTool: "vite",
          confidence: "high",
          indicators: ["HTML: SPA patterns detected"],
        },
        timestamp: "2024-01-01T00:00:00.000Z",
        projectPath: "/test",
      };

      const report = generateReport(result);
      const parsed = JSON.parse(report);

      expect(parsed.framework.framework).toBe("react");
      expect(parsed.assets.javascript).toHaveLength(1);
      expect(parsed.architecture.architecture).toBe("spa");
      expect(parsed.timestamp).toBe("2024-01-01T00:00:00.000Z");
    });
  });

  describe("validateProjectPath", () => {
    it("should validate existing path", () => {
      expect(validateProjectPath(TEST_DIR)).toBe(true);
    });

    it("should invalidate non-existing path", () => {
      expect(validateProjectPath(join(TEST_DIR, "non-existent"))).toBe(false);
    });

    it("should handle errors gracefully", () => {
      // Test avec un chemin invalide qui pourrait causer une erreur
      const invalidPath = "\0";
      const result = validateProjectPath(invalidPath);
      expect(typeof result).toBe("boolean");
    });
  });

  describe("Error handling", () => {
    it("should handle invalid project path gracefully", async () => {
      const invalidPath = join(TEST_DIR, "non-existent");

      // Scan should still work but return empty results
      const result = await scanProject({ projectPath: invalidPath });

      expect(result.framework.framework).toBeNull();
      expect(result.assets.javascript).toEqual([]);
    });

    it("should handle corrupted package.json", async () => {
      writeFileSync(join(TEST_DIR, "package.json"), "invalid json");
      writeFileSync(join(TEST_DIR, "index.html"), "<html><body></body></html>");

      const result = await scanProject({
        projectPath: TEST_DIR,
        useCache: false,
      });

      // Scanner should handle error and continue
      expect(result.framework).toBeDefined();
      expect(result.assets).toBeDefined();
      expect(result.architecture).toBeDefined();
    });
  });
});
