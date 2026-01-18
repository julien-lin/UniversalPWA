/**
 * UniversalPWA Configuration
 * 
 * Main export for configuration schema and utilities
 */

export * from './schema.js'
export {
  loadConfig,
  findConfigFile,
  type ConfigLoadResult,
  type ConfigLoadOptions,
  ConfigLoadError,
  ConfigValidationError,
} from './loader.js'
export { validateConfig, type ConfigValidationResult } from './validator.js'
