/**
 * Configuration Validator
 * 
 * Validates configuration using Zod schema
 */

import { UniversalPWAConfigSchema, type UniversalPWAConfig } from './schema.js'

export interface ConfigValidationResult {
  success: boolean
  config?: UniversalPWAConfig
  errors?: Array<{
    path: string
    message: string
  }>
}

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  try {
    const validated = UniversalPWAConfigSchema.parse(config)

    return {
      success: true,
      config: validated,
    }
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> }
      
      return {
        success: false,
        errors: zodError.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      }
    }

    return {
      success: false,
      errors: [
        {
          path: '',
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    }
  }
}
