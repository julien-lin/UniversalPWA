/**
 * Shared assertion helpers for backend integration tests (Laravel, Django, Flask).
 * Asserts the common contract: getStartUrl, getApiPatterns, getStaticAssetPatterns.
 */

import { expect } from "vitest";

export interface BackendContractIntegration {
  getStartUrl(): string;
  getApiPatterns(): string[];
  getStaticAssetPatterns(): string[];
}

/**
 * Asserts that an integration satisfies the common backend contract:
 * - getStartUrl() === '/'
 * - getApiPatterns() contains '/api/**'
 * - getStaticAssetPatterns() is a non-empty array
 */
export function expectBackendContract(
  integration: BackendContractIntegration,
): void {
  expect(integration.getStartUrl()).toBe("/");
  const apiPatterns = integration.getApiPatterns();
  expect(Array.isArray(apiPatterns)).toBe(true);
  expect(apiPatterns).toContain("/api/**");
  const staticPatterns = integration.getStaticAssetPatterns();
  expect(Array.isArray(staticPatterns)).toBe(true);
  expect(staticPatterns.length).toBeGreaterThan(0);
}
