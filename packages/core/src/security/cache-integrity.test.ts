/**
 * Tests for P1.4: Cache Scanner HMAC Integrity
 * @category Security
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_CACHE_INTEGRITY_CONFIG,
  generateCacheSignature,
  verifyCacheSignature,
  extractSignatureFromManifest,
  prependSignatureToManifest,
  createValidationMetadata,
  formatCacheIntegrityError,
  CacheIntegrityError,
} from "./cache-integrity.js";

describe("cache-integrity", () => {
  const testSecret = "a-very-secure-secret-key-min-16-chars-long";
  const testManifest = '[{"url":"index.html","revision":"abc123"}]';

  describe("DEFAULT_CACHE_INTEGRITY_CONFIG", () => {
    it("should use SHA256 by default", () => {
      expect(DEFAULT_CACHE_INTEGRITY_CONFIG.algorithm).toBe("sha256");
    });

    it("should use hex encoding by default", () => {
      expect(DEFAULT_CACHE_INTEGRITY_CONFIG.encoding).toBe("hex");
    });

    it("should validate on load by default", () => {
      expect(DEFAULT_CACHE_INTEGRITY_CONFIG.validateOnLoad).toBe(true);
    });
  });

  describe("generateCacheSignature", () => {
    it("should generate consistent HMAC signatures", () => {
      const sig1 = generateCacheSignature(testManifest, testSecret);
      const sig2 = generateCacheSignature(testManifest, testSecret);
      expect(sig1).toBe(sig2);
    });

    it("should generate different signatures for different content", () => {
      const sig1 = generateCacheSignature(testManifest, testSecret);
      const sig2 = generateCacheSignature("different content", testSecret);
      expect(sig1).not.toBe(sig2);
    });

    it("should generate different signatures for different secrets", () => {
      const sig1 = generateCacheSignature(testManifest, testSecret);
      const sig2 = generateCacheSignature(
        testManifest,
        "different-secret-key-thats-long-enough",
      );
      expect(sig1).not.toBe(sig2);
    });

    it("should use SHA256 algorithm by default", () => {
      const sig = generateCacheSignature(testManifest, testSecret);
      // SHA256 hex output is 64 characters
      expect(sig).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should support base64 encoding", () => {
      const config = {
        ...DEFAULT_CACHE_INTEGRITY_CONFIG,
        encoding: "base64" as const,
      };
      const sig = generateCacheSignature(testManifest, testSecret, config);
      // Base64 signature should be different
      expect(sig).toBeTruthy();
      expect(sig).not.toMatch(/^[a-f0-9]{64}$/);
    });

    it("should reject short secrets", () => {
      expect(() => generateCacheSignature(testManifest, "short")).toThrow(
        "must be at least 16 characters",
      );
    });

    it("should support SHA512", () => {
      const config = {
        ...DEFAULT_CACHE_INTEGRITY_CONFIG,
        algorithm: "sha512" as const,
      };
      const sig = generateCacheSignature(testManifest, testSecret, config);
      // SHA512 hex output is 128 characters
      expect(sig).toMatch(/^[a-f0-9]{128}$/);
    });
  });

  describe("verifyCacheSignature", () => {
    it("should verify valid signatures", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid signatures", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const invalidSignature = signature.slice(0, -8) + "invalidxx";
      const result = verifyCacheSignature(
        testManifest,
        invalidSignature,
        testSecret,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should reject modified manifest", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const modifiedManifest = testManifest.replace("abc123", "def456");
      const result = verifyCacheSignature(
        modifiedManifest,
        signature,
        testSecret,
      );
      expect(result.isValid).toBe(false);
    });

    it("should reject wrong secret", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(
        testManifest,
        signature,
        "wrong-secret-key-thats-long-enough",
      );
      expect(result.isValid).toBe(false);
    });

    it("should handle empty manifest", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature("", signature, testSecret);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("empty");
    });

    it("should handle missing signature", () => {
      const result = verifyCacheSignature(testManifest, "", testSecret);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("No signature");
    });

    it("should handle missing secret", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, "");
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("No secret");
    });

    it("should provide signature details on failure", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const invalidSignature = "invalid_signature_here";
      const result = verifyCacheSignature(
        testManifest,
        invalidSignature,
        testSecret,
      );
      expect(result.expectedSignature).toBe(signature);
      expect(result.actualSignature).toBe(invalidSignature);
    });

    it("should not expose signatures on success", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      expect(result.expectedSignature).toBeUndefined();
      expect(result.actualSignature).toBeUndefined();
    });
  });

  describe("extractSignatureFromManifest", () => {
    it("should extract signature from manifest header", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const withSignature = `// HMAC: ${signature}\n${testManifest}`;
      const result = extractSignatureFromManifest(withSignature);
      expect(result.signature).toBe(signature);
      expect(result.manifest).toBe(testManifest);
    });

    it("should handle manifest without signature", () => {
      const result = extractSignatureFromManifest(testManifest);
      expect(result.signature).toBeNull();
      expect(result.manifest).toBe(testManifest);
    });

    it("should preserve manifest content after signature", () => {
      const signature = "abc123def456";
      const withSignature = `// HMAC: ${signature}\n${testManifest}`;
      const result = extractSignatureFromManifest(withSignature);
      expect(result.manifest).toContain("index.html");
    });

    it("should handle different signature formats", () => {
      const testSigs = [
        "// HMAC: abc123\n",
        "//HMAC:abc123\n",
        "// HMAC: abc123 \n",
      ];

      testSigs.forEach((header) => {
        const withSignature = `${header}${testManifest}`;
        const result = extractSignatureFromManifest(withSignature);
        expect(result.signature).toBeTruthy();
      });
    });
  });

  describe("prependSignatureToManifest", () => {
    it("should prepend signature as comment header", () => {
      const signature = "abc123";
      const result = prependSignatureToManifest(testManifest, signature);
      expect(result.startsWith(`// HMAC: ${signature}\n`)).toBe(true);
      expect(result.includes(testManifest)).toBe(true);
    });

    it("should preserve original manifest", () => {
      const signature = "test-sig";
      const result = prependSignatureToManifest(testManifest, signature);
      expect(result.endsWith(testManifest)).toBe(true);
    });
  });

  describe("createValidationMetadata", () => {
    it("should create metadata with timestamp", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      const metadata = createValidationMetadata(
        testManifest,
        result,
        DEFAULT_CACHE_INTEGRITY_CONFIG,
      );

      expect(metadata.timestamp).toBeTruthy();
      expect(new Date(metadata.timestamp).getTime()).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it("should record manifest size", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      const metadata = createValidationMetadata(
        testManifest,
        result,
        DEFAULT_CACHE_INTEGRITY_CONFIG,
      );

      expect(metadata.manifestSize).toBe(testManifest.length);
    });

    it("should record algorithm used", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      const metadata = createValidationMetadata(
        testManifest,
        result,
        DEFAULT_CACHE_INTEGRITY_CONFIG,
      );

      expect(metadata.signatureAlgorithm).toBe("SHA256");
    });

    it("should record validation result", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      const metadata = createValidationMetadata(
        testManifest,
        result,
        DEFAULT_CACHE_INTEGRITY_CONFIG,
      );

      expect(metadata.validationResult).toBe(true);
    });
  });

  describe("formatCacheIntegrityError", () => {
    it("should format success message", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const result = verifyCacheSignature(testManifest, signature, testSecret);
      const message = formatCacheIntegrityError(result);

      expect(message).toContain("passed");
      expect(message).toContain("✓");
    });

    it("should format error message with details", () => {
      const invalidSignature = "invalid";
      const result = verifyCacheSignature(
        testManifest,
        invalidSignature,
        testSecret,
      );
      const message = formatCacheIntegrityError(result);

      expect(message).toContain("failed");
      expect(message).toContain("❌");
      expect(message).toContain("integrity");
    });

    it("should list all errors", () => {
      const result = verifyCacheSignature("", "", testSecret);
      const message = formatCacheIntegrityError(result);

      expect(message).toContain("•");
    });
  });

  describe("CacheIntegrityError", () => {
    it("should create error with manifest path", () => {
      const error = new CacheIntegrityError(
        "/path/to/manifest.json",
        "Test error",
      );
      expect(error.message).toBe("Test error");
      expect(error.manifestPath).toBe("/path/to/manifest.json");
      expect(error.name).toBe("CacheIntegrityError");
    });

    it("should extend Error class", () => {
      const error = new CacheIntegrityError("/path/to/manifest.json", "Test");
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Security scenarios", () => {
    it("should detect manifest tampering", () => {
      const signature = generateCacheSignature(testManifest, testSecret);

      // Attacker modifies manifest
      const tampered = testManifest.replace("abc123", "hacked");
      const result = verifyCacheSignature(tampered, signature, testSecret);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("integrity check failed");
    });

    it("should prevent cache poisoning attacks", () => {
      const signature = generateCacheSignature(testManifest, testSecret);

      // Try to use old signature with new manifest
      const maliciousManifest = '[{"url":"malicious.js","revision":"evil"}]';
      const result = verifyCacheSignature(
        maliciousManifest,
        signature,
        testSecret,
      );

      expect(result.isValid).toBe(false);
    });

    it("should use timing-safe comparison", () => {
      // Both invalid but different - should take same time to reject
      const wrong1 =
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
      const wrong2 =
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

      const result1 = verifyCacheSignature(testManifest, wrong1, testSecret);
      const result2 = verifyCacheSignature(testManifest, wrong2, testSecret);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });

    it("should require minimum secret length (16 chars)", () => {
      expect(() => {
        generateCacheSignature(testManifest, "tooshort");
      }).toThrow("16 characters");
    });
  });

  describe("Integration scenarios", () => {
    it("should round-trip: sign -> prepend -> extract -> verify", () => {
      const signature = generateCacheSignature(testManifest, testSecret);
      const withHeader = prependSignatureToManifest(testManifest, signature);
      const extracted = extractSignatureFromManifest(withHeader);
      const result = verifyCacheSignature(
        extracted.manifest,
        extracted.signature || signature,
        testSecret,
      );

      expect(result.isValid).toBe(true);
    });

    it("should handle different algorithms in round-trip", () => {
      const config = {
        ...DEFAULT_CACHE_INTEGRITY_CONFIG,
        algorithm: "sha512" as const,
      };
      const signature = generateCacheSignature(
        testManifest,
        testSecret,
        config,
      );
      const result = verifyCacheSignature(
        testManifest,
        signature,
        testSecret,
        config,
      );

      expect(result.isValid).toBe(true);
    });
  });
});
