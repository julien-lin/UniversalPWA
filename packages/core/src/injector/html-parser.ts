import { parseDocument } from 'htmlparser2'
import { readFileSync } from 'fs'
import type { Element, AnyNode, Document } from 'domhandler'

/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison, @typescript-eslint/no-unnecessary-type-assertion */

export interface ParsedHTML {
  document: Document
  head: Element | null
  body: Element | null
  html: Element | null
  originalContent: string
}

export interface HTMLParserOptions {
  decodeEntities?: boolean
  lowerCaseAttributeNames?: boolean
}

/**
 * Parse un fichier HTML et retourne la structure du document
 */
export function parseHTMLFile(filePath: string, options: HTMLParserOptions = {}): ParsedHTML {
  const content = readFileSync(filePath, 'utf-8')
  return parseHTML(content, options)
}

/**
 * Parse une chaîne HTML et retourne la structure du document
 */
export function parseHTML(htmlContent: string, options: HTMLParserOptions = {}): ParsedHTML {
  const {
    decodeEntities = true,
    lowerCaseAttributeNames = true,
  } = options

  const document = parseDocument(htmlContent, {
    decodeEntities,
    lowerCaseAttributeNames,
    lowerCaseTags: true,
  })

  // Trouver les éléments head, body, html
  let head: Element | null = null
  let body: Element | null = null
  let html: Element | null = null

  const findElements = (node: AnyNode): void => {
    if (node.type === 'tag') {
      const element = node as Element
      const tagName = element.tagName.toLowerCase()

      if (tagName === 'head' && !head) {
        head = element
      } else if (tagName === 'body' && !body) {
        body = element
      } else if (tagName === 'html' && !html) {
        html = element
      }

      // Parcourir récursivement les enfants
      if (element.children) {
        for (const child of element.children) {
          findElements(child)
        }
      }
    }
  }

  // Parcourir tous les enfants du document
  if (document.children) {
    for (const child of document.children) {
      findElements(child)
    }
  }

  return {
    document,
    head,
    body,
    html,
    originalContent: htmlContent,
  }
}

/**
 * Trouve un élément dans le document par tag name
 */
export function findElement(
  parsed: ParsedHTML,
  tagName: string,
  attribute?: { name: string; value: string },
): Element | null {
  const searchIn = parsed.head || parsed.document

  const search = (node: AnyNode): Element | null => {
    if (node.type === 'tag') {
      const element = node as Element
      if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
        if (!attribute) {
          return element
        }

        const attrValue = element.attributes?.find((attr) => attr.name.toLowerCase() === attribute.name.toLowerCase())?.value
        if (attrValue === attribute.value) {
          return element
        }
      }

      // Parcourir récursivement les enfants
      if (element.children) {
        for (const child of element.children) {
          const found = search(child)
          if (found) {
            return found
          }
        }
      }
    }

    return null
  }

  if (searchIn) {
    if (searchIn.type === 'tag') {
      return search(searchIn)
    }
    // Si c'est un document, chercher dans ses enfants
    if ('children' in searchIn && searchIn.children) {
      for (const child of searchIn.children) {
        const found = search(child)
        if (found) {
          return found
        }
      }
    }
  }

  return null
}

/**
 * Trouve tous les éléments correspondant à un tag name
 */
export function findAllElements(
  parsed: ParsedHTML,
  tagName: string,
  attribute?: { name: string; value?: string },
): Element[] {
  const results: Element[] = []
  const targetTagName = tagName.toLowerCase()

  const search = (node: AnyNode, isRoot = false): void => {
    if (node.type === 'tag') {
      const element = node as Element
      const nodeTagName = element.tagName.toLowerCase()

      // Ne pas inclure les éléments html, head, body dans les résultats (sauf si c'est ce qu'on cherche)
      if (nodeTagName === targetTagName && (!isRoot || targetTagName === 'html' || targetTagName === 'head' || targetTagName === 'body')) {
        if (!attribute) {
          results.push(element)
        } else {
          const attrValue = element.attributes?.find((attr) => attr.name.toLowerCase() === attribute.name.toLowerCase())?.value
          if (attribute.value === undefined || attrValue === attribute.value) {
            results.push(element)
          }
        }
      }

      // Parcourir récursivement les enfants
      if (element.children) {
        for (const child of element.children) {
          const childElement = child as Element
          // Ne pas traiter html, head, body comme racines pour la recherche
          const childIsRoot = isRoot && childElement.type === 'tag' && (childElement.tagName.toLowerCase() === 'html' || childElement.tagName.toLowerCase() === 'head' || childElement.tagName.toLowerCase() === 'body')
          search(child, childIsRoot)
        }
      }
    }
  }

  // Chercher dans head si disponible
  if (parsed.head) {
    search(parsed.head, true)
  } else {
    // Si head n'existe pas, chercher dans tous les enfants du document
    if (parsed.document.children) {
      for (const child of parsed.document.children) {
        const childElement = child as Element
        const childIsRoot = childElement.type === 'tag' && (childElement.tagName.toLowerCase() === 'html' || childElement.tagName.toLowerCase() === 'head' || childElement.tagName.toLowerCase() === 'body')
        search(child, childIsRoot)
      }
    }
  }

  return results
}

/**
 * Vérifie si un élément existe déjà dans le document
 */
export function elementExists(
  parsed: ParsedHTML,
  tagName: string,
  attribute: { name: string; value: string },
): boolean {
  return findElement(parsed, tagName, attribute) !== null
}

/**
 * Convertit un document parsé en HTML string
 */
export function serializeHTML(parsed: ParsedHTML): string {
  // Utiliser une approche simple : reconstruire le HTML à partir du document
  // Pour une implémentation complète, on pourrait utiliser dom-serializer
  // Pour l'instant, on retourne le contenu original modifié manuellement
  return parsed.originalContent
}
