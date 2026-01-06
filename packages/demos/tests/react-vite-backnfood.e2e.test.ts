import { test, expect } from '@playwright/test'

test.describe('E2E - React + Vite (Back\'n Food)', () => {
  const BASE_URL = 'http://localhost:3001'

  test.beforeEach(async ({ page }) => {
    // Charger via HTTP pour permettre service workers et manifest
    await page.goto(BASE_URL)
  })

  test('should load the React app', async ({ page }) => {
    // Vérifier que l'app React se charge
    await expect(page.locator('#root')).toBeVisible()
    // Vérifier le titre de la page
    await expect(page).toHaveTitle(/Back'n Food/i)
  })

  test('should have PWA manifest link', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
  })

  test('should have theme-color meta tag', async ({ page }) => {
    const themeColor = page.locator('meta[name="theme-color"]')
    await expect(themeColor).toHaveAttribute('content', '#61dafb')
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
    expect(manifest).toHaveProperty('icons')
    expect(manifest.icons.length).toBeGreaterThan(0)
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '192x192')).toBe(true)
    expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true)
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

  test('should have Open Graph meta tags', async ({ page }) => {
    // Vérifier les meta tags Open Graph (utiliser .first() car il peut y avoir plusieurs éléments)
    const ogTitle = page.locator('meta[property="og:title"]').first()
    if (await ogTitle.count() > 0) {
      await expect(ogTitle).toHaveAttribute('content', /Back'n Food/i)
    }
    
    const ogType = page.locator('meta[property="og:type"]').first()
    if (await ogType.count() > 0) {
      await expect(ogType).toHaveAttribute('content', 'website')
    }
  })

  test('should have Twitter Card meta tags', async ({ page }) => {
    // Vérifier les meta tags Twitter Card (utiliser .first() car il peut y avoir plusieurs éléments)
    const twitterCard = page.locator('meta[name="twitter:card"]').first()
    if (await twitterCard.count() > 0) {
      await expect(twitterCard).toHaveAttribute('content', 'summary_large_image')
    }
  })

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0')
  })

  test('should have description meta tag', async ({ page }) => {
    const description = page.locator('meta[name="description"]').first()
    if (await description.count() > 0) {
      await expect(description).toHaveAttribute('content', /Back'n Food|restaurant/i)
    }
  })
})

