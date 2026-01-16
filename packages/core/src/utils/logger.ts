import pino from 'pino'

/**
 * Logger centralisé pour UniversalPWA Core
 * 
 * Utilise Pino pour un logging structuré et performant.
 * - En développement : logs formatés avec pino-pretty
 * - En production : logs JSON structurés
 * 
 * @example
 * ```typescript
 * import { logger } from './utils/logger.js'
 * 
 * logger.info({ module: 'scanner' }, 'Scanning project...')
 * logger.warn({ path: '/some/path' }, 'File not found')
 * logger.error({ error }, 'Failed to process')
 * ```
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport:
    process.env.NODE_ENV === 'development' || process.env.LOG_PRETTY === 'true'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
})

/**
 * Crée un logger enfant avec un contexte spécifique
 * 
 * @param context - Contexte à ajouter à tous les logs (ex: { module: 'scanner' })
 * @returns Logger enfant avec contexte
 * 
 * @example
 * ```typescript
 * const moduleLogger = createLogger({ module: 'scanner' })
 * moduleLogger.info('Scanning started') // Log avec { module: 'scanner' }
 * ```
 */
export function createLogger(context: Record<string, unknown>): pino.Logger {
  return logger.child(context)
}
