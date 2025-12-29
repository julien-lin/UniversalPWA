import { beforeEach, describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { Manifest } from '../generator/manifest-generator.js'
import { validatePWA, type PWAValidatorOptions, type ValidationResult } from './pwa-validator.js'

const TEST_DIR = join(process.cwd(), '.test-tmp-pwa-validator')
const PUBLIC_DIR = join(TEST_DIR, 'public')
const HTML_PATH = join(TEST_DIR, 'index.html')
const EMPTY_HTML = '<html><head><title>Test</title></head><body></body></html>'
const PWA_HTML =
  '<html><head><link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#ffffff"><meta name="apple-mobile-web-app-capable" content="yes"></head><body><script>navigator.serviceWorker.register("/sw.js");</script></body></html>'

const DEFAULT_ICONS: Manifest['icons'] = [
  { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
  { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
]

const DEFAULT_MANIFEST: Manifest = {
  name: 'Test App',
  short_name: 'Test',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  theme_color: '#ffffff',
  background_color: '#000000',
  icons: DEFAULT_ICONS,
}

const MINIMAL_MANIFEST: Manifest = {
  name: 'Test App',
  short_name: 'Test',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  icons: DEFAULT_ICONS,
}

const baseConfig = (overrides: Partial<PWAValidatorOptions> = {}): PWAValidatorOptions => ({
  projectPath: TEST_DIR,
  outputDir: 'public',
  htmlFiles: [],
  ...overrides,
})

const ensurePublicDir = () => mkdirSync(PUBLIC_DIR, { recursive: true })

function createManifest(data: Partial<Manifest> = {}, base: Manifest = DEFAULT_MANIFEST): Manifest {
  ensurePublicDir()
  const manifest: Manifest = { ...base, ...data, icons: data.icons ?? base.icons }
  writeFileSync(join(PUBLIC_DIR, 'manifest.json'), JSON.stringify(manifest))
  return manifest
}

const createValidManifest = () => createManifest({}, DEFAULT_MANIFEST)
const createMinimalManifest = () => createManifest({}, MINIMAL_MANIFEST)

const createIcons = (sizes: number[] = [192, 512]) => {
  ensurePublicDir()
  sizes.forEach((size) => writeFileSync(join(PUBLIC_DIR, `icon-${size}x${size}.png`), 'dummy'))
}

const createServiceWorker = (
  content = 'importScripts("workbox-sw.js"); workbox.precaching.precacheAndRoute([]);',
) => {
  ensurePublicDir()
  const path = join(PUBLIC_DIR, 'sw.js')
  writeFileSync(path, content)
  return path
}

const createHtml = (content = EMPTY_HTML, path = HTML_PATH) => {
  writeFileSync(path, content)
  return path
}

const createHtmlWithPWA = (path = HTML_PATH) => createHtml(PWA_HTML, path)
const createHtmlFiles = (count: number, content = EMPTY_HTML) =>
  Array.from({ length: count }, (_, i) => createHtml(content, join(TEST_DIR, `index-${i}.html`)))

type ScoreExpectation = { gt?: number; gte?: number; lt?: number; lte?: number }
type ValidationExpectations = {
  errors?: string[]
  warnings?: string[]
  manifest?: Partial<ValidationResult['details']['manifest']>
  icons?: Partial<ValidationResult['details']['icons']>
  serviceWorker?: Partial<ValidationResult['details']['serviceWorker']>
  metaTags?: Partial<ValidationResult['details']['metaTags']>
  https?: Partial<ValidationResult['details']['https']>
  isValid?: boolean
  score?: ScoreExpectation
}

async function expectValidation(
  config: Partial<PWAValidatorOptions>,
  expectations: ValidationExpectations = {},
): Promise<ValidationResult> {
  const result = await validatePWA(baseConfig(config))

  const detailChecks = [
    expectations.manifest && [expectations.manifest, result.details.manifest],
    expectations.icons && [expectations.icons, result.details.icons],
    expectations.serviceWorker && [expectations.serviceWorker, result.details.serviceWorker],
    expectations.metaTags && [expectations.metaTags, result.details.metaTags],
    expectations.https && [expectations.https, result.details.https],
  ].filter(Boolean) as Array<[Record<string, unknown>, Record<string, unknown>]>

  detailChecks.forEach(([expected, actual]) => {
    Object.entries(expected).forEach(([key, value]) => expect(actual[key]).toBe(value))
  })

  const matchCodes = (codes: string[] | undefined, collection: { code: string }[]) =>
    codes?.forEach((code) => expect(collection.some((item) => item.code === code)).toBe(true))

  matchCodes(expectations.errors, result.errors)
  matchCodes(expectations.warnings, result.warnings)

  if (expectations.isValid !== undefined) {
    expect(result.isValid).toBe(expectations.isValid)
  }

  if (expectations.score) {
    const { gt, gte, lt, lte } = expectations.score
    if (gt !== undefined) expect(result.score).toBeGreaterThan(gt)
    if (gte !== undefined) expect(result.score).toBeGreaterThanOrEqual(gte)
    if (lt !== undefined) expect(result.score).toBeLessThan(lt)
    if (lte !== undefined) expect(result.score).toBeLessThanOrEqual(lte)
  }

  return result
}

describe('pwa-validator', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  describe('validatePWA - Manifest validation', () => {
    it('detects missing manifest.json', async () => {
      await expectValidation({}, {
        manifest: { exists: false, valid: false },
        errors: ['MANIFEST_MISSING'],
        score: { lt: 100 },
      })
    })

    it('accepts valid manifest.json', async () => {
      createValidManifest()
      const result = await expectValidation({}, { manifest: { exists: true, valid: true } })
      expect(result.errors.filter((e) => e.code.startsWith('MANIFEST_')).length).toBe(0)
    })

    it.each([
      { title: 'missing name field', data: { name: '' }, code: 'MANIFEST_NAME_MISSING' },
      { title: 'missing short_name field', data: { short_name: '' }, code: 'MANIFEST_SHORT_NAME_MISSING' },
      {
        title: 'short_name too long',
        data: { short_name: 'This is way too long for a short name' },
        code: 'MANIFEST_SHORT_NAME_TOO_LONG',
      },
      { title: 'missing icons array', data: { icons: [] }, code: 'MANIFEST_ICONS_MISSING' },
    ])('detects $title', async ({ data, code }) => {
      createManifest(data, MINIMAL_MANIFEST)
      await expectValidation({}, { errors: [code] })
    })

    it('warns about missing theme_color', async () => {
      createManifest({ background_color: '#000000' }, MINIMAL_MANIFEST)
      await expectValidation({}, { warnings: ['MANIFEST_THEME_COLOR_MISSING'] })
    })

    it('warns about missing background_color', async () => {
      createManifest({ theme_color: '#ffffff' }, MINIMAL_MANIFEST)
      await expectValidation({}, { warnings: ['MANIFEST_BACKGROUND_COLOR_MISSING'] })
    })

    it('detects invalid JSON in manifest.json', async () => {
      ensurePublicDir()
      writeFileSync(join(PUBLIC_DIR, 'manifest.json'), '{ invalid json }')
      await expectValidation({}, { errors: ['MANIFEST_INVALID_JSON'] })
    })
  })

  describe('validatePWA - Icons validation', () => {
    it('detects missing 192x192 icon', async () => {
      createManifest({ icons: [{ src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }] }, MINIMAL_MANIFEST)
      createIcons([512])
      await expectValidation({}, { icons: { has192x192: false }, errors: ['ICON_192X192_MISSING'] })
    })

    it('detects missing 512x512 icon', async () => {
      createManifest({ icons: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }] }, MINIMAL_MANIFEST)
      createIcons([192])
      await expectValidation({}, { icons: { has512x512: false }, errors: ['ICON_512X512_MISSING'] })
    })

    it('validates icons when both 192x192 and 512x512 are present', async () => {
      createValidManifest()
      createIcons()
      await expectValidation({}, { icons: { has192x192: true, has512x512: true, valid: true } })
    })

    it('detects missing icon file', async () => {
      createValidManifest()
      createIcons([192])
      await expectValidation({}, { errors: ['ICON_FILE_MISSING'] })
    })

    it('handles icons with sizes array', async () => {
      createManifest(
        {
          icons: [
            { src: '/icon-192x192.png', sizes: '192x192 384x384', type: 'image/png' },
            { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
        MINIMAL_MANIFEST,
      )
      createIcons()
      await expectValidation({}, { icons: { has192x192: true, has512x512: true } })
    })
  })

  describe('validatePWA - Service worker validation', () => {
    it('detects missing service worker', async () => {
      await expectValidation({}, { serviceWorker: { exists: false }, errors: ['SERVICE_WORKER_MISSING'] })
    })

    it('validates service worker with Workbox', async () => {
      createServiceWorker(
        "importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');\nworkbox.precaching.precacheAndRoute(self.__WB_MANIFEST);",
      )
      const result = await expectValidation({}, { serviceWorker: { exists: true, valid: true } })
      expect(result.errors.filter((e) => e.code.startsWith('SERVICE_WORKER_')).length).toBe(0)
    })

    it('warns about service worker without Workbox', async () => {
      createServiceWorker('console.log("custom sw");')
      await expectValidation({}, { serviceWorker: { exists: true }, warnings: ['SERVICE_WORKER_INVALID'] })
    })

    it('warns about service worker without precache', async () => {
      createServiceWorker('importScripts("workbox-sw.js");')
      await expectValidation({}, { warnings: ['SERVICE_WORKER_NO_PRECACHE'] })
    })
  })

  describe('validatePWA - Meta tags validation', () => {
    it('detects missing manifest link in HTML', async () => {
      const htmlFiles = [createHtml()]
      await expectValidation({ htmlFiles }, { errors: ['META_MANIFEST_MISSING'] })
    })

    it('validates HTML with manifest link', async () => {
      createMinimalManifest()
      const htmlFiles = [createHtml('<html><head><link rel="manifest" href="/manifest.json"></head><body></body></html>')]
      const result = await expectValidation({ htmlFiles }, { manifest: { exists: true } })
      expect(result.errors.filter((e) => e.code === 'META_MANIFEST_MISSING').length).toBe(0)
    })

    it('warns about missing theme-color meta tag', async () => {
      const htmlFiles = [createHtml()]
      await expectValidation({ htmlFiles }, { warnings: ['META_THEME_COLOR_MISSING'] })
    })

    it('validates HTML with theme-color meta tag', async () => {
      const htmlFiles = [createHtml('<html><head><meta name="theme-color" content="#ffffff"></head><body></body></html>')]
      const result = await expectValidation({ htmlFiles }, {})
      expect(result.warnings.some((w) => w.code === 'META_THEME_COLOR_MISSING')).toBe(false)
    })

    it('warns about missing apple-mobile-web-app-capable', async () => {
      const htmlFiles = [createHtml()]
      await expectValidation({ htmlFiles }, { warnings: ['META_APPLE_MOBILE_MISSING'] })
    })

    it('validates HTML with apple-mobile-web-app-capable', async () => {
      const htmlFiles = [createHtml('<html><head><meta name="apple-mobile-web-app-capable" content="yes"></head><body></body></html>')]
      const result = await expectValidation({ htmlFiles }, {})
      expect(result.warnings.some((w) => w.code === 'META_APPLE_MOBILE_MISSING')).toBe(false)
    })

    it('warns about missing service worker registration', async () => {
      createServiceWorker('console.log("sw");')
      const htmlFiles = [createHtml()]
      await expectValidation({ htmlFiles }, { warnings: ['META_SERVICE_WORKER_REGISTRATION_MISSING'] })
    })

    it('validates HTML with service worker registration', async () => {
      createServiceWorker('console.log("sw");')
      const htmlFiles = [createHtml('<html><head><title>Test</title></head><body><script>navigator.serviceWorker.register("/sw.js");</script></body></html>')]
      const result = await expectValidation({ htmlFiles }, {})
      expect(result.warnings.filter((w) => w.code === 'META_SERVICE_WORKER_REGISTRATION_MISSING').length).toBe(0)
    })

    it('handles missing HTML files gracefully', async () => {
      await expectValidation({ htmlFiles: [] }, { warnings: ['HTML_FILES_MISSING'] })
    })

    it('validates all HTML files by default', async () => {
      const htmlFiles = createHtmlFiles(15)
      const result = await expectValidation({ htmlFiles }, {})
      const metaErrors = result.errors.filter((e) => e.code.startsWith('META_'))
      expect(metaErrors.length).toBeGreaterThanOrEqual(15 * 3)
    })

    it('limits HTML validation when maxHtmlFiles is set', async () => {
      const htmlFiles = createHtmlFiles(15)
      const result = await expectValidation({ htmlFiles, maxHtmlFiles: 5 }, {})
      const metaErrors = result.errors.filter((e) => e.code.startsWith('META_'))
      expect(metaErrors.length).toBeLessThanOrEqual(5 * 3)
    })
  })

  describe('validatePWA - HTTPS validation', () => {
    it('warns about HTTPS not verified', async () => {
      await expectValidation({}, { https: { isSecure: false }, warnings: ['HTTPS_NOT_VERIFIED'] })
    })
  })

  describe('validatePWA - Score calculation', () => {
    it('returns score 0 for completely invalid PWA', async () => {
      await expectValidation({}, { score: { gte: 0, lt: 50 } })
    })

    it('returns high score for valid PWA', async () => {
      createValidManifest()
      createIcons()
      createServiceWorker()
      const htmlFiles = [createHtmlWithPWA()]
      const result = await expectValidation({ htmlFiles }, { score: { gt: 70 }, isValid: true })
      expect(result.isValid).toBe(true)
    })

    it('penalizes missing manifest', async () => {
      await expectValidation({}, { manifest: { exists: false }, score: { lt: 80 } })
    })

    it('penalizes missing icons', async () => {
      createManifest({ icons: [] }, MINIMAL_MANIFEST)
      await expectValidation({}, { icons: { exists: false }, score: { lt: 80 } })
    })

    it('penalizes missing service worker', async () => {
      createMinimalManifest()
      await expectValidation({}, { serviceWorker: { exists: false }, score: { lt: 80 } })
    })
  })

  describe('validatePWA - Suggestions', () => {
    it('suggests generating manifest when missing', async () => {
      const result = await expectValidation({}, {})
      expect(result.suggestions.some((s) => s.includes('manifest.json'))).toBe(true)
    })

    it('suggests generating icons when missing', async () => {
      createManifest({ icons: [] }, MINIMAL_MANIFEST)
      const result = await expectValidation({}, {})
      expect(result.suggestions.some((s) => s.includes('icon'))).toBe(true)
    })

    it('suggests generating service worker when missing', async () => {
      createMinimalManifest()
      const result = await expectValidation({}, {})
      expect(result.suggestions.some((s) => s.includes('service worker'))).toBe(true)
    })
  })

  describe('validatePWA - Strict mode', () => {
    it('treats warnings as errors in strict mode', async () => {
      createManifest({}, MINIMAL_MANIFEST)
      const result = await expectValidation({ strict: true }, { isValid: false })
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('validatePWA - Complete validation', () => {
    it('validates complete PWA setup', async () => {
      createValidManifest()
      createIcons()
      createServiceWorker()
      const htmlFiles = [createHtmlWithPWA()]

      const result = await expectValidation({ htmlFiles }, {
        isValid: true,
        manifest: { valid: true },
        icons: { valid: true, has192x192: true, has512x512: true },
        serviceWorker: { valid: true },
        metaTags: { valid: true },
        score: { gt: 80 },
      })

      expect(result.isValid).toBe(true)
    })
  })
})

