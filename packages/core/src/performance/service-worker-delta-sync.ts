/**
 * P2.4: Service Worker Delta Sync Performance Optimization
 * Optimizes service worker updates by syncing only changed assets
 * @category Performance
 */

import { z } from "zod";

/**
 * Service worker asset reference
 */
export interface SWAsset {
  /** Asset path relative to root */
  path: string;
  /** Asset hash (SHA256) */
  hash: string;
  /** Asset size in bytes */
  size: number;
  /** Whether asset is required on initial load */
  critical?: boolean;
  /** Cache strategy (network-first, cache-first, stale-while-revalidate) */
  strategy?: "network-first" | "cache-first" | "stale-while-revalidate";
}

/**
 * Service worker manifest snapshot
 */
export interface SWManifest {
  /** Manifest version */
  version: string;
  /** Creation timestamp */
  timestamp: number;
  /** All assets in manifest */
  assets: SWAsset[];
  /** Total manifest size */
  totalSize: number;
  /** Critical assets only size */
  criticalSize: number;
}

/**
 * Delta sync result
 */
export interface DeltaSyncResult {
  /** Assets to update */
  toAdd: SWAsset[];
  /** Assets to remove */
  toRemove: SWAsset[];
  /** Assets to keep (unchanged) */
  toKeep: SWAsset[];
  /** Total size to download */
  downloadSize: number;
  /** Bandwidth savings percentage */
  savingsPercentage: number;
  /** Estimated download time at 1Mbps */
  estimatedTime: number;
  /** Update strategy recommendation */
  strategy: "full" | "delta" | "critical-first";
}

/**
 * Service worker delta sync configuration
 */
export interface DeltaSyncConfig {
  /** Threshold for switching to full update (bytes) */
  fullUpdateThreshold?: number;
  /** Minimum delta benefit to use delta sync (%) */
  minDeltaBenefit?: number;
  /** Network speed estimate (Mbps) */
  networkSpeed?: number;
  /** Critical asset priority weight */
  criticalWeight?: number;
}

const DEFAULT_DELTA_CONFIG: Required<DeltaSyncConfig> = {
  fullUpdateThreshold: 5 * 1024 * 1024, // 5MB
  minDeltaBenefit: 20, // 20% savings minimum
  networkSpeed: 1, // 1 Mbps (conservative)
  criticalWeight: 2, // Critical assets worth 2x
};

/**
 * Custom error class for delta sync operations
 */
export class DeltaSyncError extends Error {
  name = "DeltaSyncError";
}

/**
 * Compare two service worker manifests and compute delta
 */
export function computeSWDelta(
  current: SWManifest,
  previous: SWManifest,
  config?: DeltaSyncConfig,
): DeltaSyncResult {
  const mergedConfig = { ...DEFAULT_DELTA_CONFIG, ...config };

  const previousMap = new Map(previous.assets.map((a) => [a.path, a]));
  const currentMap = new Map(current.assets.map((a) => [a.path, a]));

  const toAdd: SWAsset[] = [];
  const toRemove: SWAsset[] = [];
  const toKeep: SWAsset[] = [];

  // Find added/modified assets
  for (const [path, asset] of currentMap) {
    const prev = previousMap.get(path);
    if (!prev) {
      toAdd.push(asset);
    } else if (prev.hash !== asset.hash) {
      toAdd.push(asset);
    } else {
      toKeep.push(asset);
    }
  }

  // Find removed assets
  for (const [path, asset] of previousMap) {
    if (!currentMap.has(path)) {
      toRemove.push(asset);
    }
  }

  // Calculate sizes
  const downloadSize = toAdd.reduce((sum, a) => sum + a.size, 0);
  const removedSize = toRemove.reduce((sum, a) => sum + a.size, 0);
  const netChange = downloadSize - removedSize;
  const savingsPercentage =
    previous.totalSize > 0
      ? Math.max(
          0,
          ((previous.totalSize - netChange) / previous.totalSize) * 100,
        )
      : 100;

  // Determine sync strategy
  let strategy: "full" | "delta" | "critical-first" = "delta";
  if (downloadSize > mergedConfig.fullUpdateThreshold) {
    strategy = "full";
  } else if (
    savingsPercentage < mergedConfig.minDeltaBenefit &&
    toAdd.some((a) => a.critical)
  ) {
    strategy = "critical-first";
  }

  // Estimate download time (in milliseconds at network speed)
  // downloadSize in bytes, networkSpeed in Mbps
  const timeMs =
    ((downloadSize * 8) / (mergedConfig.networkSpeed * 1_000_000)) * 1000;

  return {
    toAdd,
    toRemove,
    toKeep,
    downloadSize,
    savingsPercentage,
    estimatedTime: Math.ceil(timeMs),
    strategy,
  };
}

/**
 * Generate service worker update script
 */
export function generateUpdateScript(delta: DeltaSyncResult): string {
  const lines: string[] = [
    "// Auto-generated service worker update script",
    `const delta = ${JSON.stringify(delta, null, 2)};`,
    "",
    "if (delta.strategy === 'full') {",
    "  // Perform full update - better for large changes",
    "  await clients.claim();",
    "  await caches.delete(CACHE_NAME);",
    "} else if (delta.strategy === 'critical-first') {",
    "  // Update critical assets first",
    "  const critical = delta.toAdd.filter(a => a.critical);",
    "  await updateAssets(critical);",
    "  // Then update remaining in background",
    "  const remaining = delta.toAdd.filter(a => !a.critical);",
    "  self.skipWaiting();",
    "  remaining.forEach(a => updateAsset(a));",
    "} else {",
    "  // Delta sync - only update changed assets",
    "  for (const asset of delta.toAdd) {",
    "    await updateAsset(asset);",
    "  }",
    "  for (const asset of delta.toRemove) {",
    "    await removeAsset(asset);",
    "  }",
    "}",
  ];

  return lines.join("\n");
}

/**
 * Validate service worker manifests
 */
export function validateManifests(
  current: unknown,
  previous: unknown,
): { current: SWManifest; previous: SWManifest } {
  const ManifestSchema = z.object({
    version: z.string(),
    timestamp: z.number(),
    assets: z.array(
      z.object({
        path: z.string(),
        hash: z.string(),
        size: z.number().nonnegative(),
        critical: z.boolean().optional(),
        strategy: z
          .enum(["network-first", "cache-first", "stale-while-revalidate"])
          .optional(),
      }),
    ),
    totalSize: z.number().nonnegative(),
    criticalSize: z.number().nonnegative(),
  });

  try {
    return {
      current: ManifestSchema.parse(current),
      previous: ManifestSchema.parse(previous),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new DeltaSyncError(`Invalid manifest: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Format delta sync result for reporting
 */
export function formatDeltaSyncReport(delta: DeltaSyncResult): string {
  const lines: string[] = [
    "═══ Service Worker Delta Sync Report ═══",
    `Strategy: ${delta.strategy.toUpperCase()}`,
    `Assets to update: ${delta.toAdd.length}`,
    `Assets to remove: ${delta.toRemove.length}`,
    `Assets unchanged: ${delta.toKeep.length}`,
    "",
    "Download Information:",
    `  Total size: ${formatBytes(delta.downloadSize)}`,
    `  Savings: ${delta.savingsPercentage.toFixed(1)}%`,
    `  Est. time @ 1Mbps: ${delta.estimatedTime}ms`,
    "",
    "Strategy Details:",
  ];

  if (delta.strategy === "full") {
    lines.push(
      "  Full update recommended - changes exceed threshold or delta not beneficial",
    );
  } else if (delta.strategy === "critical-first") {
    lines.push(
      "  Critical-first strategy - load critical assets immediately,",
      "  update remaining in background",
    );
  } else {
    lines.push("  Delta sync - only download changed assets for fast updates");
  }

  return lines.join("\n");
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Create a service worker manifest from assets
 */
export function createManifest(version: string, assets: SWAsset[]): SWManifest {
  const totalSize = assets.reduce((sum, a) => sum + a.size, 0);
  const criticalSize = assets
    .filter((a) => a.critical)
    .reduce((sum, a) => sum + a.size, 0);

  return {
    version,
    timestamp: Date.now(),
    assets,
    totalSize,
    criticalSize,
  };
}
