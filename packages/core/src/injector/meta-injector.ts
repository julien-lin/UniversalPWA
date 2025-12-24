import { parseHTML, parseHTMLFile, findElement, elementExists } from './html-parser.js'
import { writeFileSync } from 'fs'
import { render } from 'dom-serializer'
import type { Element } from 'domhandler'

export interface MetaInjectorOptions {
  manifestPath?: string
  themeColor?: string
  backgroundColor?: string
  appleTouchIcon?: string
  appleMobileWebAppCapable?: boolean
  appleMobileWebAppStatusBarStyle?: 'default' | 'black' | 'black-translucent'
  appleMobileWebAppTitle?: string
  serviceWorkerPath?: string
}

export interface InjectionResult {
  injected: string[]
  skipped: string[]
  warnings: string[]
}

/**
 * Injecte les meta-tags PWA dans le HTML
 */
export function injectMetaTags(htmlContent: string, options: MetaInjectorOptions = {}): { html: string; result: InjectionResult } {
  const parsed = parseHTML(htmlContent)
  const result: InjectionResult = {
    injected: [],
    skipped: [],
    warnings: [],
  }

  // Créer ou trouver le head
  let head = parsed.head
  if (!head) {
    // Si pas de head, créer un head
    if (parsed.html) {
      // Créer un head dans html
      const headElement = {
        type: 'tag',
        name: 'head',
        tagName: 'head',
        attribs: {},
        children: [],
        parent: parsed.html,
        next: null,
        prev: null,
      } as unknown as Element
      if (parsed.html.children) {
        parsed.html.children.unshift(headElement)
      } else {
        parsed.html.children = [headElement]
      }
      head = headElement
      result.warnings.push('Created <head> tag (was missing)')
    } else {
      result.warnings.push('No <html> or <head> tag found, meta tags may not be injected correctly')
      return { html: htmlContent, result }
    }
  }

  // Injecter le manifest link
  if (options.manifestPath) {
    const manifestHref = options.manifestPath.startsWith('/') ? options.manifestPath : `/${options.manifestPath}`
    if (!elementExists(parsed, 'link', { name: 'rel', value: 'manifest' })) {
      injectLinkTag(head, 'manifest', manifestHref)
      result.injected.push(`<link rel="manifest" href="${manifestHref}">`)
    } else {
      result.skipped.push('manifest link (already exists)')
    }
  }

  // Injecter theme-color
  if (options.themeColor) {
    const existingThemeColor = findElement(parsed, 'meta', { name: 'name', value: 'theme-color' })
    if (existingThemeColor) {
      // Mettre à jour la valeur existante
      updateMetaContent(existingThemeColor, options.themeColor)
      result.injected.push(`<meta name="theme-color" content="${options.themeColor}"> (updated)`)
    } else if (!elementExists(parsed, 'meta', { name: 'theme-color', value: options.themeColor })) {
      injectMetaTag(head, 'theme-color', options.themeColor)
      result.injected.push(`<meta name="theme-color" content="${options.themeColor}">`)
    } else {
      result.skipped.push('theme-color (already exists)')
    }
  }

  // Injecter apple-touch-icon
  if (options.appleTouchIcon) {
    const iconHref = options.appleTouchIcon.startsWith('/') ? options.appleTouchIcon : `/${options.appleTouchIcon}`
    if (!elementExists(parsed, 'link', { name: 'rel', value: 'apple-touch-icon' })) {
      injectLinkTag(head, 'apple-touch-icon', iconHref)
      result.injected.push(`<link rel="apple-touch-icon" href="${iconHref}">`)
    } else {
      result.skipped.push('apple-touch-icon (already exists)')
    }
  }

  // Injecter apple-mobile-web-app-capable
  if (options.appleMobileWebAppCapable !== undefined) {
    const content = options.appleMobileWebAppCapable ? 'yes' : 'no'
    if (!elementExists(parsed, 'meta', { name: 'apple-mobile-web-app-capable', value: content })) {
      injectMetaTag(head, 'apple-mobile-web-app-capable', content)
      result.injected.push(`<meta name="apple-mobile-web-app-capable" content="${content}">`)
    } else {
      result.skipped.push('apple-mobile-web-app-capable (already exists)')
    }
  }

  // Injecter apple-mobile-web-app-status-bar-style
  if (options.appleMobileWebAppStatusBarStyle) {
    if (!elementExists(parsed, 'meta', { name: 'apple-mobile-web-app-status-bar-style', value: options.appleMobileWebAppStatusBarStyle })) {
      injectMetaTag(head, 'apple-mobile-web-app-status-bar-style', options.appleMobileWebAppStatusBarStyle)
      result.injected.push(`<meta name="apple-mobile-web-app-status-bar-style" content="${options.appleMobileWebAppStatusBarStyle}">`)
    } else {
      result.skipped.push('apple-mobile-web-app-status-bar-style (already exists)')
    }
  }

  // Injecter apple-mobile-web-app-title
  if (options.appleMobileWebAppTitle) {
    if (!elementExists(parsed, 'meta', { name: 'apple-mobile-web-app-title', value: options.appleMobileWebAppTitle })) {
      injectMetaTag(head, 'apple-mobile-web-app-title', options.appleMobileWebAppTitle)
      result.injected.push(`<meta name="apple-mobile-web-app-title" content="${options.appleMobileWebAppTitle}">`)
    } else {
      result.skipped.push('apple-mobile-web-app-title (already exists)')
    }
  }

  // Reconstruire le HTML avec dom-serializer
  const modifiedHtml = render(parsed.document, { decodeEntities: false })

  // Injecter le service worker registration (dans le body ou avant </body>)
  if (options.serviceWorkerPath) {
    const swPath = options.serviceWorkerPath.startsWith('/') ? options.serviceWorkerPath : `/${options.serviceWorkerPath}`
    if (!htmlContent.includes('navigator.serviceWorker')) {
      // Échapper le chemin pour éviter l'injection XSS
      const escapedSwPath = escapeJavaScriptString(swPath)
      
      // Injecter le script de registration du service worker
      const swScript = `\n<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(${escapedSwPath})
      .then((registration) => console.log('SW registered:', registration))
      .catch((error) => console.error('SW registration failed:', error));
  });
}
</script>`
      // Injecter avant </body>
      const finalHtml = modifiedHtml.replace('</body>', `${swScript}\n</body>`)
      result.injected.push('Service Worker registration script')
      return { html: finalHtml, result }
    } else {
      result.skipped.push('Service Worker registration (already exists)')
    }
  }

  return { html: modifiedHtml, result }
}

/**
 * Injecte un tag link dans le head
 */
function injectLinkTag(head: Element, rel: string, href: string): void {
  const linkElement = {
    type: 'tag',
    name: 'link',
    tagName: 'link',
    attribs: {
      rel,
      href,
    },
    children: [],
    parent: head,
    next: null,
    prev: null,
  } as unknown as Element

  if (!head.children) {
    head.children = []
  }
  head.children.push(linkElement)
}

/**
 * Injecte un tag meta dans le head
 */
function injectMetaTag(head: Element, name: string, content: string): void {
  const metaElement = {
    type: 'tag',
    name: 'meta',
    tagName: 'meta',
    attribs: {
      name,
      content,
    },
    children: [],
    parent: head,
    next: null,
    prev: null,
  } as unknown as Element

  if (!head.children) {
    head.children = []
  }
  head.children.push(metaElement)
}

/**
 * Met à jour le contenu d'un meta tag existant
 */
function updateMetaContent(metaElement: Element, newContent: string): void {
  if (metaElement.attribs) {
    metaElement.attribs.content = newContent
  } else {
    metaElement.attribs = { content: newContent }
  }
}

/**
 * Échappe une chaîne pour l'injection sécurisée dans du JavaScript
 * Convertit la chaîne en une chaîne JavaScript échappée
 */
function escapeJavaScriptString(str: string): string {
  // Utiliser JSON.stringify pour échapper correctement tous les caractères spéciaux
  // Cela gère les guillemets, backslashes, newlines, etc.
  return JSON.stringify(str)
}

/**
 * Injecte les meta-tags dans un fichier HTML
 */
export function injectMetaTagsInFile(filePath: string, options: MetaInjectorOptions = {}): InjectionResult {
  const parsed = parseHTMLFile(filePath)
  const { html, result } = injectMetaTags(parsed.originalContent, options)

  // Écrire le HTML modifié
  writeFileSync(filePath, html, 'utf-8')

  return result
}
