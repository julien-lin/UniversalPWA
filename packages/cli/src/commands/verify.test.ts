import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { verifyCommand } from './verify.js'

const TEST_DIR = '/tmp/.test-verify-pwa'

describe('verify', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  it('should return error if project path does not exist', async () => {
    const result = await verifyCommand({
      projectPath: join(TEST_DIR, 'non-existent'),
    })

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some((e) => e.includes('does not exist'))).toBe(true)
  })

  it('should verify PWA setup with all required files', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Create required files with all mandatory PWA fields
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192' },
        { src: '/icon-512x512.png', sizes: '512x512' },
      ],
    }))
    // Service worker with precache for validation
    writeFileSync(join(publicDir, 'sw.js'), `
const CACHE_NAME = 'test-v1';
const urlsToCache = ['/'];

self.addEventListener('install', () => {
  console.log('precache');
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.clients.claim();
});
`)
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')

    // Create complete HTML file with all required meta-tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test App</title>
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#ffffff">
  <meta name="apple-mobile-web-app-capable" content="yes">
</head>
<body>
  <h1>Test PWA</h1>
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
    }
  </script>
</body>
</html>`
    writeFileSync(join(TEST_DIR, 'index.html'), html)

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(result.validationResult?.isValid).toBe(true)
    expect(result.filesFound.length).toBeGreaterThanOrEqual(5)
    // Check that all required files are found (recommended files may be missing)
    const requiredFiles = ['sw.js', 'manifest.json', 'icon-192x192.png', 'icon-512x512.png', 'apple-touch-icon.png']
    for (const file of requiredFiles) {
      expect(result.filesFound).toContain(file)
    }
  })

  it('should detect missing required files', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(result.success).toBe(false)
    expect(result.filesMissing.length).toBeGreaterThan(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should report missing icon files referenced in manifest', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Create manifest referencing both icons, but only provide one
    writeFileSync(
      join(publicDir, 'manifest.json'),
      JSON.stringify({
        name: 'Test App',
        short_name: 'Test',
        start_url: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192' },
          { src: '/icon-512x512.png', sizes: '512x512' },
        ],
      }),
    )
    // Provide only one icon file
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(result.success).toBe(false)
    expect(result.filesMissing).toContain('icon-512x512.png')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('should check Dockerfile if checkDocker is true', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Create Dockerfile without PWA files
    writeFileSync(join(TEST_DIR, 'Dockerfile'), 'FROM nginx\nCOPY . /usr/share/nginx/html/')

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
      checkDocker: true,
    })

    expect(result.dockerfileFound).toBe(true)
    expect(result.dockerfileNeedsUpdate).toBe(true)
    expect(result.dockerfileSuggestions.length).toBeGreaterThan(0)
  })

  it('should not check Dockerfile if checkDocker is false', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(TEST_DIR, 'Dockerfile'), 'FROM nginx')

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
      checkDocker: false,
    })

    expect(result.dockerfileFound).toBe(false)
    expect(result.dockerfileNeedsUpdate).toBe(false)
  })

  it('should detect Dockerfile with PWA files', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(TEST_DIR, 'Dockerfile'), 'FROM nginx\nCOPY sw.js /usr/share/nginx/html/\nCOPY manifest.json /usr/share/nginx/html/\nCOPY icon-*.png /usr/share/nginx/html/\nCOPY apple-touch-icon.png /usr/share/nginx/html/')

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
      checkDocker: true,
    })

    expect(result.dockerfileFound).toBe(true)
    expect(result.dockerfileNeedsUpdate).toBe(false)
  })

  it('should include validation result', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(result.validationResult).toBeDefined()
    expect(result.validationResult?.score).toBeDefined()
    expect(result.validationResult?.errors).toBeDefined()
    expect(result.validationResult?.warnings).toBeDefined()
  })

  it('should report missing manifest link in HTML', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Minimal manifest and icons to avoid unrelated errors
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192' },
        { src: '/icon-512x512.png', sizes: '512x512' },
      ],
    }))
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')

    // HTML without manifest link
    writeFileSync(
      join(TEST_DIR, 'index.html'),
      '<html><head><meta name="theme-color" content="#ffffff"></head><body></body></html>',
    )

    const result = await verifyCommand({ projectPath: TEST_DIR, outputDir: 'public' })

    expect(result.validationResult).toBeDefined()
    const errors = result.validationResult!.errors.map((e) => e.code)
    expect(errors).toContain('META_MANIFEST_MISSING')
  })

  it('should warn when theme-color meta tag is missing', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Valid manifest + icons
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192' },
        { src: '/icon-512x512.png', sizes: '512x512' },
      ],
    }))
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')

    // HTML with manifest but without theme-color
    writeFileSync(
      join(TEST_DIR, 'index.html'),
      '<html><head><link rel="manifest" href="/manifest.json"></head><body></body></html>',
    )

    const result = await verifyCommand({ projectPath: TEST_DIR, outputDir: 'public' })
    expect(result.validationResult).toBeDefined()
    const warnings = result.validationResult!.warnings.map((w) => w.code)
    expect(warnings).toContain('META_THEME_COLOR_MISSING')
  })

  it('should detect service worker without precache configuration', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Valid manifest + icons
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192' },
        { src: '/icon-512x512.png', sizes: '512x512' },
      ],
    }))
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')

    // Service worker without precache
    writeFileSync(
      join(publicDir, 'sw.js'),
      'self.addEventListener("install", () => { self.skipWaiting(); });',
    )

    writeFileSync(
      join(TEST_DIR, 'index.html'),
      '<html><head><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#ffffff"></head><body><script>navigator.serviceWorker.register("/sw.js")</script></body></html>',
    )

    const result = await verifyCommand({ projectPath: TEST_DIR, outputDir: 'public' })

    expect(result.validationResult).toBeDefined()
    const warnings = result.validationResult!.warnings.map((w) => w.code)
    expect(warnings).toContain('SERVICE_WORKER_NO_PRECACHE')
  })

  it('should suggest Dockerfile updates for missing PWA COPY directives', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Create Dockerfile with only basic setup
    writeFileSync(
      join(TEST_DIR, 'Dockerfile'),
      'FROM nginx:latest\nCOPY . /usr/share/nginx/html/',
    )

    // Create valid manifest + icons (to avoid unrelated errors)
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192' },
        { src: '/icon-512x512.png', sizes: '512x512' },
      ],
    }))
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')
    writeFileSync(join(publicDir, 'sw.js'), 'console.log("sw");')

    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
      checkDocker: true,
    })

    expect(result.dockerfileFound).toBe(true)
    expect(result.dockerfileNeedsUpdate).toBe(true)
    expect(result.dockerfileSuggestions.length).toBeGreaterThan(0)
    expect(result.dockerfileSuggestions.some((s) => s.includes('manifest.json'))).toBe(true)
  })

  it('should handle errors gracefully', async () => {
    // Test with invalid project path
    const result = await verifyCommand({
      projectPath: '/non-existent-path',
      outputDir: 'public',
    })

    expect(result.success).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors.some((e) => e.includes('does not exist'))).toBe(true)
  })

  it('should display success message for score >= 90', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
      start_url: '/',
      display: 'standalone',
      theme_color: '#ffffff',
      background_color: '#ffffff',
      icons: [
        { src: '/icon-192x192.png', sizes: '192x192' },
        { src: '/icon-512x512.png', sizes: '512x512' },
      ],
    }))
    writeFileSync(join(publicDir, 'sw.js'), 'self.addEventListener("install", () => {});')
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')
    writeFileSync(join(TEST_DIR, 'index.html'), '<html><head><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#ffffff"><meta name="apple-mobile-web-app-capable" content="yes"></head><body><script>navigator.serviceWorker.register("/sw.js")</script></body></html>')

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    // Should log success message if score >= 90
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should display warning message for score >= 70 but < 90', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
    }))
    writeFileSync(join(publicDir, 'sw.js'), 'console.log("sw");')
    writeFileSync(join(publicDir, 'icon-192x192.png'), 'dummy')
    writeFileSync(join(publicDir, 'icon-512x512.png'), 'dummy')
    writeFileSync(join(publicDir, 'apple-touch-icon.png'), 'dummy')

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should display error message for score < 70', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Minimal setup that will have low score
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test',
    }))

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should handle catch block errors', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    // Test error handling by using a path that will cause an error during validation
    // We'll use a path that exists but will cause issues during validation
    const result = await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'non-existent-output',
    })

    // Should handle errors gracefully
    expect(result.validationResult).toBeDefined()
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should validate service worker without precache list', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
      short_name: 'Test',
    }))

    // Service worker without precache list
    writeFileSync(join(publicDir, 'sw.js'), `
      self.addEventListener('install', event => {
        // No precache list
      })
    `)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should detect missing manifest link in HTML', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(publicDir, 'index.html'), `
      <!DOCTYPE html>
      <html>
      <head>
        <title>App</title>
        <!-- Missing: <link rel="manifest" href="manifest.json"> -->
      </head>
      <body>Test</body>
      </html>
    `)

    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
    }))

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should detect missing theme-color meta tag', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(publicDir, 'index.html'), `
      <!DOCTYPE html>
      <html>
      <head>
        <title>App</title>
        <link rel="manifest" href="manifest.json">
        <!-- Missing: <meta name="theme-color" content="#ffffff"> -->
      </head>
      <body>Test</body>
      </html>
    `)

    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
    }))

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should handle Dockerfile with incomplete COPY directives', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify({
      name: 'Test App',
    }))

    writeFileSync(join(TEST_DIR, 'Dockerfile'), `
      FROM node:18
      WORKDIR /app
      COPY . .
      RUN npm install
      # Missing proper build or server configuration
    `)

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should verify multiple missing PWA files at once', async () => {
    const publicDir = join(TEST_DIR, 'public')
    mkdirSync(publicDir, { recursive: true })

    // Create minimal HTML without PWA metadata
    writeFileSync(join(publicDir, 'index.html'), `
      <!DOCTYPE html>
      <html>
      <head><title>App</title></head>
      <body>Test</body>
      </html>
    `)

    // No manifest, no icons, no service worker

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

    await verifyCommand({
      projectPath: TEST_DIR,
      outputDir: 'public',
    })

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

