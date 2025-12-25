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
 * Parses an HTML file and returns the document structure
 */
export function parseHTMLFile(filePath: string, options: HTMLParserOptions = {}): ParsedHTML {
  const content = readFileSync(filePath, 'utf-8')
  return parseHTML(content, options)
}

/**
 * Parses an HTML string and returns the document structure
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

  // Find head, body, html elements
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

      // Recursively traverse children
      if (element.children) {
        for (const child of element.children) {
          findElements(child)
        }
      }
    }
  }

  // Traverse all document children
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
 * Finds an element in the document by tag name
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

      // Recursively traverse children
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
    // If it's a document, search in its children
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
 * Finds all elements matching a tag name
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

      // Don't include html, head, body elements in results (unless that's what we're looking for)
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

      // Recursively traverse children
      if (element.children) {
        for (const child of element.children) {
          const childElement = child as Element
          // Don't treat html, head, body as roots for search
          const childIsRoot = isRoot && childElement.type === 'tag' && (childElement.tagName.toLowerCase() === 'html' || childElement.tagName.toLowerCase() === 'head' || childElement.tagName.toLowerCase() === 'body')
          search(child, childIsRoot)
        }
      }
    }
  }

  // Search in head if available
  if (parsed.head) {
    search(parsed.head, true)
  } else {
    // If head doesn't exist, search in all document children
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
 * Checks if an element already exists in the document
 */
export function elementExists(
  parsed: ParsedHTML,
  tagName: string,
  attribute: { name: string; value: string },
): boolean {
  return findElement(parsed, tagName, attribute) !== null
}

/**
 * Converts a parsed document to HTML string
 */
export function serializeHTML(parsed: ParsedHTML): string {
  // Use simple approach: reconstruct HTML from document
  // For full implementation, could use dom-serializer
  // For now, return original content modified manually
  return parsed.originalContent
}
