/**
 * Shared SPA detection (Vite, package.json) for PHP backends (Symfony, Laravel).
 * Single source to avoid duplication; each backend can add its own checks (e.g. Webpack Encore).
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export interface SPADetectorOptions {
  /** Substrings to look for in vite.config content (e.g. vue, react, inertia) */
  viteIncludes?: string[];
  /** package.json dependency keys (dependencies + devDependencies) */
  packageKeys?: string[];
}

const DEFAULT_VITE_INCLUDES = ["vue", "react"];
const DEFAULT_PACKAGE_KEYS = ["vue", "react"];

/**
 * Detects SPA mode from Vite config and/or package.json.
 * Used by Symfony and Laravel to avoid duplicating Vite/package.json logic.
 */
export function detectSPAFromViteAndPackage(
  projectRoot: string,
  options: SPADetectorOptions = {},
): boolean {
  const viteIncludes = options.viteIncludes ?? DEFAULT_VITE_INCLUDES;
  const packageKeys = options.packageKeys ?? DEFAULT_PACKAGE_KEYS;

  try {
    const vitePath =
      existsSync(join(projectRoot, "vite.config.ts"))
        ? join(projectRoot, "vite.config.ts")
        : existsSync(join(projectRoot, "vite.config.js"))
          ? join(projectRoot, "vite.config.js")
          : existsSync(join(projectRoot, "vite.config.mjs"))
            ? join(projectRoot, "vite.config.mjs")
            : null;
    if (vitePath) {
      const viteContent = readFileSync(vitePath, "utf-8");
      if (viteIncludes.some((s) => viteContent.includes(s))) {
        return true;
      }
    }

    const packagePath = join(projectRoot, "package.json");
    if (existsSync(packagePath)) {
      const content = readFileSync(packagePath, "utf-8");
      const pkg = JSON.parse(content) as Record<string, unknown>;
      const deps = (pkg.dependencies as Record<string, unknown>) ?? {};
      const devDeps = (pkg.devDependencies as Record<string, unknown>) ?? {};
      if (packageKeys.some((key) => deps[key] !== undefined || devDeps[key] !== undefined)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
