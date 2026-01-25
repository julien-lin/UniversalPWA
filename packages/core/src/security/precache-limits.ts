/**
 * P1.2: Workbox Precache Bounded Limits
 * Security constraints for Workbox glob patterns to prevent DoS and memory exhaustion
 * @category Security
 */

/**
 * Limits configuration for precache operations
 */
export interface PrecacheLimits {
  /** Maximum number of files to precache */
  maxFiles: number;
  /** Maximum total size in bytes for all precached files */
  maxTotalSize: number;
  /** Maximum depth of directory traversal */
  maxDepth: number;
  /** Global ignore patterns (applied to all globPatterns) */
  ignorePatterns: string[];
  /** Maximum results from glob operations */
  maxGlobResults: number;
}

/**
 * Preset limits by framework type
 * Balanced for typical project structures while preventing DoS
 */
export const PRECACHE_LIMITS_BY_FRAMEWORK: Record<string, PrecacheLimits> = {
  react: {
    maxFiles: 500,
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    maxDepth: 8,
    maxGlobResults: 1000,
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".git/**",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
      ".env*",
      ".DS_Store",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ],
  },
  vue: {
    maxFiles: 500,
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    maxDepth: 8,
    maxGlobResults: 1000,
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      ".nuxt/**",
      ".git/**",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
      ".env*",
      ".DS_Store",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ],
  },
  svelte: {
    maxFiles: 500,
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    maxDepth: 8,
    maxGlobResults: 1000,
    ignorePatterns: [
      "node_modules/**",
      ".svelte-kit/**",
      "dist/**",
      "build/**",
      ".git/**",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
      ".env*",
      ".DS_Store",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ],
  },
  angular: {
    maxFiles: 500,
    maxTotalSize: 50 * 1024 * 1024, // 50MB
    maxDepth: 8,
    maxGlobResults: 1000,
    ignorePatterns: [
      "node_modules/**",
      "dist/**",
      ".angular/**",
      ".git/**",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
      ".env*",
      ".DS_Store",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ],
  },
  nextjs: {
    maxFiles: 2000,
    maxTotalSize: 100 * 1024 * 1024, // 100MB (SSR/SSG generate more files)
    maxDepth: 10,
    maxGlobResults: 4000,
    ignorePatterns: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      ".git/**",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
      ".env*",
      ".env.local",
      ".env.*.local",
      ".DS_Store",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ],
  },
  nuxt: {
    maxFiles: 2000,
    maxTotalSize: 100 * 1024 * 1024, // 100MB (SSR/SSG)
    maxDepth: 10,
    maxGlobResults: 4000,
    ignorePatterns: [
      "node_modules/**",
      ".nuxt/**",
      "dist/**",
      ".git/**",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
      ".env*",
      ".DS_Store",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
    ],
  },
  django: {
    maxFiles: 100,
    maxTotalSize: 10 * 1024 * 1024, // 10MB (typically static files only)
    maxDepth: 4,
    maxGlobResults: 200,
    ignorePatterns: [
      "venv/**",
      "__pycache__/**",
      ".git/**",
      "db.sqlite3",
      ".env*",
      ".DS_Store",
      "*.pyc",
      "*.pyo",
      ".pytest_cache/**",
      "coverage/**",
    ],
  },
  rails: {
    maxFiles: 100,
    maxTotalSize: 10 * 1024 * 1024, // 10MB (typically static files only)
    maxDepth: 4,
    maxGlobResults: 200,
    ignorePatterns: [
      "vendor/**",
      ".git/**",
      ".env*",
      ".DS_Store",
      "*.gem",
      ".bundle/**",
      "coverage/**",
      "log/**",
      "tmp/**",
    ],
  },
  static: {
    maxFiles: 100,
    maxTotalSize: 10 * 1024 * 1024, // 10MB
    maxDepth: 4,
    maxGlobResults: 200,
    ignorePatterns: [
      ".git/**",
      ".env*",
      ".DS_Store",
      "node_modules/**",
      "coverage/**",
    ],
  },
  other: {
    maxFiles: 500,
    maxTotalSize: 50 * 1024 * 1024, // 50MB (safe default)
    maxDepth: 8,
    maxGlobResults: 1000,
    ignorePatterns: [
      "node_modules/**",
      ".git/**",
      ".env*",
      ".DS_Store",
      "coverage/**",
      "*.test.*",
      "*.spec.*",
    ],
  },
};

/**
 * Error for precache limit violations
 */
export class PrecacheLimitError extends Error {
  constructor(
    public readonly filePath: string,
    message: string,
  ) {
    super(message);
    this.name = "PrecacheLimitError";
  }
}

/**
 * Validation result for precache configuration
 */
export interface PrecacheValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  summary: {
    fileCount: number;
    totalSize: number;
    maxDepth: number;
  };
}

/**
 * Get limits for a specific framework
 * Falls back to 'other' if framework not found
 */
export function getLimitsForFramework(
  framework: string | null,
): PrecacheLimits {
  if (!framework) {
    return PRECACHE_LIMITS_BY_FRAMEWORK.other;
  }

  // Map framework names to limits config
  const frameworkKey = framework.toLowerCase().replace(/_/g, "");

  // Try exact match first
  const validFrameworks = Object.keys(PRECACHE_LIMITS_BY_FRAMEWORK);

  if (validFrameworks.includes(frameworkKey)) {
    const limits = PRECACHE_LIMITS_BY_FRAMEWORK[frameworkKey];
    if (limits) {
      return limits;
    }
  }

  // Try partial match for frameworks like 'next-js' -> 'nextjs'
  const noHyphenKey = frameworkKey.replace(/-/g, "");
  if (validFrameworks.includes(noHyphenKey)) {
    const limits = PRECACHE_LIMITS_BY_FRAMEWORK[noHyphenKey];
    if (limits) {
      return limits;
    }
  }

  // Fall back to 'other'
  return PRECACHE_LIMITS_BY_FRAMEWORK.other;
}

/**
 * Validate and sanitize globPatterns against limits
 * Returns warnings if patterns would exceed limits
 */
export function validatePrecachePatterns(
  patterns: string[],
  limits: PrecacheLimits,
): {
  patterns: string[];
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const cleanPatterns = [...patterns];

  // 1. Warn if patterns are too greedy (recursive glob depth)
  const greedyPatterns = cleanPatterns.filter(
    (p) => (p.match(/\*\*/g) ?? []).length > 3,
  );
  if (greedyPatterns.length > 0) {
    warnings.push(
      `⚠️  Patterns with many recursive globs may exceed limits: ${greedyPatterns.join(", ")}. ` +
        `Consider using more specific patterns.`,
    );
  }

  // 2. Ensure ignore patterns are included (prevents common mistakes)
  const finalPatterns = [
    ...cleanPatterns,
    ...limits.ignorePatterns.map((p) => `!${p}`),
  ];

  // 3. Validate pattern count is reasonable
  if (cleanPatterns.length > 50) {
    warnings.push(
      `⚠️  Very large number of patterns (${cleanPatterns.length}). ` +
        `This may indicate overly specific configuration. Consider consolidating patterns.`,
    );
  }

  // 4. Check for known problematic patterns
  const problematicPatterns = cleanPatterns.filter((p) => {
    const isVeryDeep = (p.match(/\//g) ?? []).length > limits.maxDepth;
    const isRecursive = p.includes("**");
    return isVeryDeep && isRecursive;
  });

  if (problematicPatterns.length > 0) {
    warnings.push(
      `⚠️  Patterns exceed recommended depth (${limits.maxDepth}): ${problematicPatterns.join(", ")}`,
    );
  }

  return {
    patterns: finalPatterns,
    warnings,
    errors,
  };
}

/**
 * Format limits for display in messages
 */
export function formatLimits(limits: PrecacheLimits): string {
  return (
    `Max Files: ${limits.maxFiles}, ` +
    `Max Size: ${formatBytes(limits.maxTotalSize)}, ` +
    `Max Depth: ${limits.maxDepth}, ` +
    `Max Glob Results: ${limits.maxGlobResults}`
  );
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}
