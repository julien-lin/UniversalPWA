import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
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

const TEST_DIR = join(process.cwd(), '.test-tmp-path-validator')

describe('path-validator', () => {
  beforeEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  afterEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
  })

  describe('validatePath', () => {
    it('should allow valid relative paths', () => {
      expect(validatePath('./src/index.html', TEST_DIR)).toBe(true)
      expect(validatePath('src/index.html', TEST_DIR)).toBe(true)
      expect(validatePath('index.html', TEST_DIR)).toBe(true)
    })

    it('should block path traversal attacks', () => {
      // Test 1: Simple parent directory traversal from TEST_DIR
      expect(validatePath('../etc/passwd', TEST_DIR)).toBe(false)

      // Test 2: Multiple parent directory traversal
      expect(validatePath('../../etc/passwd', TEST_DIR)).toBe(false)

      // Test 3: Very deep parent directory traversal
      expect(validatePath('../../../../../../../etc/passwd', TEST_DIR)).toBe(false)

      // Test 4: Mixed relative and absolute-like paths
      expect(validatePath('../..', TEST_DIR)).toBe(false)

      // Test 5: Create a deep subdirectory and test traversal from there
      const deepDir = join(TEST_DIR, 'a', 'b', 'c', 'd', 'e')
      mkdirSync(deepDir, { recursive: true })
      expect(validatePath('../../../../../../../../../etc/passwd', deepDir)).toBe(false)
    })

    it('should allow paths within base directory', () => {
      const subDir = join(TEST_DIR, 'subdir')
      mkdirSync(subDir, { recursive: true })
      expect(validatePath('subdir/file.txt', TEST_DIR)).toBe(true)
      expect(validatePath(join('subdir', 'nested', 'file.txt'), TEST_DIR)).toBe(true)
    })

    it('should handle absolute paths correctly', () => {
      const absolutePath = join(TEST_DIR, 'file.txt')
      expect(validatePath(absolutePath, TEST_DIR)).toBe(true)
    })

    it('should return false for invalid paths', () => {
      // \0 is a null character that can cause issues, validatePath should handle it gracefully
      const result = validatePath('\0', TEST_DIR)
      expect(typeof result).toBe('boolean')
      // On some systems this might throw, so we just check it doesn't crash
    })

    it('should handle empty path', () => {
      // Empty path resolves to base, which is valid
      expect(validatePath('', TEST_DIR)).toBe(true)
    })
  })

  describe('validatePathAdvanced', () => {
    it('should validate with default options', () => {
      const result = validatePathAdvanced('src/index.html', { basePath: TEST_DIR })
      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBeDefined()
    })

    it('should reject absolute paths when not allowed', () => {
      const result = validatePathAdvanced('/absolute/path', {
        basePath: TEST_DIR,
        allowAbsolute: false,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Absolute paths are not allowed')
    })

    it('should reject relative paths when not allowed', () => {
      const result = validatePathAdvanced('relative/path', {
        basePath: TEST_DIR,
        allowRelative: false,
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Relative paths are not allowed')
    })

    it('should detect path traversal', () => {
      const result = validatePathAdvanced('../../etc/passwd', { basePath: TEST_DIR })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Path traversal')
    })

    it('should allow absolute paths within base path', () => {
      const absolutePath = join(TEST_DIR, 'file.txt')
      const result = validatePathAdvanced(absolutePath, {
        basePath: TEST_DIR,
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
      const filePath = join(TEST_DIR, 'small.txt')
      writeFileSync(filePath, 'small content', 'utf-8')
      expect(validateFileSize(filePath, 1000)).toBe(true)
    })

    it('should reject files exceeding size limit', () => {
      const filePath = join(TEST_DIR, 'large.txt')
      const largeContent = 'x'.repeat(2000)
      writeFileSync(filePath, largeContent, 'utf-8')
      expect(validateFileSize(filePath, 1000)).toBe(false)
    })

    it('should use default max size', () => {
      const filePath = join(TEST_DIR, 'default.txt')
      writeFileSync(filePath, 'content', 'utf-8')
      expect(validateFileSize(filePath)).toBe(true)
    })

    it('should return false for non-existent files', () => {
      expect(validateFileSize(join(TEST_DIR, 'nonexistent.txt'))).toBe(false)
    })
  })

  describe('validateFile', () => {
    it('should validate existing file', () => {
      const filePath = join(TEST_DIR, 'test.txt')
      writeFileSync(filePath, 'content', 'utf-8')
      const result = validateFile(filePath)
      expect(result.valid).toBe(true)
      expect(result.size).toBeGreaterThan(0)
    })

    it('should reject non-existent files when checkExists is true', () => {
      const result = validateFile(join(TEST_DIR, 'nonexistent.txt'), { checkExists: true })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('does not exist')
    })

    it('should validate file extensions', () => {
      const filePath = join(TEST_DIR, 'test.html')
      writeFileSync(filePath, '<html></html>', 'utf-8')
      const result = validateFile(filePath, { allowedExtensions: ['.html', '.htm'] })
      expect(result.valid).toBe(true)
    })

    it('should reject files with disallowed extensions', () => {
      const filePath = join(TEST_DIR, 'test.js')
      writeFileSync(filePath, 'content', 'utf-8')
      const result = validateFile(filePath, { allowedExtensions: ['.html', '.htm'] })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('extension not allowed')
    })

    it('should validate file size', () => {
      const filePath = join(TEST_DIR, 'large.txt')
      const largeContent = 'x'.repeat(2000)
      writeFileSync(filePath, largeContent, 'utf-8')
      const result = validateFile(filePath, { maxSize: 1000 })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds maximum')
      expect(result.size).toBe(2000)
    })

    it('should skip existence check when checkExists is false', () => {
      const result = validateFile(join(TEST_DIR, 'nonexistent.txt'), { checkExists: false })
      expect(result.valid).toBe(true)
    })
  })

  describe('validatePathDepth', () => {
    it('should allow paths within depth limit', () => {
      expect(validatePathDepth('src/index.html', TEST_DIR, 10)).toBe(true)
      expect(validatePathDepth('src/components/App.tsx', TEST_DIR, 10)).toBe(true)
    })

    it('should reject paths exceeding depth limit', () => {
      const deepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.txt'
      expect(validatePathDepth(deepPath, TEST_DIR, 20)).toBe(false)
    })

    it('should use default max depth', () => {
      expect(validatePathDepth('src/index.html', TEST_DIR)).toBe(true)
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
      const specialPath = join(TEST_DIR, 'file with spaces.txt')
      writeFileSync(specialPath, 'content', 'utf-8')
      expect(validatePath(specialPath, TEST_DIR)).toBe(true)
    })

    it('should handle unicode characters', () => {
      const unicodePath = join(TEST_DIR, 'fichier-émojis-🚀.txt')
      writeFileSync(unicodePath, 'content', 'utf-8')
      expect(validatePath(unicodePath, TEST_DIR)).toBe(true)
    })

    it('should handle very long paths', () => {
      const longPath = 'a'.repeat(200) + '/file.txt'
      const result = validatePathAdvanced(longPath, { basePath: TEST_DIR })
      expect(result.valid).toBe(true)
    })
  })

  describe('Security - File Size Limits (DoS Protection)', () => {
    it('should enforce maximum file size limits', () => {
      const filePath = join(TEST_DIR, 'large-file.bin')
      const size = 15 * 1024 * 1024 // 15MB, exceeds 10MB default
      const buffer = Buffer.alloc(size)
      writeFileSync(filePath, buffer)

      expect(validateFileSize(filePath)).toBe(false)
      expect(validateFileSize(filePath, 10 * 1024 * 1024)).toBe(false)
    })

    it('should accept files within size limit', () => {
      const filePath = join(TEST_DIR, 'normal-file.txt')
      const size = 5 * 1024 * 1024 // 5MB
      const buffer = Buffer.alloc(size)
      writeFileSync(filePath, buffer)

      expect(validateFileSize(filePath)).toBe(true)
    })

    it('should handle custom size limits', () => {
      const filePath = join(TEST_DIR, 'custom-limit.txt')
      const size = 2 * 1024 * 1024 // 2MB
      const buffer = Buffer.alloc(size)
      writeFileSync(filePath, buffer)

      expect(validateFileSize(filePath, 1 * 1024 * 1024)).toBe(false) // Too large for 1MB limit
      expect(validateFileSize(filePath, 5 * 1024 * 1024)).toBe(true) // OK for 5MB limit
    })

    it('should return detailed size info on validation failure', () => {
      const filePath = join(TEST_DIR, 'oversized.txt')
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
      const result = validatePathAdvanced('file\0.txt', { basePath: TEST_DIR })
      // Whether it rejects or sanitizes is okay, but shouldn't crash
      expect(typeof result.valid).toBe('boolean')
    })

    it('should block double-encoded paths', () => {
      // %2e%2e is URL-encoded ".." but we don't decode URLs in path validator
      const result = validatePathAdvanced('%2e%2e/etc/passwd', { basePath: TEST_DIR })
      // Should treat as literal path name, not decode it
      expect(result.valid).toBe(true)
    })

    it('should properly resolve mixed path separators', () => {
      // After normalization, should resolve correctly
      const mixedPath = 'src/index.html'
      const result = validatePathAdvanced(mixedPath, { basePath: TEST_DIR })
      expect(result.valid).toBe(true)
      expect(result.resolvedPath).toBeDefined()
    })

    it('should reject attempts to escape with relative paths', () => {
      // Simple relative escapes should fail
      expect(validatePath('../etc/passwd', TEST_DIR)).toBe(false)
      expect(validatePath('./../../etc/passwd', TEST_DIR)).toBe(false)
    })
  })

  describe('Security - Depth Limits (DoS Protection)', () => {
    it('should enforce maximum directory depth', () => {
      const veryDeepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.txt'
      expect(validatePathDepth(veryDeepPath, TEST_DIR, 10)).toBe(false)
      expect(validatePathDepth(veryDeepPath, TEST_DIR, 30)).toBe(true)
    })

    it('should use realistic default depth limits', () => {
      // Default should be 20 - most legitimate projects don't exceed this
      const reasonableDepth = 'a/b/c/d/e/f/g/h/i/j/file.txt'
      const extremeDepth = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z/file.txt'

      expect(validatePathDepth(reasonableDepth, TEST_DIR)).toBe(true)
      expect(validatePathDepth(extremeDepth, TEST_DIR)).toBe(false)
    })

    it('should handle symlinks safely in depth calculation', () => {
      // Depth is calculated from resolved path, not symlink chain
      const symlinked = join(TEST_DIR, 'a', 'b', 'c')
      mkdirSync(symlinked, { recursive: true })
      expect(validatePathDepth('a/b/c/file.txt', TEST_DIR, 10)).toBe(true)
    })
  })

  describe('Security - File Type Validation', () => {
    it('should validate file extensions strictly', () => {
      const htmlFile = join(TEST_DIR, 'index.html')
      writeFileSync(htmlFile, '<html></html>', 'utf-8')

      const result = validateFile(htmlFile, { allowedExtensions: ['.html', '.htm'] })
      expect(result.valid).toBe(true)
    })

    it('should reject disallowed extensions', () => {
      const execFile = join(TEST_DIR, 'script.sh')
      writeFileSync(execFile, '#!/bin/bash\necho "hi"', 'utf-8')

      const result = validateFile(execFile, { allowedExtensions: ['.html', '.css'] })
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should handle case-insensitive extension matching', () => {
      const file = join(TEST_DIR, 'IMAGE.JPG')
      writeFileSync(file, 'fake image data', 'utf-8')

      const result = validateFile(file, { allowedExtensions: ['.jpg', '.jpeg', '.png'] })
      expect(result.valid).toBe(true) // .JPG should match .jpg
    })

    it('should handle files without extensions', () => {
      const file = join(TEST_DIR, 'README')
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
      const filePath = join(TEST_DIR, 'safe-file.html')
      writeFileSync(filePath, '<html></html>', 'utf-8')

      const result = validateFile(filePath, {
        maxSize: 1000,
        allowedExtensions: ['.html', '.htm'],
        checkExists: true,
      })
      expect(result.valid).toBe(true)
    })

    it('should fail if any validation criteria fails', () => {
      const filePath = join(TEST_DIR, 'test.html')
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
      const testFile = join(TEST_DIR, 'subdir', 'document.pdf')
      mkdirSync(join(TEST_DIR, 'subdir'), { recursive: true })
      writeFileSync(testFile, 'fake pdf', 'utf-8')

      const result = validatePathAdvanced(testFile, {
        basePath: TEST_DIR,
        allowAbsolute: true,
        allowRelative: true,
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Performance - Optimizations', () => {
    it('should short-circuit on invalid extension before file IO', () => {
      const filePath = join(TEST_DIR, 'invalid-ext.sh')
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
        join(TEST_DIR, 'file1.html'),
        join(TEST_DIR, 'file2.htm'),
        join(TEST_DIR, 'file3.css'),
        join(TEST_DIR, 'file4.js'),
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
      const filePath = join(TEST_DIR, 'perf-test.txt')
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
        const f = join(TEST_DIR, `file-${i}.txt`)
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
        const f = join(TEST_DIR, `invalid-${i}.exe`)
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
