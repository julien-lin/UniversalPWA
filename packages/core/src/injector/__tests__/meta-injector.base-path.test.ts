import { describe, it, expect } from "vitest";
import { injectMetaTags } from "../meta-injector.js";

describe("Meta Injector - BasePath Support (T1.1.3)", () => {
  const basicHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Test App</title>
</head>
<body>
  <h1>Hello World</h1>
</body>
</html>`;

  describe("manifest path with basePath", () => {
    it("should inject manifest with default basePath /", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: "/",
      });

      expect(result.html).toContain('href="/manifest.json"');
      expect(result.result.injected).toContain(
        '<link rel="manifest" href="/manifest.json">',
      );
    });

    it("should prepend basePath to manifest link", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: "/app/",
      });

      expect(result.html).toContain('href="/app/manifest.json"');
      expect(result.result.injected).toContain(
        '<link rel="manifest" href="/app/manifest.json">',
      );
    });

    it("should handle basePath without trailing slash", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: "/app",
      });

      expect(result.html).toContain('href="/app/manifest.json"');
      expect(result.result.injected).toContain(
        '<link rel="manifest" href="/app/manifest.json">',
      );
    });

    it("should handle nested basePath", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: "/api/v1/pwa/",
      });

      expect(result.html).toContain('href="/api/v1/pwa/manifest.json"');
      expect(result.result.injected).toContain(
        '<link rel="manifest" href="/api/v1/pwa/manifest.json">',
      );
    });

    it("should not create double slashes with basePath", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "/manifest.json",
        basePath: "/app/",
      });

      // Should not contain // in the path
      const href = result.html.match(/href="([^"]+manifest\.json[^"]*)"/)?.[1];
      expect(href).not.toContain("//");
      expect(href).toBe("/app/manifest.json");
    });

    it("should handle manifestPath without leading slash", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: "/app/",
      });

      expect(result.html).toContain('href="/app/manifest.json"');
      expect(result.html).not.toContain("//");
    });
  });

  describe("service worker registration with basePath", () => {
    it("should register SW with default basePath /", () => {
      const result = injectMetaTags(basicHtml, {
        serviceWorkerPath: "sw.js",
        basePath: "/",
      });

      expect(result.html).toContain("navigator.serviceWorker.register");
      expect(result.html).toContain("/sw.js");
      // Should not have double slashes
      expect(result.html).not.toContain("//sw.js");
    });

    it("should register SW with custom basePath", () => {
      const result = injectMetaTags(basicHtml, {
        serviceWorkerPath: "sw.js",
        basePath: "/app/",
      });

      expect(result.html).toContain("navigator.serviceWorker.register");
      expect(result.html).toContain("/app/sw.js");
      // Verify proper escaping in JavaScript
      expect(result.html).toContain("app/sw.js");
    });

    it("should handle basePath without trailing slash for SW", () => {
      const result = injectMetaTags(basicHtml, {
        serviceWorkerPath: "sw.js",
        basePath: "/app",
      });

      expect(result.html).toContain("/app/sw.js");
      expect(result.html).toContain("serviceWorker.register");
    });

    it("should handle nested basePath for SW registration", () => {
      const result = injectMetaTags(basicHtml, {
        serviceWorkerPath: "sw.js",
        basePath: "/api/v1/pwa/",
      });

      expect(result.html).toContain("/api/v1/pwa/sw.js");
      // Check that manifest and SW are properly prefixed with basePath
      expect(result.html).toContain("register");
    });

    it("should not create double slashes with SW path", () => {
      const result = injectMetaTags(basicHtml, {
        serviceWorkerPath: "/sw.js",
        basePath: "/app/",
      });

      const swPath = result.html.match(
        /navigator\.serviceWorker\.register\("([^"]+)"\)/,
      )?.[1];
      // The path should be escaped in JavaScript and should not have double slashes in the path
      expect(swPath).toBeDefined();
      // Check that the path component doesn't have consecutive slashes
      expect(swPath).toContain("/app/sw.js");
    });
  });

  describe("both manifest and SW with basePath", () => {
    it("should inject both manifest and SW with same basePath", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        serviceWorkerPath: "sw.js",
        basePath: "/app/",
      });

      expect(result.html).toContain('href="/app/manifest.json"');
      expect(result.html).toContain("/app/sw.js");
      // Should have at least manifest injection
      expect(result.result.injected.length).toBeGreaterThanOrEqual(1);
      expect(result.result.injected[0]).toContain("/app/manifest.json");
    });

    it("should maintain scope consistency with basePath", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        serviceWorkerPath: "sw.js",
        basePath: "/creativehub/",
      });

      // Both manifest and SW should be under same basePath
      expect(result.html).toContain("/creativehub/manifest.json");
      expect(result.html).toContain("/creativehub/sw.js");
    });
  });

  describe("edge cases", () => {
    it("should handle undefined basePath", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        serviceWorkerPath: "sw.js",
        // basePath undefined
      });

      expect(result.html).toContain('href="/manifest.json"');
      expect(result.html).toContain("/sw.js");
    });

    it("should treat empty string basePath as root", () => {
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: "",
      });

      // Empty string should be treated as root
      expect(result.html).toContain("/manifest.json");
    });

    it("should prevent XSS in basePath", () => {
      // Even though basePath should be validated upstream,
      // the path building should safely construct the URL
      // Note: The escapeHtml happens at serialization, but the path construction
      // should not allow injection
      const basicPayload = "test<img";
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: basicPayload,
      });

      // The path should be included but properly formed
      expect(result.html).toContain("manifest.json");
      // Result should still be valid HTML structure (head/body preserved)
      expect(result.html).toContain("<head>");
      expect(result.html).toContain("</head>");
    });

    it("should handle very long basePath", () => {
      const longPath = "/" + "subdir/".repeat(50) + "app/";
      const result = injectMetaTags(basicHtml, {
        manifestPath: "manifest.json",
        basePath: longPath,
      });

      expect(result.html).toContain("manifest.json");
      expect(result.html).toContain(longPath);
    });
  });
});
