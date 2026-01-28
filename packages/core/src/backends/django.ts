/**
 * Django Framework Integration
 *
 * Detects and configures PWA for Django applications.
 * Supported features:
 * - Django 2.2, 3.x, 4.x, 5.x
 * - ASGI support detection
 * - Static files configuration
 * - CSRF token handling
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { BackendDetectionResult, BackendLanguage } from "./types.js";
import type { ServiceWorkerConfig } from "../generator/caching-strategy.js";
import { PRESET_STRATEGIES } from "../generator/caching-strategy.js";
import { BaseBackendIntegration } from "./base.js";

export interface DjangoConfig {
  projectRoot: string;
  version?: string;
  isASGI?: boolean;
  staticUrl?: string;
  staticRoot?: string;
  hasAPIRestFramework?: boolean;
}

/**
 * Detects Django version from requirements.txt or pyproject.toml
 */
function detectDjangoVersion(projectRoot: string): string | null {
  // Try requirements.txt first
  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      // Match patterns like: Django==4.2.0, Django>=4.0, Django~=4.2
      const match = content.match(
        /Django[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i,
      );
      if (match) {
        const major = match[1] ?? "0";
        const minor = match[2] ?? "0";
        const patch = match[3] ?? "0";
        return `${major}.${minor}.${patch}`;
      }
    }
  } catch {
    // Continue to next method
  }

  // Try pyproject.toml
  try {
    const pyprojectPath = join(projectRoot, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, "utf-8");
      // Match Django in dependencies
      const match = content.match(
        /django\s*=\s*["']?[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i,
      );
      if (match) {
        const major = match[1] ?? "0";
        const minor = match[2] ?? "0";
        const patch = match[3] ?? "0";
        return `${major}.${minor}.${patch}`;
      }
    }
  } catch {
    // Return null if both methods fail
  }

  return null;
}

function hasDjangoDependency(projectRoot: string): boolean {
  try {
    // Check requirements.txt
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      if (/Django/i.test(content)) {
        return true;
      }
    }

    // Check pyproject.toml
    const pyprojectPath = join(projectRoot, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, "utf-8");
      if (/django/i.test(content)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects if Django project uses ASGI (vs WSGI)
 */
function detectASGI(projectRoot: string): boolean {
  try {
    // Check for asgi.py file
    if (existsSync(join(projectRoot, "asgi.py"))) {
      return true;
    }

    // Check for ASGI config in settings
    const settingsPath = join(projectRoot, "settings.py");
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf-8");
      if (/ASGI_APPLICATION/i.test(content)) {
        return true;
      }
    }

    // Check for settings/ directory with ASGI_APPLICATION
    const settingsDir = join(projectRoot, "settings");
    if (existsSync(settingsDir)) {
      // Try to find ASGI_APPLICATION in any settings file
      const files = readdirSync(settingsDir);
      for (const file of files) {
        if (file.endsWith(".py")) {
          const content = readFileSync(join(settingsDir, file), "utf-8");
          if (/ASGI_APPLICATION/i.test(content)) {
            return true;
          }
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects Django REST Framework
 */
function detectDjangoRESTFramework(projectRoot: string): boolean {
  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      if (/djangorestframework|django-rest-framework/i.test(content)) {
        return true;
      }
    }

    // Check settings.py for INSTALLED_APPS
    const settingsPath = join(projectRoot, "settings.py");
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf-8");
      if (/rest_framework/i.test(content)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Extracts STATIC_URL and STATIC_ROOT from settings.py
 */
function extractStaticFilesConfig(projectRoot: string): {
  staticUrl?: string;
  staticRoot?: string;
} {
  const result: { staticUrl?: string; staticRoot?: string } = {};

  try {
    const settingsPath = join(projectRoot, "settings.py");
    if (existsSync(settingsPath)) {
      const content = readFileSync(settingsPath, "utf-8");

      // Extract STATIC_URL
      const staticUrlMatch = content.match(/STATIC_URL\s*=\s*['"]([^'"]+)['"]/);
      if (staticUrlMatch) {
        result.staticUrl = staticUrlMatch[1];
      }

      // Extract STATIC_ROOT
      const staticRootMatch = content.match(
        /STATIC_ROOT\s*=\s*['"]([^'"]+)['"]/,
      );
      if (staticRootMatch) {
        result.staticRoot = staticRootMatch[1];
      }
    }

    // Check settings/ directory
    const settingsDir = join(projectRoot, "settings");
    if (existsSync(settingsDir)) {
      const files = readdirSync(settingsDir);
      for (const file of files) {
        if (file.endsWith(".py")) {
          const content = readFileSync(join(settingsDir, file), "utf-8");

          if (!result.staticUrl) {
            const staticUrlMatch = content.match(
              /STATIC_URL\s*=\s*['"]([^'"]+)['"]/,
            );
            if (staticUrlMatch) {
              result.staticUrl = staticUrlMatch[1];
            }
          }

          if (!result.staticRoot) {
            const staticRootMatch = content.match(
              /STATIC_ROOT\s*=\s*['"]([^'"]+)['"]/,
            );
            if (staticRootMatch) {
              result.staticRoot = staticRootMatch[1];
            }
          }
        }
      }
    }
  } catch {
    // Return empty result on error
  }

  return result;
}

/**
 * Django Framework Integration
 */
export class DjangoIntegration extends BaseBackendIntegration {
  readonly id = "django";
  readonly name = "Django";
  readonly framework = "django" as const;
  readonly language = "python" as const;

  private config: DjangoConfig;

  constructor(projectRoot: string, config?: Partial<DjangoConfig>) {
    super();
    const staticConfig = extractStaticFilesConfig(projectRoot);
    this.config = {
      projectRoot,
      isASGI: detectASGI(projectRoot),
      hasAPIRestFramework: detectDjangoRESTFramework(projectRoot),
      staticUrl: staticConfig.staticUrl,
      staticRoot: staticConfig.staticRoot,
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
    let confidence: "high" | "medium" | "low" = "low";

    // Check for manage.py (strong indicator)
    if (existsSync(join(projectRoot, "manage.py"))) {
      indicators.push("manage.py");
      confidence = "medium";
    }

    // Check for settings.py or settings/ directory
    if (
      existsSync(join(projectRoot, "settings.py")) ||
      existsSync(join(projectRoot, "settings"))
    ) {
      indicators.push("settings.py or settings/");
      if (confidence === "medium") {
        confidence = "high";
      }
    }

    // Check for urls.py
    if (existsSync(join(projectRoot, "urls.py"))) {
      indicators.push("urls.py");
      if (confidence === "medium") {
        confidence = "high";
      }
    }

    // Check for Django dependency
    if (hasDjangoDependency(projectRoot)) {
      indicators.push(
        "Django dependency in requirements.txt or pyproject.toml",
      );
      if (confidence === "medium") {
        confidence = "high";
      }
    }

    const version = detectDjangoVersion(projectRoot);

    return {
      detected: indicators.length > 0,
      framework: "django",
      language: "python",
      confidence,
      indicators,
      versions: version ? [version] : undefined,
    };
  };

  /**
   * Generate Django-optimized Service Worker configuration
   */
  generateServiceWorkerConfig(): ServiceWorkerConfig {
    const staticRoutes = [
      {
        pattern: "/static/**",
        strategy: {
          ...PRESET_STRATEGIES.StaticAssets,
          cacheName: "django-static-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 86400 * 30, // 30 days
          },
        },
        priority: 10,
        description: "Django static files",
      },
    ];

    const apiRoutes = [
      {
        pattern: "/api/**",
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          cacheName: "django-api-cache",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 300, // 5 minutes
          },
        },
        priority: 20,
        description: "Django API endpoints",
      },
    ];

    const imageRoutes = [
      {
        pattern: "/media/**",
        strategy: {
          ...PRESET_STRATEGIES.Images,
          cacheName: "django-media-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 86400 * 7, // 7 days
          },
        },
        priority: 5,
        description: "Django media files",
      },
    ];

    const customRoutes = [
      // Admin routes - NetworkOnly (always fresh)
      {
        pattern: "/admin/**",
        strategy: {
          name: "NetworkOnly" as const,
          cacheName: "django-admin-cache",
        },
        priority: 30,
        description: "Django admin (always fresh)",
      },
      // CSRF token route - NetworkOnly
      {
        pattern: "/csrf-token/**",
        strategy: {
          name: "NetworkOnly" as const,
          cacheName: "django-csrf-cache",
        },
        priority: 30,
        description: "CSRF token (always fresh)",
      },
    ];

    return {
      destination: "sw.js",
      staticRoutes,
      apiRoutes,
      imageRoutes,
      customRoutes,
    };
  }

  /**
   * Generate manifest.json variables for Django
   */
  generateManifestVariables(): Record<string, string | number> {
    return {
      start_url: this.getStartUrl(),
      scope: "/",
      display: "standalone",
      theme_color: "#ffffff",
      background_color: "#ffffff",
    };
  }

  /**
   * Get recommended start URL for Django PWA
   */
  getStartUrl(): string {
    return "/";
  }

  /**
   * Get secure routes that need CSRF/session protection
   */
  getSecureRoutes(): string[] {
    return ["/admin/**", "/api/auth/**", "/api/admin/**", "/dashboard/**"];
  }

  /**
   * Get API endpoint patterns
   */
  getApiPatterns(): string[] {
    const patterns = ["/api/**"];
    if (this.config.hasAPIRestFramework) {
      patterns.push("/api/v1/**", "/api/v2/**");
    }
    return patterns;
  }

  /**
   * Get static asset patterns
   */
  getStaticAssetPatterns(): string[] {
    const patterns = ["/static/**", "/media/**"];
    if (this.config.staticUrl) {
      // Remove leading/trailing slashes and add pattern
      const staticPath = this.config.staticUrl.replace(/^\/|\/$/g, "");
      if (staticPath && staticPath !== "static") {
        patterns.push(`/${staticPath}/**`);
      }
    }
    return patterns;
  }

  /**
   * Validate Django-specific PWA setup
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

    // Check for settings.py
    if (
      !existsSync(join(projectRoot, "settings.py")) &&
      !existsSync(join(projectRoot, "settings"))
    ) {
      errors.push("Django settings.py or settings/ directory not found");
    }

    // Check for static files configuration
    if (existsSync(join(projectRoot, "settings.py"))) {
      try {
        const content = readFileSync(join(projectRoot, "settings.py"), "utf-8");
        if (!/STATIC_URL/i.test(content)) {
          warnings.push("STATIC_URL not found in settings.py");
        }
        if (!/STATIC_ROOT/i.test(content)) {
          suggestions.push(
            "Consider setting STATIC_ROOT for production (used by collectstatic)",
          );
        }
      } catch {
        // Ignore read errors
      }
    }

    // Check for urls.py
    if (!existsSync(join(projectRoot, "urls.py"))) {
      warnings.push("urls.py not found in project root");
    }

    // Check for manage.py
    if (!existsSync(join(projectRoot, "manage.py"))) {
      errors.push("manage.py not found (required for Django projects)");
    }

    // Suggest ASGI if not detected
    if (!this.config.isASGI) {
      suggestions.push(
        "Consider using ASGI for better async support and WebSocket capabilities",
      );
    }

    return Promise.resolve({
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    });
  }

  /**
   * Inject middleware code for Django
   */
  injectMiddleware(): {
    code: string;
    path: string;
    language: BackendLanguage;
    instructions: string[];
  } {
    return {
      code: `# Add PWA middleware to Django settings.py
MIDDLEWARE = [
    # ... existing middleware ...
    'django.middleware.security.SecurityMiddleware',  # Required for HTTPS
    # ... rest of middleware ...
]

# Add PWA static files configuration
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# For PWA manifest and service worker
PWA_MANIFEST_PATH = STATIC_ROOT / 'manifest.json'
PWA_SW_PATH = STATIC_ROOT / 'sw.js'`,
      path: "settings.py",
      language: "python",
      instructions: [
        "Add PWA middleware configuration to settings.py",
        "Configure STATIC_URL and STATIC_ROOT",
        "Run python manage.py collectstatic to collect static files",
        "Ensure HTTPS is enabled in production",
      ],
    };
  }
}
