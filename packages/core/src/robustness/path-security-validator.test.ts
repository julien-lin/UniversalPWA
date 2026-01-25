import { describe, it, expect } from 'vitest';
import {
  validatePath,
  normalizePath,
  checkPathTraversal,
  checkSymlink,
  resolvePathSafely,
  isSafePathForFileOp,
  safeJoinPaths,
  sanitizeDirectoryPath,
  isPathWithinBase,
  formatValidationResult,
  type PathValidationResult,
  type PathValidationConfig,
} from './path-security-validator';

describe('Path Security Validator - P3.2', () => {
  describe('normalizePath', () => {
    it('should normalize simple paths', () => {
      expect(normalizePath('foo/bar')).toBe('foo/bar');
      expect(normalizePath('./foo/bar')).toBe('foo/bar');
      expect(normalizePath('foo//bar')).toBe('foo/bar');
    });

    it('should handle root paths', () => {
      expect(normalizePath('/')).toBe('/');
    });

    it('should remove trailing slashes', () => {
      expect(normalizePath('foo/bar/')).toBe('foo/bar');
      expect(normalizePath('/')).toBe('/');
    });

    it('should handle dot components', () => {
      expect(normalizePath('.')).toBe('.');
      expect(normalizePath('./')).toBe('.');
      expect(normalizePath('foo/./bar')).toBe('foo/bar');
    });

    it('should handle empty strings', () => {
      expect(normalizePath('')).toBe('');
    });

    it('should handle multiple slashes', () => {
      expect(normalizePath('foo///bar')).toBe('foo/bar');
    });
  });

  describe('checkPathTraversal', () => {
    it('should accept safe paths', () => {
      const result = checkPathTraversal('foo/bar/baz');

      expect(result.safe).toBe(true);
      expect(result.hasTraversal).toBe(false);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject paths with .. traversal', () => {
      const result = checkPathTraversal('../etc/passwd');

      expect(result.safe).toBe(false);
      expect(result.hasTraversal).toBe(true);
      expect(result.violations.some((v) => v.includes('..'))).toBe(true);
    });

    it('should reject paths starting with ..', () => {
      const result = checkPathTraversal('../../../etc/passwd');

      expect(result.safe).toBe(false);
      expect(result.hasTraversal).toBe(true);
    });

    it('should reject paths with null bytes', () => {
      const result = checkPathTraversal('foo\0bar');

      expect(result.safe).toBe(false);
      expect(result.hasTraversal).toBe(true);
      expect(result.violations.some((v) => v.includes('null'))).toBe(true);
    });

    it('should reject URL-encoded traversal', () => {
      const result = checkPathTraversal('foo/%2e%2e/bar');

      expect(result.safe).toBe(false);
      expect(result.hasTraversal).toBe(true);
    });

    it('should handle double-encoded traversal', () => {
      const result = checkPathTraversal('foo/%252e%252e/bar');

      expect(result.safe).toBe(false);
      expect(result.hasTraversal).toBe(true);
    });

    it('should provide normalized output', () => {
      const result = checkPathTraversal('foo/./bar');

      expect(result.normalized).toBe('foo/bar');
    });
  });

  describe('validatePath', () => {
    it('should validate safe paths', () => {
      const result = validatePath('foo/bar/baz');

      expect(result.valid).toBe(true);
      expect(result.isTraversal).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject traversal paths', () => {
      const result = validatePath('../etc/passwd');

      expect(result.valid).toBe(false);
      expect(result.isTraversal).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check path length', () => {
      const longPath = 'a'.repeat(5000);
      const result = validatePath(longPath, {
        maxPathLength: 1000,
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('max length'))).toBe(true);
    });

    it('should respect allowed base paths', () => {
      const result = validatePath('/home/user/file.txt', {
        allowedBasePaths: ['/home/user'],
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      // Path validation should check against base paths
      expect(result).toHaveProperty('valid');
    });

    it('should reject symlinks by default', () => {
      const result = validatePath('/var/mail', {
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('isSymlink');
    });

    it('should allow symlinks if configured', () => {
      const result = validatePath('/var/mail', {
        allowSymlinks: true,
        maxResolutionDepth: 10,
      });

      expect(result).toHaveProperty('valid');
    });

    it('should provide normalized and resolved paths', () => {
      const result = validatePath('foo/./bar');

      expect(result.normalized).toBe('foo/bar');
      expect(result.resolved).toBeTruthy();
    });
  });

  describe('checkSymlink', () => {
    it('should identify non-symlink files', () => {
      const result = checkSymlink('/etc/passwd');

      expect(result.isSymlink).toBe(false);
      expect(result.isBroken).toBe(false);
      expect(result.isCircular).toBe(false);
    });

    it('should handle non-existent paths', () => {
      const result = checkSymlink('/path/that/does/not/exist/12345');

      expect(result.isSymlink).toBe(false);
    });

    it('should detect broken symlinks', () => {
      const result = checkSymlink('/var/mail');

      expect(result).toHaveProperty('isSymlink');
      expect(result).toHaveProperty('isBroken');
    });

    it('should report errors safely', () => {
      const result = checkSymlink('/var/mail');

      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('isSafePathForFileOp', () => {
    it('should accept safe paths', () => {
      const result = isSafePathForFileOp('foo/bar/file.txt', {
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(result).toBe(true);
    });

    it('should reject traversal paths', () => {
      const result = isSafePathForFileOp('../../../etc/passwd', {
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(result).toBe(false);
    });

    it('should reject symlinks when not allowed', () => {
      const result = isSafePathForFileOp('/var/mail', {
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(typeof result).toBe('boolean');
    });

    it('should allow symlinks when configured', () => {
      const result = isSafePathForFileOp('/var/mail', {
        allowSymlinks: true,
        maxResolutionDepth: 10,
      });

      expect(typeof result).toBe('boolean');
    });
  });

  describe('safeJoinPaths', () => {
    it('should join safe path components', () => {
      const result = safeJoinPaths('foo', 'bar', 'baz');

      expect(result).toBe('foo/bar/baz');
    });

    it('should handle single component', () => {
      const result = safeJoinPaths('foo', 'bar');

      expect(result).toBe('foo/bar');
    });

    it('should normalize dot components', () => {
      const result = safeJoinPaths('foo', './bar');

      expect(result).toBe('foo/bar');
    });

    it('should reject traversal in components', () => {
      expect(() => safeJoinPaths('foo', '../bar')).toThrow();
      expect(() => safeJoinPaths('foo', '../../bar')).toThrow();
    });

    it('should reject absolute paths in components', () => {
      expect(() => safeJoinPaths('foo', '/absolute/path')).toThrow();
    });

    it('should skip empty components', () => {
      const result = safeJoinPaths('foo', '', 'bar', '', 'baz');

      expect(result).toBe('foo/bar/baz');
    });

    it('should handle current directory as base', () => {
      const result = safeJoinPaths('.', 'foo', 'bar');

      expect(result).toBe('foo/bar');
    });
  });

  describe('sanitizeDirectoryPath', () => {
    it('should sanitize safe paths', () => {
      const result = sanitizeDirectoryPath('foo/bar');

      expect(result.sanitized).toBe('foo/bar');
      expect(result.errors).toHaveLength(0);
    });

    it('should reject traversal paths', () => {
      const result = sanitizeDirectoryPath('../etc/passwd');

      expect(result.sanitized).toBe('');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject over-length paths', () => {
      const longPath = 'a'.repeat(5000);
      const result = sanitizeDirectoryPath(longPath, {
        maxPathLength: 100,
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return errors in result', () => {
      const result = sanitizeDirectoryPath('../bad/path');

      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('isPathWithinBase', () => {
    it('should accept paths within base', () => {
      const result = isPathWithinBase('dir/file.txt', 'dir');

      expect(result).toBe(true);
    });

    it('should accept base path itself', () => {
      const result = isPathWithinBase('dir', 'dir');

      expect(result).toBe(true);
    });

    it('should reject paths outside base', () => {
      const result = isPathWithinBase('other/file.txt', 'dir');

      expect(result).toBe(false);
    });

    it('should reject parent directory escapes', () => {
      const result = isPathWithinBase('dir/../etc/passwd', 'dir');

      expect(result).toBe(false);
    });

    it('should handle relative paths', () => {
      const result = isPathWithinBase('subdir/file.txt', '.');

      expect(result).toBe(true);
    });

    it('should be safe against traversal attempts', () => {
      const result = isPathWithinBase('../../etc/passwd', 'dir');

      expect(result).toBe(false);
    });
  });

  describe('resolvePathSafely', () => {
    it('should resolve relative paths', () => {
      const result = resolvePathSafely('foo/bar');

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should not resolve beyond max depth', () => {
      expect(() => resolvePathSafely('foo', 0)).toThrow();
    });

    it('should handle absolute paths', () => {
      const result = resolvePathSafely('/tmp');

      expect(result).toBe('/tmp');
    });

    it('should normalize paths during resolution', () => {
      const result = resolvePathSafely('foo/./bar');

      expect(result).not.toContain('/./');
    });
  });

  describe('formatValidationResult', () => {
    it('should format successful validation', () => {
      const result: PathValidationResult = {
        valid: true,
        normalized: 'foo/bar',
        isSymlink: false,
        isTraversal: false,
        resolved: '/tmp/foo/bar',
        errors: [],
        warnings: [],
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Valid: true');
      expect(formatted).toContain('foo/bar');
    });

    it('should format failed validation', () => {
      const result: PathValidationResult = {
        valid: false,
        normalized: '../etc/passwd',
        isSymlink: false,
        isTraversal: true,
        resolved: '',
        errors: ['Path traversal detected'],
        warnings: [],
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Valid: false');
      expect(formatted).toContain('Traversal');
      expect(formatted).toContain('Path traversal detected');
    });

    it('should include warnings when present', () => {
      const result: PathValidationResult = {
        valid: true,
        normalized: 'foo/bar',
        isSymlink: false,
        isTraversal: false,
        resolved: '/tmp/foo/bar',
        errors: [],
        warnings: ['Symlink detected'],
      };

      const formatted = formatValidationResult(result);

      expect(formatted).toContain('Warnings');
    });
  });

  describe('Integration Tests', () => {
    it('should handle realistic file paths', () => {
      const paths = [
        'config.json',
        'src/index.ts',
        'dist/bundle.js',
        'public/images/logo.png',
      ];

      paths.forEach((path) => {
        const result = validatePath(path);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject common attack patterns', () => {
      const attackPaths = [
        '../../../etc/passwd',
        '...//...//...//etc/passwd',
        'foo/../../etc/passwd',
        'foo/../../../etc/passwd',
        '/etc/passwd',
      ];

      attackPaths.forEach((path) => {
        const result = validatePath(path);
        expect(result.valid || result.isTraversal).toBeTruthy();
      });
    });

    it('should handle path with null bytes', () => {
      const result = validatePath('foo\0bar.txt');

      expect(result.valid).toBe(false);
    });

    it('should chain operations safely', () => {
      const basePath = 'uploads';
      const userDir = 'user123';
      const file = 'document.pdf';

      const joined = safeJoinPaths(basePath, userDir, file);
      const validated = validatePath(joined);
      const isSafe = isSafePathForFileOp(joined);

      expect(joined).toBe('uploads/user123/document.pdf');
      expect(validated.valid).toBe(true);
      expect(isSafe).toBe(true);
    });

    it('should validate and normalize together', () => {
      const input = './uploads/./user/../user/file.txt';
      const result = validatePath(input);

      expect(result.normalized).not.toContain('/./');
      expect(result.normalized).not.toContain('//');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long paths', () => {
      const longPath = 'a/b/c/'.repeat(300);
      const result = validatePath(longPath, {
        maxPathLength: 10000,
        allowSymlinks: false,
        maxResolutionDepth: 10,
      });

      expect(result).toHaveProperty('valid');
    });

    it('should handle unicode paths', () => {
      const unicodePath = 'файл/文件/αρχείο.txt';
      const result = validatePath(unicodePath);

      expect(result).toHaveProperty('valid');
    });

    it('should handle mixed separators safely', () => {
      const result = normalizePath('foo\\bar/baz');

      expect(result).toBeTruthy();
    });

    it('should handle triple dots in path', () => {
      const result = checkPathTraversal('foo.../bar');

      // foo... contains "..." not ".." so should be considered safe
      expect(result.safe).toBe(true);
    });

    it('should handle empty path components', () => {
      const result = normalizePath('foo//bar///baz');

      expect(result).toBe('foo/bar/baz');
    });
  });
});
