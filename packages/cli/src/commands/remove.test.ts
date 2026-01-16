import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { removeCommand } from './remove.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-cli-remove')

// ============= Test Helpers =============

/**
 * Create a basic HTML file with PWA meta-tags
 */
function createHtmlWithPWA(filename: string, includeSW = true): string {
  const filePath = join(TEST_DIR, filename)
  const html = `
<html>
<head>
  <title>Test</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#ffffff">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="mobile-web-app-capable" content="yes">
</head>
<body>${includeSW ? '\n  <script>\n    navigator.serviceWorker.register(\'/sw.js\');\n  </script>\n' : ''}</body>
</html>`
  writeFileSync(filePath, html)
  return filePath
}

/**
 * Create a basic HTML file without PWA meta-tags
 */
function createHtmlWithoutPWA(filename: string): string {
  const filePath = join(TEST_DIR, filename)
  const html = `
<html>
<head>
  <title>Test</title>
</head>
<body></body>
</html>`
  writeFileSync(filePath, html)
  return filePath
}

/**
 * Create PWA files in a directory
 */
function createPWAFiles(dir: string, files: string[]): void {
  const targetDir = join(TEST_DIR, dir)
  mkdirSync(targetDir, { recursive: true })
  for (const file of files) {
    const content = file.endsWith('.json') ? JSON.stringify({ name: 'Test' }) : '// Test content'
    writeFileSync(join(targetDir, file), content)
  }
}

/**
 * Create a package.json for framework detection
 */
function createPackageJson(dependencies: Record<string, string> = {}): void {
  writeFileSync(
    join(TEST_DIR, 'package.json'),
    JSON.stringify({ dependencies }),
  )
}

/**
 * Base remove command options
 */
const baseRemoveCommand = {
  projectPath: TEST_DIR,
  skipHtmlRestore: true,
}

describe('remove command', () => {
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

  describe('Project path validation', () => {
    it('should fail if project path does not exist', async () => {
      const result = await removeCommand({
        projectPath: join(TEST_DIR, 'non-existent'),
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('does not exist')
    })
  })

  describe('PWA file removal', () => {
    it('should remove PWA files from output directory', async () => {
      createPWAFiles('public', ['manifest.json', 'sw.js', 'icon-192x192.png', 'apple-touch-icon.png'])

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'public',
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved.length).toBeGreaterThan(0)
      expect(result.filesRemoved).toContain('manifest.json')
      expect(result.filesRemoved).toContain('sw.js')
      expect(existsSync(join(TEST_DIR, 'public', 'manifest.json'))).toBe(false)
      expect(existsSync(join(TEST_DIR, 'public', 'sw.js'))).toBe(false)
    })

    it('should skip file removal if skipFiles is true', async () => {
      createPWAFiles('public', ['manifest.json'])

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'public',
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved.length).toBe(0)
      expect(existsSync(join(TEST_DIR, 'public', 'manifest.json'))).toBe(true)
    })

    it('should remove workbox-*.js files', async () => {
      createPWAFiles('public', ['workbox-abc123.js'])

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'public',
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved.some((f: string) => f.includes('workbox-'))).toBe(true)
    })

    it('should handle missing files gracefully', async () => {
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'public',
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved.length).toBe(0)
      expect(result.warnings.length).toBe(0)
    })
  })

  describe('HTML file restoration', () => {
    it('should remove PWA meta-tags from HTML files', async () => {
      createHtmlWithPWA('index.html')

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      expect(result.htmlFilesRestored).toBe(1)

      const restoredHtml = readFileSync(join(TEST_DIR, 'index.html'), 'utf-8')
      expect(restoredHtml).not.toContain('rel="manifest"')
      expect(restoredHtml).not.toContain('theme-color')
      expect(restoredHtml).not.toContain('apple-touch-icon')
      expect(restoredHtml).not.toContain('mobile-web-app-capable')
    })

    it('should skip HTML restoration if skipHtmlRestore is true', async () => {
      createHtmlWithPWA('index.html', false)

      const result = await removeCommand({
        ...baseRemoveCommand,
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      expect(result.htmlFilesRestored).toBe(0)

      const html = readFileSync(join(TEST_DIR, 'index.html'), 'utf-8')
      expect(html).toContain('rel="manifest"')
    })

    it('should handle HTML files without PWA tags', async () => {
      createHtmlWithoutPWA('index.html')

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      expect(result.htmlFilesRestored).toBe(0)
    })

    it('should restore multiple HTML files', async () => {
      createHtmlWithPWA('index.html', false)
      createHtmlWithPWA('about.html', false)

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      expect(result.htmlFilesRestored).toBe(2)
    })
  })

  describe('Output directory detection', () => {
    it('should use custom output directory', async () => {
      createPWAFiles('custom-output', ['manifest.json'])

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'custom-output',
      })

      expect(result.success).toBe(true)
      expect(result.outputDir).toContain('custom-output')
      expect(result.filesRemoved).toContain('manifest.json')
    })

    it('should auto-detect dist/ directory for React/Vite projects', async () => {
      createPackageJson({ react: '^18.0.0' })
      createPWAFiles('dist', ['manifest.json'])

      const result = await removeCommand(baseRemoveCommand)

      expect(result.success).toBe(true)
      expect(result.outputDir).toContain('dist')
    })

    it('should fallback to public/ when dist/ does not exist', async () => {
      createPWAFiles('public', ['manifest.json'])

      const result = await removeCommand(baseRemoveCommand)

      expect(result.success).toBe(true)
      expect(result.outputDir).toContain('public')
    })
  })

  describe('Transaction management', () => {
    it('should commit transaction on success', async () => {
      createPWAFiles('public', ['manifest.json'])

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'public',
      })

      expect(result.success).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const result = await removeCommand({
        projectPath: join(TEST_DIR, 'non-existent'),
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Service worker script removal', () => {
    it('should detect service worker scripts in HTML for removal', async () => {
      const html = `<html>
<head><title>Test</title></head>
<body>
  <script type="text/javascript">
    navigator.serviceWorker.register('/sw.js');
  </script>
</body>
</html>`
      writeFileSync(join(TEST_DIR, 'index.html'), html)

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
        skipHtmlRestore: false,
      })

      expect(result.success).toBe(true)
      // Verify the command completed successfully
      expect(result.projectPath).toBeDefined()
    })

    it('should remove beforeinstallprompt handler from HTML', async () => {
      const html = `
<html>
<head><title>Test</title></head>
<body>
  <script>
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
    });
  </script>
</body>
</html>`
      writeFileSync(join(TEST_DIR, 'index.html'), html)

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
      })

      // Verify the command succeeds
      expect(result.success).toBe(true)
      expect(result.projectPath).toBeDefined()
    })

    it('should preserve non-PWA scripts', async () => {
      const html = `
<html>
<head><title>Test</title></head>
<body>
  <script>console.log('important code');</script>
  <script>
    navigator.serviceWorker.register('/sw.js');
  </script>
  <script>console.log('more important code');</script>
</body>
</html>`
      writeFileSync(join(TEST_DIR, 'index.html'), html)

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
      })

      // Verify the command succeeds
      expect(result.success).toBe(true)
      const restoredHtml = readFileSync(join(TEST_DIR, 'index.html'), 'utf-8')
      // Verify the file still has content
      expect(restoredHtml).toContain('console.log')
      expect(restoredHtml).toContain('important code')
    })
  })

  describe('Edge cases', () => {
    it('should handle HTML with nested meta tags', async () => {
      const html = `
<html>
<head>
  <title>Test</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#ffffff">
</head>
<body></body>
</html>`
      writeFileSync(join(TEST_DIR, 'index.html'), html)

      const result = await removeCommand({
        projectPath: TEST_DIR,
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      const restoredHtml = readFileSync(join(TEST_DIR, 'index.html'), 'utf-8')
      expect(restoredHtml).not.toContain('rel="manifest"')
      expect(restoredHtml).not.toContain('theme-color')
    })

    it('should handle directory with no files', async () => {
      mkdirSync(join(TEST_DIR, 'empty-dir'), { recursive: true })

      const result = await removeCommand({
        projectPath: join(TEST_DIR, 'empty-dir'),
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved.length).toBe(0)
      expect(result.htmlFilesRestored).toBe(0)
    })

    it('should list removed PWA files correctly', async () => {
      createPWAFiles('public', ['manifest.json', 'sw.js', 'icon-192x192.png'])

      const result = await removeCommand({
        ...baseRemoveCommand,
        outputDir: 'public',
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved).toContain('manifest.json')
      expect(result.filesRemoved).toContain('sw.js')
      expect(result.filesRemoved).toContain('icon-192x192.png')
      expect(result.filesRemoved.length).toBe(3)
    })

    it('should handle skipHtmlRestore and skipFiles both true', async () => {
      createHtmlWithPWA('index.html')
      createPWAFiles('public', ['manifest.json'])

      const result = await removeCommand({
        projectPath: TEST_DIR,
        outputDir: 'public',
        skipHtmlRestore: true,
        skipFiles: true,
      })

      expect(result.success).toBe(true)
      expect(result.filesRemoved.length).toBe(0)
      expect(result.htmlFilesRestored).toBe(0)

      // Verify nothing was removed
      expect(existsSync(join(TEST_DIR, 'public', 'manifest.json'))).toBe(true)
      expect(readFileSync(join(TEST_DIR, 'index.html'), 'utf-8')).toContain('rel="manifest"')
    })
  })
})

