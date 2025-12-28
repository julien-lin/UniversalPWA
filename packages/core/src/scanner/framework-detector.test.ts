import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { detectFramework } from './framework-detector'

const TEST_DIR = join(process.cwd(), '.test-tmp-framework-detector')

describe('framework-detector', () => {
  beforeEach(() => {
    // Cleanup - use try/catch to handle deletion errors
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  describe('WordPress', () => {
    it('should detect WordPress with wp-config.php and wp-content', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'wp-content'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('wordpress')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('wp-config.php')
      expect(result.indicators).toContain('wp-content/')
    })

    it('should not detect WordPress without wp-content', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).not.toBe('wordpress')
    })
  })

  describe('Symfony', () => {
    it('should detect Symfony with composer.json and public/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'symfony/symfony': '^7.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('symfony')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: symfony/*')
      expect(result.indicators).toContain('public/')
    })
  })

  describe('Laravel', () => {
    it('should detect Laravel with composer.json and public/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'laravel/framework': '^11.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('laravel')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: laravel/framework')
    })
  })

  describe('Next.js', () => {
    it('should detect Next.js with package.json and .next/', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^15.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, '.next'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('nextjs')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('package.json: next')
      expect(result.indicators).toContain('.next/')
    })
  })

  describe('Nuxt', () => {
    it('should detect Nuxt with package.json and .nuxt/', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            nuxt: '^3.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, '.nuxt'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('nuxt')
      expect(result.confidence).toBe('high')
    })
  })

  describe('React', () => {
    it('should detect React with package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^19.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('react')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Vue', () => {
    it('should detect Vue with package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            vue: '^3.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('vue')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Angular', () => {
    it('should detect Angular with package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@angular/core': '^18.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('angular')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Static', () => {
    it('should detect static site with index.html', () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html></html>')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('static')
      expect(result.confidence).toBe('medium')
    })
  })

  describe('SvelteKit', () => {
    it('should detect SvelteKit with @sveltejs/kit and .svelte-kit', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@sveltejs/kit': '^2.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, '.svelte-kit'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('sveltekit')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('package.json: @sveltejs/kit')
      expect(result.indicators).toContain('.svelte-kit/')
    })
  })

  describe('Svelte', () => {
    it('should detect Svelte standalone (without SvelteKit)', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            svelte: '^4.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('svelte')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('package.json: svelte')
    })

    it('should prefer SvelteKit over Svelte when both present', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            svelte: '^4.0.0',
            '@sveltejs/kit': '^2.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, '.svelte-kit'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('sveltekit')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Remix', () => {
    it('should detect Remix with @remix-run/react and app/', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@remix-run/react': '^2.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'app'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('remix')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('package.json: @remix-run/*')
      expect(result.indicators).toContain('app/')
    })

    it('should detect Remix with @remix-run/node', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@remix-run/node': '^2.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'app'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('remix')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Astro', () => {
    it('should detect Astro with astro and .astro', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            astro: '^4.0.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, '.astro'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('astro')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('package.json: astro')
      expect(result.indicators).toContain('.astro/')
    })
  })

  describe('SolidJS', () => {
    it('should detect SolidJS with solid-js', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            'solid-js': '^1.8.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('solidjs')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('package.json: solid-js')
    })
  })

  describe('Priority', () => {
    it('should prioritize WordPress over other frameworks', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'wp-content'), { recursive: true })
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^19.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('wordpress')
    })
  })

  describe('Error handling', () => {
    it('should handle missing files gracefully', () => {
      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBeNull()
      expect(result.confidence).toBe('low')
    })

    it('should handle invalid JSON gracefully', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), 'invalid json')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBeNull()
    })

    it('should handle invalid composer.json gracefully', () => {
      writeFileSync(join(TEST_DIR, 'composer.json'), 'invalid json')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBeNull()
    })
  })
})

