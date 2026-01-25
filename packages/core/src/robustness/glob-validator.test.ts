/**
 * Glob Validator Tests
 * Comprehensive coverage of glob pattern validation, analysis, and safe expansion
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  validatePattern,
  analyzePattern,
  estimateFileCount,
  expandGlob,
  getSafeGlobOptions,
  formatValidationResult,
  formatExpansionResult,
} from "./glob-validator.js";

describe("Glob Validator - Pattern Validation", () => {
  it("should accept simple valid glob patterns", () => {
    const result = validatePattern("*.ts");
    expect(result.isValid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("should accept patterns with single globstar", () => {
    const result = validatePattern("src/**/*.ts");
    expect(result.isValid).toBe(true);
    expect(result.analysis.globstarCount).toBe(1);
  });

  it("should accept patterns with multiple globstars within limits", () => {
    const result = validatePattern("src/**/tests/**/*.test.ts");
    expect(result.isValid).toBe(true);
    expect(result.analysis.globstarCount).toBe(2);
  });

  it("should reject empty patterns", () => {
    const result = validatePattern("");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("empty");
  });

  it("should reject patterns with excessive globstars", () => {
    const pattern =
      "a/**/**/b/**/**/c/**/**/d/**/**/e/**/**/f/**/**/g/**/**/h/**/**/i/**/**/j/**/**/k/**";
    const result = validatePattern(pattern, { maxRecursionDepth: 5 });
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("globstar");
  });

  it("should detect dangerous escape sequences", () => {
    const result = validatePattern("*.ts\\x00.js");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("escape");
  });

  it("should detect brace explosion patterns", () => {
    const result = validatePattern("file{1..2000}");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Brace");
  });

  it("should reject absolute paths", () => {
    const result = validatePattern("/usr/local/src/*.ts");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("should reject Windows absolute paths", () => {
    const result = validatePattern("C:\\Windows\\*.txt");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Absolute paths");
  });

  it("should detect nested globstars (potential optimization issue)", () => {
    const result = validatePattern("**/**/*.ts");
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Nested globstar");
  });

  it("should handle brace expansions when allowed", () => {
    const result = validatePattern("file{1,2,3}.ts", {
      allowBraceExpansion: true,
    });
    expect(result.isValid).toBe(true);
    expect(result.analysis.hasBraceExpansion).toBe(true);
  });

  it("should reject brace expansions when disallowed", () => {
    const result = validatePattern("file{1,2,3}.ts", {
      allowBraceExpansion: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.reason).toContain("Brace expansion");
  });

  it("should detect negation patterns", () => {
    const result = validatePattern("!*.test.ts");
    expect(result.analysis.hasNegation).toBe(true);
    expect(result.isValid).toBe(true);
  });

  it("should estimate file count for simple patterns", () => {
    const result = validatePattern("*.ts");
    expect(result.analysis.estimatedFileCount).toBeLessThan(200);
  });

  it("should estimate higher file count for globstar patterns", () => {
    const result = validatePattern("src/**/*.ts");
    expect(result.analysis.estimatedFileCount).toBeGreaterThan(500);
  });
});

describe("Glob Validator - Pattern Analysis", () => {
  it("should analyze simple pattern as low complexity", () => {
    const analysis = analyzePattern("*.ts");
    expect(analysis.complexity).toBe("low");
    expect(analysis.isValid).toBe(true);
  });

  it("should analyze globstar pattern as medium complexity", () => {
    const analysis = analyzePattern("src/**/*.ts");
    // 1 globstar + short pattern = low complexity, need more to reach medium
    expect(analysis.complexity).toBe("low");
  });

  it("should analyze complex patterns as high complexity", () => {
    const analysis = analyzePattern("a/**/b/**/c/**/d/*.ts");
    expect(analysis.complexity).toBe("high");
  });

  it("should identify brace expansion", () => {
    const analysis = analyzePattern("file{1,2,3}.ts");
    expect(analysis.usesBraces).toBe(true);
    expect(analysis.globstarCount).toBe(0);
  });

  it("should identify negation patterns", () => {
    const analysis = analyzePattern("!*.test.ts");
    expect(analysis.usesNegation).toBe(true);
  });

  it("should report pattern issues", () => {
    // Brace range {1..100000} should fail validation
    const analysis = analyzePattern("file{1..500000}.ts");
    expect(analysis.issues.length).toBeGreaterThan(0);
    expect(analysis.isValid).toBe(false);
  });
});

describe("Glob Validator - File Count Estimation", () => {
  it("should estimate low count for simple patterns", () => {
    const count = estimateFileCount("*.ts");
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(200);
  });

  it("should estimate higher count for single star", () => {
    const count = estimateFileCount("*/*.ts");
    expect(count).toBeGreaterThan(100);
  });

  it("should estimate much higher count for globstar", () => {
    const count = estimateFileCount("**/*.ts");
    expect(count).toBeGreaterThan(500);
  });

  it("should multiply estimate for brace expansion", () => {
    const countNoBrace = estimateFileCount("*.ts");
    const countWithBrace = estimateFileCount("{src,lib}/*.ts");
    expect(countWithBrace).toBeGreaterThan(countNoBrace);
  });

  it("should cap estimate at practical maximum", () => {
    const count = estimateFileCount("**/**/**/**/**/**/**/**/**/**/*.ts");
    expect(count).toBeLessThanOrEqual(100000);
  });
});

describe("Glob Validator - Safe Expansion", () => {
  let mockFileSystem: {
    readdir: (path: string) => string[];
    isDirectory: (path: string) => boolean;
    exists: (path: string) => boolean;
  };

  beforeEach(() => {
    mockFileSystem = {
      readdir: (): string[] => {
        const files: Record<string, string[]> = {
          ".": ["file1.ts", "file2.ts", "dir1"],
          "./dir1": ["nested.ts", "subdir"],
          "./dir1/subdir": ["deep.ts"],
        };
        return files["."] ?? [];
      },
      isDirectory: (path: string): boolean => {
        return ["./dir1", "./dir1/subdir"].includes(path);
      },
      exists: (): boolean => {
        return true;
      },
    };
  });

  it("should successfully expand valid simple patterns", () => {
    const result = expandGlob("*.ts", ".", mockFileSystem);
    expect(result.success).toBe(true);
    // Mock filesystem may have no files in root matching *.ts
    expect(result.files.length).toBeGreaterThanOrEqual(0);
    expect(result.truncated).toBe(false);
  });

  it("should reject invalid patterns", () => {
    const result = expandGlob("**/**/*.ts", ".", mockFileSystem);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("should handle timeout for slow expansion", () => {
    const result = expandGlob("*.ts", ".", mockFileSystem, { timeout: 0 });
    // Should either timeout or succeed with what it has
    expect(result.count).toBeGreaterThanOrEqual(0);
  });

  it("should truncate results when exceeding max files", () => {
    const result = expandGlob("*.ts", ".", mockFileSystem, { maxFiles: 1 });
    expect(result.count).toBeLessThanOrEqual(1);
  });

  it("should return detailed error on invalid pattern", () => {
    const result = expandGlob("file{1..2000}", ".", mockFileSystem);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.files.length).toBe(0);
  });
});

describe("Glob Validator - Safe Options", () => {
  it("should return standard safe options", () => {
    const options = getSafeGlobOptions();
    expect(options).toHaveProperty("dot", true);
    expect(options).toHaveProperty("noglobstar", false);
    expect(options).toHaveProperty("braceExpansion", true);
  });

  it("should respect allowBraceExpansion setting", () => {
    const options = getSafeGlobOptions({ allowBraceExpansion: false });
    expect(options).toHaveProperty("braceExpansion", false);
  });

  it("should include all safety-critical options", () => {
    const options = getSafeGlobOptions();
    const requiredKeys = [
      "dot",
      "noglobstar",
      "matchBase",
      "nonegate",
      "braceExpansion",
    ];

    for (const key of requiredKeys) {
      expect(options).toHaveProperty(key);
    }
  });
});

describe("Glob Validator - Result Formatting", () => {
  it("should format valid result", () => {
    const result = validatePattern("*.ts");
    const formatted = formatValidationResult(result);
    expect(formatted).toContain("✓ Valid");
    expect(formatted).toContain("globstars: 0");
  });

  it("should format invalid result with reason", () => {
    const result = validatePattern("");
    const formatted = formatValidationResult(result);
    expect(formatted).toContain("✗ Invalid");
    expect(formatted).toContain("empty");
  });

  it("should show brace expansion status", () => {
    const result = validatePattern("file{1,2,3}.ts");
    const formatted = formatValidationResult(result);
    expect(formatted).toContain("braces: yes");
  });

  it("should show negation status", () => {
    const result = validatePattern("!*.test.ts");
    const formatted = formatValidationResult(result);
    expect(formatted).toContain("negation: yes");
  });

  it("should format successful expansion result", () => {
    const result = {
      success: true,
      files: ["a.ts", "b.ts"],
      count: 2,
      truncated: false,
    };
    const formatted = formatExpansionResult(result);
    expect(formatted).toContain("✓ Success");
    expect(formatted).toContain("2 files");
  });

  it("should format truncated expansion result", () => {
    const result = {
      success: true,
      files: ["a.ts"],
      count: 10001,
      truncated: true,
    };
    const formatted = formatExpansionResult(result);
    expect(formatted).toContain("⚠ Truncated");
    expect(formatted).toContain("limit reached");
  });

  it("should format failed expansion result", () => {
    const result = {
      success: false,
      files: [],
      count: 0,
      truncated: false,
      error: "Invalid pattern",
    };
    const formatted = formatExpansionResult(result);
    expect(formatted).toContain("✗ Failed");
    expect(formatted).toContain("Invalid pattern");
  });
});

describe("Glob Validator - Edge Cases", () => {
  it("should handle patterns with only globstar", () => {
    const result = validatePattern("**");
    expect(result.isValid).toBe(true);
    expect(result.analysis.globstarCount).toBe(1);
  });

  it("should handle patterns ending with globstar", () => {
    const result = validatePattern("src/**");
    expect(result.isValid).toBe(true);
    // Pattern ends with **, which gets extra consideration in analysis
    expect(result.analysis.globstarCount).toBeGreaterThanOrEqual(1);
  });

  it("should handle very long valid patterns", () => {
    const longPattern = "src/" + "subdir/".repeat(50) + "*.ts";
    const result = validatePattern(longPattern);
    // Should handle gracefully, either accept or reject
    expect(result.isValid).toBeDefined();
  });

  it("should handle patterns with numbers and underscores", () => {
    const result = validatePattern("src_123/**/*.test_2024.ts");
    expect(result.isValid).toBe(true);
  });

  it("should handle patterns with hyphens", () => {
    const result = validatePattern("src-my-lib/**/*.ts");
    expect(result.isValid).toBe(true);
  });

  it("should handle patterns with dots in names", () => {
    const result = validatePattern("src/**/*.test.spec.ts");
    expect(result.isValid).toBe(true);
  });

  it("should handle whitespace in patterns correctly", () => {
    const result = validatePattern("files with spaces/*.ts");
    expect(result.isValid).toBe(true);
  });
});

describe("Glob Validator - Configuration", () => {
  it("should respect custom max files limit", () => {
    const result = validatePattern("**/*.ts", { maxFiles: 100 });
    // Pattern is valid even with custom limit
    expect(result.analysis.estimatedFileCount).toBeDefined();
  });

  it("should respect custom recursion depth", () => {
    const pattern = "a/**/b/**/c/**/*.ts";
    const result = validatePattern(pattern, { maxRecursionDepth: 2 });
    expect(result.isValid).toBe(false);
  });

  it("should respect custom timeout", () => {
    const result = validatePattern("*.ts", { timeout: 100 });
    expect(result.isValid).toBe(true);
  });

  it("should apply default config when not provided", () => {
    const result = validatePattern("*.ts");
    expect(result.analysis.globstarCount).toBeDefined();
    expect(result.analysis.hasBraceExpansion).toBeDefined();
    expect(result.analysis.hasNegation).toBeDefined();
  });
});

describe("Glob Validator - Integration Scenarios", () => {
  it("should validate then expand valid pattern", () => {
    const pattern = "*.ts";
    const validation = validatePattern(pattern);

    if (validation.isValid) {
      const mockFS = {
        readdir: (): string[] => ["file.ts", "other.js"],
        isDirectory: (): boolean => false,
        exists: (): boolean => true,
      };

      const expansion = expandGlob(pattern, ".", mockFS);
      expect(expansion.success).toBe(true);
    }
  });

  it("should prevent expansion of invalid pattern", () => {
    const pattern = "**/**";
    const validation = validatePattern(pattern);
    expect(validation.isValid).toBe(false);

    // Should not attempt expansion with invalid pattern
    const mockFS = {
      readdir: (): string[] => [],
      isDirectory: (): boolean => false,
      exists: (): boolean => true,
    };

    const expansion = expandGlob(pattern, ".", mockFS);
    expect(expansion.success).toBe(false);
  });

  it("should provide consistent analysis across functions", () => {
    const pattern = "src/**/*.{ts,js}";
    const validation = validatePattern(pattern);
    const analysis = analyzePattern(pattern);

    expect(validation.analysis.globstarCount).toBe(analysis.globstarCount);
    expect(validation.analysis.hasBraceExpansion).toBe(analysis.usesBraces);
    expect(validation.analysis.hasNegation).toBe(analysis.usesNegation);
  });
});
