import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { glob } from 'glob'
import type { Framework } from '@julien-lin/universal-pwa-core'

export type Environment = 'local' | 'production'

export interface EnvironmentDetectionResult {
  environment: Environment
  confidence: 'high' | 'medium' | 'low'
  indicators: string[]
  suggestedOutputDir: string
}

/**
 * Détecte si le projet est en mode développement (local) ou production (build)
 */
export function detectEnvironment(
  projectPath: string,
  framework: Framework | null,
): EnvironmentDetectionResult {
  const indicators: string[] = []
  let environment: Environment = 'local'
  let confidence: 'high' | 'medium' | 'low' = 'low'
  let suggestedOutputDir = 'public'

  const distDir = join(projectPath, 'dist')
  const publicDir = join(projectPath, 'public')
  const buildDir = join(projectPath, 'build')

  // Vérifier présence de dist/ avec fichiers buildés
  if (existsSync(distDir)) {
    try {
      const distFiles = glob.sync('**/*.{js,css,html}', {
        cwd: distDir,
        absolute: false,
        maxDepth: 2,
      })

      if (distFiles.length > 0) {
        indicators.push(`dist/ directory exists with ${distFiles.length} built files`)
        
        // Vérifier si les fichiers sont récents (build récent = production)
        const recentFiles = distFiles.filter((file) => {
          try {
            const filePath = join(distDir, file)
            const stats = statSync(filePath)
            const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60)
            return ageInHours < 24 // Fichiers modifiés dans les 24 dernières heures
          } catch {
            return false
          }
        })

        if (recentFiles.length > 0) {
          indicators.push(`${recentFiles.length} recent files in dist/ (last 24h)`)
          environment = 'production'
          confidence = 'high'
          suggestedOutputDir = 'dist'
        } else {
          indicators.push('dist/ exists but files are old (may be stale)')
          // Peut être production mais build ancien, ou local avec dist/ créé manuellement
          environment = 'production'
          confidence = 'medium'
          suggestedOutputDir = 'dist'
        }
      } else {
        indicators.push('dist/ directory exists but is empty')
      }
    } catch {
      // Ignore errors
    }
  }

  // Vérifier présence de build/ (React Create React App, etc.)
  if (existsSync(buildDir) && environment === 'local') {
    try {
      const buildFiles = glob.sync('**/*.{js,css,html}', {
        cwd: buildDir,
        absolute: false,
        maxDepth: 2,
      })

      if (buildFiles.length > 0) {
        indicators.push(`build/ directory exists with ${buildFiles.length} built files`)
        environment = 'production'
        confidence = 'high'
        suggestedOutputDir = 'build'
      }
    } catch {
      // Ignore errors
    }
  }

  // Pour React/Vite, si dist/ existe, c'est très probablement production
  if ((framework === 'React' || framework === 'Vite') && existsSync(distDir)) {
    if (environment === 'local') {
      environment = 'production'
      confidence = 'medium'
      suggestedOutputDir = 'dist'
      indicators.push('React/Vite project with dist/ directory (likely production)')
    }
  }

  // Si aucun indicateur de production, rester en local
  if (environment === 'local' && indicators.length === 0) {
    indicators.push('No production build detected, using local mode')
    confidence = 'medium'
    suggestedOutputDir = 'public'
  }

  return {
    environment,
    confidence,
    indicators,
    suggestedOutputDir,
  }
}

