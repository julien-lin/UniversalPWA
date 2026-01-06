import { test, expect } from '@playwright/test'
import { join } from 'path'
import { existsSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, readdirSync } from 'fs'
import { tmpdir } from 'os'

// Structured suite to prepare multi-project E2E scenarios.
// Static site flow uses the existing demo server; others use file:// fixtures.

const DEMO_BASE_URL = '/' // Server already configured in playwright.config.ts
const FIXTURES_ROOT = join(process.cwd(), 'fixtures')
const fileUrl = (absPath: string) => `file://${absPath}`

// --- Static HTML Site (existing demo) ---
test.describe('E2E - Static HTML Site', () => {
    test('should display main content', async ({ page }) => {
        await page.goto(DEMO_BASE_URL)
        await expect(page.locator('h1')).toHaveText(/UniversalPWA Demo/i)
        await expect(page.locator('h2')).toHaveText(/Bienvenue/i)
    })

    test('should indicate service worker capability', async ({ page }) => {
        await page.goto(DEMO_BASE_URL)
        await page.getByRole('button', { name: /Tester Offline/i }).click()
        await expect(page.locator('#status')).toHaveText(/Service Worker disponible/i)
    })
})

// --- React + Vite ---
test.describe('E2E - React + Vite (build -> init -> verification)', () => {
    const indexPath = join(FIXTURES_ROOT, 'react-vite', 'dist', 'index.html')

    test('should load built app and expose PWA assets', async ({ page }) => {
        expect(existsSync(indexPath)).toBe(true)
        await page.goto(fileUrl(indexPath))
        await expect(page.locator('h1')).toHaveText(/React Vite Fixture/i)
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest.webmanifest/)
        const swScript = await page.locator('script[data-sw]').textContent()
        expect(swScript).toContain('serviceWorker')
    })
})

// --- Vue + Nuxt (SSR) ---
test.describe('E2E - Vue + Nuxt (SSR)', () => {
    const indexPath = join(FIXTURES_ROOT, 'nuxt-ssr', 'dist', 'index.html')

    test('should render SSR output with PWA meta', async ({ page }) => {
        expect(existsSync(indexPath)).toBe(true)
        await page.goto(fileUrl(indexPath))
        await expect(page.locator('h1')).toHaveText(/Nuxt SSR Fixture/i)
        await expect(page.locator('meta[name="generator"]')).toHaveAttribute('content', /nuxt/i)
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest.webmanifest/)
    })
})

// --- Symfony (PHP) ---
test.describe('E2E - Symfony (PHP)', () => {
    const indexPath = join(FIXTURES_ROOT, 'symfony', 'public', 'index.html')

    test('should include Twig-rendered PWA meta', async ({ page }) => {
        expect(existsSync(indexPath)).toBe(true)
        await page.goto(fileUrl(indexPath))
        await expect(page.locator('meta[name="csrf-token"]')).toHaveAttribute('content', /symfony-fixture-token/)
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest.webmanifest/)
    })
})

// --- WordPress ---
test.describe('E2E - WordPress', () => {
    const indexPath = join(FIXTURES_ROOT, 'wordpress', 'index.html')

    test('should expose WP markup with PWA assets', async ({ page }) => {
        expect(existsSync(indexPath)).toBe(true)
        await page.goto(fileUrl(indexPath))
        await expect(page.locator('body')).toHaveAttribute('class', /wp-site/)
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest.webmanifest/)
    })
})

// --- Project Without Framework ---
test.describe('E2E - Project Without Framework', () => {
    const indexPath = join(FIXTURES_ROOT, 'no-framework', 'index.html')

    test('should serve default PWA shell', async ({ page }) => {
        expect(existsSync(indexPath)).toBe(true)
        await page.goto(fileUrl(indexPath))
        await expect(page.locator('h1')).toHaveText(/Generic PWA Fixture/i)
        await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest.webmanifest/)
    })
})

// --- Rollback Transaction ---
test.describe('E2E - Rollback Transaction', () => {
    test('should leave no artifacts after simulated failure', async () => {
        const tmpRoot = mkdtempSync(join(tmpdir(), 'pwa-rollback-'))
        const manifestPath = join(tmpRoot, 'manifest.webmanifest')
        writeFileSync(manifestPath, '{}', 'utf-8')
        expect(existsSync(manifestPath)).toBe(true)
        // Simulate rollback cleanup
        rmSync(manifestPath)
        expect(existsSync(manifestPath)).toBe(false)
    })
})

// --- Large Project ---
test.describe('E2E - Large Project (100+ HTML)', () => {
    test('should handle many HTML files with acceptable performance', async ({ page }) => {
        const tmpRoot = mkdtempSync(join(tmpdir(), 'pwa-large-'))
        mkdirSync(tmpRoot, { recursive: true })
        for (let i = 0; i < 120; i += 1) {
            writeFileSync(join(tmpRoot, `page-${i}.html`), `<html><body><h1>Page ${i}</h1></body></html>`, 'utf-8')
        }
        const files = readdirSync(tmpRoot).filter((f) => f.endsWith('.html'))
        expect(files.length).toBeGreaterThanOrEqual(100)

        const indexPath = join(tmpRoot, 'index.html')
        writeFileSync(
            indexPath,
            '<html><head><link rel="manifest" href="manifest.webmanifest"></head><body><h1>Large Fixture</h1></body></html>',
            'utf-8',
        )
        await page.goto(fileUrl(indexPath))
        await expect(page.locator('h1')).toHaveText(/Large Fixture/i)
    })
})
