import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface HttpsCheckResult {
  isSecure: boolean
  isLocalhost: boolean
  isProduction: boolean
  protocol: 'https' | 'http' | 'unknown'
  hostname: string | null
  warning?: string
  recommendation?: string
}

export interface HttpsCheckerOptions {
  url?: string
  projectPath?: string
  allowHttpLocalhost?: boolean
}

/**
 * Vérifie si une URL est en HTTPS ou localhost
 */
export function checkHttps(url: string, allowHttpLocalhost = true): HttpsCheckResult {
  let parsedUrl: URL

  try {
    parsedUrl = new URL(url)
  } catch {
    // Si l'URL n'est pas valide, on essaie de la traiter comme un chemin relatif
    return {
      isSecure: false,
      isLocalhost: false,
      isProduction: false,
      protocol: 'unknown',
      hostname: null,
      warning: 'Invalid URL format',
      recommendation: 'Provide a valid URL (e.g., https://example.com or http://localhost:3000)',
    }
  }

  const protocol = parsedUrl.protocol.replace(':', '') as 'https' | 'http' | 'unknown'
  const hostname = parsedUrl.hostname
  const isHttps = protocol === 'https'
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.endsWith('.local')

  const isSecure = isHttps || (isLocalhost && allowHttpLocalhost)
  const isProduction = isHttps && !isLocalhost

  let warning: string | undefined
  let recommendation: string | undefined

  if (!isSecure) {
    if (isLocalhost && !allowHttpLocalhost) {
      warning = 'Service Workers require HTTPS in production. HTTP is only allowed on localhost for development.'
      recommendation = 'Use HTTPS in production or enable allowHttpLocalhost option for development.'
    } else if (!isLocalhost) {
      warning = 'Service Workers require HTTPS in production. HTTP is not secure and will not work.'
      recommendation = 'Deploy your PWA with HTTPS. Consider using services like Vercel, Netlify, or Cloudflare that provide HTTPS by default.'
    }
  }

  return {
    isSecure,
    isLocalhost,
    isProduction,
    protocol,
    hostname,
    warning,
    recommendation,
  }
}

/**
 * Détecte l'URL du projet à partir de fichiers de configuration
 */
export function detectProjectUrl(projectPath: string): string | null {
  // Vérifier les fichiers de configuration courants
  const configFiles = [
    { file: 'package.json', key: 'homepage' as const },
    { file: 'package.json', key: 'url' as const },
    { file: '.env', pattern: /^.*URL.*=(.+)$/i },
    { file: '.env.local', pattern: /^.*URL.*=(.+)$/i },
    { file: 'vercel.json', key: 'url' as const },
    { file: 'netlify.toml', pattern: /^.*url.*=.*["'](.+)["']/i },
    { file: 'next.config.js', pattern: /baseUrl.*["'](.+)["']/ },
    { file: 'next.config.ts', pattern: /baseUrl.*["'](.+)["']/ },
  ]

  for (const config of configFiles) {
    const filePath = join(projectPath, config.file)

    if (existsSync(filePath)) {
      try {
        if (config.file.endsWith('.json') && config.key) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
          const content = parsed as Record<string, unknown>
          const value = content[config.key]
          if (value && typeof value === 'string') {
            return value
          }
        } else if (config.file.endsWith('.toml') && config.pattern) {
          const content = readFileSync(filePath, 'utf-8')
          const match = config.pattern ? content.match(config.pattern) : null
          if (match && match[1]) {
            return match[1]
          }
        } else if ((config.file.endsWith('.js') || config.file.endsWith('.ts')) && config.pattern) {
          const content = readFileSync(filePath, 'utf-8')
          const match = config.pattern ? content.match(config.pattern) : null
          if (match && match[1]) {
            return match[1]
          }
        } else if (config.file.startsWith('.env') && config.pattern) {
          const content = readFileSync(filePath, 'utf-8')
          const lines = content.split('\n')
          for (const line of lines) {
            const match = config.pattern ? line.match(config.pattern) : null
            if (match && match[1]) {
              return match[1].trim()
            }
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  return null
}

/**
 * Vérifie HTTPS pour un projet
 */
export function checkProjectHttps(options: HttpsCheckerOptions = {}): HttpsCheckResult {
  const { url, projectPath, allowHttpLocalhost = true } = options

  // Si une URL est fournie directement, l'utiliser
  if (url) {
    return checkHttps(url, allowHttpLocalhost)
  }

  // Sinon, essayer de détecter l'URL depuis les fichiers de configuration
  if (projectPath) {
    const detectedUrl = detectProjectUrl(projectPath)
    if (detectedUrl) {
      return checkHttps(detectedUrl, allowHttpLocalhost)
    }
  }

  // Par défaut, considérer comme non sécurisé si on ne peut pas déterminer
  return {
    isSecure: false,
    isLocalhost: false,
    isProduction: false,
    protocol: 'unknown',
    hostname: null,
    warning: 'Unable to determine project URL. HTTPS check cannot be performed.',
    recommendation: 'Provide a URL explicitly or ensure your project has a valid configuration file (package.json, .env, etc.).',
  }
}

