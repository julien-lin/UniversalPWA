/**
 * Symfony Framework Integration
 *
 * Detects and configures PWA for Symfony applications.
 * Supported features:
 * - SPA mode (Webpack Encore, Vite)
 * - API Platform
 * - Traditional server-rendered applications
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { BackendDetectionResult } from "./types.js";
import type { ServiceWorkerConfig } from "../generator/caching-strategy.js";
import { PRESET_STRATEGIES } from "../generator/caching-strategy.js";
import { BaseBackendIntegration } from "./base.js";

export interface SymfonyConfig {
  projectRoot: string;
  version?: string;
  isSPA?: boolean;
  hasAPIPlatform?: boolean;
}

/**
 * Detects Symfony version from composer.json
 */
function detectSymfonyVersion(projectRoot: string): string | null {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return null;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;

    // Check symfony/framework-bundle requirement
    const requires = composer.require as Record<string, string> | undefined;
    const requiresDev = composer["require-dev"] as
      | Record<string, string>
      | undefined;

    const symfonyVersion =
      requires?.["symfony/framework-bundle"] ||
      requiresDev?.["symfony/framework-bundle"];

    if (!symfonyVersion) {
      return null;
    }

    // Extract version number
    const versionMatch = symfonyVersion.match(/(\d+)(?:\.(\d+))?/);
    if (versionMatch) {
      const major = versionMatch[1] ?? "0";
      const minor = versionMatch[2] ?? "0";
      return `${major}.${minor}.0`;
    }

    return null;
  } catch {
    return null;
  }
}

function hasSymfonyDependency(projectRoot: string): boolean {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return false;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;
    const requires = composer.require as Record<string, string> | undefined;
    const requiresDev = composer["require-dev"] as
      | Record<string, string>
      | undefined;

    return !!(
      requires?.["symfony/framework-bundle"] ||
      requiresDev?.["symfony/framework-bundle"]
    );
  } catch {
    return false;
  }
}

/**
 * Checks if Symfony project is in SPA mode (using Webpack Encore or Vite)
 */
function detectSPAMode(projectRoot: string): boolean {
  try {
    // Check for webpack.config.js (Webpack Encore)
    if (
      existsSync(join(projectRoot, "webpack.config.js")) ||
      existsSync(join(projectRoot, "webpack.config.ts"))
    ) {
      return true;
    }

    // Check for Vite config
    const viteExists =
      existsSync(join(projectRoot, "vite.config.ts")) ||
      existsSync(join(projectRoot, "vite.config.js")) ||
      existsSync(join(projectRoot, "vite.config.mjs"));
    if (viteExists) {
      const vitePath = existsSync(join(projectRoot, "vite.config.ts"))
        ? join(projectRoot, "vite.config.ts")
        : existsSync(join(projectRoot, "vite.config.js"))
          ? join(projectRoot, "vite.config.js")
          : join(projectRoot, "vite.config.mjs");
      const viteContent = readFileSync(vitePath, "utf-8");
      return (
        viteContent.includes("vue") ||
        viteContent.includes("react") ||
        viteContent.includes("svelte")
      );
    }

    // Check package.json for frontend framework
    const packagePath = join(projectRoot, "package.json");
    if (existsSync(packagePath)) {
      const content = readFileSync(packagePath, "utf-8");
      const pkg = JSON.parse(content) as Record<string, unknown>;
      const dependencies = pkg.dependencies as
        | Record<string, unknown>
        | undefined;
      const devDependencies = pkg.devDependencies as
        | Record<string, unknown>
        | undefined;
      return !!(
        dependencies?.vue ||
        dependencies?.react ||
        dependencies?.svelte ||
        devDependencies?.vue ||
        devDependencies?.react ||
        devDependencies?.svelte
      );
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Checks if API Platform is installed
 */
function detectAPIPlatform(projectRoot: string): boolean {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return false;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;
    const requires = composer.require as Record<string, string> | undefined;
    const requiresDev = composer["require-dev"] as
      | Record<string, string>
      | undefined;

    return !!(
      requires?.["api-platform/core"] || requiresDev?.["api-platform/core"]
    );
  } catch {
    return false;
  }
}

/**
 * Parse .env file for APP_NAME and APP_DESCRIPTION
 */
function parseEnv(projectRoot: string): Record<string, string> {
  try {
    const envPath = join(projectRoot, ".env");
    if (!existsSync(envPath)) {
      return {};
    }

    const content = readFileSync(envPath, "utf-8");
    const env: Record<string, string> = {};

    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const [key, ...valueParts] = trimmed.split("=");
      if (key) {
        let value = valueParts.join("=").trim();
        // Remove surrounding quotes if present
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        env[key.trim()] = value;
      }
    });

    return env;
  } catch {
    return {};
  }
}

export class SymfonyIntegration extends BaseBackendIntegration {
  readonly id = "symfony";
  readonly name = "Symfony";
  readonly framework = "symfony" as const;
  readonly language = "php" as const;

  private config: SymfonyConfig;

  constructor(projectRoot: string, config?: Partial<SymfonyConfig>) {
    super();
    this.config = {
      projectRoot,
      ...config,
    };
  }

  /**
   * Arrow function to ensure `this` context is always bound.
   * This prevents issues when the method is extracted or passed as a callback.
   * @see https://github.com/julien-lin/UniversalPWA/issues (P0: context binding)
   */
  detect = (): BackendDetectionResult => {
    const projectRoot = this.config.projectRoot;
    const indicators: string[] = [];

    if (!hasSymfonyDependency(projectRoot)) {
      return {
        detected: false,
        framework: null,
        language: null,
        confidence: "low",
        indicators: [],
      };
    }

    indicators.push("composer.json: symfony/framework-bundle");

    const version = detectSymfonyVersion(projectRoot);

    // Verify Symfony folder structure (public/index.php, config/)
    const hasPublicIndex = existsSync(join(projectRoot, "public/index.php"));
    const hasServicesConfig =
      existsSync(join(projectRoot, "config/services.yaml")) ||
      existsSync(join(projectRoot, "config/services.yml"));
    const hasConfigDir = existsSync(join(projectRoot, "config"));

    if (hasPublicIndex) indicators.push("public/index.php");
    if (hasServicesConfig) indicators.push("config/services.yaml");
    if (hasConfigDir) indicators.push("config/");

    const isSPA = detectSPAMode(projectRoot);
    const hasAPIPlatform = detectAPIPlatform(projectRoot);
    if (isSPA) indicators.push("SPA mode (Webpack Encore/Vite)");
    if (hasAPIPlatform) indicators.push("API Platform");

    this.config = {
      ...this.config,
      version: version ?? undefined,
      isSPA,
      hasAPIPlatform,
    };

    const confidence =
      indicators.length >= 4
        ? "high"
        : indicators.length >= 2
          ? "medium"
          : "low";

    return {
      detected: hasPublicIndex && hasServicesConfig,
      framework: hasPublicIndex && hasServicesConfig ? "symfony" : null,
      language: hasPublicIndex && hasServicesConfig ? "php" : null,
      confidence,
      indicators,
      versions: version ? [version] : undefined,
    };
  };

  generateServiceWorkerConfig(): ServiceWorkerConfig {
    const projectRoot = this.config.projectRoot;
    const hasAPIPlatform =
      this.config.hasAPIPlatform ?? detectAPIPlatform(projectRoot);

    const staticRoutes = [
      {
        pattern: "/build/**",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 10,
        description: "Webpack Encore assets",
      },
      {
        pattern: "/bundles/**",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 9,
        description: "Symfony framework bundles",
      },
      {
        pattern: "/assets/**",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 8,
        description: "General assets",
      },
      {
        pattern: "*.{js,css,woff,woff2,ttf,svg,png,jpg,jpeg,gif,webp,ico}",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 7,
        description: "Static files",
      },
    ];

    const apiRoutes = [
      {
        pattern: "/api/**",
        strategy: PRESET_STRATEGIES.ApiEndpoints,
        priority: 20,
        description: "API endpoints",
      },
      ...(hasAPIPlatform
        ? [
            {
              pattern: "/graphql",
              strategy: PRESET_STRATEGIES.ApiEndpoints,
              priority: 20,
              description: "GraphQL API (API Platform)",
            },
          ]
        : []),
    ];

    const imageRoutes = [
      {
        pattern: "*.{png,jpg,jpeg,gif,webp,svg}",
        strategy: PRESET_STRATEGIES.Images,
        priority: 5,
        description: "Images",
      },
    ];

    return {
      destination: "public/service-worker.js",
      staticRoutes,
      apiRoutes,
      imageRoutes,
      offline: {
        fallbackPage: "/offline",
      },
    };
  }

  generateManifestVariables(): Record<string, string | number> {
    const env = parseEnv(this.config.projectRoot);
    const appName = this.getAppName(env);
    const shortName = appName.replace(/\s+/g, " ").trim().slice(0, 12) || "App";
    const description = env.APP_DESCRIPTION || "A Symfony Progressive Web App";

    return {
      name: appName,
      short_name: shortName,
      description,
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "portrait-primary",
      background_color: "#ffffff",
      theme_color: "#000000",
    };
  }

  getStartUrl(): string {
    return "/";
  }

  getSecureRoutes(): string[] {
    return [
      "/login",
      "/logout",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/admin/**",
      "/user/**",
      "/security/**",
      "/api/auth/**",
    ];
  }

  validateSetup(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const projectRoot = this.config.projectRoot;

    if (!existsSync(join(projectRoot, "public/manifest.json"))) {
      warnings.push("manifest.json not found in public directory");
      suggestions.push("Generate manifest.json in public directory");
    }

    if (!existsSync(join(projectRoot, "public/service-worker.js"))) {
      warnings.push("Service worker not found in public directory");
      suggestions.push("Generate service worker in public directory");
    }

    if (!existsSync(join(projectRoot, "templates/offline.html.twig"))) {
      warnings.push("Offline fallback template not found");
      suggestions.push(
        "Create templates/offline.html.twig for offline experience",
      );
    }

    return Promise.resolve({
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    });
  }

  private getAppName(env: Record<string, string>): string {
    if (env.APP_NAME) {
      return env.APP_NAME;
    }

    try {
      const composerPath = join(this.config.projectRoot, "composer.json");
      if (!existsSync(composerPath)) {
        return "Symfony App";
      }

      const content = readFileSync(composerPath, "utf-8");
      const composer = JSON.parse(content) as Record<string, unknown>;
      const name = typeof composer.name === "string" ? composer.name : "";
      if (!name) {
        return "Symfony App";
      }

      const parts = name.split("/");
      const raw = parts[parts.length - 1] ?? name;
      return raw
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    } catch {
      return "Symfony App";
    }
  }
}

export function createSymfonyIntegration(): SymfonyIntegration {
  return new SymfonyIntegration(process.cwd());
}
