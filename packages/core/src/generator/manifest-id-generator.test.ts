import { describe, it, expect } from "vitest";
import { generateManifestId } from "./manifest-id-generator.js";

describe("manifest-id-generator", () => {
  describe("generateManifestId", () => {
    it('should generate ID with default basePath "/"', () => {
      const id = generateManifestId("My App");
      expect(id).toBe("my-app");
    });

    it("should generate ID for root basePath explicitly", () => {
      const id = generateManifestId("My App", "/");
      expect(id).toBe("my-app");
    });

    it("should generate consistent ID for same basePath", () => {
      const id1 = generateManifestId("My App", "/app/");
      const id2 = generateManifestId("My App", "/app/");
      expect(id1).toBe(id2);
    });

    it("should generate different IDs for different basePaths", () => {
      const id1 = generateManifestId("My App", "/app/");
      const id2 = generateManifestId("My App", "/admin/");
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^my-app-[a-z0-9]{8}$/);
      expect(id2).toMatch(/^my-app-[a-z0-9]{8}$/);
    });

    it("should normalize basePath without trailing slash", () => {
      const id1 = generateManifestId("My App", "/app");
      const id2 = generateManifestId("My App", "/app/");
      expect(id1).toBe(id2);
    });

    it("should normalize nested basePaths", () => {
      const id = generateManifestId("My App", "/api/v1/pwa/");
      expect(id).toMatch(/^my-app-[a-z0-9]{8}$/);
      expect(id.length).toBeGreaterThan(7);
    });

    it("should handle uppercase app names", () => {
      const id = generateManifestId("MY APP", "/");
      expect(id).toBe("my-app");
    });

    it("should normalize special characters in app name", () => {
      const id = generateManifestId("My@App#2024!", "/");
      expect(id).toBe("my-app-2024");
    });

    it("should trim app name if too long", () => {
      const id = generateManifestId(
        "This is a very long app name that exceeds limit",
        "/",
      );
      expect(id.length).toBeLessThanOrEqual(20);
    });

    it("should handle spaces in app name", () => {
      const id = generateManifestId("My Great App", "/");
      expect(id).toBe("my-great-app");
    });

    it("should normalize special characters in basePath", () => {
      const id1 = generateManifestId("My App", "/app_v2/");
      const id2 = generateManifestId("My App", "/app-v2/");
      // Different normalization might produce different results
      expect(id1).toMatch(/^my-app-[a-z0-9]{8}$/);
      expect(id2).toMatch(/^my-app-[a-z0-9]{8}$/);
    });

    it("should handle deep nested paths", () => {
      const id = generateManifestId("Shop", "/stores/chicago/pwa/");
      expect(id).toMatch(/^shop-[a-z0-9]{8}$/);
    });

    it("should throw for empty app name", () => {
      expect(() => generateManifestId("", "/")).toThrow(
        "appName must be a non-empty string",
      );
    });

    it("should throw for non-string app name", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => generateManifestId(null as any, "/")).toThrow(
        "appName must be a non-empty string",
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => generateManifestId(undefined as any, "/")).toThrow(
        "appName must be a non-empty string",
      );
    });

    it("should throw for app name with only special characters", () => {
      expect(() => generateManifestId("@@##$$", "/")).toThrow(
        "appName must contain at least one alphanumeric character",
      );
    });

    it("should work with hyphenated app names", () => {
      const id = generateManifestId("my-awesome-app", "/");
      expect(id).toBe("my-awesome-app");
    });

    it("should work with numeric app names", () => {
      const id = generateManifestId("App2024", "/");
      expect(id).toBe("app2024");
    });

    it("should handle emoji in app name", () => {
      const id = generateManifestId("🚀 Rocket App", "/");
      expect(id).toMatch(/^rocket-app$|^rocket-app-[a-z0-9]{8}$/);
    });

    it("should ensure unique IDs for different app names", () => {
      const id1 = generateManifestId("App A", "/");
      const id2 = generateManifestId("App B", "/");
      expect(id1).not.toBe(id2);
    });

    it("should prevent collision for same app on different domains (simulated by basePath)", () => {
      // Simulating same app deployed on multiple subpaths
      const id1 = generateManifestId("MyPWA", "/instance1/");
      const id2 = generateManifestId("MyPWA", "/instance2/");
      const id3 = generateManifestId("MyPWA", "/instance3/");

      // All should be different
      expect(new Set([id1, id2, id3]).size).toBe(3);
    });

    it("should generate deterministic IDs", () => {
      // Multiple calls with same inputs should produce same output
      const calls = [
        generateManifestId("TestApp", "/prod/"),
        generateManifestId("TestApp", "/prod/"),
        generateManifestId("TestApp", "/prod/"),
      ];

      expect(new Set(calls).size).toBe(1); // All identical
    });

    it("should handle mixed case in basePath", () => {
      const id = generateManifestId("My App", "/App/PWA/");
      expect(id).toMatch(/^my-app-[a-z0-9]{8}$/);
    });

    it("should handle multiple slashes", () => {
      const id1 = generateManifestId("My App", "/app/");
      const id2 = generateManifestId("My App", "//app//");
      // After normalization, should produce same result
      expect(id1).toBe(id2);
    });
  });

  describe("ID Format and Validation", () => {
    it("should only contain alphanumeric and hyphens", () => {
      const id = generateManifestId("My@#$% App", "/test/");
      expect(id).toMatch(/^[a-z0-9-]+$/);
    });

    it("should be lowercase", () => {
      const id = generateManifestId("UPPERCASE", "/UPPERCASE/");
      expect(id).toBe(id.toLowerCase());
    });

    it("should not have leading/trailing hyphens", () => {
      const id = generateManifestId("---App---", "/");
      expect(id).not.toMatch(/^-/);
      expect(id).not.toMatch(/-$/);
    });

    it("should not have consecutive hyphens", () => {
      const id = generateManifestId("My---App", "/");
      expect(id).not.toContain("--");
    });
  });

  describe("Collision Prevention - Real World Scenarios", () => {
    it("should differentiate SaaS instances with same app name", () => {
      // SaaS scenario: same app deployed at different customer instances
      const customersIds = [
        generateManifestId("SaaS App", "/customer1/"),
        generateManifestId("SaaS App", "/customer2/"),
        generateManifestId("SaaS App", "/customer3/"),
      ];

      // All different
      expect(new Set(customersIds).size).toBe(3);
    });

    it("should support multi-tenant deployments", () => {
      // Multi-tenant: Same app, different organizations
      const tenantIds = [
        generateManifestId("Platform", "/org-acme/"),
        generateManifestId("Platform", "/org-techcorp/"),
        generateManifestId("Platform", "/org-innovate/"),
      ];

      expect(new Set(tenantIds).size).toBe(3);
    });

    it("should support staging/prod environments", () => {
      const stagingId = generateManifestId("E-Commerce", "/staging/");
      const prodId = generateManifestId("E-Commerce", "/prod/");

      expect(stagingId).not.toBe(prodId);
    });

    it("should support versioned APIs", () => {
      const v1Id = generateManifestId("API Portal", "/api/v1/");
      const v2Id = generateManifestId("API Portal", "/api/v2/");

      expect(v1Id).not.toBe(v2Id);
    });
  });
});
