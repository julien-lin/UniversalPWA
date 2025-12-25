import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { parseHTML, parseHTMLFile, findElement, findAllElements, elementExists } from './html-parser'

const TEST_DIR = join(process.cwd(), '.test-tmp-html-parser')

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
    it('should parse simple HTML with head and body', () => {
      const html = '<html><head><title>Test</title></head><body><p>Content</p></body></html>'
      const parsed = parseHTML(html)

      expect(parsed.head).not.toBeNull()
      expect(parsed.body).not.toBeNull()
      expect(parsed.html).not.toBeNull()
      expect(parsed.document).toBeDefined()
    })

    it('should parse HTML without explicit html tag', () => {
      const html = '<head><title>Test</title></head><body><p>Content</p></body>'
      const parsed = parseHTML(html)

      expect(parsed.head).not.toBeNull()
      expect(parsed.body).not.toBeNull()
    })

    it('should parse HTML with only head', () => {
      const html = '<head><title>Test</title></head>'
      const parsed = parseHTML(html)

      expect(parsed.head).not.toBeNull()
      expect(parsed.body).toBeNull()
    })

    it('should handle empty HTML', () => {
      const html = ''
      const parsed = parseHTML(html)

      expect(parsed.document).toBeDefined()
      expect(parsed.head).toBeNull()
      expect(parsed.body).toBeNull()
    })

    it('should preserve original content', () => {
      const html = '<html><head><title>Test</title></head></html>'
      const parsed = parseHTML(html)

      expect(parsed.originalContent).toBe(html)
    })
  })

  describe('parseHTMLFile', () => {
    it('should parse HTML from file', () => {
      const htmlPath = join(TEST_DIR, 'test.html')
      const html = '<html><head><title>Test</title></head><body><p>Content</p></body></html>'
      writeFileSync(htmlPath, html)

      const parsed = parseHTMLFile(htmlPath)

      expect(parsed.head).not.toBeNull()
      expect(parsed.body).not.toBeNull()
      expect(parsed.originalContent).toBe(html)
    })

    it('should throw error for non-existent file', () => {
      expect(() => parseHTMLFile(join(TEST_DIR, 'non-existent.html'))).toThrow()
    })
  })

  describe('findElement', () => {
    it('should find element by tag name', () => {
      const html = '<html><head><title>Test</title><meta charset="UTF-8" /></head></html>'
      const parsed = parseHTML(html)

      const title = findElement(parsed, 'title')

      expect(title).not.toBeNull()
      expect(title?.tagName.toLowerCase()).toBe('title')
    })

    it('should find element by tag name and attribute', () => {
      const html = '<html><head><link rel="stylesheet" href="style.css" /><link rel="manifest" href="manifest.json" /></head></html>'
      const parsed = parseHTML(html)

      const manifestLink = findElement(parsed, 'link', { name: 'rel', value: 'manifest' })

      expect(manifestLink).not.toBeNull()
      expect(manifestLink?.tagName.toLowerCase()).toBe('link')
    })

    it('should return null if element not found', () => {
      const html = '<html><head><title>Test</title></head></html>'
      const parsed = parseHTML(html)

      const meta = findElement(parsed, 'meta', { name: 'theme-color', value: '#ffffff' })

      expect(meta).toBeNull()
    })

    it('should be case insensitive for tag names', () => {
      const html = '<html><head><TITLE>Test</TITLE></head></html>'
      const parsed = parseHTML(html)

      const title = findElement(parsed, 'title')

      expect(title).not.toBeNull()
    })
  })

  describe('findAllElements', () => {
    it('should find all elements by tag name', () => {
      const html = '<html><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width" /></head></html>'
      const parsed = parseHTML(html)

      const metas = findAllElements(parsed, 'meta')

      // htmlparser2 may find more elements (html, head are also tags)
      expect(metas.length).toBeGreaterThanOrEqual(2)
      // Verify that meta tags are found
      const metaTags = metas.filter((m) => m.tagName.toLowerCase() === 'meta')
      expect(metaTags).toHaveLength(2)
    })

    it('should find all elements by tag name and attribute name', () => {
      const html = '<html><head><link rel="stylesheet" href="style.css" /><link rel="manifest" href="manifest.json" /></head></html>'
      const parsed = parseHTML(html)

      const links = findAllElements(parsed, 'link', { name: 'rel' })

      expect(links.length).toBeGreaterThanOrEqual(2)
    })

    it('should find all elements by tag name and attribute value', () => {
      const html = '<html><head><link rel="stylesheet" href="style.css" /><link rel="manifest" href="manifest.json" /></head></html>'
      const parsed = parseHTML(html)

      const manifestLinks = findAllElements(parsed, 'link', { name: 'rel', value: 'manifest' })

      // Verify that at least manifest link is found
      expect(manifestLinks.length).toBeGreaterThanOrEqual(1)
      // Verify that all found links have rel="manifest"
      manifestLinks.forEach((link) => {
        const relAttr = link.attributes?.find((attr) => attr.name.toLowerCase() === 'rel')
        expect(relAttr?.value).toBe('manifest')
      })
    })

    it('should return empty array if no elements found', () => {
      const html = '<html><head><title>Test</title></head></html>'
      const parsed = parseHTML(html)

      const metas = findAllElements(parsed, 'meta')

      expect(metas).toHaveLength(0)
    })
  })

  describe('elementExists', () => {
    it('should return true if element exists', () => {
      const html = '<html><head><link rel="manifest" href="manifest.json" /></head></html>'
      const parsed = parseHTML(html)

      const exists = elementExists(parsed, 'link', { name: 'rel', value: 'manifest' })

      expect(exists).toBe(true)
    })

    it('should return false if element does not exist', () => {
      const html = '<html><head><title>Test</title></head></html>'
      const parsed = parseHTML(html)

      const exists = elementExists(parsed, 'link', { name: 'rel', value: 'manifest' })

      expect(exists).toBe(false)
    })
  })
})

