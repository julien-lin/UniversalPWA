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

    it('should detect WooCommerce when WordPress has woocommerce plugin', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'wp-content', 'plugins', 'woocommerce'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('woocommerce')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('wp-content/plugins/woocommerce/')
    })

    it('should not detect WordPress without wp-content', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).not.toBe('wordpress')
    })
  })

  describe('Drupal', () => {
    it('should detect Drupal with sites/, modules/, and themes/', () => {
      mkdirSync(join(TEST_DIR, 'sites'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'modules'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'themes'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('drupal')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('sites/ and modules/ (Drupal)')
      expect(result.indicators).toContain('themes/')
    })

    it('should not detect Drupal without themes/', () => {
      mkdirSync(join(TEST_DIR, 'sites'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'modules'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).not.toBe('drupal')
    })
  })

  describe('Joomla', () => {
    it('should detect Joomla with configuration.php and administrator/', () => {
      writeFileSync(join(TEST_DIR, 'configuration.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'administrator'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('joomla')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('configuration.php (Joomla)')
      expect(result.indicators).toContain('administrator/')
    })

    it('should not detect Joomla without administrator/', () => {
      writeFileSync(join(TEST_DIR, 'configuration.php'), '<?php')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).not.toBe('joomla')
    })
  })

  describe('Magento', () => {
    it('should detect Magento Community Edition', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'magento/product-community-edition': '^2.4',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'app'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'pub'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('magento')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: magento/*')
      expect(result.indicators).toContain('app/ and pub/')
    })

    it('should detect Magento Enterprise Edition', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'magento/product-enterprise-edition': '^2.4',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'app'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'pub'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('magento')
      expect(result.confidence).toBe('high')
    })

    it('should not detect Magento without app/ and pub/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'magento/product-community-edition': '^2.4',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).not.toBe('magento')
    })
  })

  describe('Shopify', () => {
    it('should detect Shopify with theme.liquid', () => {
      writeFileSync(join(TEST_DIR, 'theme.liquid'), '{% comment %}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('shopify')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('theme.liquid or config/settings_schema.json (Shopify)')
    })

    it('should detect Shopify with config/settings_schema.json', () => {
      mkdirSync(join(TEST_DIR, 'config'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'config', 'settings_schema.json'), '{}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('shopify')
      expect(result.confidence).toBe('high')
    })
  })

  describe('PrestaShop', () => {
    it('should detect PrestaShop with composer.json and config/, themes/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'prestashop/prestashop': '^8.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'config'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'themes'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('prestashop')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: prestashop/prestashop')
      expect(result.indicators).toContain('config/ and themes/')
    })

    it('should not detect PrestaShop without config/ and themes/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'prestashop/prestashop': '^8.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).not.toBe('prestashop')
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

  describe('CodeIgniter', () => {
    it('should detect CodeIgniter 4 with composer.json and public/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'codeigniter4/framework': '^4.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('codeigniter')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: codeigniter4/framework')
      expect(result.indicators).toContain('public/')
    })
  })

  describe('CakePHP', () => {
    it('should detect CakePHP with composer.json and webroot/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'cakephp/cakephp': '^5.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'webroot'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('cakephp')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: cakephp/cakephp')
    })

    it('should detect CakePHP with composer.json and public/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'cakephp/cakephp': '^5.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('cakephp')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Yii', () => {
    it('should detect Yii2 with composer.json and web/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'yiisoft/yii2': '^2.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'web'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('yii')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: yiisoft/*')
    })

    it('should detect Yii3 with composer.json and public/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'yiisoft/yii': '^3.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('yii')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Laminas', () => {
    it('should detect Laminas with composer.json and public/', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'laminas/laminas-mvc': '^3.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('laminas')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('composer.json: laminas/*')
      expect(result.indicators).toContain('public/')
    })

    it('should detect Laminas with laminas-component-installer', () => {
      writeFileSync(
        join(TEST_DIR, 'composer.json'),
        JSON.stringify({
          require: {
            'laminas/laminas-component-installer': '^2.0',
          },
        }),
      )
      mkdirSync(join(TEST_DIR, 'public'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('laminas')
      expect(result.confidence).toBe('high')
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

  describe('Django', () => {
    it('should detect Django with manage.py and settings.py', () => {
      writeFileSync(join(TEST_DIR, 'manage.py'), '#!/usr/bin/env python')
      writeFileSync(join(TEST_DIR, 'settings.py'), '# Django settings')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('django')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('Django'))).toBe(true)
    })

    it('should detect Django with manage.py and django/ directory', () => {
      writeFileSync(join(TEST_DIR, 'manage.py'), '#!/usr/bin/env python')
      mkdirSync(join(TEST_DIR, 'django'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('django')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Flask', () => {
    it('should detect Flask with requirements.txt and app.py', () => {
      writeFileSync(join(TEST_DIR, 'requirements.txt'), 'Flask==3.0.0')
      writeFileSync(join(TEST_DIR, 'app.py'), 'from flask import Flask')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('flask')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('Flask'))).toBe(true)
    })

    it('should detect Flask with requirements.txt and application.py', () => {
      writeFileSync(join(TEST_DIR, 'requirements.txt'), 'flask==3.0.0')
      writeFileSync(join(TEST_DIR, 'application.py'), 'from flask import Flask')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('flask')
      expect(result.confidence).toBe('high')
    })
  })

  describe('FastAPI', () => {
    it('should detect FastAPI with requirements.txt', () => {
      writeFileSync(join(TEST_DIR, 'requirements.txt'), 'fastapi==0.104.0')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('fastapi')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('FastAPI'))).toBe(true)
    })
  })

  describe('Ruby on Rails', () => {
    it('should detect Rails with Gemfile and config/application.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), "gem 'rails', '~> 7.0'")
      mkdirSync(join(TEST_DIR, 'config'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'config', 'application.rb'), 'module MyApp')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('rails')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('rails'))).toBe(true)
    })

    it('should detect Rails with Gemfile and config/routes.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), 'gem "rails"')
      mkdirSync(join(TEST_DIR, 'config'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'config', 'routes.rb'), 'Rails.application.routes.draw do')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('rails')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Sinatra', () => {
    it('should detect Sinatra with Gemfile and app.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), "gem 'sinatra'")
      writeFileSync(join(TEST_DIR, 'app.rb'), 'require "sinatra"')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('sinatra')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('sinatra'))).toBe(true)
    })

    it('should detect Sinatra with Gemfile and main.rb', () => {
      writeFileSync(join(TEST_DIR, 'Gemfile'), 'gem "sinatra"')
      writeFileSync(join(TEST_DIR, 'main.rb'), 'require "sinatra"')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('sinatra')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Go', () => {
    it('should detect Go web project with go.mod and main.go with HTTP server', () => {
      writeFileSync(join(TEST_DIR, 'go.mod'), 'module myapp')
      writeFileSync(join(TEST_DIR, 'main.go'), 'package main\nimport "net/http"\nfunc main() { http.ListenAndServe(":8080", nil) }')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('go')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('HTTP server'))).toBe(true)
    })

    it('should detect Go web project with go.mod and server.go', () => {
      writeFileSync(join(TEST_DIR, 'go.mod'), 'module myapp')
      writeFileSync(join(TEST_DIR, 'server.go'), 'package main\nimport "net/http"\nfunc main() { http.Server{} }')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('go')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Spring Boot', () => {
    it('should detect Spring Boot with pom.xml', () => {
      writeFileSync(
        join(TEST_DIR, 'pom.xml'),
        '<?xml version="1.0"?><project><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>',
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('spring')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('spring-boot'))).toBe(true)
    })

    it('should detect Spring Boot with build.gradle', () => {
      writeFileSync(
        join(TEST_DIR, 'build.gradle'),
        'dependencies { implementation "org.springframework.boot:spring-boot-starter-web" }',
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('spring')
      expect(result.confidence).toBe('high')
    })
  })

  describe('ASP.NET Core', () => {
    it('should detect ASP.NET Core with .csproj and Program.cs', () => {
      writeFileSync(
        join(TEST_DIR, 'MyApp.csproj'),
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
      )
      writeFileSync(join(TEST_DIR, 'Program.cs'), 'var builder = WebApplication.CreateBuilder(args);')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('aspnet')
      expect(result.confidence).toBe('high')
      expect(result.indicators.some((i) => i.includes('ASP.NET Core'))).toBe(true)
    })

    it('should detect ASP.NET Core with .csproj and Startup.cs', () => {
      writeFileSync(
        join(TEST_DIR, 'MyApp.csproj'),
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup></Project>',
      )
      writeFileSync(join(TEST_DIR, 'Startup.cs'), 'public class Startup')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('aspnet')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Jekyll', () => {
    it('should detect Jekyll with _config.yml and _posts/', () => {
      writeFileSync(join(TEST_DIR, '_config.yml'), 'title: My Site')
      mkdirSync(join(TEST_DIR, '_posts'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('jekyll')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('_config.yml (Jekyll)')
      expect(result.indicators).toContain('_posts/')
    })

    it('should detect Jekyll with _config.yml only', () => {
      writeFileSync(join(TEST_DIR, '_config.yml'), 'title: My Site')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('jekyll')
      expect(result.confidence).toBe('medium')
    })
  })

  describe('Hugo', () => {
    it('should detect Hugo with config.toml, content/, and layouts/', () => {
      writeFileSync(join(TEST_DIR, 'config.toml'), 'title = "My Site"')
      mkdirSync(join(TEST_DIR, 'content'), { recursive: true })
      mkdirSync(join(TEST_DIR, 'layouts'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('hugo')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('content/ and layouts/')
    })

    it('should detect Hugo with config.yaml and content/', () => {
      writeFileSync(join(TEST_DIR, 'config.yaml'), 'title: My Site')
      mkdirSync(join(TEST_DIR, 'content'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('hugo')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Gatsby', () => {
    it('should detect Gatsby with gatsby-config.js', () => {
      writeFileSync(join(TEST_DIR, 'gatsby-config.js'), 'module.exports = {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('gatsby')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('gatsby-config.js/ts (Gatsby)')
    })

    it('should detect Gatsby with gatsby-config.ts', () => {
      writeFileSync(join(TEST_DIR, 'gatsby-config.ts'), 'export default {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('gatsby')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Eleventy (11ty)', () => {
    it('should detect Eleventy with .eleventy.js and _data/', () => {
      writeFileSync(join(TEST_DIR, '.eleventy.js'), 'module.exports = {}')
      mkdirSync(join(TEST_DIR, '_data'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('eleventy')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('_data/')
    })

    it('should detect Eleventy with eleventy.config.js', () => {
      writeFileSync(join(TEST_DIR, 'eleventy.config.js'), 'module.exports = {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('eleventy')
      expect(result.confidence).toBe('high')
    })
  })

  describe('VitePress', () => {
    it('should detect VitePress with vitepress.config.js', () => {
      writeFileSync(join(TEST_DIR, 'vitepress.config.js'), 'export default {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('vitepress')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('vitepress.config.js/ts (VitePress)')
    })

    it('should detect VitePress with docs/.vitepress/config.js', () => {
      mkdirSync(join(TEST_DIR, 'docs', '.vitepress'), { recursive: true })
      writeFileSync(join(TEST_DIR, 'docs', '.vitepress', 'config.js'), 'export default {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('vitepress')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('docs/.vitepress/config.js/ts (VitePress)')
    })
  })

  describe('Docusaurus', () => {
    it('should detect Docusaurus with docusaurus.config.js', () => {
      writeFileSync(join(TEST_DIR, 'docusaurus.config.js'), 'module.exports = {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('docusaurus')
      expect(result.confidence).toBe('high')
      expect(result.indicators).toContain('docusaurus.config.js/ts (Docusaurus)')
    })

    it('should detect Docusaurus with docusaurus.config.ts', () => {
      writeFileSync(join(TEST_DIR, 'docusaurus.config.ts'), 'export default {}')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('docusaurus')
      expect(result.confidence).toBe('high')
    })
  })

  describe('Confidence Score', () => {
    it('should calculate confidence score for high confidence framework', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'wp-content'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('wordpress')
      expect(result.confidence).toBe('high')
      expect(result.confidenceScore).toBeGreaterThanOrEqual(70)
      expect(result.confidenceScore).toBeLessThanOrEqual(100)
    })

    it('should calculate confidence score for medium confidence framework', () => {
      writeFileSync(join(TEST_DIR, 'index.html'), '<html></html>')

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('static')
      expect(result.confidence).toBe('medium')
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
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'wp-content'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('wordpress')
      expect(result.confidenceScore).toBeGreaterThan(80) // Base 80 + indicators bonus
    })
  })

  describe('Framework Version Detection', () => {
    it('should detect React version from package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.2.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('react')
      expect(result.version).not.toBeNull()
      expect(result.version?.major).toBe(18)
      expect(result.version?.minor).toBe(2)
      expect(result.version?.patch).toBe(0)
      expect(result.version?.raw).toBe('^18.2.0')
    })

    it('should detect Vue version from package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            vue: '^3.3.4',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('vue')
      expect(result.version).not.toBeNull()
      expect(result.version?.major).toBe(3)
      expect(result.version?.minor).toBe(3)
      expect(result.version?.patch).toBe(4)
    })

    it('should detect Angular version from package.json', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@angular/core': '^17.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('angular')
      expect(result.version).not.toBeNull()
      expect(result.version?.major).toBe(17)
      expect(result.version?.minor).toBe(0)
      expect(result.version?.patch).toBe(0)
    })

    it('should handle version with caret prefix', () => {
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
      expect(result.version?.major).toBe(19)
    })

    it('should return null version for non-versioned frameworks', () => {
      writeFileSync(join(TEST_DIR, 'wp-config.php'), '<?php')
      mkdirSync(join(TEST_DIR, 'wp-content'), { recursive: true })

      const result = detectFramework(TEST_DIR)

      expect(result.framework).toBe('wordpress')
      expect(result.version).toBeNull()
    })
  })

  describe('Project Configuration Detection', () => {
    it('should detect TypeScript from tsconfig.json', () => {
      writeFileSync(join(TEST_DIR, 'tsconfig.json'), '{}')
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({ dependencies: { react: '^18.0.0' } }))

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.language).toBe('typescript')
      expect(result.indicators).toContain('TypeScript detected')
    })

    it('should detect TypeScript from .ts files', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({ dependencies: { react: '^18.0.0' } }))
      writeFileSync(join(TEST_DIR, 'App.tsx'), 'export default function App() {}')

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.language).toBe('typescript')
    })

    it('should detect styled-components', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            'styled-components': '^5.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.cssInJs).toContain('styled-components')
      expect(result.indicators.some((i) => i.includes('CSS-in-JS: styled-components'))).toBe(true)
    })

    it('should detect emotion', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            '@emotion/react': '^11.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.cssInJs).toContain('emotion')
    })

    it('should detect Redux', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            redux: '^4.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement).toContain('redux')
      expect(result.indicators.some((i) => i.includes('State Management: redux'))).toBe(true)
    })

    it('should detect Zustand', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            zustand: '^4.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement).toContain('zustand')
    })

    it('should detect Pinia for Vue', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            vue: '^3.0.0',
            pinia: '^2.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.stateManagement).toContain('pinia')
    })

    it('should detect Vite as build tool', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            vite: '^5.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.buildTool).toBe('vite')
      expect(result.indicators.some((i) => i.includes('Build Tool: vite'))).toBe(true)
    })

    it('should detect Webpack as build tool', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            webpack: '^5.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.buildTool).toBe('webpack')
    })

    it('should detect multiple CSS-in-JS libraries', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            'styled-components': '^5.0.0',
            '@emotion/react': '^11.0.0',
          },
        }),
      )

      const result = detectFramework(TEST_DIR)

      expect(result.configuration.cssInJs.length).toBeGreaterThan(1)
      expect(result.configuration.cssInJs).toContain('styled-components')
      expect(result.configuration.cssInJs).toContain('emotion')
    })

    it('should detect multiple state management libraries', () => {
      writeFileSync(
        join(TEST_DIR, 'package.json'),
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
            redux: '^4.0.0',
            zustand: '^4.0.0',
          },
        }),
      )

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

