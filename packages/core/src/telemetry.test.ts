/**
 * Telemetry Tests - Privacy-First Telemetry System
 *
 * Tests for anonymization, privacy compliance, and functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTelemetryCollector,
  resetTelemetryCollector,
  TelemetryCollector
} from './telemetry.js';

describe('TelemetryCollector', () => {
  beforeEach(() => {
    resetTelemetryCollector();
  });

  afterEach(() => {
    resetTelemetryCollector();
  });

  describe('Operation Recording', () => {
    it('should record operation when enabled', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        framework: 'react',
        fileCount: 42,
        success: true
      });

      expect(telemetry.getOperationCount()).toBe(1);
    });

    it('should not record operation when disabled', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(false);

      telemetry.recordOperation('scan', {
        framework: 'react',
        fileCount: 42
      });

      expect(telemetry.getOperationCount()).toBe(0);
    });

    it('should record operation with all options', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('generate', {
        duration: 1500,
        framework: 'vue',
        fileSize: 524288, // 512KB
        fileCount: 250,
        iconCount: 12,
        success: true
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations).toHaveLength(1);
      expect(exported.operations[0].type).toBe('generate');
      expect(exported.operations[0].duration).toBe(1500);
      expect(exported.operations[0].framework).toBe('vue');
    });

    it('should record multiple operations', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', { success: true });
      telemetry.recordOperation('generate', { success: true });
      telemetry.recordOperation('inject', { success: true });

      expect(telemetry.getOperationCount()).toBe(3);
    });
  });

  describe('Error Recording', () => {
    it('should record error operation', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordError('generate', 'memory-limit');

      expect(telemetry.getErrorCount()).toBe(1);
      const breakdown = telemetry.getErrorBreakdown();
      expect(breakdown['memory-limit']).toBe(1);
    });

    it('should track multiple error types', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordError('scan', 'validation-failed');
      telemetry.recordError('generate', 'memory-limit');
      telemetry.recordError('generate', 'memory-limit');
      telemetry.recordError('inject', 'timeout');

      expect(telemetry.getErrorCount()).toBe(4);
      const breakdown = telemetry.getErrorBreakdown();
      expect(breakdown['validation-failed']).toBe(1);
      expect(breakdown['memory-limit']).toBe(2);
      expect(breakdown['timeout']).toBe(1);
    });

    it('should record mixed success and error operations', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', { success: true });
      telemetry.recordOperation('generate', { success: false, errorType: 'icon-generation' });
      telemetry.recordOperation('inject', { success: true });

      const exported = telemetry.exportAnonymized();
      expect(exported.stats.totalOperations).toBe(3);
      expect(exported.stats.successCount).toBe(2);
      expect(exported.stats.errorCount).toBe(1);
    });
  });

  describe('File Size Anonymization', () => {
    it('should anonymize small files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileSize: 50000 // 50KB
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileSizeRange).toBe('small');
    });

    it('should anonymize medium files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileSize: 512000 // 512KB
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileSizeRange).toBe('medium');
    });

    it('should anonymize large files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileSize: 5242880 // 5MB
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileSizeRange).toBe('large');
    });

    it('should anonymize huge files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileSize: 52428800 // 50MB
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileSizeRange).toBe('huge');
    });

    it('should handle undefined file size', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan');

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileSizeRange).toBeUndefined();
    });
  });

  describe('File Count Anonymization', () => {
    it('should anonymize few files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileCount: 42
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileCountRange).toBe('few');
    });

    it('should anonymize many files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileCount: 542
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileCountRange).toBe('many');
    });

    it('should anonymize vast number of files', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        fileCount: 5000
      });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].fileCountRange).toBe('vast');
    });
  });

  describe('Icon Count Anonymization', () => {
    it('should round icon count to nearest 5', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('generate', { iconCount: 7 });
      telemetry.recordOperation('generate', { iconCount: 12 });
      telemetry.recordOperation('generate', { iconCount: 18 });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].iconCount).toBe(5);
      expect(exported.operations[1].iconCount).toBe(10);
      expect(exported.operations[2].iconCount).toBe(20);
    });

    it('should omit icon count if undefined', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan');

      const exported = telemetry.exportAnonymized();
      expect(exported.operations[0].iconCount).toBeUndefined();
    });
  });

  describe('Anonymization Verification', () => {
    it('should mark anonymized data as safe', () => {
      const data = {
        type: 'scan',
        framework: 'react',
        fileCountRange: 'many',
        success: true
      };

      expect(TelemetryCollector.isAnonymized(data)).toBe(true);
    });

    it('should detect paths in data', () => {
      const dataWithPath = {
        project: '/Users/john/projects/my-app'
      };

      expect(TelemetryCollector.isAnonymized(dataWithPath)).toBe(false);
    });

    it('should detect env variable references', () => {
      const dataWithEnv = {
        config: 'process.env.API_KEY'
      };

      expect(TelemetryCollector.isAnonymized(dataWithEnv)).toBe(false);
    });

    it('should detect sensitive keywords', () => {
      const dataWithKeywords = {
        auth: 'my-secret-token-12345'
      };

      expect(TelemetryCollector.isAnonymized(dataWithKeywords)).toBe(false);
    });

    it('should allow null/primitive values', () => {
      expect(TelemetryCollector.isAnonymized(null)).toBe(true);
      expect(TelemetryCollector.isAnonymized(123)).toBe(true);
      expect(TelemetryCollector.isAnonymized('react')).toBe(true);
    });
  });

  describe('Export Format', () => {
    it('should export anonymized telemetry with required fields', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', { success: true, fileCount: 50 });

      const exported = telemetry.exportAnonymized();

      expect(exported.version).toBe('1.0');
      expect(exported.exportedAt).toBeDefined();
      expect(typeof exported.exportedAt).toBe('number');
      expect(exported.sessionId).toBeDefined();
      expect(exported.operations).toHaveLength(1);
      expect(exported.stats).toBeDefined();
    });

    it('should generate unique session IDs', () => {
      const telemetry1 = getTelemetryCollector();
      const sessionId1 = telemetry1.exportAnonymized().sessionId;

      resetTelemetryCollector();

      const telemetry2 = getTelemetryCollector();
      const sessionId2 = telemetry2.exportAnonymized().sessionId;

      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should maintain session ID across exports', () => {
      const telemetry = getTelemetryCollector();
      telemetry.recordOperation('scan', { success: true });

      const export1 = telemetry.exportAnonymized();
      const export2 = telemetry.exportAnonymized();

      expect(export1.sessionId).toBe(export2.sessionId);
    });

    it('should include stats in export', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', { success: true });
      telemetry.recordOperation('generate', { success: true });
      telemetry.recordError('inject', 'timeout');

      const exported = telemetry.exportAnonymized();

      expect(exported.stats.totalOperations).toBe(3);
      expect(exported.stats.successCount).toBe(2);
      expect(exported.stats.errorCount).toBe(1);
      expect(exported.stats.errorTypes.timeout).toBe(1);
    });

    it('should export valid JSON', () => {
      const telemetry = getTelemetryCollector();
      telemetry.recordOperation('scan', { success: true });

      const exported = telemetry.exportAnonymized();
      const json = JSON.stringify(exported);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0');
      expect(Array.isArray(parsed.operations)).toBe(true);
      expect(typeof parsed.stats).toBe('object');
    });
  });

  describe('Privacy Helper Functions', () => {
    it('should hash project names consistently', () => {
      const hash1 = TelemetryCollector.hashProjectName('my-app');
      const hash2 = TelemetryCollector.hashProjectName('my-app');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different names', () => {
      const hash1 = TelemetryCollector.hashProjectName('my-app');
      const hash2 = TelemetryCollector.hashProjectName('other-app');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce SHA256 hash (64 hex chars)', () => {
      const hash = TelemetryCollector.hashProjectName('test');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should sanitize file paths', () => {
      const path1 = TelemetryCollector.sanitizePath('/home/user/projects/my-app/src/index.ts');
      const path2 = TelemetryCollector.sanitizePath('C:\\Users\\john\\projects\\my-app\\src\\index.ts');

      expect(path1).toBe('index.ts');
      expect(path2).toBe('index.ts');
    });

    it('should handle single filename', () => {
      const path = TelemetryCollector.sanitizePath('config.json');

      expect(path).toBe('config.json');
    });
  });

  describe('Enable/Disable Control', () => {
    it('should respect enabled flag', () => {
      const telemetry = getTelemetryCollector();

      telemetry.setEnabled(true);
      expect(telemetry.isEnabled()).toBe(true);

      telemetry.setEnabled(false);
      expect(telemetry.isEnabled()).toBe(false);

      telemetry.setEnabled(true);
      expect(telemetry.isEnabled()).toBe(true);
    });

    it('should not record operations when disabled', () => {
      const telemetry = getTelemetryCollector();

      telemetry.setEnabled(false);
      telemetry.recordOperation('scan', { success: true });
      telemetry.recordOperation('generate', { success: true });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations).toHaveLength(0);
      expect(exported.stats.totalOperations).toBe(0);
    });

    it('should toggle recording on/off', () => {
      const telemetry = getTelemetryCollector();

      telemetry.setEnabled(true);
      telemetry.recordOperation('scan', { success: true });

      telemetry.setEnabled(false);
      telemetry.recordOperation('generate', { success: true });

      telemetry.setEnabled(true);
      telemetry.recordOperation('inject', { success: true });

      const exported = telemetry.exportAnonymized();
      expect(exported.operations).toHaveLength(2); // Only scan and inject
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all data', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', { success: true });
      telemetry.recordError('generate', 'memory-limit');

      telemetry.reset();

      expect(telemetry.getOperationCount()).toBe(0);
      expect(telemetry.getErrorCount()).toBe(0);
    });

    it('should generate new session ID on reset', () => {
      const telemetry = getTelemetryCollector();
      const sessionId1 = telemetry.exportAnonymized().sessionId;

      telemetry.reset();

      const sessionId2 = telemetry.exportAnonymized().sessionId;
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should reset error counts', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordError('scan', 'validation-failed');
      telemetry.recordError('generate', 'memory-limit');

      let breakdown = telemetry.getErrorBreakdown();
      expect(breakdown['validation-failed']).toBe(1);
      expect(breakdown['memory-limit']).toBe(1);

      telemetry.reset();

      breakdown = telemetry.getErrorBreakdown();
      expect(breakdown['validation-failed']).toBe(0);
      expect(breakdown['memory-limit']).toBe(0);
    });
  });

  describe('Global Instance Pattern', () => {
    it('should provide singleton instance', () => {
      const telemetry1 = getTelemetryCollector();
      const telemetry2 = getTelemetryCollector();

      expect(telemetry1).toBe(telemetry2);
    });

    it('should maintain state across calls', () => {
      const telemetry1 = getTelemetryCollector();
      telemetry1.setEnabled(true);
      telemetry1.recordOperation('scan', { success: true });

      const telemetry2 = getTelemetryCollector();
      expect(telemetry2.getOperationCount()).toBe(1);
    });

    it('should isolate instances after reset', () => {
      const telemetry1 = getTelemetryCollector();
      telemetry1.setEnabled(true);
      telemetry1.recordOperation('scan', { success: true });

      resetTelemetryCollector();

      const telemetry2 = getTelemetryCollector();
      expect(telemetry2.getOperationCount()).toBe(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track complete PWA generation flow', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        framework: 'react',
        fileCount: 150,
        success: true
      });

      telemetry.recordOperation('generate', {
        duration: 2500,
        fileSize: 5242880,
        fileCount: 150, // Add this
        iconCount: 12,
        success: true
      });

      telemetry.recordOperation('inject', {
        duration: 800,
        success: true
      });

      telemetry.recordOperation('validate', {
        duration: 500,
        success: true
      });

      const exported = telemetry.exportAnonymized();

      expect(exported.operations).toHaveLength(4);
      expect(exported.stats.totalOperations).toBe(4);
      expect(exported.stats.successCount).toBe(4);
      expect(exported.stats.errorCount).toBe(0);
      expect(exported.operations[1].fileCountRange).toBe('many');
      expect(exported.operations[1].fileSizeRange).toBe('large');
    });

    it('should handle error recovery flow', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', { success: true });
      telemetry.recordError('generate', 'memory-limit');
      telemetry.recordOperation('scan', { success: true }); // Retry
      telemetry.recordOperation('generate', { success: true }); // Retry succeeds

      const exported = telemetry.exportAnonymized();

      expect(exported.stats.totalOperations).toBe(4);
      expect(exported.stats.successCount).toBe(3);
      expect(exported.stats.errorCount).toBe(1);
      expect(exported.stats.errorTypes['memory-limit']).toBe(1);
    });

    it('should preserve privacy in real scenario', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      // Simulate real operation with sensitive data
      telemetry.recordOperation('scan', {
        framework: 'next.js',
        fileCount: 250,
        fileSize: 1048576,
        success: true
      });

      const exported = telemetry.exportAnonymized();

      // Verify no sensitive data leaked
      const jsonString = JSON.stringify(exported);
      expect(TelemetryCollector.isAnonymized(exported)).toBe(true);
      expect(jsonString).not.toContain('/Users/');
      expect(jsonString).not.toContain('/home/');
      expect(jsonString).not.toContain('C:\\');
    });
  });

  describe('RGPD Compliance', () => {
    it('should not persist data across instances', () => {
      const telemetry1 = getTelemetryCollector();
      telemetry1.setEnabled(true);
      telemetry1.recordOperation('scan', { success: true });

      resetTelemetryCollector();

      const telemetry2 = getTelemetryCollector();
      expect(telemetry2.getOperationCount()).toBe(0);
    });

    it('should provide opt-in/opt-out control', () => {
      const telemetry = getTelemetryCollector();

      telemetry.setEnabled(false);
      telemetry.recordOperation('scan', { success: true });

      telemetry.setEnabled(true);
      telemetry.recordOperation('scan', { success: true });

      telemetry.setEnabled(false);
      telemetry.recordOperation('scan', { success: true });

      expect(telemetry.getOperationCount()).toBe(1); // Only one recorded
    });

    it('should not contain personally identifiable information', () => {
      const telemetry = getTelemetryCollector();
      telemetry.setEnabled(true);

      telemetry.recordOperation('scan', {
        framework: 'react',
        fileCount: 100,
        success: true
      });

      const exported = telemetry.exportAnonymized();
      const jsonString = JSON.stringify(exported);

      // Should not contain paths, emails, or user info
      expect(jsonString).not.toMatch(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      expect(jsonString).not.toMatch(/\/Users\/\w+/);
      expect(jsonString).not.toMatch(/C:\\Users\\/);
    });
  });
});
