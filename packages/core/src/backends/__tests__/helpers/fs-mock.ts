/**
 * Helper to set up node:fs mocks for backend integration tests (Laravel, Django, Flask).
 * Use after vi.mock('node:fs'). Reduces duplication of vi.mocked(existsSync).mockImplementation etc.
 */

import { vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";

export interface FsMockForBackendOptions {
  /** Path substrings that make existsSync return true (path.includes(any)) */
  existsPaths?: string[];
  /** Default return for existsSync when no existsPaths match (default false) */
  existsReturn?: boolean;
  /** Path substring -> file content for readFileSync (first matching key wins) */
  readFileMap?: Record<string, string>;
}

/**
 * Configures vi.mocked(existsSync) and vi.mocked(readFileSync) for backend detection tests.
 * Call in each it() that needs a specific fs layout; vi.clearAllMocks() in beforeEach remains useful.
 */
export function createFsMockForBackend(options: FsMockForBackendOptions = {}): void {
  const {
    existsPaths,
    existsReturn = false,
    readFileMap = {},
  } = options;

  vi.mocked(existsSync).mockImplementation((path: unknown) => {
    const pathStr = typeof path === "string" ? path : String(path);
    if (existsPaths?.some((p) => pathStr.includes(p))) return true;
    return existsReturn;
  });

  vi.mocked(readFileSync).mockImplementation((path: unknown) => {
    const pathStr = typeof path === "string" ? path : String(path);
    for (const [key, content] of Object.entries(readFileMap)) {
      if (pathStr.includes(key)) return content;
    }
    return "";
  });
}
