import { describe, it, expect } from "vitest";
import { injectMetaTags } from "../meta-injector.js";
import type { MetaInjectorOptions } from "../meta-injector.js";

describe("P2.2: Marker-Based Injection (Anti-Duplication)", () => {
  describe("Manifest link marker", () => {
    it("should inject manifest link with data-universal-pwa marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { manifestPath: "/manifest.json" };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain('data-universal-pwa="manifest"');
      expect(result).toContain('rel="manifest"');
      expect(result).toContain('href="/manifest.json"');
    });

    it("should not duplicate manifest when re-injected (marker prevents it)", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { manifestPath: "/manifest.json" };

      // First injection
      const { html: first } = injectMetaTags(html, options);
      expect(first).toContain('data-universal-pwa="manifest"');

      // Count occurrences of marker
      const firstCount = (first.match(/data-universal-pwa="manifest"/g) || [])
        .length;
      expect(firstCount).toBe(1);

      // Second injection on already-injected HTML
      const { html: second } = injectMetaTags(first, options);

      // Count should still be 1 (no duplication)
      const secondCount = (second.match(/data-universal-pwa="manifest"/g) || [])
        .length;
      expect(secondCount).toBe(1);
    });

    it("should handle multiple injections without duplication", () => {
      let html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { manifestPath: "/manifest.json" };

      // Perform 5 consecutive injections
      for (let i = 0; i < 5; i++) {
        const { html: injected } = injectMetaTags(html, options);
        html = injected;
      }

      // Should only have 1 manifest link
      const count = (html.match(/data-universal-pwa="manifest"/g) || []).length;
      expect(count).toBe(1);
    });
  });

  describe("Theme color marker", () => {
    it("should inject theme-color with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { themeColor: "#ffffff" };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain('data-universal-pwa="theme-color"');
      expect(result).toContain('name="theme-color"');
      expect(result).toContain('content="#ffffff"');
    });

    it("should not duplicate theme-color meta tag", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { themeColor: "#ffffff" };

      const { html: first } = injectMetaTags(html, options);
      const { html: second } = injectMetaTags(first, options);

      const firstCount = (
        first.match(/data-universal-pwa="theme-color"/g) || []
      ).length;
      const secondCount = (
        second.match(/data-universal-pwa="theme-color"/g) || []
      ).length;

      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });

    it("should update existing theme-color if value differs", () => {
      const html = `<html><head></head><body></body></html>`;

      // First injection with white
      const { html: first } = injectMetaTags(html, {
        themeColor: "#ffffff",
      });
      expect(first).toContain('content="#ffffff"');

      // Second injection with black should update
      const { html: second } = injectMetaTags(first, {
        themeColor: "#000000",
      });
      expect(second).toContain('content="#000000"');

      // Should still be only 1 marker
      const count = (second.match(/data-universal-pwa="theme-color"/g) || [])
        .length;
      expect(count).toBe(1);
    });
  });

  describe("Apple touch icon marker", () => {
    it("should inject apple-touch-icon with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { appleTouchIcon: "/icon.png" };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain('data-universal-pwa="apple-touch-icon"');
      expect(result).toContain('rel="apple-touch-icon"');
    });

    it("should not duplicate apple-touch-icon", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { appleTouchIcon: "/icon.png" };

      const { html: first } = injectMetaTags(html, options);
      const { html: second } = injectMetaTags(first, options);

      const firstCount = (
        first.match(/data-universal-pwa="apple-touch-icon"/g) || []
      ).length;
      const secondCount = (
        second.match(/data-universal-pwa="apple-touch-icon"/g) || []
      ).length;

      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });
  });

  describe("iOS meta tags markers", () => {
    it("should inject apple-mobile-web-app-capable with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const { html: result } = injectMetaTags(html, {});

      expect(result).toContain(
        'data-universal-pwa="apple-mobile-web-app-capable"',
      );
      expect(result).toContain('name="apple-mobile-web-app-capable"');
      expect(result).toContain('content="yes"');
    });

    it("should not duplicate apple-mobile-web-app-capable", () => {
      const html = `<html><head></head><body></body></html>`;

      const { html: first } = injectMetaTags(html, {});
      const { html: second } = injectMetaTags(first, {});

      const firstCount = (
        first.match(/data-universal-pwa="apple-mobile-web-app-capable"/g) || []
      ).length;
      const secondCount = (
        second.match(/data-universal-pwa="apple-mobile-web-app-capable"/g) || []
      ).length;

      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });

    it("should inject apple-mobile-web-app-title with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        appleMobileWebAppTitle: "My App",
      };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain(
        'data-universal-pwa="apple-mobile-web-app-title"',
      );
      expect(result).toContain('name="apple-mobile-web-app-title"');
      expect(result).toContain('content="My App"');
    });

    it("should not duplicate apple-mobile-web-app-title", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        appleMobileWebAppTitle: "My App",
      };

      const { html: first } = injectMetaTags(html, options);
      const { html: second } = injectMetaTags(first, options);

      const firstCount = (
        first.match(/data-universal-pwa="apple-mobile-web-app-title"/g) || []
      ).length;
      const secondCount = (
        second.match(/data-universal-pwa="apple-mobile-web-app-title"/g) || []
      ).length;

      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });

    it("should inject apple-mobile-web-app-status-bar-style with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        appleMobileWebAppStatusBarStyle: "black",
      };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain(
        'data-universal-pwa="apple-mobile-web-app-status-bar-style"',
      );
      expect(result).toContain('name="apple-mobile-web-app-status-bar-style"');
    });

    it("should not duplicate apple-mobile-web-app-status-bar-style", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        appleMobileWebAppStatusBarStyle: "black",
      };

      const { html: first } = injectMetaTags(html, options);
      const { html: second } = injectMetaTags(first, options);

      const firstCount = (
        first.match(
          /data-universal-pwa="apple-mobile-web-app-status-bar-style"/g,
        ) || []
      ).length;
      const secondCount = (
        second.match(
          /data-universal-pwa="apple-mobile-web-app-status-bar-style"/g,
        ) || []
      ).length;

      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });

    it("should inject mobile-web-app-capable with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: true,
      };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain('data-universal-pwa="mobile-web-app-capable"');
      expect(result).toContain('name="mobile-web-app-capable"');
      expect(result).toContain('content="yes"');
    });

    it("should not duplicate mobile-web-app-capable", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        appleMobileWebAppCapable: true,
      };

      const { html: first } = injectMetaTags(html, options);
      const { html: second } = injectMetaTags(first, options);

      const firstCount = (
        first.match(/data-universal-pwa="mobile-web-app-capable"/g) || []
      ).length;
      const secondCount = (
        second.match(/data-universal-pwa="mobile-web-app-capable"/g) || []
      ).length;

      expect(firstCount).toBe(1);
      expect(secondCount).toBe(1);
    });
  });

  describe("Service Worker script marker", () => {
    it("should inject SW script with marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { serviceWorkerPath: "/sw.js" };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain('data-universal-pwa="service-worker"');
      expect(result).toContain("navigator.serviceWorker.register");
    });

    it("should not duplicate SW script when re-injected", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { serviceWorkerPath: "/sw.js" };

      const { html: first } = injectMetaTags(html, options);
      expect(first).toContain('data-universal-pwa="service-worker"');

      const firstCount = (
        first.match(/data-universal-pwa="service-worker"/g) || []
      ).length;
      expect(firstCount).toBe(1);

      const { html: second } = injectMetaTags(first, options);

      const secondCount = (
        second.match(/data-universal-pwa="service-worker"/g) || []
      ).length;
      expect(secondCount).toBe(1);
    });

    it("should inject PWA install handler with service-worker script marker", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { serviceWorkerPath: "/sw.js" };

      const { html: result } = injectMetaTags(html, options);

      // Both SW registration and install handler are in same script with marker
      expect(result).toContain('data-universal-pwa="service-worker"');
      expect(result).toContain("window.installPWA");
    });

    it("should not duplicate PWA install handler when re-injected", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = { serviceWorkerPath: "/sw.js" };

      const { html: first } = injectMetaTags(html, options);
      const firstCount = (
        first.match(/data-universal-pwa="service-worker"/g) || []
      ).length;
      expect(firstCount).toBe(1);

      const { html: second } = injectMetaTags(first, options);
      const secondCount = (
        second.match(/data-universal-pwa="service-worker"/g) || []
      ).length;
      expect(secondCount).toBe(1);
    });
  });

  describe("Multiple consecutive injections (stress test)", () => {
    it("should handle multiple injections without duplication", () => {
      let html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        manifestPath: "/manifest.json",
        themeColor: "#ffffff",
        appleTouchIcon: "/icon.png",
        appleMobileWebAppTitle: "My App",
        appleMobileWebAppStatusBarStyle: "black",
        appleMobileWebAppCapable: true,
        serviceWorkerPath: "/sw.js",
      };

      // Perform 10 consecutive injections
      for (let i = 0; i < 10; i++) {
        const { html: injected } = injectMetaTags(html, options);
        html = injected;
      }

      // Count all markers
      const manifestCount = (html.match(/data-universal-pwa="manifest"/g) || [])
        .length;
      const themeCount = (html.match(/data-universal-pwa="theme-color"/g) || [])
        .length;
      const iconCount = (
        html.match(/data-universal-pwa="apple-touch-icon"/g) || []
      ).length;
      const titleCount = (
        html.match(/data-universal-pwa="apple-mobile-web-app-title"/g) || []
      ).length;
      const statusBarCount = (
        html.match(
          /data-universal-pwa="apple-mobile-web-app-status-bar-style"/g,
        ) || []
      ).length;
      const capableCount = (
        html.match(/data-universal-pwa="apple-mobile-web-app-capable"/g) || []
      ).length;
      const swCount = (html.match(/data-universal-pwa="service-worker"/g) || [])
        .length;

      // All should be exactly 1
      expect(manifestCount).toBe(1);
      expect(themeCount).toBe(1);
      expect(iconCount).toBe(1);
      expect(titleCount).toBe(1);
      expect(statusBarCount).toBe(1);
      expect(capableCount).toBe(1);
      expect(swCount).toBe(1);
    });

    it("should handle robustness even if HTML is manually edited", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        manifestPath: "/manifest.json",
        themeColor: "#ffffff",
      };

      // First injection
      const { html: first } = injectMetaTags(html, options);

      // Simulate manual HTML edit (someone adds similar-looking content but without marker)
      const manuallyEdited = first.replace(
        "</head>",
        '<link rel="manifest" href="/manifest.json">\n</head>',
      );

      // Re-inject - marker should still prevent duplication
      const { html: second } = injectMetaTags(manuallyEdited, options);

      // Count manifest markers (should still be 1, not 2)
      const manifestCount = (
        second.match(/data-universal-pwa="manifest"/g) || []
      ).length;
      expect(manifestCount).toBe(1);
    });
  });

  describe("Marker with basePath", () => {
    it("should inject manifest with marker and basePath", () => {
      const html = `<html><head></head><body></body></html>`;
      const options: MetaInjectorOptions = {
        manifestPath: "/manifest.json",
        basePath: "/app/",
      };

      const { html: result } = injectMetaTags(html, options);

      expect(result).toContain('data-universal-pwa="manifest"');
      expect(result).toContain('href="/app/manifest.json"');
    });

    it("should not duplicate manifest even with basePath changes", () => {
      const html = `<html><head></head><body></body></html>`;

      // First injection with basePath /app/
      const { html: first } = injectMetaTags(html, {
        manifestPath: "/manifest.json",
        basePath: "/app/",
      });

      // Second injection with different basePath /creativehub/
      // (marker should prevent new injection)
      const { html: second } = injectMetaTags(first, {
        manifestPath: "/manifest.json",
        basePath: "/creativehub/",
      });

      const manifestCount = (
        second.match(/data-universal-pwa="manifest"/g) || []
      ).length;
      expect(manifestCount).toBe(1);

      // But the href should still be from first injection (not updated)
      expect(second).toContain('href="/app/manifest.json"');
    });
  });
});
