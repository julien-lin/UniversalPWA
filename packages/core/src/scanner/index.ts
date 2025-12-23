import { existsSync } from 'fs'
import { detectFramework, type FrameworkDetectionResult } from './framework-detector'
import { detectAssets, type AssetDetectionResult } from './asset-detector'
import { detectArchitecture, type ArchitectureDetectionResult } from './architecture-detector'

export interface ScannerResult {
  framework: FrameworkDetectionResult
  assets: AssetDetectionResult
  architecture: ArchitectureDetectionResult
  timestamp: string
  projectPath: string
}

export interface ScannerOptions {
  projectPath: string
  includeAssets?: boolean
  includeArchitecture?: boolean
}

/**
 * Orchestrateur principal du scanner
 * Combine les résultats de détection framework, assets et architecture
 */
export async function scanProject(options: ScannerOptions): Promise<ScannerResult> {
  const { projectPath, includeAssets = true, includeArchitecture = true } = options

  // Détection framework (synchrone)
  const framework = detectFramework(projectPath)

  // Détection assets (asynchrone)
  const assets = includeAssets ? await detectAssets(projectPath) : getEmptyAssets()

  // Détection architecture (asynchrone)
  const architecture = includeArchitecture ? await detectArchitecture(projectPath) : getEmptyArchitecture()

  return {
    framework,
    assets,
    architecture,
    timestamp: new Date().toISOString(),
    projectPath,
  }
}

/**
 * Génère un rapport JSON du scan
 */
export function generateReport(result: ScannerResult): string {
  return JSON.stringify(result, null, 2)
}

/**
 * Valide qu'un chemin de projet existe
 */
export function validateProjectPath(projectPath: string): boolean {
  try {
    return existsSync(projectPath)
  } catch {
    return false
  }
}

// Helpers pour les résultats vides
function getEmptyAssets(): AssetDetectionResult {
  return {
    javascript: [],
    css: [],
    images: [],
    fonts: [],
    apiRoutes: [],
  }
}

function getEmptyArchitecture(): ArchitectureDetectionResult {
  return {
    architecture: 'static',
    buildTool: null,
    confidence: 'low',
    indicators: [],
  }
}

// Ré-exporter les types et fonctions pour faciliter l'utilisation
export type { FrameworkDetectionResult, Framework } from './framework-detector'
export type { AssetDetectionResult } from './asset-detector'
export type { ArchitectureDetectionResult, Architecture, BuildTool } from './architecture-detector'

export { detectFramework } from './framework-detector'
export { detectAssets } from './asset-detector'
export { detectArchitecture } from './architecture-detector'

