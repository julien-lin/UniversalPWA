import { describe, it, expect } from 'vitest'
import { ErrorCode, formatError, detectErrorCode } from './error-codes.js'

describe('error-codes', () => {
  describe('formatError', () => {
    it('should format error with code and message', () => {
      const message = formatError(ErrorCode.PROJECT_PATH_NOT_FOUND)
      expect(message).toContain('[E1001]')
      expect(message).toContain('Project path does not exist')
    })

    it('should include context in error message', () => {
      const message = formatError(ErrorCode.PROJECT_PATH_NOT_FOUND, '/invalid/path')
      expect(message).toContain('/invalid/path')
    })

    it('should include suggestion in error message', () => {
      const message = formatError(ErrorCode.PROJECT_PATH_NOT_FOUND)
      expect(message).toContain('💡 Suggestion:')
    })

    it('should include documentation link if available', () => {
      const message = formatError(ErrorCode.UNEXPECTED_ERROR)
      expect(message).toContain('📚 Documentation:')
    })

    it('should handle unknown error code', () => {
      const message = formatError('UNKNOWN_CODE' as ErrorCode)
      expect(message).toContain('Unknown error')
    })

    it('should format all error codes', () => {
      const allCodes = Object.values(ErrorCode)
      for (const code of allCodes) {
        const message = formatError(code)
        expect(message).toBeDefined()
        expect(message.length).toBeGreaterThan(0)
        expect(message).toContain(`[${code}]`)
      }
    })
  })

  describe('detectErrorCode', () => {
    it('should detect PROJECT_PATH_NOT_FOUND from error message', () => {
      const code = detectErrorCode(new Error('Project path does not exist'))
      expect(code).toBe(ErrorCode.PROJECT_PATH_NOT_FOUND)
    })

    it('should detect ICON_SOURCE_NOT_FOUND from error message', () => {
      const code = detectErrorCode(new Error('Icon source not found'))
      expect(code).toBe(ErrorCode.ICON_SOURCE_NOT_FOUND)
    })

    it('should detect HTML_FILE_NOT_FOUND from error message', () => {
      const code = detectErrorCode(new Error('HTML file does not exist'))
      expect(code).toBe(ErrorCode.HTML_FILE_NOT_FOUND)
    })

    it('should detect MANIFEST_VALIDATION_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Manifest validation failed'))
      expect(code).toBe(ErrorCode.MANIFEST_VALIDATION_FAILED)
    })

    it('should detect MANIFEST_WRITE_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Failed to write manifest'))
      expect(code).toBe(ErrorCode.MANIFEST_WRITE_FAILED)
    })

    it('should detect MANIFEST_GENERATION_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Manifest generation error'))
      expect(code).toBe(ErrorCode.MANIFEST_GENERATION_FAILED)
    })

    it('should detect ICON_INVALID_FORMAT from error message', () => {
      const code = detectErrorCode(new Error('Icon format invalid'))
      expect(code).toBe(ErrorCode.ICON_INVALID_FORMAT)
    })

    it('should detect ICON_GENERATION_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Failed to generate icon'))
      expect(code).toBe(ErrorCode.ICON_GENERATION_FAILED)
    })

    it('should detect ICON_PROCESSING_ERROR from error message', () => {
      // ICON_PROCESSING_ERROR is returned when message contains "icon" but not "format", "invalid", "process", or "generate"
      const code = detectErrorCode(new Error('Icon error occurred'))
      expect(code).toBe(ErrorCode.ICON_PROCESSING_ERROR)
    })

    it('should detect SERVICE_WORKER_REGISTRATION_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Service worker registration failed'))
      expect(code).toBe(ErrorCode.SERVICE_WORKER_REGISTRATION_FAILED)
    })

    it('should detect SERVICE_WORKER_WRITE_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Failed to write service worker'))
      expect(code).toBe(ErrorCode.SERVICE_WORKER_WRITE_FAILED)
    })

    it('should detect SERVICE_WORKER_GENERATION_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Service worker generation error'))
      expect(code).toBe(ErrorCode.SERVICE_WORKER_GENERATION_FAILED)
    })

    it('should detect HTML_PARSING_FAILED from error message', () => {
      const code = detectErrorCode(new Error('HTML parse failed'))
      expect(code).toBe(ErrorCode.HTML_PARSING_FAILED)
    })

    it('should detect HTML_INJECTION_FAILED from error message', () => {
      const code = detectErrorCode(new Error('HTML injection error'))
      expect(code).toBe(ErrorCode.HTML_INJECTION_FAILED)
    })

    it('should detect PERMISSION_DENIED from error message', () => {
      const code = detectErrorCode(new Error('Permission denied'))
      expect(code).toBe(ErrorCode.PERMISSION_DENIED)
    })

    it('should detect DISK_FULL from error message', () => {
      const code = detectErrorCode(new Error('Disk full'))
      expect(code).toBe(ErrorCode.DISK_FULL)
    })

    it('should detect PROJECT_SCAN_FAILED from error message', () => {
      const code = detectErrorCode(new Error('Project scan failed'))
      expect(code).toBe(ErrorCode.PROJECT_SCAN_FAILED)
    })

    it('should return UNEXPECTED_ERROR for unknown error', () => {
      const code = detectErrorCode(new Error('Some random error'))
      expect(code).toBe(ErrorCode.UNEXPECTED_ERROR)
    })

    it('should handle string error messages', () => {
      const code = detectErrorCode('Project path not found')
      expect(code).toBe(ErrorCode.PROJECT_PATH_NOT_FOUND)
    })

    it('should be case insensitive', () => {
      const code = detectErrorCode(new Error('PROJECT PATH NOT FOUND'))
      expect(code).toBe(ErrorCode.PROJECT_PATH_NOT_FOUND)
    })
  })
})

