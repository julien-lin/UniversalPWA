import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

test.describe('PWA Tests - Static Demo', () => {
  const demoPath = join(process.cwd(), 'demo-static')

  test('should have valid HTML structure', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('UniversalPWA')
  })

  test('should have service worker capability', async ({ page }) => {
    await page.goto('/')
    
    const swAvailable = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })
    
    expect(swAvailable).toBe(true)
  })

  test('should have head element for meta tags', async ({ page }) => {
    await page.goto('/')
    const hasHead = await page.locator('head').count()
    expect(hasHead).toBeGreaterThan(0)
  })

  test('should have body element', async ({ page }) => {
    await page.goto('/')
    const hasBody = await page.locator('body').count()
    expect(hasBody).toBeGreaterThan(0)
  })
})
