import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { parseHTML, parseHTMLFile, findElement, findAllElements, elementExists, serializeHTML } from './html-parser'

const TEST_DIR = join(process.cwd(), '.test-tmp-html-parser')

// Helpers
const html = (content: string) => `<html><head>${content}</head></html>`
const htmlWithBody = (headContent: string, bodyContent: string) =>
  `<html><head>${headContent}</head><body>${bodyContent}</body></html>`

describe('html-parser', () => {
  beforeEach(() => {
    try {
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true })
      }
    } catch {
      // Ignore errors during cleanup
    }
    mkdirSync(TEST_DIR, { recursive: true })
  })

  describe('parseHTML', () => {
    it.each([
      {
        name: 'simple HTML',
        input: htmlWithBody('<title>Test</title>', '<p>Content</p>'),
        hasHead: true,
        hasBody: true,
      },
      { name: 'no html tag', input: '<head><title>Test</title></head><body></body>', hasHead: true, hasBody: true },
      { name: 'only head', input: '<head><title>Test</title></head>', hasHead: true, hasBody: false },
      { name: 'empty HTML', input: '', hasHead: false, hasBody: false },
    ])('should parse $name', ({ input, hasHead, hasBody }) => {
      const parsed = parseHTML(input)
      expect(parsed.document).toBeDefined()
      expect(parsed.head !== null).toBe(hasHead)
      expect(parsed.body !== null).toBe(hasBody)
    })

    it('should preserve original content', () => {
      const input = html('<title>Test</title>')
      const parsed = parseHTML(input)
      expect(parsed.originalContent).toBe(input)
    })
  })

  describe('parseHTMLFile', () => {
    it('should parse HTML from file', () => {
      const htmlPath = join(TEST_DIR, 'test.html')
      const content = htmlWithBody('<title>Test</title>', '<p>Content</p>')
      writeFileSync(htmlPath, content)

      const parsed = parseHTMLFile(htmlPath)

      expect(parsed.head).not.toBeNull()
      expect(parsed.body).not.toBeNull()
      expect(parsed.originalContent).toBe(content)
    })

    it('should throw error for non-existent file', () => {
      expect(() => parseHTMLFile(join(TEST_DIR, 'non-existent.html'))).toThrow()
    })
  })

  describe('findElement', () => {
    it('should find element by tag name', () => {
      const parsed = parseHTML(html('<title>Test</title><meta charset="UTF-8" />'))
      const title = findElement(parsed, 'title')
      expect(title?.tagName.toLowerCase()).toBe('title')
    })

    it('should find element by tag and attribute', () => {
      const parsed = parseHTML(
        html('<link rel="stylesheet" href="style.css" /><link rel="manifest" href="manifest.json" />'),
      )
      const manifestLink = findElement(parsed, 'link', { name: 'rel', value: 'manifest' })
      expect(manifestLink?.tagName.toLowerCase()).toBe('link')
    })

    it('should return null if not found', () => {
      const parsed = parseHTML(html('<title>Test</title>'))
      const meta = findElement(parsed, 'meta', { name: 'theme-color', value: '#ffffff' })
      expect(meta).toBeNull()
    })

    it('should be case insensitive for tag names', () => {
      const parsed = parseHTML(html('<TITLE>Test</TITLE>'))
      const title = findElement(parsed, 'title')
      expect(title).not.toBeNull()
    })

    it('should search document.children when head is missing', () => {
      const parsed = parseHTML('<html><body><title>Test</title></body></html>')
      const title = findElement(parsed, 'title')
      expect(title).toBeDefined()
    })
  })

  describe('findAllElements', () => {
    it('should find all meta tags', () => {
      const parsed = parseHTML(html('<meta charset="UTF-8" /><meta name="viewport" content="width=device-width" />'))
      const metas = findAllElements(parsed, 'meta')
      const metaTags = metas.filter((m) => m.tagName.toLowerCase() === 'meta')
      expect(metaTags).toHaveLength(2)
    })

    it('should find by tag and attribute name', () => {
      const parsed = parseHTML(html('<link rel="stylesheet" href="style.css" /><link rel="manifest" href="manifest.json" />'))
      const links = findAllElements(parsed, 'link', { name: 'rel' })
      expect(links.length).toBeGreaterThanOrEqual(2)
    })

    it('should find by tag and attribute value', () => {
      const parsed = parseHTML(html('<link rel="stylesheet" href="style.css" /><link rel="manifest" href="manifest.json" />'))
      const manifestLinks = findAllElements(parsed, 'link', { name: 'rel', value: 'manifest' })
      expect(manifestLinks.length).toBeGreaterThanOrEqual(1)
      manifestLinks.forEach((link) => {
        const relAttr = link.attributes?.find((attr) => attr.name.toLowerCase() === 'rel')
        expect(relAttr?.value).toBe('manifest')
      })
    })

    it('should search body when head is missing', () => {
      const parsed = parseHTML('<body><meta name="viewport" content="width=device-width" /></body>')
      const metas = findAllElements(parsed, 'meta')
      expect(metas.length).toBeGreaterThanOrEqual(1)
    })

    it('should return empty array if no elements found', () => {
      const parsed = parseHTML(html('<title>Test</title>'))
      const metas = findAllElements(parsed, 'meta')
      expect(metas).toHaveLength(0)
    })
  })

  describe('elementExists', () => {
    it.each([
      { name: 'exists', input: html('<link rel="manifest" href="manifest.json" />'), expected: true },
      { name: 'does not exist', input: html('<title>Test</title>'), expected: false },
    ])('should return $expected when element $name', ({ input, expected }) => {
      const parsed = parseHTML(input)
      const exists = elementExists(parsed, 'link', { name: 'rel', value: 'manifest' })
      expect(exists).toBe(expected)
    })
  })

  describe('serializeHTML', () => {
    it.each([
      { name: 'full HTML', input: htmlWithBody('<title>Test</title>', '') },
      { name: 'empty HTML', input: '' },
    ])('should preserve original content for $name', ({ input }) => {
      const parsed = parseHTML(input)
      const serialized = serializeHTML(parsed)
      expect(serialized).toBe(input)
    })
  })
})
