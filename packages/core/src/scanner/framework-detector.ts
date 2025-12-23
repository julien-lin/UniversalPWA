import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export type Framework =
  | 'wordpress'
  | 'symfony'
  | 'laravel'
  | 'react'
  | 'vue'
  | 'angular'
  | 'nextjs'
  | 'nuxt'
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
      const composerContent = JSON.parse(readFileSync(composerPath, 'utf-8'))
      const dependencies = {
        ...composerContent.require,
        ...composerContent['require-dev'],
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
    } catch {
      // Ignore JSON parse errors
    }
  }

  // React/Vue/Angular/Next/Nuxt
  const packageJsonPath = join(projectPath, 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const packageContent = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
      const dependencies = {
        ...packageContent.dependencies,
        ...packageContent.devDependencies,
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
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Statique (si aucun framework détecté et fichiers HTML présents)
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

