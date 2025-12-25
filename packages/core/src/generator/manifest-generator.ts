import { z } from 'zod'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Zod schema for manifest validation
const ManifestIconSchema = z.object({
  src: z.string(),
  sizes: z.string(),
  type: z.string().optional(),
  purpose: z.string().optional(),
})

const ManifestSplashScreenSchema = z.object({
  src: z.string(),
  sizes: z.string(),
  type: z.string().optional(),
})

export const ManifestSchema = z.object({
  name: z.string().min(1),
  short_name: z.string().min(1).max(12),
  description: z.string().optional(),
  start_url: z.string().default('/'),
  scope: z.string().default('/'),
  display: z.enum(['standalone', 'fullscreen', 'minimal-ui', 'browser']).default('standalone'),
  orientation: z.enum(['any', 'portrait', 'landscape']).optional(),
  theme_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icons: z.array(ManifestIconSchema).min(1),
  splash_screens: z.array(ManifestSplashScreenSchema).optional(),
  categories: z.array(z.string()).optional(),
  lang: z.string().optional(),
  dir: z.enum(['ltr', 'rtl', 'auto']).optional(),
  prefer_related_applications: z.boolean().optional(),
  related_applications: z.array(z.unknown()).optional(),
})

export type Manifest = z.infer<typeof ManifestSchema>
export type ManifestIcon = z.infer<typeof ManifestIconSchema>
export type ManifestSplashScreen = z.infer<typeof ManifestSplashScreenSchema>

export interface ManifestGeneratorOptions {
  name: string
  shortName: string
  description?: string
  startUrl?: string
  scope?: string
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser'
  orientation?: 'any' | 'portrait' | 'landscape'
  themeColor?: string
  backgroundColor?: string
  icons: ManifestIcon[]
  splashScreens?: ManifestSplashScreen[]
  categories?: string[]
  lang?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  preferRelatedApplications?: boolean
  relatedApplications?: unknown[]
}

/**
 * Generates a manifest.json for PWA
 */
export function generateManifest(options: ManifestGeneratorOptions): Manifest {
  // Validate and normalize shortName - ensure it's always a valid string
  let shortName: string = 'PWA' // Default value
  
  if (options.shortName && typeof options.shortName === 'string' && options.shortName.trim().length > 0) {
    shortName = options.shortName.trim().substring(0, 12)
  } else if (options.name && typeof options.name === 'string' && options.name.length > 0) {
    shortName = options.name.substring(0, 12)
  }
  
  // Ensure shortName is never empty
  if (!shortName || shortName.trim().length === 0) {
    shortName = 'PWA'
  }
  
  // Explicit conversion to string and limit to 12 characters
  shortName = String(shortName).trim().substring(0, 12) || 'PWA'
  
  const manifest: Manifest = {
    name: options.name,
    short_name: shortName,
    start_url: options.startUrl ?? '/',
    scope: options.scope ?? '/',
    display: options.display ?? 'standalone',
    icons: options.icons,
  }

  if (options.description) {
    manifest.description = options.description
  }

  if (options.orientation) {
    manifest.orientation = options.orientation
  }

  // Always include theme_color and background_color for PWA installability
  // Use provided values or sensible defaults
  manifest.theme_color = options.themeColor ?? '#ffffff'
  manifest.background_color = options.backgroundColor ?? '#ffffff'

  if (options.splashScreens && options.splashScreens.length > 0) {
    manifest.splash_screens = options.splashScreens
  }

  if (options.categories && options.categories.length > 0) {
    manifest.categories = options.categories
  }

  if (options.lang) {
    manifest.lang = options.lang
  }

  if (options.dir) {
    manifest.dir = options.dir
  }

  if (options.preferRelatedApplications !== undefined) {
    manifest.prefer_related_applications = options.preferRelatedApplications
  }

  if (options.relatedApplications && options.relatedApplications.length > 0) {
    manifest.related_applications = options.relatedApplications
  }

  // Validate with Zod
  return ManifestSchema.parse(manifest)
}

/**
 * Writes manifest.json to the output directory
 */
export function writeManifest(manifest: Manifest, outputDir: string): string {
  const manifestPath = join(outputDir, 'manifest.json')
  const manifestJson = JSON.stringify(manifest, null, 2)
  writeFileSync(manifestPath, manifestJson, 'utf-8')
  return manifestPath
}

/**
 * Generates and writes manifest.json
 */
export function generateAndWriteManifest(options: ManifestGeneratorOptions, outputDir: string): string {
  const manifest = generateManifest(options)
  return writeManifest(manifest, outputDir)
}

