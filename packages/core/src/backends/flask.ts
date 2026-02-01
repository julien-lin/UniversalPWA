/**
 * Flask Framework Integration
 *
 * Detects and configures PWA for Flask applications.
 * Supported features:
 * - Flask 1.x, 2.x, 3.x
 * - Static files configuration
 * - Blueprint detection
 * - CSRF token handling (Flask-WTF)
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { BackendDetectionResult, BackendLanguage } from "./types.js";
import type { ServiceWorkerConfig } from "../generator/caching-strategy.js";
import { PRESET_STRATEGIES } from "../generator/caching-strategy.js";
import { BaseBackendIntegration } from "./base.js";

export interface FlaskConfig {
  projectRoot: string;
  version?: string;
  staticUrl?: string;
  staticFolder?: string;
  hasFlaskWTF?: boolean;
  hasFlaskRESTful?: boolean;
  blueprints?: FlaskBlueprint[];
}

/**
 * Detected Flask Blueprint
 */
export interface FlaskBlueprint {
  name: string;
  prefix?: string;
  folder: string;
  routes: string[];
}

/**
 * Detects Flask version from requirements.txt or pyproject.toml
 */
function detectFlaskVersion(projectRoot: string): string | null {
  // Try requirements.txt first
  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      // Match patterns like: Flask==3.0.0, Flask>=2.0, Flask~=3.0
      const match = content.match(
        /Flask[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i,
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
      // Match Flask in dependencies
      const match = content.match(
        /flask\s*=\s*["']?[>=<~!]*(\d+)(?:\.(\d+))?(?:\.(\d+))?/i,
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

function hasFlaskDependency(projectRoot: string): boolean {
  try {
    // Check requirements.txt
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      if (/Flask/i.test(content)) {
        return true;
      }
    }

    // Check pyproject.toml
    const pyprojectPath = join(projectRoot, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, "utf-8");
      if (/flask/i.test(content)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects Flask-WTF (CSRF protection)
 */
function detectFlaskWTF(projectRoot: string): boolean {
  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      if (/Flask-WTF|flask-wtf/i.test(content)) {
        return true;
      }
    }

    // Check app.py or application.py for Flask-WTF usage
    const appFiles = ["app.py", "application.py"];
    for (const file of appFiles) {
      const appPath = join(projectRoot, file);
      if (existsSync(appPath)) {
        const content = readFileSync(appPath, "utf-8");
        if (/from flask_wtf|import FlaskForm|CSRFProtect/i.test(content)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects Flask-RESTful
 */
function detectFlaskRESTful(projectRoot: string): boolean {
  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      if (/Flask-RESTful|flask-restful/i.test(content)) {
        return true;
      }
    }

    // Check app.py or application.py for Flask-RESTful usage
    const appFiles = ["app.py", "application.py"];
    for (const file of appFiles) {
      const appPath = join(projectRoot, file);
      if (existsSync(appPath)) {
        const content = readFileSync(appPath, "utf-8");
        if (/from flask_restful|import Api|import Resource/i.test(content)) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Detects Flask Blueprints in the project
 */
function detectBlueprints(projectRoot: string): FlaskBlueprint[] {
  const blueprints: FlaskBlueprint[] = [];

  try {
    // Look for blueprint folders (common patterns)
    const potentialBlueprintDirs = [
      "blueprints",
      "routes",
      "apps",
      "modules",
      "features",
    ];

    for (const dir of potentialBlueprintDirs) {
      const blueprintPath = join(projectRoot, dir);
      if (existsSync(blueprintPath)) {
        try {
          const entries = readdirSync(blueprintPath, {
            withFileTypes: true,
          });

          for (const entry of entries) {
            if (
              entry.isDirectory() &&
              !entry.name.startsWith("_") &&
              !entry.name.startsWith(".")
            ) {
              const blueprintFile = join(
                blueprintPath,
                entry.name,
                "__init__.py",
              );
              if (existsSync(blueprintFile)) {
                const content = readFileSync(blueprintFile, "utf-8");

                // Extract blueprint name
                const blueprintNameMatch = content.match(
                  /Blueprint\s*\(\s*['"]([^'"]+)['"]/,
                );
                const blueprintName = blueprintNameMatch?.[1] || entry.name;

                // Extract blueprint URL prefix
                const urlPrefixMatch = content.match(
                  /url_prefix\s*=\s*['"]([^'"]+)['"]/,
                );
                const prefix = urlPrefixMatch?.[1];

                // Extract routes from the blueprint
                const routeMatches = content.match(
                  /@bp\.route\s*\(\s*['"]([^'"]+)['"]/g,
                );
                const routes =
                  routeMatches?.map(
                    (route) => route.match(/['"]([^'"]+)['"]/)?.[1] || "",
                  ) || [];

                blueprints.push({
                  name: blueprintName,
                  prefix,
                  folder: join(dir, entry.name),
                  routes,
                });
              }
            }
          }
        } catch {
          // Continue if directory read fails
        }
      }
    }
  } catch {
    // Return empty array on error
  }

  return blueprints;
}

/**
 * Extracts static folder configuration from Flask app
 */
function extractStaticFilesConfig(projectRoot: string): {
  staticUrl?: string;
  staticFolder?: string;
} {
  const result: { staticUrl?: string; staticFolder?: string } = {};

  try {
    const appFiles = ["app.py", "application.py"];
    for (const file of appFiles) {
      const appPath = join(projectRoot, file);
      if (existsSync(appPath)) {
        const content = readFileSync(appPath, "utf-8");

        // Extract static_folder from Flask app
        const staticFolderMatch = content.match(
          /static_folder\s*=\s*['"]([^'"]+)['"]/,
        );
        if (staticFolderMatch) {
          result.staticFolder = staticFolderMatch[1];
        }

        // Extract static_url_path
        const staticUrlMatch = content.match(
          /static_url_path\s*=\s*['"]([^'"]+)['"]/,
        );
        if (staticUrlMatch) {
          result.staticUrl = staticUrlMatch[1];
        }
      }
    }
  } catch {
    // Return empty result on error
  }

  return result;
}

/**
 * Flask Framework Integration
 */
export class FlaskIntegration extends BaseBackendIntegration {
  readonly id = "flask";
  readonly name = "Flask";
  readonly framework = "flask" as const;
  readonly language = "python" as const;

  private config: FlaskConfig;

  constructor(projectRoot: string, config?: Partial<FlaskConfig>) {
    super();
    const staticConfig = extractStaticFilesConfig(projectRoot);
    const blueprints = detectBlueprints(projectRoot);
    this.config = {
      projectRoot,
      hasFlaskWTF: detectFlaskWTF(projectRoot),
      hasFlaskRESTful: detectFlaskRESTful(projectRoot),
      staticUrl: staticConfig.staticUrl,
      staticFolder: staticConfig.staticFolder,
      blueprints,
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

    // Check for app.py or application.py (strong indicator)
    if (
      existsSync(join(projectRoot, "app.py")) ||
      existsSync(join(projectRoot, "application.py"))
    ) {
      indicators.push("app.py or application.py");
      confidence = "medium";
    }

    // Check for Flask dependency
    if (hasFlaskDependency(projectRoot)) {
      indicators.push("Flask dependency in requirements.txt or pyproject.toml");
      if (confidence === "medium") {
        confidence = "high";
      }
    }

    // Check for typical Flask structure
    if (
      existsSync(join(projectRoot, "templates")) ||
      existsSync(join(projectRoot, "static"))
    ) {
      indicators.push("Flask structure (templates/ or static/)");
      if (confidence === "medium") {
        confidence = "high";
      }
    }

    // Check for blueprints
    if (this.config.blueprints && this.config.blueprints.length > 0) {
      indicators.push(
        `Flask blueprints (${this.config.blueprints.length} detected)`,
      );
      if (confidence < "high") {
        confidence = "high";
      }
    }

    const version = detectFlaskVersion(projectRoot);

    return {
      detected: indicators.length > 0,
      framework: "flask",
      language: "python",
      confidence,
      indicators,
      versions: version ? [version] : undefined,
    };
  };

  /**
   * Generate Flask-optimized Service Worker configuration
   */
  generateServiceWorkerConfig(): ServiceWorkerConfig {
    const staticRoutes = [
      {
        pattern: "/static/**",
        strategy: {
          ...PRESET_STRATEGIES.StaticAssets,
          cacheName: "flask-static-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 86400 * 30, // 30 days
          },
        },
        priority: 10,
        description: "Flask static files",
      },
    ];

    const apiRoutes = [
      {
        pattern: "/api/**",
        strategy: {
          ...PRESET_STRATEGIES.ApiEndpoints,
          cacheName: "flask-api-cache",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 300, // 5 minutes
          },
        },
        priority: 20,
        description: "Flask API endpoints",
      },
    ];

    // Add blueprint routes with optimized caching
    if (this.config.blueprints && this.config.blueprints.length > 0) {
      for (const blueprint of this.config.blueprints) {
        const prefix = blueprint.prefix || `/${blueprint.name.toLowerCase()}`;

        // Blueprint routes pattern
        apiRoutes.push({
          pattern: `${prefix}/**`,
          strategy: {
            name: "NetworkFirst" as const,
            cacheName: `flask-blueprint-${blueprint.name}`,
            networkTimeoutSeconds: 2,
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 600, // 10 minutes
            },
          },
          priority: 15,
          description: `Flask blueprint: ${blueprint.name}`,
        });
      }
    }

    const imageRoutes = [
      {
        pattern: "*.{png,jpg,jpeg,svg,webp,gif}",
        strategy: {
          ...PRESET_STRATEGIES.Images,
          cacheName: "flask-images-cache",
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 86400 * 30, // 30 days
          },
        },
        priority: 5,
        description: "Flask images",
      },
    ];

    const customRoutes = this.config.hasFlaskWTF
      ? [
          {
            pattern: "/csrf-token/**",
            strategy: {
              name: "NetworkOnly" as const,
              cacheName: "flask-csrf-cache",
            },
            priority: 30,
            description: "CSRF token (always fresh)",
          },
        ]
      : [];

    return {
      destination: "sw.js",
      staticRoutes,
      apiRoutes,
      imageRoutes,
      customRoutes,
    };
  }

  /**
   * Generate manifest.json variables for Flask
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
   * Get recommended start URL for Flask PWA
   */
  getStartUrl(): string {
    return "/";
  }

  /**
   * Get secure routes that need CSRF/session protection
   */
  getSecureRoutes(): string[] {
    const routes = ["/api/auth/**", "/admin/**"];
    if (this.config.hasFlaskWTF) {
      routes.push("/csrf-token/**");
    }
    // Add blueprint routes that might need protection
    if (this.config.blueprints && this.config.blueprints.length > 0) {
      for (const blueprint of this.config.blueprints) {
        if (
          blueprint.name.toLowerCase().includes("admin") ||
          blueprint.name.toLowerCase().includes("auth")
        ) {
          const prefix = blueprint.prefix || `/${blueprint.name.toLowerCase()}`;
          routes.push(`${prefix}/**`);
        }
      }
    }
    return routes;
  }

  /**
   * Get detected blueprints
   */
  getBlueprints(): FlaskBlueprint[] {
    return this.config.blueprints || [];
  }

  /**
   * Get API endpoint patterns
   */
  getApiPatterns(): string[] {
    const patterns = ["/api/**"];

    // Add blueprint patterns
    if (this.config.blueprints && this.config.blueprints.length > 0) {
      for (const blueprint of this.config.blueprints) {
        const prefix = blueprint.prefix || `/${blueprint.name.toLowerCase()}`;
        patterns.push(`${prefix}/**`);
      }
    }

    if (this.config.hasFlaskRESTful) {
      patterns.push("/api/v1/**", "/api/v2/**");
    }
    return patterns;
  }

  /**
   * Get static asset patterns
   */
  getStaticAssetPatterns(): string[] {
    const patterns = ["/static/**"];
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
   * Validate Flask-specific PWA setup
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

    // Check for app.py or application.py
    if (
      !existsSync(join(projectRoot, "app.py")) &&
      !existsSync(join(projectRoot, "application.py"))
    ) {
      warnings.push("app.py or application.py not found");
    }

    // Check for static folder
    if (!existsSync(join(projectRoot, "static"))) {
      suggestions.push("Consider creating a static/ folder for static assets");
    }

    // Check for templates folder
    if (!existsSync(join(projectRoot, "templates"))) {
      suggestions.push(
        "Consider creating a templates/ folder for Jinja2 templates",
      );
    }

    // Suggest Flask-WTF for CSRF protection
    if (!this.config.hasFlaskWTF) {
      suggestions.push(
        "Consider using Flask-WTF for CSRF protection in production",
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
   * Inject middleware code for Flask
   */
  injectMiddleware(): {
    code: string;
    path: string;
    language: BackendLanguage;
    instructions: string[];
  } {
    let code = `# Add PWA support to Flask app
from flask import Flask, send_from_directory

app = Flask(__name__)

# Serve PWA manifest and service worker
@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')`;

    // Add blueprint imports if blueprints detected
    if (this.config.blueprints && this.config.blueprints.length > 0) {
      code += "\n\n# Register Flask blueprints\n";
      for (const blueprint of this.config.blueprints) {
        const blueprintModule = blueprint.folder.replace(/\//g, ".");
        code += `from ${blueprintModule} import bp as ${blueprint.name}_bp\n`;
      }
      code += "\n";
      for (const blueprint of this.config.blueprints) {
        const prefix = blueprint.prefix || `/${blueprint.name.toLowerCase()}`;
        code += `app.register_blueprint(${blueprint.name}_bp, url_prefix='${prefix}')\n`;
      }
    }

    code += `

# Ensure HTTPS in production
if __name__ == '__main__':
    app.run(ssl_context='adhoc' if app.debug else None)`;

    const instructions: string[] = [
      "Add PWA routes to your Flask app",
      "Place manifest.json and sw.js in the static/ folder",
      "Ensure HTTPS is enabled in production",
      "Consider using Flask-WTF for CSRF protection",
    ];

    if (this.config.blueprints && this.config.blueprints.length > 0) {
      instructions.push(
        `Register ${this.config.blueprints.length} Blueprint(s) to enable optimized caching`,
      );
    }

    return {
      code,
      path: "app.py",
      language: "python" as BackendLanguage,
      instructions,
    };
  }
}
