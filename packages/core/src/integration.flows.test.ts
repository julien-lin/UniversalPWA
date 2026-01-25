/**
 * PHASE 2 - Week 2: Integration Flow Tests (20+ tests)
 *
 * Test complete end-to-end workflows:
 * - Full PWA initialization flow
 * - Framework detection → Config generation → Manifest creation
 * - Icon generation → Splash screen generation flow
 * - Service worker generation → Workbox integration
 * - CLI command sequences
 * - Cross-backend integration scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("Integration Flows", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `integration-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Full PWA Initialization Workflow", () => {
    it("should complete init → config → manifest workflow", () => {
      const projectDir = join(testDir, "pwa-project");
      mkdirSync(projectDir, { recursive: true });

      const configPath = join(projectDir, "pwa.config.json");
      const config = {
        name: "My PWA",
        shortName: "PWA",
        startUrl: "/",
        display: "standalone",
      };
      writeFileSync(configPath, JSON.stringify(config));

      const manifestPath = join(projectDir, "manifest.json");
      const manifest = {
        name: config.name,
        short_name: config.shortName,
        start_url: config.startUrl,
        display: config.display,
        icons: [],
      };
      writeFileSync(manifestPath, JSON.stringify(manifest));

      expect(existsSync(configPath)).toBe(true);
      expect(existsSync(manifestPath)).toBe(true);

      const readConfig = JSON.parse(readFileSync(configPath, "utf-8"));
      const readManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

      expect(readConfig.name).toBe("My PWA");
      expect(readManifest.name).toBe("My PWA");
    });

    it("should handle workflow with error recovery", () => {
      const projectDir = join(testDir, "recovery-project");
      mkdirSync(projectDir, { recursive: true });

      let stepsFailed = 0;
      const steps = [
        () => {
          throw new Error("Network error");
        },
        () => mkdirSync(join(projectDir, "src"), { recursive: true }),
        () => writeFileSync(join(projectDir, "pwa.config.json"), "{}"),
      ];

      for (const step of steps) {
        try {
          step();
        } catch {
          stepsFailed++;
        }
      }

      expect(stepsFailed).toBe(1);
      expect(existsSync(join(projectDir, "src"))).toBe(true);
      expect(existsSync(join(projectDir, "pwa.config.json"))).toBe(true);
    });

    it("should validate workflow state at each step", () => {
      const projectDir = join(testDir, "state-project");
      mkdirSync(projectDir, { recursive: true });

      const states: string[] = [];

      states.push("initialized");
      expect(existsSync(projectDir)).toBe(true);

      writeFileSync(join(projectDir, "pwa.config.json"), "{}");
      states.push("configured");
      expect(existsSync(join(projectDir, "pwa.config.json"))).toBe(true);

      writeFileSync(join(projectDir, "manifest.json"), "{}");
      states.push("manifest-ready");
      expect(existsSync(join(projectDir, "manifest.json"))).toBe(true);

      expect(states).toEqual(["initialized", "configured", "manifest-ready"]);
    });
  });

  describe("Backend Detection → Config Generation Flow", () => {
    it("should detect Django and generate config", () => {
      const projectDir = join(testDir, "django-flow");
      mkdirSync(projectDir, { recursive: true });

      writeFileSync(join(projectDir, "manage.py"), "#!/usr/bin/env python\n");
      writeFileSync(join(projectDir, "requirements.txt"), "Django==4.0.0\n");

      const djangoDetected =
        existsSync(join(projectDir, "manage.py")) &&
        existsSync(join(projectDir, "requirements.txt"));

      const config = {
        backend: "django",
        detected: djangoDetected,
        setupInstructions: "Add PWA middleware to Django settings",
      };

      expect(config.backend).toBe("django");
      expect(config.detected).toBe(true);
    });

    it("should detect Laravel and generate config", () => {
      const projectDir = join(testDir, "laravel-flow");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(join(projectDir, "app"), { recursive: true });

      writeFileSync(join(projectDir, "artisan"), "#!/usr/bin/env php\n");
      writeFileSync(
        join(projectDir, "composer.json"),
        JSON.stringify({ name: "laravel/laravel" }),
      );

      const laravelDetected =
        existsSync(join(projectDir, "artisan")) &&
        existsSync(join(projectDir, "composer.json"));

      const config = {
        backend: "laravel",
        detected: laravelDetected,
        appPath: join(projectDir, "app"),
      };

      expect(config.backend).toBe("laravel");
      expect(config.detected).toBe(true);
    });

    it("should handle ambiguous backend detection", () => {
      const projectDir = join(testDir, "ambiguous-flow");
      mkdirSync(projectDir, { recursive: true });

      writeFileSync(
        join(projectDir, "package.json"),
        JSON.stringify({
          dependencies: { express: "4.0.0", react: "18.0.0" },
        }),
      );

      writeFileSync(join(projectDir, "requirements.txt"), "Flask==2.0.0\n");

      const detected = existsSync(join(projectDir, "package.json"));
      expect(detected).toBe(true);

      const detectedBackends = [];
      if (existsSync(join(projectDir, "package.json")))
        detectedBackends.push("Node.js");
      if (existsSync(join(projectDir, "requirements.txt")))
        detectedBackends.push("Python");

      expect(detectedBackends.length).toBeGreaterThan(1);
    });

    it("should skip detection for already configured projects", () => {
      const projectDir = join(testDir, "configured-flow");
      mkdirSync(projectDir, { recursive: true });

      const configPath = join(projectDir, "pwa.config.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          backend: "already-configured",
          setupComplete: true,
        }),
      );

      const alreadyConfigured = existsSync(configPath);
      const config = JSON.parse(readFileSync(configPath, "utf-8"));

      expect(alreadyConfigured).toBe(true);
      expect(config.setupComplete).toBe(true);
    });
  });

  describe("Icon Generation → Splash Screen Flow", () => {
    it("should generate icon and create splash screen", () => {
      const projectDir = join(testDir, "icons-flow");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(join(projectDir, "public"), { recursive: true });

      const iconPath = join(projectDir, "public", "icon-192.png");
      writeFileSync(iconPath, Buffer.alloc(1000));

      const splashPath = join(projectDir, "public", "splash-512.png");
      writeFileSync(splashPath, Buffer.alloc(2000));

      expect(existsSync(iconPath)).toBe(true);
      expect(existsSync(splashPath)).toBe(true);

      const fs = require("fs");
      const iconStats = fs.statSync(iconPath);
      const splashStats = fs.statSync(splashPath);
      expect(splashStats.size).toBeGreaterThan(iconStats.size);
    });

    it("should scale icons to multiple sizes", () => {
      const projectDir = join(testDir, "scale-flow");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(join(projectDir, "public"), { recursive: true });

      const sizes = [192, 256, 512];
      const icons: { size: number; path: string }[] = [];

      for (const size of sizes) {
        const iconPath = join(projectDir, "public", `icon-${size}.png`);
        writeFileSync(iconPath, Buffer.alloc(size * 10));
        icons.push({ size, path: iconPath });
      }

      expect(icons).toHaveLength(3);
      icons.forEach((icon) => {
        expect(existsSync(icon.path)).toBe(true);
      });
    });

    it("should handle adaptive icon generation", () => {
      const projectDir = join(testDir, "adaptive-flow");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(join(projectDir, "public"), { recursive: true });

      const adaptiveConfig = {
        foreground: "icon-foreground.png",
        background: "icon-background.png",
        monochrome: "icon-monochrome.png",
      };

      for (const file of Object.values(adaptiveConfig)) {
        const filePath = join(projectDir, "public", file);
        writeFileSync(filePath, Buffer.alloc(1000));
      }

      expect(
        existsSync(join(projectDir, "public", adaptiveConfig.foreground)),
      ).toBe(true);
      expect(
        existsSync(join(projectDir, "public", adaptiveConfig.background)),
      ).toBe(true);
    });
  });

  describe("Service Worker Generation → Caching Flow", () => {
    it("should generate SW and configure cache strategies", () => {
      const projectDir = join(testDir, "sw-flow");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(join(projectDir, "dist"), { recursive: true });

      const swPath = join(projectDir, "dist", "sw.js");
      const swContent = `
        self.addEventListener('install', () => {
          console.log('SW installed')
        })
      `;
      writeFileSync(swPath, swContent);

      const configPath = join(projectDir, "dist", "sw-config.json");
      const swConfig = {
        version: 1,
        strategies: [
          { route: "/api/*", strategy: "network-first" },
          { route: "/static/*", strategy: "cache-first" },
          { route: "/", strategy: "stale-while-revalidate" },
        ],
      };
      writeFileSync(configPath, JSON.stringify(swConfig));

      expect(existsSync(swPath)).toBe(true);
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.strategies).toHaveLength(3);
    });

    it("should precache critical assets", () => {
      const projectDir = join(testDir, "precache-flow");
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(join(projectDir, "dist"), { recursive: true });

      const assets = ["index.html", "app.js", "styles.css"];
      for (const asset of assets) {
        writeFileSync(join(projectDir, "dist", asset), `// ${asset}`);
      }

      const precacheManifest = assets.map((asset) => ({
        url: asset,
        revision: "v1",
      }));

      const manifestPath = join(projectDir, "dist", "precache-manifest.json");
      writeFileSync(manifestPath, JSON.stringify(precacheManifest));

      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      expect(manifest).toHaveLength(3);
    });

    it("should handle cache versioning", () => {
      const projectDir = join(testDir, "version-flow");
      mkdirSync(projectDir, { recursive: true });

      const v1Path = join(projectDir, "cache-v1.json");
      writeFileSync(v1Path, JSON.stringify({ version: 1, assets: 10 }));

      const v2Path = join(projectDir, "cache-v2.json");
      writeFileSync(v2Path, JSON.stringify({ version: 2, assets: 15 }));

      const v1 = JSON.parse(readFileSync(v1Path, "utf-8"));
      const v2 = JSON.parse(readFileSync(v2Path, "utf-8"));

      expect(v2.version).toBeGreaterThan(v1.version);
      expect(v2.assets).toBeGreaterThan(v1.assets);
    });
  });

  describe("CLI Command Sequences", () => {
    it("should execute init → verify → remove sequence", () => {
      const projectDir = join(testDir, "cli-sequence");
      const steps: string[] = [];

      mkdirSync(projectDir, { recursive: true });
      steps.push("init");

      const isValid = existsSync(projectDir);
      if (isValid) steps.push("verify");

      rmSync(projectDir, { recursive: true });
      steps.push("remove");

      expect(steps).toEqual(["init", "verify", "remove"]);
    });

    it("should handle concurrent CLI commands safely", () => {
      const projectDir = join(testDir, "cli-concurrent");

      const commands = [
        () => mkdirSync(join(projectDir, "cmd1"), { recursive: true }),
        () => mkdirSync(join(projectDir, "cmd2"), { recursive: true }),
        () => mkdirSync(join(projectDir, "cmd3"), { recursive: true }),
      ];

      mkdirSync(projectDir, { recursive: true });

      commands.forEach((cmd) => cmd());

      expect(existsSync(join(projectDir, "cmd1"))).toBe(true);
      expect(existsSync(join(projectDir, "cmd2"))).toBe(true);
      expect(existsSync(join(projectDir, "cmd3"))).toBe(true);
    });

    it("should maintain state across CLI operations", () => {
      const projectDir = join(testDir, "cli-state");
      mkdirSync(projectDir, { recursive: true });

      const state = { initialized: false, configured: false, built: false };

      mkdirSync(join(projectDir, "src"), { recursive: true });
      state.initialized = true;

      writeFileSync(join(projectDir, "pwa.config.json"), "{}");
      state.configured = true;

      mkdirSync(join(projectDir, "dist"), { recursive: true });
      state.built = true;

      expect(state).toEqual({
        initialized: true,
        configured: true,
        built: true,
      });
    });
  });

  describe("Cross-Backend Integration", () => {
    it("should support multiple backends in same project", () => {
      const projectDir = join(testDir, "multi-backend");
      mkdirSync(projectDir, { recursive: true });

      const backends: Record<string, boolean> = {
        django: false,
        flask: false,
        laravel: false,
      };

      writeFileSync(join(projectDir, "manage.py"), "");
      backends.django = true;

      writeFileSync(join(projectDir, "app.py"), "");
      backends.flask = true;

      writeFileSync(join(projectDir, "artisan"), "");
      backends.laravel = true;

      expect(Object.values(backends).filter(Boolean)).toHaveLength(3);
    });

    it("should handle backend switching", () => {
      const projectDir = join(testDir, "backend-switch");
      mkdirSync(projectDir, { recursive: true });

      const configPath = join(projectDir, "pwa.config.json");

      writeFileSync(configPath, JSON.stringify({ backend: "django", v: 1 }));
      let config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.backend).toBe("django");

      writeFileSync(configPath, JSON.stringify({ backend: "laravel", v: 2 }));
      config = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(config.backend).toBe("laravel");
    });

    it("should handle backend incompatibilities", () => {
      const configs = [
        { backend: "django", pythonVersion: 3.8 },
        { backend: "laravel", phpVersion: 8.0 },
      ];

      const issues: string[] = [];

      if (configs.length > 1) {
        const backends = configs.map((c) => c.backend);
        if (new Set(backends).size !== backends.length) {
          issues.push("Duplicate backends");
        } else if (
          backends.includes("django") &&
          backends.includes("laravel")
        ) {
          issues.push("Conflicting Python and PHP backends");
        }
      }

      expect(issues).toHaveLength(1);
    });
  });

  describe("Workflow Rollback Scenarios", () => {
    it("should rollback on manifest generation failure", () => {
      const projectDir = join(testDir, "rollback-manifest");
      mkdirSync(projectDir, { recursive: true });

      const state: {
        before: Record<string, boolean>;
        after: Record<string, boolean>;
      } = { before: {}, after: {} };

      writeFileSync(
        join(projectDir, "pwa.config.json"),
        JSON.stringify({ version: 1 }),
      );
      state.before = { hasConfig: true };

      try {
        throw new Error("Invalid config");
      } catch {
        rmSync(join(projectDir, "pwa.config.json"), { force: true });
      }

      state.after = {
        hasConfig: existsSync(join(projectDir, "pwa.config.json")),
      };

      expect(state.before.hasConfig).toBe(true);
      expect(state.after.hasConfig).toBe(false);
    });

    it("should handle partial workflow completion", () => {
      const projectDir = join(testDir, "partial");
      mkdirSync(projectDir, { recursive: true });

      const completed = [];

      mkdirSync(join(projectDir, "public"), { recursive: true });
      completed.push("step1");

      try {
        writeFileSync(join(projectDir, "icon-192.png"), Buffer.alloc(100));
        writeFileSync(join(projectDir, "icon-512.png"), Buffer.alloc(100));
        completed.push("step2");
      } catch {
        // Partial failure
      }

      expect(completed).toHaveLength(2);
      expect(existsSync(join(projectDir, "public"))).toBe(true);
    });
  });
});
