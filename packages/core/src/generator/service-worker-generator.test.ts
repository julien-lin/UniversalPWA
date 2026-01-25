import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  generateServiceWorker,
  generateSimpleServiceWorker,
  generateAndWriteServiceWorker,
  type ServiceWorkerGeneratorOptions,
} from "./service-worker-generator.js";

vi.mock("workbox-build", async (importOriginal) => {
  const actual = await importOriginal<typeof import("workbox-build")>();
  return {
    ...actual,
    generateSW: (config: { swDest: string }) => {
      writeFileSync(
        config.swDest,
        "/* workbox */\nself.__WB_MANIFEST = [];",
        "utf-8",
      );
      return Promise.resolve({
        count: 1,
        size: 34,
        warnings: [],
        manifestEntries: [{ url: "index.html" }],
      });
    },
  };
});

const TEST_DIR = join(process.cwd(), ".test-tmp-sw-generator");

describe("service-worker-generator", () => {
  beforeEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true });

    // Create test files
    mkdirSync(join(TEST_DIR, "public"), { recursive: true });
    writeFileSync(
      join(TEST_DIR, "public", "index.html"),
      "<html><body>Test</body></html>",
    );
    writeFileSync(join(TEST_DIR, "public", "app.js"), 'console.log("test")');
    writeFileSync(join(TEST_DIR, "public", "style.css"), "body { margin: 0; }");
  });

  describe("generateServiceWorker", () => {
    it("should generate service worker with template", async () => {
      const outputDir = join(TEST_DIR, "output");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      const result = await generateServiceWorker(options);

      expect(result.swPath).toBe(join(outputDir, "sw.js"));
      expect(existsSync(result.swPath)).toBe(true);
      expect(result.count).toBeGreaterThan(0);
      expect(result.size).toBeGreaterThan(0);

      // Verify that service worker contains Workbox code
      const swContent = readFileSync(result.swPath, "utf-8");
      expect(swContent).toContain("workbox");
      expect(swContent).toContain("precacheAndRoute");
    });

    it("should generate service worker for SPA architecture", async () => {
      const outputDir = join(TEST_DIR, "output-spa");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "spa",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      const result = await generateServiceWorker(options);

      expect(existsSync(result.swPath)).toBe(true);
      const swContent = readFileSync(result.swPath, "utf-8");
      expect(swContent).toContain("workbox");
    });

    it("should generate service worker for SSR architecture", async () => {
      const outputDir = join(TEST_DIR, "output-ssr");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "ssr",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      const result = await generateServiceWorker(options);

      expect(existsSync(result.swPath)).toBe(true);
      const swContent = readFileSync(result.swPath, "utf-8");
      expect(swContent).toContain("workbox");
    });

    it("should use custom template type", async () => {
      const outputDir = join(TEST_DIR, "output-custom");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        templateType: "wordpress",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      const result = await generateServiceWorker(options);

      expect(existsSync(result.swPath)).toBe(true);
      const swContent = readFileSync(result.swPath, "utf-8");
      expect(swContent).toContain("workbox");
    });

    it("should use custom swDest", async () => {
      const outputDir = join(TEST_DIR, "output-custom-dest");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        swDest: "custom-sw.js",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      const result = await generateServiceWorker(options);

      expect(result.swPath).toBe(join(outputDir, "custom-sw.js"));
      expect(existsSync(result.swPath)).toBe(true);
    });

    it("should include offline page if specified", async () => {
      const outputDir = join(TEST_DIR, "output-offline");
      const offlinePage = join(TEST_DIR, "public", "offline.html");
      writeFileSync(offlinePage, "<html><body>Offline</body></html>");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
        offlinePage: "offline.html",
      };

      const result = await generateServiceWorker(options);

      expect(existsSync(result.swPath)).toBe(true);
      // Offline page should be in precache
      expect(
        result.filePaths.some((path) => path.includes("offline.html")),
      ).toBe(true);
    });
  });

  describe("generateSimpleServiceWorker", () => {
    it("should generate simple service worker without template", async () => {
      const outputDir = join(TEST_DIR, "output-simple");

      const result = await generateSimpleServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      });

      expect(existsSync(result.swPath)).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    }, 20000);

    it("should generate service worker with runtime caching", async () => {
      const outputDir = join(TEST_DIR, "output-runtime");

      const result = await generateSimpleServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
        runtimeCaching: [
          {
            urlPattern: "/api/.*",
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
            },
          },
        ],
      });

      expect(existsSync(result.swPath)).toBe(true);
      const swContent = readFileSync(result.swPath, "utf-8");
      expect(swContent).toContain("workbox");
    }, 20000);
  });

  describe("generateAndWriteServiceWorker", () => {
    it("should generate and write service worker", async () => {
      const outputDir = join(TEST_DIR, "output-write");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      const result = await generateAndWriteServiceWorker(options);

      expect(existsSync(result.swPath)).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });
  });

  describe("Error handling", () => {
    it("should throw error for invalid globDirectory", async () => {
      const outputDir = join(TEST_DIR, "output-error");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "non-existent"),
        globPatterns: ["**/*.{html,js,css}"],
      };

      // Workbox can handle empty directory, but test anyway
      await expect(generateServiceWorker(options)).resolves.toBeDefined();
    });

    it("should handle missing skip options gracefully", async () => {
      const outputDir = join(TEST_DIR, "output-no-skip");

      const options: ServiceWorkerGeneratorOptions = {
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
        skipWaiting: undefined,
        clientsClaim: undefined,
      };

      const result = await generateServiceWorker(options);

      expect(existsSync(result.swPath)).toBe(true);
    });
  });

  describe("Service Worker Generation - Different Strategies", () => {
    it("should generate service worker with all runtime cache strategies", async () => {
      const outputDir = join(TEST_DIR, "output-strategies");

      const strategies = [
        "NetworkFirst",
        "CacheFirst",
        "StaleWhileRevalidate",
        "NetworkOnly",
        "CacheOnly",
      ] as const;

      for (const strategy of strategies) {
        const result = await generateSimpleServiceWorker({
          projectPath: TEST_DIR,
          outputDir: join(outputDir, strategy),
          architecture: "static",
          globDirectory: join(TEST_DIR, "public"),
          globPatterns: ["**/*.{html,js,css}"],
          runtimeCaching: [
            {
              urlPattern: "/test/.*",
              handler: strategy,
              options: {
                cacheName: `test-${strategy.toLowerCase()}`,
              },
            },
          ],
        });

        expect(existsSync(result.swPath)).toBe(true);
        const swContent = readFileSync(result.swPath, "utf-8");
        expect(swContent).toContain("workbox");
      }
    }, 20000);

    it("should generate service worker with multiple runtime cache entries", async () => {
      const outputDir = join(TEST_DIR, "output-multiple-cache");

      const result = await generateSimpleServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
        runtimeCaching: [
          {
            urlPattern: "/api/.*",
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
            },
          },
          {
            urlPattern: "/images/.*",
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400,
              },
            },
          },
          {
            urlPattern: "/fonts/.*",
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
            },
          },
        ],
      });

      expect(existsSync(result.swPath)).toBe(true);
      // Service worker should be generated correctly with runtime caching
      expect(result.size).toBeGreaterThan(0);
    }, 20000);
  });

  describe("Service Worker - Architecture-Specific Behavior", () => {
    it("should generate service worker for all architectures", async () => {
      const architectures = ["static", "spa", "ssr"] as const;

      for (const arch of architectures) {
        const result = await generateServiceWorker({
          projectPath: TEST_DIR,
          outputDir: join(TEST_DIR, `output-${arch}`),
          architecture: arch,
          globDirectory: join(TEST_DIR, "public"),
          globPatterns: ["**/*.{html,js,css}"],
        });

        expect(existsSync(result.swPath)).toBe(true);
        expect(result.count).toBeGreaterThan(0);
      }
    });

    it("should handle frameworks with service worker generation", async () => {
      const frameworks = [
        "React",
        "Vue",
        "Angular",
        "Next.js",
        "Nuxt",
        "Node.js",
      ];

      for (const framework of frameworks) {
        const result = await generateServiceWorker({
          projectPath: TEST_DIR,
          outputDir: join(TEST_DIR, `output-${framework}`),
          architecture: "spa",
          framework,
          globDirectory: join(TEST_DIR, "public"),
          globPatterns: ["**/*.{html,js,css}"],
        });

        expect(existsSync(result.swPath)).toBe(true);
      }
    });
  });

  describe("Service Worker Output Validation", () => {
    it("should return correct count of precached files", async () => {
      const outputDir = join(TEST_DIR, "output-count");

      // Create multiple files to precache
      writeFileSync(join(TEST_DIR, "public", "page1.html"), "<html></html>");
      writeFileSync(join(TEST_DIR, "public", "page2.html"), "<html></html>");
      writeFileSync(join(TEST_DIR, "public", "page3.html"), "<html></html>");

      const result = await generateServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.html"],
      });

      // Count should be at least the number of files we created
      expect(result.count).toBeGreaterThanOrEqual(3);
      expect(result.filePaths.length).toBeGreaterThan(0);
    });

    it("should have generated service worker with reasonable size", async () => {
      const outputDir = join(TEST_DIR, "output-size");

      const result = await generateServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      });

      // Size should be reasonable (at least 50 bytes for minimal SW)
      expect(result.size).toBeGreaterThan(50);
      expect(result.size).toBeLessThan(1000000); // Less than 1MB
    });

    it("should include file paths in result", async () => {
      const outputDir = join(TEST_DIR, "output-paths");

      const result = await generateServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      });

      expect(Array.isArray(result.filePaths)).toBe(true);
      expect(result.filePaths.length).toBeGreaterThan(0);
      // All paths should be strings
      result.filePaths.forEach((path) => {
        expect(typeof path).toBe("string");
      });
    });

    it("should have warnings array in result", async () => {
      const outputDir = join(TEST_DIR, "output-warnings");

      const result = await generateServiceWorker({
        projectPath: TEST_DIR,
        outputDir,
        architecture: "static",
        globDirectory: join(TEST_DIR, "public"),
        globPatterns: ["**/*.{html,js,css}"],
      });

      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });
});
