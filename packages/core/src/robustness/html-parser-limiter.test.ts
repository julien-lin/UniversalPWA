import { describe, it, expect } from 'vitest';
import {
  parseHTMLWithLimits,
  validateHTMLStructure,
  extractMetaTags,
  sanitizeNestedHTML,
  formatParserResult,
  type ParserConfig,
  type ParserResult,
} from './html-parser-limiter';

describe('HTML Parser Limiter - P3.1', () => {
  describe('parseHTMLWithLimits', () => {
    it('should parse valid simple HTML', () => {
      const html = '<div><p>Hello</p></div>';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.depth).toBeGreaterThan(0);
      expect(result.nodeCount).toBeGreaterThan(0);
      expect(result.parseTime).toBeLessThan(100);
    });

    it('should parse self-closing tags correctly', () => {
      const html = '<img src="test.png" /><br/><input type="text" />';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(0);
    });

    it('should handle meta tags', () => {
      const html =
        '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head><body></body></html>';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.depth).toBeGreaterThan(0);
    });

    it('should reject HTML exceeding max depth', () => {
      let html = '<div>';
      for (let i = 0; i < 25; i++) {
        html += '<div>';
      }
      for (let i = 0; i < 25; i++) {
        html += '</div>';
      }
      html += '</div>';

      const config: ParserConfig = { maxDepth: 20, timeout: 2000 };
      const result = parseHTMLWithLimits(html, config);

      expect(result.success).toBe(false);
      expect(result.exceeded?.depth).toBe(true);
      expect(result.depth).toBeGreaterThan(20);
    });

    it('should allow HTML with depth at or below limit', () => {
      let html = '<div>';
      for (let i = 0; i < 18; i++) {
        html += '<div>';
      }
      html += '<p>Content</p>';
      for (let i = 0; i < 18; i++) {
        html += '</div>';
      }
      html += '</div>';

      const config: ParserConfig = { maxDepth: 20, timeout: 2000 };
      const result = parseHTMLWithLimits(html, config);

      expect(result.success).toBe(true);
      expect(result.depth).toBeLessThanOrEqual(20);
    });

    it('should count nodes correctly', () => {
      const html = '<div><p>Text1</p><p>Text2</p><p>Text3</p></div>';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThanOrEqual(4);
    });

    it('should respect custom config', () => {
      let html = '<div>';
      for (let i = 0; i < 15; i++) {
        html += '<div>';
      }
      html += '</div>';
      for (let i = 0; i < 15; i++) {
        html += '</div>';
      }

      const config: ParserConfig = { maxDepth: 10, timeout: 2000 };
      const result = parseHTMLWithLimits(html, config);

      expect(result.success).toBe(false);
      expect(result.exceeded?.depth).toBe(true);
    });

    it('should handle attributes in tags', () => {
      const html =
        '<div class="container" id="main"><p data-test="value">Content</p></div>';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(0);
    });

    it('should handle mixed self-closing and regular tags', () => {
      const html =
        '<div><img src="a.png"/><p>Text</p><br/><input type="text"/></div>';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.depth).toBeGreaterThan(0);
    });

    it('should handle nested lists', () => {
      const html = `<ul>
        <li>Item 1
          <ul>
            <li>Sub 1
              <ul>
                <li>Deep 1</li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>`;

      const result = parseHTMLWithLimits(html);
      expect(result.success).toBe(true);
      expect(result.depth).toBeGreaterThan(3);
    });

    it('should handle comments', () => {
      const html = '<div><!-- This is a comment --><p>Text</p></div>';
      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
    });

    it('should handle empty HTML', () => {
      const result = parseHTMLWithLimits('');

      expect(result.success).toBe(true);
      expect(result.nodeCount).toBe(0);
      expect(result.depth).toBe(0);
    });

    it('should handle HTML with only text', () => {
      const result = parseHTMLWithLimits('Just plain text without tags');

      expect(result.success).toBe(true);
    });

    it('should handle complex real-world HTML', () => {
      const html = `<html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <title>Test Page</title>
        </head>
        <body>
          <header>
            <nav>
              <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <article>
              <h1>Title</h1>
              <p>Content here</p>
            </article>
          </main>
          <footer>Footer content</footer>
        </body>
      </html>`;

      const result = parseHTMLWithLimits(html);
      expect(result.success).toBe(true);
      expect(result.depth).toBeGreaterThan(3);
    });

    it('should handle DOCTYPE declarations', () => {
      const html = `<!DOCTYPE html>
        <html>
          <head><title>Test</title></head>
          <body><p>Content</p></body>
        </html>`;

      const result = parseHTMLWithLimits(html);
      expect(result.success).toBe(true);
    });

    it('should handle HTML with entities', () => {
      const html = '<div>&nbsp;&lt;test&gt;&amp;</div>';
      const result = parseHTMLWithLimits(html);
      expect(result.success).toBe(true);
    });

    it('should handle table structures', () => {
      const html = `<table>
        <tr><td>Cell 1</td><td>Cell 2</td></tr>
        <tr><td>Cell 3</td><td>Cell 4</td></tr>
      </table>`;

      const result = parseHTMLWithLimits(html);
      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeGreaterThan(5);
    });

    it('should measure performance on reasonable HTML', () => {
      const html = `<html>
        <body>
          ${Array.from({ length: 100 }, (_, i) => `<div id="item-${i}">Item ${i}</div>`).join('')}
        </body>
      </html>`;

      const result = parseHTMLWithLimits(html);

      expect(result.success).toBe(true);
      expect(result.parseTime).toBeLessThan(500);
    });

    it('should handle forms with many inputs', () => {
      let html = '<form>';
      for (let i = 0; i < 100; i++) {
        html += `<input type="text" name="field-${i}" />`;
      }
      html += '</form>';

      const result = parseHTMLWithLimits(html);
      expect(result.success).toBe(true);
      expect(result.nodeCount).toBeLessThan(1000);
    });
  });

  describe('validateHTMLStructure', () => {
    it('should validate simple valid HTML', () => {
      const html = '<div><p>Hello</p></div>';
      const result = validateHTMLStructure(html);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.depth).toBeGreaterThan(0);
    });

    it('should report depth issues', () => {
      let html = '<div>';
      for (let i = 0; i < 25; i++) {
        html += '<div>';
      }
      for (let i = 0; i < 25; i++) {
        html += '</div>';
      }
      html += '</div>';

      const result = validateHTMLStructure(html, { maxDepth: 20, timeout: 2000 });

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('depth');
    });

    it('should include all relevant validation info', () => {
      const html = '<div><p>Test</p></div>';
      const result = validateHTMLStructure(html);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('depth');
      expect(result).toHaveProperty('nodeCount');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('timeMs');
    });
  });

  describe('extractMetaTags', () => {
    it('should extract meta tags from HTML', () => {
      const html = `<html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="description" content="Test page">
        </head>
      </html>`;

      const result = extractMetaTags(html);

      expect(result.valid).toBe(true);
      expect(result.tags.length).toBeGreaterThanOrEqual(2);
      expect(result.tags.some((t) => t.name === 'viewport')).toBe(true);
      expect(result.tags.some((t) => t.name === 'description')).toBe(true);
    });

    it('should extract property-based meta tags', () => {
      const html = `<html>
        <head>
          <meta property="og:title" content="Page Title">
          <meta property="og:image" content="image.png">
        </head>
      </html>`;

      const result = extractMetaTags(html);

      expect(result.valid).toBe(true);
      expect(result.tags.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle missing meta tags', () => {
      const html = '<html><head></head><body></body></html>';
      const result = extractMetaTags(html);

      expect(result.valid).toBe(true);
      expect(result.tags).toHaveLength(0);
    });

    it('should handle meta tags with various attributes', () => {
      const html = `<html>
        <head>
          <meta charset="utf-8" lang="en">
          <meta http-equiv="X-UA-Compatible" content="ie=edge">
        </head>
      </html>`;

      const result = extractMetaTags(html);
      expect(result.valid).toBe(true);
    });
  });

  describe('sanitizeNestedHTML', () => {
    it('should return valid HTML unchanged', () => {
      const html = '<div><p>Test</p></div>';
      const result = sanitizeNestedHTML(html, 10);

      expect(result).toContain('<div>');
      expect(result).toContain('</div>');
    });

    it('should truncate deeply nested HTML', () => {
      let html = '<div>';
      for (let i = 0; i < 15; i++) {
        html += '<div>';
      }
      html += 'Content';
      for (let i = 0; i < 15; i++) {
        html += '</div>';
      }
      html += '</div>';

      const result = sanitizeNestedHTML(html, 10);

      expect(result).toBeTruthy();
      expect(result.length).toBeLessThanOrEqual(html.length);
    });

    it('should close unclosed tags properly', () => {
      const html = '<div><p>Text</div>';
      const result = sanitizeNestedHTML(html, 10);

      // Should have balanced tags
      const openCount = (result.match(/<(?!\/)(?!\?)/g) || []).length;
      const closeCount = (result.match(/<\/[^>]+>/g) || []).length;

      expect(openCount).toBeLessThanOrEqual(closeCount + 1);
    });

    it('should preserve content when possible', () => {
      const html = '<div><p>Important Content</p></div>';
      const result = sanitizeNestedHTML(html, 10);

      expect(result).toContain('Important Content');
    });

    it('should handle max depth of 1', () => {
      const html = '<div><p>Text</p></div>';
      const result = sanitizeNestedHTML(html, 1);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatParserResult', () => {
    it('should format successful parse result', () => {
      const result: ParserResult = {
        success: true,
        depth: 5,
        nodeCount: 10,
        parseTime: 42,
      };

      const formatted = formatParserResult(result);

      expect(formatted).toContain('Parse Success: true');
      expect(formatted).toContain('Depth Reached: 5');
      expect(formatted).toContain('Nodes Parsed: 10');
      expect(formatted).toContain('Parse Time: 42ms');
    });

    it('should format failed parse result', () => {
      const result: ParserResult = {
        success: false,
        depth: 25,
        nodeCount: 100,
        parseTime: 150,
        error: 'Max depth exceeded',
        exceeded: { depth: true },
      };

      const formatted = formatParserResult(result);

      expect(formatted).toContain('Parse Success: false');
      expect(formatted).toContain('Max depth exceeded');
      expect(formatted).toContain('Limits Exceeded');
    });

    it('should handle multiple exceeded limits', () => {
      const result: ParserResult = {
        success: false,
        depth: 25,
        nodeCount: 15000,
        parseTime: 2500,
        error: 'Multiple limits exceeded',
        exceeded: {
          depth: true,
          timeout: true,
          nodeCount: true,
        },
      };

      const formatted = formatParserResult(result);

      expect(formatted).toContain('Limits Exceeded');
      expect(formatted.split(', ').length).toBeGreaterThan(1);
    });
  });
});
