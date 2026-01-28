/**
 * BasePath Auto-Detection Module
 *
 * Safely detects basePath from project configuration without executing code.
 * Best-effort detection with confidence scoring.
 *
 * Security first: Never requires/executes config files, uses regex patterns only.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface DetectionResult {
  /** Detected basePath (e.g., "/app", "/api/v1") */
  basePath: string | null;
  /** Confidence level (0-1): 1 = certain, 0.5 = moderate, 0 = not detected */
  confidence: number;
  /** Detection method used */
  method: "vite" | "next" | "django" | "webpack" | "custom" | null;
  /** Raw value found (before normalization) */
  rawValue?: string;
  /** File where it was found */
  sourceFile?: string;
}

/**
 * Detect basePath from common framework configurations
 *
 * Safe detection that:
 * - Never executes code (no require/import)
 * - Uses only regex patterns
 * - Returns confidence scores
 * - Never modifies or corrupts files
 *
 * @param projectPath Root project directory
 * @returns Detection result with confidence
 */
export function detectBasePath(projectPath: string): DetectionResult {
  // Try detection methods in order of confidence
  const results: DetectionResult[] = [
    detectFromViteConfig(projectPath),
    detectFromNextConfig(projectPath),
    detectFromDjangoSettings(projectPath),
    detectFromWebpackConfig(projectPath),
    detectFromCustomUniversalPWAConfig(projectPath),
  ].filter((r) => r.basePath !== null);

  // Return highest confidence result
  if (results.length === 0) {
    return {
      basePath: null,
      confidence: 0,
      method: null,
    };
  }

  return results.reduce((best, current) =>
    current.confidence > best.confidence ? current : best,
  );
}

/**
 * Detect from Vite config (base option)
 */
function detectFromViteConfig(projectPath: string): DetectionResult {
  const configFiles = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mts",
    "vite.config.mjs",
  ];

  for (const file of configFiles) {
    const filePath = join(projectPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");

        // Match: base: '/app', base: "/app", base: '/app/'
        const baseMatch = content.match(/base\s*:\s*['"]([^'"]+)['"]/);
        if (baseMatch && baseMatch[1]) {
          const rawValue = baseMatch[1];
          return {
            basePath: rawValue,
            confidence: 0.95,
            method: "vite",
            rawValue,
            sourceFile: file,
          };
        }

        // Match: export default { base: ... }
        const exportMatch = content.match(
          /export\s+default\s+{[\s\S]*?base\s*:\s*['"]([^'"]+)['"]/,
        );
        if (exportMatch && exportMatch[1]) {
          const rawValue = exportMatch[1];
          return {
            basePath: rawValue,
            confidence: 0.92,
            method: "vite",
            rawValue,
            sourceFile: file,
          };
        }
      } catch {
        // File read error, continue to next method
        continue;
      }
    }
  }

  return { basePath: null, confidence: 0, method: null };
}

/**
 * Detect from Next.js config (basePath option)
 */
function detectFromNextConfig(projectPath: string): DetectionResult {
  const configFiles = ["next.config.ts", "next.config.js", "next.config.mjs"];

  for (const file of configFiles) {
    const filePath = join(projectPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");

        // Match: basePath: '/app', basePath: "/app"
        const pathMatch = content.match(/basePath\s*:\s*['"]([^'"]+)['"]/);
        if (pathMatch && pathMatch[1]) {
          const rawValue = pathMatch[1];
          return {
            basePath: rawValue,
            confidence: 0.95,
            method: "next",
            rawValue,
            sourceFile: file,
          };
        }
      } catch {
        // File read error, continue to next method
        continue;
      }
    }
  }

  return { basePath: null, confidence: 0, method: null };
}

/**
 * Detect from Django settings (if present)
 */
function detectFromDjangoSettings(projectPath: string): DetectionResult {
  const settingsFile = join(projectPath, "settings.py");

  if (existsSync(settingsFile)) {
    try {
      const content = readFileSync(settingsFile, "utf-8");

      // Django apps might use FORCE_SCRIPT_NAME or PWA_BASE_PATH
      const forceMatch = content.match(
        /FORCE_SCRIPT_NAME\s*=\s*['"']([^'"']*)['"']/,
      );
      if (forceMatch && forceMatch[1]) {
        const rawValue = forceMatch[1];
        return {
          basePath: rawValue,
          confidence: 0.8,
          method: "django",
          rawValue,
          sourceFile: "settings.py",
        };
      }

      // Custom PWA_BASE_PATH (universal-pwa convention)
      const pwaMatch = content.match(/PWA_BASE_PATH\s*=\s*['"']([^'"']*)['"']/);
      if (pwaMatch && pwaMatch[1]) {
        const rawValue = pwaMatch[1];
        return {
          basePath: rawValue,
          confidence: 0.9,
          method: "django",
          rawValue,
          sourceFile: "settings.py",
        };
      }
    } catch {
      // File read error, continue to next method
      // Do nothing
    }
  }

  return { basePath: null, confidence: 0, method: null };
}

/**
 * Detect from webpack config
 */
function detectFromWebpackConfig(projectPath: string): DetectionResult {
  const configFiles = [
    "webpack.config.ts",
    "webpack.config.js",
    "webpack.config.mjs",
  ];

  for (const file of configFiles) {
    const filePath = join(projectPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");

        // Match: publicPath: '/app', publicPath: "/app"
        const pathMatch = content.match(/publicPath\s*:\s*['"]([^'"]+)['"]/);
        if (pathMatch && pathMatch[1]) {
          const rawValue = pathMatch[1];
          return {
            basePath: rawValue,
            confidence: 0.85,
            method: "webpack",
            rawValue,
            sourceFile: file,
          };
        }
      } catch {
        // File read error, continue to next method
        continue;
      }
    }
  }

  return { basePath: null, confidence: 0, method: null };
}

/**
 * Detect from universal-pwa custom config comments
 * (convention: universal-pwa-base-path: /app in HTML or manifest)
 */
function detectFromCustomUniversalPWAConfig(
  projectPath: string,
): DetectionResult {
  // Check for marker in package.json universal-pwa field
  const packageJsonPath = join(projectPath, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const content = readFileSync(packageJsonPath, "utf-8");
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const pkg = JSON.parse(content);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (pkg["universal-pwa"]?.basePath) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        const rawValue = pkg["universal-pwa"].basePath;
        // Validate it's a string
        if (typeof rawValue === "string") {
          return {
            basePath: rawValue,
            confidence: 0.9,
            method: "custom",
            rawValue,
            sourceFile: "package.json",
          };
        }
      }
    } catch {
      // JSON parse error or read error, continue
      // Do nothing
    }
  }

  return { basePath: null, confidence: 0, method: null };
}

/**
 * Filter result based on minimum confidence threshold
 *
 * @param result Detection result
 * @param minConfidence Minimum acceptable confidence (0-1)
 * @returns Result or null if below threshold
 */
export function filterByConfidence(
  result: DetectionResult,
  minConfidence: number = 0.8,
): DetectionResult | null {
  if (result.confidence >= minConfidence) {
    return result;
  }
  return null;
}

/**
 * Format detection result for CLI output
 *
 * @param result Detection result
 * @returns Human-readable message
 */
export function formatDetectionResult(result: DetectionResult): string {
  if (result.basePath === null) {
    return "No basePath detected (will use default: /)";
  }

  const confidence = Math.round(result.confidence * 100);
  const method = result.method || "unknown";
  const source = result.sourceFile ? ` (${result.sourceFile})` : "";

  return `Detected basePath: "${result.basePath}" (${confidence}% confidence, from ${method})${source}`;
}

/**
 * Get suggestion message for user
 *
 * @param result Detection result
 * @returns Suggestion message or null if confident
 */
export function getSuggestionMessage(result: DetectionResult): string | null {
  if (result.confidence >= 0.9) {
    return null; // High confidence, no suggestion needed
  }

  if (result.basePath === null) {
    return "No basePath detected. If you're deploying under a subpath, use --base-path flag (e.g., --base-path /app/)";
  }

  if (result.confidence >= 0.7) {
    return `Low confidence detection (${Math.round(result.confidence * 100)}%). Detected "${result.basePath}" but verify this is correct. Use --base-path flag to override.`;
  }

  return "Very low confidence detection. If you're deploying under a subpath, use --base-path flag (e.g., --base-path /app/)";
}
