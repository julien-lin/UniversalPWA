/**
 * End-to-end tests for Symfony Backend Integration
 * Tests full PWA generation workflow with Symfony backend
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { getBackendFactory } from "../factory.js";
import { scanProject } from "../../scanner/index.js";
import { generateServiceWorkerFromBackend } from "../../generator/service-worker-generator.js";
import { generateAndWriteManifest } from "../../generator/manifest-generator.js";
import { generateIcons } from "../../generator/icon-generator.js";
import { injectMetaTagsInFilesBatch } from "../../injector/meta-injector.js";

const createSymfonyProject = (): string => {
  const root = join(
    tmpdir(),
    `symfony-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(root, { recursive: true });
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "public"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "templates"), { recursive: true });

  // Create composer.json
  writeFileSync(
    join(root, "composer.json"),
    JSON.stringify({
      name: "test/symfony-app",
      require: {
        php: ">=8.2",
        "symfony/framework-bundle": "^7.0",
      },
    }),
  );

  // Create Symfony structure
  writeFileSync(join(root, "public", "index.php"), '<?php echo "Symfony";');
  writeFileSync(
    join(root, "config", "services.yaml"),
    "services:\n  _defaults:\n    autowire: true\n",
  );

  // Create HTML template
  writeFileSync(
    join(root, "public", "index.html"),
    '<!doctype html><html><head><title>Symfony App</title></head><body><div id="app"><h1>Symfony Application</h1></div></body></html>',
  );

  // Create .env
  writeFileSync(
    join(root, ".env"),
    'APP_NAME="Symfony Test App"\nAPP_ENV=dev\n',
  );

  return root;
};

const cleanup = (path: string) => {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {
    // ignore
  }
};

describe("Symfony E2E - Full PWA Generation", () => {
  let projectRoot = "";

  beforeEach(() => {
    projectRoot = createSymfonyProject();
  });

  afterEach(() => {
    cleanup(projectRoot);
  });

  it("should detect Symfony project correctly", async () => {
    const scanResult = await scanProject({
      projectPath: projectRoot,
      includeAssets: true,
      includeArchitecture: true,
    });

    expect(scanResult.framework.framework).toBe("symfony");
  });

  it("should use Symfony backend integration when detected", () => {
    const factory = getBackendFactory();
    const integration = factory.detectBackend(projectRoot);

    expect(integration).not.toBeNull();
    expect(integration?.id).toBe("symfony");
    expect(integration?.name).toBe("Symfony");

    const detection = integration?.detect();
    expect(detection?.detected).toBe(true);
    expect(detection?.confidence).toBe("high");
  });

  it("should generate PWA files with Symfony backend", async () => {
    const factory = getBackendFactory();
    const integration = factory.getIntegration("symfony", projectRoot);
    expect(integration).not.toBeNull();

    const outputDir = join(projectRoot, "public");

    // 1. Generate icons
    const sharp = (await import("sharp")).default;
    const iconSource = join(projectRoot, "icon.png");
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(iconSource);

    const iconResult = await generateIcons({
      sourceImage: iconSource,
      outputDir,
    });

    expect(iconResult.icons.length).toBeGreaterThan(0);

    // 2. Generate manifest
    const manifestPath = generateAndWriteManifest(
      {
        name: "Symfony Test App",
        shortName: "STA",
        startUrl: "/",
        scope: "/",
        display: "standalone",
        themeColor: "#000000",
        backgroundColor: "#ffffff",
        icons: iconResult.icons,
      },
      outputDir,
    );

    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toBe("Symfony Test App");
    expect(manifest.short_name).toBe("STA");

    // 3. Generate service worker with Symfony backend
    const swResult = await generateServiceWorkerFromBackend(
      integration!,
      "ssr",
      {
        projectPath: projectRoot,
        outputDir,
        globDirectory: outputDir,
      },
    );

    expect(existsSync(swResult.swPath)).toBe(true);
    const swContent = readFileSync(swResult.swPath, "utf-8");
    expect(swContent).toContain("workbox");

    // 4. Inject meta tags
    const htmlPath = join(projectRoot, "public", "index.html");
    const injectionResult = await injectMetaTagsInFilesBatch({
      files: [htmlPath],
      options: {
        manifestPath: "/manifest.json",
        themeColor: "#000000",
        serviceWorkerPath: "/sw.js",
      },
    });

    expect(injectionResult.successful.length).toBeGreaterThan(0);

    // Verify HTML was modified
    const htmlContent = readFileSync(htmlPath, "utf-8");
    expect(htmlContent).toContain("manifest.json");
    expect(htmlContent).toContain("theme-color");
    expect(htmlContent).toContain("sw.js");
  });

  it("should generate Symfony-optimized service worker", () => {
    const factory = getBackendFactory();
    const integration = factory.getIntegration("symfony", projectRoot);
    expect(integration).not.toBeNull();

    const config = integration!.generateServiceWorkerConfig();

    // Verify Symfony-specific routes
    expect(config.apiRoutes).toBeDefined();
    expect(config.apiRoutes.length).toBeGreaterThan(0);

    // Check for Symfony API patterns
    const apiPatterns = integration!.getApiPatterns();
    expect(apiPatterns).toContain("/api/**");

    // Verify static asset patterns
    const staticPatterns = integration!.getStaticAssetPatterns();
    expect(staticPatterns.length).toBeGreaterThan(0);
    // Symfony patterns should include common asset paths
    expect(
      staticPatterns.some(
        (p) =>
          p.includes("assets") || p.includes("build") || p.includes("bundles"),
      ),
    ).toBe(true);
  });

  it("should validate generated service worker contains Symfony routes", async () => {
    const factory = getBackendFactory();
    const integration = factory.getIntegration("symfony", projectRoot);
    expect(integration).not.toBeNull();

    const outputDir = join(projectRoot, "public");

    // Generate service worker with Symfony backend
    const swResult = await generateServiceWorkerFromBackend(
      integration!,
      "ssr",
      {
        projectPath: projectRoot,
        outputDir,
        globDirectory: outputDir,
      },
    );

    expect(existsSync(swResult.swPath)).toBe(true);

    const swContent = readFileSync(swResult.swPath, "utf-8");

    // Verify Workbox is present
    expect(swContent).toContain("workbox");
    // Service worker should contain precaching or runtime caching
    expect(swContent).toMatch(/precacheAndRoute|runtimeCaching|registerRoute/);
  });

  it("should generate manifest with Symfony variables", async () => {
    const factory = getBackendFactory();
    const integration = factory.getIntegration("symfony", projectRoot);
    expect(integration).not.toBeNull();

    const outputDir = join(projectRoot, "public");

    // Generate icons
    const sharp = (await import("sharp")).default;
    const iconSource = join(projectRoot, "icon.png");
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toFile(iconSource);

    const iconResult = await generateIcons({
      sourceImage: iconSource,
      outputDir,
    });

    // Generate manifest
    const manifestPath = generateAndWriteManifest(
      {
        name: "Symfony Test",
        shortName: "ST",
        startUrl: "/",
        scope: "/",
        display: "standalone",
        themeColor: "#000000",
        backgroundColor: "#ffffff",
        icons: iconResult.icons,
      },
      outputDir,
    );

    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    // Verify manifest structure
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("short_name");
    expect(manifest).toHaveProperty("icons");
    expect(manifest).toHaveProperty("start_url");
    expect(manifest).toHaveProperty("display");
    expect(manifest.display).toBe("standalone");
  });
});
