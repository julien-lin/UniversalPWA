/**
 * Laravel Framework Integration
 *
 * Detects and configures PWA for Laravel applications.
 * Supported features:
 * - SPA mode (Vue.js, React, Inertia)
 * - Livewire
 * - Traditional server-rendered applications
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { detectSPAFromViteAndPackage } from "./spa-detector.js";
import type { BackendDetectionResult } from "./types.js";
import type { ServiceWorkerConfig } from "../generator/caching-strategy.js";
import { PRESET_STRATEGIES } from "../generator/caching-strategy.js";
import { BaseBackendIntegration } from "./base.js";

export interface LaravelConfig {
  projectRoot: string;
  version?: string;
  isSPA?: boolean;
  isLivewire?: boolean;
  isAlpine?: boolean;
  csrfProtection?: boolean;
}

/**
 * Detects Laravel version from composer.json
 */
function detectLaravelVersion(projectRoot: string): string | null {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return null;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;

    // Check laravel/framework requirement
    const requires = composer.require as Record<string, string> | undefined;
    const laravelVersion = requires?.["laravel/framework"];
    if (!laravelVersion) {
      return null;
    }

    // Extract version number (e.g., "^11.0", ">=10.0", "11.*")
    const match = laravelVersion.match(/(\d+)(?:\.(\d+))?/);
    if (match) {
      const major = match[1] ?? "0";
      const minor = match[2] ?? "0";
      return `${major}.${minor}.0`;
    }

    return null;
  } catch {
    return null;
  }
}

function hasLaravelDependency(projectRoot: string): boolean {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return false;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;
    const requires = composer.require as Record<string, string> | undefined;
    return !!requires?.["laravel/framework"];
  } catch {
    return false;
  }
}

function hasLumenDependency(projectRoot: string): boolean {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return false;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;
    const requires = composer.require as Record<string, string> | undefined;
    return !!(
      requires?.["laravel/lumen-framework"] || requires?.["lumen/framework"]
    );
  } catch {
    return false;
  }
}

/**
 * Checks if Laravel project is in SPA mode (Vue/React/Inertia).
 * Uses shared spa-detector for Vite/package.json.
 */
function detectSPAMode(projectRoot: string): boolean {
  return detectSPAFromViteAndPackage(projectRoot, {
    viteIncludes: ["vue", "react", "inertia"],
    packageKeys: ["vue", "react", "@inertiajs/inertia"],
  });
}

/**
 * Checks if Laravel project uses Livewire
 */
function detectLivewire(projectRoot: string): boolean {
  try {
    const composerPath = join(projectRoot, "composer.json");
    if (!existsSync(composerPath)) {
      return false;
    }

    const content = readFileSync(composerPath, "utf-8");
    const composer = JSON.parse(content) as Record<string, unknown>;

    const requires = composer.require as Record<string, unknown> | undefined;
    return !!(requires?.["livewire/livewire"] || requires?.livewire);
  } catch {
    return false;
  }
}

/**
 * Checks if Laravel project uses Alpine.js
 */
function detectAlpine(projectRoot: string): boolean {
  try {
    // Check package.json for Alpine.js
    const packageJsonPath = join(projectRoot, "package.json");
    if (existsSync(packageJsonPath)) {
      const content = readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content) as Record<string, unknown>;

      const devDeps = pkg.devDependencies as
        | Record<string, unknown>
        | undefined;
      const deps = pkg.dependencies as Record<string, unknown> | undefined;

      if (devDeps?.["alpinejs"] || deps?.["alpinejs"]) {
        return true;
      }
    }

    // Check for Alpine.js in JavaScript/blade files (common patterns)
    const resourcesPath = join(projectRoot, "resources");
    if (existsSync(resourcesPath)) {
      try {
        const layoutFile = join(resourcesPath, "views", "app.blade.php");
        if (existsSync(layoutFile)) {
          const content = readFileSync(layoutFile, "utf-8");
          if (/alpine|x-data|@click|x-show/i.test(content)) {
            return true;
          }
        }
      } catch {
        // Continue if file read fails
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Laravel Framework Integration
 */
export class LaravelIntegration extends BaseBackendIntegration {
  readonly id = "laravel";
  readonly name = "Laravel";
  readonly framework = "laravel" as const;
  readonly language = "php" as const;

  private config: LaravelConfig;

  constructor(projectRoot: string, config?: Partial<LaravelConfig>) {
    super();
    this.config = {
      projectRoot,
      csrfProtection: true,
      isLivewire: detectLivewire(projectRoot),
      isAlpine: detectAlpine(projectRoot),
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

    // Quick negative case: Lumen is not Laravel
    if (hasLumenDependency(projectRoot)) {
      return {
        detected: false,
        framework: null,
        language: null,
        confidence: "low",
        indicators: ["composer.json: laravel/lumen-framework"],
      };
    }

    // Check for Laravel indicators
    const hasComposerJson = existsSync(join(projectRoot, "composer.json"));
    const hasArtisan = existsSync(join(projectRoot, "artisan"));
    const hasConfig = existsSync(join(projectRoot, "config"));
    const hasApp = existsSync(join(projectRoot, "app"));
    const hasRoutes = existsSync(join(projectRoot, "routes"));
    const hasEnvExample = existsSync(join(projectRoot, ".env.example"));

    if (!hasComposerJson || !hasLaravelDependency(projectRoot)) {
      return {
        detected: false,
        framework: null,
        language: null,
        confidence: "low",
        indicators: [],
      };
    }

    const version = detectLaravelVersion(projectRoot);
    const isSPA = detectSPAMode(projectRoot);
    const isLivewire = detectLivewire(projectRoot);

    this.config = {
      ...this.config,
      version: version ?? undefined,
      isSPA,
      isLivewire,
    };

    const indicators = [
      "composer.json: laravel/framework",
      hasArtisan && "artisan",
      hasConfig && "config/",
      hasApp && "app/",
      hasRoutes && "routes/",
      hasEnvExample && ".env.example",
      isSPA && "SPA mode (Vue/React/Inertia)",
      isLivewire && "Livewire",
      this.config.isAlpine && "Alpine.js",
    ].filter(Boolean) as string[];

    const indicatorCount = indicators.length;
    const confidence =
      indicatorCount >= 4 ? "high" : indicatorCount >= 2 ? "medium" : "low";

    return {
      detected: true,
      framework: "laravel",
      language: "php",
      confidence,
      indicators,
      versions: version ? [version] : undefined,
    };
  };

  /**
   * Generate service worker configuration for Laravel
   */
  generateServiceWorkerConfig(): ServiceWorkerConfig {
    const isSPA = this.config.isSPA ?? false;
    const isLivewire = this.config.isLivewire ?? false;
    const isAlpine = this.config.isAlpine ?? false;

    const staticRoutes = [
      {
        pattern: "*.{js,css,woff,woff2,ttf,otf}",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 10,
        description: "JavaScript, CSS, and font files",
      },
      {
        pattern: "/build/**",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 9,
        description: "Vite build assets",
      },
      {
        pattern: "/storage/**",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 8,
        description: "Stored user uploads",
      },
      {
        pattern: "/vendor/**",
        strategy: PRESET_STRATEGIES.StaticAssets,
        priority: 7,
        description: "Vendor assets",
      },
    ];

    const apiRoutes = [
      {
        pattern: "/api/**",
        strategy: PRESET_STRATEGIES.ApiEndpoints,
        priority: 20,
        description: "REST API endpoints",
      },
      {
        pattern: "/graphql",
        strategy: PRESET_STRATEGIES.ApiEndpoints,
        priority: 20,
        description: "GraphQL endpoint",
      },
    ];

    const imageRoutes = [
      {
        pattern: "*.{png,jpg,jpeg,svg,webp,gif,ico}",
        strategy: PRESET_STRATEGIES.Images,
        priority: 5,
        description: "Image files",
      },
    ];

    const customRoutes = [];

    // Add Livewire routes with NetworkFirst strategy (for AJAX)
    if (isLivewire) {
      customRoutes.push({
        pattern: "/livewire/**",
        strategy: {
          name: "NetworkFirst" as const,
          cacheName: "laravel-livewire-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 600, // 10 minutes
          },
        },
        priority: 15,
        description: "Livewire AJAX endpoints",
      });
    }

    // Add Alpine.js component routes with NetworkFirst strategy
    // Alpine.js uses lightweight AJAX calls that benefit from NetworkFirst
    if (isAlpine) {
      customRoutes.push({
        pattern: "/alpine/**",
        strategy: {
          name: "NetworkFirst" as const,
          cacheName: "laravel-alpine-cache",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 30,
            maxAgeSeconds: 300, // 5 minutes
          },
        },
        priority: 14,
        description: "Alpine.js component requests",
      });

      // Alpine directive XHR routes
      customRoutes.push({
        pattern: "/api/alpine/**",
        strategy: {
          name: "NetworkFirst" as const,
          cacheName: "laravel-alpine-api-cache",
          networkTimeoutSeconds: 2,
          expiration: {
            maxEntries: 40,
            maxAgeSeconds: 300, // 5 minutes
          },
        },
        priority: 14,
        description: "Alpine.js API endpoints",
      });
    }

    // Combination: Livewire + Alpine
    if (isLivewire && isAlpine) {
      customRoutes.push({
        pattern: "/*.x-**",
        strategy: {
          name: "NetworkFirst" as const,
          cacheName: "laravel-interactive-cache",
          networkTimeoutSeconds: 4,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 600,
          },
        },
        priority: 16,
        description: "Interactive component requests (Livewire + Alpine)",
      });
    }

    return {
      destination: "public/sw.js",
      staticRoutes,
      apiRoutes,
      imageRoutes,
      customRoutes: customRoutes.length > 0 ? customRoutes : undefined,
      features: isSPA ? { hydration: true } : undefined,
    };
  }

  /**
   * Generate manifest variables specific to Laravel
   */
  generateManifestVariables(): Record<string, string | number> {
    const appName = this.getAppName();
    const shortName = appName.replace(/\s+/g, " ").trim().slice(0, 12);
    return {
      name: appName,
      short_name: shortName.length > 0 ? shortName : "App",
      description: "Progressive Web Application built with Laravel",
      start_url: "/",
      scope: "/",
      display: "standalone",
      theme_color: "#3B82F6",
      background_color: "#FFFFFF",
      orientation: "portrait-primary",
    };
  }

  getStartUrl(): string {
    return "/";
  }

  /**
   * Generate middleware code for PWA injection
   */
  injectMiddleware() {
    const code = `<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Http\\Response;

class PWAMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Add PWA headers
        $response->header('Service-Worker-Allowed', '/');
        
        // Cache manifest and service worker appropriately
        if ($request->is('manifest.json')) {
            $response->header('Cache-Control', 'public, max-age=3600');
            $response->header('Content-Type', 'application/manifest+json');
        }
        
        if ($request->is('sw.js')) {
            $response->header('Cache-Control', 'public, max-age=3600');
            $response->header('Content-Type', 'application/javascript');
        }

        // Add CSRF token to response for PWA clients
        $response->header('X-CSRF-Token', csrf_token());

        return $response;
    }
}
`;

    return {
      code,
      path: "app/Http/Middleware/PWAMiddleware.php",
      language: this.language,
      instructions: [
        "Register middleware in app/Http/Kernel.php:",
        "Add to $middleware array: \\App\\Http\\Middleware\\PWAMiddleware::class,",
        "Or add to routes in routes/web.php: Route::middleware('pwa')->group(...)",
      ],
    };
  }

  /**
   * Get secure routes that should NOT be cached
   */
  getSecureRoutes(): string[] {
    return [
      "/login",
      "/register",
      "/logout",
      "/password/reset",
      "/password/confirm",
      "/verify-email",
      "/api/auth/**",
      "/admin/**",
      "/dashboard/**",
    ];
  }

  /**
   * Get API pattern routes for intelligent caching
   */
  getApiPatterns(): string[] {
    const patterns = ["/api/**", "/graphql"];

    if (this.config.isLivewire) {
      patterns.push("/livewire/**");
    }

    if (this.config.isAlpine) {
      patterns.push("/alpine/**", "/api/alpine/**");
    }

    return patterns;
  }

  /**
   * Get interactive framework configuration (Livewire + Alpine)
   */
  getInteractiveFrameworks(): { livewire: boolean; alpine: boolean } {
    return {
      livewire: this.config.isLivewire ?? false,
      alpine: this.config.isAlpine ?? false,
    };
  }

  /**
   * Get static asset patterns
   */
  getStaticAssetPatterns(): string[] {
    return [
      "*.{js,css,woff,woff2,ttf,otf}",
      "/storage/**",
      "/images/**",
      "*.{png,jpg,jpeg,svg,webp,gif,ico}",
    ];
  }

  /**
   * Validate Laravel setup for PWA readiness
   */
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

    // Check for manifest.json
    if (!existsSync(join(projectRoot, "public/manifest.json"))) {
      warnings.push("manifest.json not found in public directory");
      suggestions.push("Run: `npm run build` to generate manifest.json");
    }

    // Check for service worker
    if (!existsSync(join(projectRoot, "public/sw.js"))) {
      warnings.push("Service worker (sw.js) not found in public directory");
      suggestions.push("Run PWA generation tool to create service worker");
    }

    // Check for web.config or .htaccess (URL rewriting)
    const hasUrlRewrite =
      existsSync(join(projectRoot, "public/.htaccess")) ||
      existsSync(join(projectRoot, "public/web.config"));

    if (!hasUrlRewrite) {
      warnings.push("URL rewrite configuration not found");
      suggestions.push(
        "Ensure your web server properly routes requests to index.php",
      );
    }

    // Check for PWAMiddleware
    if (
      !existsSync(join(projectRoot, "app/Http/Middleware/PWAMiddleware.php"))
    ) {
      suggestions.push(
        "Consider registering PWAMiddleware for optimal PWA support",
      );
    }

    // Check for offline view
    if (!existsSync(join(projectRoot, "resources/views/offline.blade.php"))) {
      warnings.push("Offline fallback view not found");
      suggestions.push(
        "Create resources/views/offline.blade.php for offline experience",
      );
    }

    return Promise.resolve({
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    });
  }

  private getAppName(): string {
    if (process.env.APP_NAME) {
      return process.env.APP_NAME;
    }

    try {
      const composerPath = join(this.config.projectRoot, "composer.json");
      if (!existsSync(composerPath)) {
        return "Laravel App";
      }

      const content = readFileSync(composerPath, "utf-8");
      const composer = JSON.parse(content) as Record<string, unknown>;
      const name = typeof composer.name === "string" ? composer.name : "";
      if (!name) {
        return "Laravel App";
      }

      const parts = name.split("/");
      return parts[1] ? parts[1].replace(/[-_]/g, " ") : name;
    } catch {
      return "Laravel App";
    }
  }
}

/**
 * Create Laravel integration instance
 */
export function createLaravelIntegration(
  projectRoot: string,
): LaravelIntegration {
  return new LaravelIntegration(projectRoot);
}
