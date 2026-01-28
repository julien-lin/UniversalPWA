/**
 * Helper functions for marker-based injection detection
 * Prevents tag duplication using data-universal-pwa markers
 * More reliable than substring matching with includes()
 * Falls back to attribute-based detection for backward compatibility
 */

// Used in findElementByMarker for backward compatibility fallback

import { findElement } from "./html-parser.js";
import type { Element } from "domhandler";

/**
 * Find element by data-universal-pwa marker (first choice)
 * Falls back to findElement by attribute if no marker found (backward compatibility)
 * This is more reliable than substring matching with includes()
 */
export function findElementByMarker(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any,
  tagName: string,
  markerValue: string,
): Element | undefined {
  // Find all elements of this tag type with the marker

  const allElements = findAllElementsByTag(parsed, tagName);
  const markerElement = allElements.find(
    (el) => el.attribs?.["data-universal-pwa"] === markerValue,
  );

  // If found via marker, return it
  if (markerElement) {
    return markerElement;
  }

  // Fallback: try to find by attribute for backward compatibility
  // Map marker values back to attribute names
  const markerToAttribute: Record<string, { name: string; value: string }> = {
    "theme-color": { name: "name", value: "theme-color" },
    "apple-touch-icon": { name: "rel", value: "apple-touch-icon" },
    manifest: { name: "rel", value: "manifest" },
    "apple-mobile-web-app-capable": {
      name: "name",
      value: "apple-mobile-web-app-capable",
    },
    "mobile-web-app-capable": {
      name: "name",
      value: "mobile-web-app-capable",
    },
    "apple-mobile-web-app-title": {
      name: "name",
      value: "apple-mobile-web-app-title",
    },
    "apple-mobile-web-app-status-bar-style": {
      name: "name",
      value: "apple-mobile-web-app-status-bar-style",
    },
  };

  const attributeInfo = markerToAttribute[markerValue];
  if (attributeInfo) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = findElement(parsed, tagName, {
      name: attributeInfo.name,
      value: attributeInfo.value,
    });
    return result ?? undefined;
  }

  return undefined;
}

/**
 * Find all elements by tag name (helper)
 */
function findAllElementsByTag(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any,
  tagName: string,
): Element[] {
  const results: Element[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverse(node: any): void {
    if (!node) return;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (node.type === "tag" && node.name === tagName) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      results.push(node);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (node.children && Array.isArray(node.children)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      node.children.forEach(traverse);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (parsed.document) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    traverse(parsed.document);
  }

  return results;
}

/**
 * Count all markers in document to detect duplicates
 */
export function countMarkers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parsed: any,
  markerValue: string,
): number {
  let count = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function traverse(node: any): void {
    if (!node) return;

    if (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      node.type === "tag" &&
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      node.attribs?.["data-universal-pwa"] === markerValue
    ) {
      count++;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (node.children && Array.isArray(node.children)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      node.children.forEach(traverse);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (parsed.document) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    traverse(parsed.document);
  }

  return count;
}

/**
 * Injects a link tag into the head with marker
 */
export function injectLinkTagWithMarker(
  head: Element,
  rel: string,
  href: string,
  marker: string,
): void {
  const linkElement = {
    type: "tag",
    name: "link",
    tagName: "link",
    attribs: {
      rel,
      href,
      "data-universal-pwa": marker,
    },
    children: [],
    parent: head,
    next: null,
    prev: null,
  } as unknown as Element;

  if (!head.children) {
    head.children = [];
  }
  head.children.push(linkElement);
}

/**
 * Injects a meta tag into the head with marker
 */
export function injectMetaTagWithMarker(
  head: Element,
  name: string,
  content: string,
  marker: string,
): void {
  const metaElement = {
    type: "tag",
    name: "meta",
    tagName: "meta",
    attribs: {
      name,
      content,
      "data-universal-pwa": marker,
    },
    children: [],
    parent: head,
    next: null,
    prev: null,
  } as unknown as Element;

  if (!head.children) {
    head.children = [];
  }
  head.children.push(metaElement);
  if (head.children.length > 4096) {
    throw new Error(
      "La taille totale des meta-tags injectés dépasse la limite de 4KB.",
    );
  }
}
