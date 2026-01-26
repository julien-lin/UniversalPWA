import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StructuredLogger,
  getLogger,
  resetLogger,
  type LogEntry,
} from './logger.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    resetLogger();
    logger = new StructuredLogger();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    resetLogger();
  });

  describe('Context Management', () => {
    it('should set and retrieve context', () => {
      logger.setContext({ projectId: 'test-123', framework: 'react' });

      const context = logger.getContext();
      expect(context).toEqual({ projectId: 'test-123', framework: 'react' });
    });

    it('should merge context updates', () => {
      logger.setContext({ projectId: 'test-123' });
      logger.setContext({ framework: 'react' });

      const context = logger.getContext();
      expect(context).toEqual({ projectId: 'test-123', framework: 'react' });
    });

    it('should clear context', () => {
      logger.setContext({ projectId: 'test-123', framework: 'react' });
      logger.clearContext();

      const context = logger.getContext();
      expect(context).toEqual({});
    });

    it('should not mutate original context on getContext', () => {
      logger.setContext({ projectId: 'test-123' });
      const context = logger.getContext();
      context.projectId = 'modified';

      const newContext = logger.getContext();
      expect(newContext.projectId).toBe('test-123');
    });
  });

  describe('Timing Management', () => {
    it('should track phase timing', async () => {
      const endTiming = logger.startTiming('scan');

      await new Promise((resolve) => setTimeout(resolve, 50));
      endTiming();
      const breakdown = logger.getTimingBreakdown();

      expect(breakdown.phases.length).toBe(1);
      expect(breakdown.phases[0].phase).toBe('scan');
      expect(breakdown.phases[0].duration).toBeGreaterThanOrEqual(50);
    });

    it('should track multiple phase timings', async () => {
      const end1 = logger.startTiming('scan');
      await new Promise((resolve) => setTimeout(resolve, 20));
      end1();
      const end2 = logger.startTiming('generate');
      await new Promise((resolve) => setTimeout(resolve, 20));
      end2();
      const breakdown = logger.getTimingBreakdown();

      expect(breakdown.phases.length).toBe(2);
      expect(breakdown.phases[0].phase).toBe('scan');
      expect(breakdown.phases[1].phase).toBe('generate');
    });

    it('should calculate total operation duration', async () => {
      const end1 = logger.startTiming('phase1');
      await new Promise((resolve) => setTimeout(resolve, 50));
      end1();
      const breakdown = logger.getTimingBreakdown();

      expect(breakdown.totalDuration).toBeGreaterThanOrEqual(50);
    });

    it('should provide timing breakdown object', async () => {
      const end1 = logger.startTiming('scan');
      await new Promise((resolve) => setTimeout(resolve, 20));
      end1();
      const end2 = logger.startTiming('generate');
      await new Promise((resolve) => setTimeout(resolve, 20));
      end2();
      const breakdown = logger.getTimingBreakdown();

      expect(breakdown).toHaveProperty('phases');
      expect(breakdown).toHaveProperty('totalDuration');
      expect(breakdown).toHaveProperty('breakdown');
      expect(breakdown.breakdown.scan).toBeDefined();
      expect(breakdown.breakdown.generate).toBeDefined();
    });
  });

  describe('Logging Levels', () => {
    it('should log at trace level', () => {
      logger.trace('test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      if (typeof output === 'string') {
        expect(output).toContain('test message');
      }
    });

    it('should log at debug level', () => {
      logger.debug('debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log at info level', () => {
      logger.info('info message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log at warn level', () => {
      logger.warn('warn message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log at error level', () => {
      logger.error('error message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log at fatal level', () => {
      logger.fatal('fatal message');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('JSON Output Format', () => {
    beforeEach(() => {
      process.env.LOG_FORMAT = 'json';
    });

    afterEach(() => {
      delete process.env.LOG_FORMAT;
    });

    it('should output valid JSON log entry', () => {
      logger.setContext({ projectId: 'test-123' });
      logger.info('test message', { detail: 'data' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0] as string;
      const parsed: LogEntry = JSON.parse(output);

      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('test message');
      expect(parsed.context?.projectId).toBe('test-123');
      expect(parsed.data).toEqual({ detail: 'data' });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should include timing in JSON output', async () => {
      const endTiming = logger.startTiming('operation');
      await new Promise((resolve) => setTimeout(resolve, 10));
      endTiming();
      logger.info('operation complete');

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[consoleSpy.mock.calls.length - 1][0] as string;
      const parsed: LogEntry = JSON.parse(output);

      expect(parsed.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Prometheus Export', () => {
    it('should export metrics in Prometheus format', async () => {
      logger.setContext({ projectId: 'test-123' });
      const end1 = logger.startTiming('scan');

      await new Promise((resolve) => setTimeout(resolve, 10));
      end1();
      const prometheus = logger.exportPrometheus();

      expect(prometheus).toContain('# HELP operation_total_duration_ms');
      expect(prometheus).toContain('# TYPE operation_total_duration_ms gauge');
      expect(prometheus).toContain('operation_total_duration_ms');
      expect(prometheus).toContain('project_id="test-123"');
      expect(prometheus).toContain('# HELP phase_duration_ms');
      expect(prometheus).toContain('phase_duration_ms');
      expect(prometheus).toContain('phase="scan"');
    });

    it('should handle unknown project ID in Prometheus export', async () => {
      const end1 = logger.startTiming('scan');

      await new Promise((resolve) => setTimeout(resolve, 10));
      end1();
      const prometheus = logger.exportPrometheus();

      expect(prometheus).toContain('project_id="unknown"');
    });
  });

  describe('JSON Export', () => {
    it('should export metrics as JSON', async () => {
      logger.setContext({ projectId: 'test-123', framework: 'react' });
      const end1 = logger.startTiming('scan');

      await new Promise((resolve) => setTimeout(resolve, 10));
      end1();
      const json = logger.exportJSON();

      expect(json).toHaveProperty('operation');
      expect(json).toHaveProperty('phases');
      expect(json).toHaveProperty('context');
      expect(json.operation.duration).toBeGreaterThanOrEqual(0);
      expect(json.phases.length).toBe(1);
      expect(json.phases[0].phase).toBe('scan');
      expect(json.context.projectId).toBe('test-123');
      expect(json.context.framework).toBe('react');
    });
  });

  describe('Global Logger Instance', () => {
    it('should return same instance on multiple calls', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2);
    });

    it('should maintain context across global instance calls', () => {
      const logger1 = getLogger();
      logger1.setContext({ projectId: 'test-123' });

      const logger2 = getLogger();
      const context = logger2.getContext();

      expect(context.projectId).toBe('test-123');
    });

    it('should reset global logger', () => {
      const logger1 = getLogger();
      logger1.setContext({ projectId: 'test-123' });

      resetLogger();

      const logger2 = getLogger();
      const context = logger2.getContext();

      expect(context).toEqual({});
    });
  });

  describe('Integration Scenarios', () => {
    it('should track full PWA initialization flow', async () => {
      logger.setContext({ projectId: 'my-app', operationId: 'init-001' });

      const endScan = logger.startTiming('scan');
      await new Promise((resolve) => setTimeout(resolve, 10));
      endScan();

      const endGen = logger.startTiming('generate-icons');
      await new Promise((resolve) => setTimeout(resolve, 10));
      endGen();

      const endSW = logger.startTiming('service-worker');
      await new Promise((resolve) => setTimeout(resolve, 10));
      endSW();

      const breakdown = logger.getTimingBreakdown();
      expect(breakdown.phases.length).toBe(3);
      expect(breakdown.phases[0].phase).toBe('scan');
      expect(breakdown.phases[1].phase).toBe('generate-icons');
      expect(breakdown.phases[2].phase).toBe('service-worker');
      expect(breakdown.totalDuration).toBeGreaterThanOrEqual(30);

      // Export metrics
      const json = logger.exportJSON();
      expect(json.context.projectId).toBe('my-app');
      expect(json.context.operationId).toBe('init-001');

      logger.info('PWA init complete');
    });

    it('should handle logging without timing', () => {
      logger.setContext({ module: 'scanner' });
      logger.info('Scanning project');
      logger.warn('No package.json found');
      logger.error('Scan failed');

      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should provide clean API for CLI integration', () => {
      const logger1 = getLogger();
      logger1.setContext({ projectId: 'test' });

      const endScan = logger1.startTiming('scan');
      endScan();

      const metrics = logger1.exportJSON();
      expect(metrics.context.projectId).toBe('test');

      logger1.clearContext();
      const cleared = logger1.getContext();
      expect(cleared).toEqual({});
    });
  });
});
