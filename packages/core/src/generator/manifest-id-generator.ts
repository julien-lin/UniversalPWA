/**
 * Generates a unique ID for manifest.json to prevent PWA collisions
 * when multiple PWAs are deployed on the same domain with different basePaths.
 *
 * Format: "{appName-hash}" or "{appName}-{basePath-hash}"
 * Examples:
 *  - "my-app" for basePath="/"
 *  - "my-app-app-a1b2c3d4" for basePath="/app/"
 *  - "my-app-api-v1-pwa-x9y8z7w6" for basePath="/api/v1/pwa/"
 *
 * This ID is used by browsers to uniquely identify PWAs and prevent
 * manifest collision issues when multiple PWAs share the same domain.
 */
export function generateManifestId(
  appName: string,
  basePath: string = "/",
): string {
  if (!appName || typeof appName !== "string") {
    throw new Error("appName must be a non-empty string");
  }

  // Normalize app name: lowercase, alphanumeric + hyphens only
  const normalizedName = appName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 20);

  if (!normalizedName) {
    throw new Error("appName must contain at least one alphanumeric character");
  }

  // Normalize basePath: remove leading/trailing slashes
  const normalizedPath = basePath
    .trim()
    .replace(/^\/*|\/*$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9/-]/g, "-")
    .replace(/--+/g, "-");

  // If basePath is root ("/"), use just the app name
  if (!normalizedPath || normalizedPath === "") {
    return normalizedName;
  }

  // Generate fixed-length hash from basePath (8 hex characters for uniqueness)
  const pathHash = simpleHash(normalizedPath);

  return `${normalizedName}-${pathHash}`;
}

/**
 * Simple non-cryptographic hash for basePath
 * Used only to generate unique IDs, not for security
 * This is deterministic: same input always produces same output
 * Returns a fixed-length hex string (8 characters)
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and pad to 8 characters
  return Math.abs(hash).toString(16).padEnd(8, "0").substring(0, 8);
}
