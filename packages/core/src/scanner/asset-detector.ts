import { glob } from 'glob'
import { join } from 'path'
import { statSync } from 'fs'

export interface AssetDetectionResult {
  javascript: string[]
  css: string[]
  images: string[]
  fonts: string[]
  apiRoutes: string[]
}

const IGNORED_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/build/**',
  '**/coverage/**',
]

const JS_EXTENSIONS = ['.js', '.mjs', '.ts', '.tsx', '.jsx']
const CSS_EXTENSIONS = ['.css', '.scss', '.sass', '.less']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico']
const FONT_EXTENSIONS = ['.woff', '.woff2', '.ttf', '.otf', '.eot']

const API_PATTERNS = [
  '/api/**',
  '/graphql',
  '/rest/**',
  '/v1/**',
  '/v2/**',
]

/**
 * Détecte tous les assets dans un projet
 */
export async function detectAssets(projectPath: string): Promise<AssetDetectionResult> {
  const result: AssetDetectionResult = {
    javascript: [],
    css: [],
    images: [],
    fonts: [],
    apiRoutes: [],
  }

  // Détection JS
  const jsPatterns = JS_EXTENSIONS.map((ext) => `**/*${ext}`)
  for (const pattern of jsPatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: false,
      nodir: true,
    })
    result.javascript.push(...files.map((f) => join(projectPath, f)))
  }

  // Détection CSS
  const cssPatterns = CSS_EXTENSIONS.map((ext) => `**/*${ext}`)
  for (const pattern of cssPatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: false,
      nodir: true,
    })
    result.css.push(...files.map((f) => join(projectPath, f)))
  }

  // Détection images
  const imagePatterns = IMAGE_EXTENSIONS.map((ext) => `**/*${ext}`)
  for (const pattern of imagePatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: false,
      nodir: true,
    })
    result.images.push(...files.map((f) => join(projectPath, f)))
  }

  // Détection fonts
  const fontPatterns = FONT_EXTENSIONS.map((ext) => `**/*${ext}`)
  for (const pattern of fontPatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: false,
      nodir: true,
    })
    result.fonts.push(...files.map((f) => join(projectPath, f)))
  }

  // Détection routes API (via fichiers de config ou patterns)
  // Note: Cette détection est basique, peut être améliorée selon les frameworks
  const routeFiles = await glob(`**/*{route,api,graphql}*.{js,ts,json}`, {
    cwd: projectPath,
    ignore: IGNORED_PATTERNS,
    absolute: false,
    nodir: true,
  })
  if (routeFiles.length > 0) {
    result.apiRoutes.push(...API_PATTERNS)
  }

  // Filtrer les fichiers qui n'existent pas réellement
  result.javascript = result.javascript.filter((f) => {
    try {
      return statSync(f).isFile()
    } catch {
      return false
    }
  })
  result.css = result.css.filter((f) => {
    try {
      return statSync(f).isFile()
    } catch {
      return false
    }
  })
  result.images = result.images.filter((f) => {
    try {
      return statSync(f).isFile()
    } catch {
      return false
    }
  })
  result.fonts = result.fonts.filter((f) => {
    try {
      return statSync(f).isFile()
    } catch {
      return false
    }
  })

  return result
}

