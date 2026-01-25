/**
 * P1.4: Cache Scanner HMAC Integrity
 * Cryptographic validation of precache manifest to prevent cache poisoning attacks
 * @category Security
 */

import { createHmac } from "node:crypto";

/**
 * Configuration for cache integrity validation
 */
export interface CacheIntegrityConfig {
  /** Signing algorithm (SHA256 recommended) */
  algorithm: "sha256" | "sha512";
  /** Encoding for signature output */
  encoding: "hex" | "base64";
  /** Whether to validate on load */
  validateOnLoad: boolean;
  /** Cache manifest file path for signature storage */
  signatureFile?: string;
}

/**
 * Result of cache integrity validation
 */
export interface CacheIntegrityResult {
  isValid: boolean;
  expectedSignature?: string;
  actualSignature?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Default cache integrity configuration
 */
export const DEFAULT_CACHE_INTEGRITY_CONFIG: CacheIntegrityConfig = {
  algorithm: "sha256",
  encoding: "hex",
  validateOnLoad: true,
  signatureFile: undefined,
};

/**
 * Error for cache integrity violations
 */
export class CacheIntegrityError extends Error {
  constructor(
    public readonly manifestPath: string,
    message: string,
  ) {
    super(message);
    this.name = "CacheIntegrityError";
  }
}

/**
 * Generate HMAC-SHA256 signature for cache manifest
 * Prevents cache poisoning through manifest tampering
 *
 * @param manifestContent The precache manifest JSON as string
 * @param secret Secret key for HMAC (use env var or secure vault in production)
 * @param config Integrity configuration
 * @returns HMAC signature
 */
export function generateCacheSignature(
  manifestContent: string,
  secret: string,
  config: CacheIntegrityConfig = DEFAULT_CACHE_INTEGRITY_CONFIG,
): string {
  if (!secret || secret.length < 16) {
    throw new Error("HMAC secret must be at least 16 characters for security");
  }

  const hmac = createHmac(config.algorithm, secret);
  hmac.update(manifestContent);
  return hmac.digest(config.encoding);
}

/**
 * Verify cache manifest integrity using HMAC
 * Returns detailed validation results
 *
 * @param manifestContent The precache manifest JSON as string
 * @param signature Expected HMAC signature (from header or file)
 * @param secret Secret key for HMAC validation
 * @param config Integrity configuration
 * @returns Validation result with error details
 */
export function verifyCacheSignature(
  manifestContent: string,
  signature: string,
  secret: string,
  config: CacheIntegrityConfig = DEFAULT_CACHE_INTEGRITY_CONFIG,
): CacheIntegrityResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate inputs
  if (!manifestContent) {
    errors.push("Manifest content is empty");
    return { isValid: false, errors, warnings };
  }

  if (!signature) {
    errors.push("No signature provided for validation");
    return { isValid: false, errors, warnings };
  }

  if (!secret) {
    errors.push("No secret key provided for HMAC validation");
    return { isValid: false, errors, warnings };
  }

  try {
    // Generate expected signature
    const expectedSignature = generateCacheSignature(
      manifestContent,
      secret,
      config,
    );
    const actualSignature = signature;

    // Constant-time comparison to prevent timing attacks
    const isValid = timingSafeCompare(expectedSignature, actualSignature);

    if (!isValid) {
      errors.push(
        "❌ SECURITY: Cache manifest integrity check failed. The precache manifest has been modified or the signing key is incorrect. " +
          "This may indicate a cache poisoning attack.",
      );
    }

    return {
      isValid,
      expectedSignature: isValid ? undefined : expectedSignature, // Only expose on failure
      actualSignature: isValid ? undefined : actualSignature,
      errors,
      warnings,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`HMAC validation failed: ${message}`);
    return { isValid: false, errors, warnings };
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Uses constant-time comparison even if strings differ
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract signature from manifest with metadata header
 * Format: {HMAC}<base64-signature>
 *
 * @param manifestContent Manifest that may include signature header
 * @returns Object with signature and clean manifest
 */
export function extractSignatureFromManifest(manifestContent: string): {
  signature: string | null;
  manifest: string;
} {
  const signatureMatch = manifestContent.match(
    /^\/\/\s*HMAC:\s*([a-f0-9]+|[A-Za-z0-9+/=]+)\s*\n/,
  );
  if (signatureMatch) {
    return {
      signature: signatureMatch[1],
      manifest: manifestContent.slice(signatureMatch[0].length),
    };
  }

  return {
    signature: null,
    manifest: manifestContent,
  };
}

/**
 * Prepend signature to manifest as comment header
 * Makes signature part of service worker for easy transport
 */
export function prependSignatureToManifest(
  manifestContent: string,
  signature: string,
): string {
  return `// HMAC: ${signature}\n${manifestContent}`;
}

/**
 * Generate validation metadata for logging/auditing
 */
export interface CacheValidationMetadata {
  timestamp: string;
  manifestSize: number;
  signatureAlgorithm: string;
  validationResult: boolean;
  errors: string[];
}

/**
 * Create validation metadata for cache integrity check
 */
export function createValidationMetadata(
  manifestContent: string,
  result: CacheIntegrityResult,
  config: CacheIntegrityConfig,
): CacheValidationMetadata {
  return {
    timestamp: new Date().toISOString(),
    manifestSize: manifestContent.length,
    signatureAlgorithm: config.algorithm.toUpperCase(),
    validationResult: result.isValid,
    errors: result.errors,
  };
}

/**
 * Format cache integrity error message for user display
 */
export function formatCacheIntegrityError(
  result: CacheIntegrityResult,
): string {
  if (result.isValid) {
    return "Cache integrity check passed ✓";
  }

  const errorLines = [
    "❌ Cache integrity check failed:",
    ...result.errors.map((e) => `  • ${e}`),
  ];

  if (result.warnings.length > 0) {
    errorLines.push("\nWarnings:");
    errorLines.push(...result.warnings.map((w) => `  ⚠️  ${w}`));
  }

  return errorLines.join("\n");
}
