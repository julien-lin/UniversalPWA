/**
 * Integration tests for Symfony Backend
 * Tests full PWA generation workflow with Symfony integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { SymfonyIntegration } from '../symfony.js'
import { ServiceWorkerConfigBuilder } from '../../generator/service-worker-config-builder.js'
import { generateServiceWorkerFromBackend } from '../../generator/service-worker-generator.js'
import { injectMetaTagsInFile } from '../../injector/meta-injector.js'
import { generateIcons } from '../../generator/icon-generator.js'

const createSymfonyFixture = (): string => {
  const root = join(tmpdir(), `symfony-fixture-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  mkdirSync(join(root, 'config'), { recursive: true })
  mkdirSync(join(root, 'public'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })

  writeFileSync(
    join(root, 'composer.json'),
    JSON.stringify({
      require: {
        'php': '>=8.2',
        'symfony/framework-bundle': '^7.0',
      },
    }),
  )

  writeFileSync(join(root, 'public', 'index.php'), '<?php echo "Symfony";')
  writeFileSync(join(root, 'config', 'services.yaml'), 'services:\n  _defaults:\n    autowire: true\n')

  writeFileSync(
    join(root, 'public', 'index.html'),
    '<!doctype html><html><head><title>Symfony</title></head><body><div id="app"></div></body></html>',
  )

  return root
}

const cleanup = (path: string) => {
  try {
    rmSync(path, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

describe('SymfonyIntegration (integration-lite)', () => {
  let projectRoot = ''

  beforeEach(() => {
    projectRoot = createSymfonyFixture()
  })

  afterEach(() => {
    cleanup(projectRoot)
  })

  it('should detect and validate ServiceWorkerConfig', () => {
    const integration = new SymfonyIntegration(projectRoot)
    const detection = integration.detect()
    expect(detection.detected).toBe(true)
    expect(detection.framework).toBe('symfony')
    expect(detection.confidence).toBe('high')

    const config = integration.generateServiceWorkerConfig()
    const validation = ServiceWorkerConfigBuilder.validate(config)
    expect(validation.isValid).toBe(true)
  })

  it('should generate a service worker file from backend integration', async () => {
    const outputDir = join(projectRoot, 'public')
    const integration = new SymfonyIntegration(projectRoot)

    const result = await generateServiceWorkerFromBackend(
      integration,
      'ssr',
      {
        projectPath: projectRoot,
        outputDir,
        globDirectory: outputDir,
      },
    )

    expect(existsSync(result.swPath)).toBe(true)
    expect(result.size).toBeGreaterThanOrEqual(0)
    expect(result.count).toBeGreaterThanOrEqual(0)

    // Verify SW contains Workbox
    const swContent = readFileSync(result.swPath, 'utf-8')
    expect(swContent).toContain('workbox')
  })

  it('should inject meta tags into HTML', () => {
    const htmlPath = join(projectRoot, 'public', 'index.html')
    const result = injectMetaTagsInFile(htmlPath, {
      manifestPath: '/manifest.json',
      themeColor: '#000000',
      serviceWorkerPath: '/sw.js',
    })

    expect(result.injected.length).toBeGreaterThan(0)

    // Verify injected content
    const htmlContent = readFileSync(htmlPath, 'utf-8')
    expect(htmlContent).toContain('manifest.json')
    expect(htmlContent).toContain('theme-color')
    expect(htmlContent).toContain('sw.js')
  })

  it('should generate icons from a source image', async () => {
    const sharp = (await import('sharp')).default
    const sourceImage = join(projectRoot, 'icon.png')
    await sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toFile(sourceImage)

    const outputDir = join(projectRoot, 'public', 'icons')
    const result = await generateIcons({
      sourceImage,
      outputDir,
    })

    expect(result.icons.length).toBeGreaterThan(0)
    expect(result.generatedFiles.length).toBeGreaterThan(0)
  }, 10000)

  it('should generate optimized ServiceWorkerConfig for Symfony', () => {
    const integration = new SymfonyIntegration(projectRoot)
    const config = integration.generateServiceWorkerConfig()

    // Verify Symfony-specific optimizations
    expect(config.apiRoutes).toBeDefined()
    expect(config.apiRoutes.length).toBeGreaterThan(0)

    // Check for Symfony-specific routes
    const apiPatterns = integration.getApiPatterns()
    expect(apiPatterns).toContain('/api/**')

    // Verify static asset patterns
    const staticPatterns = integration.getStaticAssetPatterns()
    expect(staticPatterns.length).toBeGreaterThan(0)
  })

  it('should generate manifest variables for Symfony', () => {
    const integration = new SymfonyIntegration(projectRoot)
    const vars = integration.generateManifestVariables()

    expect(vars).toBeDefined()
    expect(typeof vars).toBe('object')
  })

  it('should return start URL for Symfony', () => {
    const integration = new SymfonyIntegration(projectRoot)
    const startUrl = integration.getStartUrl()

    expect(startUrl).toBeDefined()
    expect(typeof startUrl).toBe('string')
    expect(startUrl.length).toBeGreaterThan(0)
  })

  it('should provide secure routes for Symfony', () => {
    const integration = new SymfonyIntegration(projectRoot)
    const secureRoutes = integration.getSecureRoutes()

    expect(Array.isArray(secureRoutes)).toBe(true)
    expect(secureRoutes.length).toBeGreaterThan(0)
  })

  it('should validate Symfony setup', async () => {
    const integration = new SymfonyIntegration(projectRoot)
    const validation = await integration.validateSetup()

    expect(validation).toBeDefined()
    expect(validation.isValid).toBeDefined()
    expect(Array.isArray(validation.errors)).toBe(true)
    expect(Array.isArray(validation.warnings)).toBe(true)
    expect(Array.isArray(validation.suggestions)).toBe(true)
  })
})
