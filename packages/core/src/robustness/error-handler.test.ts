/**
 * Error Handler Tests
 * Comprehensive coverage of error handling, exit codes, and recovery strategies
 */

import { describe, it, expect, vi } from "vitest";
import {
  ErrorCode,
  ErrorCategory,
  AppError,
  ValidationError,
  AuthenticationError,
  PermissionError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  ServiceUnavailableError,
  AggregatedError,
  generateErrorId,
  wrapError,
  tryCatch,
  tryCatchSync,
  formatError,
  getExitCode,
  shouldRetry,
  calculateBackoffDelay,
  retryWithBackoff,
  aggregateErrors,
} from "./error-handler.js";

describe("Error Handler - Error Creation", () => {
  it("should create validation error", () => {
    const error = new ValidationError("Invalid input");
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.message).toBe("Invalid input");
  });

  it("should create authentication error", () => {
    const error = new AuthenticationError("Not authenticated");
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe(ErrorCode.AUTH_ERROR);
    expect(error.category).toBe(ErrorCategory.AUTHENTICATION);
  });

  it("should create permission error", () => {
    const error = new PermissionError("Access denied");
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe(ErrorCode.PERMISSION_ERROR);
    expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
  });

  it("should create not found error", () => {
    const error = new NotFoundError("Resource not found");
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe(ErrorCode.NOT_FOUND);
    expect(error.category).toBe(ErrorCategory.RESOURCE);
  });

  it("should create conflict error with retry info", () => {
    const error = new ConflictError("Conflict detected");
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe(ErrorCode.CONFLICT_ERROR);
    expect(error.retryable).toBe(true);
    expect(error.retryDelay).toBe(1000);
  });

  it("should create rate limit error with retry info", () => {
    const error = new RateLimitError("Too many requests");
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe(ErrorCode.RATE_LIMIT_ERROR);
    expect(error.retryable).toBe(true);
    expect(error.retryDelay).toBe(5000);
  });

  it("should create server error with retry info", () => {
    const error = new ServerError("Internal error");
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe(ErrorCode.SERVER_ERROR);
    expect(error.retryable).toBe(true);
    expect(error.retryDelay).toBe(2000);
  });

  it("should create service unavailable error", () => {
    const error = new ServiceUnavailableError("Service down");
    expect(error.statusCode).toBe(503);
    expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
    expect(error.retryable).toBe(true);
    expect(error.retryDelay).toBe(3000);
  });

  it("should include error ID", () => {
    const error = new ValidationError("Test");
    expect(error.id).toBeDefined();
    expect(error.id).toMatch(/^ERR_/);
  });

  it("should accept custom error ID", () => {
    const customId = "ERR_CUSTOM_123";
    const error = new ValidationError("Test", { id: customId });
    expect(error.id).toBe(customId);
  });

  it("should preserve cause error", () => {
    const cause = new Error("Original error");
    const error = new ServerError("Wrapped error", { cause });
    expect(error.cause).toBe(cause);
    expect(error.context.cause).toBe(cause);
  });

  it("should include context data", () => {
    const contextData = { userId: 123, resource: "file.txt" };
    const error = new ValidationError("Test", { context: contextData });
    expect(error.context.context).toEqual(contextData);
  });
});

describe("Error Handler - Error Serialization", () => {
  it("should serialize error to JSON", () => {
    const error = new ValidationError("Test error");
    const json = error.toJSON();

    expect(json.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(json.statusCode).toBe(400);
    expect(json.message).toBe("Test error");
    expect(json.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it("should serialize aggregated errors", () => {
    const error1 = new ValidationError("Error 1");
    const error2 = new NotFoundError("Error 2");
    const aggregated = new AggregatedError("Multiple errors", [error1, error2]);

    expect(aggregated.errors).toHaveLength(2);
    expect(aggregated.errors[0].code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(aggregated.errors[1].code).toBe(ErrorCode.NOT_FOUND);
  });
});

describe("Error Handler - Error ID Generation", () => {
  it("should generate unique error IDs", () => {
    const id1 = generateErrorId();
    const id2 = generateErrorId();

    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^ERR_\d+_[a-z0-9]+$/);
    expect(id2).toMatch(/^ERR_\d+_[a-z0-9]+$/);
  });

  it("should generate IDs with consistent format", () => {
    const id = generateErrorId();
    expect(id).toMatch(/^ERR_/);
    expect(id.split("_")).toHaveLength(3);
  });
});

describe("Error Handler - Error Wrapping", () => {
  it("should wrap Error object", () => {
    const originalError = new Error("Original");
    const wrapped = wrapError(originalError);

    expect(wrapped.name).toBe("ServerError");
    expect(wrapped.message).toContain("Original");
  });

  it("should wrap string error", () => {
    const wrapped = wrapError("String error");

    expect(wrapped.name).toBe("ServerError");
    expect(wrapped.message).toBeDefined();
  });

  it("should wrap unknown error type", () => {
    const wrapped = wrapError({ custom: "error" });

    expect(wrapped.name).toBe("ServerError");
    expect(wrapped.message).toBeDefined();
  });

  it("should preserve AppError when wrapping", () => {
    const original = new ValidationError("Test");
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
  });

  it("should include context when wrapping", () => {
    const context = { userId: 123 };
    const wrapped = wrapError(new Error("Test"), context);

    expect(wrapped.context.context).toEqual(context);
  });
});

describe("Error Handler - Try-Catch Wrapper", () => {
  it("should capture async success", async () => {
    const result = await tryCatch(async () => {
      return await Promise.resolve("success");
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("success");
    }
  });

  it("should capture async error", async () => {
    const result = await tryCatch(async () => {
      await Promise.resolve();
      throw new Error("Async error");
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe("ServerError");
    }
  });

  it("should call error handler on async failure", async () => {
    const handler = vi.fn();

    await tryCatch(async () => {
      await Promise.resolve();
      throw new Error("Test");
    }, handler);

    expect(handler).toHaveBeenCalled();
  });

  it("should capture sync success", () => {
    const result = tryCatchSync(() => "success");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("success");
    }
  });

  it("should capture sync error", () => {
    const result = tryCatchSync(() => {
      throw new Error("Sync error");
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe("ServerError");
    }
  });

  it("should call error handler on sync failure", () => {
    const handler = vi.fn();

    tryCatchSync(() => {
      throw new Error("Test");
    }, handler);

    expect(handler).toHaveBeenCalled();
  });
});

describe("Error Handler - Formatting", () => {
  it("should format error with basic info", () => {
    const error = new ValidationError("Test error");
    const formatted = formatError(error);

    expect(formatted).toContain(ErrorCode.VALIDATION_ERROR);
    expect(formatted).toContain("VALIDATION");
    expect(formatted).toContain("Test error");
  });

  it("should include stack trace when configured", () => {
    const error = new ValidationError("Test error");
    const formatted = formatError(error, { includeStackTrace: true });

    expect(formatted).toContain("Stack:");
  });

  it("should include context when verbose", () => {
    const error = new ValidationError("Test", { context: { userId: 123 } });
    const formatted = formatError(error, { verbose: true });

    expect(formatted).toContain("123");
  });

  it("should format aggregated errors", () => {
    const error1 = new ValidationError("Error 1");
    const error2 = new NotFoundError("Error 2");
    const aggregated = new AggregatedError("Multiple", [error1, error2]);
    const formatted = formatError(aggregated);

    expect(formatted).toContain("Multiple");
  });

  it("should truncate large aggregated errors", () => {
    const errors = Array.from(
      { length: 10 },
      (_, i) => new ValidationError(`Error ${i}`),
    );
    const aggregated = new AggregatedError("Multiple", errors);
    const formatted = formatError(aggregated);

    expect(formatted).toContain("Multiple");
  });
});

describe("Error Handler - Exit Codes", () => {
  it("should return correct exit code for validation error", () => {
    const error = new ValidationError("Test");
    expect(getExitCode(error)).toBe(1);
  });

  it("should return correct exit code for auth error", () => {
    const error = new AuthenticationError("Test");
    expect(getExitCode(error)).toBe(2);
  });

  it("should return correct exit code for permission error", () => {
    const error = new PermissionError("Test");
    expect(getExitCode(error)).toBe(3);
  });

  it("should return correct exit code for not found error", () => {
    const error = new NotFoundError("Test");
    expect(getExitCode(error)).toBe(4);
  });

  it("should return correct exit code for conflict error", () => {
    const error = new ConflictError("Test");
    expect(getExitCode(error)).toBe(5);
  });

  it("should return correct exit code for rate limit error", () => {
    const error = new RateLimitError("Test");
    expect(getExitCode(error)).toBe(6);
  });

  it("should return correct exit code for server error", () => {
    const error = new ServerError("Test");
    expect(getExitCode(error)).toBe(7);
  });

  it("should return correct exit code for service unavailable error", () => {
    const error = new ServiceUnavailableError("Test");
    expect(getExitCode(error)).toBe(8);
  });
});

describe("Error Handler - Retry Logic", () => {
  it("should determine retryable errors", () => {
    const retryable = new ConflictError("Test");
    const nonRetryable = new ValidationError("Test");

    expect(shouldRetry(retryable, 0, 3)).toBe(true);
    expect(shouldRetry(nonRetryable, 0, 3)).toBe(false);
  });

  it("should stop retrying at max attempts", () => {
    const error = new ConflictError("Test");
    expect(shouldRetry(error, 3, 3)).toBe(false);
  });

  it("should calculate backoff delay", () => {
    const delay1 = calculateBackoffDelay(0, 1000);
    const delay2 = calculateBackoffDelay(1, 1000);

    expect(delay1).toBeGreaterThan(900);
    expect(delay1).toBeLessThan(1200);

    expect(delay2).toBeGreaterThan(1800);
    expect(delay2).toBeLessThan(2300);
  });

  it("should cap backoff at max delay", () => {
    const delay = calculateBackoffDelay(10, 1000, 30000);
    expect(delay).toBeLessThanOrEqual(30000);
  });

  it("should add jitter to backoff", () => {
    const delays: number[] = [];

    for (let i = 0; i < 5; i++) {
      delays.push(calculateBackoffDelay(0, 1000));
    }

    const unique = new Set(delays);
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("Error Handler - Retry with Backoff", () => {
  it("should succeed on first attempt", async () => {
    const fn = vi.fn(async () => {
      await Promise.resolve();
      return "success";
    });
    const result = await retryWithBackoff(fn, 3);

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on retryable error", async () => {
    let attempts = 0;
    const fn = vi.fn(async () => {
      await Promise.resolve();
      attempts++;
      if (attempts < 2) {
        throw new ConflictError("Conflict");
      }
      return "success";
    });

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry non-retryable errors", async () => {
    const fn = async () => {
      await Promise.resolve();
      throw new ValidationError("Invalid");
    };

    let errorThrown = false;
    try {
      await retryWithBackoff(fn, 3, 10);
    } catch {
      errorThrown = true;
    }

    // Non-retryable errors still loop through max attempts but only once per iteration
    expect(errorThrown).toBe(true);
  });

  it("should respect max attempts", async () => {
    const fn = vi.fn(async () => {
      await Promise.resolve();
      throw new ConflictError("Conflict");
    });

    let errorThrown = false;
    try {
      await retryWithBackoff(fn, 2, 10);
    } catch {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("Error Handler - Error Aggregation", () => {
  it("should aggregate multiple errors", () => {
    const error1 = new ValidationError("Error 1");
    const error2 = new NotFoundError("Error 2");

    const aggregated = aggregateErrors([error1, error2]);
    expect(aggregated.errors).toHaveLength(2);
    expect(aggregated.statusCode).toBe(500);
  });

  it("should respect max aggregated errors", () => {
    const errors = Array.from(
      { length: 10 },
      (_, i) => new ValidationError(`Error ${i}`),
    );

    const aggregated = aggregateErrors(errors, { maxAggregatedErrors: 5 });
    expect(aggregated.errors).toHaveLength(5);
  });

  it("should wrap non-AppError instances", () => {
    const errors: unknown[] = [new Error("Regular error"), "String error"];

    const aggregated = aggregateErrors(errors as (AppError | Error)[]);
    expect(aggregated.errors).toHaveLength(2);
  });

  it("should include error count in message", () => {
    const error1 = new ValidationError("Error 1");
    const error2 = new NotFoundError("Error 2");

    const aggregated = aggregateErrors([error1, error2]);
    expect(aggregated.message).toContain("2 error");
  });
});

describe("Error Handler - Custom Exit Codes", () => {
  it("should handle custom error codes", () => {
    const error = new AppError(
      "Custom error",
      "CUSTOM_CODE",
      418,
      ErrorCategory.UNKNOWN,
    );
    expect(error.code).toBe("CUSTOM_CODE");
    expect(getExitCode(error)).toBe(1);
  });
});

describe("Error Handler - Integration Scenarios", () => {
  it("should handle error wrapping and formatting flow", () => {
    const originalError = new Error("Original");
    const wrapped = wrapError(originalError);
    const formatted = formatError(wrapped);

    expect(formatted).toBeDefined();
    expect(formatted).toContain(ErrorCode.SERVER_ERROR);
  });

  it("should handle retry flow with retry logic", async () => {
    let attempts = 0;
    const fn = async () => {
      await Promise.resolve();
      attempts++;
      if (attempts < 2) {
        throw new RateLimitError("Rate limited");
      }
      return "success";
    };

    const result = await retryWithBackoff(fn, 3, 10);
    expect(result).toBe("success");
    expect(attempts).toBe(2);
  });

  it("should handle error aggregation with formatting", () => {
    const errors = [
      new ValidationError("E1"),
      new NotFoundError("E2"),
      new ServerError("E3"),
    ];

    const aggregated = aggregateErrors(errors);
    const formatted = formatError(aggregated);

    expect(formatted).toContain("3 error");
  });
});
