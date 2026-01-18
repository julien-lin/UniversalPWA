import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

test.describe('E2E - Laravel (PHP)', () => {
  const BASE_URL = 'http://localhost:3004'
  const hasFixture = existsSync(join(process.cwd(), 'fixtures/laravel/public'))

  test.skip(!hasFixture, 'Fixture laravel/public absente')

  test.beforeEach(async ({ page }) => {
    // Charger via HTTP pour permettre service workers et manifest
    await page.goto(BASE_URL)
  })

  test('should load the Laravel app', async ({ page }) => {
    // Vérifier que l'app Laravel se charge
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/Let's get started/i)
    await expect(page).toHaveTitle(/Laravel/i)
  })

  test('should have PWA manifest link', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })

  test('should have theme-color meta tag', async ({ page }) => {
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', '#ef4444')
  })

  test('should have apple-touch-icon link', async ({ page }) => {
    const appleIcon = page.locator('link[rel="apple-touch-icon"]')
    await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png')
  })

  test('should have mobile-web-app-capable meta tag', async ({ page }) => {
    const mobileWebApp = page.locator('meta[name="mobile-web-app-capable"]')
    await expect(mobileWebApp).toHaveAttribute('content', 'yes')
  })

  test('should have CSRF token meta tag (Laravel specific)', async ({ page }) => {
    const csrfToken = page.locator('meta[name="csrf-token"]')
    await expect(csrfToken).toHaveAttribute('content', 'laravel-fixture-token')
  })

  test('should have service worker registration script', async ({ page }) => {
    // Vérifier que le script de registration SW est présent dans le HTML
    const htmlContent = await page.content()
    expect(htmlContent).toContain('navigator.serviceWorker.register')
    expect(htmlContent).toContain('/sw.js')
    expect(htmlContent).toContain('serviceWorker')
  })

  test('should have PWA install handler functions', async ({ page }) => {
    // Vérifier que les fonctions globales PWA sont présentes dans le HTML
    const htmlContent = await page.content()
    expect(htmlContent).toContain('window.installPWA')
    expect(htmlContent).toContain('window.isPWAInstalled')
    expect(htmlContent).toContain('window.isPWAInstallable')
    expect(htmlContent).toContain('beforeinstallprompt')
  })

  test('should have manifest.json with correct structure', async ({ page, request }) => {
    // Vérifier que le manifest est référencé
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    
    // Vérifier que le manifest est accessible et valide
    const manifestResponse = await request.get(`${BASE_URL}/manifest.json`)
    expect(manifestResponse.ok()).toBe(true)
    
    const manifest = await manifestResponse.json()
    expect(manifest).toHaveProperty('name')
    expect(manifest).toHaveProperty('short_name')
    expect(manifest.name).toBe('Laravel Test App')
    expect(manifest.short_name).toBe('LTA')
    expect(manifest).toHaveProperty('icons')
    expect(manifest.icons.length).toBeGreaterThan(0)
    expect(manifest).toHaveProperty('display')
    expect(manifest.display).toBe('standalone')
  })

  test('should have all required PWA icons', async ({ page, request }) => {
    // Vérifier apple-touch-icon link (peut ne pas exister si --skip-icons)
    const appleIcon = page.locator('link[rel="apple-touch-icon"]')
    const appleIconExists = await appleIcon.count() > 0
    if (appleIconExists) {
      await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png')
      
      const appleTouchIcon = await request.get(`${BASE_URL}/apple-touch-icon.png`)
      expect(appleTouchIcon.ok()).toBe(true)
      expect(appleTouchIcon.headers()['content-type']).toContain('image')
    }
    
    // Vérifier que le manifest référence au moins une icône
    const manifestResponse = await request.get(`${BASE_URL}/manifest.json`)
    const manifest = await manifestResponse.json()
    expect(manifest.icons.length).toBeGreaterThan(0)
  })
  
  test('should have service worker file accessible', async ({ request }) => {
    const swResponse = await request.get(`${BASE_URL}/sw.js`)
    expect(swResponse.ok()).toBe(true)
    expect(swResponse.headers()['content-type']).toContain('javascript')
    
    const swContent = await swResponse.text()
    expect(swContent).toContain('workbox')
    expect(swContent).toContain('precacheAndRoute')
    
    // Vérifier que le service worker contient des routes Laravel optimisées
    expect(swContent).toMatch(/laravel-api-cache|\/api\/.*/)
  })

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0')
  })
})
