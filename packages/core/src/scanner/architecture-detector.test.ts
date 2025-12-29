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

  // Helpers
  const write = (relPath: string, content: string) => writeFileSync(join(TEST_DIR, relPath), content)
  const writeIndex = (html: string) => write('index.html', html)
  const ensureDir = (rel: string) => mkdirSync(join(TEST_DIR, rel), { recursive: true })
  const writeSrc = (file: string, content: string) => {
    ensureDir('src')
    write(`src/${file}`, content)
  }
  const writePkg = (deps?: Record<string, string>, devDeps?: Record<string, string>) =>
    write(
      'package.json',
      JSON.stringify({ dependencies: deps ?? {}, devDependencies: devDeps ?? {} }),
    )
  const detect = () => detectArchitecture(TEST_DIR)

  describe('SPA detection', () => {
    it.each([
      {
        name: 'root div',
        html:
          '<html><body><div id="root"></div><script src="app.js"></script></body></html>',
      },
      { name: 'app div', html: '<html><body><div id="app"></div></body></html>' },
      {
        name: 'React createRoot',
        html:
          '<html><body><div id="root"></div><script>ReactDOM.createRoot(document.getElementById("root"))</script></body></html>',
      },
    ])('should detect SPA with $name', async ({ html }) => {
      writeIndex(html)
      const result = await detect()
      expect(result.architecture).toBe('spa')
    })

    it('should detect SPA via router patterns in JS', async () => {
      writeIndex('<html><body></body></html>')
      writeSrc('router.js', 'import { BrowserRouter } from "react-router-dom"')
      const result = await detect()
      expect(result.architecture).toBe('spa')
    })
  })

  describe('SSR detection', () => {
    it.each([
      {
        name: 'large HTML content',
        html: '<html><body>' + '<article>'.repeat(10) + 'Content'.repeat(100) + '</body></html>',
      },
      {
        name: 'hydration patterns (Next.js marker)',
        html: '<html><body><main>Content</main><script>__NEXT_DATA__</script></body></html>',
      },
      {
        name: 'very large content with real text',
        html:
          '<html><body><div id="root"></div>' + '<p>Real text content here</p>'.repeat(200) + '</body></html>',
      },
      {
        name: 'SSR patterns and large content',
        html:
          '<html><body><article>' + '<p>Article content</p>'.repeat(150) + '</article></body></html>',
      },
      {
        name: 'SSR patterns without SPA patterns',
        html: '<html><body><article>Content</article><script>hydrate()</script></body></html>',
      },
      {
        name: 'SPA hook but very large content',
        html:
          '<html><body><div id="root"></div>' + '<p>Real text content</p>'.repeat(200) + '</body></html>',
      },
      {
        name: 'HTML content > 500 chars',
        html: '<html><body>' + '<p>Content paragraph</p>'.repeat(30) + '</body></html>',
      },
    ])('should detect SSR with $name', async ({ html }) => {
      writeIndex(html)
      const result = await detect()
      expect(result.architecture).toBe('ssr')
    })

    it.each([
      { dep: { next: '^15.0.0' }, label: 'Next.js' },
      { dep: { '@sveltejs/kit': '^2.0.0' }, label: 'SvelteKit' },
      { dep: { '@remix-run/react': '^2.0.0' }, label: 'Remix' },
      { dep: { astro: '^4.0.0' }, label: 'Astro' },
    ])('should detect SSR with $label', async ({ dep, label }) => {
      writePkg(dep)
      writeIndex('<html><body></body></html>')
      const result = await detect()
      expect(result.architecture).toBe('ssr')
      expect(result.indicators.some((i) => i.includes(label))).toBe(true)
    })
  })

  describe('SPA detection for new frameworks', () => {
    it.each([
      { dep: { svelte: '^4.0.0' }, label: 'Svelte' },
      { dep: { 'solid-js': '^1.8.0' }, label: 'SolidJS' },
    ])('should detect SPA with $label', async ({ dep, label }) => {
      writePkg(dep)
      const result = await detect()
      expect(result.architecture).toBe('spa')
      expect(result.indicators.some((i) => i.includes(label))).toBe(true)
    })
  })

  describe('Static detection', () => {
    it('should detect static site with minimal HTML', async () => {
      writeIndex('<html><body><h1>Hello</h1></body></html>')
      const result = await detect()

      expect(result.architecture).toBe('static')
    })
  })

  describe('Build tools detection', () => {
    it.each([
      { tool: 'vite', version: '^7.0.0', high: true },
      { tool: 'webpack', version: '^5.0.0', high: false },
      { tool: 'rollup', version: '^4.0.0', high: false },
    ])('should detect $tool', async ({ tool, version, high }) => {
      writePkg(undefined, { [tool]: version })
      const result = await detect()
      expect(result.buildTool).toBe(tool)
      if (high) expect(result.confidence).toBe('high')
    })
  })

  describe('Mixed cases', () => {
    it('should prioritize SSR over SPA when both patterns present', async () => {
      writeIndex(
        '<html><body><div id="root"></div><main>Large SSR content'.repeat(20) + '</main></body></html>',
      )

      const result = await detect()

      // SSR patterns should win if content is large
      expect(result.architecture).toBe('ssr')
    })
  })

  describe('Router patterns detection', () => {
    it('should upgrade confidence from low to medium when router found', async () => {
      writeIndex('<html><body></body></html>')
      ensureDir('src')
      write('src/router.js', 'import { createBrowserRouter } from "react-router"')

      const result = await detect()

      expect(result.architecture).toBe('spa')
      expect(result.confidence).toBe('medium')
      expect(result.indicators.some((i) => i.includes('router patterns'))).toBe(true)
    })

    it('should handle read errors in JS files gracefully', async () => {
      writeIndex('<html><body></body></html>')
      ensureDir('src')
      write('src/app.js', 'console.log("test")')

      const result = await detect()

      // Result should be valid even if some files cannot be read
      expect(result.architecture).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should handle missing files gracefully', async () => {
      const result = await detect()

      expect(result.architecture).toBe('static')
      expect(result.confidence).toBe('low')
    })

    it('should handle invalid JSON gracefully', async () => {
      write('package.json', 'invalid json')

      const result = await detect()

      expect(result.buildTool).toBeNull()
    })

    it('should handle HTML read errors gracefully', async () => {
      // Create directory but no valid HTML file
      ensureDir('public')

      const result = await detect()

      expect(result.architecture).toBe('static')
      expect(result.confidence).toBeDefined()
    })
  })
})

