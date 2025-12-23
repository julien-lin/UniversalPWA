import { staticServiceWorkerTemplate } from './static.js'
import { spaServiceWorkerTemplate } from './spa.js'
import { ssrServiceWorkerTemplate } from './ssr.js'
import { wordpressServiceWorkerTemplate } from './wordpress.js'
import { phpServiceWorkerTemplate } from './php.js'

export type ServiceWorkerTemplateType = 'static' | 'spa' | 'ssr' | 'wordpress' | 'php'

export interface ServiceWorkerTemplate {
  type: ServiceWorkerTemplateType
  content: string
}

/**
 * Récupère le template de service worker selon le type
 */
export function getServiceWorkerTemplate(type: ServiceWorkerTemplateType): ServiceWorkerTemplate {
  const templates: Record<ServiceWorkerTemplateType, string> = {
    static: staticServiceWorkerTemplate,
    spa: spaServiceWorkerTemplate,
    ssr: ssrServiceWorkerTemplate,
    wordpress: wordpressServiceWorkerTemplate,
    php: phpServiceWorkerTemplate,
  }

  const content = templates[type]

  if (!content) {
    throw new Error(`Unknown service worker template type: ${type}`)
  }

  return {
    type,
    content: content.trim(),
  }
}

/**
 * Liste tous les types de templates disponibles
 */
export function getAvailableTemplateTypes(): ServiceWorkerTemplateType[] {
  return ['static', 'spa', 'ssr', 'wordpress', 'php']
}

/**
 * Détermine le type de template à partir de l'architecture et du framework
 */
export function determineTemplateType(
  architecture: 'spa' | 'ssr' | 'static',
  framework?: string | null,
): ServiceWorkerTemplateType {
  // Framework spécifique
  if (framework === 'WordPress') {
    return 'wordpress'
  }

  if (framework === 'Symfony' || framework === 'Laravel') {
    return 'php'
  }

  // Architecture
  if (architecture === 'spa') {
    return 'spa'
  }

  if (architecture === 'ssr') {
    return 'ssr'
  }

  // Par défaut : statique
  return 'static'
}

// Export des templates individuels
export { staticServiceWorkerTemplate } from './static.js'
export { spaServiceWorkerTemplate } from './spa.js'
export { ssrServiceWorkerTemplate } from './ssr.js'
export { wordpressServiceWorkerTemplate } from './wordpress.js'
export { phpServiceWorkerTemplate } from './php.js'

