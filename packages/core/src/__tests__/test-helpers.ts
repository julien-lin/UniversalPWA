/**
 * Centralized Test Helpers Library for Core Package
 * Provides reusable utilities for consistent, professional test patterns
 *
 * Usage:
 * import { createTestDir, mockFileSystem, createBackendFixture } from './test-helpers'
 */

import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ============================================================================
// FILE SYSTEM HELPERS
// ============================================================================

/**
 * Create a temporary test directory with unique name
 * Returns path and automatically cleaned up via afterEach
 * @param prefix Optional prefix for temp directory
 * @returns Absolute path to test directory
 */
export function createTestDir(prefix = "test-tmp"): string {
  const testDir = join(
    tmpdir(),
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Cleanup test directory after test completion
 * Safe: catches and ignores errors during cleanup
 * @param path Path to test directory to remove
 */
export function cleanupTestDir(path: string): void {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: true, force: true });
    }
  } catch {
    // Ignore cleanup errors - don't fail tests due to cleanup issues
  }
}

/**
 * Create file with content
 * @param dir Parent directory
 * @param filename Filename to create
 * @param content File content
 * @returns Full path to created file
 */
export function createFile(
  dir: string,
  filename: string,
  content: string,
): string {
  const filepath = join(dir, filename);
  const parentDir = filepath.split("/").slice(0, -1).join("/");
  mkdirSync(parentDir, { recursive: true });
  writeFileSync(filepath, content, "utf-8");
  return filepath;
}

/**
 * Create JSON file
 * @param dir Parent directory
 * @param filename Filename (without .json)
 * @param data JSON data to write
 * @returns Full path to created file
 */
export function createJsonFile(
  dir: string,
  filename: string,
  data: unknown,
): string {
  const fullFilename = filename.endsWith(".json")
    ? filename
    : `${filename}.json`;
  return createFile(dir, fullFilename, JSON.stringify(data, null, 2));
}

/**
 * Create directory structure recursively
 * @param basePath Base directory
 * @param structure Object describing directory structure
 * @returns Object with paths to all created directories
 */
export function createDirectoryStructure(
  basePath: string,
  structure: Record<string, string | object>,
): Record<string, string> {
  const paths: Record<string, string> = {};

  for (const [key, value] of Object.entries(structure)) {
    const fullPath = join(basePath, key);

    if (typeof value === "string") {
      // It's a file with content
      createFile(basePath, key, value);
      paths[key] = fullPath;
    } else if (typeof value === "object" && value !== null) {
      // It's a directory with sub-structure
      mkdirSync(fullPath, { recursive: true });
      paths[key] = fullPath;
      const subPaths = createDirectoryStructure(
        fullPath,
        value as Record<string, string | object>,
      );
      Object.entries(subPaths).forEach(([subKey, subPath]) => {
        paths[`${key}/${subKey}`] = subPath;
      });
    }
  }

  return paths;
}

// ============================================================================
// FIXTURE BUILDERS (Backend-specific)
// ============================================================================

/**
 * Create Django project fixture with required files
 * @param testDir Directory to create fixture in
 * @returns Object with paths to fixture files
 */
export function createDjangoFixture(testDir: string): {
  root: string;
  managePy: string;
  settingsPy: string;
  requirementsTxt: string;
  urlsPy: string;
} {
  const root = testDir;
  mkdirSync(join(root, "myproject"), { recursive: true });
  mkdirSync(join(root, "myapp"), { recursive: true });

  const managePy = createFile(
    root,
    "manage.py",
    `#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()`,
  );

  const settingsPy = createFile(
    join(root, "myproject"),
    "settings.py",
    `DEBUG = True
ALLOWED_HOSTS = ['*']
INSTALLED_APPS = ['django.contrib.staticfiles', 'myapp']`,
  );

  const requirementsTxt = createFile(
    root,
    "requirements.txt",
    "Django==4.2.0\nrequests==2.28.0",
  );

  const urlsPy = createFile(
    join(root, "myproject"),
    "urls.py",
    `from django.urls import path
urlpatterns = []`,
  );

  return {
    root,
    managePy,
    settingsPy,
    requirementsTxt,
    urlsPy,
  };
}

/**
 * Create Flask project fixture
 * @param testDir Directory to create fixture in
 * @returns Object with paths to fixture files
 */
export function createFlaskFixture(testDir: string): {
  root: string;
  appPy: string;
  requirementsTxt: string;
} {
  const root = testDir;

  const appPy = createFile(
    root,
    "app.py",
    `from flask import Flask
app = Flask(__name__)
@app.route('/')
def hello():
    return 'Hello World'`,
  );

  const requirementsTxt = createFile(
    root,
    "requirements.txt",
    "Flask==3.0.0\nWerkzeug==3.0.1",
  );

  return {
    root,
    appPy,
    requirementsTxt,
  };
}

/**
 * Create Laravel project fixture
 * @param testDir Directory to create fixture in
 * @returns Object with paths to fixture files
 */
export function createLaravelFixture(testDir: string): {
  root: string;
  composerJson: string;
  artisanFile: string;
  appDirectory: string;
} {
  const root = testDir;
  mkdirSync(join(root, "app"), { recursive: true });
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "routes"), { recursive: true });

  const composerJson = createJsonFile(root, "composer", {
    name: "laravel/laravel",
    require: {
      "laravel/framework": "^11.0",
      "laravel/sanctum": "^4.0",
    },
  });

  const artisanFile = createFile(root, "artisan", "#!/usr/bin/env php");

  return {
    root,
    composerJson,
    artisanFile,
    appDirectory: join(root, "app"),
  };
}

/**
 * Create Symfony project fixture
 * @param testDir Directory to create fixture in
 * @returns Object with paths to fixture files
 */
export function createSymfonyFixture(testDir: string): {
  root: string;
  composerJson: string;
  configDirectory: string;
  pubDirectory: string;
} {
  const root = testDir;
  mkdirSync(join(root, "config"), { recursive: true });
  mkdirSync(join(root, "public"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });

  const composerJson = createJsonFile(root, "composer", {
    name: "symfony/skeleton",
    require: {
      "symfony/console": "^7.0",
      "symfony/framework-bundle": "^7.0",
    },
  });

  return {
    root,
    composerJson,
    configDirectory: join(root, "config"),
    pubDirectory: join(root, "public"),
  };
}

/**
 * Create React Vite project fixture
 * @param testDir Directory to create fixture in
 * @returns Object with paths to fixture files
 */
export function createReactViteFixture(testDir: string): {
  root: string;
  packageJson: string;
  viteConfig: string;
  srcDirectory: string;
} {
  const root = testDir;
  mkdirSync(join(root, "src"), { recursive: true });

  const packageJson = createJsonFile(root, "package", {
    name: "react-vite-app",
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
    },
    devDependencies: {
      vite: "^5.0.0",
      "@vitejs/plugin-react": "^4.0.0",
    },
  });

  const viteConfig = createFile(
    root,
    "vite.config.ts",
    `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
})`,
  );

  return {
    root,
    packageJson,
    viteConfig,
    srcDirectory: join(root, "src"),
  };
}

// ============================================================================
// NOTE: Mock helpers removed - use actual implementations in tests
// ============================================================================

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Expect file to exist at path
 * @param path File path to check
 * @param message Optional custom message
 */
export function expectFileExists(path: string, message?: string): void {
  const exists = existsSync(path);
  if (!exists) {
    throw new Error(message || `Expected file to exist: ${path}`);
  }
}

/**
 * Expect file to not exist at path
 * @param path File path to check
 * @param message Optional custom message
 */
export function expectFileNotExists(path: string, message?: string): void {
  const exists = existsSync(path);
  if (exists) {
    throw new Error(message || `Expected file to not exist: ${path}`);
  }
}

/**
 * Read file and expect content
 * @param path File path
 * @param expectedContent Content to expect (string or regex)
 * @param message Optional custom message
 */
export function expectFileContent(
  path: string,
  expectedContent: string | RegExp,
  message?: string,
): void {
  const content = (() => {
    try {
      return readFileSync(path, "utf-8");
    } catch {
      throw new Error(`Failed to read file: ${path}`);
    }
  })();

  if (expectedContent instanceof RegExp) {
    if (!expectedContent.test(content)) {
      throw new Error(
        message || `Expected file content to match pattern: ${expectedContent}`,
      );
    }
  } else {
    if (!content.includes(expectedContent)) {
      throw new Error(
        message || `Expected file content to include: ${expectedContent}`,
      );
    }
  }
}

/**
 * Read JSON file and parse
 * @param path JSON file path
 * @returns Parsed JSON object
 */
export function readJsonFile(path: string): unknown {
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to read/parse JSON file: ${path} - ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// PERFORMANCE TEST HELPERS
// ============================================================================

/**
 * Measure function execution time
 * @param fn Function to measure
 * @param iterations Number of times to run (default 1)
 * @returns Average execution time in milliseconds
 */
export async function measureExecutionTime(
  fn: () => Promise<void> | void,
  iterations = 1,
): Promise<number> {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await Promise.resolve(fn());
    const duration = performance.now() - start;
    times.push(duration);
  }

  return times.reduce((a, b) => a + b, 0) / times.length;
}

/**
 * Assert function completes within time limit
 * @param fn Function to measure
 * @param maxTimeMs Maximum allowed time in milliseconds
 * @param message Optional custom message
 */
export async function expectExecutionTime(
  fn: () => Promise<void> | void,
  maxTimeMs: number,
  message?: string,
): Promise<void> {
  const duration = await measureExecutionTime(fn);

  if (duration > maxTimeMs) {
    throw new Error(
      message ||
        `Expected execution time < ${maxTimeMs}ms but got ${duration.toFixed(2)}ms`,
    );
  }
}

// ============================================================================
// ERROR SCENARIO HELPERS
// ============================================================================

/**
 * Create mock error with specific code
 * @param message Error message
 * @param code Error code (e.g., 'EACCES', 'ENOSPC', 'ENOENT')
 * @returns Error with code property
 */
export function createErrorWithCode(
  message: string,
  code: string,
): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

/**
 * Common error codes for file system operations
 */
export const ERROR_CODES = {
  EACCES: "Permission denied",
  ENOSPC: "No space left on device",
  ENOENT: "No such file or directory",
  EISDIR: "Is a directory",
  ENOTDIR: "Not a directory",
  EEXIST: "File exists",
  EMFILE: "Too many open files",
  ETIMEDOUT: "Operation timed out",
} as const;

// ============================================================================
// EXPORT TEST CONSTANTS
// ============================================================================

export const TEST_TIMEOUTS = {
  SHORT: 100,
  MEDIUM: 500,
  LONG: 5000,
  VERY_LONG: 30000,
} as const;

export const TEST_THRESHOLDS = {
  DETECTION_TIME: 100, // ms
  GENERATION_TIME: 500, // ms
  IMAGE_PROCESSING_TIME: 1000, // ms per image
  INJECTION_TIME: 200, // ms
} as const;
