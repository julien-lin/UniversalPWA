import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateManifest,
  generateAndWriteManifest,
} from "./manifest-generator.js";
import { generateManifestId } from "./manifest-id-generator.js";
import { existsSync, readFileSync, rmSync, mkdirSync } from "fs";
import { join } from "path";

const TEST_DIR = join(process.cwd(), ".test-tmp-manifest-id");

describe("Manifest ID Field - Integration Tests", () => {
  describe("Collision Prevention - Real World Scenarios", () => {
    it("should generate different manifest IDs for same app with different basePaths", () => {
      const id1 = generateManifestId("My SaaS App", "/");
      const id2 = generateManifestId("My SaaS App", "/tenant1/");
      const id3 = generateManifestId("My SaaS App", "/tenant2/");

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);

      // Verify format
      expect(id1).toBe("my-saas-app");
      expect(id2).toMatch(/^my-saas-app-[a-z0-9]{8}$/);
      expect(id3).toMatch(/^my-saas-app-[a-z0-9]{8}$/);
    });

    it("should prevent collision risk in multi-tenant scenarios", () => {
      const tenants = [
        "acme-corp",
        "technovate",
        "innovate-labs",
        "startup-xyz",
      ];
      const ids = tenants.map((tenant) =>
        generateManifestId("Platform", `/customers/${tenant}/`),
      );

      // All IDs should be unique
      expect(new Set(ids).size).toBe(ids.length);

      // All should have same format: app-name-hash
      ids.forEach((id) => {
        expect(id).toMatch(/^platform-[a-z0-9]{8}$/);
      });
    });

    it("should generate deterministic IDs for same inputs", () => {
      const id1 = generateManifestId("App", "/staging/");
      const id2 = generateManifestId("App", "/staging/");
      const id3 = generateManifestId("App", "/staging/");

      expect(id1).toBe(id2);
      expect(id2).toBe(id3);
    });
  });

  describe("Manifest JSON with ID Field", () => {
    beforeEach(() => {
      try {
        if (existsSync(TEST_DIR)) {
          rmSync(TEST_DIR, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
      mkdirSync(TEST_DIR, { recursive: true });
    });

    afterEach(() => {
      try {
        if (existsSync(TEST_DIR)) {
          rmSync(TEST_DIR, { recursive: true, force: true });
        }
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should include ID in generated manifest JSON", () => {
      const id = generateManifestId("E-Commerce", "/shop/");
      const manifest = generateManifest({
        name: "E-Commerce Shop",
        shortName: "Shop",
        id,
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      });

      expect(manifest.id).toBe(id);
      expect(manifest.id).toMatch(/^e-commerce-[a-z0-9]{8}$/);
    });

    it("should write ID field to manifest.json file", () => {
      const appId = generateManifestId("API Portal", "/api/");
      const path = generateAndWriteManifest(
        {
          name: "API Portal",
          shortName: "API",
          id: appId,
          icons: [
            {
              src: "/icon.png",
              sizes: "192x192",
              type: "image/png",
            },
          ],
        },
        TEST_DIR,
      );

      expect(existsSync(path)).toBe(true);

      const content = JSON.parse(readFileSync(path, "utf-8"));
      expect(content.id).toBe(appId);
      expect(content.id).toMatch(/^api-portal-[a-z0-9]{8}$/);
    });

    it("should allow optional ID field (backward compatibility)", () => {
      const manifest = generateManifest({
        name: "Legacy App",
        shortName: "Legacy",
        // No ID provided
        icons: [
          {
            src: "/icon.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      });

      expect(manifest.id).toBeUndefined();
    });
  });

  describe("Production Deployment Scenarios", () => {
    it("should support multiple PWAs on same domain", () => {
      // Scenario: Admin panel and user app on same domain
      const adminId = generateManifestId("Admin Panel", "/admin/");
      const userAppId = generateManifestId("User Portal", "/app/");

      expect(adminId).not.toBe(userAppId);
    });

    it("should support versioned API endpoints", () => {
      const v1Api = generateManifestId("API", "/api/v1/");
      const v2Api = generateManifestId("API", "/api/v2/");
      const v3Api = generateManifestId("API", "/api/v3/");

      expect(new Set([v1Api, v2Api, v3Api]).size).toBe(3);
    });

    it("should support staging and production environments", () => {
      const appName = "E-Commerce";
      const stagingId = generateManifestId(appName, "/staging/");
      const prodId = generateManifestId(appName, "/prod/");

      expect(stagingId).not.toBe(prodId);
    });

    it("should support regional deployments", () => {
      const appName = "Global App";
      const usId = generateManifestId(appName, "/us/");
      const euId = generateManifestId(appName, "/eu/");
      const apId = generateManifestId(appName, "/ap/");

      expect(new Set([usId, euId, apId]).size).toBe(3);
    });
  });
});
