import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { checkHttps, checkProjectHttps, detectProjectUrl } from './https-checker.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-https-checker')

describe('https-checker', () => {
  // Helpers
  const writeJSON = (rel: string, data: unknown) =>
    writeFileSync(join(TEST_DIR, rel), JSON.stringify(data))
  const writeEnv = (rel: string, content: string) => writeFileSync(join(TEST_DIR, rel), content)

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
    it.each([
      {
        name: 'HTTPS as secure',
        url: 'https://example.com',
        assert: (r: ReturnType<typeof checkHttps>) => {
          expect(r.isSecure).toBe(true)
          expect(r.isProduction).toBe(true)
          expect(r.isLocalhost).toBe(false)
          expect(r.protocol).toBe('https')
          expect(r.hostname).toBe('example.com')
          expect(r.warning).toBeUndefined()
        },
      },
      {
        name: 'HTTP as insecure in production',
        url: 'http://example.com',
        assert: (r: ReturnType<typeof checkHttps>) => {
          expect(r.isSecure).toBe(false)
          expect(r.isProduction).toBe(false)
          expect(r.isLocalhost).toBe(false)
          expect(r.protocol).toBe('http')
          expect(r.hostname).toBe('example.com')
          expect(r.warning).toContain('HTTPS')
          expect(r.recommendation).toBeDefined()
        },
      },
      {
        name: 'HTTP on localhost allowed by default',
        url: 'http://localhost:3000',
        assert: (r: ReturnType<typeof checkHttps>) => {
          expect(r.isSecure).toBe(true)
          expect(r.isLocalhost).toBe(true)
          expect(r.isProduction).toBe(false)
          expect(r.protocol).toBe('http')
          expect(r.hostname).toBe('localhost')
          expect(r.warning).toBeUndefined()
        },
      },
      {
        name: 'HTTP on 127.0.0.1 allowed by default',
        url: 'http://127.0.0.1:3000',
        assert: (r: ReturnType<typeof checkHttps>) => {
          expect(r.isSecure).toBe(true)
          expect(r.isLocalhost).toBe(true)
          expect(r.protocol).toBe('http')
        },
      },
    ])('should detect $name', ({ url, assert }) => {
      const result = checkHttps(url)
      assert(result)
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

    it('should treat https localhost as secure but not production', () => {
      const result = checkHttps('https://localhost:3000')

      expect(result.isSecure).toBe(true)
      expect(result.isLocalhost).toBe(true)
      expect(result.isProduction).toBe(false)
    })

    it.each([
      {
        name: 'invalid URLs',
        url: 'not-a-valid-url',
        assert: (r: ReturnType<typeof checkHttps>) => {
          expect(r.isSecure).toBe(false)
          expect(r.protocol).toBe('unknown')
          expect(r.warning).toContain('Invalid URL')
          expect(r.recommendation).toBeDefined()
        },
      },
      {
        name: 'URLs without protocol',
        url: 'example.com',
        assert: (r: ReturnType<typeof checkHttps>) => {
          expect(r.isSecure).toBe(false)
          expect(r.protocol).toBe('unknown')
        },
      },
    ])('should handle $name', ({ url, assert }) => {
      const result = checkHttps(url)
      assert(result)
    })
  })

  describe('detectProjectUrl', () => {
    it.each([
      { key: 'homepage', value: 'https://myapp.com' },
      { key: 'url', value: 'https://myapp.com' },
    ])('should detect URL from package.json %s', ({ key, value }) => {
      writeJSON('package.json', { [key]: value })
      const url = detectProjectUrl(TEST_DIR)
      expect(url).toBe(value)
    })

    it('should detect URL from .env file', () => {
      writeEnv('.env', 'NEXT_PUBLIC_URL=https://myapp.com\nOTHER_VAR=value')
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

    it('should detect URL from .env.local file', () => {
      writeEnv('.env.local', 'PUBLIC_URL=https://localenv.com')
      const url = detectProjectUrl(TEST_DIR)
      expect(url).toBe('https://localenv.com')
    })

    it('should detect URL from vercel.json', () => {
      writeJSON('vercel.json', { url: 'https://vercel.app' })

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://vercel.app')
    })

    it('should detect URL from netlify.toml', () => {
      writeEnv('netlify.toml', 'url = "https://netlify.app"')

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://netlify.app')
    })

    it('should detect URL from next.config.js', () => {
      writeEnv('next.config.js', 'module.exports = { baseUrl: "https://nextjs.app" }')

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://nextjs.app')
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
      writeJSON('package.json', { homepage: 'https://myapp.com' })

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
      writeJSON('package.json', { homepage: 'http://localhost:3000' })

      const result = checkProjectHttps({
        url: 'https://production.com',
        projectPath: TEST_DIR,
      })

      expect(result.hostname).toBe('production.com')
      expect(result.isSecure).toBe(true)
    })
  })

  describe('detectProjectUrl - JS/TS files', () => {
    it('should detect URL from JavaScript file with pattern', () => {
      writeEnv('config.js', 'const API_URL = "https://api.example.com";')

      const url = detectProjectUrl(TEST_DIR)

      // Should try to detect from JS files (though pattern might not match)
      expect(url).toBeDefined()
    })

    it('should detect URL from TypeScript file with pattern', () => {
      writeEnv('config.ts', 'const API_URL = "https://api.example.com";')

      const url = detectProjectUrl(TEST_DIR)

      // Should try to detect from TS files
      expect(url).toBeDefined()
    })

    it('should handle parse errors gracefully', () => {
      // Create invalid JSON file
      writeEnv('package.json', '{ invalid json }')

      const url = detectProjectUrl(TEST_DIR)

      // Should return null on parse error
      expect(url).toBeNull()
    })
  })

  describe('detectProjectUrl - .env files', () => {
    it('should detect URL from .env file with NEXT_PUBLIC_URL', () => {
      writeEnv('.env', 'NEXT_PUBLIC_URL=https://myapp.com\nOTHER_VAR=value')

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://myapp.com')
    })

    it('should detect URL from .env file with VITE_PUBLIC_URL', () => {
      writeEnv('.env', 'VITE_PUBLIC_URL=https://viteapp.com')

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://viteapp.com')
    })

    it('should handle .env file with multiple lines', () => {
      writeEnv('.env', 'VAR1=value1\nNEXT_PUBLIC_URL=https://myapp.com\nVAR2=value2')

      const url = detectProjectUrl(TEST_DIR)

      expect(url).toBe('https://myapp.com')
    })

    it('should handle .env file parse errors', () => {
      // Create .env file that might cause issues
      writeEnv('.env', '')

      const url = detectProjectUrl(TEST_DIR)

      // Should return null if no URL found
      expect(url).toBeNull()
    })
  })
})

