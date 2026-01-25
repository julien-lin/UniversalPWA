/**
 * Configuration Loader Utility for CLI
 *
 * Loads and merges configuration from file with CLI options
 */

import { findConfigFile, loadConfig } from "@julien-lin/universal-pwa-core";
import { resolve } from "node:path";
import type { UniversalPWAConfig } from "@julien-lin/universal-pwa-core";
import type { InitOptions } from "../commands/init.js";

export interface MergedConfig {
  config: UniversalPWAConfig | null;
  filePath: string | null;
  format: "ts" | "js" | "json" | "yaml" | null;
}

/**
 * Load configuration file from project
 */
export async function loadProjectConfig(
  projectPath: string,
): Promise<MergedConfig> {
  const resolvedPath = resolve(projectPath);

  try {
    const configFilePath = findConfigFile(resolvedPath);

    if (!configFilePath) {
      return {
        config: null,
        filePath: null,
        format: null,
      };
    }

    const result = await loadConfig(configFilePath, {
      validate: true,
      strict: false, // Don't throw on validation errors, just warn
    });

    return {
      config: result.config,
      filePath: result.filePath,
      format: result.format,
    };
  } catch (error) {
    // If config file exists but fails to load, return null (will use defaults)
    console.warn(
      `⚠️  Failed to load configuration file: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      config: null,
      filePath: null,
      format: null,
    };
  }
}

/**
 * Merge CLI options with config file values
 * Priority: CLI options > Config file > Defaults
 */
export function mergeConfigWithOptions(
  config: UniversalPWAConfig | null,
  cliOptions: InitOptions,
): InitOptions {
  if (!config) {
    return cliOptions;
  }

  const merged: InitOptions = { ...cliOptions };

  // Merge app config
  if (config.app && !merged.name) {
    merged.name = config.app.name;
  }
  if (config.app && !merged.shortName) {
    merged.shortName = config.app.shortName;
  }
  if (config.app && !merged.themeColor) {
    merged.themeColor = config.app.themeColor;
  }
  if (config.app && !merged.backgroundColor) {
    merged.backgroundColor = config.app.backgroundColor;
  }

  // Merge icons config
  if (config.icons) {
    if (merged.skipIcons === undefined) {
      merged.skipIcons = !config.icons.generate;
    }
    if (!merged.iconSource && config.icons.source) {
      merged.iconSource = config.icons.source;
    }
  }

  // Merge service worker config
  if (config.serviceWorker && merged.skipServiceWorker === undefined) {
    merged.skipServiceWorker = !config.serviceWorker.generate;
  }

  // Merge injection config
  if (config.injection && merged.skipInjection === undefined) {
    merged.skipInjection = !config.injection.inject;
  }

  // Merge output config
  if (config.output && !merged.outputDir) {
    merged.outputDir = config.output.dir;
  }

  // Merge scanner config
  if (config.scanner) {
    if (merged.forceScan === undefined) {
      merged.forceScan = config.scanner.forceScan;
    }
    if (merged.noCache === undefined) {
      merged.noCache = config.scanner.noCache;
    }
  }

  return merged;
}

/**
 * Get effective configuration for init command
 * Returns merged config with CLI options taking precedence
 */
export async function getEffectiveConfig(
  projectPath: string,
  cliOptions: InitOptions,
): Promise<{
  options: InitOptions;
  configFile: MergedConfig;
}> {
  const configFile = await loadProjectConfig(projectPath);
  const options = mergeConfigWithOptions(configFile.config, cliOptions);

  return {
    options,
    configFile,
  };
}
