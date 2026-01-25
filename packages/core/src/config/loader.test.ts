/**
 * Tests for Configuration Loader
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadConfig,
  findConfigFile,
  ConfigLoadError,
  ConfigValidationError,
} from "./loader.js";

describe("config-loader", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `universal-pwa-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("findConfigFile", () => {
    it("should find JSON config file", () => {
      writeFileSync(
        join(testDir, "universal-pwa.config.json"),
        JSON.stringify({}),
      );

      const filePath = findConfigFile(testDir);

      expect(filePath).toBe(join(testDir, "universal-pwa.config.json"));
    });

    it("should find JS config file", () => {
      writeFileSync(
        join(testDir, "universal-pwa.config.js"),
        "module.exports = {}",
      );

      const filePath = findConfigFile(testDir);

      expect(filePath).toBe(join(testDir, "universal-pwa.config.js"));
    });

    it("should return null if no config file found", () => {
      const filePath = findConfigFile(testDir);

      expect(filePath).toBeNull();
    });

    it("should prioritize .ts over .js over .json", () => {
      writeFileSync(
        join(testDir, "universal-pwa.config.json"),
        JSON.stringify({}),
      );
      writeFileSync(
        join(testDir, "universal-pwa.config.js"),
        "module.exports = {}",
      );
      writeFileSync(
        join(testDir, "universal-pwa.config.ts"),
        "export default {}",
      );

      const filePath = findConfigFile(testDir);

      // Should find .ts first (first in the list)
      expect(filePath).toBe(join(testDir, "universal-pwa.config.ts"));
    });
  });

  describe("loadConfig - JSON", () => {
    it("should load valid JSON config", async () => {
      const configContent = {
        app: {
          name: "Test App",
          themeColor: "#000000",
        },
      };

      writeFileSync(
        join(testDir, "config.json"),
        JSON.stringify(configContent),
      );

      const result = await loadConfig(join(testDir, "config.json"));

      expect(result.config.app?.name).toBe("Test App");
      expect(result.config.app?.themeColor).toBe("#000000");
      expect(result.format).toBe("json");
      expect(result.validated).toBe(true);
    });

    it("should merge with defaults", async () => {
      writeFileSync(join(testDir, "config.json"), JSON.stringify({}));

      const result = await loadConfig(join(testDir, "config.json"));

      expect(result.config.app?.generate).toBe(true);
      expect(result.config.icons?.generate).toBe(true);
      expect(result.config.serviceWorker?.generate).toBe(true);
    });

    it("should throw error for invalid JSON", async () => {
      writeFileSync(join(testDir, "config.json"), "{ invalid json }");

      await expect(loadConfig(join(testDir, "config.json"))).rejects.toThrow(
        ConfigLoadError,
      );
    });
  });

  describe("loadConfig - JavaScript", () => {
    it("should load JS config with default export", async () => {
      writeFileSync(
        join(testDir, "config.js"),
        'module.exports = { app: { name: "Test App" } }',
      );

      const result = await loadConfig(join(testDir, "config.js"), { allowUnsafeConfig: true });

      expect(result.config.app?.name).toBe("Test App");
      expect(result.format).toBe("js");
    });

    it("should load JS config with different export formats", async () => {
      // Test with default export
      writeFileSync(
        join(testDir, "config.js"),
        'module.exports = { app: { name: "Test App Default" } }',
      );

      const result = await loadConfig(join(testDir, "config.js"), { allowUnsafeConfig: true });

      expect(result.config.app?.name).toBe("Test App Default");
    });

    it("should reject JS config by default (security)", async () => {
      writeFileSync(
        join(testDir, "config.js"),
        'module.exports = { app: { name: "Test App" } }',
      );

      await expect(loadConfig(join(testDir, "config.js"))).rejects.toThrow(
        "SECURITY REJECTION",
      );
    });

    it("should reject TS config by default (security)", async () => {
      writeFileSync(
        join(testDir, "config.ts"),
        'export default { app: { name: "Test App" } }',
      );

      await expect(loadConfig(join(testDir, "config.ts"))).rejects.toThrow(
        "SECURITY REJECTION",
      );
    });
  });

  describe("Security - Config size limits", () => {
    it("should reject config files larger than 1MB", async () => {
      // Create a 2MB JSON file
      const largeConfig = {
        app: {
          name: "Test",
          description: "x".repeat(2 * 1024 * 1024),
        },
      };

      writeFileSync(
        join(testDir, "large-config.json"),
        JSON.stringify(largeConfig),
      );

      await expect(
        loadConfig(join(testDir, "large-config.json")),
      ).rejects.toThrow("too large");
    });
  });


  describe("loadConfig - YAML", () => {
    it("should load simple YAML config", async () => {
      const yamlContent = `
app:
  name: Test App
  themeColor: "#000000"
icons:
  generate: true
`;

      writeFileSync(join(testDir, "config.yaml"), yamlContent);

      const result = await loadConfig(join(testDir, "config.yaml"));

      expect(result.config.app?.name).toBe("Test App");
      expect(result.config.app?.themeColor).toBe("#000000");
      expect(result.config.icons?.generate).toBe(true);
      expect(result.format).toBe("yaml");
    });

    it("should handle YAML with comments", async () => {
      const yamlContent = `
# This is a comment
app:
  name: Test App
  # Another comment
  themeColor: "#000000"
`;

      writeFileSync(join(testDir, "config.yaml"), yamlContent);

      const result = await loadConfig(join(testDir, "config.yaml"));

      expect(result.config.app?.name).toBe("Test App");
    });
  });

  describe("loadConfig - Validation", () => {
    it("should validate config by default", async () => {
      const configContent = {
        app: {
          name: "Test App",
        },
      };

      writeFileSync(
        join(testDir, "config.json"),
        JSON.stringify(configContent),
      );

      const result = await loadConfig(join(testDir, "config.json"));

      expect(result.validated).toBe(true);
    });

    it("should throw validation error in strict mode", async () => {
      const configContent = {
        app: {
          display: "invalid-display", // Invalid enum value
        },
      };

      writeFileSync(
        join(testDir, "config.json"),
        JSON.stringify(configContent),
      );

      await expect(
        loadConfig(join(testDir, "config.json"), { strict: true }),
      ).rejects.toThrow(ConfigValidationError);
    });

    it("should not throw in non-strict mode", async () => {
      const configContent = {
        app: {
          display: "invalid-display",
        },
      };

      writeFileSync(
        join(testDir, "config.json"),
        JSON.stringify(configContent),
      );

      // Should not throw, but validated should be false
      const result = await loadConfig(join(testDir, "config.json"), {
        strict: false,
      });

      expect(result.validated).toBe(false);
    });

    it("should skip validation if requested", async () => {
      writeFileSync(join(testDir, "config.json"), JSON.stringify({}));

      const result = await loadConfig(join(testDir, "config.json"), {
        validate: false,
      });

      expect(result.validated).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should throw ConfigLoadError for missing file", async () => {
      await expect(
        loadConfig(join(testDir, "nonexistent.json")),
      ).rejects.toThrow(ConfigLoadError);
    });

    it("should throw ConfigLoadError for unsupported format", async () => {
      writeFileSync(join(testDir, "config.xml"), "<config></config>");

      await expect(loadConfig(join(testDir, "config.xml"))).rejects.toThrow(
        ConfigLoadError,
      );
    });
  });
});
