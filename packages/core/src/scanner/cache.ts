import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import type { ScannerResult } from './index.js'

export interface CacheEntry {
  result: ScannerResult
  timestamp: string
  fileHashes: Record<string, string>
  ttl: number // Time to live in seconds
}

export interface ScanCache {
  version: string
  entries: Record<string, CacheEntry>
}

export interface CacheOptions {
  ttl?: number // Default: 24 hours (86400 seconds)
  cacheFile?: string // Default: '.universal-pwa-cache.json'
  force?: boolean // Force bypass cache
}

const DEFAULT_TTL = 24 * 60 * 60 // 24 heures
const CACHE_VERSION = '1.0.0'
const DEFAULT_CACHE_FILE = '.universal-pwa-cache.json'

/**
 * Calcule le hash MD5 d'un fichier
 */
function hashFile(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) {
      return null
    }
    const content = readFileSync(filePath, 'utf-8')
    return createHash('md5').update(content).digest('hex')
  } catch {
    return null
  }
}

/**
 * Calcule le hash d'un répertoire (basé sur les fichiers clés)
 */
function hashDirectory(projectPath: string): Record<string, string> {
  const hashes: Record<string, string> = {}
  const keyFiles = [
    'package.json',
    'composer.json',
    'tsconfig.json',
    'vite.config.js',
    'vite.config.ts',
    'webpack.config.js',
    'rollup.config.js',
    'next.config.js',
    'nuxt.config.js',
    'angular.json',
    'wp-config.php',
    'composer.lock',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ]

  for (const file of keyFiles) {
    const filePath = join(projectPath, file)
    const hash = hashFile(filePath)
    if (hash) {
      hashes[file] = hash
    }
  }

  return hashes
}

/**
 * Charge le cache depuis le fichier
 */
export function loadCache(cacheFile: string = DEFAULT_CACHE_FILE): ScanCache | null {
  try {
    if (!existsSync(cacheFile)) {
      return null
    }

    const content = readFileSync(cacheFile, 'utf-8')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = JSON.parse(content)
    const cache = parsed as ScanCache

    // Vérifier la version
    if (cache.version !== CACHE_VERSION) {
      return null // Cache invalide si version différente
    }

    return cache
  } catch {
    return null
  }
}

/**
 * Sauvegarde le cache dans un fichier
 */
export function saveCache(cache: ScanCache, cacheFile: string = DEFAULT_CACHE_FILE): void {
  try {
    writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`Failed to save cache: ${message}`)
  }
}

/**
 * Génère une clé de cache basée sur le chemin du projet
 */
function generateCacheKey(projectPath: string): string {
  // Normaliser le chemin (résoudre les chemins relatifs)
  const normalizedPath = projectPath.replace(/\/$/, '') // Enlever trailing slash
  return createHash('md5').update(normalizedPath).digest('hex')
}

/**
 * Vérifie si le cache est valide pour un projet
 */
export function isCacheValid(
  projectPath: string,
  cache: ScanCache | null,
  options: CacheOptions = {},
): boolean {
  if (!cache || options.force) {
    return false
  }

  const cacheKey = generateCacheKey(projectPath)
  const entry = cache.entries[cacheKey]

  if (!entry) {
    return false
  }

  // Vérifier TTL
  const entryTimestamp = new Date(entry.timestamp).getTime()
  const now = Date.now()
  const age = (now - entryTimestamp) / 1000 // Age en secondes

  if (age > (options.ttl ?? entry.ttl ?? DEFAULT_TTL)) {
    return false // Cache expiré
  }

  // Vérifier les hashs des fichiers clés
  const currentHashes = hashDirectory(projectPath)
  const cachedHashes = entry.fileHashes

  // Comparer les hashs
  for (const [file, hash] of Object.entries(currentHashes)) {
    if (cachedHashes[file] !== hash) {
      return false // Fichier modifié
    }
  }

  // Vérifier si des fichiers ont été supprimés
  for (const file of Object.keys(cachedHashes)) {
    if (!(file in currentHashes) && existsSync(join(projectPath, file))) {
      // Fichier présent dans le cache mais hash différent (modifié)
      return false
    }
  }

  return true
}

/**
 * Récupère le résultat depuis le cache
 */
export function getCachedResult(
  projectPath: string,
  cache: ScanCache | null,
): ScannerResult | null {
  if (!cache) {
    return null
  }

  const cacheKey = generateCacheKey(projectPath)
  const entry = cache.entries[cacheKey]

  if (!entry) {
    return null
  }

  return entry.result
}

/**
 * Met à jour le cache avec un nouveau résultat
 */
export function updateCache(
  projectPath: string,
  result: ScannerResult,
  cache: ScanCache | null,
  options: CacheOptions = {},
): ScanCache {
  const cacheKey = generateCacheKey(projectPath)
  const fileHashes = hashDirectory(projectPath)
  const ttl = options.ttl ?? DEFAULT_TTL

  const newEntry: CacheEntry = {
    result,
    timestamp: new Date().toISOString(),
    fileHashes,
    ttl,
  }

  const updatedCache: ScanCache = cache || {
    version: CACHE_VERSION,
    entries: {},
  }

  updatedCache.entries[cacheKey] = newEntry

  return updatedCache
}

/**
 * Nettoie le cache (supprime les entrées expirées)
 */
export function cleanCache(cache: ScanCache | null, ttl: number = DEFAULT_TTL): ScanCache | null {
  if (!cache) {
    return null
  }

  const now = Date.now()
  const cleanedEntries: Record<string, CacheEntry> = {}

  for (const [key, entry] of Object.entries(cache.entries)) {
    const entryTimestamp = new Date(entry.timestamp).getTime()
    const age = (now - entryTimestamp) / 1000

    if (age <= (entry.ttl ?? ttl)) {
      cleanedEntries[key] = entry
    }
  }

  if (Object.keys(cleanedEntries).length === 0) {
    return null // Cache vide après nettoyage
  }

  return {
    version: cache.version,
    entries: cleanedEntries,
  }
}

/**
 * Supprime une entrée du cache
 */
export function removeCacheEntry(projectPath: string, cache: ScanCache | null): ScanCache | null {
  if (!cache) {
    return null
  }

  const cacheKey = generateCacheKey(projectPath)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { [cacheKey]: _removed, ...remainingEntries } = cache.entries

  if (Object.keys(remainingEntries).length === 0) {
    return null // Cache vide
  }

  return {
    version: cache.version,
    entries: remainingEntries,
  }
}

