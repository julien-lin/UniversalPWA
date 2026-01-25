/**
 * P2.3: Lazy Route Code Splitting Performance Optimization
 * Detects lazy-loaded routes and optimizes code splitting strategies
 * @category Performance
 */

import { z } from "zod";

/**
 * Route definition extracted from router configuration
 */
export interface RouteDefinition {
  /** Route path pattern */
  path: string;
  /** Component module reference or lazy loader function */
  component?: string;
  /** Route name/identifier */
  name?: string;
  /** Estimated component size in bytes */
  size?: number;
  /** Children routes for nested routing */
  children?: RouteDefinition[];
  /** Priority for preloading (0-100) */
  priority?: number;
  /** Whether this route is lazy-loaded */
  lazy?: boolean;
  /** Chunk name override */
  chunkName?: string;
}

/**
 * Route split information
 */
export interface RouteSplit {
  /** Route path */
  path: string;
  /** Associated chunk name */
  chunkName: string;
  /** Component size */
  componentSize: number;
  /** Gzip estimate */
  gzipSize: number;
  /** Load priority (0-100) */
  priority: number;
  /** Preload recommendations */
  preloadHint: "high" | "medium" | "low";
}

/**
 * Code splitting analysis result
 */
export interface LazyRouteAnalysis {
  /** Total routes analyzed */
  totalRoutes: number;
  /** Routes using lazy loading */
  lazyRoutes: number;
  /** Routes in same chunk */
  colocatedRoutes: number;
  /** Route splits */
  splits: RouteSplit[];
  /** Preload recommendations */
  preloadRecommendations: string[];
  /** Total estimated bundle reduction */
  estimatedReduction: number;
  /** Performance score (0-100) */
  score: number;
}

/**
 * Lazy route splitting configuration
 */
export interface LazyRouteSplittingConfig {
  /** Minimum bundle size to trigger splitting (bytes) */
  minBundleSize?: number;
  /** Optimal chunk size (bytes) */
  optimalChunkSize?: number;
  /** Preload routes within this distance from initial route */
  preloadDistance?: number;
  /** Enable aggressive code splitting */
  aggressive?: boolean;
}

const DEFAULT_SPLITTING_CONFIG: Required<LazyRouteSplittingConfig> = {
  minBundleSize: 100 * 1024, // 100KB
  optimalChunkSize: 50 * 1024, // 50KB
  preloadDistance: 2, // 2 hops in route tree
  aggressive: false,
};

/**
 * Route definition validation schema
 */
const RouteDefinitionSchema: z.ZodType<RouteDefinition> = z.lazy(() =>
  z.object({
    path: z.string().min(1),
    component: z.string().optional(),
    name: z.string().optional(),
    size: z.number().nonnegative().optional(),
    children: z.array(RouteDefinitionSchema).optional(),
    priority: z.number().min(0).max(100).optional(),
    lazy: z.boolean().optional(),
    chunkName: z.string().optional(),
  }),
);

/**
 * Custom error class for lazy route splitting operations
 */
export class LazyRouteSplittingError extends Error {
  name = "LazyRouteSplittingError";
}

/**
 * Estimate component size for a route
 */
function estimateComponentSize(
  component?: string,
  children: number = 0,
): number {
  if (!component) return 5 * 1024; // Default 5KB
  // Rough estimate: base 3KB + 2KB per child
  return Math.max(3000, component.length * 0.1) + children * 2000;
}

/**
 * Calculate optimal chunk size reduction
 */
function estimateGzipSize(size: number): number {
  return Math.ceil(size * 0.25); // Conservative 25% estimate
}

/**
 * Analyze route structure and detect lazy loading opportunities
 */
export function analyzeRouteStructure(
  routes: RouteDefinition[],
  config?: LazyRouteSplittingConfig,
): LazyRouteAnalysis {
  const mergedConfig = { ...DEFAULT_SPLITTING_CONFIG, ...config };

  const splits: RouteSplit[] = [];
  let lazyRoutes = 0;
  let colocatedRoutes = 0;
  let totalRoutes = 0;
  let totalEstimatedReduction = 0;

  const processRoute = (route: RouteDefinition, depth: number = 0): void => {
    totalRoutes++;

    const isLazy = route.lazy ?? route.component?.includes("lazy");
    if (isLazy) {
      lazyRoutes++;
    }

    const componentSize =
      route.size ??
      estimateComponentSize(route.component, route.children?.length ?? 0);
    const gzipSize = estimateGzipSize(componentSize);
    const priority = route.priority ?? (isLazy ? 25 : 75);
    const preloadHint: "high" | "medium" | "low" =
      priority >= 75 ? "high" : priority >= 50 ? "medium" : "low";

    splits.push({
      path: route.path,
      chunkName: route.chunkName ?? `chunk-${depth}-${totalRoutes}`,
      componentSize,
      gzipSize,
      priority,
      preloadHint,
    });

    if (
      componentSize < mergedConfig.optimalChunkSize &&
      route.children?.length
    ) {
      colocatedRoutes += route.children.length;
    }

    // Estimate size reduction from lazy loading
    if (isLazy) {
      totalEstimatedReduction += gzipSize;
    }

    // Process children
    if (route.children) {
      for (const child of route.children) {
        processRoute(child, depth + 1);
      }
    }
  };

  // Process all routes
  for (const route of routes) {
    processRoute(route);
  }

  // Generate preload recommendations
  const preloadRecommendations: string[] = [];
  const highPriorityRoutes = splits.filter((s) => s.preloadHint === "high");

  for (const route of highPriorityRoutes) {
    if (route.componentSize < mergedConfig.optimalChunkSize * 2) {
      preloadRecommendations.push(`Preload ${route.path} for better UX`);
    }
  }

  // Calculate performance score
  let score = 50;
  if (lazyRoutes > totalRoutes * 0.3) score += 15; // Good lazy loading adoption
  if (colocatedRoutes < totalRoutes * 0.2) score += 15; // Not too many colocated
  if (totalEstimatedReduction > 100 * 1024) score += 20; // Good reduction potential

  return {
    totalRoutes,
    lazyRoutes,
    colocatedRoutes,
    splits,
    preloadRecommendations,
    estimatedReduction: totalEstimatedReduction,
    score: Math.min(100, score),
  };
}

/**
 * Generate route split strategy with recommendations
 */
export function generateSplitStrategy(
  routes: RouteDefinition[],
  config?: LazyRouteSplittingConfig,
): {
  analysis: LazyRouteAnalysis;
  strategy: {
    splitRoutes: string[];
    preloadRoutes: string[];
    colocateRoutes: string[];
  };
} {
  const analysis = analyzeRouteStructure(routes, config);
  const mergedConfig = { ...DEFAULT_SPLITTING_CONFIG, ...config };

  const splitRoutes: string[] = [];
  const preloadRoutes: string[] = [];
  const colocateRoutes: string[] = [];

  for (const split of analysis.splits) {
    if (split.componentSize > mergedConfig.optimalChunkSize) {
      splitRoutes.push(split.path);
    }

    if (
      split.preloadHint === "high" &&
      split.componentSize < mergedConfig.optimalChunkSize * 2
    ) {
      preloadRoutes.push(split.path);
    }

    if (split.componentSize < mergedConfig.optimalChunkSize / 2) {
      colocateRoutes.push(split.path);
    }
  }

  return {
    analysis,
    strategy: {
      splitRoutes,
      preloadRoutes,
      colocateRoutes,
    },
  };
}

/**
 * Validate route definitions
 */
export function validateRoutes(routes: unknown): RouteDefinition[] {
  if (!Array.isArray(routes)) {
    throw new LazyRouteSplittingError("Routes must be an array");
  }

  try {
    const schema = z.array(RouteDefinitionSchema);
    return schema.parse(routes);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new LazyRouteSplittingError(
        `Invalid route definitions: ${error.message}`,
      );
    }
    if (error instanceof LazyRouteSplittingError) {
      throw error;
    }
    throw new LazyRouteSplittingError(`Validation failed: ${String(error)}`);
  }
}

/**
 * Format lazy route analysis for reporting
 */
export function formatLazyRouteAnalysis(analysis: LazyRouteAnalysis): string {
  const lines: string[] = [
    "═══ Lazy Route Code Splitting Analysis ═══",
    `Total Routes: ${analysis.totalRoutes}`,
    `Lazy Routes: ${analysis.lazyRoutes} (${((analysis.lazyRoutes / analysis.totalRoutes) * 100).toFixed(1)}%)`,
    `Colocated Routes: ${analysis.colocatedRoutes}`,
    `Performance Score: ${analysis.score}/100`,
    `Estimated Bundle Reduction: ${(analysis.estimatedReduction / 1024).toFixed(1)} KB`,
    "",
    "Route Splits:",
  ];

  for (const split of analysis.splits) {
    lines.push(
      `  • ${split.path} (${split.preloadHint}) - ${split.componentSize} bytes (${split.gzipSize} gzipped)`,
    );
  }

  if (analysis.preloadRecommendations.length > 0) {
    lines.push("", "Preload Recommendations:");
    for (const rec of analysis.preloadRecommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  return lines.join("\n");
}
