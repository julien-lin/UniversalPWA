import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { LaravelIntegration } from "../laravel.js";
import { ServiceWorkerConfigBuilder } from "../../generator/service-worker-config-builder.js";
import { generateSimpleServiceWorker } from "../../generator/service-worker-generator.js";
import { injectMetaTagsInFile } from "../../injector/meta-injector.js";
import { generateIcons } from "../../generator/icon-generator.js";
import {
  createTestDir,
  cleanupTestDir,
  createLaravelFixture,
} from "../../__tests__/test-helpers.js";
vi.mock("workbox-build", async (importOriginal) => {
  const { createWorkboxBuildMock } = await import(
    "../../__tests__/mocks/workbox-build.js"
  );
  return await createWorkboxBuildMock(
    importOriginal as () => Promise<typeof import("workbox-build")>,
  );
});

describe("LaravelIntegration (integration-lite)", () => {
  let projectRoot = "";

  beforeEach(() => {
    projectRoot = createTestDir("laravel-integration");
    createLaravelFixture(projectRoot);
  });

  afterEach(() => {
    cleanupTestDir(projectRoot);
  });

  it("should detect and validate ServiceWorkerConfig", () => {
    const integration = new LaravelIntegration(projectRoot, { isSPA: true });
    const detection = integration.detect();
    expect(detection.detected).toBe(true);

    const config = integration.generateServiceWorkerConfig();
    const validation = ServiceWorkerConfigBuilder.validate(config);
    expect(validation.isValid).toBe(true);
  });

  it("should generate a service worker file", async () => {
    const outputDir = join(projectRoot, "public");
    const result = await generateSimpleServiceWorker({
      projectPath: projectRoot,
      outputDir,
      architecture: "spa",
      globDirectory: outputDir,
      globPatterns: ["**/*.{html,js,css}"],
    });

    expect(existsSync(result.swPath)).toBe(true);
    expect(result.size).toBeGreaterThan(0);
  }, 20000);

  it("should inject meta tags into HTML", () => {
    const htmlPath = join(projectRoot, "public", "index.html");
    const result = injectMetaTagsInFile(htmlPath, {
      manifestPath: "/manifest.json",
      themeColor: "#3B82F6",
      serviceWorkerPath: "/service-worker.js",
    });

    expect(result.injected.length).toBeGreaterThan(0);
  });

  it("should generate icons from a source image", async () => {
    const sharp = (await import("sharp")).default;
    const sourceImage = join(projectRoot, "icon.png");
    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 0, g: 122, b: 255, alpha: 1 },
      },
    })
      .png()
      .toFile(sourceImage);

    const outputDir = join(projectRoot, "public", "icons");
    const result = await generateIcons({
      sourceImage,
      outputDir,
    });

    expect(result.icons.length).toBeGreaterThan(0);
    expect(result.generatedFiles.length).toBeGreaterThan(0);
  }, 10000);
});
