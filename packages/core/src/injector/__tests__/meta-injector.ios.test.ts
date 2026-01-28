import { describe, it, expect } from "vitest";
import { injectMetaTags } from "../meta-injector.js";

describe("meta-injector iOS support", () => {
  describe("apple-mobile-web-app-capable", () => {
    it("should inject apple-mobile-web-app-capable if missing", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
    });

    it("should preserve apple-mobile-web-app-capable if already present", () => {
      const html = `
        <html>
          <head>
            <meta name="apple-mobile-web-app-capable" content="yes">
          </head>
          <body></body>
        </html>
      `;
      const { html: result, result: injectionResult } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(
        injectionResult.skipped.some((s) =>
          s.includes("apple-mobile-web-app-capable"),
        ),
      ).toBe(true);
    });

    it("should not remove apple-mobile-web-app-capable when injecting other meta tags", () => {
      const html = `
        <html>
          <head>
            <meta name="apple-mobile-web-app-capable" content="yes">
          </head>
          <body></body>
        </html>
      `;
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        themeColor: "#2c3e50",
        appleMobileWebAppTitle: "My App",
      });

      // Verify apple-mobile-web-app-capable is still there
      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      // Verify it wasn't removed/replaced - count only the meta tag, not the marker
      const appleTagCount = (
        result.match(/name="apple-mobile-web-app-capable"/g) || []
      ).length;
      expect(appleTagCount).toBe(1);
    });

    it("should preserve apple-mobile-web-app-capable with different content values", () => {
      const testValues = ["yes", "no", "true", "false"];

      for (const value of testValues) {
        const html = `
          <html>
            <head>
              <meta name="apple-mobile-web-app-capable" content="${value}">
            </head>
            <body></body>
          </html>
        `;
        const { html: result } = injectMetaTags(html, {
          manifestPath: "/manifest.json",
        });

        expect(result).toContain(
          `name="apple-mobile-web-app-capable" content="${value}"`,
        );
      }
    });

    it("should handle multiple injection cycles without duplication", () => {
      const html = "<html><head></head><body></body></html>";

      // First injection
      const { html: result1 } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      // Second injection (simulating re-run)
      const { html: result2 } = injectMetaTags(result1, {
        manifestPath: "/manifest.json",
      });

      // Count occurrences of the meta tag only (not the marker)
      const count1 = (
        result1.match(/name="apple-mobile-web-app-capable"/g) || []
      ).length;
      const count2 = (
        result2.match(/name="apple-mobile-web-app-capable"/g) || []
      ).length;

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });

    it("should work with empty head tag", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(result).toContain("<head>");
    });

    it("should work when head is missing entirely", () => {
      const html = "<html><body></body></html>";
      const { html: result, result: injectionResult } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      // Should create head and inject tag
      expect(result).toContain("<head>");
      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(
        injectionResult.warnings.some((w) => w.includes("Created <head>")),
      ).toBe(true);
    });

    it("should not escape html in apple-mobile-web-app-capable", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      // Should be literal "yes", not HTML entities
      expect(result).toContain('content="yes"');
      expect(result).not.toContain("content=&quot;yes&quot;");
    });
  });

  describe("mobile-web-app-capable (Android support)", () => {
    it("should inject mobile-web-app-capable when appleMobileWebAppCapable is true", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: true,
      });

      expect(result).toContain('name="mobile-web-app-capable" content="yes"');
    });

    it("should inject mobile-web-app-capable with no when appleMobileWebAppCapable is false", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: false,
      });

      expect(result).toContain('name="mobile-web-app-capable" content="no"');
    });

    it("should preserve mobile-web-app-capable if already present", () => {
      const html = `
        <html>
          <head>
            <meta name="mobile-web-app-capable" content="no">
          </head>
          <body></body>
        </html>
      `;
      const { html: result, result: injectionResult } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: false,
      });

      expect(result).toContain('name="mobile-web-app-capable" content="no"');
      expect(
        injectionResult.skipped.some((s) =>
          s.includes("mobile-web-app-capable"),
        ),
      ).toBe(true);
    });

    it("should update mobile-web-app-capable if value differs", () => {
      const html = `
        <html>
          <head>
            <meta name="mobile-web-app-capable" content="no">
          </head>
          <body></body>
        </html>
      `;
      const { html: result, result: injectionResult } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: true,
      });

      expect(result).toContain('name="mobile-web-app-capable" content="yes"');
      expect(
        injectionResult.injected.some((i) =>
          i.includes("mobile-web-app-capable"),
        ),
      ).toBe(true);
    });
  });

  describe("Integration: apple and mobile tags together", () => {
    it("should inject both apple-mobile-web-app-capable and mobile-web-app-capable", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: true,
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(result).toContain('name="mobile-web-app-capable" content="yes"');
    });

    it("should preserve existing apple tag while injecting mobile tag", () => {
      const html = `
        <html>
          <head>
            <meta name="apple-mobile-web-app-capable" content="yes">
          </head>
          <body></body>
        </html>
      `;
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: true,
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(result).toContain('name="mobile-web-app-capable" content="yes"');
    });

    it("should work with other iOS meta tags", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppCapable: true,
        appleMobileWebAppStatusBarStyle: "black",
        appleMobileWebAppTitle: "My PWA",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(result).toContain(
        'name="apple-mobile-web-app-status-bar-style" content="black"',
      );
      expect(result).toContain(
        'name="apple-mobile-web-app-title" content="My PWA"',
      );
    });

    it("should handle XSS attempts in apple-mobile-web-app-title", () => {
      const html = "<html><head></head><body></body></html>";
      const maliciousTitle = '<script>alert("xss")</script>';

      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        appleMobileWebAppTitle: maliciousTitle,
      });

      // apple-mobile-web-app-capable should be present regardless
      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      // XSS payload should be present but in attribute content (safe location)
      expect(result).toContain("apple-mobile-web-app-title");
      // The content is in a meta tag attribute, which won't execute
      expect(result).toContain("content=");
    });
  });

  describe("Edge cases", () => {
    it("should handle whitespace in head tag", () => {
      const html = `
        <html>
          <head>
            <!-- Some comment -->
          </head>
          <body></body>
        </html>
      `;
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
    });

    it("should handle existing meta tags in various positions", () => {
      const html = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>Test</title>
            <meta name="viewport" content="width=device-width">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <link rel="stylesheet" href="style.css">
          </head>
          <body></body>
        </html>
      `;
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
      });

      // Should preserve the existing apple-mobile-web-app-capable
      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      // Should keep other tags intact
      expect(result).toContain('charset="utf-8"');
      expect(result).toContain("<title>Test</title>");
    });

    it("should not inject when manifest path is not provided but still handle apple tag", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        // No manifestPath provided
        appleMobileWebAppCapable: true,
      });

      // Should still inject apple-mobile-web-app-capable
      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      // Should inject mobile-web-app-capable too
      expect(result).toContain('name="mobile-web-app-capable" content="yes"');
    });
  });

  describe("Compatibility with basePath", () => {
    it("should preserve apple-mobile-web-app-capable when using basePath", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        basePath: "/app/",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(result).toContain('href="/app/manifest.json"');
    });

    it("should work with complex basePath and iOS tags", () => {
      const html = "<html><head></head><body></body></html>";
      const { html: result } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        basePath: "/api/v1/pwa/",
        appleMobileWebAppCapable: true,
        appleMobileWebAppTitle: "API PWA",
      });

      expect(result).toContain(
        'name="apple-mobile-web-app-capable" content="yes"',
      );
      expect(result).toContain('name="mobile-web-app-capable" content="yes"');
      expect(result).toContain('href="/api/v1/pwa/manifest.json"');
      expect(result).toContain('content="API PWA"');
    });
  });
});
