/**
 * Integration tests for Backend Factory
 * Tests detection, integration retrieval, and fallback behavior
 */

import { describe, it, expect, beforeEach } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getBackendFactory, resetBackendFactory } from "../factory.js";
import { LaravelIntegration } from "../laravel.js";
import { SymfonyIntegration } from "../symfony.js";
import { generateServiceWorkerFromBackend } from "../../generator/service-worker-generator.js";
import {
  createTestDir,
  cleanupTestDir,
  createLaravelFixture,
  createSymfonyFixture,
  createGenericFixture,
} from "../../__tests__/test-helpers.js";

describe("Backend Factory Integration Tests", () => {
  beforeEach(() => {
    resetBackendFactory();
  });

  describe("detectBackend()", () => {
    it("should detect Laravel project with high confidence", () => {
      const testDir = createTestDir("factory-laravel");
      createLaravelFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.detectBackend(testDir);

        expect(integration).not.toBeNull();
        expect(integration).toBeInstanceOf(LaravelIntegration);
        expect(integration?.id).toBe("laravel");
        expect(integration?.name).toBe("Laravel");

        const detectionResult = integration?.detect();
        expect(detectionResult?.detected).toBe(true);
        expect(detectionResult?.confidence).toBe("high");
        expect(detectionResult?.framework).toBe("laravel");
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should detect Symfony project with high confidence", () => {
      const testDir = createTestDir("factory-symfony");
      createSymfonyFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.detectBackend(testDir);

        expect(integration).not.toBeNull();
        expect(integration).toBeInstanceOf(SymfonyIntegration);
        expect(integration?.id).toBe("symfony");
        expect(integration?.name).toBe("Symfony");

        const detectionResult = integration?.detect();
        expect(detectionResult?.detected).toBe(true);
        expect(detectionResult?.confidence).toBe("high");
        expect(detectionResult?.framework).toBe("symfony");
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should return null for generic project", () => {
      const testDir = createTestDir("factory-generic");
      createGenericFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.detectBackend(testDir);

        expect(integration).toBeNull();
      } finally {
        cleanupTestDir(testDir);
      }
    });
  });

  describe("getIntegration()", () => {
    it("should return LaravelIntegration for laravel framework", () => {
      const testDir = createTestDir("factory-laravel");
      createLaravelFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.getIntegration("laravel", testDir);

        expect(integration).not.toBeNull();
        expect(integration).toBeInstanceOf(LaravelIntegration);
        expect(integration?.id).toBe("laravel");
        expect(integration?.name).toBe("Laravel");
        expect(integration?.framework).toBe("laravel");
        expect(integration?.language).toBe("php");
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should return SymfonyIntegration for symfony framework", () => {
      const testDir = createTestDir("factory-symfony");
      createSymfonyFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.getIntegration("symfony", testDir);

        expect(integration).not.toBeNull();
        expect(integration).toBeInstanceOf(SymfonyIntegration);
        expect(integration?.id).toBe("symfony");
        expect(integration?.name).toBe("Symfony");
        expect(integration?.framework).toBe("symfony");
        expect(integration?.language).toBe("php");
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should return null for unknown framework", () => {
      const testDir = createTestDir("factory-generic");
      createGenericFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.getIntegration("react", testDir);

        expect(integration).toBeNull();
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should return null for static framework", () => {
      const testDir = createTestDir("factory-generic");
      createGenericFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.getIntegration("static", testDir);

        expect(integration).toBeNull();
      } finally {
        cleanupTestDir(testDir);
      }
    });
  });

  describe("Service Worker Generation with Backends", () => {
    it("should generate service worker from Laravel integration", async () => {
      const testDir = createTestDir("factory-laravel");
      createLaravelFixture(testDir);
      const factory = getBackendFactory();
      const outputDir = join(testDir, "public");

      try {
        const integration = factory.getIntegration("laravel", testDir);
        expect(integration).not.toBeNull();

        const result = await generateServiceWorkerFromBackend(
          integration!,
          "spa",
          {
            projectPath: testDir,
            outputDir,
            globDirectory: outputDir,
          },
        );

        expect(result.swPath).toBeDefined();
        expect(existsSync(result.swPath)).toBe(true);
        expect(result.count).toBeGreaterThanOrEqual(0);
        expect(result.size).toBeGreaterThan(0);
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should generate service worker from Symfony integration", async () => {
      const testDir = createTestDir("factory-symfony");
      createSymfonyFixture(testDir);
      const factory = getBackendFactory();
      const outputDir = join(testDir, "public");

      try {
        const integration = factory.getIntegration("symfony", testDir);
        expect(integration).not.toBeNull();

        const result = await generateServiceWorkerFromBackend(
          integration!,
          "ssr",
          {
            projectPath: testDir,
            outputDir,
            globDirectory: outputDir,
          },
        );

        expect(result.swPath).toBeDefined();
        expect(existsSync(result.swPath)).toBe(true);
        expect(result.count).toBeGreaterThanOrEqual(0);
        expect(result.size).toBeGreaterThanOrEqual(0);
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should generate optimized config for Laravel with CSRF routes", () => {
      const testDir = createTestDir("factory-laravel");
      createLaravelFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.getIntegration("laravel", testDir);
        expect(integration).not.toBeNull();

        const config = integration!.generateServiceWorkerConfig();

        // Verify Laravel-specific optimizations
        expect(config.apiRoutes).toBeDefined();
        expect(config.apiRoutes.length).toBeGreaterThan(0);

        // Check for Laravel-specific routes
        const apiPatterns = integration!.getApiPatterns();
        expect(apiPatterns).toContain("/api/**");
        expect(apiPatterns).toContain("/graphql");

        // Verify secure routes
        const secureRoutes = integration!.getSecureRoutes();
        expect(secureRoutes.length).toBeGreaterThan(0);
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should generate optimized config for Symfony with API Platform routes", () => {
      const testDir = createTestDir("factory-symfony");
      createSymfonyFixture(testDir);
      const factory = getBackendFactory();

      try {
        const integration = factory.getIntegration("symfony", testDir);
        expect(integration).not.toBeNull();

        const config = integration!.generateServiceWorkerConfig();

        // Verify Symfony-specific optimizations
        expect(config.apiRoutes).toBeDefined();
        expect(config.apiRoutes.length).toBeGreaterThan(0);

        // Check for Symfony-specific routes
        const apiPatterns = integration!.getApiPatterns();
        expect(apiPatterns).toContain("/api/**");

        // Verify static asset patterns
        const staticPatterns = integration!.getStaticAssetPatterns();
        expect(staticPatterns.length).toBeGreaterThan(0);
      } finally {
        cleanupTestDir(testDir);
      }
    });
  });

  describe("Fallback Behavior", () => {
    it("should handle fallback when no backend detected", () => {
      const testDir = createTestDir("factory-generic");
      createGenericFixture(testDir);
      const factory = getBackendFactory();

      try {
        // Detection should return null
        const detected = factory.detectBackend(testDir);
        expect(detected).toBeNull();

        // getIntegration should return null for unknown frameworks
        const integration = factory.getIntegration("react", testDir);
        expect(integration).toBeNull();

        // This simulates the CLI fallback behavior
        // In real usage, CLI would fall back to generateServiceWorker()
      } finally {
        cleanupTestDir(testDir);
      }
    });

    it("should handle case where framework detected but integration not available", () => {
      const testDir = createTestDir("factory-generic");
      createGenericFixture(testDir);
      const factory = getBackendFactory();

      try {
        // For a framework that exists but project doesn't match
        const integration = factory.getIntegration("laravel", testDir);

        // Integration is created but detection will fail
        if (integration) {
          const detection = integration.detect();
          expect(detection.detected).toBe(false);
        }
      } finally {
        cleanupTestDir(testDir);
      }
    });
  });

  describe("Factory Singleton Behavior", () => {
    it("should return same factory instance on multiple calls", () => {
      const factory1 = getBackendFactory();
      const factory2 = getBackendFactory();

      expect(factory1).toBe(factory2);
    });

    it("should reset factory correctly", () => {
      const factory1 = getBackendFactory();
      resetBackendFactory();
      const factory2 = getBackendFactory();

      // Should be different instances after reset
      expect(factory1).not.toBe(factory2);
    });
  });
});
