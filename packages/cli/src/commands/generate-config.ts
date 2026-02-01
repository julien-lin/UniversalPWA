/**
 * Generate Configuration File Command
 *
 * Generates a universal-pwa.config file from project scan
 */

import { scanProject } from "@julien-lin/universal-pwa-core";
import { existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import chalk from "chalk";
import inquirer from "inquirer";
import type { UniversalPWAConfig } from "@julien-lin/universal-pwa-core";

type ConfigFormat = "ts" | "js" | "json" | "yaml";

export interface GenerateConfigOptions {
  projectPath?: string;
  format?: ConfigFormat;
  interactive?: boolean;
  output?: string;
}

export interface GenerateConfigResult {
  success: boolean;
  filePath: string;
  format: ConfigFormat;
  errors: string[];
}

/**
 * Generate configuration file from project scan
 */
export async function generateConfigCommand(
  options: GenerateConfigOptions = {},
): Promise<GenerateConfigResult> {
  const projectPath = options.projectPath ?? process.cwd();
  const format = options.format ?? "ts";
  const configFormat: ConfigFormat =
    format === "ts" || format === "js" || format === "json" || format === "yaml"
      ? format
      : "ts";
  const isInteractive = options.interactive !== false;
  const outputFile = options.output;

  const result: GenerateConfigResult = {
    success: false,
    filePath: "",
    format: configFormat,
    errors: [],
  };

  try {
    const resolvedPath = resolve(projectPath);

    if (!existsSync(resolvedPath)) {
      result.errors.push(`Project path not found: ${resolvedPath}`);
      return result;
    }

    console.log(chalk.blue("🔍 Scanning project..."));

    // Scan project
    const scanResult = await scanProject({
      projectPath: resolvedPath,
      includeAssets: true,
      includeArchitecture: true,
    });

    if (
      !scanResult ||
      typeof scanResult !== "object" ||
      !("framework" in scanResult) ||
      !("architecture" in scanResult)
    ) {
      result.errors.push("Failed to scan project: invalid scan result");
      return result;
    }

    const framework = scanResult.framework?.framework ?? "Unknown";
    const architecture = scanResult.architecture?.architecture ?? "static";

    console.log(chalk.green(`✓ Framework detected: ${framework}`));
    console.log(chalk.green(`✓ Architecture: ${architecture}`));

    // Generate base config from scan

    let config: UniversalPWAConfig = generateConfigFromScan(scanResult);

    // Interactive mode: prompt for additional options
    if (isInteractive) {
      config = await promptConfigOptions(config);
    }

    // Determine output file path
    const fileName = outputFile || getConfigFileName(configFormat);
    const filePath = join(resolvedPath, fileName);

    // Check if file already exists
    if (existsSync(filePath)) {
      const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
        {
          type: "confirm",
          name: "overwrite",
          message: `Configuration file ${fileName} already exists. Overwrite?`,
          default: false,
        },
      ]);

      if (!overwrite) {
        result.errors.push(
          "Configuration file already exists and overwrite was cancelled",
        );
        return result;
      }
    }

    // Write configuration file
    const content = formatConfig(config, configFormat);
    writeFileSync(filePath, content, "utf-8");

    result.success = true;
    result.filePath = filePath;

    console.log(chalk.green(`✓ Configuration file generated: ${fileName}`));
    console.log(chalk.gray(`  Location: ${filePath}`));

    return result;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.error(chalk.red(`✗ Error: ${result.errors[0]}`));
    return result;
  }
}

/**
 * Generate base configuration from scan result
 * eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
 */
function generateConfigFromScan(
  scanResult: Awaited<ReturnType<typeof scanProject>>,
): UniversalPWAConfig {
  const framework = scanResult.framework?.framework ?? "Unknown";
  const architecture = scanResult.architecture?.architecture ?? "static";

  // Determine default output directory based on framework
  let outputDir = "public";
  if (framework === "React" || framework === "Vite") {
    outputDir = "dist";
  } else if (framework === "Next.js") {
    outputDir = ".next";
  } else if (framework === "Nuxt") {
    outputDir = ".output";
  }

  const config: UniversalPWAConfig = {
    projectRoot: ".",
    app: {
      generate: true,
      destination: "manifest.json",
      startUrl: "/",
      scope: "/",
      display: "standalone",
    },
    icons: {
      generate: true,
      generateSplashScreens: false,
    },
    serviceWorker: {
      generate: true,
      destination: "sw.js",
      skipWaiting: true,
      clientsClaim: true,
    },
    injection: {
      inject: true,
    },
    scanner: {
      autoDetectBackend: true,
      forceScan: false,
      noCache: false,
    },
    output: {
      dir: outputDir,
      clean: false,
    },
  };

  // Add framework/architecture overrides if detected
  if (framework && framework !== "Unknown") {
    config.backend = framework as UniversalPWAConfig["backend"];
  }

  if (architecture && architecture !== "static") {
    config.architecture = architecture;
  }

  return config;
}

/**
 * Prompt for additional configuration options
 * eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
 */
interface ConfigPromptAnswers {
  appName: string;
  appShortName: string;
  appDescription: string;
  themeColor: string;
  backgroundColor: string;
  iconSource: string;
  generateSplashScreens: boolean;
  outputDir: string;
}

async function promptConfigOptions(
  baseConfig: UniversalPWAConfig,
): Promise<UniversalPWAConfig> {
  const answers = await inquirer.prompt<ConfigPromptAnswers>([
    {
      type: "input",
      name: "appName",
      message: "App name:",
      default: baseConfig.app?.name || "My PWA",
    },
    {
      type: "input",
      name: "appShortName",
      message: "App short name (max 12 chars):",
      default: baseConfig.app?.shortName || "PWA",
      validate: (input: string) => {
        if (input.length > 12) {
          return "Short name must be 12 characters or less";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "appDescription",
      message: "App description:",
      default: baseConfig.app?.description || "",
    },
    {
      type: "input",
      name: "themeColor",
      message: "Theme color (hex):",
      default: baseConfig.app?.themeColor || "#000000",
      validate: (input: string) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(input)) {
          return "Theme color must be a valid hex color (e.g., #000000)";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "backgroundColor",
      message: "Background color (hex):",
      default: baseConfig.app?.backgroundColor || "#FFFFFF",
      validate: (input: string) => {
        if (!/^#[0-9A-Fa-f]{6}$/.test(input)) {
          return "Background color must be a valid hex color (e.g., #FFFFFF)";
        }
        return true;
      },
    },
    {
      type: "input",
      name: "iconSource",
      message: "Icon source path (optional):",
      default: baseConfig.icons?.source || "",
    },
    {
      type: "confirm",
      name: "generateSplashScreens",
      message: "Generate splash screens?",
      default: baseConfig.icons?.generateSplashScreens || false,
    },
    {
      type: "input",
      name: "outputDir",
      message: "Output directory:",
      default: baseConfig.output?.dir || "public",
    },
  ]);

  // Update config with answers
  if (baseConfig.app) {
    baseConfig.app.name = answers.appName;
    baseConfig.app.shortName = answers.appShortName;
    baseConfig.app.description = answers.appDescription;
    baseConfig.app.themeColor = answers.themeColor;
    baseConfig.app.backgroundColor = answers.backgroundColor;
  }

  if (baseConfig.icons) {
    if (answers.iconSource) {
      baseConfig.icons.source = answers.iconSource;
    }
    baseConfig.icons.generateSplashScreens = answers.generateSplashScreens;
  }

  if (baseConfig.output) {
    baseConfig.output.dir = answers.outputDir;
  }

  return baseConfig;
}

/**
 * Get config file name based on format
 */
function getConfigFileName(format: "ts" | "js" | "json" | "yaml"): string {
  const extensions = {
    ts: "universal-pwa.config.ts",
    js: "universal-pwa.config.js",
    json: "universal-pwa.config.json",
    yaml: "universal-pwa.config.yaml",
  };

  return extensions[format];
}

/**
 * Format configuration to file content
 */
function formatConfig(
  config: UniversalPWAConfig,
  format: "ts" | "js" | "json" | "yaml",
): string {
  switch (format) {
    case "ts":
      return formatTypeScriptConfig(config);
    case "js":
      return formatJavaScriptConfig(config);
    case "json":
      return formatJSONConfig(config);
    case "yaml":
      return formatYAMLConfig(config);
  }
}

/**
 * Format as TypeScript config
 */
function formatTypeScriptConfig(config: UniversalPWAConfig): string {
  return `import type { UniversalPWAConfig } from '@julien-lin/universal-pwa-core'

const config: UniversalPWAConfig = ${JSON.stringify(config, null, 2)}

export default config
`;
}

/**
 * Format as JavaScript config
 */
function formatJavaScriptConfig(config: UniversalPWAConfig): string {
  return `/** @type {import('@julien-lin/universal-pwa-core').UniversalPWAConfig} */
const config = ${JSON.stringify(config, null, 2)}

module.exports = config
`;
}

/**
 * Format as JSON config
 */
function formatJSONConfig(config: UniversalPWAConfig): string {
  return JSON.stringify(config, null, 2) + "\n";
}

/**
 * Format as YAML config
 */
function formatYAMLConfig(config: UniversalPWAConfig): string {
  const lines: string[] = [];

  const shouldQuote = (value: string): boolean => /[\s:]/.test(value);

  const formatScalar = (value: unknown): string => {
    if (typeof value === "string") {
      return shouldQuote(value) ? `"${value}"` : value;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value);
  };

  function formatValue(value: unknown, indent = 0, key?: string): void {
    const prefix = "  ".repeat(indent);

    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return;
      }

      if (key) {
        lines.push(`${prefix}${key}:`);
      }

      for (const [k, v] of entries) {
        if (v === null || v === undefined) {
          continue;
        }

        if (typeof v === "object" && !Array.isArray(v)) {
          formatValue(v, indent + 1, k);
        } else if (Array.isArray(v)) {
          lines.push(`${prefix}  ${k}:`);
          for (const item of v) {
            const itemValue = formatScalar(item);
            lines.push(`${prefix}    - ${itemValue}`);
          }
        } else {
          const formattedValue = formatScalar(v);
          lines.push(`${prefix}  ${k}: ${formattedValue}`);
        }
      }
    } else if (Array.isArray(value)) {
      if (key) {
        lines.push(`${prefix}${key}:`);
      }
      for (const item of value) {
        const itemValue = formatScalar(item);
        lines.push(`${prefix}  - ${itemValue}`);
      }
    } else {
      const formattedValue = formatScalar(value);
      if (key) {
        lines.push(`${prefix}${key}: ${formattedValue}`);
      } else {
        lines.push(`${prefix}${formattedValue}`);
      }
    }
  }

  formatValue(config, 0);
  return lines.join("\n") + "\n";
}
