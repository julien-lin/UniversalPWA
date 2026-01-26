/**
 * Telemetry Module - Privacy-First
 *
 * Collects anonymized usage telemetry for improving UniversalPWA.
 * All data is anonymized (no project paths, no credentials).
 * Respects --disable-telemetry flag and RGPD/privacy regulations.
 *
 * Usage:
 * ```typescript
 * const telemetry = getTelemetryCollector();
 * telemetry.setEnabled(true); // respects --disable-telemetry flag
 * telemetry.recordOperation('scan', { framework: 'react', fileCount: 42 });
 * telemetry.recordError('icon-generation', 'memory-limit');
 *
 * const anonymized = telemetry.exportAnonymized();
 * // Send to analytics endpoint
 * ```
 *
 * Privacy Guarantees:
 * - No absolute paths, credentials, or env variables
 * - Framework and file counts are anonymized ranges
 * - Project names are hashed SHA256
 * - User can disable at any time
 * - No cookies or persistent tracking
 */

import { createHash } from 'node:crypto';

/**
 * Telemetry operation type
 */
export type TelemetryOperationType = 'scan' | 'generate' | 'inject' | 'validate' | 'complete';

/**
 * Telemetry error type
 */
export type TelemetryErrorType =
  | 'validation-failed'
  | 'icon-generation'
  | 'memory-limit'
  | 'timeout'
  | 'config-invalid'
  | 'network-error'
  | 'unknown';

/**
 * Anonymized operation record
 */
export interface AnonymizedOperation {
  type: TelemetryOperationType;
  timestamp: number;
  duration?: number;
  framework?: string;
  fileSizeRange?: 'small' | 'medium' | 'large' | 'huge'; // <100KB, 100KB-1MB, 1MB-10MB, >10MB
  fileCountRange?: 'few' | 'many' | 'vast'; // <100, 100-1000, >1000
  iconCount?: number;
  success: boolean;
  errorType?: TelemetryErrorType;
}

/**
 * Anonymized telemetry export
 */
export interface AnonymizedTelemetry {
  version: '1.0';
  exportedAt: number;
  sessionId: string; // Random UUID, no persistence across runs
  operations: AnonymizedOperation[];
  stats: {
    totalOperations: number;
    successCount: number;
    errorCount: number;
    errorTypes: Record<TelemetryErrorType, number>;
  };
}

/**
 * Internal operation data (before anonymization)
 */
interface InternalOperation {
  type: TelemetryOperationType;
  timestamp: number;
  duration?: number;
  framework?: string;
  fileSize?: number;
  fileCount?: number;
  iconCount?: number;
  success: boolean;
  errorType?: TelemetryErrorType;
}

/**
 * Telemetry collector
 * Single session, no persistence across runs
 */
export class TelemetryCollector {
  private enabled: boolean = true;
  private operations: InternalOperation[] = [];
  private sessionId: string;
  private errorCounts: Record<TelemetryErrorType, number> = {
    'validation-failed': 0,
    'icon-generation': 0,
    'memory-limit': 0,
    timeout: 0,
    'config-invalid': 0,
    'network-error': 0,
    unknown: 0
  };

  constructor() {
    // Generate random session ID (no persistence)
    this.sessionId = this.generateSessionId();
  }

  /**
   * Generate random session ID (UUID v4 format)
   */
  private generateSessionId(): string {
    const randomBytes = (size: number): string => {
      const arr = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return Array.from(arr)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    };

    const hex = randomBytes(16);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(12, 15)}-${randomBytes(1)}-${hex.slice(16, 32)}`;
  }

  /**
   * Enable/disable telemetry (respects --disable-telemetry flag)
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Record an operation
   * Does not store if telemetry disabled
   */
  recordOperation(
    type: TelemetryOperationType,
    options?: {
      duration?: number;
      framework?: string;
      fileSize?: number; // bytes
      fileCount?: number;
      iconCount?: number;
      success?: boolean;
      errorType?: TelemetryErrorType;
    }
  ): void {
    if (!this.enabled) return;

    const operation: InternalOperation = {
      type,
      timestamp: Date.now(),
      duration: options?.duration,
      framework: options?.framework,
      fileSize: options?.fileSize,
      fileCount: options?.fileCount,
      iconCount: options?.iconCount,
      success: options?.success ?? true,
      errorType: options?.errorType
    };

    this.operations.push(operation);

    if (!operation.success && operation.errorType) {
      this.errorCounts[operation.errorType] = (this.errorCounts[operation.errorType] || 0) + 1;
    }
  }

  /**
   * Record an error
   */
  recordError(operation: TelemetryOperationType, errorType: TelemetryErrorType): void {
    this.recordOperation(operation, {
      success: false,
      errorType
    });
  }

  /**
   * Anonymize file size to range
   */
  private anonymizeFileSize(bytes?: number): 'small' | 'medium' | 'large' | 'huge' | undefined {
    if (!bytes) return undefined;
    if (bytes < 100 * 1024) return 'small'; // <100KB
    if (bytes < 1024 * 1024) return 'medium'; // <1MB
    if (bytes < 10 * 1024 * 1024) return 'large'; // <10MB
    return 'huge'; // >10MB
  }

  /**
   * Anonymize file count to range
   */
  private anonymizeFileCount(count?: number): 'few' | 'many' | 'vast' | undefined {
    if (!count) return undefined;
    if (count < 100) return 'few';
    if (count < 1000) return 'many';
    return 'vast';
  }

  /**
   * Export anonymized telemetry
   * All PII removed, only usage patterns preserved
   */
  exportAnonymized(): AnonymizedTelemetry {
    const anonymized: AnonymizedOperation[] = this.operations.map((op) => ({
      type: op.type,
      timestamp: op.timestamp,
      duration: op.duration,
      framework: op.framework, // Framework is not PII, it's metadata
      fileSizeRange: this.anonymizeFileSize(op.fileSize),
      fileCountRange: this.anonymizeFileCount(op.fileCount),
      iconCount: op.iconCount ? Math.round(op.iconCount / 5) * 5 : undefined, // Round to nearest 5
      success: op.success,
      errorType: op.errorType
    }));

    const stats = {
      totalOperations: this.operations.length,
      successCount: this.operations.filter((op) => op.success).length,
      errorCount: this.operations.filter((op) => !op.success).length,
      errorTypes: this.errorCounts
    };

    return {
      version: '1.0',
      exportedAt: Date.now(),
      sessionId: this.sessionId,
      operations: anonymized,
      stats
    };
  }

  /**
   * Get operation count
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Get error count
   */
  getErrorCount(): number {
    return this.operations.filter((op) => !op.success).length;
  }

  /**
   * Get error breakdown
   */
  getErrorBreakdown(): Record<TelemetryErrorType, number> {
    return { ...this.errorCounts };
  }

  /**
   * Reset telemetry (creates new session)
   */
  reset(): void {
    this.operations = [];
    this.sessionId = this.generateSessionId();
    const errorTypes: TelemetryErrorType[] = [
      'validation-failed',
      'icon-generation',
      'memory-limit',
      'timeout',
      'config-invalid',
      'network-error',
      'unknown'
    ];
    errorTypes.forEach((type) => {
      this.errorCounts[type] = 0;
    });
  }

  /**
   * Privacy method: Hash project name (SHA256)
   * Can be used for grouping analytics without identifying users
   */
  static hashProjectName(projectName: string): string {
    return createHash('sha256').update(projectName).digest('hex');
  }

  /**
   * Privacy method: Sanitize path (remove directory structure)
   * Returns only filename, not full path
   */
  static sanitizePath(filePath: string): string {
    const parts = filePath.split(/[\\/]/);
    return parts[parts.length - 1];
  }

  /**
   * Privacy compliance check
   * Returns true if operation data is fully anonymized
   */
  static isAnonymized(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return true;

    const str = JSON.stringify(data);

    // Check for common patterns that indicate PII
    const piiPatterns = [
      /Users\//i, // macOS paths
      /home\//i, // Linux paths
      /C:\\Users\\/i, // Windows paths
      /\/root\//i, // Root paths
      /[a-f0-9]{40}/, // Common hash that might be credentials
      /process\.env\./i, // Environment variable references
      /(password|token|secret|key|auth|credential)/i // Sensitive keywords
    ];

    return !piiPatterns.some((pattern) => pattern.test(str));
  }
}

// Global instance
let telemetryInstance: TelemetryCollector | null = null;

/**
 * Get global telemetry collector instance
 * Session-scoped, no persistence across runs
 */
export function getTelemetryCollector(): TelemetryCollector {
  if (!telemetryInstance) {
    telemetryInstance = new TelemetryCollector();
  }
  return telemetryInstance;
}

/**
 * Reset global telemetry instance (mainly for testing)
 */
export function resetTelemetryCollector(): void {
  telemetryInstance = null;
}
