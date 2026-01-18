/**
 * UniversalPWA Configuration
 * 
 * Main export for configuration schema and utilities
 */

export * from './schema.js'
export { loadConfig, findConfigFile, type ConfigLoadResult } from './loader.js'
export { validateConfig, type ValidationResult } from './validator.js'
