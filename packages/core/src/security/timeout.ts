/**
 * P1.5: Timeout on Parallel Processes
 * Security wrapper to prevent hanging operations and resource exhaustion from infinite loops
 * @category Security
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Options for timeout wrapper
 */
export interface TimeoutOptions {
  /** Timeout in milliseconds */
  timeoutMs: number
  /** Custom error message */
  errorMessage?: string
  /** Whether to reject or cancel (for AbortController support) */
  abortSignal?: AbortSignal
}

/**
 * Default timeout settings by operation type
 */
export const DEFAULT_TIMEOUTS = {
  /** Single file operation (read, write, stat) */
  fileOperation: 5000, // 5 seconds
  /** Image processing (sharp, sharp batches) */
  imageProcessing: 30000, // 30 seconds
  /** Network operation (fetch, http request) */
  networkOperation: 30000, // 30 seconds
  /** Glob pattern scanning */
  globScan: 10000, // 10 seconds
  /** Full PWA initialization */
  initCommand: 120000, // 2 minutes
  /** Parallel batch operation */
  batchOperation: 60000, // 1 minute
}

/**
 * Error for timeout violations
 */
export class TimeoutError extends Error {
  constructor(
    public readonly operation: string,
    public readonly timeoutMs: number,
  ) {
    super(`Operation '${operation}' exceeded timeout of ${timeoutMs}ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * Wrap a promise with a timeout
 * Rejects if the operation takes longer than specified time
 *
 * @param promise The promise to wrap
 * @param options Timeout options
 * @returns Promise that rejects on timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions,
): Promise<T> {
  const { timeoutMs, errorMessage } = options

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new TimeoutError(
            'unknown',
            timeoutMs,
          ),
        )
      }, timeoutMs)

      // Cleanup timeout if promise settles first
      promise
        .then(() => clearTimeout(timeoutId))
        .catch(() => clearTimeout(timeoutId))
    }),
  ]).catch((err) => {
    if (err instanceof TimeoutError && errorMessage) {
      throw new TimeoutError(errorMessage, timeoutMs)
    }
    throw err
  })
}

/**
 * Wrap an async function with timeout
 * Creates a high-level wrapper that automatically applies timeout
 */
export function withTimeoutAsync<Args extends unknown[], T>(
  fn: (...args: Args) => Promise<T>,
  timeoutMs: number,
  operationName: string,
): (...args: Args) => Promise<T> {
  return (...args: Args) => {
    return withTimeout(fn(...args), {
      timeoutMs,
      errorMessage: `${operationName} exceeded ${timeoutMs}ms timeout`,
    })
  }
}

/**
 * Execute operations in parallel with timeout per operation
 * Prevents any single operation from hanging the entire batch
 */
export async function parallelWithTimeout<T>(
  operations: Array<{
    name: string
    fn: () => Promise<T>
  }>,
  timeoutPerOperation: number,
): Promise<Array<{ name: string; result: T; error?: undefined } | { name: string; error: Error; result?: undefined }>> {
  const results = await Promise.allSettled(
    operations.map((op) =>
      withTimeout(op.fn(), {
        timeoutMs: timeoutPerOperation,
        errorMessage: `Operation '${op.name}' exceeded timeout`,
      })
        .then((result) => ({ name: op.name, result }))
        .catch((error) => ({ name: op.name, error })),
    ),
  )

  return results.map((r) => {
    if (r.status === 'fulfilled') {
      return r.value
    }
    return {
      name: 'unknown',
      error: new Error('Promise rejected'),
    }
  })
}

/**
 * Execute operations sequentially with timeout per operation
 * Ensures one operation completes before starting next
 */
export async function sequentialWithTimeout<T>(
  operations: Array<{
    name: string
    fn: () => Promise<T>
  }>,
  timeoutPerOperation: number,
): Promise<Array<{ name: string; result: T; duration: number } | { name: string; error: Error; duration: number }>> {
  type Result = { name: string; result?: T; error?: Error; duration: number }
  const results: Result[] = []

  for (const op of operations) {
    const startTime = Date.now()
    try {
      const result = await withTimeout(op.fn(), {
        timeoutMs: timeoutPerOperation,
        errorMessage: `Operation '${op.name}' exceeded timeout`,
      })
      results.push({
        name: op.name,
        result,
        duration: Date.now() - startTime,
      })
    } catch (error) {
      results.push({
        name: op.name,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
      })
    }
  }

  return results as Array<{ name: string; result: T; duration: number } | { name: string; error: Error; duration: number }>
}

/**
 * Create a timeout-aware batch processor
 * Processes items in batches with timeout per batch
 */
export function createBatchProcessor<T, R>(
  batchSize: number,
  timeoutPerBatch: number,
): (items: T[], processor: (item: T) => Promise<R>) => Promise<Array<R | Error>> {
  return async (items: T[], processor: (item: T) => Promise<R>) => {
    const results: Array<R | Error> = []

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      try {
        const batchResults = await withTimeout(
          Promise.all(batch.map((item) => processor(item))),
          {
            timeoutMs: timeoutPerBatch,
            errorMessage: `Batch processing exceeded timeout (${batch.length} items)`,
          },
        )
        results.push(...batchResults)
      } catch (error) {
        // Add error for the entire batch
        const batchError = error instanceof Error ? error : new Error(String(error))
        batch.forEach(() => results.push(batchError))
      }
    }

    return results
  }
}

/**
 * Create a circuit breaker pattern for operations
 * Stops retrying after repeated failures
 */
export class CircuitBreaker<T> {
  private failureCount = 0
  private readonly maxFailures: number
  private readonly resetTimeoutMs: number
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private lastFailureTime: number = 0

  constructor(maxFailures: number = 3, resetTimeoutMs: number = 60000) {
    this.maxFailures = maxFailures
    this.resetTimeoutMs = resetTimeoutMs
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute(fn: () => Promise<T>, operationName: string = 'unknown'): Promise<T> {
    // Check if circuit is open and can be half-opened
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure < this.resetTimeoutMs) {
        throw new Error(
          `Circuit breaker is open for '${operationName}'. ` +
          `Will retry in ${this.resetTimeoutMs - timeSinceLastFailure}ms`,
        )
      }
      this.state = 'half-open'
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.maxFailures) {
      this.state = 'open'
    }
  }

  /**
   * Get current state for monitoring
   */
  getState(): {
    state: 'closed' | 'open' | 'half-open'
    failureCount: number
    isClosed: boolean
    isOpen: boolean
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      isClosed: this.state === 'closed',
      isOpen: this.state === 'open',
    }
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.failureCount = 0
    this.state = 'closed'
  }
}

/**
 * Create a simple retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 100,
  maxDelayMs: number = 5000,
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delayMs = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError || new Error('Retry exhausted')
}
