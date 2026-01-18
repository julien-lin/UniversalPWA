/**
 * Cache Invalidation System
 * 
 * Handles smart cache invalidation with versioning, dependency tracking,
 * and automatic invalidation on file changes.
 */

import { createHash } from 'node:crypto'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { globSync } from 'glob'
import type { AdvancedCachingConfig, RouteConfig } from './caching-strategy.js'
import { logger } from '../utils/logger.js'

/**
 * Cache version information
 */
export interface CacheVersion {
  /** Version string */
  version: string
  /** Timestamp of version generation */
  timestamp: number
  /** File hashes used to generate version */
  fileHashes: Record<string, string>
}

/**
 * Dependency graph for cascade invalidation
 */
export interface DependencyGraph {
  /** Map of file → files that depend on it */
  dependents: Map<string, string[]>
  /** Map of file → files it depends on */
  dependencies: Map<string, string[]>
}

/**
 * Invalidation result
 */
export interface InvalidationResult {
  /** Whether cache should be invalidated */
  shouldInvalidate: boolean
  /** Reason for invalidation */
  reason?: string
  /** Files that changed */
  changedFiles?: string[]
  /** New version if invalidated */
  newVersion?: string
}

/**
 * Generate hash for a file
 */
function hashFile(filePath: string): string {
  try {
    const content = readFileSync(filePath)
    return createHash('md5').update(content).digest('hex').substring(0, 8)
  } catch {
    return ''
  }
}

/**
 * Generate hash for multiple files
 */
function hashFiles(filePaths: string[]): Record<string, string> {
  const hashes: Record<string, string> = {}

  for (const filePath of filePaths) {
    if (existsSync(filePath)) {
      hashes[filePath] = hashFile(filePath)
    }
  }

  return hashes
}

/**
 * Generate cache version from file hashes
 */
export function generateCacheVersion(
  projectPath: string,
  trackedFiles: string[],
  ignorePatterns: string[] = [],
): CacheVersion {
  // Find all files matching tracked patterns
  const allFiles: string[] = []

  for (const pattern of trackedFiles) {
    try {
      const matches = globSync(pattern, {
        cwd: projectPath,
        absolute: true,
        ignore: ignorePatterns,
      })
      allFiles.push(...matches)
    } catch {
      // Ignore invalid patterns
    }
  }

  // Remove duplicates and sort
  const uniqueFiles = [...new Set(allFiles)].sort()

  // Generate hashes
  const fileHashes = hashFiles(uniqueFiles)

  // Generate version from all hashes
  const hashString = Object.entries(fileHashes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([file, hash]) => `${relative(projectPath, file)}:${hash}`)
    .join('|')

  const version = createHash('md5').update(hashString).digest('hex').substring(0, 12)

  return {
    version,
    timestamp: Date.now(),
    fileHashes,
  }
}

/**
 * Build dependency graph from route configurations
 */
export function buildDependencyGraph(routes: RouteConfig[]): DependencyGraph {
  const dependents = new Map<string, string[]>()
  const dependencies = new Map<string, string[]>()

  for (const route of routes) {
    if (route.dependencies && route.dependencies.length > 0) {
      const patternStr = typeof route.pattern === 'string' ? route.pattern : route.pattern.toString()

      // Add dependencies for this route
      dependencies.set(patternStr, route.dependencies)

      // Add dependents for each dependency
      for (const dep of route.dependencies) {
        if (!dependents.has(dep)) {
          dependents.set(dep, [])
        }
        dependents.get(dep)!.push(patternStr)
      }
    }
  }

  return { dependents, dependencies }
}

/**
 * Get files that should be invalidated when a file changes (cascade)
 */
export function getCascadeInvalidation(
  changedFile: string,
  dependencyGraph: DependencyGraph,
): string[] {
  const invalidated: string[] = [changedFile]
  const visited = new Set<string>()

  function traverse(file: string) {
    if (visited.has(file)) return
    visited.add(file)

    const dependents = dependencyGraph.dependents.get(file) || []
    for (const dependent of dependents) {
      if (!invalidated.includes(dependent)) {
        invalidated.push(dependent)
      }
      traverse(dependent)
    }
  }

  traverse(changedFile)
  return invalidated
}

/**
 * Check if cache should be invalidated based on file changes
 */
export function shouldInvalidateCache(
  projectPath: string,
  currentVersion: CacheVersion | null,
  config: AdvancedCachingConfig,
): InvalidationResult {
  const { versioning, invalidation, dependencies } = config

  // Manual version - check if changed
  if (versioning?.manualVersion) {
    if (!currentVersion || currentVersion.version !== versioning.manualVersion) {
      return {
        shouldInvalidate: true,
        reason: 'Manual version changed',
        newVersion: versioning.manualVersion,
      }
    }
    return { shouldInvalidate: false }
  }

  // Auto versioning
  if (versioning?.autoVersion) {
    const trackedFiles = dependencies?.trackedFiles || ['**/*.{js,css,html}']
    const ignorePatterns = invalidation?.ignorePatterns || ['**/*.map', '**/.DS_Store']

    const newVersion = generateCacheVersion(projectPath, trackedFiles, ignorePatterns)

    if (!currentVersion) {
      return {
        shouldInvalidate: true,
        reason: 'No previous version found',
        newVersion: newVersion.version,
      }
    }

    // Check if any tracked files changed
    const changedFiles: string[] = []

    for (const [file, newHash] of Object.entries(newVersion.fileHashes)) {
      const oldHash = currentVersion.fileHashes[file]
      if (oldHash !== newHash) {
        changedFiles.push(file)
      }
    }

    // Check for deleted files
    for (const file of Object.keys(currentVersion.fileHashes)) {
      if (!(file in newVersion.fileHashes) && existsSync(file)) {
        changedFiles.push(file)
      }
    }

    if (changedFiles.length > 0) {
      return {
        shouldInvalidate: true,
        reason: `${changedFiles.length} file(s) changed`,
        changedFiles,
        newVersion: newVersion.version,
      }
    }

    // Check if version changed (shouldn't happen if files unchanged, but check anyway)
    if (currentVersion.version !== newVersion.version) {
      return {
        shouldInvalidate: true,
        reason: 'Version hash changed',
        newVersion: newVersion.version,
      }
    }
  }

  return { shouldInvalidate: false }
}

/**
 * Get files to track for invalidation
 */
export function getTrackedFiles(
  projectPath: string,
  patterns: string[],
  ignorePatterns: string[] = [],
): string[] {
  const files: string[] = []

  for (const pattern of patterns) {
    try {
      const matches = globSync(pattern, {
        cwd: projectPath,
        absolute: true,
        ignore: ignorePatterns,
      })
      files.push(...matches)
    } catch {
      // Ignore invalid patterns
    }
  }

  return [...new Set(files)].sort()
}

/**
 * Check if file matches ignore patterns
 */
export function shouldIgnoreFile(filePath: string, ignorePatterns: string[]): boolean {
  for (const pattern of ignorePatterns) {
    try {
      // Simple glob matching
      try {
        const matches = globSync(pattern, { absolute: true })
        if (matches.includes(filePath)) {
          return true
        }
      } catch {
        // Fallback to simple string matching
        if (filePath.includes(pattern)) {
          return true
        }
      }
    } catch {
      // Ignore invalid patterns
    }
  }

  return false
}

/**
 * Get cache version from stored data or generate new
 */
export function getOrGenerateCacheVersion(
  projectPath: string,
  config: AdvancedCachingConfig,
  storedVersion?: CacheVersion | null,
): CacheVersion {
  const { versioning, dependencies, invalidation } = config

  // Manual version
  if (versioning?.manualVersion) {
    return {
      version: versioning.manualVersion,
      timestamp: Date.now(),
      fileHashes: storedVersion?.fileHashes || {},
    }
  }

  // Auto version
  if (versioning?.autoVersion) {
    const trackedFiles = dependencies?.trackedFiles || ['**/*.{js,css,html}']
    const ignorePatterns = invalidation?.ignorePatterns || ['**/*.map', '**/.DS_Store']

    return generateCacheVersion(projectPath, trackedFiles, ignorePatterns)
  }

  // Default: use timestamp
  return {
    version: `v${Date.now()}`,
    timestamp: Date.now(),
    fileHashes: {},
  }
}
