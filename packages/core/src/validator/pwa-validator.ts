import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { readFile } from 'fs/promises'
import type { Manifest } from '../generator/manifest-generator.js'

export interface ValidationError {
  code: string
  message: string
  severity: 'error' | 'warning' | 'info'
  file?: string
  suggestion?: string
}

export interface ValidationWarning {
  code: string
  message: string
  file?: string
  suggestion?: string
}

export interface ValidationResult {
  isValid: boolean
  score: number // 0-100
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: string[]
  details: {
    manifest: {
      exists: boolean
      valid: boolean
      errors: ValidationError[]
    }
    icons: {
      exists: boolean
      valid: boolean
      has192x192: boolean
      has512x512: boolean
      errors: ValidationError[]
    }
    serviceWorker: {
      exists: boolean
      valid: boolean
      errors: ValidationError[]
    }
    metaTags: {
      valid: boolean
      errors: ValidationError[]
    }
    https: {
      isSecure: boolean
      isLocalhost: boolean
      errors: ValidationError[]
    }
  }
}

export interface PWAValidatorOptions {
  projectPath: string
  outputDir?: string
  htmlFiles?: string[]
  strict?: boolean // Si true, les warnings sont traités comme des erreurs
  maxHtmlFiles?: number // Optionnel : limite le nombre de fichiers HTML validés (par défaut: illimité)
}

/**
 * Valide le manifest.json
 */
function validateManifest(
  projectPath: string,
  outputDir: string,
): { exists: boolean; valid: boolean; manifest?: Manifest; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const manifestPath = join(outputDir, 'manifest.json')

  if (!existsSync(manifestPath)) {
    return {
      exists: false,
      valid: false,
      errors: [
        {
          code: 'MANIFEST_MISSING',
          message: 'manifest.json is missing',
          severity: 'error',
          file: manifestPath,
          suggestion: 'Generate manifest.json using universal-pwa init',
        },
      ],
    }
  }

  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(manifestContent) as Manifest

    // Vérifier les champs requis
    if (!manifest.name || manifest.name.trim().length === 0) {
      errors.push({
        code: 'MANIFEST_NAME_MISSING',
        message: 'manifest.json: "name" field is required',
        severity: 'error',
        file: manifestPath,
      })
    }

    if (!manifest.short_name || manifest.short_name.trim().length === 0) {
      errors.push({
        code: 'MANIFEST_SHORT_NAME_MISSING',
        message: 'manifest.json: "short_name" field is required',
        severity: 'error',
        file: manifestPath,
      })
    } else if (manifest.short_name.length > 12) {
      errors.push({
        code: 'MANIFEST_SHORT_NAME_TOO_LONG',
        message: `manifest.json: "short_name" must be ≤ 12 characters (current: ${manifest.short_name.length})`,
        severity: 'error',
        file: manifestPath,
        suggestion: 'Shorten the short_name to 12 characters or less',
      })
    }

    if (!manifest.icons || manifest.icons.length === 0) {
      errors.push({
        code: 'MANIFEST_ICONS_MISSING',
        message: 'manifest.json: "icons" array is required and must contain at least one icon',
        severity: 'error',
        file: manifestPath,
        suggestion: 'Generate icons using universal-pwa init --icon-source <path>',
      })
    }

    if (!manifest.start_url) {
      errors.push({
        code: 'MANIFEST_START_URL_MISSING',
        message: 'manifest.json: "start_url" field is required',
        severity: 'error',
        file: manifestPath,
      })
    }

    if (!manifest.display) {
      errors.push({
        code: 'MANIFEST_DISPLAY_MISSING',
        message: 'manifest.json: "display" field is required',
        severity: 'error',
        file: manifestPath,
      })
    }

    // Vérifier theme_color et background_color (recommandés pour installabilité)
    if (!manifest.theme_color) {
      errors.push({
        code: 'MANIFEST_THEME_COLOR_MISSING',
        message: 'manifest.json: "theme_color" is recommended for PWA installability',
        severity: 'warning',
        file: manifestPath,
        suggestion: 'Add theme_color to manifest.json',
      })
    }

    if (!manifest.background_color) {
      errors.push({
        code: 'MANIFEST_BACKGROUND_COLOR_MISSING',
        message: 'manifest.json: "background_color" is recommended for PWA installability',
        severity: 'warning',
        file: manifestPath,
        suggestion: 'Add background_color to manifest.json',
      })
    }

    return {
      exists: true,
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      manifest,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      exists: true,
      valid: false,
      errors: [
        {
          code: 'MANIFEST_INVALID_JSON',
          message: `manifest.json is invalid JSON: ${errorMessage}`,
          severity: 'error',
          file: manifestPath,
          suggestion: 'Fix JSON syntax errors in manifest.json',
        },
      ],
    }
  }
}

/**
 * Valide les icônes PWA
 */
function validateIcons(
  projectPath: string,
  outputDir: string,
  manifest?: Manifest,
): { exists: boolean; valid: boolean; has192x192: boolean; has512x512: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  let has192x192 = false
  let has512x512 = false

  if (!manifest || !manifest.icons || manifest.icons.length === 0) {
    return {
      exists: false,
      valid: false,
      has192x192: false,
      has512x512: false,
      errors: [
        {
          code: 'ICONS_MANIFEST_MISSING',
          message: 'Icons cannot be validated: manifest.json icons array is missing',
          severity: 'error',
        },
      ],
    }
  }

  // Vérifier les icônes requises (192x192 et 512x512)
  for (const icon of manifest.icons) {
    const iconPath = icon.src.startsWith('/') ? icon.src.substring(1) : icon.src
    const fullIconPath = join(outputDir, iconPath)

    if (!existsSync(fullIconPath)) {
      errors.push({
        code: 'ICON_FILE_MISSING',
        message: `Icon file not found: ${iconPath}`,
        severity: 'error',
        file: fullIconPath,
        suggestion: `Ensure ${iconPath} exists in ${outputDir}`,
      })
      continue
    }

    // Vérifier les tailles
    if (icon.sizes.includes('192x192') || icon.sizes === '192x192') {
      has192x192 = true
    }
    if (icon.sizes.includes('512x512') || icon.sizes === '512x512') {
      has512x512 = true
    }
  }

  if (!has192x192) {
    errors.push({
      code: 'ICON_192X192_MISSING',
      message: 'Icon 192x192 is required for PWA installability',
      severity: 'error',
      suggestion: 'Generate a 192x192 icon using universal-pwa init --icon-source <path>',
    })
  }

  if (!has512x512) {
    errors.push({
      code: 'ICON_512X512_MISSING',
      message: 'Icon 512x512 is required for PWA installability',
      severity: 'error',
      suggestion: 'Generate a 512x512 icon using universal-pwa init --icon-source <path>',
    })
  }

  return {
    exists: manifest.icons.length > 0,
    valid: errors.filter((e) => e.severity === 'error').length === 0 && has192x192 && has512x512,
    has192x192,
    has512x512,
    errors,
  }
}

/**
 * Valide le service worker
 */
function validateServiceWorker(
  projectPath: string,
  outputDir: string,
): { exists: boolean; valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const swPath = join(outputDir, 'sw.js')

  if (!existsSync(swPath)) {
    return {
      exists: false,
      valid: false,
      errors: [
        {
          code: 'SERVICE_WORKER_MISSING',
          message: 'Service worker (sw.js) is missing',
          severity: 'error',
          file: swPath,
          suggestion: 'Generate service worker using universal-pwa init',
        },
      ],
    }
  }

  try {
    const swContent = readFileSync(swPath, 'utf-8')

    // Vérifications basiques
    if (!swContent.includes('workbox') && !swContent.includes('serviceWorker')) {
      errors.push({
        code: 'SERVICE_WORKER_INVALID',
        message: 'Service worker does not appear to be a valid Workbox service worker',
        severity: 'warning',
        file: swPath,
        suggestion: 'Ensure service worker is generated using Workbox',
      })
    }

    // Vérifier la présence de precache
    if (!swContent.includes('precache') && !swContent.includes('precacheAndRoute')) {
      errors.push({
        code: 'SERVICE_WORKER_NO_PRECACHE',
        message: 'Service worker does not appear to have precaching configured',
        severity: 'warning',
        file: swPath,
        suggestion: 'Ensure service worker includes precaching for offline support',
      })
    }

    return {
      exists: true,
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      exists: true,
      valid: false,
      errors: [
        {
          code: 'SERVICE_WORKER_READ_ERROR',
          message: `Failed to read service worker: ${errorMessage}`,
          severity: 'error',
          file: swPath,
        },
      ],
    }
  }
}

/**
 * Valide les meta-tags dans les fichiers HTML
 */
async function validateMetaTags(
  htmlFiles: string[],
  manifestPath?: string,
  serviceWorkerPath?: string,
): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const errors: ValidationError[] = []

  if (htmlFiles.length === 0) {
    errors.push({
      code: 'HTML_FILES_MISSING',
      message: 'No HTML files found to validate',
      severity: 'warning',
      suggestion: 'Ensure HTML files exist in the project',
    })
    return { valid: false, errors }
  }

  // Limiter le nombre de fichiers HTML si maxHtmlFiles est défini
  const htmlFilesToProcess = options.maxHtmlFiles && options.maxHtmlFiles > 0
    ? htmlFiles.slice(0, options.maxHtmlFiles)
    : htmlFiles

  for (const htmlFile of htmlFilesToProcess) {
    try {
      const htmlContent = await readFile(htmlFile, 'utf-8')

      // Vérifier manifest link
      if (manifestPath && !htmlContent.includes('manifest.json') && !htmlContent.includes('rel="manifest"')) {
        errors.push({
          code: 'META_MANIFEST_MISSING',
          message: `HTML file missing manifest link: ${htmlFile}`,
          severity: 'error',
          file: htmlFile,
          suggestion: 'Add <link rel="manifest" href="/manifest.json"> to <head>',
        })
      }

      // Vérifier theme-color meta tag
      if (!htmlContent.includes('theme-color') && !htmlContent.includes('theme_color')) {
        errors.push({
          code: 'META_THEME_COLOR_MISSING',
          message: `HTML file missing theme-color meta tag: ${htmlFile}`,
          severity: 'warning',
          file: htmlFile,
          suggestion: 'Add <meta name="theme-color" content="#..."> to <head>',
        })
      }

      // Vérifier apple-mobile-web-app-capable
      if (!htmlContent.includes('apple-mobile-web-app-capable')) {
        errors.push({
          code: 'META_APPLE_MOBILE_MISSING',
          message: `HTML file missing apple-mobile-web-app-capable meta tag: ${htmlFile}`,
          severity: 'warning',
          file: htmlFile,
          suggestion: 'Add <meta name="apple-mobile-web-app-capable" content="yes"> to <head>',
        })
      }

      // Vérifier service worker registration (basique)
      if (serviceWorkerPath && !htmlContent.includes('serviceWorker') && !htmlContent.includes('navigator.serviceWorker')) {
        errors.push({
          code: 'META_SERVICE_WORKER_REGISTRATION_MISSING',
          message: `HTML file missing service worker registration: ${htmlFile}`,
          severity: 'warning',
          file: htmlFile,
          suggestion: 'Add service worker registration script to HTML',
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push({
        code: 'HTML_READ_ERROR',
        message: `Failed to read HTML file ${htmlFile}: ${errorMessage}`,
        severity: 'error',
        file: htmlFile,
      })
    }
  }

  return {
    valid: errors.filter((e) => e.severity === 'error').length === 0,
    errors,
  }
}

/**
 * Valide HTTPS
 */
function validateHttps(_projectPath: string): { isSecure: boolean; isLocalhost: boolean; errors: ValidationError[] } {
  // Vérification basique (ne peut pas vraiment vérifier HTTPS depuis le système de fichiers)
  // Cette validation sera principalement informative
  // La vraie vérification HTTPS doit être faite en production

  return {
    isSecure: false, // Par défaut, on assume que ce n'est pas HTTPS (sera vérifié en production)
    isLocalhost: false,
    errors: [
      {
        code: 'HTTPS_NOT_VERIFIED',
        message: 'HTTPS cannot be verified in local environment. Ensure HTTPS is enabled in production.',
        severity: 'warning',
        suggestion: 'PWA requires HTTPS in production. Use a service like Let\'s Encrypt or a hosting provider with HTTPS.',
      },
    ],
  }
}

/**
 * Calcule le score de conformité PWA (0-100)
 */
function calculatePWAScore(result: ValidationResult): number {
  let score = 100

  // Pénalités pour erreurs
  for (const error of result.errors) {
    if (error.severity === 'error') {
      score -= 10 // -10 points par erreur critique
    } else if (error.severity === 'warning') {
      score -= 5 // -5 points par warning
    }
  }

  // Pénalités pour warnings
  score -= result.warnings.length * 3 // -3 points par warning

  // Vérifications spécifiques
  if (!result.details.manifest.exists) {
    score -= 20
  } else if (!result.details.manifest.valid) {
    score -= 15
  }

  if (!result.details.icons.exists) {
    score -= 20
  } else if (!result.details.icons.has192x192 || !result.details.icons.has512x512) {
    score -= 15
  }

  if (!result.details.serviceWorker.exists) {
    score -= 20
  } else if (!result.details.serviceWorker.valid) {
    score -= 10
  }

  if (!result.details.metaTags.valid) {
    score -= 10
  }

  // Score minimum 0
  return Math.max(0, Math.min(100, score))
}

/**
 * Valide une PWA complète
 */
export async function validatePWA(options: PWAValidatorOptions): Promise<ValidationResult> {
  const { projectPath, outputDir = 'public', htmlFiles = [], strict = false } = options

  const finalOutputDir = outputDir.startsWith('/') ? outputDir : join(projectPath, outputDir)

    // Valider manifest
    const manifestValidation = validateManifest(projectPath, finalOutputDir)

    // Valider icônes
    const iconsValidation = validateIcons(projectPath, finalOutputDir, manifestValidation.manifest)

    // Valider service worker
    const serviceWorkerValidation = validateServiceWorker(projectPath, finalOutputDir)

  // Valider meta-tags
  const manifestPath = manifestValidation.exists ? join(finalOutputDir, 'manifest.json') : undefined
  const serviceWorkerPath = serviceWorkerValidation.exists ? join(finalOutputDir, 'sw.js') : undefined
  const metaTagsValidation = await validateMetaTags(htmlFiles, manifestPath, serviceWorkerPath, options.maxHtmlFiles)

  // Valider HTTPS
  const httpsValidation = validateHttps(projectPath)

  // Compiler toutes les erreurs et warnings
  const allErrors: ValidationError[] = [
    ...manifestValidation.errors,
    ...iconsValidation.errors,
    ...serviceWorkerValidation.errors,
    ...metaTagsValidation.errors,
    ...httpsValidation.errors,
  ]

  const errors = allErrors.filter((e) => e.severity === 'error')
  const warnings: ValidationWarning[] = allErrors
    .filter((e) => e.severity === 'warning' || e.severity === 'info')
    .map((error) => ({
      code: error.code,
      message: error.message,
      file: error.file,
      suggestion: error.suggestion,
    }))

  // Générer des suggestions d'amélioration
  const suggestions: string[] = []
  if (!manifestValidation.exists) {
    suggestions.push('Generate manifest.json using: universal-pwa init')
  }
  if (!iconsValidation.has192x192 || !iconsValidation.has512x512) {
    suggestions.push('Generate icons using: universal-pwa init --icon-source <path>')
  }
  if (!serviceWorkerValidation.exists) {
    suggestions.push('Generate service worker using: universal-pwa init')
  }
  if (errors.length > 0) {
    suggestions.push('Fix all errors to achieve PWA compliance')
  }

  const isValid = errors.length === 0 && (strict ? warnings.length === 0 : true)

  const result: ValidationResult = {
    isValid,
    score: 0, // Sera calculé après
    errors,
    warnings,
    suggestions,
    details: {
      manifest: {
        exists: manifestValidation.exists,
        valid: manifestValidation.valid,
        errors: manifestValidation.errors,
      },
      icons: {
        exists: iconsValidation.exists,
        valid: iconsValidation.valid,
        has192x192: iconsValidation.has192x192,
        has512x512: iconsValidation.has512x512,
        errors: iconsValidation.errors,
      },
      serviceWorker: {
        exists: serviceWorkerValidation.exists,
        valid: serviceWorkerValidation.valid,
        errors: serviceWorkerValidation.errors,
      },
      metaTags: {
        valid: metaTagsValidation.valid,
        errors: metaTagsValidation.errors,
      },
      https: {
        isSecure: httpsValidation.isSecure,
        isLocalhost: httpsValidation.isLocalhost,
        errors: httpsValidation.errors,
      },
    },
  }

  // Calculer le score
  result.score = calculatePWAScore(result)

  return result
}

