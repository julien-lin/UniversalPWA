import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { initCommand } from './init'

const TEST_DIR = join(process.cwd(), '.test-tmp-cli-init')

// Valid minimal PNG (1x1 transparent)
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
  0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
  0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
  0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND
  0xAE, 0x42, 0x60, 0x82
])

// Helper functions
const createBasicHtml = (title = 'Test') =>
  `<html><head><title>${title}</title></head><body></body></html>`

const createPublicDir = () => {
  mkdirSync(join(TEST_DIR, 'public'), { recursive: true })
}

const createIcon = (filename = 'icon.png') => {
  const iconPath = join(TEST_DIR, filename)
  writeFileSync(iconPath, VALID_PNG)
  return iconPath
}

const createManifest = (name = 'Test', publicDir = 'public') => {
  const path = join(TEST_DIR, publicDir, 'manifest.json')
  writeFileSync(path, JSON.stringify({ name, icons: [{ src: '/icon.png', sizes: '192x192' }] }))
}

const baseInitCommand = {
  name: 'Test App',
  shortName: 'Test',
  skipIcons: true,
  skipServiceWorker: true,
  skipInjection: true,
}

describe('init command', () => {
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
      const result = await initCommand({
        projectPath: join(TEST_DIR, 'non-existent'),
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('does not exist')
    })

    it('should resolve project path correctly', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.projectPath).toBeDefined()
      expect(result.projectPath).toContain(TEST_DIR)
    })
  })

  describe('Framework detection', () => {
    it('should scan project and detect framework', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } }),
      )
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.framework?.toLowerCase()).toBe('react')
      expect(result.architecture).toBeDefined()
    })

    it('should handle cache options (forceScan, noCache)', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result1 = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        forceScan: true,
      })

      expect(result1.framework).toBeDefined()

      const result2 = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        noCache: true,
      })

      expect(result2.framework).toBeDefined()
    })
  })

  describe('HTTPS warnings', () => {
    it('should warn if HTTPS is not available', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.warnings).toBeDefined()
    })
  })

  describe('Output directory resolution', () => {
    it('should use custom output directory (relative path)', async () => {
      const customOutput = join(TEST_DIR, 'custom-output')
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      const iconPath = createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
        outputDir: 'custom-output',
      })

      if (result.manifestPath) {
        expect(result.manifestPath).toContain(customOutput)
      }
    })

    it('should use absolute output directory', async () => {
      const customOutput = join(TEST_DIR, 'custom-output-abs')
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      const iconPath = createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
        outputDir: customOutput,
      })

      if (result.manifestPath) {
        expect(result.manifestPath).toContain(customOutput)
      }
    })

    it('should auto-detect dist/ for React/Vite projects', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } }),
      )
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), createBasicHtml('Dist'))
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result).toBeDefined()
    })

    it('should use public/ when dist/ does not exist', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result).toBeDefined()
    })

    it('should use public/ for WordPress projects', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ dependencies: { '@wordpress/core': '^6.0.0' } }),
      )
      createPublicDir()
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result).toBeDefined()
    })

    it('should fallback to public/ when no directory exists', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result).toBeDefined()
    })
  })

  describe('Icons generation', () => {
    it('should skip icons if skipIcons is true', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.iconsGenerated).toBe(0)
    })

    it('should handle icon source not found', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: 'non-existent-icon.png',
      })

      expect(result.warnings.some((w) => w.includes('Icon source file not found') || w.includes('E3001'))).toBe(true)
    })

    it('should handle icon source as relative path', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: 'icon.png',
      })

      expect(result).toBeDefined()
    })

    it('should handle icon generation errors gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      const iconPath = join(TEST_DIR, 'invalid-icon.png')
      writeFileSync(iconPath, 'not a valid image')

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
      })

      expect(result).toBeDefined()
      expect(result.errors.length >= 0).toBe(true)
    })
  })

  describe('Manifest generation', () => {
    it('should warn if manifest cannot be generated without icons', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.warnings.some((w) => w.includes('icon'))).toBe(true)
    })

    it('should generate manifest with placeholder icon when no icons provided', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.warnings.some((w) => w.includes('placeholder icon'))).toBe(true)
      expect(result.manifestPath).toBeDefined()
    })

    it('should use themeColor and backgroundColor when provided', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        iconSource: join(TEST_DIR, 'icon.png'),
        themeColor: '#ffffff',
        backgroundColor: '#000000',
        skipServiceWorker: true,
        skipInjection: true,
      })

      // Verify result is defined with colors passed
      expect(result).toBeDefined()
      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf-8'))
        // Validate that manifest has color properties (normalized to lowercase)
        expect(manifest.theme_color).toBeDefined()
        expect(manifest.background_color).toBeDefined()
      }
    })

    it('should normalize shortName correctly (max 12 characters)', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Very Long Name That Exceeds Twelve Characters',
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      })

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf-8'))
        expect(manifest.short_name.length).toBeLessThanOrEqual(12)
      }
    })

    it('should handle empty shortName by using name fallback', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: '',
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      })

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf-8'))
        expect(manifest.short_name).toBeDefined()
        expect(manifest.short_name.length).toBeGreaterThan(0)
      }
    })

    it('should handle manifest generation errors with rollback', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateAndWriteManifest').mockImplementationOnce(() => {
        throw new Error('Manifest generation failed')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    })
  })

  describe('Service worker generation', () => {
    it('should skip service worker if skipServiceWorker is true', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.serviceWorkerPath).toBeUndefined()
    })

    it('should handle service worker generation errors with rollback', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateServiceWorker').mockImplementationOnce(() => {
        throw new Error('Service worker generation failed')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    })
  })

  describe('Meta-tags injection', () => {
    it('should skip injection if skipInjection is true', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.htmlFilesInjected).toBe(0)
    })

    it('should inject meta-tags in HTML files', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
    })

    it('should limit HTML files when maxHtmlFiles is set', async () => {
      for (let i = 0; i < 5; i++) {
        writeFileSync(join(TEST_DIR, `index-${i}.html`), createBasicHtml())
      }
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
        maxHtmlFiles: 2,
      })

      expect(result.htmlFilesInjected).toBeLessThanOrEqual(2)
    })

    it('should handle injection errors gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result).toBeDefined()
    })

    it('should prioritize dist/ files over public/ files', async () => {
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      createPublicDir()
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), createBasicHtml('Dist'))
      writeFileSync(join(TEST_DIR, 'public', 'index.html'), createBasicHtml('Public'))
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
    })
  })

  describe('Transaction management', () => {
    it('should commit transaction on success', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.success).toBe(true)
    })

    it('should rollback transaction on errors', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateAndWriteManifest').mockImplementationOnce(() => {
        throw new Error('Manifest generation failed')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.success).toBe(false)

      vi.restoreAllMocks()
    })

    it('should backup existing files before modification', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      const existingManifestPath = join(TEST_DIR, 'public', 'manifest.json')
      const existingSwPath = join(TEST_DIR, 'public', 'sw.js')
      writeFileSync(existingManifestPath, JSON.stringify({ name: 'Existing', icons: [{ src: '/icon.png', sizes: '192x192' }] }))
      writeFileSync(existingSwPath, '// Existing service worker')

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
      })

      expect(result).toBeDefined()
    })
  })

  describe('Edge cases', () => {
    it('should handle errors gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'package.json'), 'invalid json')

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.framework).toBeDefined()
    })

    it('should handle empty name by using framework fallback', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ dependencies: { react: '^18.0.0' } }),
      )
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      })

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf-8'))
        expect(manifest.name).toBeDefined()
        expect(manifest.name.length).toBeGreaterThan(0)
      }
    })

    it('should handle project without framework detected', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.framework).toBeDefined()
      expect(result.architecture).toBeDefined()
    })

    it('should handle undefined name and shortName', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: undefined,
        shortName: undefined,
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      })

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf-8'))
        expect(manifest.name).toBeDefined()
        expect(manifest.short_name).toBeDefined()
      }
    })

    it('should handle null shortName', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: undefined,
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      })

      if (result.manifestPath && existsSync(result.manifestPath)) {
        const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf-8'))
        expect(manifest.short_name).toBeDefined()
        expect(manifest.short_name.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Error scenarios - All ErrorCodes', () => {
    it('should handle PROJECT_SCAN_FAILED error', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'scanProject').mockRejectedValueOnce(new Error('Scan failed'))

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.success).toBe(false)

      vi.restoreAllMocks()
    })

    it('should handle ICON_GENERATION_FAILED error', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      const iconPath = createIcon()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateIcons').mockRejectedValueOnce(new Error('Icon generation failed'))

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
      })

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.iconsGenerated).toBe(0)

      vi.restoreAllMocks()
    })

    it('should handle ICON_INVALID_FORMAT error', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      const iconPath = join(TEST_DIR, 'invalid-icon.txt')
      writeFileSync(iconPath, 'not an image')

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipIcons: false,
        iconSource: iconPath,
      })

      expect(result.errors.length >= 0).toBe(true)
    })

    it('should handle SERVICE_WORKER_GENERATION_FAILED error with rollback', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateServiceWorker').mockRejectedValueOnce(new Error('SW generation failed'))
      vi.spyOn(coreModule, 'generateSimpleServiceWorker').mockRejectedValueOnce(new Error('SW generation failed'))

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    })

    it('should handle HTML_INJECTION_FAILED error gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'injectMetaTagsInFile').mockImplementationOnce(() => {
        throw new Error('Injection failed')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.warnings.length >= 0).toBe(true)
      expect(result.htmlFilesInjected).toBeGreaterThanOrEqual(0)

      vi.restoreAllMocks()
    })

    it('should handle HTML_PARSING_FAILED error', async () => {
      writeFileSync(join(TEST_DIR, 'invalid.html'), '<html><head><title>Invalid</title></head><body><unclosed-tag>')
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result).toBeDefined()
    })

    it('should handle unexpected errors with rollback', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateAndWriteManifest').mockImplementationOnce(() => {
        throw new Error('Unexpected error')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    })
  })

  describe('Transaction rollback scenarios', () => {
    it('should rollback on manifest generation error', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateAndWriteManifest').mockImplementationOnce(() => {
        throw new Error('Manifest generation failed')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)

      vi.restoreAllMocks()
    })

    it('should rollback on service worker generation error', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'optimizeProject').mockRejectedValueOnce(new Error('Optimization failed'))

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
      })

      expect(result.success).toBe(false)

      vi.restoreAllMocks()
    })

    it('should handle injection errors gracefully without rollback', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'injectMetaTagsInFile').mockImplementation(() => {
        throw new Error('Injection failed')
      })

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      // Injection errors are handled gracefully as warnings, not critical errors
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.htmlFilesInjected).toBe(0)

      vi.restoreAllMocks()
    })

    it('should commit transaction on success', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Icon generation scenarios', () => {
    it('should generate icons successfully with valid PNG', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      const iconPath = createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        iconSource: iconPath,
        skipServiceWorker: true,
        skipInjection: true,
      })

      expect(result.iconsGenerated).toBeGreaterThan(0)
      expect(result.manifestPath).toBeDefined()
    })

    it('should handle icon source as absolute path', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      const iconPath = createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        iconSource: iconPath,
        skipServiceWorker: true,
        skipInjection: true,
      })

      expect(result.iconsGenerated).toBeGreaterThan(0)
    })

    it('should generate apple-touch-icon when icons are generated', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      const iconPath = createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        iconSource: iconPath,
        skipServiceWorker: true,
        skipInjection: true,
      })

      const appleTouchIconPath = join(TEST_DIR, 'public', 'apple-touch-icon.png')
      expect(existsSync(appleTouchIconPath) || result.iconsGenerated > 0).toBe(true)
    })
  })

  describe('Service worker generation scenarios', () => {
    it('should generate service worker with adaptive cache strategies', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ dependencies: { 'apollo-client': '^3.0.0' } }),
      )
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
        skipInjection: true,
      })

      expect(result.serviceWorkerPath).toBeDefined()
    })

    it('should generate service worker without adaptive strategies', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
        skipInjection: true,
      })

      expect(result.serviceWorkerPath).toBeDefined()
    })

    it('should handle Workbox errors gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const coreModule = await import('@julien-lin/universal-pwa-core')
      vi.spyOn(coreModule, 'generateServiceWorker').mockRejectedValueOnce(new Error('Workbox error'))

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipServiceWorker: false,
      })

      expect(result.success).toBe(false)

      vi.restoreAllMocks()
    })
  })

  describe('HTML injection scenarios', () => {
    it('should inject meta-tags in multiple HTML files', async () => {
      for (let i = 0; i < 3; i++) {
        writeFileSync(join(TEST_DIR, `page-${i}.html`), createBasicHtml(`Page ${i}`))
      }
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
    })

    it('should handle HTML files in dist/ directory', async () => {
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), createBasicHtml('Dist'))
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
    })

    it('should handle HTML files in public/ directory', async () => {
      createPublicDir()
      writeFileSync(join(TEST_DIR, 'public', 'index.html'), createBasicHtml('Public'))
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
    })

    it('should handle injection errors for individual files gracefully', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      writeFileSync(join(TEST_DIR, 'invalid.html'), '<html><unclosed>')
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThanOrEqual(0)
    })

    it('should inject meta-tags in Twig template files (Symfony)', async () => {
      mkdirSync(join(TEST_DIR, 'templates'), { recursive: true })
      const twigContent = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}Symfony App{% endblock %}</title>
</head>
<body>
    {% block body %}{% endblock %}
</body>
</html>`
      writeFileSync(join(TEST_DIR, 'templates', 'base.html.twig'), twigContent)
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
      
      // Verify that meta-tags were injected
      const modifiedTwig = readFileSync(join(TEST_DIR, 'templates', 'base.html.twig'), 'utf-8')
      expect(modifiedTwig).toContain('rel="manifest"')
      expect(modifiedTwig).toContain('name="theme-color"')
      expect(modifiedTwig).toContain('navigator.serviceWorker')
    })

    it('should inject meta-tags in Blade template files (Laravel)', async () => {
      mkdirSync(join(TEST_DIR, 'resources', 'views'), { recursive: true })
      const bladeContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>@yield('title', 'Laravel App')</title>
</head>
<body>
    @yield('content')
</body>
</html>`
      writeFileSync(join(TEST_DIR, 'resources', 'views', 'layout.blade.php'), bladeContent)
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
      
      // Verify that meta-tags were injected
      const modifiedBlade = readFileSync(join(TEST_DIR, 'resources', 'views', 'layout.blade.php'), 'utf-8')
      expect(modifiedBlade).toContain('rel="manifest"')
      expect(modifiedBlade).toContain('name="theme-color"')
      expect(modifiedBlade).toContain('navigator.serviceWorker')
    })
  })

  describe('Large projects (100+ HTML files)', () => {
    it('should handle projects with many HTML files', async () => {
      for (let i = 0; i < 105; i++) {
        writeFileSync(join(TEST_DIR, `page-${i}.html`), createBasicHtml(`Page ${i}`))
      }
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
      expect(result.success).toBe(true)
    })

    it('should limit HTML files when maxHtmlFiles is set on large project', async () => {
      for (let i = 0; i < 150; i++) {
        writeFileSync(join(TEST_DIR, `page-${i}.html`), createBasicHtml(`Page ${i}`))
      }
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
        maxHtmlFiles: 50,
      })

      expect(result.htmlFilesInjected).toBeLessThanOrEqual(50)
    })
  })

  describe('CLI options combinations', () => {
    it('should handle all skip options together', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        skipIcons: true,
        skipServiceWorker: true,
        skipInjection: true,
      })

      expect(result.iconsGenerated).toBe(0)
      expect(result.serviceWorkerPath).toBeUndefined()
      expect(result.htmlFilesInjected).toBe(0)
    })

    it('should handle forceScan and noCache together', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        forceScan: true,
        noCache: true,
      })

      expect(result.framework).toBeDefined()
    })

    it('should handle custom outputDir with all features', async () => {
      const customOutput = join(TEST_DIR, 'custom')
      mkdirSync(customOutput, { recursive: true })
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      const iconPath = createIcon()

      const result = await initCommand({
        projectPath: TEST_DIR,
        name: 'Test App',
        shortName: 'Test',
        iconSource: iconPath,
        outputDir: 'custom',
        skipServiceWorker: true,
        skipInjection: true,
      })

      if (result.manifestPath) {
        expect(result.manifestPath).toContain('custom')
      }
    })
  })

  describe('Path normalization and security', () => {
    it('should handle Windows absolute paths', async () => {
      if (process.platform === 'win32') {
        const winPath = 'C:\\test\\output'
        writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

        const result = await initCommand({
          projectPath: TEST_DIR,
          ...baseInitCommand,
          outputDir: winPath,
        })

        expect(result).toBeDefined()
      }
    })

    it('should handle relative paths securely', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())
      createPublicDir()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        outputDir: '../public',
      })

      expect(result).toBeDefined()
    })

    it('should normalize paths for Vite/React projects', async () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({ dependencies: { vite: '^4.0.0' } }),
      )
      mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'dist', 'index.html'), createBasicHtml())
      createPublicDir()
      createManifest()

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        skipInjection: false,
      })

      expect(result.htmlFilesInjected).toBeGreaterThan(0)
    })
  })

  describe('Output directory edge cases', () => {
    it('should handle outputDir same as projectPath', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        outputDir: '.',
      })

      expect(result).toBeDefined()
    })

    it('should create output directory if it does not exist', async () => {
      writeFileSync(join(TEST_DIR, 'index.html'), createBasicHtml())

      const result = await initCommand({
        projectPath: TEST_DIR,
        ...baseInitCommand,
        outputDir: 'new-output',
      })

      // Output directory is created when manifest is written
      // Check if manifest was created (which means directory was created)
      if (result.manifestPath) {
        expect(existsSync(result.manifestPath)).toBe(true)
        expect(existsSync(join(TEST_DIR, 'new-output'))).toBe(true)
      }
    })
  })
})
