/**
 * Shared setup for init command tests (init.test.ts, init.icons.test.ts, etc.).
 * Provides workbox mock and helpers that depend on testDir.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";

vi.mock("workbox-build", async (importOriginal) => {
  const { createWorkboxBuildMock } = await import(
    "../../../core/src/__tests__/mocks/workbox-build.js"
  );
  return await createWorkboxBuildMock(
    importOriginal as () => Promise<typeof import("workbox-build")>,
  );
});

/** Creates public/ in testDir. */
export function createPublicDir(testDir: string): void {
  mkdirSync(join(testDir, "public"), { recursive: true });
}

/** Creates manifest.json in testDir/publicDir. */
export function createManifest(
  testDir: string,
  name = "Test",
  publicDir = "public",
): void {
  const path = join(testDir, publicDir, "manifest.json");
  writeFileSync(
    path,
    JSON.stringify({ name, icons: [{ src: "/icon.png", sizes: "192x192" }] }),
  );
}

/** Base init options with projectPath set to testDir. */
export function getBaseInitCommand(testDir: string) {
  return {
    projectPath: testDir,
    name: "Test App",
    shortName: "Test",
    skipIcons: true,
    skipServiceWorker: true,
    skipInjection: true,
  };
}
