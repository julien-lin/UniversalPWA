/**
 * Integration tests for Backend Factory
 * Tests detection, integration retrieval, and fallback behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { getBackendFactory, resetBackendFactory } from '../factory.js'
import { LaravelIntegration } from '../laravel.js'
import { SymfonyIntegration } from '../symfony.js'
import { generateServiceWorkerFromBackend } from '../../generator/service-worker-generator.js'

const createLaravelFixture = (): string => {
  const root = join(tmpdir(), `laravel-factory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  mkdirSync(join(root, 'app'), { recursive: true })
  mkdirSync(join(root, 'config'), { recursive: true })
  mkdirSync(join(root, 'routes'), { recursive: true })
  mkdirSync(join(root, 'public'), { recursive: true })

  writeFileSync(join(root, 'artisan'), '#!/usr/bin/env php')
  writeFileSync(
    join(root, 'composer.json'),
    JSON.stringify({
      require: {
        'laravel/framework': '^11.0',
      },
    }),
  )

  writeFileSync(
    join(root, 'public', 'index.html'),
    '<!doctype html><html><head><title>Laravel</title></head><body><div id="app"></div></body></html>',
  )

  return root
}

const createSymfonyFixture = (): string => {
  const root = join(tmpdir(), `symfony-factory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  mkdirSync(join(root, 'config'), { recursive: true })
  mkdirSync(join(root, 'public'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })

  writeFileSync(
    join(root, 'composer.json'),
    JSON.stringify({
      require: {
        'symfony/framework-bundle': '^7.0',
      },
    }),
  )

  writeFileSync(join(root, 'public', 'index.php'), '<?php echo "Symfony";')
  
  // Add config/services.yaml for better detection
  mkdirSync(join(root, 'config'), { recursive: true })
  writeFileSync(join(root, 'config', 'services.yaml'), 'services:\n  _defaults:\n    autowire: true\n')

  return root
}

const createGenericFixture = (): string => {
  const root = join(tmpdir(), `generic-factory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
  mkdirSync(join(root, 'public'), { recursive: true })

  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'generic-app',
      version: '1.0.0',
    }),
  )

  writeFileSync(
    join(root, 'public', 'index.html'),
    '<!doctype html><html><head><title>Generic</title></head><body></body></html>',
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

describe('Backend Factory Integration Tests', () => {
  beforeEach(() => {
    resetBackendFactory()
  })

  describe('detectBackend()', () => {
    it('should detect Laravel project with high confidence', () => {
      const projectPath = createLaravelFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.detectBackend(projectPath)

        expect(integration).not.toBeNull()
        expect(integration).toBeInstanceOf(LaravelIntegration)
        expect(integration?.id).toBe('laravel')
        expect(integration?.name).toBe('Laravel')

        const detectionResult = integration?.detect()
        expect(detectionResult?.detected).toBe(true)
        expect(detectionResult?.confidence).toBe('high')
        expect(detectionResult?.framework).toBe('laravel')
      } finally {
        cleanup(projectPath)
      }
    })

    it('should detect Symfony project with high confidence', () => {
      const projectPath = createSymfonyFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.detectBackend(projectPath)

        expect(integration).not.toBeNull()
        expect(integration).toBeInstanceOf(SymfonyIntegration)
        expect(integration?.id).toBe('symfony')
        expect(integration?.name).toBe('Symfony')

        const detectionResult = integration?.detect()
        expect(detectionResult?.detected).toBe(true)
        expect(detectionResult?.confidence).toBe('high')
        expect(detectionResult?.framework).toBe('symfony')
      } finally {
        cleanup(projectPath)
      }
    })

    it('should return null for generic project', () => {
      const projectPath = createGenericFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.detectBackend(projectPath)

        expect(integration).toBeNull()
      } finally {
        cleanup(projectPath)
      }
    })
  })

  describe('getIntegration()', () => {
    it('should return LaravelIntegration for laravel framework', () => {
      const projectPath = createLaravelFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.getIntegration('laravel', projectPath)

        expect(integration).not.toBeNull()
        expect(integration).toBeInstanceOf(LaravelIntegration)
        expect(integration?.id).toBe('laravel')
        expect(integration?.name).toBe('Laravel')
        expect(integration?.framework).toBe('laravel')
        expect(integration?.language).toBe('php')
      } finally {
        cleanup(projectPath)
      }
    })

    it('should return SymfonyIntegration for symfony framework', () => {
      const projectPath = createSymfonyFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.getIntegration('symfony', projectPath)

        expect(integration).not.toBeNull()
        expect(integration).toBeInstanceOf(SymfonyIntegration)
        expect(integration?.id).toBe('symfony')
        expect(integration?.name).toBe('Symfony')
        expect(integration?.framework).toBe('symfony')
        expect(integration?.language).toBe('php')
      } finally {
        cleanup(projectPath)
      }
    })

    it('should return null for unknown framework', () => {
      const projectPath = createGenericFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.getIntegration('react', projectPath)

        expect(integration).toBeNull()
      } finally {
        cleanup(projectPath)
      }
    })

    it('should return null for static framework', () => {
      const projectPath = createGenericFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.getIntegration('static', projectPath)

        expect(integration).toBeNull()
      } finally {
        cleanup(projectPath)
      }
    })
  })

  describe('Service Worker Generation with Backends', () => {
    it('should generate service worker from Laravel integration', async () => {
      const projectPath = createLaravelFixture()
      const factory = getBackendFactory()
      const outputDir = join(projectPath, 'public')

      try {
        const integration = factory.getIntegration('laravel', projectPath)
        expect(integration).not.toBeNull()

        const result = await generateServiceWorkerFromBackend(
          integration!,
          'spa',
          {
            projectPath,
            outputDir,
            globDirectory: outputDir,
          },
        )

        expect(result.swPath).toBeDefined()
        expect(existsSync(result.swPath)).toBe(true)
        expect(result.count).toBeGreaterThanOrEqual(0)
        expect(result.size).toBeGreaterThan(0)
      } finally {
        cleanup(projectPath)
      }
    })

    it('should generate service worker from Symfony integration', async () => {
      const projectPath = createSymfonyFixture()
      const factory = getBackendFactory()
      const outputDir = join(projectPath, 'public')

      try {
        const integration = factory.getIntegration('symfony', projectPath)
        expect(integration).not.toBeNull()

        const result = await generateServiceWorkerFromBackend(
          integration!,
          'ssr',
          {
            projectPath,
            outputDir,
            globDirectory: outputDir,
          },
        )

        expect(result.swPath).toBeDefined()
        expect(existsSync(result.swPath)).toBe(true)
        expect(result.count).toBeGreaterThanOrEqual(0)
        expect(result.size).toBeGreaterThanOrEqual(0)
      } finally {
        cleanup(projectPath)
      }
    })

    it('should generate optimized config for Laravel with CSRF routes', () => {
      const projectPath = createLaravelFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.getIntegration('laravel', projectPath)
        expect(integration).not.toBeNull()

        const config = integration!.generateServiceWorkerConfig()

        // Verify Laravel-specific optimizations
        expect(config.apiRoutes).toBeDefined()
        expect(config.apiRoutes.length).toBeGreaterThan(0)

        // Check for Laravel-specific routes
        const apiPatterns = integration!.getApiPatterns()
        expect(apiPatterns).toContain('/api/**')
        expect(apiPatterns.some((p) => p.includes('livewire'))).toBe(true)

        // Verify secure routes
        const secureRoutes = integration!.getSecureRoutes()
        expect(secureRoutes.length).toBeGreaterThan(0)
      } finally {
        cleanup(projectPath)
      }
    })

    it('should generate optimized config for Symfony with API Platform routes', () => {
      const projectPath = createSymfonyFixture()
      const factory = getBackendFactory()

      try {
        const integration = factory.getIntegration('symfony', projectPath)
        expect(integration).not.toBeNull()

        const config = integration!.generateServiceWorkerConfig()

        // Verify Symfony-specific optimizations
        expect(config.apiRoutes).toBeDefined()
        expect(config.apiRoutes.length).toBeGreaterThan(0)

        // Check for Symfony-specific routes
        const apiPatterns = integration!.getApiPatterns()
        expect(apiPatterns).toContain('/api/**')

        // Verify static asset patterns
        const staticPatterns = integration!.getStaticAssetPatterns()
        expect(staticPatterns.length).toBeGreaterThan(0)
      } finally {
        cleanup(projectPath)
      }
    })
  })

  describe('Fallback Behavior', () => {
    it('should handle fallback when no backend detected', () => {
      const projectPath = createGenericFixture()
      const factory = getBackendFactory()

      try {
        // Detection should return null
        const detected = factory.detectBackend(projectPath)
        expect(detected).toBeNull()

        // getIntegration should return null for unknown frameworks
        const integration = factory.getIntegration('react', projectPath)
        expect(integration).toBeNull()

        // This simulates the CLI fallback behavior
        // In real usage, CLI would fall back to generateServiceWorker()
      } finally {
        cleanup(projectPath)
      }
    })

    it('should handle case where framework detected but integration not available', () => {
      const projectPath = createGenericFixture()
      const factory = getBackendFactory()

      try {
        // For a framework that exists but project doesn't match
        const integration = factory.getIntegration('laravel', projectPath)

        // Integration is created but detection will fail
        if (integration) {
          const detection = integration.detect()
          expect(detection.detected).toBe(false)
        }
      } finally {
        cleanup(projectPath)
      }
    })
  })

  describe('Factory Singleton Behavior', () => {
    it('should return same factory instance on multiple calls', () => {
      const factory1 = getBackendFactory()
      const factory2 = getBackendFactory()

      expect(factory1).toBe(factory2)
    })

    it('should reset factory correctly', () => {
      const factory1 = getBackendFactory()
      resetBackendFactory()
      const factory2 = getBackendFactory()

      // Should be different instances after reset
      expect(factory1).not.toBe(factory2)
    })
  })
})
