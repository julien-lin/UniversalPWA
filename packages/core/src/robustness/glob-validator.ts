/**
 * Glob Pattern Validator
 * Prevents DoS attacks via glob expansion limits, pattern validation, and recursion constraints
 * Phase 3.3: Robustness - Glob Validation Bounds
 *
 * Security Features:
 * - Pattern injection validation (prevents regex escape sequences)
 * - File count limits (max 10,000 files)
 * - Recursion depth constraints
 * - Safe glob expansion with timeout
 * - Brace expansion safety checks
 */

import { Minimatch } from "minimatch";

export interface GlobValidationConfig {
  /** Maximum number of files allowed from glob expansion */
  maxFiles: number;
  /** Maximum recursion depth (** nesting levels) */
  maxRecursionDepth: number;
  /** Timeout for glob operations in milliseconds */
  timeout: number;
  /** Enable brace expansion validation */
  allowBraceExpansion: boolean;
}

export interface GlobValidationResult {
  /** Whether the pattern is valid and safe */
  isValid: boolean;
  /** Reason if invalid */
  reason?: string;
  /** Pattern analysis details */
  analysis: {
    /** Number of ** (recursive globstar) patterns */
    globstarCount: number;
    /** Detected brace expansion patterns */
    hasBraceExpansion: boolean;
    /** Potential file count estimate (if valid) */
    estimatedFileCount?: number;
    /** Whether pattern uses negation */
    hasNegation: boolean;
  };
}

export interface GlobExpansionResult {
  /** Whether expansion succeeded */
  success: boolean;
  /** Expanded file paths */
  files: string[];
  /** Total file count */
  count: number;
  /** Whether result was truncated */
  truncated: boolean;
  /** Reason if failed */
  error?: string;
}

export interface PatternAnalysis {
  /** Pattern string */
  pattern: string;
  /** Is valid for safe expansion */
  isValid: boolean;
  /** Number of recursive globstar patterns */
  globstarCount: number;
  /** Pattern uses braces {} */
  usesBraces: boolean;
  /** Pattern uses negation ! */
  usesNegation: boolean;
  /** Estimated complexity level */
  complexity: "low" | "medium" | "high";
  /** Detailed issues if invalid */
  issues: string[];
}

/**
 * Default validation config
 */
const DEFAULT_CONFIG: GlobValidationConfig = {
  maxFiles: 10000,
  maxRecursionDepth: 10,
  timeout: 2000,
  allowBraceExpansion: true,
};

/**
 * Validate glob pattern for safety before expansion
 *
 * Checks for:
 * - Injection attempts (escape sequences, regex metacharacters)
 * - Excessive recursion (too many ** patterns)
 * - Brace explosion potential
 * - Invalid pattern syntax
 */
export function validatePattern(
  pattern: string,
  config: Partial<GlobValidationConfig> = {},
): GlobValidationResult {
  const mergedConfig: GlobValidationConfig = { ...DEFAULT_CONFIG, ...config };

  const analysis: GlobValidationResult["analysis"] = {
    globstarCount: 0,
    hasBraceExpansion: false,
    hasNegation: false,
  };

  const issues: string[] = [];

  // Check for empty pattern
  if (!pattern || pattern.trim().length === 0) {
    return {
      isValid: false,
      reason: "Pattern cannot be empty",
      analysis,
    };
  }

  // Check for negation pattern
  analysis.hasNegation = pattern.startsWith("!");

  // Check for dangerous escape sequences
  if (
    pattern.includes("\\x") ||
    pattern.includes("\\u") ||
    pattern.includes("\\0")
  ) {
    issues.push("Pattern contains dangerous escape sequences");
  }

  // Check for regex metacharacters outside of glob context
  const regexMeta = /[()[\]{}?+^$|]/g;
  const metaMatches = pattern.match(regexMeta) || [];
  if (metaMatches.length > 5) {
    issues.push(
      "Pattern contains excessive regex metacharacters (potential injection)",
    );
  }

  // Count globstar patterns (**)
  const globstarMatches = pattern.match(/\*\*/g) || [];
  analysis.globstarCount = globstarMatches.length;

  if (analysis.globstarCount > mergedConfig.maxRecursionDepth) {
    issues.push(
      `Pattern has ${analysis.globstarCount} globstar patterns (max ${mergedConfig.maxRecursionDepth})`,
    );
  }

  // Check brace expansion
  if (pattern.includes("{") && pattern.includes("}")) {
    analysis.hasBraceExpansion = true;

    // Check for brace explosion (e.g., {1..1000})
    const braceExpansionPattern = /\{([0-9]+)\.\.([0-9]+)\}/g;
    let braceMatch: RegExpExecArray | null;
    let totalBraceExpansions = 1;

    while ((braceMatch = braceExpansionPattern.exec(pattern)) !== null) {
      const start = parseInt(braceMatch[1], 10);
      const end = parseInt(braceMatch[2], 10);
      const range = Math.abs(end - start) + 1;

      if (range > 1000) {
        issues.push(
          `Brace range ${braceMatch[0]} expands to ${range} items (max 1000)`,
        );
      }

      totalBraceExpansions *= range;
    }

    if (totalBraceExpansions > 10000) {
      issues.push(
        `Brace expansion would create ${totalBraceExpansions} patterns (max 10000)`,
      );
    }

    if (!mergedConfig.allowBraceExpansion) {
      issues.push("Brace expansion not allowed in current configuration");
    }
  }

  // Check for patterns that could cause excessive matching
  if (pattern.includes("**/**")) {
    issues.push(
      "Nested globstar patterns (**/**) can cause excessive file matching",
    );
  }

  // Check pattern ends with ** (recursive at end)
  if (pattern.endsWith("/**")) {
    analysis.globstarCount += 1; // Extra consideration for recursive search
  }

  // Estimate potential file count based on pattern complexity
  analysis.estimatedFileCount = estimateFileCount(pattern);

  if (analysis.estimatedFileCount > mergedConfig.maxFiles) {
    issues.push(
      `Pattern could match ~${analysis.estimatedFileCount} files (max ${mergedConfig.maxFiles})`,
    );
  }

  // Check for absolute paths (should be relative)
  if (pattern.startsWith("/") || pattern.startsWith("C:")) {
    issues.push("Absolute paths are not allowed; use relative patterns");
  }

  // Validate minimatch compatibility
  try {
    new Minimatch(pattern, { dot: true });
  } catch (error) {
    issues.push(
      `Invalid glob pattern: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  return {
    isValid: issues.length === 0,
    reason: issues.length > 0 ? issues[0] : undefined,
    analysis,
  };
}

/**
 * Analyze glob pattern complexity and characteristics
 */
export function analyzePattern(pattern: string): PatternAnalysis {
  const issues: string[] = [];
  const globstarCount = (pattern.match(/\*\*/g) || []).length;
  const usesBraces = pattern.includes("{") && pattern.includes("}");
  const usesNegation = pattern.startsWith("!");

  let complexity: "low" | "medium" | "high" = "low";

  if (globstarCount >= 3 || usesBraces || pattern.length > 200) {
    complexity = "high";
  } else if (globstarCount >= 2 || usesBraces || pattern.length > 100) {
    complexity = "medium";
  }

  if (globstarCount > 10) {
    issues.push("Excessive globstar patterns");
  }

  if (usesBraces) {
    const braceMatches = pattern.match(/\{[^}]+\}/g) || [];
    const braceExpansionCount = braceMatches.reduce(
      (sum: number, brace: string) => {
        // Check for range expansion {1..N}
        const rangeMatch = brace.match(/\{([0-9]+)\.\.([0-9]+)\}/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          const range = Math.abs(end - start) + 1;
          if (range > 1000) {
            issues.push(
              `Brace range ${brace} expands to ${range} items (max 1000)`,
            );
          }
          return sum * range;
        }
        const items = brace.split(",").length;
        return sum * items;
      },
      1,
    );

    if (braceExpansionCount > 10000) {
      issues.push("Brace expansion exceeds limit");
    }
  }

  return {
    pattern,
    isValid: issues.length === 0,
    globstarCount,
    usesBraces,
    usesNegation,
    complexity,
    issues,
  };
}

/**
 * Estimate potential file count for a glob pattern
 *
 * Uses heuristics:
 * - Each * = ~100 potential matches
 * - Each ** = ~500 potential matches
 * - Brace expansion multiplies estimate
 * - Complex patterns = higher estimates
 */
export function estimateFileCount(pattern: string): number {
  let estimate = 1;

  // Count single star matches
  const singleStars = (pattern.match(/(?<!\*)\*(?!\*)/g) || []).length;
  estimate += singleStars * 100;

  // Count double star (globstar) matches
  const doubleStars = (pattern.match(/\*\*/g) || []).length;
  estimate += doubleStars * 500;

  // Account for brace expansion
  if (pattern.includes("{") && pattern.includes("}")) {
    const braceMatches = pattern.match(/\{[^}]*\}/g) || [];
    for (const brace of braceMatches) {
      const itemCount = brace.split(",").length;
      estimate *= itemCount;
    }
  }

  // Cap at practical maximum
  return Math.min(estimate, 100000);
}

/**
 * Safely expand glob pattern with constraints
 *
 * - Validates pattern first
 * - Limits expansion with timeout
 * - Truncates results if over max files
 * - Returns detailed status
 */
export function expandGlob(
  pattern: string,
  basePath: string,
  fileSystem: {
    readdir: (path: string) => string[];
    isDirectory: (path: string) => boolean;
    exists: (path: string) => boolean;
  },
  config: Partial<GlobValidationConfig> = {},
): GlobExpansionResult {
  const mergedConfig: GlobValidationConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate pattern first
  const validation = validatePattern(pattern, mergedConfig);

  if (!validation.isValid) {
    return {
      success: false,
      files: [],
      count: 0,
      truncated: false,
      error: validation.reason,
    };
  }

  try {
    const startTime = Date.now();
    const files: string[] = [];

    // Simple glob expansion using minimatch
    const globber = new Minimatch(pattern, {
      dot: true,
      noglobstar: false,
    });

    // Recursive directory traversal with limits
    const traverseDirectory = (dir: string, currentDepth: number): string[] => {
      const elapsed = Date.now() - startTime;
      if (elapsed > mergedConfig.timeout) {
        throw new Error("Glob expansion timeout exceeded");
      }

      if (currentDepth > mergedConfig.maxRecursionDepth) {
        return [];
      }

      const results: string[] = [];

      try {
        const entries = fileSystem.readdir(dir);

        for (const entry of entries) {
          if (files.length + results.length >= mergedConfig.maxFiles) {
            return results;
          }

          const fullPath = `${dir}/${entry}`;

          if (globber.match(fullPath)) {
            results.push(fullPath);
          }

          if (fileSystem.isDirectory(fullPath)) {
            const subResults = traverseDirectory(fullPath, currentDepth + 1);
            results.push(...subResults);
          }
        }
      } catch {
        // Ignore directory traversal errors
      }

      return results;
    };

    const expanded = traverseDirectory(basePath, 0);
    const truncated = expanded.length >= mergedConfig.maxFiles;

    return {
      success: true,
      files: truncated ? expanded.slice(0, mergedConfig.maxFiles) : expanded,
      count: expanded.length,
      truncated,
    };
  } catch (error) {
    return {
      success: false,
      files: [],
      count: 0,
      truncated: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during glob expansion",
    };
  }
}

/**
 * Get safe glob options for minimatch
 */
export function getSafeGlobOptions(
  config: Partial<GlobValidationConfig> = {},
): Record<string, unknown> {
  return {
    dot: true,
    noglobstar: false,
    noext: false,
    nocase: false,
    matchBase: false,
    nonegate: false,
    nocomment: false,
    braceExpansion: config.allowBraceExpansion !== false,
  };
}

/**
 * Format validation result for logging/display
 */
export function formatValidationResult(result: GlobValidationResult): string {
  const status = result.isValid ? "✓ Valid" : "✗ Invalid";
  const reason = result.reason ? ` (${result.reason})` : "";
  const globstars = `globstars: ${result.analysis.globstarCount}`;
  const braces = result.analysis.hasBraceExpansion
    ? "braces: yes"
    : "braces: no";
  const negation = result.analysis.hasNegation
    ? "negation: yes"
    : "negation: no";
  const files = result.analysis.estimatedFileCount
    ? `~${result.analysis.estimatedFileCount} files`
    : "unknown";

  return `${status}${reason} | ${globstars}, ${braces}, ${negation}, ${files}`;
}

/**
 * Format expansion result for logging/display
 */
export function formatExpansionResult(result: GlobExpansionResult): string {
  if (!result.success) {
    return `✗ Failed: ${result.error}`;
  }

  const status = result.truncated ? "⚠ Truncated" : "✓ Success";
  const count = `${result.count} files`;
  const truncNote = result.truncated ? " (limit reached)" : "";

  return `${status}: ${count}${truncNote}`;
}
