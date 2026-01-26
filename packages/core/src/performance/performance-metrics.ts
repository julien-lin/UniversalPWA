import type { LogContext } from '../logger.js';

/**
 * Performance phase enumeration
 * Supported phases for metric collection
 */
export type PerformancePhase = 'scan' | 'generate' | 'inject' | 'validate' | 'total';

/**
 * Phase metric entry
 */
export interface PhaseMetric {
  phase: PerformancePhase;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  throughtput?: number; // items/ms for scan operations
  operations?: number; // count of operations in phase
}

/**
 * Performance baseline thresholds
 * Used to validate that metrics are within acceptable ranges
 */
export interface PerformanceBaseline {
  scan: { max: number; warn: number }; // ms
  generate: { max: number; warn: number }; // ms
  inject: { max: number; warn: number }; // ms
  validate: { max: number; warn: number }; // ms
  total: { max: number; warn: number }; // ms
}

/**
 * Metrics export format - JSON
 */
export interface MetricsJSON {
  operation: {
    duration: number;
    timestamp: number;
    phases: string[];
  };
  phases: Array<{
    phase: PerformancePhase;
    duration: number;
    startTime: number;
    endTime: number;
    operations?: number;
    throughtput?: number;
  }>;
  context?: Record<string, unknown>;
  alerts: Array<{
    phase: PerformancePhase;
    threshold: 'warn' | 'critical';
    actual: number;
    baseline: number;
  }>;
}

/**
 * Internal context type for safer handling
 */
interface InternalContext {
  projectId?: string;
  operationId?: string;
  framework?: string;
  module?: string;
  [key: string]: unknown;
}

/**
 * Performance metrics collector
 * Singleton pattern for global access
 */
export class PerformanceMetricsCollector {
  private phases: Map<PerformancePhase, PhaseMetric[]> = new Map();
  private operationStart: number = 0;
  private context: InternalContext = {};
  private baseline: PerformanceBaseline = {
    scan: { max: 10000, warn: 5000 },
    generate: { max: 15000, warn: 8000 },
    inject: { max: 5000, warn: 2000 },
    validate: { max: 5000, warn: 2000 },
    total: { max: 30000, warn: 15000 }
  };

  /**
   * Initialize phases map
   */
  constructor() {
    this.reset();
  }

  /**
   * Set context for metrics (project info, framework, etc)
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get current context
   */
  getContext(): Record<string, unknown> {
    return { ...this.context };
  }

  /**
   * Start measuring a phase
   * @param phase - Phase name
   * @returns Unique phase ID for tracking
   */
  startPhase(phase: PerformancePhase): string {
    if (!this.operationStart) {
      this.operationStart = Date.now();
    }

    const phaseEntry: PhaseMetric = {
      phase,
      startTime: Date.now(),
      endTime: 0,
      duration: 0
    };

    if (!this.phases.has(phase)) {
      this.phases.set(phase, []);
    }

    this.phases.get(phase)!.push(phaseEntry);

    // Return index for reference
    return `${phase}-${this.phases.get(phase)!.length - 1}`;
  }

  /**
   * End measuring a phase
   * @param phase - Phase name
   * @param operations - Optional count of operations completed
   */
  endPhase(phase: PerformancePhase, operations?: number): void {
    if (!this.phases.has(phase) || this.phases.get(phase)!.length === 0) {
      return;
    }

    const phaseMetrics = this.phases.get(phase)!;
    const lastPhase = phaseMetrics[phaseMetrics.length - 1];

    lastPhase.endTime = Date.now();
    lastPhase.duration = Math.round((lastPhase.endTime - lastPhase.startTime) * 100) / 100; // 2 decimals

    if (operations !== undefined) {
      lastPhase.operations = operations;
      lastPhase.throughtput = Math.round((operations / lastPhase.duration) * 100) / 100;
    }
  }

  /**
   * Record operation duration for a phase (alternative to start/end pattern)
   */
  recordPhase(phase: PerformancePhase, duration: number, operations?: number): void {
    const now = Date.now();
    const phaseEntry: PhaseMetric = {
      phase,
      startTime: now - duration,
      endTime: now,
      duration: Math.round(duration * 100) / 100,
      operations
    };

    if (operations !== undefined) {
      phaseEntry.throughtput = Math.round((operations / duration) * 100) / 100;
    }

    if (!this.phases.has(phase)) {
      this.phases.set(phase, []);
    }

    this.phases.get(phase)!.push(phaseEntry);
  }

  /**
   * Get all metrics for a specific phase
   */
  getPhaseMetrics(phase: PerformancePhase): PhaseMetric[] {
    return this.phases.get(phase) ?? [];
  }

  /**
   * Get summary for a phase (latest entry)
   */
  getPhaseSummary(phase: PerformancePhase): PhaseMetric | null {
    const phases = this.phases.get(phase);
    return phases && phases.length > 0 ? phases[phases.length - 1] : null;
  }

  /**
   * Get total operation duration
   */
  getTotalDuration(): number {
    if (!this.operationStart) return 0;
    return Math.round((Date.now() - this.operationStart) * 100) / 100;
  }

  /**
   * Set custom baseline thresholds
   */
  setBaseline(baseline: Partial<PerformanceBaseline>): void {
    this.baseline = { ...this.baseline, ...baseline };
  }

  /**
   * Get baseline thresholds
   */
  getBaseline(): PerformanceBaseline {
    return { ...this.baseline };
  }

  /**
   * Check if phase metrics exceed thresholds
   */
  checkThresholds(): Array<{ phase: PerformancePhase; threshold: 'warn' | 'critical'; actual: number; baseline: number }> {
    const alerts: Array<{ phase: PerformancePhase; threshold: 'warn' | 'critical'; actual: number; baseline: number }> = [];

    (Object.keys(this.baseline) as PerformancePhase[]).forEach((phase) => {
      const summary = this.getPhaseSummary(phase);
      if (!summary) return;

      const { max, warn } = this.baseline[phase];

      if (summary.duration > max) {
        alerts.push({
          phase,
          threshold: 'critical',
          actual: summary.duration,
          baseline: max
        });
      } else if (summary.duration > warn) {
        alerts.push({
          phase,
          threshold: 'warn',
          actual: summary.duration,
          baseline: warn
        });
      }
    });

    return alerts;
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): MetricsJSON {
    const phasesList: PerformancePhase[] = [];
    const phasesData: Array<{
      phase: PerformancePhase;
      duration: number;
      startTime: number;
      endTime: number;
      operations?: number;
      throughtput?: number;
    }> = [];

    this.phases.forEach((metrics, phase) => {
      if (metrics.length > 0) {
        const last = metrics[metrics.length - 1];
        phasesList.push(phase);
        phasesData.push({
          phase,
          duration: last.duration,
          startTime: last.startTime,
          endTime: last.endTime,
          ...(last.operations !== undefined && { operations: last.operations }),
          ...(last.throughtput !== undefined && { throughtput: last.throughtput })
        });
      }
    });

    return {
      operation: {
        duration: this.getTotalDuration(),
        timestamp: Date.now(),
        phases: phasesList
      },
      phases: phasesData,
      ...(Object.keys(this.context).length > 0 && { context: this.context }),
      alerts: this.checkThresholds()
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const lines: string[] = [];
    const projectId = String(this.context.projectId ?? 'unknown');
    const projectLabel = `project_id="${projectId}"`;

    // Total duration metric
    lines.push('# HELP operation_duration_ms Total operation duration in milliseconds');
    lines.push('# TYPE operation_duration_ms gauge');
    lines.push(`operation_duration_ms{${projectLabel}} ${this.getTotalDuration()}`);
    lines.push('');

    // Phase metrics
    lines.push('# HELP phase_duration_ms Duration of each phase in milliseconds');
    lines.push('# TYPE phase_duration_ms gauge');
    this.phases.forEach((metrics, phase) => {
      if (metrics.length > 0) {
        const last = metrics[metrics.length - 1];
        lines.push(`phase_duration_ms{${projectLabel},phase="${phase}"} ${last.duration}`);
      }
    });
    lines.push('');

    // Operations count (for scan phases)
    const scanMetrics = this.getPhaseMetrics('scan');
    if (scanMetrics.length > 0) {
      const last = scanMetrics[scanMetrics.length - 1];
      lines.push('# HELP phase_operations_count Number of operations in phase');
      lines.push('# TYPE phase_operations_count gauge');
      if (last.operations !== undefined) {
        lines.push(`phase_operations_count{${projectLabel},phase="scan"} ${last.operations}`);
      }
      lines.push('');
    }

    // Throughtput metrics
    lines.push('# HELP phase_throughput_ops_per_ms Phase throughput in operations per millisecond');
    lines.push('# TYPE phase_throughput_ops_per_ms gauge');
    this.phases.forEach((metrics, phase) => {
      if (metrics.length > 0) {
        const last = metrics[metrics.length - 1];
        if (last.throughtput !== undefined) {
          lines.push(`phase_throughput_ops_per_ms{${projectLabel},phase="${phase}"} ${last.throughtput}`);
        }
      }
    });

    return lines.join('\n');
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalDuration: number;
    phases: Record<string, { duration: number; operations?: number; throughput?: number }>;
    alerts: Array<{ phase: PerformancePhase; threshold: string; actual: number }>;
  } {
    const phases: Record<string, { duration: number; operations?: number; throughput?: number }> = {};

    this.phases.forEach((metrics, phase) => {
      if (metrics.length > 0) {
        const last = metrics[metrics.length - 1];
        const phaseData: { duration: number; operations?: number; throughput?: number } = {
          duration: last.duration
        };
        if (last.operations !== undefined) {
          phaseData.operations = last.operations;
        }
        if (last.throughtput !== undefined) {
          phaseData.throughput = last.throughtput;
        }
        phases[phase] = phaseData;
      }
    });

    return {
      totalDuration: this.getTotalDuration(),
      phases,
      alerts: this.checkThresholds().map((alert) => ({
        phase: alert.phase,
        threshold: alert.threshold,
        actual: alert.actual
      }))
    };
  }

  /**
   * Reset all metrics and context
   */
  reset(): void {
    this.phases.clear();
    (Object.keys(this.baseline) as PerformancePhase[]).forEach((phase) => {
      this.phases.set(phase, []);
    });
    this.operationStart = 0;
    this.context = {};
  }
}

// Global instance
let metricsInstance: PerformanceMetricsCollector | null = null;

/**
 * Get global metrics collector instance
 */
export function getMetricsCollector(): PerformanceMetricsCollector {
  if (!metricsInstance) {
    metricsInstance = new PerformanceMetricsCollector();
  }
  return metricsInstance;
}

/**
 * Reset global metrics instance (mainly for testing)
 */
export function resetMetricsCollector(): void {
  metricsInstance = null;
}
