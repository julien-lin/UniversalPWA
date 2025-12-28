import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { globSync } from 'glob'
import type { Framework } from '@julien-lin/universal-pwa-core'

export interface NameSuggestion {
  name: string
  shortName: string
  source: 'package.json' | 'composer.json' | 'directory' | 'default'
  confidence: 'high' | 'medium' | 'low'
}

export interface IconSuggestion {
  path: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

export interface ColorSuggestion {
  themeColor: string
  backgroundColor: string
  source: 'framework' | 'icon' | 'default'
  confidence: 'high' | 'medium' | 'low'
}

export interface ConfigurationSuggestion {
  outputDir: string
  skipIcons: boolean
  skipServiceWorker: boolean
  reason: string
}

/**
 * Suggère un nom d'application basé sur package.json, composer.json ou le nom du répertoire
 */
export function suggestAppName(projectPath: string, _framework: Framework | null): NameSuggestion {
  // Essayer package.json (Node.js)
  const packageJsonPath = join(projectPath, 'package.json')
  if (existsSync(packageJsonPath)) {
    try {
      const packageContent = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        name?: string
        displayName?: string
        productName?: string
      }

      const name = packageContent.displayName || packageContent.productName || packageContent.name
      if (name && typeof name === 'string' && name.trim().length > 0) {
        const cleanName = name.trim()
        // Nettoyer le nom (enlever scope npm, etc.)
        const finalName = cleanName.replace(/^@[^/]+\//, '').replace(/[-_]/g, ' ')
        const shortName = finalName.length <= 12 ? finalName : finalName.substring(0, 12)

        return {
          name: finalName,
          shortName,
          source: 'package.json',
          confidence: 'high',
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Essayer composer.json (PHP)
  const composerJsonPath = join(projectPath, 'composer.json')
  if (existsSync(composerJsonPath)) {
    try {
      const composerContent = JSON.parse(readFileSync(composerJsonPath, 'utf-8')) as {
        name?: string
        description?: string
      }

      if (composerContent.name && typeof composerContent.name === 'string') {
        // Format: vendor/package-name
        const parts = composerContent.name.split('/')
        const packageName = parts[parts.length - 1] || composerContent.name
        const cleanName = packageName.replace(/[-_]/g, ' ')
        const shortName = cleanName.length <= 12 ? cleanName : cleanName.substring(0, 12)

        return {
          name: cleanName,
          shortName,
          source: 'composer.json',
          confidence: 'high',
        }
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  // Fallback: nom du répertoire
  const dirName = projectPath.split(/[/\\]/).pop() || 'My App'
  const cleanDirName = dirName.replace(/[-_]/g, ' ')
  const shortName = cleanDirName.length <= 12 ? cleanDirName : cleanDirName.substring(0, 12)

  return {
    name: cleanDirName,
    shortName,
    source: 'directory',
    confidence: 'medium',
  }
}

/**
 * Suggère un chemin d'icône en recherchant automatiquement des images
 */
export function suggestIconPath(projectPath: string): IconSuggestion[] {
  const suggestions: IconSuggestion[] = []
  const commonIconPaths = [
    'logo.png',
    'logo.svg',
    'logo.jpg',
    'icon.png',
    'icon.svg',
    'favicon.png',
    'favicon.ico',
    'app-icon.png',
    'app-icon.svg',
    'assets/logo.png',
    'assets/icon.png',
    'public/logo.png',
    'public/icon.png',
    'src/assets/logo.png',
    'src/assets/icon.png',
    'static/logo.png',
    'static/icon.png',
  ]

  // Rechercher dans les chemins communs
  for (const iconPath of commonIconPaths) {
    const fullPath = join(projectPath, iconPath)
    if (existsSync(fullPath)) {
      suggestions.push({
        path: iconPath,
        confidence: 'high',
        reason: `Found at common location: ${iconPath}`,
      })
    }
  }

  // Recherche globale d'images (limité à 10 résultats)
  try {
    const imageFiles = globSync('**/*.{png,svg,jpg,jpeg,webp}', {
      cwd: projectPath,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      absolute: false,
      maxDepth: 3,
    })

    // Filtrer les images qui ressemblent à des icônes/logos
    const iconLikeFiles = imageFiles
      .filter((file) => {
        const lowerFile = file.toLowerCase()
        return (
          lowerFile.includes('logo') ||
          lowerFile.includes('icon') ||
          lowerFile.includes('favicon') ||
          lowerFile.includes('app-icon') ||
          lowerFile.includes('brand')
        )
      })
      .slice(0, 5) // Limiter à 5 résultats

    for (const file of iconLikeFiles) {
      if (!suggestions.some((s) => s.path === file)) {
        suggestions.push({
          path: file,
          confidence: 'medium',
          reason: `Found icon-like image: ${file}`,
        })
      }
    }
  } catch {
    // Ignore glob errors
  }

  return suggestions
}

/**
 * Suggère des couleurs basées sur le framework ou une icône
 */
export function suggestColors(
  _projectPath: string,
  framework: Framework | null,
  _iconPath?: string,
): ColorSuggestion {
  // Si une icône est fournie, on pourrait analyser les couleurs (future enhancement)
  // Pour l'instant, on se base sur le framework

  const frameworkColors: Record<string, { themeColor: string; backgroundColor: string }> = {
    react: { themeColor: '#61dafb', backgroundColor: '#282c34' },
    vue: { themeColor: '#42b983', backgroundColor: '#ffffff' },
    angular: { themeColor: '#dd0031', backgroundColor: '#ffffff' },
    nextjs: { themeColor: '#000000', backgroundColor: '#ffffff' },
    nuxt: { themeColor: '#00dc82', backgroundColor: '#ffffff' },
    svelte: { themeColor: '#ff3e00', backgroundColor: '#ffffff' },
    sveltekit: { themeColor: '#ff3e00', backgroundColor: '#ffffff' },
    remix: { themeColor: '#000000', backgroundColor: '#ffffff' },
    astro: { themeColor: '#000000', backgroundColor: '#ffffff' },
    solidjs: { themeColor: '#2c4f7c', backgroundColor: '#ffffff' },
    wordpress: { themeColor: '#21759b', backgroundColor: '#ffffff' },
    symfony: { themeColor: '#000000', backgroundColor: '#ffffff' },
    laravel: { themeColor: '#ff2d20', backgroundColor: '#ffffff' },
    codeigniter: { themeColor: '#ee4323', backgroundColor: '#ffffff' },
    cakephp: { themeColor: '#d33c43', backgroundColor: '#ffffff' },
    yii: { themeColor: '#0073aa', backgroundColor: '#ffffff' },
    laminas: { themeColor: '#68b604', backgroundColor: '#ffffff' },
  }

  if (framework && frameworkColors[framework.toLowerCase()]) {
    return {
      ...frameworkColors[framework.toLowerCase()],
      source: 'framework',
      confidence: 'high',
    }
  }

  // Défaut universel
  return {
    themeColor: '#ffffff',
    backgroundColor: '#000000',
    source: 'default',
    confidence: 'low',
  }
}

/**
 * Suggère une configuration selon le type de projet
 */
export function suggestConfiguration(
  projectPath: string,
  framework: Framework | null,
  _architecture: 'spa' | 'ssr' | 'static' | null,
): ConfigurationSuggestion {
  const distDir = join(projectPath, 'dist')
  const buildDir = join(projectPath, 'build')
  const publicDir = join(projectPath, 'public')

  // Déterminer le répertoire de sortie
  let outputDir = 'public'
  let reason = 'Default output directory'

  if (existsSync(distDir)) {
    outputDir = 'dist'
    reason = 'dist/ directory detected (production build)'
  } else if (existsSync(buildDir)) {
    outputDir = 'build'
    reason = 'build/ directory detected (production build)'
  } else if (existsSync(publicDir)) {
    outputDir = 'public'
    reason = 'public/ directory detected'
  } else if (framework === 'wordpress' || framework === 'drupal' || framework === 'joomla') {
    outputDir = 'public'
    reason = 'CMS project, using public/ directory'
  }

  // Suggestions pour skipIcons et skipServiceWorker
  const skipIcons = false // Toujours générer les icônes par défaut
  const skipServiceWorker = false // Toujours générer le service worker par défaut

  return {
    outputDir,
    skipIcons,
    skipServiceWorker,
    reason,
  }
}

/**
 * Génère toutes les suggestions pour un projet
 */
export interface ProjectSuggestions {
  name: NameSuggestion
  icons: IconSuggestion[]
  colors: ColorSuggestion
  configuration: ConfigurationSuggestion
}

export function generateSuggestions(
  projectPath: string,
  framework: Framework | null,
  architecture: 'spa' | 'ssr' | 'static' | null,
  iconPath?: string,
): ProjectSuggestions {
  return {
    name: suggestAppName(projectPath, framework),
    icons: suggestIconPath(projectPath),
    colors: suggestColors(projectPath, framework, iconPath),
    configuration: suggestConfiguration(projectPath, framework, architecture),
  }
}

