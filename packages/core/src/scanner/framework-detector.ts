import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export type Framework =
  | 'wordpress'
  | 'symfony'
  | 'laravel'
  | 'codeigniter'
  | 'cakephp'
  | 'yii'
  | 'laminas'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'nuxt'
  | 'svelte'
  | 'sveltekit'
  | 'remix'
  | 'astro'
  | 'solidjs'
  | 'static'

export interface FrameworkDetectionResult {
  framework: Framework | null
  confidence: 'high' | 'medium' | 'low'
  indicators: string[]
}

/**
 * Détecte le framework utilisé dans un projet
 */
export function detectFramework(projectPath: string): FrameworkDetectionResult {
  const indicators: string[] = []
  let framework: Framework | null = null
  let confidence: 'high' | 'medium' | 'low' = 'low'

  // WordPress
  if (existsSync(join(projectPath, 'wp-config.php'))) {
    indicators.push('wp-config.php')
    if (existsSync(join(projectPath, 'wp-content'))) {
      indicators.push('wp-content/')
      framework = 'wordpress'
      confidence = 'high'
      return { framework, confidence, indicators }
    }
  }

  // Symfony
  const composerPath = join(projectPath, 'composer.json')
  if (existsSync(composerPath)) {
    try {
      const composerContent = JSON.parse(readFileSync(composerPath, 'utf-8')) as {
        require?: Record<string, string>
        'require-dev'?: Record<string, string>
      }
      const dependencies = {
        ...(composerContent.require ?? {}),
        ...(composerContent['require-dev'] ?? {}),
      }

      if (dependencies['symfony/symfony'] || dependencies['symfony/framework-bundle']) {
        indicators.push('composer.json: symfony/*')
        if (existsSync(join(projectPath, 'public'))) {
          indicators.push('public/')
          framework = 'symfony'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Laravel
      if (dependencies['laravel/framework']) {
        indicators.push('composer.json: laravel/framework')
        if (existsSync(join(projectPath, 'public'))) {
          indicators.push('public/')
          framework = 'laravel'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // CodeIgniter
      if (dependencies['codeigniter4/framework']) {
        indicators.push('composer.json: codeigniter4/framework')
        if (existsSync(join(projectPath, 'public'))) {
          indicators.push('public/')
          framework = 'codeigniter'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // CakePHP
      if (dependencies['cakephp/cakephp']) {
        indicators.push('composer.json: cakephp/cakephp')
        if (existsSync(join(projectPath, 'webroot')) || existsSync(join(projectPath, 'public'))) {
          indicators.push('webroot/ or public/')
          framework = 'cakephp'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Yii
      if (dependencies['yiisoft/yii2'] || dependencies['yiisoft/yii']) {
        indicators.push('composer.json: yiisoft/*')
        if (existsSync(join(projectPath, 'web')) || existsSync(join(projectPath, 'public'))) {
          indicators.push('web/ or public/')
          framework = 'yii'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Laminas (anciennement Zend Framework)
      if (dependencies['laminas/laminas-mvc'] || dependencies['laminas/laminas-component-installer']) {
        indicators.push('composer.json: laminas/*')
        if (existsSync(join(projectPath, 'public'))) {
          indicators.push('public/')
          framework = 'laminas'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // React/Vue/Angular/Next/Nuxt
  const packageJsonPath = join(projectPath, 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const packageContent = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        dependencies?: Record<string, string>
        devDependencies?: Record<string, string>
      }
      const dependencies = {
        ...(packageContent.dependencies ?? {}),
        ...(packageContent.devDependencies ?? {}),
      }

      // Next.js
      if (dependencies.next) {
        indicators.push('package.json: next')
        if (existsSync(join(projectPath, '.next'))) {
          indicators.push('.next/')
          framework = 'nextjs'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Nuxt
      if (dependencies.nuxt) {
        indicators.push('package.json: nuxt')
        if (existsSync(join(projectPath, '.nuxt'))) {
          indicators.push('.nuxt/')
          framework = 'nuxt'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // React
      if (dependencies.react) {
        indicators.push('package.json: react')
        framework = 'react'
        confidence = framework ? 'high' : 'medium'
      }

      // Vue
      if (dependencies.vue) {
        indicators.push('package.json: vue')
        if (!framework) {
          framework = 'vue'
          confidence = 'high'
        }
      }

      // Angular
      if (dependencies['@angular/core']) {
        indicators.push('package.json: @angular/core')
        if (!framework) {
          framework = 'angular'
          confidence = 'high'
        }
      }

      // SvelteKit (priorité sur Svelte car framework complet)
      if (dependencies['@sveltejs/kit']) {
        indicators.push('package.json: @sveltejs/kit')
        if (existsSync(join(projectPath, '.svelte-kit'))) {
          indicators.push('.svelte-kit/')
          framework = 'sveltekit'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Svelte (standalone, sans SvelteKit)
      if (dependencies.svelte && !dependencies['@sveltejs/kit']) {
        indicators.push('package.json: svelte')
        if (!framework) {
          framework = 'svelte'
          confidence = 'high'
        }
      }

      // Remix
      if (dependencies['@remix-run/node'] || dependencies['@remix-run/react']) {
        indicators.push('package.json: @remix-run/*')
        if (existsSync(join(projectPath, 'app'))) {
          indicators.push('app/')
          framework = 'remix'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Astro
      if (dependencies.astro) {
        indicators.push('package.json: astro')
        if (existsSync(join(projectPath, '.astro'))) {
          indicators.push('.astro/')
          framework = 'astro'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // SolidJS
      if (dependencies['solid-js']) {
        indicators.push('package.json: solid-js')
        if (!framework) {
          framework = 'solidjs'
          confidence = 'high'
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Static (if no framework detected and HTML files present)
  if (!framework) {
    const htmlFiles = ['index.html', 'index.htm']
    const hasHtml = htmlFiles.some((file) => existsSync(join(projectPath, file)))
    if (hasHtml) {
      indicators.push('HTML files present')
      framework = 'static'
      confidence = 'medium'
    }
  }

  return { framework, confidence, indicators }
}

