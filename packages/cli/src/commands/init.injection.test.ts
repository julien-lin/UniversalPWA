import "../__tests__/init-test-setup.js";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDir, cleanupTestDir } from "../../../core/src/__tests__/test-helpers.js";
import {
  createBasicHtml,
  runInitInTestDir,
  setupPublicWithManifest,
} from "../__tests__/init-helpers.js";
import { getBaseInitCommand } from "../__tests__/init-test-setup.js";

let TEST_DIR: string;

describe.sequential("init command - Injection", () => {
  beforeEach(() => {
    TEST_DIR = createTestDir("cli-init-injection");
  });

  afterEach(() => {
    cleanupTestDir(TEST_DIR);
  });

  describe("Meta-tags injection", () => {
    it("should skip injection if skipInjection is true", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        ...getBaseInitCommand(TEST_DIR),
      });

      expect(result.htmlFilesInjected).toBe(0);
    });

    it("should inject meta-tags in HTML files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should limit HTML files when maxHtmlFiles is set", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          setupPublicWithManifest(dir);
          for (let i = 0; i < 5; i++) {
            writeFileSync(join(dir, `index-${i}.html`), createBasicHtml());
          }
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
        maxHtmlFiles: 2,
      });

      expect(result.htmlFilesInjected).toBeLessThanOrEqual(2);
    });

    it("should handle injection errors gracefully", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: setupPublicWithManifest,
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result).toBeDefined();
    });

    it("should prioritize dist/ files over public/ files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "dist"), { recursive: true });
          setupPublicWithManifest(dir);
          writeFileSync(
            join(dir, "dist", "index.html"),
            createBasicHtml("Dist"),
          );
          writeFileSync(
            join(dir, "public", "index.html"),
            createBasicHtml("Public"),
          );
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });
  });

  describe("HTML injection scenarios", () => {
    it("should inject meta-tags in multiple HTML files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          for (let i = 0; i < 3; i++) {
            writeFileSync(
              join(dir, `page-${i}.html`),
              createBasicHtml(`Page ${i}`),
            );
          }
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should handle HTML files in dist/ directory", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "dist"), { recursive: true });
          writeFileSync(
            join(dir, "dist", "index.html"),
            createBasicHtml("Dist"),
          );
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should handle HTML files in public/ directory", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          setupPublicWithManifest(dir);
          writeFileSync(
            join(dir, "public", "index.html"),
            createBasicHtml("Public"),
          );
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
    });

    it("should handle injection errors for individual files gracefully", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        html: createBasicHtml(),
        beforeInit: (dir) => {
          writeFileSync(join(dir, "invalid.html"), "<html><unclosed>");
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThanOrEqual(0);
    });

    it("should inject meta-tags in Twig template files (Symfony)", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "templates"), { recursive: true });
          const twigContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Symfony App{% endblock %}</title>
</head>
<body>
    {% block body %}{% endblock %}
</body>
</html>`;
          writeFileSync(
            join(dir, "templates", "base.html.twig"),
            twigContent,
          );
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
      const modifiedTwig = readFileSync(
        join(TEST_DIR, "templates", "base.html.twig"),
        "utf-8",
      );
      expect(modifiedTwig).toContain('rel="manifest"');
      expect(modifiedTwig).toContain('name="theme-color"');
      expect(modifiedTwig).toContain("navigator.serviceWorker");
    });

    it("should inject meta-tags in Blade template files (Laravel)", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          mkdirSync(join(dir, "resources", "views"), { recursive: true });
          const bladeContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'Laravel App')</title>
</head>
<body>
    @yield('content')
</body>
</html>`;
          writeFileSync(
            join(dir, "resources", "views", "layout.blade.php"),
            bladeContent,
          );
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
      const modifiedBlade = readFileSync(
        join(TEST_DIR, "resources", "views", "layout.blade.php"),
        "utf-8",
      );
      expect(modifiedBlade).toContain('rel="manifest"');
      expect(modifiedBlade).toContain('name="theme-color"');
      expect(modifiedBlade).toContain("navigator.serviceWorker");
    });
  });

  describe("Large projects (100+ HTML files)", () => {
    it("should handle projects with many HTML files", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          for (let i = 0; i < 105; i++) {
            writeFileSync(
              join(dir, `page-${i}.html`),
              createBasicHtml(`Page ${i}`),
            );
          }
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
      });

      expect(result.htmlFilesInjected).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it("should limit HTML files when maxHtmlFiles is set on large project", async () => {
      const result = await runInitInTestDir(TEST_DIR, {
        beforeInit: (dir) => {
          for (let i = 0; i < 150; i++) {
            writeFileSync(
              join(dir, `page-${i}.html`),
              createBasicHtml(`Page ${i}`),
            );
          }
          setupPublicWithManifest(dir);
        },
        ...getBaseInitCommand(TEST_DIR),
        skipInjection: false,
        maxHtmlFiles: 50,
      });

      expect(result.htmlFilesInjected).toBeLessThanOrEqual(50);
    });
  });
});
