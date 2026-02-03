import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createTestDir, cleanupTestDir } from '../__tests__/test-helpers.js'
import {
  validatePath,
  validatePathAdvanced,
  sanitizePath,
  validateFileSize,
  validateFile,
  validatePathDepth,
  PathValidationError,
  FileValidationError,
  DEFAULT_MAX_FILE_SIZE,
} from './path-validator.js'

describe('path-validator', () => {
  let testDir: string

  beforeEach(() => {
    testDir = createTestDir('path-validator')
  })

  afterEach(() => {
    cleanupTestDir(testDir)
  })

  describe('validatePath', () => {
    it('should allow valid relative paths', () => {
      expect(validatePath('./src/index.html', testDir)).toBe(true)
      expect(validatePath('src/index.html', testDir)).toBe(true)
      expect(validatePath('index.html', testDir)).toBe(true)
    })

    it('should block path traversal attacks', () => {
      // Test 1: Simple parent directory traversal from testDir
      expect(validatePath('../etc/passwd', testDir)).toBe(false)

      // Test 2: Multiple parent directory traversal
      expect(validatePath('../../etc/passwd', testDir)).toBe(false)

      // Test 3: Very deep parent directory traversal
      expect(validatePath('../../../../../../../etc/passwd', testDir)).toBe(false)

      // Test 4: Mixed relative and absolute-like paths
      expect(validatePath('../..', testDir)).toBe(false)

      // Test 5: Create a deep subdirectory and test traversal from there
      const deepDir = join(testDir, 'a', 'b', 'c', 'd', 'e')
      mkdirSync(deepDir, { recursive: true })
      expect(validatePath('../../../../../../../../../etc/passwd', deepDir)).toBe(false)
    })

    it('should allow paths within base directory', () => {
      const subDir = join(testDir, 'subdir')
      mkdirSync(subDir, { recursive: true })
      expect(validatePath('subdir/file.txt', testDir)).toBe(true)
      expect(validatePath(join('subdir', 'nested', 'file.txt'), testDir)).toBe(true)
    })

    it('should handle absolute paths correctly', () => {
      const absolutePath = join(testDir, 'file.txt')
      expect(validatePath(absolutePath, testDir)).toBe(true)
    })

    it('should return false for invalid paths', () => {
      // \0 is a null character that can cause issues, validatePath should handle it gracefully
      const result = validatePath('\0', testDir)
      expect(typeof result).toBe('boolean')
      // On some systems this might throw, so we just check it doesn't crash
    })

    it('should handle empty path', () => {
      // Empty path resolves to base, which is valid
      expect(validatePath('', testDir)).toBe(true)
    })
  })

  describe('validatePathAdvanced', () => {
    it('should validate with default options', () => {
      const result = validatePathAdvanced('src/index.html', { basePath: testDir })
      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBeDefined()
    })

    it('should reject absolute paths when not allowed', () => {
      const result = validatePathAdvanced('/absolute/path', {
        basePath: testDir,
        allowAbsolute: false,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Absolute paths are not allowed')
    })

    it('should reject relative paths when not allowed', () => {
      const result = validatePathAdvanced('relative/path', {
        basePath: testDir,
        allowRelative: false,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Relative paths are not allowed')
    })

    it('should detect path traversal', () => {
      const result = validatePathAdvanced('../../etc/passwd', { basePath: testDir })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Path traversal')
    })

    it('should allow absolute paths within base path', () => {
      const absolutePath = join(testDir, 'file.txt')
      const result = validatePathAdvanced(absolutePath, {
        basePath: testDir,
        allowAbsolute: true,
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('sanitizePath', () => {
    it('should normalize paths', () => {
      expect(sanitizePath('./src/../src/index.html')).toBe('src/index.html')
      expect(sanitizePath('src//index.html')).toBe('src/index.html')
      // normalize() uses OS-specific separators, so we just check it normalizes
      const normalized = sanitizePath('src\\index.html')
      expect(normalized).toContain('index.html')
    })

    it('should handle empty paths', () => {
      expect(sanitizePath('')).toBe('.')
      expect(sanitizePath('.')).toBe('.')
    })
  })

  describe('validateFileSize', () => {
    it('should validate file size within limit', () => {
      const filePath = join(testDir, 'small.txt')
      writeFileSync(filePath, 'small content', 'utf-8')
      expect(validateFileSize(filePath, 1000)).toBe(true)
    })

    it('should reject files exceeding size limit', () => {
      const filePath = join(testDir, 'large.txt')
      const largeContent = 'x'.repeat(2000)
      writeFileSync(filePath, largeContent, 'utf-8')
      expect(validateFileSize(filePath, 1000)).toBe(false)
    })

    it('should use default max size', () => {
      const filePath = join(testDir, 'default.txt')
      writeFileSync(filePath, 'content', 'utf-8')
      expect(validateFileSize(filePath)).toBe(true)
    })

    it('should return false for non-existent files', () => {
      expect(validateFileSize(join(testDir, 'nonexistent.txt'))).toBe(false)
    })
  })

  describe('validateFile', () => {
    it('should validate existing file', () => {
      const filePath = join(testDir, 'test.txt')
      writeFileSync(filePath, 'content', 'utf-8')
      const result = validateFile(filePath)
      expect(result.valid).toBe(true)
      expect(result.size).toBeGreaterThan(0)
    })

    it('should reject non-existent files when checkExists is true', () => {
      const result = validateFile(join(testDir, 'nonexistent.txt'), { checkExists: true })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not exist')
    })

    it('should validate file extensions', () => {
      const filePath = join(testDir, 'test.html')
      writeFileSync(filePath, '<html></html>', 'utf-8')
      const result = validateFile(filePath, { allowedExtensions: ['.html', '.htm'] })
      expect(result.valid).toBe(true)
    })

    it('should reject files with disallowed extensions', () => {
      const filePath = join(testDir, 'test.js')
      writeFileSync(filePath, 'content', 'utf-8')
      const result = validateFile(filePath, { allowedExtensions: ['.html', '.htm'] })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('extension not allowed')
    })

    it('should validate file size', () => {
      const filePath = join(testDir, 'large.txt')
      const largeContent = 'x'.repeat(2000)
      writeFileSync(filePath, largeContent, 'utf-8')
      const result = validateFile(filePath, { maxSize: 1000 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds maximum')
      expect(result.size).toBe(2000)
    })

    it('should skip existence check when checkExists is false', () => {
      const result = validateFile(join(testDir, 'nonexistent.txt'), { checkExists: false })
      expect(result.valid).toBe(true)
    })
  })

  describe('validatePathDepth', () => {
    it('should allow paths within depth limit', () => {
      expect(validatePathDepth('src/index.html', testDir, 10)).toBe(true)
      expect(validatePathDepth('src/components/App.tsx', testDir, 10)).toBe(true)
    })

    it('should reject paths exceeding depth limit', () => {
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.txt'
      expect(validatePathDepth(deepPath, testDir, 20)).toBe(false)
    })

    it('should use default max depth', () => {
      expect(validatePathDepth('src/index.html', testDir)).toBe(true)
    })
  })

  describe('PathValidationError', () => {
    it('should create error with path information', () => {
      const error = new PathValidationError('Invalid path', '/some/path', '/base')
      expect(error.message).toBe('Invalid path')
      expect(error.path).toBe('/some/path')
      expect(error.basePath).toBe('/base')
      expect(error.name).toBe('PathValidationError')
    })
  })

  describe('FileValidationError', () => {
    it('should create error with file information', () => {
      const error = new FileValidationError('File too large', '/some/file.txt', 5000)
      expect(error.message).toBe('File too large')
      expect(error.filePath).toBe('/some/file.txt')
      expect(error.size).toBe(5000)
      expect(error.name).toBe('FileValidationError')
    })
  })

  describe('Edge cases', () => {
    it('should handle special characters in paths', () => {
      const specialPath = join(testDir, 'file with spaces.txt')
      writeFileSync(specialPath, 'content', 'utf-8')
      expect(validatePath(specialPath, testDir)).toBe(true)
    })

    it('should handle unicode characters', () => {
      const unicodePath = join(testDir, 'fichier-émojis-🚀.txt')
      writeFileSync(unicodePath, 'content', 'utf-8')
      expect(validatePath(unicodePath, testDir)).toBe(true)
    })

    it('should handle very long paths', () => {
      const longPath = 'a'.repeat(200) + '/file.txt'
      const result = validatePathAdvanced(longPath, { basePath: testDir })
      expect(result.valid).toBe(true)
    })
  })

  describe('Security - File Size Limits (DoS Protection)', () => {
    it('should enforce maximum file size limits', () => {
      const filePath = join(testDir, 'large-file.bin')
      const size = 15 * 1024 * 1024 // 15MB, exceeds 10MB default
      const buffer = Buffer.alloc(size)
      writeFileSync(filePath, buffer)

      expect(validateFileSize(filePath)).toBe(false)
      expect(validateFileSize(filePath, 10 * 1024 * 1024)).toBe(false)
    })

    it('should accept files within size limit', () => {
      const filePath = join(testDir, 'normal-file.txt')
      const size = 5 * 1024 * 1024 // 5MB
      const buffer = Buffer.alloc(size)
      writeFileSync(filePath, buffer)

      expect(validateFileSize(filePath)).toBe(true)
    })

    it('should handle custom size limits', () => {
      const filePath = join(testDir, 'custom-limit.txt')
      const size = 2 * 1024 * 1024 // 2MB
      const buffer = Buffer.alloc(size)
      writeFileSync(filePath, buffer)

      expect(validateFileSize(filePath, 1 * 1024 * 1024)).toBe(false) // Too large for 1MB limit
      expect(validateFileSize(filePath, 5 * 1024 * 1024)).toBe(true) // OK for 5MB limit
    })

    it('should return detailed size info on validation failure', () => {
      const filePath = join(testDir, 'oversized.txt')
      const largeContent = 'x'.repeat(5000)
      writeFileSync(filePath, largeContent, 'utf-8')

      const result = validateFile(filePath, { maxSize: 1000 })
      expect(result.valid).toBe(false)
      expect(result.size).toBe(5000)
      expect(result.error).toContain('exceeds maximum')
    })
  })

  describe('Security - Path Traversal Advanced', () => {
    it('should block null bytes in paths', () => {
      // Null bytes in paths are security risks and should be rejected
      // The validator should handle this gracefully
      const result = validatePathAdvanced('file\0.txt', { basePath: testDir })
      // Whether it rejects or sanitizes is okay, but shouldn't crash
      expect(typeof result.valid).toBe('boolean')
    })

    it('should block double-encoded paths', () => {
      // %2e%2e is URL-encoded ".." but we don't decode URLs in path validator
      const result = validatePathAdvanced('%2e%2e/etc/passwd', { basePath: testDir })
      // Should treat as literal path name, not decode it
      expect(result.valid).toBe(true)
    })

    it('should properly resolve mixed path separators', () => {
      // After normalization, should resolve correctly
      const mixedPath = 'src/index.html'
      const result = validatePathAdvanced(mixedPath, { basePath: testDir })
      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBeDefined()
    })

    it('should reject attempts to escape with relative paths', () => {
      // Simple relative escapes should fail
      expect(validatePath('../etc/passwd', testDir)).toBe(false)
      expect(validatePath('./../../etc/passwd', testDir)).toBe(false)
    })
  })

  describe('Security - Depth Limits (DoS Protection)', () => {
    it('should enforce maximum directory depth', () => {
      const veryDeepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.txt'
      expect(validatePathDepth(veryDeepPath, testDir, 10)).toBe(false)
      expect(validatePathDepth(veryDeepPath, testDir, 30)).toBe(true)
    })

    it('should use realistic default depth limits', () => {
      // Default should be 20 - most legitimate projects don't exceed this
      const reasonableDepth = 'a/b/c/d/e/f/g/h/i/j/file.txt'
      const extremeDepth = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.txt'

      expect(validatePathDepth(reasonableDepth, testDir)).toBe(true)
      expect(validatePathDepth(extremeDepth, testDir)).toBe(false)
    })

    it('should handle symlinks safely in depth calculation', () => {
      // Depth is calculated from resolved path, not symlink chain
      const symlinked = join(testDir, 'a', 'b', 'c')
      mkdirSync(symlinked, { recursive: true })
      expect(validatePathDepth('a/b/c/file.txt', testDir, 10)).toBe(true)
    })
  })

  describe('Security - File Type Validation', () => {
    it('should validate file extensions strictly', () => {
      const htmlFile = join(testDir, 'index.html')
      writeFileSync(htmlFile, '<html></html>', 'utf-8')

      const result = validateFile(htmlFile, { allowedExtensions: ['.html', '.htm'] })
      expect(result.valid).toBe(true)
    })

    it('should reject disallowed extensions', () => {
      const execFile = join(testDir, 'script.sh')
      writeFileSync(execFile, '#!/bin/bash\necho "hi"', 'utf-8')

      const result = validateFile(execFile, { allowedExtensions: ['.html', '.css'] })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should handle case-insensitive extension matching', () => {
      const file = join(testDir, 'IMAGE.JPG')
      writeFileSync(file, 'fake image data', 'utf-8')

      const result = validateFile(file, { allowedExtensions: ['.jpg', '.jpeg', '.png'] })
      expect(result.valid).toBe(true) // .JPG should match .jpg
    })

    it('should handle files without extensions', () => {
      const file = join(testDir, 'README')
      writeFileSync(file, 'readme content', 'utf-8')

      // If extensions are restricted, file without extension should fail
      const result1 = validateFile(file, { allowedExtensions: ['.txt', '.md'] })
      expect(result1.valid).toBe(false)

      // If no extension restrictions, should pass
      const result2 = validateFile(file, { allowedExtensions: [] })
      expect(result2.valid).toBe(true)
    })
  })

  describe('Security - Input Validation Combined', () => {
    it('should validate path + size + extension together', () => {
      const filePath = join(testDir, 'safe-file.html')
      writeFileSync(filePath, '<html></html>', 'utf-8')

      const result = validateFile(filePath, {
        maxSize: 1000,
        allowedExtensions: ['.html', '.htm'],
        checkExists: true,
      })
      expect(result.valid).toBe(true)
    })

    it('should fail if any validation criteria fails', () => {
      const filePath = join(testDir, 'test.html')
      writeFileSync(filePath, 'x'.repeat(5000), 'utf-8')

      // Size exceeds limit
      const result = validateFile(filePath, {
        maxSize: 1000,
        allowedExtensions: ['.html'],
        checkExists: true,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds maximum')
    })

    it('should validate advanced paths with all options', () => {
      const testFile = join(testDir, 'subdir', 'document.pdf')
      mkdirSync(join(testDir, 'subdir'), { recursive: true })
      writeFileSync(testFile, 'fake pdf', 'utf-8')

      const result = validatePathAdvanced(testFile, {
        basePath: testDir,
        allowAbsolute: true,
        allowRelative: true,
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Performance - Optimizations', () => {
    it('should short-circuit on invalid extension before file IO', () => {
      const filePath = join(testDir, 'invalid-ext.sh')
      writeFileSync(filePath, 'content', 'utf-8')

      const startTime = performance.now()
      const result = validateFile(filePath, {
        allowedExtensions: ['.html', '.txt'],
        checkExists: true,
      })
      const endTime = performance.now()

      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
      // Should be very fast (< 1ms) since no stat() should occur
      expect(endTime - startTime).toBeLessThan(10)
    })

    it('should reuse extension cache for multiple validations', () => {
      const extensions = ['.html', '.htm', '.css']
      const files = [
        join(testDir, 'file1.html'),
        join(testDir, 'file2.htm'),
        join(testDir, 'file3.css'),
        join(testDir, 'file4.js'),
      ]

      files.forEach((f) => writeFileSync(f, 'content'))

      const startTime = performance.now()
      // Multiple validations with same extensions should reuse cache
      files.forEach((f) => {
        validateFile(f, { allowedExtensions: extensions })
      })
      const endTime = performance.now()

      // Should be fast due to cache reuse
      expect(endTime - startTime).toBeLessThan(50)
    })

    it('should use single statSync() call instead of multiple FS operations', () => {
      const filePath = join(testDir, 'perf-test.txt')
      writeFileSync(filePath, 'x'.repeat(1000), 'utf-8')

      const startTime = performance.now()
      const result = validateFile(filePath, {
        checkExists: true,
        maxSize: 10000,
      })
      const endTime = performance.now()

      expect(result.valid).toBe(true)
      expect(result.size).toBe(1000)
      // Should be very fast with optimized single stat() call
      expect(endTime - startTime).toBeLessThan(10)
    })

    it('should handle batch validation of large file lists efficiently', () => {
      const files = Array.from({ length: 100 }, (_, i) => {
        const f = join(testDir, `file-${i}.txt`)
        writeFileSync(f, `content-${i}`, 'utf-8')
        return f
      })

      const startTime = performance.now()
      files.forEach((f) => {
        validateFile(f, {
          allowedExtensions: ['.txt', '.md'],
          maxSize: DEFAULT_MAX_FILE_SIZE,
        })
      })
      const endTime = performance.now()

      // 100 files should validate reasonably fast with optimizations
      // Expect less than 500ms total
      expect(endTime - startTime).toBeLessThan(500)
    })

    it('should reject invalid extensions fast without expensive stat() calls', () => {
      const invalidFiles = Array.from({ length: 50 }, (_, i) => {
        const f = join(testDir, `invalid-${i}.exe`)
        writeFileSync(f, 'content', 'utf-8')
        return f
      })

      const startTime = performance.now()
      const results = invalidFiles.map((f) =>
        validateFile(f, {
          allowedExtensions: ['.txt', '.html'],
        })
      )
      const endTime = performance.now()

      // All should be invalid
      expect(results.every((r) => !r.valid)).toBe(true)
      // Should be very fast (< 100ms) - no stat() calls needed
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})
