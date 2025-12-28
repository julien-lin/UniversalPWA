import { existsSync } from 'fs'
import { join } from 'path'
import { detectFramework, type FrameworkDetectionResult } from './framework-detector.js'
import { detectAssets, type AssetDetectionResult } from './asset-detector.js'
import { detectArchitecture, type ArchitectureDetectionResult } from './architecture-detector.js'
import {
  loadCache,
  saveCache,
  isCacheValid,
  getCachedResult,
  updateCache,
  cleanCache,
  type CacheOptions,
} from './cache.js'

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
  useCache?: boolean
  cacheFile?: string
  forceScan?: boolean
}

/**
 * Main scanner orchestrator
 * Combines framework, assets, and architecture detection results
 */
export async function scanProject(options: ScannerOptions): Promise<ScannerResult> {
  const {
    projectPath,
    includeAssets = true,
    includeArchitecture = true,
    useCache = true,
    cacheFile,
    forceScan = false,
  } = options

  // Gestion du cache
  const cacheFilePath = cacheFile ?? join(projectPath, '.universal-pwa-cache.json')
  let cache = useCache ? loadCache(cacheFilePath) : null

  // Nettoyer le cache des entrées expirées
  if (cache) {
    cache = cleanCache(cache) ?? null
    if (cache) {
      saveCache(cache, cacheFilePath)
    }
  }

  // Vérifier si le cache est valide
  if (useCache && !forceScan && cache) {
    const cacheOptions: CacheOptions = {
      force: forceScan,
    }
    if (isCacheValid(projectPath, cache, cacheOptions)) {
      const cachedResult = getCachedResult(projectPath, cache)
      if (cachedResult) {
        return cachedResult
      }
    }
  }

  // Framework detection (synchronous)
  const frameworkCandidate: unknown = detectFramework(projectPath)
  const framework: FrameworkDetectionResult = isFrameworkDetectionResult(frameworkCandidate)
    ? frameworkCandidate
    : {
        framework: null,
        confidence: 'low',
        confidenceScore: 0,
        indicators: [],
        version: null,
        configuration: {
          language: null,
          cssInJs: [],
          stateManagement: [],
          buildTool: null,
        },
      }

  // Assets detection (asynchronous)
  const assetsCandidate: unknown = includeAssets ? await detectAssets(projectPath) : getEmptyAssets()
  const assets: AssetDetectionResult = isAssetDetectionResult(assetsCandidate) ? assetsCandidate : getEmptyAssets()

  // Architecture detection (asynchronous)
  const architectureCandidate: unknown = includeArchitecture ? await detectArchitecture(projectPath) : getEmptyArchitecture()
  const architecture: ArchitectureDetectionResult = isArchitectureDetectionResult(architectureCandidate)
    ? architectureCandidate
    : getEmptyArchitecture()

  const result: ScannerResult = {
    framework,
    assets,
    architecture,
    timestamp: new Date().toISOString(),
    projectPath,
  }

  // Mettre à jour le cache
  if (useCache) {
    const updatedCache = updateCache(projectPath, result, cache)
    saveCache(updatedCache, cacheFilePath)
  }

  return result
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
  const v = value as {
    framework?: unknown
    confidence?: unknown
    confidenceScore?: unknown
    indicators?: unknown
    version?: unknown
    configuration?: unknown
  }
  const isValidVersion = (ver: unknown): boolean => {
    if (ver === null) return true
    if (typeof ver !== 'object') return false
    const vv = ver as { major?: unknown; minor?: unknown; patch?: unknown; raw?: unknown }
    return (
      typeof vv.major === 'number' &&
      (vv.minor === null || typeof vv.minor === 'number') &&
      (vv.patch === null || typeof vv.patch === 'number') &&
      typeof vv.raw === 'string'
    )
  }
  const isValidConfiguration = (config: unknown): boolean => {
    if (!config || typeof config !== 'object') return false
    const cfg = config as {
      language?: unknown
      cssInJs?: unknown
      stateManagement?: unknown
      buildTool?: unknown
    }
    return (
      (cfg.language === null || cfg.language === 'typescript' || cfg.language === 'javascript') &&
      Array.isArray(cfg.cssInJs) &&
      Array.isArray(cfg.stateManagement) &&
      (cfg.buildTool === null || typeof cfg.buildTool === 'string')
    )
  }
  return (
    (v.framework === null || typeof v.framework === 'string') &&
    (v.confidence === 'low' || v.confidence === 'medium' || v.confidence === 'high') &&
    (typeof v.confidenceScore === 'number' && v.confidenceScore >= 0 && v.confidenceScore <= 100) &&
    Array.isArray(v.indicators) &&
    (v.version === null || isValidVersion(v.version)) &&
    (v.configuration !== undefined && isValidConfiguration(v.configuration))
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
export type { FrameworkDetectionResult, Framework, FrameworkVersion, ProjectConfiguration } from './framework-detector.js'
export type { AssetDetectionResult } from './asset-detector.js'
export type { ArchitectureDetectionResult, Architecture, BuildTool } from './architecture-detector.js'
export type {
  OptimizationResult,
  AdaptiveCacheStrategy,
  OptimizedManifestConfig,
  AssetOptimizationSuggestion,
  ApiType,
  CacheStrategy,
  OptimizedImageResult,
  ImageOptimizationOptions,
} from './optimizer.js'

export { detectFramework } from './framework-detector.js'
export { detectAssets } from './asset-detector.js'
export { detectArchitecture } from './architecture-detector.js'
export {
  optimizeProject,
  detectApiType,
  generateAdaptiveCacheStrategies,
  detectUnoptimizedImages,
  generateOptimalShortName,
  suggestManifestColors,
  optimizeImage,
  optimizeProjectImages,
  generateResponsiveImageSizes,
} from './optimizer.js'

