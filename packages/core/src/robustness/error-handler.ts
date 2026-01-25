/**
 * Error Handling Standardization
 * Provides consistent error handling with standard exit codes, structured logging, and recovery strategies
 * Phase 3.4: Robustness - Error Handling Standardization
 *
 * Features:
 * - Standard exit codes for different error types (400, 401, 403, 404, 409, 429, 500, 503)
 * - Structured error objects with detailed context
 * - Error categorization (validation, authentication, authorization, resource, conflict, rate-limit, system)
 * - Stack trace preservation for debugging
 * - Error aggregation for batch operations
 * - Safe error message formatting
 * - Recovery and retry strategies
 */

export enum ErrorCode {
  // Client errors
  VALIDATION_ERROR = "E400_VALIDATION_ERROR",
  AUTH_ERROR = "E401_AUTH_ERROR",
  PERMISSION_ERROR = "E403_PERMISSION_ERROR",
  NOT_FOUND = "E404_NOT_FOUND",

  // Server errors
  CONFLICT_ERROR = "E409_CONFLICT_ERROR",
  RATE_LIMIT_ERROR = "E429_RATE_LIMIT_ERROR",
  SERVER_ERROR = "E500_SERVER_ERROR",
  SERVICE_UNAVAILABLE = "E503_SERVICE_UNAVAILABLE",
}

export enum ErrorCategory {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  RESOURCE = "resource",
  CONFLICT = "conflict",
  RATE_LIMIT = "rate_limit",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

export interface ErrorContext {
  /** Unique error identifier */
  id: string;
  /** HTTP-like status code (400, 401, 403, 404, 409, 429, 500, 503) */
  statusCode: number;
  /** Machine-readable error code */
  code: ErrorCode | string;
  /** Human-readable error message */
  message: string;
  /** Error category for classification */
  category: ErrorCategory;
  /** Original error if wrapped */
  cause?: Error;
  /** Additional context data */
  context?: Record<string, unknown>;
  /** Stack trace for debugging */
  stack?: string;
  /** Timestamp of error occurrence */
  timestamp: number;
  /** Whether error is retryable */
  retryable: boolean;
  /** Suggested retry delay in milliseconds */
  retryDelay?: number;
}

export interface ErrorHandlerConfig {
  /** Include stack traces in error output */
  includeStackTrace: boolean;
  /** Maximum number of errors to aggregate */
  maxAggregatedErrors: number;
  /** Default retry delay in milliseconds */
  defaultRetryDelay: number;
  /** Enable detailed logging */
  verbose: boolean;
}

export class AppError extends Error {
  readonly id: string;
  readonly statusCode: number;
  readonly code: ErrorCode | string;
  readonly category: ErrorCategory;
  readonly context: ErrorContext;
  readonly retryable: boolean;
  readonly retryDelay?: number;

  constructor(
    message: string,
    code: ErrorCode | string,
    statusCode: number,
    category: ErrorCategory,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
      retryable?: boolean;
      retryDelay?: number;
    } = {},
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);

    this.id = options.id || generateErrorId();
    this.statusCode = statusCode;
    this.code = code;
    this.category = category;
    this.retryable = options.retryable ?? false;
    this.retryDelay = options.retryDelay;

    this.context = {
      id: this.id,
      statusCode,
      code,
      message,
      category,
      cause: options.cause,
      context: options.context,
      stack: this.stack,
      timestamp: Date.now(),
      retryable: this.retryable,
      retryDelay: this.retryDelay,
    };

    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): ErrorContext {
    return this.context;
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      400,
      ErrorCategory.VALIDATION,
      options,
    );
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(
      message,
      ErrorCode.AUTH_ERROR,
      401,
      ErrorCategory.AUTHENTICATION,
      options,
    );
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(
      message,
      ErrorCode.PERMISSION_ERROR,
      403,
      ErrorCategory.AUTHORIZATION,
      options,
    );
    this.name = "PermissionError";
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, ErrorCode.NOT_FOUND, 404, ErrorCategory.RESOURCE, options);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
      retryable?: boolean;
      retryDelay?: number;
    } = {},
  ) {
    super(message, ErrorCode.CONFLICT_ERROR, 409, ErrorCategory.CONFLICT, {
      ...options,
      retryable: options.retryable ?? true,
      retryDelay: options.retryDelay ?? 1000,
    });
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
      retryDelay?: number;
    } = {},
  ) {
    super(message, ErrorCode.RATE_LIMIT_ERROR, 429, ErrorCategory.RATE_LIMIT, {
      ...options,
      retryable: true,
      retryDelay: options.retryDelay ?? 5000,
    });
    this.name = "RateLimitError";
  }
}

export class ServerError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
      retryable?: boolean;
      retryDelay?: number;
    } = {},
  ) {
    super(message, ErrorCode.SERVER_ERROR, 500, ErrorCategory.SYSTEM, {
      ...options,
      retryable: options.retryable ?? true,
      retryDelay: options.retryDelay ?? 2000,
    });
    this.name = "ServerError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(
    message: string,
    options: {
      id?: string;
      cause?: Error;
      context?: Record<string, unknown>;
      retryDelay?: number;
    } = {},
  ) {
    super(message, ErrorCode.SERVICE_UNAVAILABLE, 503, ErrorCategory.SYSTEM, {
      ...options,
      retryable: true,
      retryDelay: options.retryDelay ?? 3000,
    });
    this.name = "ServiceUnavailableError";
  }
}

export class AggregatedError extends AppError {
  readonly errors: AppError[];

  constructor(
    message: string,
    errors: AppError[] = [],
    options: {
      id?: string;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(message, ErrorCode.SERVER_ERROR, 500, ErrorCategory.SYSTEM, options);
    this.name = "AggregatedError";
    this.errors = errors;
  }

  toJSON(): ErrorContext & { errors: ErrorContext[] } {
    return {
      ...this.context,
      errors: this.errors.map((e) => e.toJSON()),
    };
  }
}

/**
 * Generate unique error identifier
 */
export function generateErrorId(): string {
  return `ERR_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create error from unknown value (handles both Error objects and other types)
 */
export function wrapError(
  error: unknown,
  context?: Record<string, unknown>,
): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new ServerError(error.message, {
      cause: error,
      context,
    });
  }

  const message = typeof error === "string" ? error : JSON.stringify(error);
  return new ServerError(`Unknown error: ${message}`, {
    context,
  });
}

/**
 * Safe try-catch wrapper that returns result or error
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: AppError) => void,
): Promise<{ success: true; data: T } | { success: false; error: AppError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const appError = wrapError(error);
    if (errorHandler) {
      errorHandler(appError);
    }
    return { success: false, error: appError };
  }
}

/**
 * Safe sync try-catch wrapper
 */
export function tryCatchSync<T>(
  fn: () => T,
  errorHandler?: (error: AppError) => void,
): { success: true; data: T } | { success: false; error: AppError } {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    const appError = wrapError(error);
    if (errorHandler) {
      errorHandler(appError);
    }
    return { success: false, error: appError };
  }
}

/**
 * Format error for logging with optional context
 */
export function formatError(
  error: AppError,
  config: Partial<ErrorHandlerConfig> = {},
): string {
  const { includeStackTrace = false, verbose = false } = config;

  const parts: string[] = [
    `[${error.code}]`,
    `${error.category.toUpperCase()}`,
    `-`,
    error.message,
  ];

  if (verbose && error.context?.context) {
    parts.push(`|`, JSON.stringify(error.context.context));
  }

  if (includeStackTrace && error.stack) {
    parts.push(`\nStack:\n${error.stack}`);
  }

  if (error instanceof AggregatedError && error.errors.length > 0) {
    parts.push(`\nErrors (${error.errors.length}):`);
    for (const err of error.errors.slice(0, 5)) {
      parts.push(`  - [${err.code}] ${err.message}`);
    }
    if (error.errors.length > 5) {
      parts.push(`  ... and ${error.errors.length - 5} more`);
    }
  }

  return parts.join(" ");
}

/**
 * Get exit code from error
 */
export function getExitCode(error: AppError): number {
  const statusCodeMap: Record<number, number> = {
    400: 1,
    401: 2,
    403: 3,
    404: 4,
    409: 5,
    429: 6,
    500: 7,
    503: 8,
  };

  return statusCodeMap[error.statusCode] ?? 1;
}

/**
 * Determine if error should be retried
 */
export function shouldRetry(
  error: AppError,
  attempt: number,
  maxAttempts: number,
): boolean {
  if (attempt >= maxAttempts) {
    return false;
  }

  return error.retryable;
}

/**
 * Calculate backoff delay for retry
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
): number {
  const delay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * delay * 0.1;
  return Math.min(delay + jitter, maxDelay);
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = wrapError(error);

      if (
        attempt < maxAttempts - 1 &&
        shouldRetry(lastError, attempt, maxAttempts)
      ) {
        const delay = calculateBackoffDelay(attempt, baseDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new ServerError("Max retries exceeded");
}

/**
 * Aggregate multiple errors into single error
 */
export function aggregateErrors(
  errors: (AppError | Error)[],
  config: Partial<ErrorHandlerConfig> = {},
): AggregatedError {
  const { maxAggregatedErrors = 100 } = config;
  const appErrors = errors
    .slice(0, maxAggregatedErrors)
    .map((e) => wrapError(e));

  const message = `${appErrors.length} error(s) occurred`;
  return new AggregatedError(message, appErrors);
}
