import { resolve, normalize, isAbsolute, join } from 'path'
import { statSync, existsSync } from 'fs'
import { logger } from './logger.js'

/**
 * Options de validation de chemin
 */
export interface PathValidationOptions {
  /** Chemin de base (racine du projet) */
  basePath: string
  /** Autoriser les chemins absolus */
  allowAbsolute?: boolean
  /** Autoriser les chemins relatifs */
  allowRelative?: boolean
}

/**
 * Options de validation de fichier
 */
export interface FileValidationOptions {
  /** Taille maximale en bytes (défaut: 10MB) */
  maxSize?: number
  /** Types de fichiers autorisés (extensions) */
  allowedExtensions?: string[]
  /** Vérifier l'existence du fichier */
  checkExists?: boolean
}

/**
 * Résultat de validation de chemin
 */
export interface PathValidationResult {
  valid: boolean
  error?: string
  resolvedPath?: string
}

/**
 * Résultat de validation de fichier
 */
export interface FileValidationResult {
  valid: boolean
  error?: string
  size?: number
}

/**
 * Constantes de sécurité
 */
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const DEFAULT_MAX_FILES = 1000

/**
 * Cache pour extensions compilées
 * @internal
 */
const extensionCache = new Map<string, Set<string>>()

/**
 * Valide qu'un chemin ne contient pas de path traversal
 * 
 * @param path - Chemin à valider
 * @param basePath - Chemin de base (racine du projet)
 * @returns true si le chemin est valide, false sinon
 * 
 * @example
 * ```typescript
 * validatePath('../etc/passwd', '/project') // false
 * validatePath('./src/index.html', '/project') // true
 * ```
 */
export function validatePath(path: string, basePath: string): boolean {
  try {
    // Normaliser les chemins
    const normalizedBase = normalize(resolve(basePath))
    const normalizedPath = normalize(resolve(basePath, path))

    // Vérifier que le chemin résolu commence par le chemin de base
    // Utiliser path.posix pour une comparaison cohérente cross-platform
    const basePosix = normalizedBase.replace(/\\/g, '/')
    const pathPosix = normalizedPath.replace(/\\/g, '/')

    // Le chemin doit commencer par basePath + '/' ou être exactement basePath
    // Si le chemin résolu ne commence pas par basePath, c'est un path traversal
    const isValid = pathPosix.startsWith(basePosix + '/') || pathPosix === basePosix

    if (!isValid) {
      logger.warn(
        { module: 'path-validator', path, basePath, resolved: pathPosix, base: basePosix },
        'Path traversal detected',
      )
      return false
    }

    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.warn({ module: 'path-validator', path, basePath }, `Path validation failed: ${message}`)
    return false
  }
}

/**
 * Valide un chemin avec options avancées
 * 
 * @param path - Chemin à valider
 * @param options - Options de validation
 * @returns Résultat de validation
 */
export function validatePathAdvanced(path: string, options: PathValidationOptions): PathValidationResult {
  const { basePath, allowAbsolute = false, allowRelative = true } = options

  try {
    // Vérifier si le chemin est absolu
    if (isAbsolute(path)) {
      if (!allowAbsolute) {
        return {
          valid: false,
          error: 'Absolute paths are not allowed',
        }
      }
      // Pour les chemins absolus, vérifier qu'ils sont dans basePath
      if (!path.startsWith(basePath)) {
        return {
          valid: false,
          error: 'Absolute path is outside base path',
        }
      }
    } else {
      if (!allowRelative) {
        return {
          valid: false,
          error: 'Relative paths are not allowed',
        }
      }
    }

    // Protection path traversal
    if (!validatePath(path, basePath)) {
      return {
        valid: false,
        error: 'Path traversal detected',
      }
    }

    const resolvedPath = resolve(basePath, path)
    return {
      valid: true,
      resolvedPath,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      error: `Path validation error: ${message}`,
    }
  }
}

/**
 * Nettoie et normalise un chemin
 * 
 * @param path - Chemin à nettoyer
 * @returns Chemin nettoyé
 * 
 * @example
 * ```typescript
 * sanitizePath('../../etc/passwd') // Retourne le chemin normalisé mais ne valide pas
 * ```
 */
export function sanitizePath(path: string): string {
  return normalize(path)
}

/**
 * Valide la taille d'un fichier
 * 
 * @param filePath - Chemin du fichier
 * @param maxSize - Taille maximale en bytes (défaut: 10MB)
 * @returns true si la taille est valide, false sinon
 */
export function validateFileSize(filePath: string, maxSize: number = DEFAULT_MAX_FILE_SIZE): boolean {
  try {
    // Optimisation: Une seule opération stat() pour vérifier existence ET taille
    const stats = statSync(filePath)
    return stats.size <= maxSize
  } catch (err) {
    // statSync lance si le fichier n'existe pas ou inaccessible
    const message = err instanceof Error ? err.message : String(err)
    logger.warn({ module: 'path-validator', filePath }, `File size validation failed: ${message}`)
    return false
  }
}

/**
 * Compile les extensions autorisées en un Set pour validation rapide
 * @internal
 */
function getExtensionSet(extensions: string[]): Set<string> {
  const key = extensions.join('|')
  let set = extensionCache.get(key)
  if (!set) {
    // Compiler les extensions une seule fois et les normaliser
    set = new Set(extensions.map((ext) => ext.toLowerCase()))
    extensionCache.set(key, set)
  }
  return set
}

/**
 * Valide un fichier avec options avancées
 * 
 * @param filePath - Chemin du fichier
 * @param options - Options de validation
 * @returns Résultat de validation
 */
export function validateFile(
  filePath: string,
  options: FileValidationOptions = {},
): FileValidationResult {
  const {
    maxSize = DEFAULT_MAX_FILE_SIZE,
    allowedExtensions = [],
    checkExists = true,
  } = options

  try {
    // Optimisation: Valider l'extension EN PREMIER (pas d'IO)
    // Car c'est une opération très rapide et peut rejeter immédiatement
    if (allowedExtensions.length > 0) {
      const dotIndex = filePath.lastIndexOf('.')
      if (dotIndex === -1) {
        // Pas d'extension trouvée
        return {
          valid: false,
          error: `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`,
        }
      }
      const ext = filePath.substring(dotIndex).toLowerCase()
      const extensionSet = getExtensionSet(allowedExtensions)
      if (!extensionSet.has(ext)) {
        return {
          valid: false,
          error: `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`,
        }
      }
    }

    // Optimisation: Utiliser une seule opération statSync() pour vérifier existence et taille
    // au lieu de existsSync() + statSync()
    let stats
    try {
      stats = statSync(filePath)
    } catch (err) {
      if (checkExists) {
        return {
          valid: false,
          error: 'File does not exist',
        }
      }
      // Si checkExists est false et le fichier n'existe pas, on considère valide
      return {
        valid: true,
      }
    }

    // Vérifier la taille
    if (stats.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum (${maxSize} bytes)`,
        size: stats.size,
      }
    }

    return {
      valid: true,
      size: stats.size,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      valid: false,
      error: `File validation error: ${message}`,
    }
  }
}

/**
 * Valide qu'un chemin est dans les limites de sécurité
 * 
 * @param path - Chemin à valider
 * @param basePath - Chemin de base
 * @param maxDepth - Profondeur maximale autorisée (défaut: 20)
 * @returns true si le chemin est dans les limites
 */
export function validatePathDepth(path: string, basePath: string, maxDepth: number = 20): boolean {
  try {
    const resolved = resolve(basePath, path)
    const baseResolved = resolve(basePath)
    const relative = resolved.replace(baseResolved, '')
    const depth = relative.split('/').filter((segment) => segment !== '' && segment !== '.').length
    return depth <= maxDepth
  } catch {
    return false
  }
}

/**
 * Classe d'erreur pour les validations de chemin
 */
export class PathValidationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
    public readonly basePath?: string,
  ) {
    super(message)
    this.name = 'PathValidationError'
  }
}

/**
 * Classe d'erreur pour les validations de fichier
 */
export class FileValidationError extends Error {
  constructor(
    message: string,
    public readonly filePath: string,
    public readonly size?: number,
  ) {
    super(message)
    this.name = 'FileValidationError'
  }
}
