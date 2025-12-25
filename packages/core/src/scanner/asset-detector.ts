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

  // JS detection (include root and subdirectory files)
  const jsExtensionsStr = JS_EXTENSIONS.map((ext) => ext.slice(1)).join(',')
  const jsPattern = `**/*.{${jsExtensionsStr}}`
  const jsRootPattern = `*.{${jsExtensionsStr}}`

  const [jsFiles, jsRootFiles] = await Promise.all([
    glob(jsPattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: true,
      nodir: true,
    }),
    glob(jsRootPattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: true,
      nodir: true,
    }),
  ])

  const allJsFiles = new Set<string>([...jsFiles, ...jsRootFiles])
  result.javascript.push(...allJsFiles)

  // CSS detection (include root and subdirectory files)
  const cssExtensionsStr = CSS_EXTENSIONS.map((ext) => ext.slice(1)).join(',')
  const cssPattern = `**/*.{${cssExtensionsStr}}`
  const cssFiles = await glob(cssPattern, {
    cwd: projectPath,
    ignore: IGNORED_PATTERNS,
    absolute: false,
    nodir: true,
  })
  const cssRootPattern = `*.{${cssExtensionsStr}}`
  const cssRootFiles = await glob(cssRootPattern, {
    cwd: projectPath,
    ignore: IGNORED_PATTERNS,
    absolute: false,
    nodir: true,
  })
  const allCssFiles = [...new Set([...cssFiles, ...cssRootFiles])]
  result.css.push(...allCssFiles.map((f) => join(projectPath, f)))

  // Image detection (include root and subdirectory files)
  const imagePatterns = IMAGE_EXTENSIONS.flatMap((ext) => [`**/*${ext}`, `*${ext}`])
  const allImageFiles = new Set<string>()
  for (const pattern of imagePatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: false,
      nodir: true,
    })
    files.forEach((f) => allImageFiles.add(f))
  }
  result.images.push(...Array.from(allImageFiles).map((f) => join(projectPath, f)))

  // Font detection (include root and subdirectory files)
  const fontPatterns = FONT_EXTENSIONS.flatMap((ext) => [`**/*${ext}`, `*${ext}`])
  const allFontFiles = new Set<string>()
  for (const pattern of fontPatterns) {
    const files = await glob(pattern, {
      cwd: projectPath,
      ignore: IGNORED_PATTERNS,
      absolute: false,
      nodir: true,
    })
    files.forEach((f) => allFontFiles.add(f))
  }
  result.fonts.push(...Array.from(allFontFiles).map((f) => join(projectPath, f)))

  // API routes detection (via config files or patterns)
  // Note: This detection is basic, can be improved per framework
  const routeFiles = await glob(`**/*{route,api,graphql}*.{js,ts,json}`, {
    cwd: projectPath,
    ignore: IGNORED_PATTERNS,
    absolute: false,
    nodir: true,
  })
  if (routeFiles.length > 0) {
    result.apiRoutes.push(...API_PATTERNS)
  }

  // Filter files that don't actually exist
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

