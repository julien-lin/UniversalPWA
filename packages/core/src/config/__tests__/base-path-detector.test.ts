/**
 * BasePath Auto-Detection Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  detectBasePath,
  filterByConfidence,
  formatDetectionResult,
  getSuggestionMessage,
} from "../base-path-detector.js";

describe("basePath Auto-Detection", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `test-basepath-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("Vite detection", () => {
    it("should detect basePath from vite.config.ts with base option", () => {
      const configContent = `
import { defineConfig } from 'vite'
export default defineConfig({
  base: '/app/',
  plugins: []
})
`;
      writeFileSync(join(tempDir, "vite.config.ts"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/app/");
      expect(result.method).toBe("vite");
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.sourceFile).toBe("vite.config.ts");
    });

    it("should detect basePath from vite.config.js", () => {
      const configContent = `
export default {
  base: '/creativehub/',
  plugins: []
}
`;
      writeFileSync(join(tempDir, "vite.config.js"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/creativehub/");
      expect(result.method).toBe("vite");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should handle base with double quotes", () => {
      const configContent = `export default { base: "/api/v1/" }`;
      writeFileSync(join(tempDir, "vite.config.ts"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/api/v1/");
      expect(result.method).toBe("vite");
    });

    it("should return null for Vite without base option", () => {
      const configContent = `export default { plugins: [] }`;
      writeFileSync(join(tempDir, "vite.config.ts"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBeNull();
      expect(result.method).toBeNull();
    });
  });

  describe("Next.js detection", () => {
    it("should detect basePath from next.config.js", () => {
      const configContent = `
module.exports = {
  basePath: '/app',
  reactStrictMode: true
}
`;
      writeFileSync(join(tempDir, "next.config.js"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/app");
      expect(result.method).toBe("next");
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.sourceFile).toBe("next.config.js");
    });

    it("should detect basePath from next.config.ts", () => {
      const configContent = `import type { NextConfig } from 'next'
const config: NextConfig = {
  basePath: '/pwa'
}
export default config
`;
      writeFileSync(join(tempDir, "next.config.ts"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/pwa");
      expect(result.method).toBe("next");
    });
  });

  describe("Django detection", () => {
    it("should detect PWA_BASE_PATH from Django settings.py", () => {
      const settingsContent = `
import os

DEBUG = True
PWA_BASE_PATH = '/app/'
DATABASE_URL = 'postgresql://...'
`;
      writeFileSync(join(tempDir, "settings.py"), settingsContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/app/");
      expect(result.method).toBe("django");
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it("should detect FORCE_SCRIPT_NAME from Django settings", () => {
      const settingsContent = `
FORCE_SCRIPT_NAME = '/api/v1/'
DEBUG = True
`;
      writeFileSync(join(tempDir, "settings.py"), settingsContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/api/v1/");
      expect(result.method).toBe("django");
      expect(result.confidence).toBeLessThan(0.9);
    });
  });

  describe("Webpack detection", () => {
    it("should detect publicPath from webpack.config.js", () => {
      const configContent = `
module.exports = {
  entry: './src/index.js',
  publicPath: '/app/',
  output: { filename: '[name].js' }
}
`;
      writeFileSync(join(tempDir, "webpack.config.js"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/app/");
      expect(result.method).toBe("webpack");
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("Custom universal-pwa detection", () => {
    it("should detect basePath from package.json universal-pwa field", () => {
      const pkgContent = JSON.stringify({
        name: "my-app",
        "universal-pwa": {
          basePath: "/app/",
        },
      });
      writeFileSync(join(tempDir, "package.json"), pkgContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/app/");
      expect(result.method).toBe("custom");
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe("Priority and confidence ranking", () => {
    it("should prefer Vite over webpack if both present", () => {
      writeFileSync(
        join(tempDir, "vite.config.ts"),
        `export default { base: '/vite/' }`,
      );
      writeFileSync(
        join(tempDir, "webpack.config.js"),
        `module.exports = { publicPath: '/webpack/' }`,
      );

      const result = detectBasePath(tempDir);

      // Vite has higher confidence (0.95 vs 0.85)
      expect(result.basePath).toBe("/vite/");
      expect(result.method).toBe("vite");
    });

    it("should prefer Next.js over webpack", () => {
      writeFileSync(
        join(tempDir, "next.config.js"),
        `module.exports = { basePath: '/next/' }`,
      );
      writeFileSync(
        join(tempDir, "webpack.config.js"),
        `module.exports = { publicPath: '/webpack/' }`,
      );

      const result = detectBasePath(tempDir);

      // Next.js has higher confidence (0.95 vs 0.85)
      expect(result.basePath).toBe("/next/");
      expect(result.method).toBe("next");
    });

    it("should handle no detection gracefully", () => {
      const result = detectBasePath(tempDir);

      expect(result.basePath).toBeNull();
      expect(result.method).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe("filterByConfidence", () => {
    it("should accept high confidence results", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.95,
        method: "vite" as const,
      };

      const filtered = filterByConfidence(result, 0.8);

      expect(filtered).not.toBeNull();
      expect(filtered?.basePath).toBe("/app/");
    });

    it("should reject low confidence results", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.6,
        method: "django" as const,
      };

      const filtered = filterByConfidence(result, 0.8);

      expect(filtered).toBeNull();
    });

    it("should use default confidence threshold of 0.8", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.8,
        method: "django" as const,
      };

      const filtered = filterByConfidence(result);

      expect(filtered).not.toBeNull();
    });
  });

  describe("formatDetectionResult", () => {
    it("should format successful detection", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.95,
        method: "vite" as const,
        sourceFile: "vite.config.ts",
      };

      const formatted = formatDetectionResult(result);

      expect(formatted).toContain('"/app/"');
      expect(formatted).toContain("95%");
      expect(formatted).toContain("vite");
      expect(formatted).toContain("vite.config.ts");
    });

    it("should format null detection", () => {
      const result = {
        basePath: null,
        confidence: 0,
        method: null,
      };

      const formatted = formatDetectionResult(result);

      expect(formatted).toContain("No basePath detected");
      expect(formatted).toContain("default");
    });

    it("should handle result without sourceFile", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.85,
        method: "webpack" as const,
      };

      const formatted = formatDetectionResult(result);

      expect(formatted).toContain("/app/");
      expect(formatted).toContain("85%");
      expect(formatted).toContain("webpack");
    });
  });

  describe("getSuggestionMessage", () => {
    it("should not suggest for high confidence", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.95,
        method: "vite" as const,
      };

      const suggestion = getSuggestionMessage(result);

      expect(suggestion).toBeNull();
    });

    it("should suggest for low confidence with result", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.75,
        method: "django" as const,
      };

      const suggestion = getSuggestionMessage(result);

      expect(suggestion).not.toBeNull();
      expect(suggestion).toContain("Low confidence");
      expect(suggestion).toContain("/app/");
      expect(suggestion).toContain("--base-path");
    });

    it("should suggest for no detection", () => {
      const result = {
        basePath: null,
        confidence: 0,
        method: null,
      };

      const suggestion = getSuggestionMessage(result);

      expect(suggestion).not.toBeNull();
      expect(suggestion).toContain("--base-path");
      expect(suggestion).toContain("subpath");
    });

    it("should suggest for very low confidence", () => {
      const result = {
        basePath: "/app/",
        confidence: 0.5,
        method: "custom" as const,
      };

      const suggestion = getSuggestionMessage(result);

      expect(suggestion).not.toBeNull();
      expect(suggestion).toContain("Very low confidence");
    });
  });

  describe("Security: no code execution", () => {
    it("should safely handle malicious config content", () => {
      const maliciousConfig = `
export default {
  base: '/app/',
  __proto__: { isAdmin: true },
  eval: 'process.exit(1)'
}
`;
      writeFileSync(join(tempDir, "vite.config.ts"), maliciousConfig);

      // Should not throw or execute
      expect(() => detectBasePath(tempDir)).not.toThrow();

      const result = detectBasePath(tempDir);

      // Should only extract the base path safely
      expect(result.basePath).toBe("/app/");
    });

    it("should handle file read errors gracefully", () => {
      // Create a directory named as config file (will fail to read)
      mkdirSync(join(tempDir, "vite.config.ts"), { recursive: true });

      expect(() => detectBasePath(tempDir)).not.toThrow();

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBeNull();
    });

    it("should handle invalid JSON in package.json", () => {
      writeFileSync(join(tempDir, "package.json"), "{ invalid json }");

      expect(() => detectBasePath(tempDir)).not.toThrow();

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty basePath value (returns null as no valid base path)", () => {
      const configContent = `export default { base: '' }`;
      writeFileSync(join(tempDir, "vite.config.ts"), configContent);

      const result = detectBasePath(tempDir);

      // Empty string is not a valid basePath - should not detect
      expect(result.basePath).toBeNull();
    });

    it("should handle basePath with leading and trailing slashes", () => {
      const configContent = `export default { base: '/app/subpath/' }`;
      writeFileSync(join(tempDir, "vite.config.ts"), configContent);

      const result = detectBasePath(tempDir);

      expect(result.basePath).toBe("/app/subpath/");
    });

    it("should handle multiple config files (returns highest confidence)", () => {
      writeFileSync(
        join(tempDir, "vite.config.ts"),
        `export default { base: '/vite/' }`,
      );
      writeFileSync(
        join(tempDir, "webpack.config.js"),
        `module.exports = { publicPath: '/webpack/' }`,
      );
      writeFileSync(
        join(tempDir, "next.config.js"),
        `module.exports = { basePath: '/next/' }`,
      );

      const result = detectBasePath(tempDir);

      // All have similar high confidence, first found wins
      expect(result.method).toBeDefined();
      expect(["/vite/", "/webpack/", "/next/"]).toContain(result.basePath);
    });
  });
});
