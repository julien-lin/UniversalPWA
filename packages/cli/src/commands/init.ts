import { scanProject, optimizeProject } from "@julien-lin/universal-pwa-core";
import {
  generateAndWriteManifest,
  generateManifestId,
} from "@julien-lin/universal-pwa-core";
import { generateIcons } from "@julien-lin/universal-pwa-core";
import {
  generateServiceWorker,
  generateSimpleServiceWorker,
  generateServiceWorkerFromBackend,
} from "@julien-lin/universal-pwa-core";
import {
  injectMetaTagsInFile,
  processInParallel,
} from "@julien-lin/universal-pwa-core";
import { checkProjectHttps } from "@julien-lin/universal-pwa-core";
import { getBackendFactory } from "@julien-lin/universal-pwa-core";
import chalk from "chalk";
import { existsSync, mkdirSync } from "fs";
import { glob } from "glob";
import { join, resolve, relative, normalize } from "path";
// @ts-expect-error - @types/cli-progress not available
import cliProgress from "cli-progress";
import type {
  Framework,
  BackendIntegration,
} from "@julien-lin/universal-pwa-core";
import type { Architecture } from "@julien-lin/universal-pwa-core";
import { Transaction } from "../utils/transaction.js";
import { getEffectiveConfig } from "../utils/config-loader.js";
import { displayPWABanner } from "../utils/ui-utils.js";

// @types/cli-progress not available, using any type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CliProgressBar = any;
import {
  ErrorCode,
  formatError,
  detectErrorCode,
} from "../utils/error-codes.js";

export interface InitOptions {
  projectPath?: string;
  name?: string;
  shortName?: string;
  iconSource?: string;
  themeColor?: string;
  backgroundColor?: string;
  skipIcons?: boolean;
  skipServiceWorker?: boolean;
  skipInjection?: boolean;
  outputDir?: string;
  basePath?: string; // Base path for PWA (e.g., /app/, /creativehub/). Default: /
  forceScan?: boolean;
  noCache?: boolean;
  maxHtmlFiles?: number; // Optionnel : limite le nombre de fichiers HTML traités (par défaut: illimité)
}

export interface InitResult {
  success: boolean;
  projectPath: string;
  framework: Framework | null;
  architecture: Architecture;
  manifestPath?: string;
  serviceWorkerPath?: string;
  iconsGenerated: number;
  htmlFilesInjected: number;
  warnings: string[];
  errors: string[];
}

type OptimizationResultShape = {
  cacheStrategies: Array<{
    urlPattern: string | RegExp;
    handler: string;
    options?: {
      cacheName?: string;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      networkTimeoutSeconds?: number;
    };
  }>;
  apiType: string;
  assetSuggestions: Array<{
    priority: "high" | "medium" | "low";
    suggestion: string;
  }>;
};

/**
 * Normalizes basePath to ensure consistent format:
 * - "/" stays "/"
 * - Any other path becomes "/xxx/" (with trailing slash)
 * @throws Error if basePath is invalid
 */
function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath.trim().length === 0) {
    throw new Error("basePath cannot be empty");
  }

  basePath = basePath.trim();

  // Reject invalid patterns
  if (basePath.includes("http://") || basePath.includes("https://")) {
    throw new Error("basePath cannot be a full URL (http://, https://)");
  }
  if (basePath.includes("..")) {
    throw new Error("basePath cannot contain parent directory references (..)");
  }
  if (basePath.includes("//")) {
    throw new Error("basePath cannot contain double slashes (//)");
  }

  // If it's just "/", return as-is
  if (basePath === "/") {
    return "/";
  }

  // Ensure it starts with "/"
  if (!basePath.startsWith("/")) {
    throw new Error("basePath must start with /");
  }

  // Remove trailing slash if present, then add it back
  let normalized = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  // Ensure trailing slash for non-root paths
  normalized = normalized + "/";

  return normalized;
}

/**
 * Normalizes a path securely by converting it to a relative path
 */
function relativePath(fullPath: string, basePath: string): string {
  try {
    const rel = relative(basePath, fullPath);
    // Normalize and ensure path starts with /
    const normalized = normalize(rel).replace(/\\/g, "/");
    return normalized.startsWith("/") ? normalized : `/${normalized}`;
  } catch {
    // On error, return path as-is (will be validated elsewhere)
    return fullPath;
  }
}

/**
 * Init command: scans project and generates PWA files
 */
export async function initCommand(
  options: InitOptions = {},
): Promise<InitResult> {
  const resolvedProjectPath = resolve(options.projectPath || process.cwd());

  // Load and merge configuration
  const { options: mergedOptions, configFile } = await getEffectiveConfig(
    resolvedProjectPath,
    options,
  );

  // Log if config file was loaded
  if (configFile.config && configFile.filePath) {
    console.log(
      chalk.gray(`📄 Using configuration from ${configFile.filePath}`),
    );
  }

  // Display PWA Banner at startup
  displayPWABanner();

  const {
    projectPath = process.cwd(),
    name,
    shortName,
    iconSource,
    themeColor,
    backgroundColor,
    skipIcons = false,
    skipServiceWorker = false,
    skipInjection = false,
    outputDir,
    basePath: rawBasePath,
    maxHtmlFiles,
  } = mergedOptions;

  const result: InitResult = {
    success: false,
    projectPath: resolve(projectPath),
    framework: null,
    architecture: "static",
    iconsGenerated: 0,
    htmlFilesInjected: 0,
    warnings: [],
    errors: [],
  };

  // Normalize and validate basePath
  let finalBasePath: string;
  try {
    // TODO: Implement intelligent auto-detection of basePath
    // For now, only use explicitly provided basePath or default to "/"
    const effectiveBasePath = rawBasePath || "/";
    finalBasePath = normalizeBasePath(effectiveBasePath);
    if (effectiveBasePath && effectiveBasePath !== "/") {
      console.log(chalk.gray(`  Base path: ${finalBasePath}`));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Invalid basePath: ${errorMessage}`);
    console.log(chalk.red(`✗ Invalid basePath: ${errorMessage}`));
    return result;
  }

  // Initialize transaction for rollback support
  let transaction: Transaction | null = null;

  try {
    // Check that path exists
    if (!existsSync(result.projectPath)) {
      const errorCode = ErrorCode.PROJECT_PATH_NOT_FOUND;
      const errorMessage = formatError(errorCode, result.projectPath);
      result.errors.push(errorMessage);
      console.log(chalk.red(`✗ ${errorMessage}`));
      return result;
    }

    console.log(chalk.blue("🔍 Scanning project..."));

    // Scan project (with cache support)
    const scanResult = await scanProject({
      projectPath: result.projectPath,
      includeAssets: true,
      includeArchitecture: true,
      useCache: options.noCache !== true,
      forceScan: options.forceScan === true,
    });

    if (
      scanResult &&
      typeof scanResult === "object" &&
      "framework" in scanResult &&
      "architecture" in scanResult
    ) {
      result.framework = scanResult.framework?.framework ?? null;
      result.architecture = scanResult.architecture?.architecture ?? "static";
    }

    console.log(
      chalk.green(`✓ Framework detected: ${result.framework ?? "Unknown"}`),
    );
    console.log(chalk.green(`✓ Architecture: ${result.architecture}`));

    // Check HTTPS
    const httpsCheck = checkProjectHttps({ projectPath: result.projectPath });
    if (
      httpsCheck &&
      typeof httpsCheck === "object" &&
      "isSecure" in httpsCheck &&
      "isLocalhost" in httpsCheck
    ) {
      if (!httpsCheck.isSecure && !httpsCheck.isLocalhost) {
        const warning =
          (httpsCheck as unknown as { warning?: string }).warning ??
          "HTTPS required for production PWA";
        result.warnings.push(warning);
        console.log(chalk.yellow(`⚠ ${warning}`));
      }
    }

    // Determine output directory
    // Priority: explicit outputDir > dist/ (for React/Vite builds) > public/ > root
    let finalOutputDir: string;
    if (outputDir) {
      // If outputDir is absolute, use it directly; otherwise resolve relative to projectPath
      finalOutputDir =
        outputDir.startsWith("/") ||
        (process.platform === "win32" && /^[A-Z]:/.test(outputDir))
          ? resolve(outputDir)
          : join(result.projectPath, outputDir);
      console.log(chalk.gray(`  Using output directory: ${finalOutputDir}`));
    } else {
      // Auto-detect: prefer dist/ for React/Vite projects (production builds)
      const distDir = join(result.projectPath, "dist");
      const publicDir = join(result.projectPath, "public");

      // For React/Vite: prefer dist/ if it exists (production build), otherwise public/
      if (
        (result.framework === "react" || result.framework === "nextjs") &&
        existsSync(distDir)
      ) {
        finalOutputDir = distDir;
        console.log(
          chalk.gray(`  Using dist/ directory (production build detected)`),
        );
      } else if (result.framework === "wordpress") {
        finalOutputDir = publicDir;
      } else if (existsSync(publicDir)) {
        finalOutputDir = publicDir;
      } else if (existsSync(distDir)) {
        finalOutputDir = distDir;
      } else {
        // Fallback to public/ (will be created if needed)
        finalOutputDir = publicDir;
      }
    }

    // Ensure output directory exists before file generation
    mkdirSync(finalOutputDir, { recursive: true });

    // Initialize transaction after output directory is determined
    transaction = new Transaction({
      projectPath: result.projectPath,
      outputDir: relative(result.projectPath, finalOutputDir) || undefined,
      verbose: false,
    });

    // Backup existing files before modification
    const existingManifestPath = join(finalOutputDir, "manifest.json");
    const existingSwPath = join(finalOutputDir, "sw.js");

    if (existsSync(existingManifestPath)) {
      const manifestRelative = relative(
        result.projectPath,
        existingManifestPath,
      );
      if (manifestRelative && !manifestRelative.startsWith("..")) {
        transaction.backupFile(manifestRelative);
      }
    }
    if (existsSync(existingSwPath)) {
      const swRelative = relative(result.projectPath, existingSwPath);
      if (swRelative && !swRelative.startsWith("..")) {
        transaction.backupFile(swRelative);
      }
    }

    // Generate manifest
    console.log(chalk.blue("📝 Generating manifest.json..."));

    const appName =
      name ?? (result.framework ? `${result.framework} App` : "My PWA");
    // Ensure shortName is always defined and valid (max 12 characters, non-empty)
    // Normalize shortName (can be undefined, empty string, or valid)
    const normalizedShortName =
      shortName && typeof shortName === "string" && shortName.trim().length > 0
        ? shortName.trim()
        : undefined;

    let appShortName: string;
    if (
      normalizedShortName &&
      normalizedShortName.length > 0 &&
      normalizedShortName.length <= 12
    ) {
      appShortName = normalizedShortName;
    } else {
      // Use appName as fallback, ensure it's not empty
      const fallbackName = appName && appName.length > 0 ? appName : "My PWA";
      appShortName = fallbackName.substring(0, 12);
    }
    // Ensure appShortName is never empty or undefined
    if (!appShortName || appShortName.trim().length === 0) {
      appShortName = "PWA";
    }
    // Ensure appShortName is a string (not undefined)
    appShortName = String(appShortName);

    // Generate icons if source is provided
    let iconPaths: string[] = [];
    if (!skipIcons && iconSource) {
      const iconSourcePath = existsSync(iconSource)
        ? iconSource
        : join(result.projectPath, iconSource);

      if (existsSync(iconSourcePath)) {
        console.log(chalk.blue("🎨 Generating icons..."));

        try {
          const iconResult = await generateIcons({
            sourceImage: iconSourcePath,
            outputDir: finalOutputDir,
            validate: true, // Enable validation
            strictValidation: false, // Don't block on warnings, only errors
          });

          // Display validation warnings/errors if present
          if (iconResult.validation) {
            const { validation } = iconResult;

            if (validation.errors.length > 0) {
              validation.errors.forEach((error) => {
                result.errors.push(`Icon validation: ${error}`);
                console.log(chalk.red(`✗ ${error}`));
              });
            }

            if (validation.warnings.length > 0) {
              validation.warnings.forEach((warning) => {
                result.warnings.push(`Icon validation: ${warning}`);
                console.log(chalk.yellow(`⚠ ${warning}`));
              });
            }

            if (validation.suggestions.length > 0) {
              validation.suggestions.forEach((suggestion) => {
                console.log(chalk.blue(`💡 ${suggestion}`));
              });
            }
          }

          iconPaths = iconResult.icons.map((icon) => icon.src);
          result.iconsGenerated = iconResult.icons.length;

          // Check if apple-touch-icon.png was generated
          const appleTouchIconPath = join(
            finalOutputDir,
            "apple-touch-icon.png",
          );
          if (existsSync(appleTouchIconPath)) {
            iconPaths.push("/apple-touch-icon.png");
          }

          console.log(
            chalk.green(`✓ Generated ${result.iconsGenerated} icons`),
          );
          if (existsSync(appleTouchIconPath)) {
            console.log(chalk.green(`✓ Generated apple-touch-icon.png`));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to generate icons: ${errorMessage}`);
          console.log(chalk.red(`✗ Failed to generate icons: ${errorMessage}`));
        }
      } else {
        const errorCode = ErrorCode.ICON_SOURCE_NOT_FOUND;
        const warningMessage = formatError(errorCode, iconSourcePath);
        result.warnings.push(warningMessage);
        console.log(chalk.yellow(`⚠ ${warningMessage}`));
      }
    }

    // Generate manifest (with or without icons)
    // Final validation of appShortName before use - ensure it's always a valid string
    let finalShortName: string = "PWA"; // Default value

    if (
      appShortName &&
      typeof appShortName === "string" &&
      appShortName.trim().length > 0
    ) {
      finalShortName = appShortName.trim().substring(0, 12);
    } else if (appName && typeof appName === "string" && appName.length > 0) {
      finalShortName = appName.substring(0, 12);
    }

    // Ensure finalShortName is never empty or undefined
    if (!finalShortName || finalShortName.trim().length === 0) {
      finalShortName = "PWA";
    }

    // Double check: ensure it's a string
    finalShortName = String(finalShortName).trim().substring(0, 12) || "PWA";

    // Generate a unique manifest ID to prevent PWA collisions when
    // multiple PWAs are deployed on the same domain with different basePaths
    let manifestId: string;
    try {
      manifestId = generateManifestId(appName, finalBasePath);
    } catch {
      // Fallback if ID generation fails (shouldn't happen with valid inputs)
      manifestId = appName
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .substring(0, 20);
    }

    let manifestPath: string | undefined;
    try {
      if (iconPaths.length > 0) {
        // Manifest with generated icons
        const manifestWithIconsOptions = {
          name: appName,
          shortName: finalShortName,
          id: manifestId,
          startUrl: finalBasePath,
          scope: finalBasePath,
          display: "standalone" as const,
          themeColor: themeColor ?? "#ffffff",
          backgroundColor: backgroundColor ?? "#000000",
          icons: iconPaths.map((src) => ({
            src,
            sizes: src.match(/(\d+)x(\d+)/)?.[0] ?? "192x192",
            type: "image/png",
          })),
        };

        manifestPath = generateAndWriteManifest(
          manifestWithIconsOptions,
          finalOutputDir,
        );
        result.manifestPath = manifestPath;

        // Track manifest if it's new (not backed up)
        const manifestRelative = relative(result.projectPath, manifestPath);
        if (manifestRelative && !manifestRelative.startsWith("..")) {
          const wasBackedUp = transaction.getState().backups.some((b) => {
            const backupRelative = relative(result.projectPath, b.path);
            return backupRelative === manifestRelative;
          });
          if (!wasBackedUp) {
            transaction.trackCreatedFile(manifestRelative);
          }
        }

        console.log(chalk.green(`✓ Manifest generated: ${manifestPath}`));
      } else {
        // Minimal manifest without icons (use placeholder icon)
        // Note: Manifest requires at least one icon according to Zod schema
        // Create manifest with placeholder icon that must be replaced
        result.warnings.push(
          "No icons provided. Manifest generated with placeholder icon. Please provide an icon source with --icon-source for production.",
        );
        console.log(
          chalk.yellow("⚠ Generating manifest with placeholder icon"),
        );

        // Create manifest with placeholder icon
        // finalShortName is already validated above
        const manifestMinimalOptions = {
          name: appName,
          shortName: finalShortName,
          id: manifestId,
          startUrl: finalBasePath,
          scope: finalBasePath,
          display: "standalone" as const,
          themeColor: themeColor ?? "#ffffff",
          backgroundColor: backgroundColor ?? "#000000",
          icons: [
            {
              src: "/icon-192x192.png", // Placeholder - user must add a real icon
              sizes: "192x192",
              type: "image/png",
            },
          ],
        };

        manifestPath = generateAndWriteManifest(
          manifestMinimalOptions,
          finalOutputDir,
        );
        result.manifestPath = manifestPath;

        // Track manifest if it's new (not backed up)
        const manifestRelative = relative(result.projectPath, manifestPath);
        if (manifestRelative && !manifestRelative.startsWith("..")) {
          const wasBackedUp = transaction.getState().backups.some((b) => {
            const backupRelative = relative(result.projectPath, b.path);
            return backupRelative === manifestRelative;
          });
          if (!wasBackedUp) {
            transaction.trackCreatedFile(manifestRelative);
          }
        }

        console.log(chalk.green(`✓ Manifest generated: ${manifestPath}`));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorCode = detectErrorCode(errorMessage);
      const formattedError = formatError(errorCode, errorMessage);
      result.errors.push(formattedError);
      console.log(chalk.red(`✗ ${formattedError}`));

      // Rollback on critical error
      if (transaction) {
        transaction.rollback();
      }
      return result;
    }

    // Generate service worker with adaptive cache strategies
    if (!skipServiceWorker) {
      console.log(chalk.blue("⚙️ Generating service worker..."));

      try {
        // Try to detect backend integration (Laravel, Symfony, etc.)

        const factory = getBackendFactory();
        let backendIntegration: unknown = null;

        // First, try to detect backend automatically
        if (
          factory &&
          typeof factory === "object" &&
          "detectBackend" in factory
        ) {
          backendIntegration =
            factory.detectBackend(result.projectPath) ?? null;
        }

        // If auto-detection failed but framework is known, try to get integration directly
        if (
          !backendIntegration &&
          result.framework &&
          factory &&
          typeof factory === "object" &&
          "getIntegration" in factory
        ) {
          backendIntegration = factory.getIntegration(
            result.framework,
            result.projectPath,
          );
          // Verify the integration actually detects this project
          if (
            backendIntegration &&
            typeof backendIntegration === "object" &&
            "detect" in backendIntegration
          ) {
            const detectionResult = (
              backendIntegration as BackendIntegration
            ).detect();
            if (detectionResult && typeof detectionResult === "object") {
              const detected =
                (detectionResult as unknown as { detected?: boolean })
                  .detected ?? false;
              const confidence =
                (detectionResult as unknown as { confidence?: string })
                  .confidence ?? "low";
              if (!detected || confidence === "low") {
                backendIntegration = null;
              }
            }
          }
        }

        let swResult;
        if (
          backendIntegration &&
          typeof backendIntegration === "object" &&
          "detect" in backendIntegration &&
          "name" in backendIntegration
        ) {
          // Use backend-optimized service worker generation
          const detectionResult = (
            backendIntegration as { detect: () => unknown }
          ).detect();
          const name =
            (backendIntegration as { name?: string }).name ?? "Backend";
          const confidence =
            (detectionResult as { confidence?: string } | null)?.confidence ??
            "unknown";
          console.log(
            chalk.blue(
              `  Using ${name} optimized config (confidence: ${confidence})`,
            ),
          );
          swResult = await generateServiceWorkerFromBackend(
            backendIntegration as unknown as Parameters<
              typeof generateServiceWorkerFromBackend
            >[0],
            result.architecture,
            {
              projectPath: result.projectPath,
              outputDir: finalOutputDir,
              globDirectory: finalOutputDir,
            },
          );
        } else {
          // Fallback to generic generation with adaptive cache strategies
          const optimizationResult = (await optimizeProject(
            result.projectPath,
            scanResult &&
              typeof scanResult === "object" &&
              "assets" in scanResult
              ? (scanResult as { assets?: unknown }).assets
              : [],
            scanResult &&
              typeof scanResult === "object" &&
              "framework" in scanResult
              ? (scanResult as { framework?: { configuration?: unknown } })
                  .framework?.configuration
              : undefined,
            result.framework,
            iconSource,
          )) as OptimizationResultShape;

          // Convert adaptive cache strategies to runtime caching format
          const cacheStrategies =
            optimizationResult &&
            typeof optimizationResult === "object" &&
            "cacheStrategies" in optimizationResult
              ? ((optimizationResult as { cacheStrategies?: unknown[] })
                  .cacheStrategies ?? [])
              : [];
          const runtimeCaching = cacheStrategies.map((strategy) => {
            const strategyObj = strategy as {
              urlPattern?: unknown;
              handler?: string;
              options?: unknown;
            };
            return {
              urlPattern: strategyObj.urlPattern,
              handler: strategyObj.handler,
              options: strategyObj.options,
            };
          });

          if (runtimeCaching.length > 0) {
            // Use generateSimpleServiceWorker when we have adaptive cache strategies
            const apiType =
              (optimizationResult as unknown as { apiType?: string }).apiType ??
              "unknown";
            const strategiesCount = cacheStrategies?.length ?? 0;
            console.log(
              chalk.gray(
                `  Detected ${apiType} API, applying ${strategiesCount} adaptive cache strategy(ies)`,
              ),
            );
            swResult = await generateSimpleServiceWorker({
              projectPath: result.projectPath,
              outputDir: finalOutputDir,
              architecture: result.architecture,
              globDirectory: finalOutputDir,
              globPatterns: [
                "**/*.{html,js,css,png,jpg,jpeg,svg,webp,woff,woff2}",
              ],
              runtimeCaching,
            });
          } else {
            // Use generateServiceWorker with template when no adaptive strategies
            swResult = await generateServiceWorker({
              projectPath: result.projectPath,
              outputDir: finalOutputDir,
              architecture: result.architecture,
              framework: result.framework,
              globDirectory: finalOutputDir,
              globPatterns: [
                "**/*.{html,js,css,png,jpg,jpeg,svg,webp,woff,woff2}",
              ],
            });
          }

          // Log asset optimization suggestions if any
          if (optimizationResult.assetSuggestions.length > 0) {
            const highPrioritySuggestions =
              optimizationResult.assetSuggestions.filter(
                (suggestion) => suggestion.priority === "high",
              );
            if (highPrioritySuggestions.length > 0) {
              console.log(
                chalk.yellow(
                  `⚠ ${highPrioritySuggestions.length} high-priority asset optimization suggestion(s) found`,
                ),
              );
              highPrioritySuggestions.slice(0, 3).forEach((suggestion) => {
                console.log(chalk.gray(`  - ${suggestion.suggestion}`));
              });
            }
          }
        }

        result.serviceWorkerPath = swResult.swPath;
        console.log(
          chalk.green(
            `✓ Service worker generated: ${result.serviceWorkerPath}`,
          ),
        );
        console.log(chalk.gray(`  Pre-cached ${swResult.count} files`));

        // Track service worker if it's new (not backed up)
        const swRelative = relative(result.projectPath, swResult.swPath);
        if (swRelative && !swRelative.startsWith("..")) {
          const wasBackedUp = transaction.getState().backups.some((b) => {
            const backupRelative = relative(result.projectPath, b.path);
            return backupRelative === swRelative;
          });
          if (!wasBackedUp) {
            transaction.trackCreatedFile(swRelative);
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = detectErrorCode(errorMessage);
        const formattedError = formatError(errorCode, errorMessage);
        result.errors.push(formattedError);
        console.log(chalk.red(`✗ ${formattedError}`));

        // Rollback on critical error
        if (transaction) {
          transaction.rollback();
        }
        return result;
      }
    }

    // Inject meta-tags into HTML files
    if (!skipInjection) {
      console.log(chalk.blue("💉 Injecting meta-tags..."));

      try {
        // Find all HTML files and template files (including dist/ for production builds)
        // Priority: dist/ > public/ > root
        // Support: .html, .twig (Symfony), .html.twig (Symfony), .blade.php (Laravel)
        const htmlFiles = await glob("**/*.{html,twig,html.twig,blade.php}", {
          cwd: result.projectPath,
          ignore: [
            "**/node_modules/**",
            "**/.next/**",
            "**/.nuxt/**",
            "**/vendor/**",
          ],
          absolute: true,
        });

        // Sort: dist/ files first, then public/, then others
        htmlFiles.sort((a, b) => {
          const aInDist = a.includes("/dist/");
          const bInDist = b.includes("/dist/");
          const aInPublic = a.includes("/public/");
          const bInPublic = b.includes("/public/");

          if (aInDist && !bInDist) return -1;
          if (!aInDist && bInDist) return 1;
          if (aInPublic && !bInPublic) return -1;
          if (!aInPublic && bInPublic) return 1;
          return 0;
        });

        // Limiter le nombre de fichiers HTML si maxHtmlFiles est défini
        const htmlFilesToProcess =
          maxHtmlFiles && maxHtmlFiles > 0
            ? htmlFiles.slice(0, maxHtmlFiles)
            : htmlFiles;

        if (htmlFiles.length > 0) {
          const htmlCount = htmlFiles.filter(
            (f) => f.endsWith(".html") && !f.endsWith(".html.twig"),
          ).length;
          const twigCount = htmlFiles.filter(
            (f) => f.endsWith(".twig") || f.endsWith(".html.twig"),
          ).length;
          const bladeCount = htmlFiles.filter((f) =>
            f.endsWith(".blade.php"),
          ).length;
          const fileTypes = [];
          if (htmlCount > 0) fileTypes.push(`${htmlCount} HTML`);
          if (twigCount > 0) fileTypes.push(`${twigCount} Twig`);
          if (bladeCount > 0) fileTypes.push(`${bladeCount} Blade`);
          const typeSummary =
            fileTypes.length > 0 ? ` (${fileTypes.join(", ")})` : "";
          console.log(
            chalk.gray(
              `  Found ${htmlFiles.length} template file(s)${typeSummary}${maxHtmlFiles && maxHtmlFiles > 0 ? ` (processing ${htmlFilesToProcess.length})` : ""}`,
            ),
          );
        }

        // Backup HTML/template files before injection
        for (const htmlFile of htmlFilesToProcess) {
          const htmlRelativePath = relative(result.projectPath, htmlFile);
          if (htmlRelativePath && !htmlRelativePath.startsWith("..")) {
            transaction.backupFile(htmlRelativePath);
          }
        }

        const totalFiles = htmlFilesToProcess.length;

        // Normalize paths securely - helper function (needs htmlFile context)
        const normalizePathForInjection = (
          fullPath: string | undefined,
          basePath: string,
          outputDir: string,
          htmlFile: string,
          fallback: string,
        ): string => {
          if (!fullPath) return fallback;
          try {
            // Check if HTML file is in dist/ (production build)
            const htmlInDist = htmlFile.includes("/dist/");
            const swInDist = fullPath.includes("/dist/");

            // If HTML is in dist/, paths should be relative to dist/ root
            if (htmlInDist && swInDist) {
              // Both in dist/, use relative path from dist/ root
              const distIndex = fullPath.indexOf("/dist/");
              if (distIndex !== -1) {
                const distPath = fullPath.substring(distIndex + 6); // Remove up to /dist/
                return distPath.startsWith("/") ? distPath : `/${distPath}`;
              }
            }

            // If path is in outputDir (e.g., public/), it must be served at root
            const rel = relativePath(fullPath, basePath);
            let normalized = rel.startsWith("/") ? rel : `/${rel}`;

            // For Vite/React, if file is in public/ or dist/, remove directory from path
            const outputDirName = outputDir
              .replace(basePath, "")
              .replace(/^\/+|\/+$/g, "");
            if (outputDirName && normalized.startsWith(`/${outputDirName}/`)) {
              normalized = normalized.replace(`/${outputDirName}/`, "/");
            }

            // Also handle dist/ directory if present
            if (normalized.includes("/dist/")) {
              const distIndex = normalized.indexOf("/dist/");
              normalized = normalized.substring(distIndex + 6);
              normalized = normalized.startsWith("/")
                ? normalized
                : `/${normalized}`;
            }

            return normalized;
          } catch {
            return fallback;
          }
        };

        // Determine apple-touch-icon path
        const appleTouchIconFullPath = join(
          finalOutputDir,
          "apple-touch-icon.png",
        );
        const appleTouchIconExists = existsSync(appleTouchIconFullPath);

        // Create progress bar for large projects
        let progressBar: CliProgressBar = null;
        if (totalFiles > 10) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          progressBar = new cliProgress.SingleBar({
            format:
              chalk.blue("💉 Injecting meta-tags") +
              " |{bar}| {percentage}% | {value}/{total} files | ETA: {eta}s",
            barCompleteChar: "\u2588",
            barIncompleteChar: "\u2591",
            hideCursor: true,
          });
        }

        if (progressBar) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          progressBar.start(totalFiles, 0);
        }

        // Process files in parallel using batch injection with file-specific path normalization
        // We need to create options per file since normalization depends on htmlFile location
        const processFileWithNormalizedPaths = (
          htmlFile: string,
        ): Promise<ReturnType<typeof injectMetaTagsInFile>> => {
          const fileOptions = {
            manifestPath: normalizePathForInjection(
              result.manifestPath,
              result.projectPath,
              finalOutputDir,
              htmlFile,
              "/manifest.json",
            ),
            basePath: finalBasePath, // Propagate basePath to HTML injection
            themeColor: themeColor ?? "#ffffff",
            backgroundColor: backgroundColor ?? "#000000",
            appleTouchIcon: appleTouchIconExists
              ? normalizePathForInjection(
                  appleTouchIconFullPath,
                  result.projectPath,
                  finalOutputDir,
                  htmlFile,
                  "/apple-touch-icon.png",
                )
              : "/apple-touch-icon.png",
            appleMobileWebAppCapable: true,
            serviceWorkerPath: normalizePathForInjection(
              result.serviceWorkerPath,
              result.projectPath,
              finalOutputDir,
              htmlFile,
              "/sw.js",
            ),
          };

          // Use injectMetaTagsInFile directly (it's synchronous but we wrap it in Promise.resolve for parallel processing)
          return Promise.resolve(injectMetaTagsInFile(htmlFile, fileOptions));
        };

        const batchResult = await processInParallel(
          htmlFilesToProcess,
          processFileWithNormalizedPaths,
          {
            concurrency: 10,
            continueOnError: true,
            onProgress: (processed) => {
              if (progressBar) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                progressBar.update(processed);
              }
            },
          },
        );

        if (progressBar) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          progressBar.stop();
        }

        // Process results
        let injectedCount = 0;
        let skippedCount = 0;

        const successArray =
          batchResult &&
          typeof batchResult === "object" &&
          "successful" in batchResult
            ? ((batchResult as unknown as { successful: unknown[] })
                .successful ?? [])
            : [];

        for (const success of successArray) {
          if (!success || typeof success !== "object") continue;
          const successObj = success as { item?: string; result?: unknown };
          const item = successObj.item;
          const injectionResult = successObj.result as {
            injected?: unknown[];
            skipped?: unknown[];
            warnings?: unknown[];
          };

          if ((injectionResult?.injected?.length ?? 0) > 0) {
            injectedCount++;
            // Log détaillé pour debug (seulement si peu de fichiers)
            if (totalFiles <= 10 && item) {
              const relativePath = relative(result.projectPath, item);
              console.log(
                chalk.gray(
                  `    ✓ ${relativePath}: ${injectionResult?.injected?.length ?? 0} tag(s) injected`,
                ),
              );
            }
          } else if (
            (injectionResult?.skipped?.length ?? 0) > 0 &&
            (injectionResult?.injected?.length ?? 0) === 0
          ) {
            skippedCount++;
            if (totalFiles <= 10 && item) {
              const relativePath = relative(result.projectPath, item);
              console.log(
                chalk.gray(`    ⊘ ${relativePath}: already has PWA tags`),
              );
            }
          } else {
            if (totalFiles <= 10 && item) {
              const relativePath = relative(result.projectPath, item);
              console.log(
                chalk.yellow(
                  `    ⚠ ${relativePath}: no tags injected (check warnings)`,
                ),
              );
            }
            if ((injectionResult?.warnings?.length ?? 0) > 0) {
              injectionResult?.warnings?.forEach((warning: unknown) => {
                if (item && warning) {
                  // eslint-disable-next-line @typescript-eslint/no-base-to-string
                  const warningStr: string = String(warning);
                  result.warnings.push(
                    `${relative(result.projectPath, item)}: ${warningStr}`,
                  );
                }
              });
            }
          }
        }

        // Handle failed files
        const failedArray =
          batchResult &&
          typeof batchResult === "object" &&
          "failed" in batchResult
            ? ((batchResult as unknown as { failed: unknown[] }).failed ?? [])
            : [];

        for (const failed of failedArray) {
          if (!failed || typeof failed !== "object") continue;
          const failedObj = failed as unknown as {
            item?: string;
            error?: string;
          };
          const item = failedObj.item ?? "unknown file";
          const error = failedObj.error ?? "Unknown error";
          const errorCode = detectErrorCode(new Error(error));
          const warningMessage = formatError(errorCode, `${item}: ${error}`);
          result.warnings.push(warningMessage);
          if (totalFiles <= 10) {
            console.log(chalk.yellow(`⚠ ${warningMessage}`));
          }
        }

        result.htmlFilesInjected = injectedCount;
        const errorCount =
          batchResult &&
          typeof batchResult === "object" &&
          "totalFailed" in batchResult
            ? ((batchResult as unknown as { totalFailed?: number })
                .totalFailed ?? 0)
            : 0;
        const fileTypeLabel = htmlFilesToProcess.some(
          (f) =>
            f.endsWith(".twig") ||
            f.endsWith(".html.twig") ||
            f.endsWith(".blade.php"),
        )
          ? "template file(s)"
          : "HTML file(s)";

        // Message de résumé détaillé
        if (injectedCount > 0) {
          console.log(
            chalk.green(
              `✓ Injected meta-tags in ${injectedCount} ${fileTypeLabel}`,
            ),
          );
        }
        if (skippedCount > 0) {
          console.log(
            chalk.gray(
              `  ${skippedCount} ${fileTypeLabel} already had PWA tags`,
            ),
          );
        }
        if (errorCount > 0) {
          console.log(
            chalk.yellow(
              `  ${errorCount} ${fileTypeLabel} had errors (see warnings above)`,
            ),
          );
        }
        if (
          injectedCount === 0 &&
          skippedCount === 0 &&
          errorCount === 0 &&
          totalFiles > 0
        ) {
          console.log(
            chalk.yellow(
              `⚠ No tags were injected in ${totalFiles} ${fileTypeLabel}. Check if files contain valid HTML structure.`,
            ),
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorCode = detectErrorCode(errorMessage);
        const formattedError = formatError(errorCode, errorMessage);
        result.errors.push(formattedError);
        console.log(chalk.red(`✗ ${formattedError}`));

        // Rollback on critical error
        if (transaction) {
          transaction.rollback();
        }
        return result;
      }
    }

    result.success = result.errors.length === 0;

    if (result.success) {
      // Commit transaction if everything succeeded
      if (transaction) {
        transaction.commit();
      }
      console.log(chalk.green("\n✅ PWA setup completed successfully!"));
    } else {
      // Rollback on errors
      if (transaction) {
        console.log(chalk.yellow("\n🔄 Rolling back changes due to errors..."));
        transaction.rollback();
      }
      console.log(
        chalk.red(
          `\n❌ PWA setup completed with ${result.errors.length} error(s)`,
        ),
      );
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = detectErrorCode(errorMessage);
    const formattedError = formatError(errorCode, errorMessage);
    result.errors.push(formattedError);
    console.log(chalk.red(`✗ ${formattedError}`));

    // Rollback on unexpected error
    if (transaction) {
      console.log(
        chalk.yellow("\n🔄 Rolling back changes due to unexpected error..."),
      );
      transaction.rollback();
    }

    return result;
  }
}
