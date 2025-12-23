import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { checkHttps, checkProjectHttps, detectProjectUrl } from './https-checker'

const TEST_DIR = join(process.cwd(), '.test-tmp-https-checker')

describe('https-checker', () => {
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

  describe('checkHttps', () => {
    it('should detect HTTPS as secure', () => {
      const result = checkHttps('https://example.com')

      expect(result.isSecure).toBe(true)
      expect(result.isProduction).toBe(true)
      expect(result.isLocalhost).toBe(false)
      expect(result.protocol).toBe('https')
      expect(result.hostname).toBe('example.com')
      expect(result.warning).toBeUndefined()
    })

    it('should detect HTTP as insecure in production', () => {
      const result = checkHttps('http://example.com')

      expect(result.isSecure).toBe(false)
      expect(result.isProduction).toBe(false)
      expect(result.isLocalhost).toBe(false)
      expect(result.protocol).toBe('http')
      expect(result.hostname).toBe('example.com')
      expect(result.warning).toContain('HTTPS')
      expect(result.recommendation).toBeDefined()
    })

    it('should allow HTTP on localhost by default', () => {
      const result = checkHttps('http://localhost:3000')

      expect(result.isSecure).toBe(true)
      expect(result.isLocalhost).toBe(true)
      expect(result.isProduction).toBe(false)
      expect(result.protocol).toBe('http')
      expect(result.hostname).toBe('localhost')
      expect(result.warning).toBeUndefined()
    })

    it('should allow HTTP on 127.0.0.1 by default', () => {
      const result = checkHttps('http://127.0.0.1:3000')

      expect(result.isSecure).toBe(true)
      expect(result.isLocalhost).toBe(true)
      expect(result.protocol).toBe('http')
    })

    it('should not allow HTTP on localhost if allowHttpLocalhost is false', () => {
      const result = checkHttps('http://localhost:3000', false)

      expect(result.isSecure).toBe(false)
      expect(result.isLocalhost).toBe(true)
      expect(result.warning).toContain('HTTPS')
    })

    it('should detect local network IPs as localhost', () => {
      const localhostUrls = [
        'http://192.168.1.1:3000',
        'http://10.0.0.1:3000',
        'http://172.16.0.1:3000',
      ]

      localhostUrls.forEach((url) => {
        const result = checkHttps(url)
        expect(result.isLocalhost).toBe(true)
      })
    })

    it('should detect .local domains as localhost', () => {
      const result = checkHttps('http://myapp.local:3000')

      expect(result.isLocalhost).toBe(true)
      expect(result.isSecure).toBe(true)
    })

    it('should handle invalid URLs', () => {
      const result = checkHttps('not-a-valid-url')

      expect(result.isSecure).toBe(false)
      expect(result.protocol).toBe('unknown')
      expect(result.warning).toContain('Invalid URL')
      expect(result.recommendation).toBeDefined()
    })

    it('should handle URLs without protocol', () => {
      const result = checkHttps('example.com')

      expect(result.isSecure).toBe(false)
      expect(result.protocol).toBe('unknown')
    })
  })

  describe('detectProjectUrl', () => {
    it('should detect URL from package.json homepage', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          homepage: 'https://myapp.com',
        }),
      )

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://myapp.com')
    })

    it('should detect URL from package.json url', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          url: 'https://myapp.com',
        }),
      )

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://myapp.com')
    })

    it('should detect URL from .env file', () => {
      writeFileSync(join(TEST_DIR, '.env'), 'NEXT_PUBLIC_URL=https://myapp.com\nOTHER_VAR=value')

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://myapp.com')
    })

    it('should return null if no URL found', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({ name: 'test' }))

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBeNull()
    })

    it('should return null for non-existent project', () => {
      const url = detectProjectUrl(join(TEST_DIR, 'non-existent'))

      expect(url).toBeNull()
    })
  })

  describe('checkProjectHttps', () => {
    it('should check HTTPS from provided URL', () => {
      const result = checkProjectHttps({
        url: 'https://example.com',
      })

      expect(result.isSecure).toBe(true)
      expect(result.isProduction).toBe(true)
    })

    it('should check HTTPS from detected URL in package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          homepage: 'https://myapp.com',
        }),
      )

      const result = checkProjectHttps({
        projectPath: TEST_DIR,
      })

      expect(result.isSecure).toBe(true)
      expect(result.hostname).toBe('myapp.com')
    })

    it('should warn if no URL can be determined', () => {
      const result = checkProjectHttps({
        projectPath: TEST_DIR,
      })

      expect(result.isSecure).toBe(false)
      expect(result.warning).toContain('Unable to determine')
      expect(result.recommendation).toBeDefined()
    })

    it('should prioritize provided URL over detected URL', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          homepage: 'http://localhost:3000',
        }),
      )

      const result = checkProjectHttps({
        url: 'https://production.com',
        projectPath: TEST_DIR,
      })

      expect(result.hostname).toBe('production.com')
      expect(result.isSecure).toBe(true)
    })
  })
})

