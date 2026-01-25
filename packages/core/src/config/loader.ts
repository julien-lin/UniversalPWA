/**
 * Configuration Loader
 *
 * Loads configuration from various file formats
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { UniversalPWAConfig } from "./schema.js";
import { DEFAULT_CONFIG } from "./schema.js";
import { validateConfig } from "./validator.js";

export interface ConfigLoadResult {
  config: UniversalPWAConfig;
  filePath: string;
  format: "ts" | "js" | "json" | "yaml";
  validated: boolean;
}

export interface ConfigLoadOptions {
  /** Validate configuration after loading */
  validate?: boolean;
  /** Throw error if validation fails */
  strict?: boolean;
}

/**
 * Find configuration file in project directory
 */
export function findConfigFile(projectPath: string): string | null {
  const configNames = [
    "universal-pwa.config.ts",
    "universal-pwa.config.js",
    "universal-pwa.config.json",
    "universal-pwa.config.yaml",
    "universal-pwa.config.yml",
    ".universal-pwa.config.ts",
    ".universal-pwa.config.js",
    ".universal-pwa.config.json",
  ];

  for (const name of configNames) {
    const filePath = join(projectPath, name);
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * Load configuration from file
 */
export async function loadConfig(
  filePath: string,
  options: ConfigLoadOptions = { validate: true, strict: true },
): Promise<ConfigLoadResult> {
  if (!existsSync(filePath)) {
    throw new ConfigLoadError(
      `Configuration file not found: ${filePath}`,
      filePath,
    );
  }

  const ext = filePath.split(".").pop()?.toLowerCase();

  let result: ConfigLoadResult;

  try {
    switch (ext) {
      case "ts":
        result = await loadTypeScriptConfig(filePath);
        break;
      case "js":
        result = await loadJavaScriptConfig(filePath);
        break;
      case "json":
        result = loadJSONConfig(filePath);
        break;
      case "yaml":
      case "yml":
        result = loadYAMLConfig(filePath);
        break;
      default:
        throw new ConfigLoadError(
          `Unsupported configuration file format: ${ext}. Supported formats: .ts, .js, .json, .yaml`,
          filePath,
        );
    }
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      throw error;
    }
    throw new ConfigLoadError(
      `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      error,
    );
  }

  // Validate configuration if requested
  if (options.validate !== false) {
    const validation = validateConfig(result.config);

    if (!validation.success) {
      const errorMessage = formatValidationErrors(
        validation.errors || [],
        filePath,
      );

      if (options.strict !== false) {
        throw new ConfigValidationError(
          errorMessage,
          filePath,
          validation.errors || [],
        );
      }

      // In non-strict mode, log warnings but continue
      console.warn(
        `⚠️  Configuration validation warnings in ${filePath}:\n${errorMessage}`,
      );
    }

    result.validated = validation.success;
  } else {
    result.validated = false;
  }

  return result;
}

/**
 * Load TypeScript configuration
 */
async function loadTypeScriptConfig(
  filePath: string,
): Promise<ConfigLoadResult> {
  // For TypeScript configs, we need to use dynamic import
  // This requires the file to be compiled or use tsx/ts-node
  try {
    const fileUrl = pathToFileURL(filePath).href;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await import(fileUrl);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const config = module.default || module.config || module;

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      config: mergeWithDefaults(config),
      filePath,
      format: "ts",
      validated: false, // Will be validated in loadConfig
    };
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load TypeScript config: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      error,
    );
  }
}

/**
 * Load JavaScript configuration
 */
async function loadJavaScriptConfig(
  filePath: string,
): Promise<ConfigLoadResult> {
  try {
    const fileUrl = pathToFileURL(filePath).href;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const module = await import(fileUrl);
    // Support both ESM and CommonJS exports
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      module.default ||
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      module.config ||
      (module as { config?: unknown }).config ||
      module;

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      config: mergeWithDefaults(config),
      filePath,
      format: "js",
      validated: false, // Will be validated in loadConfig
    };
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load JavaScript config: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      error,
    );
  }
}

/**
 * Load JSON configuration
 */
function loadJSONConfig(filePath: string): ConfigLoadResult {
  try {
    const content = readFileSync(filePath, "utf-8");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const config = JSON.parse(content);

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      config: mergeWithDefaults(config),
      filePath,
      format: "json",
      validated: false, // Will be validated in loadConfig
    };
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load JSON config: ${error instanceof Error ? error.message : String(error)}`,
      filePath,
      error,
    );
  }
}

/**
 * Load YAML configuration
 */
function loadYAMLConfig(filePath: string): ConfigLoadResult {
  try {
    const content = readFileSync(filePath, "utf-8");

    // Try to parse YAML manually (simple implementation)
    // For full YAML support, consider adding js-yaml package
    const config = parseSimpleYAML(content);

    return {
      config: mergeWithDefaults(config),
      filePath,
      format: "yaml",
      validated: false, // Will be validated in loadConfig
    };
  } catch (error) {
    throw new ConfigLoadError(
      `Failed to load YAML config: ${error instanceof Error ? error.message : String(error)}. Note: Full YAML support requires js-yaml package.`,
      filePath,
      error,
    );
  }
}

/**
 * Simple YAML parser (basic support)
 * For production, consider using js-yaml package
 */
function parseSimpleYAML(content: string): Partial<UniversalPWAConfig> {
  // Very basic YAML parsing - only handles simple key-value pairs
  // This is a placeholder. For full support, install js-yaml:
  // import yaml from 'js-yaml'
  // return yaml.load(content) as Partial<UniversalPWAConfig>

  const lines = content.split("\n");
  const config: Record<string, unknown> = {};
  let currentSection: string | null = null;
  let currentSectionData: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Section header (e.g., "app:")
    if (trimmed.endsWith(":")) {
      if (currentSection) {
        config[currentSection] = currentSectionData;
      }
      currentSection = trimmed.slice(0, -1);
      currentSectionData = {};
      continue;
    }

    // Key-value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      let value: unknown = trimmed.slice(colonIndex + 1).trim();

      // Remove quotes if present
      if (
        typeof value === "string" &&
        ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'")))
      ) {
        value = value.slice(1, -1);
      }

      // Parse booleans
      if (value === "true") value = true;
      if (value === "false") value = false;

      // Parse numbers
      if (typeof value === "string" && /^-?\d+$/.test(value)) {
        value = Number.parseInt(value, 10);
      }

      if (currentSection) {
        currentSectionData[key] = value;
      } else {
        config[key] = value;
      }
    }
  }

  if (currentSection) {
    config[currentSection] = currentSectionData;
  }

  return config as Partial<UniversalPWAConfig>;
}

/**
 * Merge user config with defaults
 */
function mergeWithDefaults(
  userConfig: Partial<UniversalPWAConfig>,
): UniversalPWAConfig {
  const merged: UniversalPWAConfig = {
    ...DEFAULT_CONFIG,
    ...userConfig,
  };

  // Merge nested objects only if they exist in user config
  if (userConfig.app) {
    merged.app = {
      ...DEFAULT_CONFIG.app!,
      ...userConfig.app,
    };
  }

  if (userConfig.icons) {
    merged.icons = {
      ...DEFAULT_CONFIG.icons!,
      ...userConfig.icons,
    };
  }

  if (userConfig.serviceWorker) {
    merged.serviceWorker = {
      ...DEFAULT_CONFIG.serviceWorker!,
      ...userConfig.serviceWorker,
    };
  }

  if (userConfig.injection) {
    merged.injection = {
      ...DEFAULT_CONFIG.injection!,
      ...userConfig.injection,
    };
  }

  if (userConfig.scanner) {
    merged.scanner = {
      ...DEFAULT_CONFIG.scanner!,
      ...userConfig.scanner,
    };
  }

  if (userConfig.advancedCaching) {
    merged.advancedCaching = {
      ...DEFAULT_CONFIG.advancedCaching!,
      ...userConfig.advancedCaching,
    };
  }

  if (userConfig.output) {
    merged.output = {
      ...DEFAULT_CONFIG.output!,
      ...userConfig.output,
    };
  }

  return merged;
}

/**
 * Format validation errors for display
 */
function formatValidationErrors(
  errors: Array<{ path: string; message: string }>,
  _filePath: string,
): string {
  if (errors.length === 0) {
    return "Unknown validation error";
  }

  const lines = [`Found ${errors.length} validation error(s):`];

  for (const error of errors) {
    const path = error.path ? ` at "${error.path}"` : "";
    lines.push(`  • ${error.message}${path}`);
  }

  return lines.join("\n");
}

/**
 * Custom error class for configuration loading errors
 */
export class ConfigLoadError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * Custom error class for configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly errors: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "ConfigValidationError";
  }
}
