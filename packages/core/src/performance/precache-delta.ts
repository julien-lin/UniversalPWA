/**
 * P2.1: Workbox Precache Delta
 * Performance optimization: Only cache files that have changed since last build
 * @category Performance
 */

import { createHash } from "node:crypto";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { dirname } from "node:path";

/**
 * Manifest entry for a cached file
 */
export interface PrecacheEntry {
  /** File path relative to project root */
  url: string;
  /** File revision hash */
  revision: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  mtime: number;
}

/**
 * Delta information for a file
 */
export interface FileDelta {
  /** File path */
  url: string;
  /** Whether the file has changed */
  hasChanged: boolean;
  /** Change type: 'added' | 'modified' | 'deleted' | 'unchanged' */
  changeType: "added" | "modified" | "deleted" | "unchanged";
  /** Previous revision (if applicable) */
  previousRevision?: string;
  /** Current revision */
  currentRevision?: string;
}

/**
 * Precache delta result
 */
export interface PrecacheDeltaResult {
  /** Files to add to precache (new or modified) */
  filesToCache: PrecacheEntry[];
  /** Files to remove from precache (deleted) */
  filesToRemove: string[];
  /** Complete file deltas for audit */
  deltas: FileDelta[];
  /** Total size reduction from delta caching */
  sizeSavings: number;
  /** Metadata about the delta operation */
  metadata: {
    timestamp: string;
    previousManifestPath?: string;
    totalFiles: number;
    changedFiles: number;
    unchangedFiles: number;
  };
}

/**
 * Configuration for delta caching
 */
export interface DeltaCacheConfig {
  /** Path to store previous manifest for delta comparison */
  manifestCachePath: string;
  /** Whether to preserve previous manifest (for rollback) */
  preservePrevious?: boolean;
  /** Hash algorithm for file revisions */
  hashAlgorithm?: "sha256" | "md5";
  /** Minimum file size to include (bytes) */
  minFileSize?: number;
  /** Maximum file size to include (bytes) */
  maxFileSize?: number;
}

/**
 * Default delta cache configuration
 */
export const DEFAULT_DELTA_CONFIG: DeltaCacheConfig = {
  manifestCachePath: ".universal-pwa-cache/precache-manifest.json",
  preservePrevious: true,
  hashAlgorithm: "sha256",
  minFileSize: 0,
  maxFileSize: Infinity,
};

/**
 * Calculate file revision hash
 * Used to detect changes between builds
 */
export function calculateFileRevision(
  filePath: string,
  algorithm: "sha256" | "md5" = "sha256",
): string {
  if (!existsSync(filePath)) {
    return "";
  }

  try {
    const content = readFileSync(filePath);
    const hash = createHash(algorithm);
    hash.update(content);
    return hash.digest("hex");
  } catch {
    return "";
  }
}

/**
 * Generate precache manifest for current state
 * Lists all files that should be precached with their revisions
 */
export function generateCurrentManifest(
  files: Array<{ url: string; filePath: string }>,
  config: DeltaCacheConfig = DEFAULT_DELTA_CONFIG,
): PrecacheEntry[] {
  return files
    .filter((file) => {
      if (!existsSync(file.filePath)) {
        return false;
      }

      try {
        const stats = statSync(file.filePath);
        const size = stats.size;

        const minSize = config.minFileSize ?? 0;
        const maxSize = config.maxFileSize ?? Infinity;

        return size >= minSize && size <= maxSize;
      } catch {
        return false;
      }
    })
    .map((file) => ({
      url: file.url,
      revision: calculateFileRevision(
        file.filePath,
        config.hashAlgorithm ?? "sha256",
      ),
      size: statSync(file.filePath).size,
      mtime: statSync(file.filePath).mtime.getTime(),
    }));
}

/**
 * Load previous manifest from cache
 */
export function loadPreviousManifest(
  manifestCachePath: string,
): PrecacheEntry[] {
  if (!existsSync(manifestCachePath)) {
    return [];
  }

  try {
    const content = readFileSync(manifestCachePath, "utf-8");

    const parsed: unknown = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as PrecacheEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Save manifest for next delta comparison
 */
export function saveCurrentManifest(
  manifestCachePath: string,
  manifest: PrecacheEntry[],
  preservePrevious: boolean = true,
): void {
  const dir = dirname(manifestCachePath);

  // Create directory if needed
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Preserve previous manifest for rollback
  if (preservePrevious && existsSync(manifestCachePath)) {
    const backupPath = `${manifestCachePath}.backup`;
    const current = readFileSync(manifestCachePath);
    writeFileSync(backupPath, current);
  }

  writeFileSync(manifestCachePath, JSON.stringify(manifest, null, 2));
}

/**
 * Compute delta between previous and current manifest
 * Determines which files need to be cached
 */
export function computePrecacheDelta(
  currentManifest: PrecacheEntry[],
  previousManifest: PrecacheEntry[],
  config: DeltaCacheConfig = DEFAULT_DELTA_CONFIG,
): PrecacheDeltaResult {
  const previousMap = new Map(previousManifest.map((e) => [e.url, e]));
  const currentMap = new Map(currentManifest.map((e) => [e.url, e]));

  const deltas: FileDelta[] = [];
  const filesToCache: PrecacheEntry[] = [];
  const filesToRemove: string[] = [];
  let sizeSavings = 0;

  // Check current files for additions/modifications
  for (const current of currentManifest) {
    const previous = previousMap.get(current.url);

    if (!previous) {
      // New file
      deltas.push({
        url: current.url,
        hasChanged: true,
        changeType: "added",
        currentRevision: current.revision,
      });
      filesToCache.push(current);
    } else if (previous.revision !== current.revision) {
      // Modified file
      deltas.push({
        url: current.url,
        hasChanged: true,
        changeType: "modified",
        previousRevision: previous.revision,
        currentRevision: current.revision,
      });
      filesToCache.push(current);
      // Calculate savings from not re-caching unchanged files
      sizeSavings += previous.size;
    } else {
      // Unchanged file
      deltas.push({
        url: current.url,
        hasChanged: false,
        changeType: "unchanged",
        previousRevision: previous.revision,
        currentRevision: current.revision,
      });
      // Savings from skipping unchanged file
      sizeSavings += current.size;
    }
  }

  // Check for deleted files
  for (const previous of previousManifest) {
    if (!currentMap.has(previous.url)) {
      deltas.push({
        url: previous.url,
        hasChanged: true,
        changeType: "deleted",
        previousRevision: previous.revision,
      });
      filesToRemove.push(previous.url);
      sizeSavings += previous.size;
    }
  }

  return {
    filesToCache,
    filesToRemove,
    deltas,
    sizeSavings,
    metadata: {
      timestamp: new Date().toISOString(),
      previousManifestPath: config.manifestCachePath,
      totalFiles: currentManifest.length,
      changedFiles: deltas.filter((d) => d.hasChanged).length,
      unchangedFiles: deltas.filter((d) => !d.hasChanged).length,
    },
  };
}

/**
 * Format delta result for logging/debugging
 */
export function formatPrecacheDelta(result: PrecacheDeltaResult): string {
  const lines = [
    "Precache Delta Summary:",
    `  Total files: ${result.metadata.totalFiles}`,
    `  Changed files: ${result.metadata.changedFiles}`,
    `  Unchanged files: ${result.metadata.unchangedFiles}`,
    `  Size savings: ${formatBytes(result.sizeSavings)}`,
  ];

  if (result.filesToCache.length > 0) {
    lines.push(`  Files to cache: ${result.filesToCache.length}`);
  }

  if (result.filesToRemove.length > 0) {
    lines.push(`  Files to remove: ${result.filesToRemove.length}`);
  }

  return lines.join("\n");
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Error for delta operations
 */
export class DeltaCacheError extends Error {
  constructor(
    public readonly operation: string,
    message: string,
  ) {
    super(message);
    this.name = "DeltaCacheError";
  }
}
