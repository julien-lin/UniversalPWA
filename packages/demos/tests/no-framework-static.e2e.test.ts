import { test, expect } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

test.describe('E2E - Site Statique (No Framework)', () => {
  const BASE_URL = 'http://localhost:3002'
  const hasFixture = existsSync(join(process.cwd(), 'fixtures/no-framework/dist'))

  test.skip(!hasFixture, 'Fixture no-framework/dist absente')

  test.beforeEach(async ({ page }) => {
    // Charger via HTTP pour permettre service workers et manifest
    await page.goto(BASE_URL)
  })

  test('should load the static site', async ({ page }) => {
    // Vérifier que le site se charge
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText(/Balles rebondissantes/i)
    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/Balles rebondissante/i)
    // Vérifier la présence du canvas
    await expect(page.locator('canvas')).toBeVisible()
  })

  test('should have PWA manifest link', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })

  test('should have theme-color meta tag', async ({ page }) => {
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', '#ffffff')
  })

  test('should have apple-touch-icon link', async ({ page }) => {
    const appleIcon = page.locator('link[rel="apple-touch-icon"]')
    await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png')
  })

  test('should have mobile-web-app-capable meta tag', async ({ page }) => {
    const mobileWebApp = page.locator('meta[name="mobile-web-app-capable"]')
    await expect(mobileWebApp).toHaveAttribute('content', 'yes')
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
    // Vérifier que le manifest est référencé (les liens dans head sont toujours "hidden")
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    
    // Vérifier que le manifest est accessible et valide
    const manifestResponse = await request.get(`${BASE_URL}/manifest.json`)
    expect(manifestResponse.ok()).toBe(true)
    
    const manifest = await manifestResponse.json()
    expect(manifest).toHaveProperty('name')
    expect(manifest).toHaveProperty('short_name')
    expect(manifest.name).toBe('balles rebondissantes')
    expect(manifest.short_name).toBe('BR')
    expect(manifest).toHaveProperty('icons')
    expect(manifest.icons.length).toBeGreaterThan(0)
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true)
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true)
    expect(manifest.theme_color).toBe('#ffffff')
    expect(manifest.background_color).toBe('#ffffff')
    expect(manifest.display).toBe('standalone')
  })

  test('should have all required PWA icons', async ({ page, request }) => {
    // Vérifier apple-touch-icon (les liens dans head sont toujours "hidden")
    const appleIcon = page.locator('link[rel="apple-touch-icon"]')
    await expect(appleIcon).toHaveAttribute('href', '/apple-touch-icon.png')
    
    // Vérifier que les icônes critiques sont accessibles
    const icon192 = await request.get(`${BASE_URL}/icon-192x192.png`)
    expect(icon192.ok()).toBe(true)
    expect(icon192.headers()['content-type']).toContain('image')
    
    const icon512 = await request.get(`${BASE_URL}/icon-512x512.png`)
    expect(icon512.ok()).toBe(true)
    expect(icon512.headers()['content-type']).toContain('image')
    
    const appleTouchIcon = await request.get(`${BASE_URL}/apple-touch-icon.png`)
    expect(appleTouchIcon.ok()).toBe(true)
    expect(appleTouchIcon.headers()['content-type']).toContain('image')
  })
  
  test('should have service worker file accessible', async ({ request }) => {
    const swResponse = await request.get(`${BASE_URL}/sw.js`)
    expect(swResponse.ok()).toBe(true)
    expect(swResponse.headers()['content-type']).toContain('javascript')
    
    const swContent = await swResponse.text()
    expect(swContent).toContain('workbox')
    expect(swContent).toContain('precacheAndRoute')
  })

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0')
  })

  test('should have canvas element for rendering', async ({ page }) => {
    // Vérifier que le canvas est présent (spécifique à cette app)
    const canvas = page.locator('canvas')
    await expect(canvas).toBeVisible()
    
    // Vérifier que le canvas a une taille (même si 0x0 par défaut, il doit être dans le DOM)
    const canvasBox = await canvas.boundingBox()
    expect(canvasBox).not.toBeNull()
  })

  test('should have interactive buttons', async ({ page }) => {
    // Vérifier la présence des boutons de contrôle
    const buttons = page.locator('button[data-shape]')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
    
    // Vérifier au moins un bouton spécifique
    const ballButton = page.locator('button[data-shape="ball"]')
    await expect(ballButton).toBeVisible()
    await expect(ballButton).toContainText(/Balle/i)
  })
})

