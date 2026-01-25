/**
 * P2.2: Incremental Bundle Analysis
 * Performance optimization: Track bundle chunks and detect size changes
 * @category Performance
 */

/**
 * Information about a bundle chunk
 */
export interface BundleChunk {
  /** Chunk identifier (hash or name) */
  id: string;
  /** Chunk name/entry point */
  name: string;
  /** Raw (uncompressed) size in bytes */
  size: number;
  /** Gzipped size in bytes (if available) */
  gzipSize?: number;
  /** Brotli compressed size in bytes (if available) */
  brotliSize?: number;
  /** Files included in this chunk */
  files: string[];
  /** Dependencies: chunk IDs this chunk depends on */
  dependencies: string[];
}

/**
 * Bundle analysis snapshot
 */
export interface BundleSnapshot {
  /** Timestamp of analysis */
  timestamp: string;
  /** Build identifier (hash or version) */
  buildId: string;
  /** Total bundle size (all chunks combined) */
  totalSize: number;
  /** Total gzipped size */
  totalGzipSize?: number;
  /** All chunks in bundle */
  chunks: BundleChunk[];
}

/**
 * Analysis of bundle changes
 */
export interface BundleAnalysis {
  /** Current bundle snapshot */
  current: BundleSnapshot;
  /** Previous bundle snapshot (if available) */
  previous?: BundleSnapshot;
  /** Size changes per chunk */
  chunkDeltas: Array<{
    chunkId: string;
    chunkName: string;
    previousSize: number | null;
    currentSize: number;
    sizeDelta: number;
    percentChange: number;
  }>;
  /** Total size change */
  totalSizeDelta: number;
  /** Chunks that were added */
  addedChunks: BundleChunk[];
  /** Chunks that were removed */
  removedChunks: BundleChunk[];
  /** Chunks that exceed warning threshold */
  oversizedChunks: Array<{
    chunkId: string;
    chunkName: string;
    size: number;
    threshold: number;
  }>;
  /** Performance alerts */
  alerts: string[];
}

/**
 * Configuration for bundle analysis
 */
export interface BundleAnalysisConfig {
  /** Maximum chunk size before warning (bytes) */
  chunkSizeWarning?: number;
  /** Maximum total bundle size before warning (bytes) */
  bundleSizeWarning?: number;
  /** Maximum allowed growth per chunk (bytes) */
  maxChunkGrowth?: number;
  /** Maximum allowed total bundle growth (bytes) */
  maxBundleGrowth?: number;
}

/**
 * Default bundle analysis configuration
 */
export const DEFAULT_ANALYSIS_CONFIG: BundleAnalysisConfig = {
  chunkSizeWarning: 500 * 1024, // 500 KB
  bundleSizeWarning: 5 * 1024 * 1024, // 5 MB
  maxChunkGrowth: 50 * 1024, // 50 KB
  maxBundleGrowth: 200 * 1024, // 200 KB
};

/**
 * Calculate gzip size estimation
 * Browser gzip compression ratios typically 70-90% of original
 */
export function estimateGzipSize(rawSize: number): number {
  // Conservative estimate: 75% compression ratio
  return Math.ceil(rawSize * 0.25);
}

/**
 * Calculate brotli size estimation
 * Brotli typically achieves better compression than gzip (80-90%)
 */
export function estimateBrotliSize(rawSize: number): number {
  // Conservative estimate: 80% compression ratio
  return Math.ceil(rawSize * 0.2);
}

/**
 * Analyze bundle for size issues
 */
export function analyzeBundleSize(
  snapshot: BundleSnapshot,
  config: BundleAnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
): string[] {
  const alerts: string[] = [];
  const chunkWarning = config.chunkSizeWarning ?? 500 * 1024;
  const bundleWarning = config.bundleSizeWarning ?? 5 * 1024 * 1024;

  // Check total bundle size
  if (snapshot.totalSize > bundleWarning) {
    alerts.push(
      `⚠️  Total bundle size (${formatBytes(snapshot.totalSize)}) exceeds warning threshold (${formatBytes(bundleWarning)})`,
    );
  }

  // Check individual chunks
  for (const chunk of snapshot.chunks) {
    if (chunk.size > chunkWarning) {
      alerts.push(
        `⚠️  Chunk "${chunk.name}" (${formatBytes(chunk.size)}) exceeds warning threshold (${formatBytes(chunkWarning)})`,
      );
    }

    // Check for duplicate dependencies
    if (chunk.dependencies.length > 0) {
      const uniqueDeps = new Set(chunk.dependencies);
      if (uniqueDeps.size !== chunk.dependencies.length) {
        alerts.push(`⚠️  Chunk "${chunk.name}" has duplicate dependencies`);
      }
    }
  }

  return alerts;
}

/**
 * Compare two bundle snapshots to detect changes
 */
export function compareBundleSnapshots(
  current: BundleSnapshot,
  previous: BundleSnapshot,
  config: BundleAnalysisConfig = DEFAULT_ANALYSIS_CONFIG,
): BundleAnalysis {
  const previousChunkMap = new Map(previous.chunks.map((c) => [c.id, c]));
  const currentChunkMap = new Map(current.chunks.map((c) => [c.id, c]));

  const chunkDeltas: BundleAnalysis["chunkDeltas"] = [];
  const addedChunks: BundleChunk[] = [];
  const removedChunks: BundleChunk[] = [];

  // Analyze each current chunk
  for (const currentChunk of current.chunks) {
    const previousChunk = previousChunkMap.get(currentChunk.id);

    if (!previousChunk) {
      // New chunk
      addedChunks.push(currentChunk);
      chunkDeltas.push({
        chunkId: currentChunk.id,
        chunkName: currentChunk.name,
        previousSize: null,
        currentSize: currentChunk.size,
        sizeDelta: currentChunk.size,
        percentChange: 100,
      });
    } else {
      // Existing chunk - check for size change
      const sizeDelta = currentChunk.size - previousChunk.size;
      const percentChange =
        previousChunk.size > 0 ? (sizeDelta / previousChunk.size) * 100 : 0;

      chunkDeltas.push({
        chunkId: currentChunk.id,
        chunkName: currentChunk.name,
        previousSize: previousChunk.size,
        currentSize: currentChunk.size,
        sizeDelta,
        percentChange,
      });
    }
  }

  // Detect removed chunks
  for (const previousChunk of previous.chunks) {
    if (!currentChunkMap.has(previousChunk.id)) {
      removedChunks.push(previousChunk);
      chunkDeltas.push({
        chunkId: previousChunk.id,
        chunkName: previousChunk.name,
        previousSize: previousChunk.size,
        currentSize: 0,
        sizeDelta: -previousChunk.size,
        percentChange: -100,
      });
    }
  }

  // Detect oversized chunks
  const chunkWarning = config.chunkSizeWarning ?? 500 * 1024;
  const oversizedChunks = current.chunks
    .filter((c) => c.size > chunkWarning)
    .map((c) => ({
      chunkId: c.id,
      chunkName: c.name,
      size: c.size,
      threshold: chunkWarning,
    }));

  // Generate alerts
  const alerts = analyzeBundleSize(current, config);
  const maxChunkGrowth = config.maxChunkGrowth ?? 50 * 1024;
  const maxBundleGrowth = config.maxBundleGrowth ?? 200 * 1024;

  // Check for excessive chunk growth
  for (const delta of chunkDeltas) {
    if (delta.sizeDelta > maxChunkGrowth) {
      alerts.push(
        `🔴 Chunk "${delta.chunkName}" grew by ${formatBytes(delta.sizeDelta)} (${delta.percentChange.toFixed(1)}%)`,
      );
    }
  }

  // Check for excessive bundle growth
  const totalSizeDelta = current.totalSize - previous.totalSize;
  if (totalSizeDelta > maxBundleGrowth) {
    alerts.push(
      `🔴 Total bundle grew by ${formatBytes(totalSizeDelta)} (${((totalSizeDelta / previous.totalSize) * 100).toFixed(1)}%)`,
    );
  }

  return {
    current,
    previous,
    chunkDeltas,
    totalSizeDelta,
    addedChunks,
    removedChunks,
    oversizedChunks,
    alerts,
  };
}

/**
 * Format bundle analysis for logging
 */
export function formatBundleAnalysis(analysis: BundleAnalysis): string {
  const lines: string[] = [];

  lines.push("Bundle Analysis Report");
  lines.push("=".repeat(50));

  // Summary
  lines.push("\nSummary:");
  lines.push(`  Current size: ${formatBytes(analysis.current.totalSize)}`);
  if (analysis.previous) {
    lines.push(`  Previous size: ${formatBytes(analysis.previous.totalSize)}`);
    lines.push(`  Delta: ${formatBytes(analysis.totalSizeDelta)}`);
  }

  // Added chunks
  if (analysis.addedChunks.length > 0) {
    lines.push(`\nAdded Chunks (${analysis.addedChunks.length}):`);
    for (const chunk of analysis.addedChunks) {
      lines.push(`  + ${chunk.name}: ${formatBytes(chunk.size)}`);
    }
  }

  // Removed chunks
  if (analysis.removedChunks.length > 0) {
    lines.push(`\nRemoved Chunks (${analysis.removedChunks.length}):`);
    for (const chunk of analysis.removedChunks) {
      lines.push(`  - ${chunk.name}: ${formatBytes(chunk.size)}`);
    }
  }

  // Oversized chunks
  if (analysis.oversizedChunks.length > 0) {
    lines.push(`\nOversized Chunks (${analysis.oversizedChunks.length}):`);
    for (const chunk of analysis.oversizedChunks) {
      lines.push(
        `  ⚠️  ${chunk.chunkName}: ${formatBytes(chunk.size)} (>${formatBytes(chunk.threshold)})`,
      );
    }
  }

  // Alerts
  if (analysis.alerts.length > 0) {
    lines.push(`\nAlerts (${analysis.alerts.length}):`);
    for (const alert of analysis.alerts) {
      lines.push(`  ${alert}`);
    }
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
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Error for bundle analysis
 */
export class BundleAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BundleAnalysisError";
  }
}
