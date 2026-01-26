/**
 * Structured Logger with Context Support
 *
 * Provides centralized logging with:
 * - Project context (project_id, operation_id)
 * - Operation timing breakdown
 * - JSON-serializable output for production
 * - Performance instrumentation
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  projectId?: string;
  operationId?: string;
  framework?: string;
  module?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: LogContext;
  duration?: number;
  data?: unknown;
}

interface TimingEntry {
  phase: string;
  duration: number;
  startTime: number;
  endTime: number;
}

/**
 * Structured Logger instance
 * Maintains context across operations
 */
export class StructuredLogger {
  private context: LogContext = {};
  private timings: TimingEntry[] = [];
  private operationStartTime: number = 0;

  /**
   * Set or update logger context
   */
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Clear context for new operation
   */
  clearContext(): void {
    this.context = {};
    this.timings = [];
    this.operationStartTime = 0;
  }

  /**
   * Start timing a phase
   */
  startTiming(phase: string): () => void {
    const startTime = performance.now();
    // Only set operationStartTime if this is the first timing
    if (this.operationStartTime === 0) {
      this.operationStartTime = startTime;
    }

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.timings.push({
        phase,
        duration,
        startTime,
        endTime,
      });

      this.debug(`Phase complete: ${phase}`, { duration: `${duration.toFixed(2)}ms` });
    };
  }

  /**
   * Get timing breakdown for current operation
   */
  getTimingBreakdown(): {
    phases: TimingEntry[];
    totalDuration: number;
    breakdown: Record<string, number>;
  } {
    const totalDuration = this.operationStartTime
      ? performance.now() - this.operationStartTime
      : 0;

    const breakdown: Record<string, number> = {};
    for (const timing of this.timings) {
      breakdown[timing.phase] = timing.duration;
    }

    return {
      phases: this.timings,
      totalDuration,
      breakdown,
    };
  }

  /**
   * Log at trace level
   */
  trace(message: string, data?: unknown): void {
    this.log('trace', message, data);
  }

  /**
   * Log at debug level
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Log at info level
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Log at warn level
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Log at error level
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * Log at fatal level
   */
  fatal(message: string, data?: unknown): void {
    this.log('fatal', message, data);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context: this.context,
      data,
    };

    // Add timing breakdown for info/warn/error on operation completion
    if ((level === 'info' || level === 'warn' || level === 'error') && this.timings.length > 0) {
      const breakdown = this.getTimingBreakdown();
      entry.duration = breakdown.totalDuration;
    }

    // Output as JSON for production environments
    if (process.env.NODE_ENV === 'production' || process.env.LOG_FORMAT === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      // Pretty print for development
      this.prettyPrint(entry);
    }
  }

  /**
   * Pretty print log entry for development
   */
  private prettyPrint(entry: LogEntry): void {
    const levelColors: Record<LogLevel, string> = {
      trace: '\x1b[36m', // cyan
      debug: '\x1b[34m', // blue
      info: '\x1b[32m', // green
      warn: '\x1b[33m', // yellow
      error: '\x1b[31m', // red
      fatal: '\x1b[35m', // magenta
    };

    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    let output = `${color}[${entry.timestamp}] [${entry.level.toUpperCase()}]${reset} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(' ');
      output += ` {${contextStr}}`;
    }

    if (entry.duration !== undefined) {
      output += ` (${entry.duration.toFixed(2)}ms)`;
    }

    if (entry.data !== undefined) {
      output += ` ${JSON.stringify(entry.data)}`;
    }

    console.log(output);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheus(): string {
    const metrics: string[] = [];
    const breakdown = this.getTimingBreakdown();

    metrics.push('# HELP operation_total_duration_ms Total operation duration in milliseconds');
    metrics.push('# TYPE operation_total_duration_ms gauge');
    metrics.push(`operation_total_duration_ms{project_id="${this.context.projectId || 'unknown'}"} ${breakdown.totalDuration}`);

    metrics.push('# HELP phase_duration_ms Phase duration in milliseconds');
    metrics.push('# TYPE phase_duration_ms gauge');

    for (const [phase, duration] of Object.entries(breakdown.breakdown)) {
      metrics.push(
        `phase_duration_ms{phase="${phase}",project_id="${this.context.projectId || 'unknown'}"} ${duration}`,
      );
    }

    return metrics.join('\n');
  }

  /**
   * Export metrics as JSON
   */
  exportJSON(): {
    operation: { duration: number };
    phases: TimingEntry[];
    context: LogContext;
  } {
    const breakdown = this.getTimingBreakdown();
    return {
      operation: { duration: breakdown.totalDuration },
      phases: breakdown.phases,
      context: this.context,
    };
  }
}

/**
 * Global logger instance
 */
let globalLogger: StructuredLogger | null = null;

/**
 * Get or create the global logger
 */
export function getLogger(): StructuredLogger {
  if (!globalLogger) {
    globalLogger = new StructuredLogger();
  }
  return globalLogger;
}

/**
 * Reset global logger (for testing)
 */
export function resetLogger(): void {
  globalLogger = null;
}
