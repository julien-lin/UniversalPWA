/**
 * Injector for Next.js layout.tsx/layout.ts files
 * Handles metadata injection into Next.js App Router layout files
 *
 * Supports:
 * - src/app/layout.tsx (TypeScript with extensions)
 * - src/app/layout.ts
 * - app/layout.tsx
 * - app/layout.ts
 *
 * The injector modifies the metadata export to include PWA manifest reference
 */

import { readFileSync, writeFileSync } from "fs";

export interface NextJsMetadataInjectorOptions {
  manifestPath?: string;
  basePath?: string; // Base path for manifest (e.g., /app/, /creativehub/)
  themeColor?: string;
  backgroundColor?: string;
  appleTouchIcon?: string;
}

export interface NextJsInjectionResult {
  injected: string[];
  skipped: string[];
  warnings: string[];
  modified: boolean;
  content?: string; // The modified content if injection was successful
}

/**
 * Checks if a file is a Next.js layout file
 */
export function isNextJsLayoutFile(filePath: string): boolean {
  const fileName = filePath.split("/").pop() || "";
  return /^layout\.(tsx?|jsx?)$/.test(fileName);
}

/**
 * Builds the manifest path based on basePath configuration
 */
function buildManifestPath(
  manifestPath: string | undefined,
  basePath?: string,
): string {
  if (!manifestPath) return "";

  let path = manifestPath.startsWith("/") ? manifestPath : `/${manifestPath}`;

  if (basePath && basePath !== "/") {
    const basePathTrimmed = basePath.endsWith("/")
      ? basePath.slice(0, -1)
      : basePath;
    const finalBasePath = basePathTrimmed.startsWith("/")
      ? basePathTrimmed
      : `/${basePathTrimmed}`;
    const pathTrimmed = path.startsWith("/") ? path.slice(1) : path;
    path = `${finalBasePath}/${pathTrimmed}`;
  }

  return path;
}

/**
 * Extracts the existing metadata object from layout file content
 * Returns the content range and object structure
 */
function findMetadataExport(content: string): {
  found: boolean;
  startIndex: number;
  endIndex: number;
  isObject: boolean;
  content: string;
} {
  // Match: export const metadata: Metadata = { ... }
  // More flexible to handle both single-line and multi-line objects
  const metadataPattern =
    /export\s+const\s+metadata\s*:\s*Metadata\s*=\s*(\{[\s\S]*?\})/;

  const match = content.match(metadataPattern);
  if (match) {
    return {
      found: true,
      startIndex: match.index || 0,
      endIndex: (match.index || 0) + match[0].length,
      isObject: true,
      content: match[1],
    };
  }

  // If not found as const, return not found
  return {
    found: false,
    startIndex: -1,
    endIndex: -1,
    isObject: false,
    content: "",
  };
}

/**
 * Injects manifest reference into metadata object
 */
function injectIntoMetadata(
  metadataContent: string,
  manifestPath: string,
): string {
  // Check if manifest is already present
  if (
    metadataContent.includes("manifest:") ||
    metadataContent.includes("'manifest'")
  ) {
    return metadataContent;
  }

  // Find the closing brace of the metadata object
  const closingBraceIndex = metadataContent.lastIndexOf("}");
  if (closingBraceIndex === -1) {
    return metadataContent;
  }

  // Insert manifest property before closing brace
  const beforeBrace = metadataContent.substring(0, closingBraceIndex).trimEnd();
  const manifestLine = `  manifest: '${manifestPath}',`;

  // Check if there's already content (add comma if needed)
  if (!beforeBrace.endsWith("{")) {
    return `${beforeBrace}\n${manifestLine}\n}`;
  }

  return `${beforeBrace}\n${manifestLine}\n}`;
}

/**
 * Creates a new metadata export if it doesn't exist
 */
function createMetadataExport(manifestPath: string): string {
  return `export const metadata: Metadata = {
  manifest: '${manifestPath}',
};`;
}

/**
 * Injects PWA metadata into Next.js layout file
 */
export function injectNextJsMetadata(
  filePath: string,
  content: string,
  options: NextJsMetadataInjectorOptions = {},
): NextJsInjectionResult {
  const result: NextJsInjectionResult = {
    injected: [],
    skipped: [],
    warnings: [],
    modified: false,
  };

  if (!isNextJsLayoutFile(filePath)) {
    result.warnings.push(`File is not a Next.js layout file: ${filePath}`);
    return result;
  }

  if (!options.manifestPath) {
    result.warnings.push("No manifestPath provided");
    return result;
  }

  // Build the full manifest path
  const finalManifestPath = buildManifestPath(
    options.manifestPath,
    options.basePath,
  );

  let modifiedContent = content;

  // Step 1: Add Metadata import if missing
  if (!modifiedContent.includes("import type { Metadata }")) {
    // Check if Metadata type annotation is used (pattern: : Metadata)
    const metadataTypeUsed = /:\s*Metadata\s*=|:\s*Metadata\s*[),;]/m.test(
      modifiedContent,
    );

    if (metadataTypeUsed) {
      // Metadata type is used but import is missing - try to add import
      const importPattern = /^(import[^;]+;)/m;
      const importMatch = modifiedContent.match(importPattern);

      if (importMatch) {
        const metadataImport = "import type { Metadata } from 'next';\n";
        modifiedContent = metadataImport + modifiedContent;
        result.warnings.push("Added missing Metadata import");
      } else {
        // No imports found, add at the top
        const metadataImport = "import type { Metadata } from 'next';\n\n";
        modifiedContent = metadataImport + modifiedContent;
        result.warnings.push("Added missing Metadata import at the top");
      }
    }
  }

  // Step 2: Find existing metadata export
  const metadataExport = findMetadataExport(modifiedContent);

  if (metadataExport.found) {
    // Update existing metadata object
    const updatedMetadata = injectIntoMetadata(
      metadataExport.content,
      finalManifestPath,
    );

    if (updatedMetadata !== metadataExport.content) {
      // Replace the metadata object
      modifiedContent =
        modifiedContent.substring(0, metadataExport.startIndex) +
        `export const metadata: Metadata = ${updatedMetadata}` +
        modifiedContent.substring(metadataExport.endIndex);

      result.injected.push(`manifest: '${finalManifestPath}'`);
      result.modified = true;
      return { ...result, content: modifiedContent };
    } else {
      result.skipped.push("manifest property already exists");
      return result;
    }
  } else {
    // Create new metadata export
    // Find a good place to insert it (after imports, before RootLayout function)
    const layoutFunctionPattern = /export\s+default\s+function\s+RootLayout/;
    const functionMatch = modifiedContent.match(layoutFunctionPattern);

    if (functionMatch) {
      const insertIndex = functionMatch.index || 0;
      const metadataExport = createMetadataExport(finalManifestPath);
      modifiedContent =
        modifiedContent.substring(0, insertIndex) +
        metadataExport +
        "\n\n" +
        modifiedContent.substring(insertIndex);

      result.injected.push(
        `Created metadata export with manifest: '${finalManifestPath}'`,
      );
      result.modified = true;
      return { ...result, content: modifiedContent };
    } else {
      result.warnings.push(
        "Could not find RootLayout function to insert metadata export",
      );
      return result;
    }
  }
}

/**
 * Injects PWA metadata into a Next.js layout file on disk
 */
export function injectNextJsMetadataInFile(
  filePath: string,
  options: NextJsMetadataInjectorOptions = {},
): NextJsInjectionResult {
  try {
    const content = readFileSync(filePath, "utf-8");
    const result = injectNextJsMetadata(filePath, content, options);

    if (result.modified && result.content) {
      writeFileSync(filePath, result.content, "utf-8");
    }

    return {
      injected: result.injected,
      skipped: result.skipped,
      warnings: result.warnings,
      modified: result.modified,
    };
  } catch (error) {
    return {
      injected: [],
      skipped: [],
      warnings: [
        `Error processing file: ${error instanceof Error ? error.message : String(error)}`,
      ],
      modified: false,
    };
  }
}
