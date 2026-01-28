/**
 * Backend Integration Factory
 * Manages available backend integrations and detection
 */

import type { BackendIntegration, BackendIntegrationFactory } from "./types.js";
import type { Framework } from "../scanner/framework-detector.js";
import { LaravelIntegration } from "./laravel.js";
import { SymfonyIntegration } from "./symfony.js";
import { DjangoIntegration } from "./django.js";
import { FlaskIntegration } from "./flask.js";

/**
 * Default factory implementation
 * Will be extended as we add more backend integrations
 */
export class DefaultBackendIntegrationFactory implements BackendIntegrationFactory {
  /**
   * Get integration for a specific framework
   * Creates integration instance with projectPath
   */
  getIntegration(
    framework: Framework,
    projectPath: string,
  ): BackendIntegration | null {
    switch (framework) {
      case "laravel":
        return new LaravelIntegration(projectPath);
      case "symfony":
        return new SymfonyIntegration(projectPath);
      case "django":
        return new DjangoIntegration(projectPath);
      case "flask":
        return new FlaskIntegration(projectPath);
      default:
        return null;
    }
  }

  /**
   * Get all available integration types (for detection)
   * Public method to allow testing and introspection of registered backends
   */
  getAvailableIntegrationTypes(): Array<
    new (projectPath: string) => BackendIntegration
  > {
    return [
      LaravelIntegration,
      SymfonyIntegration,
      DjangoIntegration,
      FlaskIntegration,
    ];
  }

  /**
   * Detect which backend is in use
   * Tries each integration's detect() method and returns best match
   */
  detectBackend(projectPath: string): BackendIntegration | null {
    const integrationTypes = this.getAvailableIntegrationTypes();
    let bestMatch: BackendIntegration | null = null;
    let bestConfidence: "low" | "medium" | "high" = "low";

    for (const IntegrationClass of integrationTypes) {
      const integration = new IntegrationClass(projectPath);
      const result = integration.detect();

      if (result.detected) {
        // Prefer high confidence matches - return immediately
        if (result.confidence === "high") {
          return integration;
        }
        // Keep medium confidence as fallback if no high confidence found
        if (result.confidence === "medium") {
          if (bestConfidence === "low") {
            bestMatch = integration;
            bestConfidence = "medium";
          }
        } else if (
          result.confidence === "low" &&
          bestConfidence === "low" &&
          !bestMatch
        ) {
          // Only use low confidence if no better match found
          bestMatch = integration;
        }
      }
    }

    return bestMatch;
  }
}

/**
 * Global factory instance
 */
let globalFactory: BackendIntegrationFactory | null = null;

/**
 * Get or create the global factory
 */
export function getBackendFactory(): BackendIntegrationFactory {
  if (!globalFactory) {
    globalFactory = new DefaultBackendIntegrationFactory();
  }
  return globalFactory;
}

/**
 * Set custom factory (useful for testing)
 */
export function setBackendFactory(factory: BackendIntegrationFactory): void {
  globalFactory = factory;
}

/**
 * Reset to default factory
 */
export function resetBackendFactory(): void {
  globalFactory = null;
}
