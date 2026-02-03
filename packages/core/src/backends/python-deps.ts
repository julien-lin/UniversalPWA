/**
 * Shared helpers for Python backend detection (Django, Flask).
 * Single source for requirements.txt and pyproject.toml parsing to avoid duplication.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Detects package version from requirements.txt or pyproject.toml.
 * Used by Django and Flask integrations.
 */
export function getPythonPackageVersion(
  projectRoot: string,
  packageName: string,
): string | null {
  const reqName = packageName.replace(/-/g, "[-_]");
  const reqRegex = new RegExp(
    `${reqName}[>=<~!]*(\d+)(?:\\.(\d+))?(?:\\.(\d+))?`,
    "i",
  );
  const pyprojectName = packageName.toLowerCase().replace(/-/g, "_");
  const pyprojectRegex = new RegExp(
    `${pyprojectName}\\s*=\\s*["']?[>=<~!]*(\\d+)(?:\\.(\\d+))?(?:\\.(\\d+))?`,
    "i",
  );

  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      const match = content.match(reqRegex);
      if (match) {
        const major = match[1] ?? "0";
        const minor = match[2] ?? "0";
        const patch = match[3] ?? "0";
        return `${major}.${minor}.${patch}`;
      }
    }
  } catch {
    // Continue
  }

  try {
    const pyprojectPath = join(projectRoot, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, "utf-8");
      const match = content.match(pyprojectRegex);
      if (match) {
        const major = match[1] ?? "0";
        const minor = match[2] ?? "0";
        const patch = match[3] ?? "0";
        return `${major}.${minor}.${patch}`;
      }
    }
  } catch {
    // Return null
  }

  return null;
}

/**
 * Checks if a Python package is listed in requirements.txt or pyproject.toml.
 */
export function hasPythonPackage(
  projectRoot: string,
  packageName: string,
): boolean {
  try {
    const requirementsPath = join(projectRoot, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const content = readFileSync(requirementsPath, "utf-8");
      if (new RegExp(packageName.replace(/-/g, "[-_]"), "i").test(content)) {
        return true;
      }
    }

    const pyprojectPath = join(projectRoot, "pyproject.toml");
    if (existsSync(pyprojectPath)) {
      const content = readFileSync(pyprojectPath, "utf-8");
      if (
        new RegExp(packageName.toLowerCase().replace(/-/g, "_"), "i").test(
          content,
        )
      ) {
        return true;
      }
    }
  } catch {
    // no-op
  }
  return false;
}
