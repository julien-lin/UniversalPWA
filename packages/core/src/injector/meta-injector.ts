/**
 * Échappe les caractères dangereux pour l'injection HTML (attributs, contenu)
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}
import {
  parseHTML,
  parseHTMLFile,
  findElement,
  elementExists,
} from "./html-parser.js";
import { writeFileSync } from "fs";
import { render } from "dom-serializer";
import type { Element } from "domhandler";

export interface MetaInjectorOptions {
  manifestPath?: string;
  basePath?: string; // Base path for manifest and SW registration (e.g., /app/, /creativehub/)
  themeColor?: string;
  backgroundColor?: string;
  appleTouchIcon?: string;
  appleMobileWebAppCapable?: boolean;
  appleMobileWebAppStatusBarStyle?: "default" | "black" | "black-translucent";
  appleMobileWebAppTitle?: string;
  serviceWorkerPath?: string;
}

export interface InjectionResult {
  injected: string[];
  skipped: string[];
  warnings: string[];
}

/**
 * Injects PWA meta-tags into HTML
 */
export function injectMetaTags(
  htmlContent: string,
  options: MetaInjectorOptions = {},
): { html: string; result: InjectionResult } {
  const parsed = parseHTML(htmlContent);
  const result: InjectionResult = {
    injected: [],
    skipped: [],
    warnings: [],
  };

  // Create or find the head
  let head = parsed.head;
  if (!head) {
    // If no head, create one
    if (parsed.html) {
      // Create a head element in html
      const headElement = {
        type: "tag",
        name: "head",
        tagName: "head",
        attribs: {},
        children: [],
        parent: parsed.html,
        next: null,
        prev: null,
      } as unknown as Element;
      if (parsed.html.children) {
        parsed.html.children.unshift(headElement);
      } else {
        parsed.html.children = [headElement];
      }
      head = headElement;
      result.warnings.push("Created <head> tag (was missing)");
    } else {
      result.warnings.push(
        "No <html> or <head> tag found, meta tags may not be injected correctly",
      );
      return { html: htmlContent, result };
    }
  }

  // Inject manifest link
  if (options.manifestPath) {
    // Build manifest path with basePath prefix
    let manifestHref = options.manifestPath.startsWith("/")
      ? options.manifestPath
      : `/${options.manifestPath}`;

    // Prepend basePath if provided
    if (options.basePath && options.basePath !== "/") {
      // basePath is already normalized (e.g., "/app/")
      // Remove trailing slash from basePath and leading slash from manifestHref if needed
      const basePathTrimmed = options.basePath.endsWith("/")
        ? options.basePath.slice(0, -1)
        : options.basePath;
      const manifestHrefTrimmed = manifestHref.startsWith("/")
        ? manifestHref.slice(1)
        : manifestHref;
      manifestHref = `${basePathTrimmed}/${manifestHrefTrimmed}`;
    }

    if (!elementExists(parsed, "link", { name: "rel", value: "manifest" })) {
      injectLinkTag(head, "manifest", manifestHref);
      result.injected.push(`<link rel="manifest" href="${manifestHref}">`);
    } else {
      result.skipped.push("manifest link (already exists)");
    }
  }

  // Inject theme-color
  if (options.themeColor) {
    // Find existing theme-color meta tag by name attribute
    const existingThemeColor = findElement(parsed, "meta", {
      name: "name",
      value: "theme-color",
    });
    if (existingThemeColor) {
      // Update existing value
      updateMetaContent(existingThemeColor, options.themeColor);
      result.injected.push(
        `<meta name="theme-color" content="${options.themeColor}"> (updated)`,
      );
    } else {
      // No existing theme-color meta tag, inject new one
      injectMetaTag(head, "theme-color", options.themeColor);
      result.injected.push(
        `<meta name="theme-color" content="${options.themeColor}">`,
      );
    }
  }

  // Injecter apple-touch-icon
  if (options.appleTouchIcon) {
    const iconHref = options.appleTouchIcon.startsWith("/")
      ? options.appleTouchIcon
      : `/${options.appleTouchIcon}`;
    if (
      !elementExists(parsed, "link", { name: "rel", value: "apple-touch-icon" })
    ) {
      injectLinkTag(head, "apple-touch-icon", iconHref);
      result.injected.push(`<link rel="apple-touch-icon" href="${iconHref}">`);
    } else {
      result.skipped.push("apple-touch-icon (already exists)");
    }
  }

  // Inject mobile-web-app-capable (replaces deprecated apple-mobile-web-app-capable)
  if (options.appleMobileWebAppCapable !== undefined) {
    const content = options.appleMobileWebAppCapable ? "yes" : "no";

    // First, remove deprecated apple-mobile-web-app-capable if it exists
    // Search for meta tag with name="apple-mobile-web-app-capable"
    const deprecatedMeta = findElement(parsed, "meta", {
      name: "name",
      value: "apple-mobile-web-app-capable",
    });
    if (deprecatedMeta && deprecatedMeta.parent) {
      const parent = deprecatedMeta.parent;
      if (parent.children) {
        parent.children = parent.children.filter(
          (child) => child !== deprecatedMeta,
        );
        result.warnings.push(
          'Removed deprecated <meta name="apple-mobile-web-app-capable">',
        );
      }
    }

    // Use the new standard meta tag
    // Find existing mobile-web-app-capable meta tag by name attribute
    const existingMeta = findElement(parsed, "meta", {
      name: "name",
      value: "mobile-web-app-capable",
    });
    if (existingMeta) {
      // Check if content matches
      const existingContent = existingMeta.attribs?.content;
      if (existingContent === content) {
        result.skipped.push("mobile-web-app-capable (already exists)");
      } else {
        // Update existing value
        updateMetaContent(existingMeta, content);
        result.injected.push(
          `<meta name="mobile-web-app-capable" content="${content}"> (updated)`,
        );
      }
    } else {
      // No existing meta tag, inject new one
      injectMetaTag(head, "mobile-web-app-capable", content);
      result.injected.push(
        `<meta name="mobile-web-app-capable" content="${content}">`,
      );
    }
  }

  // Injecter apple-mobile-web-app-status-bar-style
  if (options.appleMobileWebAppStatusBarStyle) {
    // Find existing meta tag by name attribute
    const existingMeta = findElement(parsed, "meta", {
      name: "name",
      value: "apple-mobile-web-app-status-bar-style",
    });
    if (existingMeta) {
      // Check if content matches
      const existingContent = existingMeta.attribs?.content;
      if (existingContent === options.appleMobileWebAppStatusBarStyle) {
        result.skipped.push(
          "apple-mobile-web-app-status-bar-style (already exists)",
        );
      } else {
        // Update existing value
        updateMetaContent(
          existingMeta,
          options.appleMobileWebAppStatusBarStyle,
        );
        result.injected.push(
          `<meta name="apple-mobile-web-app-status-bar-style" content="${options.appleMobileWebAppStatusBarStyle}"> (updated)`,
        );
      }
    } else {
      // No existing meta tag, inject new one
      injectMetaTag(
        head,
        "apple-mobile-web-app-status-bar-style",
        options.appleMobileWebAppStatusBarStyle,
      );
      result.injected.push(
        `<meta name="apple-mobile-web-app-status-bar-style" content="${options.appleMobileWebAppStatusBarStyle}">`,
      );
    }
  }

  // Injecter apple-mobile-web-app-title
  if (options.appleMobileWebAppTitle) {
    // Find existing meta tag by name attribute
    const existingMeta = findElement(parsed, "meta", {
      name: "name",
      value: "apple-mobile-web-app-title",
    });
    if (existingMeta) {
      // Check if content matches
      const existingContent = existingMeta.attribs?.content;
      if (existingContent === options.appleMobileWebAppTitle) {
        result.skipped.push("apple-mobile-web-app-title (already exists)");
      } else {
        // Update existing value
        updateMetaContent(existingMeta, options.appleMobileWebAppTitle);
        result.injected.push(
          `<meta name="apple-mobile-web-app-title" content="${options.appleMobileWebAppTitle}"> (updated)`,
        );
      }
    } else {
      // No existing meta tag, inject new one
      injectMetaTag(
        head,
        "apple-mobile-web-app-title",
        options.appleMobileWebAppTitle,
      );
      result.injected.push(
        `<meta name="apple-mobile-web-app-title" content="${options.appleMobileWebAppTitle}">`,
      );
    }
  }

  // Ensure body exists before injecting scripts
  let body = parsed.body;
  const originalBodyExists = !!body;
  if (!body) {
    // Create body element if missing
    if (parsed.html) {
      const bodyElement = {
        type: "tag",
        name: "body",
        tagName: "body",
        attribs: {},
        children: [],
        parent: parsed.html,
        next: null,
        prev: null,
      } as unknown as Element;
      if (parsed.html.children) {
        parsed.html.children.push(bodyElement);
      } else {
        parsed.html.children = [bodyElement];
      }
      body = bodyElement;
      result.warnings.push("Created <body> tag (was missing)");
    } else {
      result.warnings.push(
        "No <html> or <body> tag found, scripts may not be injected correctly",
      );
    }
  }

  // Reconstruct HTML with dom-serializer AFTER all injections
  let modifiedHtml = render(parsed.document, { decodeEntities: false });

  // Inject service worker registration and PWA install handler (in body or before </body>)
  if (options.serviceWorkerPath) {
    // Build SW path with basePath prefix
    let swPath = options.serviceWorkerPath.startsWith("/")
      ? options.serviceWorkerPath
      : `/${options.serviceWorkerPath}`;

    // Prepend basePath if provided
    if (options.basePath && options.basePath !== "/") {
      // basePath is already normalized (e.g., "/app/")
      const basePathTrimmed = options.basePath.endsWith("/")
        ? options.basePath.slice(0, -1)
        : options.basePath;
      const swPathTrimmed = swPath.startsWith("/") ? swPath.slice(1) : swPath;
      swPath = `${basePathTrimmed}/${swPathTrimmed}`;
    }

    if (!htmlContent.includes("navigator.serviceWorker")) {
      // Escape path to prevent XSS injection
      const escapedSwPath = escapeJavaScriptString(swPath);

      // Inject service worker registration and PWA install handler script
      const swScript = `\n<script>
// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(${escapedSwPath})
      .then((registration) => console.log('SW registered:', registration))
      .catch((error) => console.error('SW registration failed:', error));
  });
}

// PWA Install Handler
let deferredPrompt = null;
let isInstalled = false;

// Check if app is already installed
if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
  isInstalled = true;
} else if (window.navigator.standalone === true) {
  isInstalled = true;
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Update UI to notify the user they can install the PWA
  window.dispatchEvent(new CustomEvent('pwa-installable', { detail: { installable: true } }));
  console.log('PWA installable: beforeinstallprompt event captured');
});

// Listen for app installed event
window.addEventListener('appinstalled', () => {
  isInstalled = true;
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-installed', { detail: { installed: true } }));
  console.log('PWA installed successfully');
});

// Expose global install function
window.installPWA = function() {
  if (!deferredPrompt) {
    console.warn('PWA install prompt not available. App may already be installed or not installable.');
    return Promise.reject(new Error('PWA install prompt not available'));
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  return deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-install-choice', { detail: { outcome: choiceResult.outcome } }));
    return choiceResult;
  });
};

// Expose global check function
window.isPWAInstalled = function() {
  if (isInstalled) return true;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (window.navigator.standalone === true) {
    return true;
  }
  return false;
};

// Expose global check if installable
window.isPWAInstallable = function() {
  return deferredPrompt !== null;
};
</script>`;
      // Inject before </body> tag (more reliable than string replacement)
      // Use last occurrence to handle malformed HTML with multiple </body> tags
      const lastBodyIndex = modifiedHtml.lastIndexOf("</body>");
      if (lastBodyIndex !== -1 && originalBodyExists) {
        modifiedHtml =
          modifiedHtml.slice(0, lastBodyIndex) +
          swScript +
          "\n" +
          modifiedHtml.slice(lastBodyIndex);
      } else if (modifiedHtml.includes("</html>")) {
        // If no </body> but has </html>, inject before </html>
        const htmlIndex = modifiedHtml.lastIndexOf("</html>");
        modifiedHtml =
          modifiedHtml.slice(0, htmlIndex) +
          swScript +
          "\n</body>\n" +
          modifiedHtml.slice(htmlIndex);
        result.warnings.push(
          "Injected script before </html> (no </body> found)",
        );
      } else {
        // Last resort: append at the end
        modifiedHtml = modifiedHtml + swScript;
        result.warnings.push(
          "Injected script at end of file (no </body> or </html> found)",
        );
      }
      result.injected.push("Service Worker registration script");
      result.injected.push("PWA install handler script");
    } else {
      // Service worker exists, but check if install handler exists
      if (
        !htmlContent.includes("beforeinstallprompt") &&
        !htmlContent.includes("window.installPWA")
      ) {
        const installScript = `\n<script>
// PWA Install Handler
let deferredPrompt = null;
let isInstalled = false;

// Check if app is already installed
if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
  isInstalled = true;
} else if (window.navigator.standalone === true) {
  isInstalled = true;
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  window.dispatchEvent(new CustomEvent('pwa-installable', { detail: { installable: true } }));
  console.log('PWA installable: beforeinstallprompt event captured');
});

window.addEventListener('appinstalled', () => {
  isInstalled = true;
  deferredPrompt = null;
  window.dispatchEvent(new CustomEvent('pwa-installed', { detail: { installed: true } }));
  console.log('PWA installed successfully');
});

window.installPWA = function() {
  if (!deferredPrompt) {
    console.warn('PWA install prompt not available.');
    return Promise.reject(new Error('PWA install prompt not available'));
  }
  deferredPrompt.prompt();
  return deferredPrompt.userChoice.then((choiceResult) => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-install-choice', { detail: { outcome: choiceResult.outcome } }));
    return choiceResult;
  });
};

window.isPWAInstalled = function() {
  if (isInstalled) return true;
  if (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (window.navigator.standalone === true) {
    return true;
  }
  return false;
};

window.isPWAInstallable = function() {
  return deferredPrompt !== null;
};
</script>`;
        // Inject before </body> tag (use last occurrence for reliability)
        const lastBodyIndex = modifiedHtml.lastIndexOf("</body>");
        if (lastBodyIndex !== -1 && originalBodyExists) {
          modifiedHtml =
            modifiedHtml.slice(0, lastBodyIndex) +
            installScript +
            "\n" +
            modifiedHtml.slice(lastBodyIndex);
        } else if (modifiedHtml.includes("</html>")) {
          const htmlIndex = modifiedHtml.lastIndexOf("</html>");
          modifiedHtml =
            modifiedHtml.slice(0, htmlIndex) +
            installScript +
            "\n</body>\n" +
            modifiedHtml.slice(htmlIndex);
          result.warnings.push(
            "Injected install script before </html> (no </body> found)",
          );
        } else {
          modifiedHtml = `${modifiedHtml}${installScript}`;
          result.warnings.push(
            "Injected install script at end of file (no </body> or </html> found)",
          );
        }
        result.injected.push("PWA install handler script");
      } else {
        result.skipped.push("PWA install handler (already exists)");
      }
      result.skipped.push("Service Worker registration (already exists)");
    }
  }

  return { html: modifiedHtml, result };
}

/**
 * Injects a link tag into the head
 */
function injectLinkTag(head: Element, rel: string, href: string): void {
  const linkElement = {
    type: "tag",
    name: "link",
    tagName: "link",
    attribs: {
      rel,
      href,
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
 * Injects a meta tag into the head
 */
function injectMetaTag(head: Element, name: string, content: string): void {
  const metaElement = {
    type: "tag",
    name: "meta",
    tagName: "meta",
    attribs: {
      name,
      content,
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

/**
 * Updates the content of an existing meta tag
 */
function updateMetaContent(metaElement: Element, newContent: string): void {
  if (metaElement.attribs) {
    metaElement.attribs.content = newContent;
  } else {
    metaElement.attribs = { content: newContent };
  }
  if (metaElement.attribs.content.length > 4096) {
    throw new Error(
      "La taille totale des meta-tags injectés dépasse la limite de 4KB.",
    );
  }
}

/**
 * Escapes a string for safe injection into JavaScript
 * Converts the string to an escaped JavaScript string
 */
function escapeJavaScriptString(str: string): string {
  // Use JSON.stringify to properly escape all special characters
  // This handles quotes, backslashes, newlines, etc.
  return JSON.stringify(str);
}

/**
 * Injects meta-tags into an HTML file
 */
export function injectMetaTagsInFile(
  filePath: string,
  options: MetaInjectorOptions = {},
): InjectionResult {
  const parsed = parseHTMLFile(filePath);
  const { html, result } = injectMetaTags(parsed.originalContent, options);

  // Write modified HTML
  writeFileSync(filePath, html, "utf-8");

  return result;
}

/**
 * Batch process options for parallel HTML injection
 */
export interface BatchInjectOptions {
  files: string[];
  options: MetaInjectorOptions;
  concurrency?: number; // Max concurrent file processing (default: 5)
  continueOnError?: boolean; // Continue processing if a file fails (default: true)
}

/**
 * Result of batch injection
 */
export interface BatchInjectResult {
  successful: Array<{ file: string; result: InjectionResult }>;
  failed: Array<{ file: string; error: string }>;
  totalProcessed: number;
  totalFailed: number;
}

/**
 * Injects PWA meta-tags into multiple HTML files in parallel with concurrency limit
 * This significantly improves performance when processing many files
 *
 * Uses optimized parallel processing with proper async handling
 */
export async function injectMetaTagsInFilesBatch(
  batchOptions: BatchInjectOptions,
): Promise<BatchInjectResult> {
  const {
    files,
    options,
    concurrency = 10,
    continueOnError = true,
  } = batchOptions;

  // Import parallel processor dynamically to avoid circular dependencies
  const { processInParallel } = await import("../utils/parallel-processor.js");

  // Convert synchronous injectMetaTagsInFile to async wrapper
  const processFile = (file: string): Promise<InjectionResult> => {
    return Promise.resolve(injectMetaTagsInFile(file, options));
  };

  // Process files in parallel
  const result = await processInParallel(files, processFile, {
    concurrency,
    continueOnError,
  });

  return {
    successful: result.successful.map((s) => ({
      file: s.item,
      result: s.result,
    })),
    failed: result.failed.map((f) => ({ file: f.item, error: f.error })),
    totalProcessed: result.totalProcessed,
    totalFailed: result.totalFailed,
  };
}
