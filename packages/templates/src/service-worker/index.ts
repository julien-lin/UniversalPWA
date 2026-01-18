import { staticServiceWorkerTemplate } from './static.js'
import { spaServiceWorkerTemplate } from './spa.js'
import { ssrServiceWorkerTemplate } from './ssr.js'
import { wordpressServiceWorkerTemplate } from './wordpress.js'
import { phpServiceWorkerTemplate } from './php.js'
import { laravelSpaServiceWorkerTemplate } from './laravel-spa.js'
import { laravelSsrServiceWorkerTemplate } from './laravel-ssr.js'
import { laravelApiServiceWorkerTemplate } from './laravel-api.js'
import { symfonySpaServiceWorkerTemplate } from './symfony-spa.js'
import { symfonyApiServiceWorkerTemplate } from './symfony-api.js'
import { djangoSpaServiceWorkerTemplate } from './django-spa.js'
import { djangoApiServiceWorkerTemplate } from './django-api.js'

export type ServiceWorkerTemplateType =
  | 'static'
  | 'spa'
  | 'ssr'
  | 'wordpress'
  | 'php'
  | 'laravel-spa'
  | 'laravel-ssr'
  | 'laravel-api'
  | 'symfony-spa'
  | 'symfony-api'
  | 'django-spa'
  | 'django-api'

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
    'laravel-spa': laravelSpaServiceWorkerTemplate,
    'laravel-ssr': laravelSsrServiceWorkerTemplate,
    'laravel-api': laravelApiServiceWorkerTemplate,
    'symfony-spa': symfonySpaServiceWorkerTemplate,
    'symfony-api': symfonyApiServiceWorkerTemplate,
    'django-spa': djangoSpaServiceWorkerTemplate,
    'django-api': djangoApiServiceWorkerTemplate,
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
  return [
    'static',
    'spa',
    'ssr',
    'wordpress',
    'php',
    'laravel-spa',
    'laravel-ssr',
    'laravel-api',
    'symfony-spa',
    'symfony-api',
    'django-spa',
    'django-api',
  ]
}

/**
 * Détermine le type de template à partir de l'architecture et du framework
 */
export function determineTemplateType(
  architecture: 'spa' | 'ssr' | 'static',
  framework?: string | null,
): ServiceWorkerTemplateType {
  // Framework specific
  if (framework === 'WordPress' || framework === 'WooCommerce') {
    return 'wordpress'
  }

  // CMS & E-commerce
  if (
    framework === 'Drupal' ||
    framework === 'Joomla' ||
    framework === 'Magento' ||
    framework === 'Shopify' ||
    framework === 'PrestaShop'
  ) {
    return 'php' // Use generic PHP template for CMS/e-commerce
  }

  if (framework === 'Symfony') {
    return architecture === 'spa' ? 'symfony-spa' : 'symfony-api'
  }

  // PHP frameworks
  if (framework === 'CodeIgniter' || framework === 'CakePHP' || framework === 'Yii' || framework === 'Laminas') {
    return 'php'
  }

  if (framework === 'Laravel') {
    if (architecture === 'spa') {
      return 'laravel-spa'
    }
    if (architecture === 'ssr') {
      return 'laravel-ssr'
    }
    return 'laravel-api'
  }

  // Python frameworks
  if (framework === 'Django') {
    return architecture === 'spa' ? 'django-spa' : 'django-api'
  }

  // Backend frameworks (Python, Ruby, Go, Java, .NET) - use static or SSR template based on architecture
  // Django, Flask, FastAPI, Rails, Sinatra, Go, Spring, ASP.NET typically serve static files
  // They will use the architecture-based template (static/ssr/spa)

  // Architecture
  if (architecture === 'spa') {
    return 'spa'
  }

  if (architecture === 'ssr') {
    return 'ssr'
  }

  // Default: static
  return 'static'
}

// Export des templates individuels
export { staticServiceWorkerTemplate } from './static.js'
export { spaServiceWorkerTemplate } from './spa.js'
export { ssrServiceWorkerTemplate } from './ssr.js'
export { wordpressServiceWorkerTemplate } from './wordpress.js'
export { phpServiceWorkerTemplate } from './php.js'
export { laravelSpaServiceWorkerTemplate } from './laravel-spa.js'
export { laravelSsrServiceWorkerTemplate } from './laravel-ssr.js'
export { laravelApiServiceWorkerTemplate } from './laravel-api.js'
export { symfonySpaServiceWorkerTemplate } from './symfony-spa.js'
export { symfonyApiServiceWorkerTemplate } from './symfony-api.js'
export { djangoSpaServiceWorkerTemplate } from './django-spa.js'
export { djangoApiServiceWorkerTemplate } from './django-api.js'

