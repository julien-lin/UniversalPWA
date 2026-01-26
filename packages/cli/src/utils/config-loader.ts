/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

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

    const config = (result as unknown as { config?: unknown | null } | null)?.config as UniversalPWAConfig | null ?? null;
    const filePath = (result as unknown as { filePath?: string | null } | null)?.filePath ?? null;
    const format = (result as unknown as { format?: "ts" | "js" | "json" | "yaml" | null } | null)?.format ?? null;

    return {
      config,
      filePath,
      format,
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
  const cfg = config as unknown as Record<string, unknown>;

  // Merge app config
  const appConfig = cfg?.app as Record<string, unknown> | undefined;
  if (appConfig && !merged.name) {
    merged.name = appConfig.name as string | undefined;
  }
  if (appConfig && !merged.shortName) {
    merged.shortName = appConfig.shortName as string | undefined;
  }
  if (appConfig && !merged.themeColor) {
    merged.themeColor = appConfig.themeColor as string | undefined;
  }
  if (appConfig && !merged.backgroundColor) {
    merged.backgroundColor = appConfig.backgroundColor as string | undefined;
  }

  // Merge icons config
  const iconsConfig = cfg?.icons as Record<string, unknown> | undefined;
  if (iconsConfig) {
    if (merged.skipIcons === undefined) {
      const generate = iconsConfig.generate as boolean | undefined;
      merged.skipIcons = generate !== undefined ? !generate : false;
    }
    if (!merged.iconSource && iconsConfig.source) {
      merged.iconSource = iconsConfig.source as string | undefined;
    }
  }

  // Merge service worker config
  const swConfig = cfg?.serviceWorker as Record<string, unknown> | undefined;
  if (swConfig && merged.skipServiceWorker === undefined) {
    const generate = swConfig.generate as boolean | undefined;
    merged.skipServiceWorker = generate !== undefined ? !generate : false;
  }

  // Merge injection config
  const injectionConfig = cfg?.injection as Record<string, unknown> | undefined;
  if (injectionConfig && merged.skipInjection === undefined) {
    const inject = injectionConfig.inject as boolean | undefined;
    merged.skipInjection = inject !== undefined ? !inject : false;
  }

  // Merge output config
  const outputConfig = cfg?.output as Record<string, unknown> | undefined;
  if (outputConfig && !merged.outputDir) {
    merged.outputDir = outputConfig.dir as string | undefined;
  }

  // Merge scanner config
  const scannerConfig = cfg?.scanner as Record<string, unknown> | undefined;
  if (scannerConfig) {
    if (merged.forceScan === undefined) {
      merged.forceScan = scannerConfig.forceScan as boolean | undefined;
    }
    if (merged.noCache === undefined) {
      merged.noCache = scannerConfig.noCache as boolean | undefined;
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
