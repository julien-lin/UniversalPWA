/**
 * Shared helpers for init command tests (init.test.ts, init.base-path.test.ts).
 * Single source for createBasicHtml, VALID_PNG / createIcon, runInitInTestDir.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { initCommand, type InitOptions, type InitResult } from "../commands/init.js";

/** Valid minimal PNG (1x1 transparent) for icon tests */
export const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

/** Returns a minimal valid PNG buffer (alias for VALID_PNG). */
export function createTestPngBuffer(): Buffer {
  return Buffer.from(VALID_PNG);
}

/**
 * Creates minimal HTML string for init tests (DOCTYPE + title + body).
 * @param title Optional page title (default "Test")
 */
export function createBasicHtml(title = "Test"): string {
  return `<!DOCTYPE html>
<html><head><title>${title}</title></head><body></body></html>`;
}

/**
 * Writes VALID_PNG to testDir/filename and returns the full path.
 * @param testDir Test directory path
 * @param filename Icon filename (default "icon.png")
 */
export function createIcon(testDir: string, filename = "icon.png"): string {
  const iconPath = join(testDir, filename);
  writeFileSync(iconPath, VALID_PNG);
  return iconPath;
}

/** Options for runInitInTestDir: InitOptions + optional html and beforeInit callback. */
export type RunInitInTestDirOptions = Partial<InitOptions> & {
  html?: string;
  /** Called after writing html, before initCommand. Use to create public/, manifest, etc. */
  beforeInit?: (testDir: string) => void;
};

/**
 * Creates public/ and a minimal manifest.json in testDir (for tests that need manifest).
 */
export function setupPublicWithManifest(
  testDir: string,
  manifestName = "Test",
  publicDir = "public",
): void {
  mkdirSync(join(testDir, publicDir), { recursive: true });
  writeFileSync(
    join(testDir, publicDir, "manifest.json"),
    JSON.stringify({
      name: manifestName,
      icons: [{ src: "/icon.png", sizes: "192x192" }],
    }),
  );
}

/**
 * Runs initCommand in a test dir: optionally writes index.html, runs beforeInit, then calls initCommand.
 * @param testDir Test directory path
 * @param options Partial InitOptions + optional html and beforeInit
 */
export async function runInitInTestDir(
  testDir: string,
  options: RunInitInTestDirOptions = {},
): Promise<InitResult> {
  const { html, beforeInit, ...initOptions } = options;
  if (html !== undefined) {
    writeFileSync(join(testDir, "index.html"), html, "utf-8");
  }
  beforeInit?.(testDir);
  return initCommand({ ...initOptions, projectPath: testDir });
}
