import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { detectArchitecture } from './architecture-detector'

const TEST_DIR = join(process.cwd(), '.test-tmp-architecture-detector')

describe('architecture-detector', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  describe('SPA detection', () => {
    it('should detect SPA with root div', async () => {
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><body><div id="root"></div><script src="app.js"></script></body></html>',
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('spa')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('SPA'))).toBe(true)
    })

    it('should detect SPA with app div', async () => {
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><body><div id="app"></div></body></html>',
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('spa')
    })

    it('should detect SPA with React patterns', async () => {
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><body><div id="root"></div><script>ReactDOM.createRoot(document.getElementById("root"))</script></body></html>',
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('spa')
    })

    it('should detect SPA via router patterns in JS', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><body></body></html>')
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
      writeFileSync(
        join(TEST_DIR, 'src', 'router.js'),
        'import { BrowserRouter } from "react-router-dom"',
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('spa')
    })
  })

  describe('SSR detection', () => {
    it('should detect SSR with large HTML content', async () => {
      const largeContent = '<html><body>' + '<article>'.repeat(10) + 'Content'.repeat(100) + '</body></html>'
      writeFileSync(join(TEST_DIR, 'index.html'), largeContent)

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
    })

    it('should detect SSR with hydration patterns', async () => {
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><body><main>Content</main><script>__NEXT_DATA__</script></body></html>',
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('SSR'))).toBe(true)
    })

    it('should detect SSR with very large content and real text', async () => {
      const veryLargeContent = '<html><body><div id="root"></div>' + '<p>Real text content here</p>'.repeat(200) + '</body></html>'
      writeFileSync(join(TEST_DIR, 'index.html'), veryLargeContent)

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('very large content'))).toBe(true)
    })

    it('should detect SSR with SSR patterns and large content', async () => {
      const largeContent = '<html><body><article>' + '<p>Article content</p>'.repeat(150) + '</article></body></html>'
      writeFileSync(join(TEST_DIR, 'index.html'), largeContent)

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('SSR patterns detected (large content)'))).toBe(true)
    })

    it('should detect SSR with SSR patterns but no SPA patterns', async () => {
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><body><article>Content</article><script>hydrate()</script></body></html>',
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('SSR patterns detected'))).toBe(true)
    })

    it('should detect SSR with SPA pattern but large content', async () => {
      const largeContent = '<html><body><div id="root"></div>' + '<p>Real text content</p>'.repeat(200) + '</body></html>'
      writeFileSync(join(TEST_DIR, 'index.html'), largeContent)

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('SPA pattern but large content'))).toBe(true)
    })

    it('should detect SSR with HTML content > 500 chars', async () => {
      const mediumContent = '<html><body>' + '<p>Content paragraph</p>'.repeat(30) + '</body></html>'
      writeFileSync(join(TEST_DIR, 'index.html'), mediumContent)

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('large content'))).toBe(true)
    })

    it('should detect SSR with Next.js', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^15.0.0',
          },
        }),
      )
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><body></body></html>')

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes('Next.js'))).toBe(true)
    })
  })

  describe('Static detection', () => {
    it('should detect static site with minimal HTML', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><body><h1>Hello</h1></body></html>')

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('static')
    })
  })

  describe('Build tools detection', () => {
    it('should detect Vite', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          devDependencies: {
            vite: '^7.0.0',
          },
        }),
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.buildTool).toBe('vite')
      expect(result.confidence).toBe('high')
    })

    it('should detect Webpack', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          devDependencies: {
            webpack: '^5.0.0',
          },
        }),
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.buildTool).toBe('webpack')
    })

    it('should detect Rollup', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          devDependencies: {
            rollup: '^4.0.0',
          },
        }),
      )

      const result = await detectArchitecture(TEST_DIR)

      expect(result.buildTool).toBe('rollup')
    })
  })

  describe('Mixed cases', () => {
    it('should prioritize SSR over SPA when both patterns present', async () => {
      writeFileSync(
        join(TEST_DIR, 'index.html'),
        '<html><body><div id="root"></div><main>Large SSR content'.repeat(20) + '</main></body></html>',
      )

      const result = await detectArchitecture(TEST_DIR)

      // SSR patterns should win if content is large
      expect(result.architecture).toBe('ssr')
    })
  })

  describe('Router patterns detection', () => {
    it('should upgrade confidence from low to medium when router found', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><body></body></html>')
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'src', 'router.js'), 'import { createBrowserRouter } from "react-router"')

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('spa')
      expect(result.confidence).toBe('medium')
      expect(result.indicators.some((i) => i.includes('router patterns'))).toBe(true)
    })

    it('should handle read errors in JS files gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html><body></body></html>')
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'src', 'app.js'), 'console.log("test")')

      const result = await detectArchitecture(TEST_DIR)

      // Result should be valid even if some files cannot be read
      expect(result.architecture).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle missing files gracefully', async () => {
      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('static')
      expect(result.confidence).toBe('low')
    })

    it('should handle invalid JSON gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'package.json'), 'invalid json')

      const result = await detectArchitecture(TEST_DIR)

      expect(result.buildTool).toBeNull()
    })

    it('should handle HTML read errors gracefully', async () => {
      // Create directory but no valid HTML file
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await detectArchitecture(TEST_DIR)

      expect(result.architecture).toBe('static')
      expect(result.confidence).toBeDefined()
    })
  })
})

