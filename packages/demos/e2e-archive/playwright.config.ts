import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

const webServer = [
  {
    command: 'npx serve . -p 3000',
    cwd: 'demo-static',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  ...(existsSync('fixtures/react-vite/dist')
    ? [
      {
        command: 'npx serve . -p 3001',
        cwd: 'fixtures/react-vite/dist',
        url: 'http://localhost:3001',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
    : []),
  ...(existsSync('fixtures/no-framework/dist')
    ? [
      {
        command: 'npx serve . -p 3002',
        cwd: 'fixtures/no-framework/dist',
        url: 'http://localhost:3002',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
    : []),
  ...(existsSync('fixtures/symfony/public')
    ? [
      {
        command: 'npx serve . -p 3003',
        cwd: 'fixtures/symfony/public',
        url: 'http://localhost:3003',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
    : []),
  ...(existsSync('fixtures/laravel/public')
    ? [
      {
        command: 'npx serve . -p 3004',
        cwd: 'fixtures/laravel/public',
        url: 'http://localhost:3004',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
    : []),
  ...(existsSync('fixtures/django/public')
    ? [
      {
        command: 'npx serve . -p 3005',
        cwd: 'fixtures/django/public',
        url: 'http://localhost:3005',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
    : []),
  ...(existsSync('fixtures/flask')
    ? [
      {
        command: 'npx serve . -p 3006',
        cwd: 'fixtures/flask',
        url: 'http://localhost:3006',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
      },
    ]
    : []),
]

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer,
})
