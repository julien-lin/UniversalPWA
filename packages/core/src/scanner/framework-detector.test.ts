import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createTestDir, cleanupTestDir } from '../__tests__/test-helpers.js'
import { detectFramework } from './framework-detector.js'

let TEST_DIR: string

// ============= Test Helpers =============

/**
 * Create a PHP file with optional content
 */
function createPhpFile(filename: string, content = '<?php'): void {
  writeFileSync(join(TEST_DIR, filename), content)
}

/**
 * Create multiple directories at once
 */
function createDirs(...dirs: string[]): void {
  for (const dir of dirs) {
    mkdirSync(join(TEST_DIR, dir), { recursive: true })
  }
}

/**
 * Create a composer.json with specific dependencies
 */
function createComposerJson(dependencies: Record<string, string>): void {
  writeFileSync(
    join(TEST_DIR, 'composer.json'),
    JSON.stringify({ require: dependencies }),
  )
}

/**
 * Create a package.json with specific dependencies
 */
function createPackageJson(
  dependencies: Record<string, string> = {},
  devDependencies: Record<string, string> = {},
  scripts: Record<string, string> = {},
): void {
  writeFileSync(
    join(TEST_DIR, 'package.json'),
    JSON.stringify({ dependencies, devDependencies, scripts }, null, 2),
  )
}

/**
 * Test framework detection with expected results
 */
function expectFramework(
  framework: string,
  confidence: 'high' | 'medium' | 'low' = 'high',
  indicators?: string[],
): ReturnType<typeof detectFramework> {
  const result = detectFramework(TEST_DIR)
  expect(result.framework).toBe(framework)
  expect(result.confidence).toBe(confidence)
  if (indicators) {
    for (const indicator of indicators) {
      expect(result.indicators).toContain(indicator)
    }
  }
  return result
}

/**
 * Test that a framework is NOT detected
 */
function expectNotFramework(framework: string): void {
  const result = detectFramework(TEST_DIR)
  expect(result.framework).not.toBe(framework)
}

describe('framework-detector', () => {
  beforeEach(() => {
    TEST_DIR = createTestDir('framework-detector')
  })

  afterEach(() => {
    cleanupTestDir(TEST_DIR)
  })

  describe('WordPress', () => {
    it('should detect WordPress with wp-config.php and wp-content', () => {
      createPhpFile('wp-config.php')
      createDirs('wp-content')
      expectFramework('wordpress', 'high', ['wp-config.php', 'wp-content/'])
    })

    it('should detect WooCommerce when WordPress has woocommerce plugin', () => {
      createPhpFile('wp-config.php')
      createDirs('wp-content/plugins/woocommerce')
      expectFramework('woocommerce', 'high', ['wp-content/plugins/woocommerce/'])
    })

    it('should not detect WordPress without wp-content', () => {
      createPhpFile('wp-config.php')
      expectNotFramework('wordpress')
    })
  })

  describe('Drupal', () => {
    it('should detect Drupal with sites/, modules/, and themes/', () => {
      createDirs('sites', 'modules', 'themes')
      expectFramework('drupal', 'high', ['sites/ and modules/ (Drupal)', 'themes/'])
    })

    it('should not detect Drupal without themes/', () => {
      createDirs('sites', 'modules')
      expectNotFramework('drupal')
    })
  })

  describe('Joomla', () => {
    it('should detect Joomla with configuration.php and administrator/', () => {
      createPhpFile('configuration.php')
      createDirs('administrator')
      expectFramework('joomla', 'high', ['configuration.php (Joomla)', 'administrator/'])
    })

    it('should not detect Joomla without administrator/', () => {
      createPhpFile('configuration.php')
      expectNotFramework('joomla')
    })
  })

  describe('Magento', () => {
    it('should detect Magento Community Edition', () => {
      createComposerJson({ 'magento/product-community-edition': '^2.4' })
      createDirs('app', 'pub')
      expectFramework('magento', 'high', ['composer.json: magento/*', 'app/ and pub/'])
    })

    it('should detect Magento Enterprise Edition', () => {
      createComposerJson({ 'magento/product-enterprise-edition': '^2.4' })
      createDirs('app', 'pub')
      expectFramework('magento', 'high')
    })

    it('should not detect Magento without app/ and pub/', () => {
      createComposerJson({ 'magento/product-community-edition': '^2.4' })
      expectNotFramework('magento')
    })
  })

  describe('Shopify', () => {
    it('should detect Shopify with theme.liquid', () => {
      writeFileSync(join(TEST_DIR, 'theme.liquid'), '{% comment %}')
      expectFramework('shopify', 'high', ['theme.liquid or config/settings_schema.json (Shopify)'])
    })

    it('should detect Shopify with config/settings_schema.json', () => {
      createDirs('config')
      writeFileSync(join(TEST_DIR, 'config', 'settings_schema.json'), '{}')
      expectFramework('shopify', 'high')
    })
  })

  describe('PrestaShop', () => {
    it('should detect PrestaShop with composer.json and config/, themes/', () => {
      createComposerJson({ 'prestashop/prestashop': '^8.0' })
      createDirs('config', 'themes')
      expectFramework('prestashop', 'high', ['composer.json: prestashop/prestashop', 'config/ and themes/'])
    })

    it('should not detect PrestaShop without config/ and themes/', () => {
      createComposerJson({ 'prestashop/prestashop': '^8.0' })
      expectNotFramework('prestashop')
    })
  })

  describe('Symfony', () => {
    it('should detect Symfony with composer.json and public/', () => {
      createComposerJson({ 'symfony/symfony': '^7.0' })
      createDirs('public')
      expectFramework('symfony', 'high', ['composer.json: symfony/*', 'public/'])
    })
  })

  describe('Laravel', () => {
    it('should detect Laravel with composer.json and public/', () => {
      createComposerJson({ 'laravel/framework': '^11.0' })
      createDirs('public')
      expectFramework('laravel', 'high', ['composer.json: laravel/framework'])
    })
  })

  describe('CodeIgniter', () => {
    it('should detect CodeIgniter 4 with composer.json and public/', () => {
      createComposerJson({ 'codeigniter4/framework': '^4.0' })
      createDirs('public')
      expectFramework('codeigniter', 'high', ['composer.json: codeigniter4/framework', 'public/'])
    })
  })

  describe('CakePHP', () => {
    it('should detect CakePHP with composer.json and webroot/', () => {
      createComposerJson({ 'cakephp/cakephp': '^5.0' })
      createDirs('webroot')
      expectFramework('cakephp', 'high', ['composer.json: cakephp/cakephp'])
    })

    it('should detect CakePHP with composer.json and public/', () => {
      createComposerJson({ 'cakephp/cakephp': '^5.0' })
      createDirs('public')
      expectFramework('cakephp', 'high')
    })
  })

  describe('Yii', () => {
    it('should detect Yii2 with composer.json and web/', () => {
      createComposerJson({ 'yiisoft/yii2': '^2.0' })
      createDirs('web')
      expectFramework('yii', 'high', ['composer.json: yiisoft/*'])
    })

    it('should detect Yii3 with composer.json and public/', () => {
      createComposerJson({ 'yiisoft/yii': '^3.0' })
      createDirs('public')
      expectFramework('yii', 'high')
    })
  })

  describe('Laminas', () => {
    it('should detect Laminas with composer.json and public/', () => {
      createComposerJson({ 'laminas/laminas-mvc': '^3.0' })
      createDirs('public')
      expectFramework('laminas', 'high', ['composer.json: laminas/*', 'public/'])
    })

    it('should detect Laminas with laminas-component-installer', () => {
      createComposerJson({ 'laminas/laminas-component-installer': '^2.0' })
      createDirs('public')
      expectFramework('laminas', 'high')
    })
  })

  describe('Next.js', () => {
    it('should detect Next.js with package.json and .next/', () => {
      createPackageJson({ next: '^15.0.0' })
      createDirs('.next')
      expectFramework('nextjs', 'high', ['package.json: next', '.next/'])
    })
  })

  describe('Nuxt', () => {
    it('should detect Nuxt with package.json and .nuxt/', () => {
      createPackageJson({ nuxt: '^3.0.0' })
      createDirs('.nuxt')
      expectFramework('nuxt', 'high')
    })
  })

  describe('React', () => {
    it('should detect React with package.json', () => {
      createPackageJson({ react: '^19.0.0' })
      expectFramework('react', 'high')
    })
  })

  describe('Vue', () => {
    it('should detect Vue with package.json', () => {
      createPackageJson({ vue: '^3.0.0' })
      expectFramework('vue', 'high')
    })
  })

  describe('Angular', () => {
    it('should detect Angular with package.json', () => {
      createPackageJson({ '@angular/core': '^18.0.0' })
      expectFramework('angular', 'high')
    })
  })

  describe('Static', () => {
    it('should detect static site with index.html', () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html></html>')
      expectFramework('static', 'medium')
    })
  })

  describe('SvelteKit', () => {
    it('should detect SvelteKit with @sveltejs/kit and .svelte-kit', () => {
      createPackageJson({ '@sveltejs/kit': '^2.0.0' })
      createDirs('.svelte-kit')
      expectFramework('sveltekit', 'high', ['package.json: @sveltejs/kit', '.svelte-kit/'])
    })
  })

  describe('Svelte', () => {
    it('should detect Svelte standalone (without SvelteKit)', () => {
      createPackageJson({ svelte: '^4.0.0' })
      expectFramework('svelte', 'high', ['package.json: svelte'])
    })

    it('should prefer SvelteKit over Svelte when both present', () => {
      createPackageJson({ svelte: '^4.0.0', '@sveltejs/kit': '^2.0.0' })
      createDirs('.svelte-kit')
      expectFramework('sveltekit', 'high')
    })
  })

  describe('Remix', () => {
    it('should detect Remix with @remix-run/react and app/', () => {
      createPackageJson({ '@remix-run/react': '^2.0.0' })
      createDirs('app')
      expectFramework('remix', 'high', ['package.json: @remix-run/*', 'app/'])
    })

    it('should detect Remix with @remix-run/node', () => {
      createPackageJson({ '@remix-run/node': '^2.0.0' })
      createDirs('app')
      expectFramework('remix', 'high')
    })
  })
  describe('Astro', () => {
    it('should detect Astro with astro and .astro', () => {
      createPackageJson({ astro: '^4.0.0' })
      createDirs('.astro')
      expectFramework('astro', 'high', ['package.json: astro', '.astro/'])
    })
  })

  describe('SolidJS', () => {
    it('should detect SolidJS with solid-js', () => {
      createPackageJson({ 'solid-js': '^1.8.0' })
      expectFramework('solidjs', 'high', ['package.json: solid-js'])
    })
  })

  describe('Priority', () => {
    it('should prioritize WordPress over other frameworks', () => {
      createPhpFile('wp-config.php')
      createDirs('wp-content')
      createPackageJson({ react: '^19.0.0' })
      expectFramework('wordpress')
    })
  })

  describe('Django', () => {
    it('should detect Django with manage.py and settings.py', () => {
      writeFileSync(join(TEST_DIR, 'manage.py'), '#!/usr/bin/env python')
      writeFileSync(join(TEST_DIR, 'settings.py'), '# Django settings')

      const result = expectFramework('django')
      expect(result.indicators.some((i: string) => i.includes('Django'))).toBe(true)
    })

    it('should detect Django with manage.py and django/ directory', () => {
      writeFileSync(join(TEST_DIR, 'manage.py'), '#!/usr/bin/env python')
      createDirs('django')
      expectFramework('django')
    })
  })

  describe('Flask', () => {
    it('should detect Flask with requirements.txt and app.py', () => {
      writeFileSync(join(TEST_DIR, 'requirements.txt'), 'Flask==3.0.0')
      writeFileSync(join(TEST_DIR, 'app.py'), 'from flask import Flask')

      const result = expectFramework('flask')
      expect(result.indicators.some((i: string) => i.includes('Flask'))).toBe(true)
    })

    it('should detect Flask with requirements.txt and application.py', () => {
      writeFileSync(join(TEST_DIR, 'requirements.txt'), 'flask==3.0.0')
      writeFileSync(join(TEST_DIR, 'application.py'), 'from flask import Flask')
      expectFramework('flask')
    })
  })

  describe('FastAPI', () => {
    it('should detect FastAPI with requirements.txt', () => {
      writeFileSync(join(TEST_DIR, 'requirements.txt'), 'fastapi==0.104.0')
      const result = expectFramework('fastapi')
      expect(result.indicators.some((i: string) => i.includes('FastAPI'))).toBe(true)
    })
  })

  describe('Ruby on Rails', () => {
    it('should detect Rails with Gemfile and config/application.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), "gem 'rails', '~> 7.0'")
      createDirs('config')
      writeFileSync(join(TEST_DIR, 'config', 'application.rb'), 'module MyApp')

      const result = expectFramework('rails')
      expect(result.indicators.some((i: string) => i.includes('rails'))).toBe(true)
    })

    it('should detect Rails with Gemfile and config/routes.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), 'gem "rails"')
      createDirs('config')
      writeFileSync(join(TEST_DIR, 'config', 'routes.rb'), 'Rails.application.routes.draw do')
      expectFramework('rails')
    })
  })

  describe('Sinatra', () => {
    it('should detect Sinatra with Gemfile and app.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), "gem 'sinatra'")
      writeFileSync(join(TEST_DIR, 'app.rb'), 'require "sinatra"')

      const result = expectFramework('sinatra')
      expect(result.indicators.some((i: string) => i.includes('sinatra'))).toBe(true)
    })

    it('should detect Sinatra with Gemfile and main.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), 'gem "sinatra"')
      writeFileSync(join(TEST_DIR, 'main.rb'), 'require "sinatra"')
      expectFramework('sinatra')
    })
  })

  describe('Go', () => {
    it('should detect Go web project with go.mod and main.go with HTTP server', () => {
      writeFileSync(join(TEST_DIR, 'go.mod'), 'module myapp')
      writeFileSync(join(TEST_DIR, 'main.go'), 'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":8080", nil) }')

      const result = expectFramework('go')
      expect(result.indicators.some((i: string) => i.includes('HTTP server'))).toBe(true)
    })

    it('should detect Go web project with go.mod and server.go', () => {
      writeFileSync(join(TEST_DIR, 'go.mod'), 'module myapp')
      writeFileSync(join(TEST_DIR, 'server.go'), 'package main\nimport "net/http"\nfunc main() { http.Server{} }')
      expectFramework('go')
    })
  })

  describe('Spring Boot', () => {
    it('should detect Spring Boot with pom.xml', () => {
      writeFileSync(
        join(TEST_DIR, 'pom.xml'),
        '<?xml version="1.0"?><project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>',
      )

      const result = expectFramework('spring')
      expect(result.indicators.some((i: string) => i.includes('spring-boot'))).toBe(true)
    })

    it('should detect Spring Boot with build.gradle', () => {
      writeFileSync(
        join(TEST_DIR, 'build.gradle'),
        'dependencies { implementation "org.springframework.boot:spring-boot-starter-web" }',
      )
      expectFramework('spring')
    })
  })

  describe('ASP.NET Core', () => {
    it('should detect ASP.NET Core with .csproj and Program.cs', () => {
      writeFileSync(
        join(TEST_DIR, 'MyApp.csproj'),
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
      )
      writeFileSync(join(TEST_DIR, 'Program.cs'), 'var builder = WebApplication.CreateBuilder(args);')

      const result = expectFramework('aspnet')
      expect(result.indicators.some((i: string) => i.includes('ASP.NET Core'))).toBe(true)
    })

    it('should detect ASP.NET Core with .csproj and Startup.cs', () => {
      writeFileSync(
        join(TEST_DIR, 'MyApp.csproj'),
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
      )
      writeFileSync(join(TEST_DIR, 'Startup.cs'), 'public class Startup')
      expectFramework('aspnet')
    })
  })

  describe('Jekyll', () => {
    it('should detect Jekyll with _config.yml and _posts/', () => {
      writeFileSync(join(TEST_DIR, '_config.yml'), 'title: My Site')
      createDirs('_posts')

      expectFramework('jekyll', 'high', ['_config.yml (Jekyll)', '_posts/'])
    })

    it('should detect Jekyll with _config.yml only', () => {
      writeFileSync(join(TEST_DIR, '_config.yml'), 'title: My Site')
      expectFramework('jekyll', 'medium')
    })
  })

  describe('Hugo', () => {
    it('should detect Hugo with config.toml, content/, and layouts/', () => {
      writeFileSync(join(TEST_DIR, 'config.toml'), 'title = "My Site"')
      createDirs('content', 'layouts')
      expectFramework('hugo', 'high', ['content/ and layouts/'])
    })

    it('should detect Hugo with config.yaml and content/', () => {
      writeFileSync(join(TEST_DIR, 'config.yaml'), 'title: My Site')
      createDirs('content')
      expectFramework('hugo', 'high')
    })
  })

  describe('Gatsby', () => {
    it('should detect Gatsby with gatsby-config.js', () => {
      writeFileSync(join(TEST_DIR, 'gatsby-config.js'), 'module.exports = {}')
      expectFramework('gatsby', 'high', ['gatsby-config.js/ts (Gatsby)'])
    })

    it('should detect Gatsby with gatsby-config.ts', () => {
      writeFileSync(join(TEST_DIR, 'gatsby-config.ts'), 'export default {}')
      expectFramework('gatsby')
    })
  })

  describe('Eleventy (11ty)', () => {
    it('should detect Eleventy with .eleventy.js and _data/', () => {
      writeFileSync(join(TEST_DIR, '.eleventy.js'), 'module.exports = {}')
      createDirs('_data')
      expectFramework('eleventy', 'high', ['_data/'])
    })

    it('should detect Eleventy with eleventy.config.js', () => {
      writeFileSync(join(TEST_DIR, 'eleventy.config.js'), 'module.exports = {}')
      expectFramework('eleventy')
    })
  })

  describe('VitePress', () => {
    it('should detect VitePress with vitepress.config.js', () => {
      writeFileSync(join(TEST_DIR, 'vitepress.config.js'), 'export default {}')
      expectFramework('vitepress', 'high', ['vitepress.config.js/ts (VitePress)'])
    })

    it('should detect VitePress with docs/.vitepress/config.js', () => {
      createDirs('docs/.vitepress')
      writeFileSync(join(TEST_DIR, 'docs', '.vitepress', 'config.js'), 'export default {}')
      expectFramework('vitepress', 'high', ['docs/.vitepress/config.js/ts (VitePress)'])
    })
  })

  describe('Docusaurus', () => {
    it('should detect Docusaurus with docusaurus.config.js', () => {
      writeFileSync(join(TEST_DIR, 'docusaurus.config.js'), 'module.exports = {}')
      expectFramework('docusaurus', 'high', ['docusaurus.config.js/ts (Docusaurus)'])
    })

    it('should detect Docusaurus with docusaurus.config.ts', () => {
      writeFileSync(join(TEST_DIR, 'docusaurus.config.ts'), 'export default {}')
      expectFramework('docusaurus')
    })
  })

  describe('Confidence Score', () => {
    it('should calculate confidence score for high confidence framework', () => {
      createPhpFile('wp-config.php')
      createDirs('wp-content')

      const result = expectFramework('wordpress')
      expect(result.confidenceScore).toBeGreaterThanOrEqual(70)
      expect(result.confidenceScore).toBeLessThanOrEqual(100)
    })

    it('should calculate confidence score for medium confidence framework', () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html></html>')

      const result = expectFramework('static', 'medium')
      expect(result.confidenceScore).toBeGreaterThanOrEqual(40)
      expect(result.confidenceScore).toBeLessThan(70)
    })

    it('should return 0 score when no framework detected', () => {
      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBeNull()
      expect(result.confidence).toBe('low')
      expect(result.confidenceScore).toBe(0)
    })

    it('should have higher score with more indicators', () => {
      createPhpFile('wp-config.php')
      createDirs('wp-content')

      const result = expectFramework('wordpress')
      expect(result.confidenceScore).toBeGreaterThan(80) // Base 80 + indicators bonus
    })
  })

  describe('Framework Version Detection', () => {
    it('should detect React version from package.json', () => {
      createPackageJson({ react: '^18.2.0' })

      const result = expectFramework('react')

      expect(result.version).not.toBeNull()
      expect(result.version?.major).toBe(18)
      expect(result.version?.minor).toBe(2)
      expect(result.version?.patch).toBe(0)
      expect(result.version?.raw).toBe('^18.2.0')
    })

    it('should detect Vue version from package.json', () => {
      createPackageJson({ vue: '^3.3.4' })

      const result = expectFramework('vue')

      expect(result.version).not.toBeNull()
      expect(result.version?.major).toBe(3)
      expect(result.version?.minor).toBe(3)
      expect(result.version?.patch).toBe(4)
    })

    it('should detect Angular version from package.json', () => {
      createPackageJson({ '@angular/core': '^17.0.0' })

      const result = expectFramework('angular')

      expect(result.version).not.toBeNull()
      expect(result.version?.major).toBe(17)
      expect(result.version?.minor).toBe(0)
      expect(result.version?.patch).toBe(0)
    })

    it('should handle version with caret prefix', () => {
      createPackageJson({ react: '^19.0.0' })

      const result = expectFramework('react')

      expect(result.version?.major).toBe(19)
    })

    it('should return null version for non-versioned frameworks', () => {
      createPhpFile('wp-config.php')
      createDirs('wp-content')

      const result = expectFramework('wordpress')
      expect(result.version).toBeNull()
    })
  })

  describe('Project Configuration Detection', () => {
    it('should detect TypeScript from tsconfig.json', () => {
      writeFileSync(join(TEST_DIR, 'tsconfig.json'), '{}')
      createPackageJson({ react: '^18.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.language).toBe('typescript')
      expect(result.indicators).toContain('TypeScript detected')
    })

    it('should detect TypeScript from .ts files', () => {
      createPackageJson({ react: '^18.0.0' })
      writeFileSync(join(TEST_DIR, 'App.tsx'), 'export default function App() {}')

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.language).toBe('typescript')
    })

    it('should detect styled-components', () => {
      createPackageJson({ react: '^18.0.0', 'styled-components': '^5.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.cssInJs).toContain('styled-components')
      expect(result.indicators.some((i: string) => i.includes('CSS-in-JS: styled-components'))).toBe(true)
    })

    it('should detect emotion', () => {
      createPackageJson({ react: '^18.0.0', '@emotion/react': '^11.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.cssInJs).toContain('emotion')
    })

    it('should detect Redux', () => {
      createPackageJson({ react: '^18.0.0', redux: '^4.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement).toContain('redux')
      expect(result.indicators.some((i: string) => i.includes('State Management: redux'))).toBe(true)
    })

    it('should detect Zustand', () => {
      createPackageJson({ react: '^18.0.0', zustand: '^4.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement).toContain('zustand')
    })

    it('should detect Pinia for Vue', () => {
      createPackageJson({ vue: '^3.0.0', pinia: '^2.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement).toContain('pinia')
    })

    it('should detect Vite as build tool', () => {
      createPackageJson({ react: '^18.0.0', vite: '^5.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.buildTool).toBe('vite')
      expect(result.indicators.some((i: string) => i.includes('Build Tool: vite'))).toBe(true)
    })

    it('should detect Webpack as build tool', () => {
      createPackageJson({ react: '^18.0.0', webpack: '^5.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.buildTool).toBe('webpack')
    })

    it('should detect multiple CSS-in-JS libraries', () => {
      createPackageJson({
        react: '^18.0.0',
        'styled-components': '^5.0.0',
        '@emotion/react': '^11.0.0',
      })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.cssInJs.length).toBeGreaterThan(1)
      expect(result.configuration.cssInJs).toContain('styled-components')
      expect(result.configuration.cssInJs).toContain('emotion')
    })

    it('should detect multiple state management libraries', () => {
      createPackageJson({ react: '^18.0.0', redux: '^4.0.0', zustand: '^4.0.0' })

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement.length).toBeGreaterThan(1)
      expect(result.configuration.stateManagement).toContain('redux')
      expect(result.configuration.stateManagement).toContain('zustand')
    })
  })

  describe('Error handling', () => {
    it('should handle missing files gracefully', () => {
      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBeNull()
      expect(result.confidence).toBe('low')
      expect(result.confidenceScore).toBe(0)
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

