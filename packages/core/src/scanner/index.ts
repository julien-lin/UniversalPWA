import { existsSync } from 'fs'
import { detectFramework, type FrameworkDetectionResult } from './framework-detector.js'
import { detectAssets, type AssetDetectionResult } from './asset-detector.js'
import { detectArchitecture, type ArchitectureDetectionResult } from './architecture-detector.js'

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
  const frameworkCandidate: unknown = (detectFramework as (p: string) => FrameworkDetectionResult)(projectPath)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const framework: FrameworkDetectionResult = isFrameworkDetectionResult(frameworkCandidate)
    ? frameworkCandidate
    : { framework: null, confidence: 'low', indicators: [] }

  // Détection assets (asynchrone)
  const assetsCandidate: unknown = includeAssets
    ? await (detectAssets as (p: string) => Promise<AssetDetectionResult>)(projectPath)
    : getEmptyAssets()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const assets: AssetDetectionResult = isAssetDetectionResult(assetsCandidate) ? assetsCandidate : getEmptyAssets()

  // Détection architecture (asynchrone)
  const architectureCandidate: unknown = includeArchitecture
    ? await (detectArchitecture as (p: string) => Promise<ArchitectureDetectionResult>)(projectPath)
    : getEmptyArchitecture()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const architecture: ArchitectureDetectionResult = isArchitectureDetectionResult(architectureCandidate)
    ? architectureCandidate
    : getEmptyArchitecture()

  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  return {
    framework,
    assets,
    architecture,
    timestamp: new Date().toISOString(),
    projectPath,
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */
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

// Type guards to ensure safe assignments for linting
function isFrameworkDetectionResult(value: unknown): value is FrameworkDetectionResult {
  if (!value || typeof value !== 'object') return false
  const v = value as { framework?: unknown; confidence?: unknown; indicators?: unknown }
  return (
    (v.framework === null || typeof v.framework === 'string') &&
    (v.confidence === 'low' || v.confidence === 'medium' || v.confidence === 'high') &&
    Array.isArray(v.indicators)
  )
}

function isAssetDetectionResult(value: unknown): value is AssetDetectionResult {
  if (!value || typeof value !== 'object') return false
  const v = value as { javascript?: unknown; css?: unknown; images?: unknown; fonts?: unknown; apiRoutes?: unknown }
  const isStringArray = (x: unknown) => Array.isArray(x) && x.every((i) => typeof i === 'string')
  return (
    isStringArray(v.javascript) &&
    isStringArray(v.css) &&
    isStringArray(v.images) &&
    isStringArray(v.fonts) &&
    isStringArray(v.apiRoutes)
  )
}

function isArchitectureDetectionResult(value: unknown): value is ArchitectureDetectionResult {
  if (!value || typeof value !== 'object') return false
  const v = value as { architecture?: unknown; buildTool?: unknown; confidence?: unknown; indicators?: unknown }
  const isArch = v.architecture === 'spa' || v.architecture === 'ssr' || v.architecture === 'static'
  const isBuildTool = v.buildTool === null || v.buildTool === 'vite' || v.buildTool === 'webpack' || v.buildTool === 'rollup'
  const isConfidence = v.confidence === 'low' || v.confidence === 'medium' || v.confidence === 'high'
  return isArch && isBuildTool && isConfidence && Array.isArray(v.indicators)
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
export type { FrameworkDetectionResult, Framework } from './framework-detector.js'
export type { AssetDetectionResult } from './asset-detector.js'
export type { ArchitectureDetectionResult, Architecture, BuildTool } from './architecture-detector.js'

export { detectFramework } from './framework-detector.js'
export { detectAssets } from './asset-detector.js'
export { detectArchitecture } from './architecture-detector.js'

