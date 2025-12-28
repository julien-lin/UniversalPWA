import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { globSync } from 'glob'

export type Framework =
  | 'wordpress'
  | 'drupal'
  | 'joomla'
  | 'magento'
  | 'shopify'
  | 'woocommerce'
  | 'prestashop'
  | 'symfony'
  | 'laravel'
  | 'codeigniter'
  | 'cakephp'
  | 'yii'
  | 'laminas'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'rails'
  | 'sinatra'
  | 'go'
  | 'spring'
  | 'aspnet'
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
      // Check for WooCommerce
      if (existsSync(join(projectPath, 'wp-content', 'plugins', 'woocommerce'))) {
        indicators.push('wp-content/plugins/woocommerce/')
        framework = 'woocommerce'
        confidence = 'high'
        return { framework, confidence, indicators }
      }
      framework = 'wordpress'
      confidence = 'high'
      return { framework, confidence, indicators }
    }
  }

  // Drupal
  if (existsSync(join(projectPath, 'sites')) && existsSync(join(projectPath, 'modules'))) {
    indicators.push('sites/ and modules/ (Drupal)')
    if (existsSync(join(projectPath, 'themes'))) {
      indicators.push('themes/')
      framework = 'drupal'
      confidence = 'high'
      return { framework, confidence, indicators }
    }
  }

  // Joomla
  if (existsSync(join(projectPath, 'configuration.php'))) {
    indicators.push('configuration.php (Joomla)')
    if (existsSync(join(projectPath, 'administrator'))) {
      indicators.push('administrator/')
      framework = 'joomla'
      confidence = 'high'
      return { framework, confidence, indicators }
    }
  }

  // Shopify (détection via fichiers de thème - avant composer.json pour éviter conflits)
  if (existsSync(join(projectPath, 'theme.liquid')) || existsSync(join(projectPath, 'config', 'settings_schema.json'))) {
    indicators.push('theme.liquid or config/settings_schema.json (Shopify)')
    framework = 'shopify'
    confidence = 'high'
    return { framework, confidence, indicators }
  }

  // PHP frameworks & CMS via composer.json
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

      // Magento (priorité haute car e-commerce spécifique)
      if (dependencies['magento/product-community-edition'] || dependencies['magento/product-enterprise-edition']) {
        indicators.push('composer.json: magento/*')
        if (existsSync(join(projectPath, 'app')) && existsSync(join(projectPath, 'pub'))) {
          indicators.push('app/ and pub/')
          framework = 'magento'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // PrestaShop (priorité haute car e-commerce spécifique)
      if (dependencies['prestashop/prestashop']) {
        indicators.push('composer.json: prestashop/prestashop')
        if (existsSync(join(projectPath, 'config')) && existsSync(join(projectPath, 'themes'))) {
          indicators.push('config/ and themes/')
          framework = 'prestashop'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      }

      // Symfony
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

  // Python frameworks
  if (!framework) {
    // Django
    if (existsSync(join(projectPath, 'manage.py')) && existsSync(join(projectPath, 'settings.py'))) {
      indicators.push('manage.py and settings.py (Django)')
      framework = 'django'
      confidence = 'high'
      return { framework, confidence, indicators }
    }
    // Django alternative: check for django/ directory
    if (existsSync(join(projectPath, 'manage.py')) && existsSync(join(projectPath, 'django'))) {
      indicators.push('manage.py and django/ (Django)')
      framework = 'django'
      confidence = 'high'
      return { framework, confidence, indicators }
    }

    // Flask
    const requirementsPath = join(projectPath, 'requirements.txt')
    if (existsSync(requirementsPath)) {
      try {
        const requirementsContent = readFileSync(requirementsPath, 'utf-8')
        if (requirementsContent.includes('Flask') || requirementsContent.includes('flask')) {
          indicators.push('requirements.txt: Flask')
          if (existsSync(join(projectPath, 'app.py')) || existsSync(join(projectPath, 'application.py'))) {
            indicators.push('app.py or application.py')
            framework = 'flask'
            confidence = 'high'
            return { framework, confidence, indicators }
          }
        }
        // FastAPI
        if (requirementsContent.includes('fastapi') || requirementsContent.includes('FastAPI')) {
          indicators.push('requirements.txt: FastAPI')
          framework = 'fastapi'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // Ruby frameworks
  if (!framework) {
    const gemfilePath = join(projectPath, 'Gemfile')
    if (existsSync(gemfilePath)) {
      try {
        const gemfileContent = readFileSync(gemfilePath, 'utf-8')
        // Rails
        if (gemfileContent.includes("gem 'rails'") || gemfileContent.includes('gem "rails"')) {
          indicators.push('Gemfile: rails')
          if (existsSync(join(projectPath, 'config', 'application.rb')) || existsSync(join(projectPath, 'config', 'routes.rb'))) {
            indicators.push('config/application.rb or config/routes.rb')
            framework = 'rails'
            confidence = 'high'
            return { framework, confidence, indicators }
          }
        }
        // Sinatra
        if (gemfileContent.includes("gem 'sinatra'") || gemfileContent.includes('gem "sinatra"')) {
          indicators.push('Gemfile: sinatra')
          if (existsSync(join(projectPath, 'app.rb')) || existsSync(join(projectPath, 'main.rb'))) {
            indicators.push('app.rb or main.rb')
            framework = 'sinatra'
            confidence = 'high'
            return { framework, confidence, indicators }
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // Go
  if (!framework) {
    if (existsSync(join(projectPath, 'go.mod'))) {
      try {
        const goModContent = readFileSync(join(projectPath, 'go.mod'), 'utf-8')
        // Check if it's a web project (has HTTP server dependencies)
        if (
          goModContent.includes('net/http') ||
          existsSync(join(projectPath, 'main.go')) ||
          existsSync(join(projectPath, 'server.go'))
        ) {
          // Check main.go for HTTP server patterns
          const mainGoPath = join(projectPath, 'main.go')
          if (existsSync(mainGoPath)) {
            try {
              const mainGoContent = readFileSync(mainGoPath, 'utf-8')
              if (mainGoContent.includes('http.ListenAndServe') || mainGoContent.includes('http.Server')) {
                indicators.push('go.mod and main.go with HTTP server')
                framework = 'go'
                confidence = 'high'
                return { framework, confidence, indicators }
              }
            } catch {
              // Ignore read errors
            }
          }
          // Also check server.go
          const serverGoPath = join(projectPath, 'server.go')
          if (existsSync(serverGoPath)) {
            try {
              const serverGoContent = readFileSync(serverGoPath, 'utf-8')
              if (serverGoContent.includes('http.ListenAndServe') || serverGoContent.includes('http.Server')) {
                indicators.push('go.mod and server.go with HTTP server')
                framework = 'go'
                confidence = 'high'
                return { framework, confidence, indicators }
              }
            } catch {
              // Ignore read errors
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // Java - Spring Boot
  if (!framework) {
    const pomXmlPath = join(projectPath, 'pom.xml')
    const buildGradlePath = join(projectPath, 'build.gradle')
    
    if (existsSync(pomXmlPath)) {
      try {
        const pomContent = readFileSync(pomXmlPath, 'utf-8')
        if (pomContent.includes('spring-boot-starter') || pomContent.includes('org.springframework.boot')) {
          indicators.push('pom.xml: spring-boot')
          framework = 'spring'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      } catch {
        // Ignore read errors
      }
    }

    if (existsSync(buildGradlePath)) {
      try {
        const gradleContent = readFileSync(buildGradlePath, 'utf-8')
        if (gradleContent.includes('spring-boot') || gradleContent.includes('org.springframework.boot')) {
          indicators.push('build.gradle: spring-boot')
          framework = 'spring'
          confidence = 'high'
          return { framework, confidence, indicators }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  // .NET - ASP.NET Core
  if (!framework) {
    // Look for .csproj files
    try {
      const csprojMatches = globSync('*.csproj', { cwd: projectPath, absolute: false })
      if (csprojMatches.length > 0) {
        // Check for ASP.NET Core patterns
        const firstCsproj = join(projectPath, csprojMatches[0])
        try {
          const csprojContent = readFileSync(firstCsproj, 'utf-8')
          if (csprojContent.includes('Microsoft.AspNetCore') || csprojContent.includes('Microsoft.NET.Sdk.Web')) {
            indicators.push(`${csprojMatches[0]}: ASP.NET Core`)
            // Check for Program.cs or Startup.cs
            if (existsSync(join(projectPath, 'Program.cs')) || existsSync(join(projectPath, 'Startup.cs'))) {
              indicators.push('Program.cs or Startup.cs')
              framework = 'aspnet'
              confidence = 'high'
              return { framework, confidence, indicators }
            }
          }
        } catch {
          // Ignore read errors
        }
      }
    } catch {
      // Ignore glob errors
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

