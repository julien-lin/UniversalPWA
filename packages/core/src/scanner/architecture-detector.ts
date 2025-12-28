import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'

export type Architecture = 'spa' | 'ssr' | 'static'

export type BuildTool = 'vite' | 'webpack' | 'rollup' | 'esbuild' | 'parcel' | 'turbopack' | 'unknown'

export interface ArchitectureDetectionResult {
  architecture: Architecture
  buildTool: BuildTool | null
  confidence: 'high' | 'medium' | 'low'
  indicators: string[]
}

/**
 * Détecte l'architecture d'un projet (SPA, SSR, statique)
 */
export async function detectArchitecture(projectPath: string): Promise<ArchitectureDetectionResult> {
  const indicators: string[] = []
  let architecture: Architecture = 'static'
  let buildTool: BuildTool | null = null
  let confidence: 'high' | 'medium' | 'low' = 'low'

  // Build tools detection
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

      if (dependencies.vite || packageContent.devDependencies?.['vite']) {
        indicators.push('package.json: vite')
        buildTool = 'vite'
        confidence = 'high'
      } else if (dependencies.webpack || packageContent.devDependencies?.['webpack']) {
        indicators.push('package.json: webpack')
        buildTool = 'webpack'
        confidence = 'high'
      } else if (dependencies.rollup || packageContent.devDependencies?.['rollup']) {
        indicators.push('package.json: rollup')
        buildTool = 'rollup'
        confidence = 'high'
      } else if (dependencies.esbuild || packageContent.devDependencies?.['esbuild']) {
        indicators.push('package.json: esbuild')
        buildTool = 'esbuild'
        confidence = 'high'
      } else if (dependencies.parcel || packageContent.devDependencies?.['parcel']) {
        indicators.push('package.json: parcel')
        buildTool = 'parcel'
        confidence = 'high'
      } else if (dependencies['@turbo/gen'] || packageContent.devDependencies?.['@turbo/gen']) {
        indicators.push('package.json: turbopack')
        buildTool = 'turbopack'
        confidence = 'high'
      }

      // Next.js/Nuxt/SvelteKit/Remix/Astro detection (SSR by default) - Priority
      if (dependencies.next || packageContent.dependencies?.['next'] || packageContent.devDependencies?.['next']) {
        architecture = 'ssr'
        confidence = 'high'
        indicators.push('Next.js detected → SSR')
      } else if (dependencies.nuxt || packageContent.dependencies?.['nuxt'] || packageContent.devDependencies?.['nuxt']) {
        architecture = 'ssr'
        confidence = 'high'
        indicators.push('Nuxt detected → SSR')
      } else if (dependencies['@sveltejs/kit'] || packageContent.dependencies?.['@sveltejs/kit'] || packageContent.devDependencies?.['@sveltejs/kit']) {
        architecture = 'ssr'
        confidence = 'high'
        indicators.push('SvelteKit detected → SSR')
      } else if (dependencies['@remix-run/node'] || dependencies['@remix-run/react'] || packageContent.dependencies?.['@remix-run/node'] || packageContent.devDependencies?.['@remix-run/node']) {
        architecture = 'ssr'
        confidence = 'high'
        indicators.push('Remix detected → SSR')
      } else if (dependencies.astro || packageContent.dependencies?.['astro'] || packageContent.devDependencies?.['astro']) {
        architecture = 'ssr'
        confidence = 'high'
        indicators.push('Astro detected → SSR')
      } else if (dependencies.svelte && !dependencies['@sveltejs/kit']) {
        // Svelte standalone (sans SvelteKit) = SPA
        architecture = 'spa'
        confidence = 'high'
        indicators.push('Svelte detected → SPA')
      } else if (dependencies['solid-js'] || packageContent.dependencies?.['solid-js'] || packageContent.devDependencies?.['solid-js']) {
        architecture = 'spa'
        confidence = 'high'
        indicators.push('SolidJS detected → SPA')
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Detection via HTML files (only if Next.js/Nuxt not already detected)
  // Use multiple patterns to ensure finding files at root
  const htmlPatterns = ['**/*.html', '*.html', 'index.html']
  const allHtmlFiles = new Set<string>()
  for (const pattern of htmlPatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.nuxt/**'],
      absolute: false,
      nodir: true,
    })
    files.forEach((f) => allHtmlFiles.add(f))
  }

  if (allHtmlFiles.size > 0 && architecture !== 'ssr') {
    // Analyze first HTML file found (prefer index.html)
    const htmlArray = Array.from(allHtmlFiles)
    const firstHtml = htmlArray.find((f) => f === 'index.html' || f.endsWith('/index.html')) || htmlArray[0]
    const htmlPath = join(projectPath, firstHtml)

    try {
      const htmlContent = readFileSync(htmlPath, 'utf-8').toLowerCase()

      // Patterns SPA
      const spaPatterns = [
        /<div[^>]*id=["']root["']/i,
        /<div[^>]*id=["']app["']/i,
        /<div[^>]*id=["']main["']/i,
        /react-dom/i,
        /mount\(/i,
        /createRoot\(/i,
      ]

      // Patterns SSR
      const ssrPatterns = [
        /<body[^>]*>[\s\S]{100,}/i, // Body avec beaucoup de contenu
        /<article/i,
        /<main[^>]*>[\s\S]{50,}/i,
        /hydrat/i,
        /__next/i,
        /__next_data__/i,
        /nuxt/i,
      ]

      const hasSpaPattern = spaPatterns.some((pattern) => pattern.test(htmlContent))
      const hasSsrPattern = ssrPatterns.some((pattern) => pattern.test(htmlContent))
      const isLargeContent = htmlContent.length > 2000
      const hasRealContent = htmlContent.replace(/<[^>]+>/g, '').trim().length > 100

      // Prioritize SSR if very large content with real content
      if (isLargeContent && hasRealContent && !hasSsrPattern) {
        indicators.push('HTML: very large content with real text → SSR')
        if (hasSpaPattern) {
          indicators.push('HTML: SPA pattern but large content → SSR')
        }
        architecture = 'ssr'
        confidence = 'high'
      } else if (hasSsrPattern && htmlContent.length > 1000) {
        indicators.push('HTML: SSR patterns detected (large content)')
        if (isLargeContent && hasRealContent) {
          indicators.push('HTML: very large content with real text → SSR')
        }
        if (hasSpaPattern) {
          indicators.push('HTML: SPA pattern but large content → SSR')
        }
        architecture = 'ssr'
        confidence = 'high'
      } else if (hasSsrPattern && !hasSpaPattern) {
        indicators.push('HTML: SSR patterns detected')
        if (htmlContent.length > 500) {
          indicators.push('HTML: large content')
        }
        architecture = 'ssr'
        confidence = 'high'
      } else if (hasSpaPattern) {
        // SPA pattern detected - prioritize SPA unless very large content with real text
        if (isLargeContent && hasRealContent) {
          // Contenu large avec pattern SPA = probablement SSR avec hydration
          indicators.push('HTML: SPA pattern but large content → SSR')
          architecture = 'ssr'
          confidence = 'medium'
        } else {
          indicators.push('HTML: SPA patterns detected')
          architecture = 'spa'
          confidence = 'high'
        }
      } else if (htmlContent.length > 500) {
        // HTML avec beaucoup de contenu = probablement SSR ou statique
        indicators.push('HTML: large content')
        architecture = 'ssr'
        confidence = 'medium'
      } else {
        indicators.push('HTML: minimal content')
        architecture = 'static'
        confidence = 'medium'
      }
    } catch {
      // Ignore read errors
    }
  }

  // Detection via JS/TS files (router patterns)
  const jsFiles = await glob('**/*.{js,ts,tsx,jsx}', {
    cwd: projectPath,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.nuxt/**', '**/*.test.*', '**/*.spec.*'],
    absolute: false,
    nodir: true,
  })

  if (jsFiles.length > 0 && architecture === 'static') {
    // Chercher des patterns de router client-side
    let routerFilesFound = 0
    for (const jsFile of jsFiles.slice(0, 10)) {
      // Limit to 10 files for performance
      try {
        const jsPath = join(projectPath, jsFile)
        const jsContent = readFileSync(jsPath, 'utf-8').toLowerCase()

        const routerPatterns = [
          /react-router/i,
          /vue-router/i,
          /@angular\/router/i,
          /next\/router/i,
          /nuxt/i,
          /createBrowserRouter/i,
          /BrowserRouter/i,
          /Router/i,
        ]

        if (routerPatterns.some((pattern) => pattern.test(jsContent))) {
          routerFilesFound++
        }
      } catch {
        // Ignore read errors
      }
    }

    if (routerFilesFound > 0) {
      indicators.push(`JS: router patterns found (${routerFilesFound} files)`)
      if (architecture === 'static') {
        architecture = 'spa'
        confidence = confidence === 'low' ? 'medium' : confidence
      }
    }
  }


  return { architecture, buildTool, confidence, indicators }
}

