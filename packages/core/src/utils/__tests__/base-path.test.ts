import { describe, it, expect } from "vitest";

/**
 * normalizeBasePath - tested from CLI init.ts
 * Normalizes basePath to ensure consistent format:
 * - "/" stays "/"
 * - Any other path becomes "/xxx/" (with trailing slash)
 */
function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath.trim().length === 0) {
    throw new Error("basePath cannot be empty");
  }

  basePath = basePath.trim();

  // Reject invalid patterns
  if (basePath.includes("http://") || basePath.includes("https://")) {
    throw new Error("basePath cannot be a full URL (http://, https://)");
  }
  if (basePath.includes("..")) {
    throw new Error("basePath cannot contain parent directory references (..)");
  }
  if (basePath.includes("//")) {
    throw new Error("basePath cannot contain double slashes (//)");
  }

  // If it's just "/", return as-is
  if (basePath === "/") {
    return "/";
  }

  // Ensure it starts with "/"
  if (!basePath.startsWith("/")) {
    throw new Error("basePath must start with /");
  }

  // Remove trailing slash if present, then add it back
  let normalized = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  // Ensure trailing slash for non-root paths
  normalized = normalized + "/";

  return normalized;
}

describe("normalizeBasePath", () => {
  describe("valid paths", () => {
    it("should keep root path as /", () => {
      expect(normalizeBasePath("/")).toBe("/");
    });

    it("should normalize /app to /app/", () => {
      expect(normalizeBasePath("/app")).toBe("/app/");
    });

    it("should normalize /app/ to /app/", () => {
      expect(normalizeBasePath("/app/")).toBe("/app/");
    });

    it("should normalize /app/pwa to /app/pwa/", () => {
      expect(normalizeBasePath("/app/pwa")).toBe("/app/pwa/");
    });

    it("should normalize /creativehub/ to /creativehub/", () => {
      expect(normalizeBasePath("/creativehub/")).toBe("/creativehub/");
    });

    it("should handle paths with multiple segments", () => {
      expect(normalizeBasePath("/api/v1/pwa")).toBe("/api/v1/pwa/");
    });

    it("should trim whitespace", () => {
      expect(normalizeBasePath("  /app  ")).toBe("/app/");
    });
  });

  describe("invalid paths", () => {
    it("should reject empty string", () => {
      expect(() => normalizeBasePath("")).toThrow("basePath cannot be empty");
    });

    it("should reject whitespace only", () => {
      expect(() => normalizeBasePath("   ")).toThrow(
        "basePath cannot be empty",
      );
    });

    it("should reject paths without leading slash", () => {
      expect(() => normalizeBasePath("app")).toThrow(
        "basePath must start with /",
      );
    });

    it("should reject http:// URLs", () => {
      expect(() => normalizeBasePath("http://example.com")).toThrow(
        "basePath cannot be a full URL (http://, https://)",
      );
    });

    it("should reject https:// URLs", () => {
      expect(() => normalizeBasePath("https://example.com/app")).toThrow(
        "basePath cannot be a full URL (http://, https://)",
      );
    });

    it("should reject parent directory references", () => {
      expect(() => normalizeBasePath("/../app")).toThrow(
        "basePath cannot contain parent directory references (..)",
      );
    });

    it("should reject paths with ..", () => {
      expect(() => normalizeBasePath("/app/..")).toThrow(
        "basePath cannot contain parent directory references (..)",
      );
    });

    it("should reject double slashes", () => {
      expect(() => normalizeBasePath("//app//")).toThrow(
        "basePath cannot contain double slashes (//)",
      );
    });

    it("should reject /etc/passwd type paths", () => {
      expect(() => normalizeBasePath("/../../../etc/passwd")).toThrow(
        "basePath cannot contain parent directory references (..)",
      );
    });
  });
});
