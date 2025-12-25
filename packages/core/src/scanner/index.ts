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
 * Main scanner orchestrator
 * Combines framework, assets, and architecture detection results
 */
export async function scanProject(options: ScannerOptions): Promise<ScannerResult> {
  const { projectPath, includeAssets = true, includeArchitecture = true } = options

  // Framework detection (synchronous)
  const frameworkCandidate: unknown = detectFramework(projectPath)
  const framework: FrameworkDetectionResult = isFrameworkDetectionResult(frameworkCandidate)
    ? frameworkCandidate
    : { framework: null, confidence: 'low', indicators: [] }

  // Assets detection (asynchronous)
  const assetsCandidate: unknown = includeAssets ? await detectAssets(projectPath) : getEmptyAssets()
  const assets: AssetDetectionResult = isAssetDetectionResult(assetsCandidate) ? assetsCandidate : getEmptyAssets()

  // Architecture detection (asynchronous)
  const architectureCandidate: unknown = includeArchitecture ? await detectArchitecture(projectPath) : getEmptyArchitecture()
  const architecture: ArchitectureDetectionResult = isArchitectureDetectionResult(architectureCandidate)
    ? architectureCandidate
    : getEmptyArchitecture()

  return {
    framework,
    assets,
    architecture,
    timestamp: new Date().toISOString(),
    projectPath,
  }
}

/**
 * Generates a JSON report of the scan
 */
export function generateReport(result: ScannerResult): string {
  return JSON.stringify(result, null, 2)
}

/**
 * Validates that a project path exists
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

// Helpers for empty results
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

// Re-export types and functions for easier usage
export type { FrameworkDetectionResult, Framework } from './framework-detector.js'
export type { AssetDetectionResult } from './asset-detector.js'
export type { ArchitectureDetectionResult, Architecture, BuildTool } from './architecture-detector.js'

export { detectFramework } from './framework-detector.js'
export { detectAssets } from './asset-detector.js'
export { detectArchitecture } from './architecture-detector.js'

