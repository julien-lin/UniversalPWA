/**
 * HTML Parser Depth Limiter - P3.1
 * Prevents DoS attacks via deeply nested HTML structures
 * - Max depth: 20 levels
 * - Parser timeout: 2000ms
 * - Incremental validation during parsing
 */

import { z } from 'zod';

export interface ParserConfig {
  maxDepth: number;
  timeout: number;
  maxAttributes?: number;
  maxNodeSize?: number;
}

export interface ParserResult {
  success: boolean;
  depth: number;
  nodeCount: number;
  parseTime: number;
  error?: string;
  exceeded?: {
    depth?: boolean;
    timeout?: boolean;
    nodeCount?: boolean;
    nodeSize?: boolean;
  };
}

export interface HTMLNode {
  tag: string;
  attributes: Record<string, string>;
  content: string;
  children: HTMLNode[];
  depth: number;
}

// Schema validation for parser config
const ParserConfigSchema = z.object({
  maxDepth: z.number().int().min(1).max(100).default(20),
  timeout: z.number().int().min(1).max(10000).default(2000),
  maxAttributes: z.number().int().min(1).optional().default(50),
  maxNodeSize: z.number().int().min(1).optional().default(1024 * 1024), // 1MB
});

/**
 * Parse HTML with depth and timeout restrictions
 */
export function parseHTMLWithLimits(
  html: string,
  config: ParserConfig = {}
): ParserResult {
  const startTime = Date.now();
  const validConfig = ParserConfigSchema.parse(config);

  let maxDepthReached = 0;
  let nodeCount = 0;
  let parseTimeout = false;

  try {
    const checkTimeout = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > validConfig.timeout) {
        parseTimeout = true;
        throw new Error(`Parse timeout exceeded: ${elapsed}ms > ${validConfig.timeout}ms`);
      }
    };

    const stack: string[] = [];
    let i = 0;
    let depth = 0;

    while (i < html.length) {
      checkTimeout();

      if (html[i] === '<') {
        if (html.substring(i, i + 2) === '</') {
          // Closing tag
          if (depth > 0) {
            depth--;
          }
          const endPos = html.indexOf('>', i);
          if (endPos === -1) {
            throw new Error('Malformed HTML: unclosed tag');
          }
          i = endPos + 1;
          stack.pop();
        } else {
          // Opening/Processing/Comment tag
          const endPos = html.indexOf('>', i);
          if (endPos === -1) {
            throw new Error('Malformed HTML: unclosed tag');
          }

          const tagContent = html.substring(i + 1, endPos);
          const tagSize = tagContent.length;

          // Check tag content size
          if (tagSize > (validConfig.maxNodeSize || 1024 * 1024)) {
            throw new Error(
              `Node size exceeded: ${tagSize} > ${validConfig.maxNodeSize}`
            );
          }

          // Track node count
          nodeCount++;
          if (nodeCount > 10000) {
            throw new Error('Node count exceeded: >10000 nodes');
          }

          // DOCTYPE, comments, processing instructions - don't affect depth
          if (tagContent.startsWith('!') || tagContent.startsWith('?')) {
            i = endPos + 1;
          } else if (tagContent.endsWith('/') || isSelfClosingTag(tagContent)) {
            // Self-closing tags
            i = endPos + 1;
          } else {
            // Regular opening tag
            depth++;
            maxDepthReached = Math.max(maxDepthReached, depth);

            if (depth > validConfig.maxDepth) {
              throw new Error(
                `Max nesting depth exceeded: ${depth} > ${validConfig.maxDepth}`
              );
            }

            stack.push(tagContent.split(/\s+/)[0]); // Tag name
            i = endPos + 1;
          }
        }
      } else {
        i++;
      }
    }

    if (stack.length > 0) {
      throw new Error(`Malformed HTML: ${stack.length} unclosed tags`);
    }

    return {
      success: true,
      depth: maxDepthReached,
      nodeCount,
      parseTime: Date.now() - startTime,
      exceeded: undefined,
    };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const message = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      depth: maxDepthReached,
      nodeCount,
      parseTime: elapsed,
      error: message,
      exceeded: {
        depth: message.includes('depth'),
        timeout: parseTimeout,
        nodeCount: message.includes('Node count'),
        nodeSize: message.includes('Node size'),
      },
    };
  }
}

/**
 * Validate HTML and return detailed analysis
 */
export function validateHTMLStructure(
  html: string,
  config: ParserConfig = {}
): {
  valid: boolean;
  depth: number;
  nodeCount: number;
  issues: string[];
  timeMs: number;
} {
  const result = parseHTMLWithLimits(html, config);

  const issues: string[] = [];

  if (!result.success) {
    issues.push(result.error || 'Unknown error');
  }

  if (result.exceeded?.depth) {
    issues.push(
      `Exceeds max depth: ${result.depth} > ${config.maxDepth || 20}`
    );
  }

  if (result.exceeded?.timeout) {
    issues.push(
      `Parsing timeout: ${result.parseTime}ms > ${config.timeout || 2000}ms`
    );
  }

  if (result.exceeded?.nodeCount) {
    issues.push('Exceeds maximum node count (>10000)');
  }

  if (result.exceeded?.nodeSize) {
    issues.push(`Exceeds max node size: ${config.maxNodeSize || 1024 * 1024} bytes`);
  }

  return {
    valid: result.success && issues.length === 0,
    depth: result.depth,
    nodeCount: result.nodeCount,
    issues,
    timeMs: result.parseTime,
  };
}

/**
 * Extract meta tags from HTML with depth limits
 */
export function extractMetaTags(
  html: string,
  config: ParserConfig = {}
): {
  tags: Array<{ name: string; content: string }>;
  valid: boolean;
  errors: string[];
} {
  const result = parseHTMLWithLimits(html, config);

  if (!result.success) {
    return {
      tags: [],
      valid: false,
      errors: [result.error || 'Parse failed'],
    };
  }

  const tags: Array<{ name: string; content: string }> = [];
  const errors: string[] = [];

  try {
    const metaRegex = /<meta\s+(?:[^>]*\s)?(?:name|property)="([^"]+)"[^>]*content="([^"]*)"/gi;
    let match;

    while ((match = metaRegex.exec(html))) {
      tags.push({
        name: match[1],
        content: match[2],
      });
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Meta extraction failed');
  }

  return {
    tags,
    valid: result.success && errors.length === 0,
    errors,
  };
}

/**
 * Check if tag is self-closing
 */
function isSelfClosingTag(tagContent: string): boolean {
  const selfClosingTags = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ];

  const tagName = tagContent.split(/\s+/)[0].toLowerCase();
  return selfClosingTags.includes(tagName);
}

/**
 * Sanitize HTML by removing deeply nested structures
 */
export function sanitizeNestedHTML(
  html: string,
  maxDepth: number = 10
): string {
  const validConfig = ParserConfigSchema.parse({ maxDepth });
  const result = parseHTMLWithLimits(html, validConfig);

  if (result.success) {
    return html; // HTML is valid
  }

  // If depth exceeded, return truncated version
  if (result.exceeded?.depth) {
    let depth = 0;
    let output = '';
    let i = 0;

    while (i < html.length) {
      const char = html[i];

      if (char === '<') {
        const endPos = html.indexOf('>', i);
        if (endPos === -1) break;

        const tagContent = html.substring(i + 1, endPos);
        if (tagContent.startsWith('/')) {
          if (depth > 0) depth--;
        } else if (!isSelfClosingTag(tagContent) && !tagContent.endsWith('/') &&
                  !tagContent.startsWith('!') && !tagContent.startsWith('?')) {
          depth++;
        }

        if (depth <= maxDepth) {
          output += html.substring(i, endPos + 1);
        } else {
          break;
        }

        i = endPos + 1;
      } else if (depth <= maxDepth) {
        output += char;
        i++;
      } else {
        break;
      }
    }

    // Close any open tags
    let openCount = (output.match(/<(?!\/)(?!\?)/g) || []).length;
    let closeCount = (output.match(/<\/[^>]+>/g) || []).length;

    while (openCount > closeCount) {
      output += '</div>';
      closeCount++;
    }

    return output;
  }

  return html;
}

/**
 * Format parser result for logging/reporting
 */
export function formatParserResult(result: ParserResult): string {
  const lines = [
    `Parse Success: ${result.success}`,
    `Depth Reached: ${result.depth}`,
    `Nodes Parsed: ${result.nodeCount}`,
    `Parse Time: ${result.parseTime}ms`,
  ];

  if (result.error) {
    lines.push(`Error: ${result.error}`);
  }

  if (result.exceeded) {
    const exceeded = Object.entries(result.exceeded)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(', ');
    if (exceeded) {
      lines.push(`Limits Exceeded: ${exceeded}`);
    }
  }

  return lines.join('\n');
}
