/**
 * Performance Metrics Tests
 *
 * Tests for metric collection, export formats, accuracy, and baseline validation
 */

/* eslint-disable @typescript-eslint/require-await */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getMetricsCollector,
  resetMetricsCollector
} from './performance-metrics.js';

describe('PerformanceMetricsCollector', () => {
  beforeEach(() => {
    resetMetricsCollector();
    vi.useFakeTimers();
  });

  afterEach(() => {
    resetMetricsCollector();
    vi.useRealTimers();
  });

  describe('Phase Timing', () => {
    it('should track single phase timing', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');

      vi.setSystemTime(1150);
      metrics.endPhase('scan');

      const summary = metrics.getPhaseSummary('scan');
      expect(summary).toBeDefined();
      expect(summary?.duration).toBe(150);
    });

    it('should track multiple phases sequentially', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1200);
      metrics.endPhase('scan');

      vi.setSystemTime(1200);
      metrics.startPhase('generate');
      vi.setSystemTime(1500);
      metrics.endPhase('generate');

      vi.setSystemTime(1500);
      metrics.startPhase('inject');
      vi.setSystemTime(1700);
      metrics.endPhase('inject');

      const scanSummary = metrics.getPhaseSummary('scan');
      const genSummary = metrics.getPhaseSummary('generate');
      const injectSummary = metrics.getPhaseSummary('inject');

      expect(scanSummary?.duration).toBe(200);
      expect(genSummary?.duration).toBe(300);
      expect(injectSummary?.duration).toBe(200);
    });

    it('should support multiple entries per phase', async () => {
      const metrics = getMetricsCollector();

      // First scan
      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan', 10);

      // Second scan
      vi.setSystemTime(1100);
      metrics.startPhase('scan');
      vi.setSystemTime(1150);
      metrics.endPhase('scan', 5);

      const allScans = metrics.getPhaseMetrics('scan');
      expect(allScans).toHaveLength(2);
      expect(allScans[0].duration).toBe(100);
      expect(allScans[1].duration).toBe(50);
    });

    it('should record phase with direct timing', async () => {
      const metrics = getMetricsCollector();

      metrics.recordPhase('scan', 250, 15);

      const summary = metrics.getPhaseSummary('scan');
      expect(summary?.duration).toBe(250);
      expect(summary?.operations).toBe(15);
    });
  });

  describe('Operations Tracking', () => {
    it('should track operation count', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan', 25); // 25 files scanned

      const summary = metrics.getPhaseSummary('scan');
      expect(summary?.operations).toBe(25);
    });

    it('should calculate throughput from operations and duration', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('generate');
      vi.setSystemTime(1400); // 400ms for 40 operations
      metrics.endPhase('generate', 40);

      const summary = metrics.getPhaseSummary('generate');
      expect(summary?.throughtput).toBe(0.1); // 40 ops / 400ms = 0.1 ops/ms
    });

    it('should handle zero throughput gracefully', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('validate');
      vi.setSystemTime(1001);
      metrics.endPhase('validate', 1);

      const summary = metrics.getPhaseSummary('validate');
      expect(summary?.throughtput).toBeDefined();
      expect(typeof summary?.throughtput).toBe('number');
    });
  });

  describe('Context Management', () => {
    it('should set and retrieve context', async () => {
      const metrics = getMetricsCollector();

      metrics.setContext({
        projectId: 'test-project',
        operationId: 'op-001',
        framework: 'react'
      });

      const context = metrics.getContext();
      expect(context.projectId).toBe('test-project');
      expect(context.operationId).toBe('op-001');
      expect(context.framework).toBe('react');
    });

    it('should merge context updates', async () => {
      const metrics = getMetricsCollector();

      metrics.setContext({ projectId: 'project-1' });
      metrics.setContext({ operationId: 'op-1' });

      const context = metrics.getContext();
      expect(context.projectId).toBe('project-1');
      expect(context.operationId).toBe('op-1');
    });

    it('should not mutate original context on retrieval', async () => {
      const metrics = getMetricsCollector();

      metrics.setContext({ projectId: 'test' });
      const context1 = metrics.getContext();
      context1.projectId = 'modified';

      const context2 = metrics.getContext();
      expect(context2.projectId).toBe('test');
    });
  });

  describe('Total Duration Tracking', () => {
    it('should track total operation duration', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');

      vi.setSystemTime(1200);
      metrics.endPhase('scan');

      metrics.startPhase('generate');

      vi.setSystemTime(1600);
      metrics.endPhase('generate');

      const total = metrics.getTotalDuration();
      expect(total).toBe(600); // 1600 - 1000
    });

    it('should return 0 for total duration if no phases started', async () => {
      const metrics = getMetricsCollector();

      const total = metrics.getTotalDuration();
      expect(total).toBe(0);
    });
  });

  describe('Baseline Thresholds', () => {
    it('should set custom baseline thresholds', async () => {
      const metrics = getMetricsCollector();

      metrics.setBaseline({
        scan: { max: 5000, warn: 2000 },
        generate: { max: 8000, warn: 4000 }
      });

      const baseline = metrics.getBaseline();
      expect(baseline.scan.max).toBe(5000);
      expect(baseline.generate.max).toBe(8000);
    });

    it('should detect critical threshold violations', async () => {
      const metrics = getMetricsCollector();
      metrics.setBaseline({
        scan: { max: 100, warn: 50 }
      });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1150); // 150ms > 100ms max
      metrics.endPhase('scan');

      const alerts = metrics.checkThresholds();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].threshold).toBe('critical');
      expect(alerts[0].actual).toBe(150);
    });

    it('should detect warning threshold violations', async () => {
      const metrics = getMetricsCollector();
      metrics.setBaseline({
        generate: { max: 1000, warn: 500 }
      });

      vi.setSystemTime(1000);
      metrics.startPhase('generate');
      vi.setSystemTime(1700); // 700ms, between warn and max
      metrics.endPhase('generate');

      const alerts = metrics.checkThresholds();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].threshold).toBe('warn');
    });

    it('should not alert for normal thresholds', async () => {
      const metrics = getMetricsCollector();
      metrics.setBaseline({
        inject: { max: 5000, warn: 2000 }
      });

      vi.setSystemTime(1000);
      metrics.startPhase('inject');
      vi.setSystemTime(1800); // 800ms, below warn
      metrics.endPhase('inject');

      const alerts = metrics.checkThresholds();
      expect(alerts).toHaveLength(0);
    });
  });

  describe('JSON Export', () => {
    it('should export metrics as valid JSON', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'test-app' });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan', 20);

      vi.setSystemTime(1100);
      metrics.startPhase('generate');
      vi.setSystemTime(1400);
      metrics.endPhase('generate', 10);

      const json = metrics.exportJSON();

      expect(json.operation).toBeDefined();
      expect(json.operation.duration).toBe(400);
      expect(json.operation.phases).toContain('scan');
      expect(json.operation.phases).toContain('generate');
      expect(json.phases).toHaveLength(2);
    });

    it('should include operation metrics in JSON', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1250);
      metrics.endPhase('scan', 30);

      const json = metrics.exportJSON();

      const scanPhase = json.phases.find((p) => p.phase === 'scan');
      expect(scanPhase).toBeDefined();
      expect(scanPhase?.duration).toBe(250);
      expect(scanPhase?.operations).toBe(30);
      expect(scanPhase?.throughtput).toBe(0.12);
    });

    it('should include context in JSON export', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({
        projectId: 'my-app',
        framework: 'react',
        operationId: 'init-001'
      });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan');

      const json = metrics.exportJSON();

      expect(json.context).toBeDefined();
      expect(json.context?.projectId).toBe('my-app');
      expect(json.context?.framework).toBe('react');
    });

    it('should include alerts in JSON export', async () => {
      const metrics = getMetricsCollector();
      metrics.setBaseline({
        scan: { max: 100, warn: 50 }
      });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1150); // 150ms
      metrics.endPhase('scan');

      const json = metrics.exportJSON();

      expect(json.alerts).toHaveLength(1);
      expect(json.alerts[0].threshold).toBe('critical');
      expect(json.alerts[0].actual).toBe(150);
    });

    it('should omit context from JSON if empty', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan');

      const json = metrics.exportJSON();

      expect(json.context).toBeUndefined();
    });
  });

  describe('Prometheus Export', () => {
    it('should export metrics in Prometheus format', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'test-app' });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1200);
      metrics.endPhase('scan', 20);

      const prometheus = metrics.exportPrometheus();

      expect(prometheus).toContain('# HELP operation_duration_ms');
      expect(prometheus).toContain('# TYPE operation_duration_ms gauge');
      expect(prometheus).toContain('operation_duration_ms{project_id="test-app"}');
      expect(prometheus).toContain('phase_duration_ms{project_id="test-app",phase="scan"}');
    });

    it('should include operations count in Prometheus format', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'my-project' });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1300);
      metrics.endPhase('scan', 25);

      const prometheus = metrics.exportPrometheus();

      expect(prometheus).toContain('# HELP phase_operations_count');
      expect(prometheus).toContain('phase_operations_count{project_id="my-project",phase="scan"} 25');
    });

    it('should include throughput in Prometheus format', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'perf-test' });

      vi.setSystemTime(1000);
      metrics.startPhase('generate');
      vi.setSystemTime(1500); // 500ms for 50 ops
      metrics.endPhase('generate', 50);

      const prometheus = metrics.exportPrometheus();

      expect(prometheus).toContain('# HELP phase_throughput_ops_per_ms');
      expect(prometheus).toContain('phase_throughput_ops_per_ms{project_id="perf-test",phase="generate"} 0.1');
    });

    it('should handle unknown project in Prometheus format', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan');

      const prometheus = metrics.exportPrometheus();

      expect(prometheus).toContain('project_id="unknown"');
    });

    it('should format Prometheus metrics with correct labels', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'label-test' });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1200);
      metrics.endPhase('scan');

      metrics.startPhase('generate');
      vi.setSystemTime(1500);
      metrics.endPhase('generate');

      const prometheus = metrics.exportPrometheus();
      const lines = prometheus.split('\n');

      // Should have properly formatted lines
      const metricLines = lines.filter((line) => line && !line.startsWith('#'));
      metricLines.forEach((line) => {
        expect(line).toMatch(/^[\w_]+\{.*\}\s+[\d.]+$/);
      });
    });
  });

  describe('Summary Statistics', () => {
    it('should provide accurate summary', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1200);
      metrics.endPhase('scan', 30);

      metrics.startPhase('generate');
      vi.setSystemTime(1700);
      metrics.endPhase('generate', 15);

      const summary = metrics.getSummary();

      expect(summary.totalDuration).toBe(700);
      expect(summary.phases.scan.duration).toBe(200);
      expect(summary.phases.scan.operations).toBe(30);
      expect(summary.phases.generate.duration).toBe(500);
      expect(summary.phases.generate.operations).toBe(15);
    });

    it('should include alerts in summary', async () => {
      const metrics = getMetricsCollector();
      metrics.setBaseline({
        scan: { max: 100, warn: 50 }
      });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1120); // 120ms, exceeds critical
      metrics.endPhase('scan');

      const summary = metrics.getSummary();

      expect(summary.alerts).toHaveLength(1);
      expect(summary.alerts[0].phase).toBe('scan');
      expect(summary.alerts[0].threshold).toBe('critical');
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset all metrics', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'test' });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan');

      metrics.reset();

      expect(metrics.getTotalDuration()).toBe(0);
      expect(metrics.getPhaseSummary('scan')).toBeNull();
      expect(metrics.getContext()).toEqual({});
    });

    it('should provide clean instance after reset', async () => {
      const metrics1 = getMetricsCollector();
      metrics1.setContext({ projectId: 'first' });

      resetMetricsCollector();

      const metrics2 = getMetricsCollector();
      expect(metrics2.getContext()).toEqual({});
    });
  });

  describe('Accuracy Requirements', () => {
    it('should maintain timing accuracy within 5% tolerance', async () => {
      const metrics = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics.startPhase('scan');

      // Add 500ms
      vi.setSystemTime(1500);
      metrics.endPhase('scan');

      const duration = metrics.getPhaseSummary('scan')?.duration || 0;
      const tolerance = 500 * 0.05; // 5% of 500ms = 25ms

      expect(Math.abs(duration - 500)).toBeLessThanOrEqual(tolerance);
    });

    it('should round durations to 2 decimal places', async () => {
      const metrics = getMetricsCollector();

      metrics.recordPhase('scan', 123.456789);

      const summary = metrics.getPhaseSummary('scan');
      const durationStr = summary?.duration.toString() || '';
      const decimalPlaces = (durationStr.split('.')[1] || '').length;

      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('Global Instance Pattern', () => {
    it('should provide singleton instance', async () => {
      const metrics1 = getMetricsCollector();
      const metrics2 = getMetricsCollector();

      expect(metrics1).toBe(metrics2);
    });

    it('should maintain state across calls', async () => {
      const metrics1 = getMetricsCollector();

      vi.setSystemTime(1000);
      metrics1.startPhase('scan');
      vi.setSystemTime(1100);
      metrics1.endPhase('scan');

      const metrics2 = getMetricsCollector();
      const summary = metrics2.getPhaseSummary('scan');

      expect(summary?.duration).toBe(100);
    });

    it('should isolate test instances after reset', async () => {
      const metrics1 = getMetricsCollector();
      metrics1.recordPhase('scan', 100);

      resetMetricsCollector();

      const metrics2 = getMetricsCollector();
      expect(metrics2.getPhaseMetrics('scan')).toHaveLength(0);
    });
  });

  describe('Integration Scenarios', () => {
    it('should track complete PWA generation flow', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({
        projectId: 'my-app',
        framework: 'react',
        operationId: 'gen-001'
      });

      // Scan phase
      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1500);
      metrics.endPhase('scan', 150); // 150 files

      // Generate phase
      vi.setSystemTime(1500);
      metrics.startPhase('generate');
      vi.setSystemTime(3000);
      metrics.endPhase('generate', 10); // 10 icons

      // Inject phase
      vi.setSystemTime(3000);
      metrics.startPhase('inject');
      vi.setSystemTime(3200);
      metrics.endPhase('inject');

      // Validate phase
      vi.setSystemTime(3200);
      metrics.startPhase('validate');
      vi.setSystemTime(3400);
      metrics.endPhase('validate');

      const json = metrics.exportJSON();

      expect(json.operation.duration).toBe(2400);
      expect(json.operation.phases).toHaveLength(4);
      expect(json.phases.find((p) => p.phase === 'scan')?.operations).toBe(150);
      expect(json.phases.find((p) => p.phase === 'generate')?.operations).toBe(10);
      expect(json.context?.projectId).toBe('my-app');
    });

    it('should export metrics for monitoring system', async () => {
      const metrics = getMetricsCollector();
      metrics.setContext({ projectId: 'prod-app' });

      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1800);
      metrics.endPhase('scan', 200);

      metrics.startPhase('generate');
      vi.setSystemTime(2500);
      metrics.endPhase('generate', 50);

      const prometheus = metrics.exportPrometheus();
      const json = metrics.exportJSON();

      // Both formats should be valid
      expect(prometheus).toContain('# HELP');
      expect(prometheus).toContain('# TYPE');
      expect(json.operation).toBeDefined();
      expect(json.phases).toBeDefined();

      // Summary should match
      expect(json.operation.duration).toBe(1500);
    });

    it('should handle multiple operations sequentially', async () => {
      const metrics = getMetricsCollector();

      // First operation
      vi.setSystemTime(1000);
      metrics.startPhase('scan');
      vi.setSystemTime(1100);
      metrics.endPhase('scan', 10);

      metrics.reset();

      // Second operation
      vi.setSystemTime(2000);
      metrics.startPhase('scan');
      vi.setSystemTime(2300);
      metrics.endPhase('scan', 20);

      const summary = metrics.getPhaseSummary('scan');
      expect(summary?.operations).toBe(20);
      expect(summary?.duration).toBe(300);
    });
  });
});
