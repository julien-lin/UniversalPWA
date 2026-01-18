/**
 * Configuration Loader
 * 
 * Loads configuration from various file formats
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { UniversalPWAConfig } from './schema.js'
import { DEFAULT_CONFIG } from './schema.js'

export interface ConfigLoadResult {
  config: UniversalPWAConfig
  filePath: string
  format: 'ts' | 'js' | 'json' | 'yaml'
}

/**
 * Find configuration file in project directory
 */
export async function findConfigFile(projectPath: string): Promise<string | null> {
  const configNames = [
    'universal-pwa.config.ts',
    'universal-pwa.config.js',
    'universal-pwa.config.json',
    'universal-pwa.config.yaml',
    'universal-pwa.config.yml',
    '.universal-pwa.config.ts',
    '.universal-pwa.config.js',
    '.universal-pwa.config.json',
  ]

  for (const name of configNames) {
    const filePath = join(projectPath, name)
    if (existsSync(filePath)) {
      return filePath
    }
  }

  return null
}

/**
 * Load configuration from file
 */
export async function loadConfig(filePath: string): Promise<ConfigLoadResult> {
  if (!existsSync(filePath)) {
    throw new Error(`Configuration file not found: ${filePath}`)
  }

  const ext = filePath.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'ts':
      return await loadTypeScriptConfig(filePath)
    case 'js':
      return await loadJavaScriptConfig(filePath)
    case 'json':
      return loadJSONConfig(filePath)
    case 'yaml':
    case 'yml':
      return loadYAMLConfig(filePath)
    default:
      throw new Error(`Unsupported configuration file format: ${ext}`)
  }
}

/**
 * Load TypeScript configuration
 */
async function loadTypeScriptConfig(filePath: string): Promise<ConfigLoadResult> {
  // For TypeScript configs, we need to use dynamic import
  // This requires the file to be compiled or use tsx/ts-node
  try {
    const fileUrl = pathToFileURL(filePath).href
    const module = await import(fileUrl)
    const config = module.default || module.config || module

    return {
      config: mergeWithDefaults(config),
      filePath,
      format: 'ts',
    }
  } catch (error) {
    throw new Error(`Failed to load TypeScript config: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Load JavaScript configuration
 */
async function loadJavaScriptConfig(filePath: string): Promise<ConfigLoadResult> {
  try {
    const fileUrl = pathToFileURL(filePath).href
    const module = await import(fileUrl)
    const config = module.default || module.config || module

    return {
      config: mergeWithDefaults(config),
      filePath,
      format: 'js',
    }
  } catch (error) {
    throw new Error(`Failed to load JavaScript config: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Load JSON configuration
 */
function loadJSONConfig(filePath: string): ConfigLoadResult {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const config = JSON.parse(content)

    return {
      config: mergeWithDefaults(config),
      filePath,
      format: 'json',
    }
  } catch (error) {
    throw new Error(`Failed to load JSON config: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Load YAML configuration
 */
function loadYAMLConfig(filePath: string): ConfigLoadResult {
  // YAML support requires js-yaml package
  // For now, throw an error indicating it's not yet implemented
  throw new Error('YAML configuration support is not yet implemented. Please use .ts, .js, or .json format.')
}

/**
 * Merge user config with defaults
 */
function mergeWithDefaults(userConfig: Partial<UniversalPWAConfig>): UniversalPWAConfig {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    app: {
      ...DEFAULT_CONFIG.app,
      ...userConfig.app,
    },
    icons: {
      ...DEFAULT_CONFIG.icons,
      ...userConfig.icons,
    },
    serviceWorker: {
      ...DEFAULT_CONFIG.serviceWorker,
      ...userConfig.serviceWorker,
    },
    injection: {
      ...DEFAULT_CONFIG.injection,
      ...userConfig.injection,
    },
    scanner: {
      ...DEFAULT_CONFIG.scanner,
      ...userConfig.scanner,
    },
    advancedCaching: {
      ...DEFAULT_CONFIG.advancedCaching,
      ...userConfig.advancedCaching,
    },
    output: {
      ...DEFAULT_CONFIG.output,
      ...userConfig.output,
    },
  }
}
