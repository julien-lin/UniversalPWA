/**
 * Shared mock for workbox-build (generateSW + injectManifest).
 * Used by core and CLI tests to avoid invoking real Workbox.
 * Does not call importOriginal() so the real module is never loaded (avoids timeouts).
 */

import { writeFileSync } from "node:fs";

export type WorkboxBuildModule = typeof import("workbox-build");

const fakeResult = {
  count: 5,
  size: 128,
  warnings: [] as string[],
  manifestEntries: [{ url: "index.html" }],
  filePaths: [] as string[],
};

function writeFakeSw(swDest: string): void {
  writeFileSync(
    swDest,
    "/* workbox */\nprecacheAndRoute(self.__WB_MANIFEST);\nself.__WB_MANIFEST = [];",
    "utf-8",
  );
}

export function createWorkboxBuildMock(
  _importOriginal?: () => Promise<WorkboxBuildModule>,
): Promise<WorkboxBuildModule> {
  return Promise.resolve({
    generateSW: (config: { swDest: string }) => {
      writeFakeSw(config.swDest);
      return Promise.resolve({
        ...fakeResult,
        filePaths: [config.swDest],
      });
    },
    injectManifest: (config: { swDest: string }) => {
      writeFakeSw(config.swDest);
      return Promise.resolve({
        ...fakeResult,
        filePaths: [config.swDest],
      });
    },
  } as unknown as WorkboxBuildModule);
}
