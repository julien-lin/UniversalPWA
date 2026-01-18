/**
 * UniversalPWA Configuration Schema
 * 
 * Defines the configuration file schema with validation using Zod
 */

import { z } from 'zod'

/**
 * Icon generation configuration
 */
export const IconConfigSchema = z.object({
  /** Generate PWA icons */
  generate: z.boolean().default(true),
  /** Generate splash screens */
  generateSplashScreens: z.boolean().default(false),
  /** Source image path for icons */
  source: z.string().optional(),
  /** Icon sizes to generate */
  sizes: z.array(z.number()).optional(),
  /** Output directory for icons */
  outputDir: z.string().optional(),
})

/**
 * Service Worker configuration
 */
export const ServiceWorkerConfigSchema = z.object({
  /** Generate service worker */
  generate: z.boolean().default(true),
  /** Service worker destination path */
  destination: z.string().default('sw.js'),
  /** Skip waiting on install */
  skipWaiting: z.boolean().default(true),
  /** Claim clients on activate */
  clientsClaim: z.boolean().default(true),
  /** Offline fallback page */
  offlinePage: z.string().optional().default(undefined),
  /** Offline fallback image */
  offlineImage: z.string().optional().default(undefined),
})

/**
 * Manifest configuration
 */
export const ManifestConfigSchema = z.object({
  /** Generate manifest */
  generate: z.boolean().default(true),
  /** Manifest destination path */
  destination: z.string().default('manifest.json'),
  /** App name */
  name: z.string().optional(),
  /** App short name (max 12 chars) */
  shortName: z.string().optional(),
  /** App description */
  description: z.string().optional(),
  /** Theme color (hex) */
  themeColor: z.string().optional(),
  /** Background color (hex) */
  backgroundColor: z.string().optional(),
  /** Start URL */
  startUrl: z.string().default('/'),
  /** Scope */
  scope: z.string().default('/'),
  /** Display mode */
  display: z.enum(['fullscreen', 'standalone', 'minimal-ui', 'browser']).default('standalone'),
  /** Orientation */
  orientation: z.enum(['any', 'natural', 'landscape', 'portrait', 'portrait-primary', 'portrait-secondary', 'landscape-primary', 'landscape-secondary']).optional(),
})

/**
 * HTML injection configuration
 */
export const InjectionConfigSchema = z.object({
  /** Inject meta tags */
  inject: z.boolean().default(true),
  /** Maximum number of HTML files to process */
  maxFiles: z.number().positive().optional(),
  /** HTML file patterns to include */
  include: z.array(z.string()).optional(),
  /** HTML file patterns to exclude */
  exclude: z.array(z.string()).optional(),
})

/**
 * Scanner configuration
 */
export const ScannerConfigSchema = z.object({
  /** Auto-detect backend framework */
  autoDetectBackend: z.boolean().default(true),
  /** Force scan (bypass cache) */
  forceScan: z.boolean().default(false),
  /** Disable cache */
  noCache: z.boolean().default(false),
  /** Cache TTL in seconds */
  cacheTTL: z.number().positive().optional(),
})

/**
 * Advanced caching configuration
 */
export const AdvancedCachingConfigSchema = z.object({
  /** Enable advanced caching */
  enabled: z.boolean().default(false),
  /** Cache version */
  version: z.string().optional(),
  /** Cache name prefix */
  cacheNamePrefix: z.string().optional(),
  /** Auto-generate version from file hashes */
  autoVersion: z.boolean().default(false),
  /** Manual version */
  manualVersion: z.boolean().default(false),
  /** Auto-invalidate on file changes */
  autoInvalidate: z.boolean().default(false),
  /** Enable dependency tracking */
  dependencyTracking: z.boolean().default(false),
  /** Files to track for versioning */
  trackedFiles: z.array(z.string()).optional(),
  /** File patterns to ignore for invalidation */
  ignorePatterns: z.array(z.string()).optional(),
})

/**
 * Output configuration
 */
export const OutputConfigSchema = z.object({
  /** Output directory */
  dir: z.string().default('public'),
  /** Clean output directory before generation */
  clean: z.boolean().default(false),
})

/**
 * Main UniversalPWA configuration schema
 */
export const UniversalPWAConfigSchema = z.object({
  /** Project root path (relative to config file) */
  projectRoot: z.string().default('.'),
  
  /** Application metadata */
  app: ManifestConfigSchema.optional(),
  
  /** Icon generation */
  icons: IconConfigSchema.optional(),
  
  /** Service Worker */
  serviceWorker: ServiceWorkerConfigSchema.optional(),
  
  /** HTML injection */
  injection: InjectionConfigSchema.optional(),
  
  /** Scanner */
  scanner: ScannerConfigSchema.optional(),
  
  /** Advanced caching */
  advancedCaching: AdvancedCachingConfigSchema.optional(),
  
  /** Output */
  output: OutputConfigSchema.optional(),
  
  /** Backend framework override */
  backend: z.enum(['laravel', 'symfony', 'django', 'flask', 'wordpress', 'next', 'nuxt', 'react', 'vue', 'angular', 'static']).optional(),
  
  /** Architecture override */
  architecture: z.enum(['spa', 'ssr', 'static']).optional(),
})

/**
 * TypeScript type for the configuration
 */
export type UniversalPWAConfig = z.infer<typeof UniversalPWAConfigSchema>
export type ConfigIconConfig = z.infer<typeof IconConfigSchema>
export type ConfigServiceWorkerConfig = z.infer<typeof ServiceWorkerConfigSchema>
export type ConfigManifestConfig = z.infer<typeof ManifestConfigSchema>
export type ConfigInjectionConfig = z.infer<typeof InjectionConfigSchema>
export type ConfigScannerConfig = z.infer<typeof ScannerConfigSchema>
export type ConfigAdvancedCachingConfig = z.infer<typeof AdvancedCachingConfigSchema>
export type ConfigOutputConfig = z.infer<typeof OutputConfigSchema>

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: UniversalPWAConfig = {
  projectRoot: '.',
  app: {
    generate: true,
    destination: 'manifest.json',
    startUrl: '/',
    scope: '/',
    display: 'standalone',
  },
  icons: {
    generate: true,
    generateSplashScreens: false,
  },
  serviceWorker: {
    generate: true,
    destination: 'sw.js',
    skipWaiting: true,
    clientsClaim: true,
  },
  injection: {
    inject: true,
  },
  scanner: {
    autoDetectBackend: true,
    forceScan: false,
    noCache: false,
  },
  output: {
    dir: 'public',
    clean: false,
  },
}
