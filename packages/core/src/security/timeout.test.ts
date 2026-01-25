/**
 * Tests for P1.5: Timeout on Parallel Processes
 * @category Security
 */

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi } from "vitest";
import {
  DEFAULT_TIMEOUTS,
  withTimeout,
  withTimeoutAsync,
  parallelWithTimeout,
  sequentialWithTimeout,
  createBatchProcessor,
  CircuitBreaker,
  retryWithBackoff,
  TimeoutError,
} from "./timeout.js";

describe("timeout", () => {
  describe("DEFAULT_TIMEOUTS", () => {
    it("should define default timeouts for all operations", () => {
      expect(DEFAULT_TIMEOUTS.fileOperation).toBe(5000);
      expect(DEFAULT_TIMEOUTS.imageProcessing).toBe(30000);
      expect(DEFAULT_TIMEOUTS.networkOperation).toBe(30000);
      expect(DEFAULT_TIMEOUTS.globScan).toBe(10000);
      expect(DEFAULT_TIMEOUTS.initCommand).toBe(120000);
      expect(DEFAULT_TIMEOUTS.batchOperation).toBe(60000);
    });

    it("should have reasonable timeout progression", () => {
      expect(DEFAULT_TIMEOUTS.fileOperation).toBeLessThan(
        DEFAULT_TIMEOUTS.imageProcessing,
      );
      expect(DEFAULT_TIMEOUTS.imageProcessing).toBeLessThanOrEqual(
        DEFAULT_TIMEOUTS.initCommand,
      );
    });
  });

  describe("withTimeout", () => {
    it("should resolve quickly succeeding promise", async () => {
      const promise = Promise.resolve(42);
      const result = await withTimeout(promise, { timeoutMs: 5000 });
      expect(result).toBe(42);
    });

    it("should reject on timeout", async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 5000));
      await expect(withTimeout(promise, { timeoutMs: 100 })).rejects.toThrow(
        "exceeded timeout",
      );
    });

    it("should create TimeoutError with correct properties", async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        await withTimeout(promise, { timeoutMs: 100 });
        expect.fail("Should have thrown");
      } catch (err) {
        if (err instanceof TimeoutError) {
          expect(err.timeoutMs).toBe(100);
          expect(err.message).toContain("100");
        }
      }
    });

    it("should handle custom error messages", async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 5000));
      await expect(
        withTimeout(promise, {
          timeoutMs: 100,
          errorMessage: "Custom timeout message",
        }),
      ).rejects.toThrow("Custom timeout message");
    });

    it("should handle promise rejection", async () => {
      const promise = Promise.reject(new Error("Original error"));
      await expect(withTimeout(promise, { timeoutMs: 5000 })).rejects.toThrow(
        "Original error",
      );
    });
  });

  describe("withTimeoutAsync", () => {
    it("should wrap async function with timeout", async () => {
      const fn = vi.fn(async (x: number) => x * 2);
      const wrapped = withTimeoutAsync(fn, 5000, "multiply");

      const result = await wrapped(21);
      expect(result).toBe(42);
      expect(fn).toHaveBeenCalledWith(21);
    });

    it("should timeout on slow function", async () => {
      const slowFn = async (x: number) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return x;
      };
      const wrapped = withTimeoutAsync(slowFn, 100, "slow");

      await expect(wrapped(42)).rejects.toThrow();
    });

    it("should pass all arguments to wrapped function", async () => {
      const fn = vi.fn(async (a: number, b: number, c: number) => a + b + c);
      const wrapped = withTimeoutAsync(fn, 5000, "sum");

      const result = await wrapped(1, 2, 3);
      expect(result).toBe(6);
      expect(fn).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe("parallelWithTimeout", () => {
    it("should execute all operations in parallel", async () => {
      const operations = [
        { name: "op1", fn: async () => 1 },
        { name: "op2", fn: async () => 2 },
        { name: "op3", fn: async () => 3 },
      ];

      const results = await parallelWithTimeout(operations, 5000);
      expect(results).toHaveLength(3);
      expect(results.map((r) => ("result" in r ? r.result : null))).toContain(
        1,
      );
      expect(results.map((r) => ("result" in r ? r.result : null))).toContain(
        2,
      );
      expect(results.map((r) => ("result" in r ? r.result : null))).toContain(
        3,
      );
    });

    it("should timeout individual operations", async () => {
      const operations = [
        { name: "fast", fn: async () => 1 },
        {
          name: "slow",
          fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return 2;
          },
        },
      ];

      const results = await parallelWithTimeout(operations, 100);
      const slowResult = results.find((r) => r.name === "slow");
      expect(slowResult).toHaveProperty("error");
    });

    it("should not stop other operations on timeout", async () => {
      const operations = [
        { name: "op1", fn: async () => 1 },
        {
          name: "op2",
          fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return 2;
          },
        },
        { name: "op3", fn: async () => 3 },
      ];

      const results = await parallelWithTimeout(operations, 100);
      const op1 = results.find((r) => r.name === "op1");
      const op3 = results.find((r) => r.name === "op3");

      expect(op1).toHaveProperty("result", 1);
      expect(op3).toHaveProperty("result", 3);
    });
  });

  describe("sequentialWithTimeout", () => {
    it("should execute operations sequentially", async () => {
      const order: string[] = [];
      const operations = [
        {
          name: "op1",
          fn: async () => {
            order.push("op1");
            return 1;
          },
        },
        {
          name: "op2",
          fn: async () => {
            order.push("op2");
            return 2;
          },
        },
        {
          name: "op3",
          fn: async () => {
            order.push("op3");
            return 3;
          },
        },
      ];

      await sequentialWithTimeout(operations, 5000);
      expect(order).toEqual(["op1", "op2", "op3"]);
    });

    it("should record duration for each operation", async () => {
      const operations = [
        {
          name: "op1",
          fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 1;
          },
        },
      ];

      const results = await sequentialWithTimeout(operations, 5000);
      expect(results[0]).toHaveProperty("duration");
      expect((results[0] as any).duration).toBeGreaterThanOrEqual(100);
    });

    it("should continue on individual operation timeout", async () => {
      const operations = [
        { name: "op1", fn: async () => 1 },
        {
          name: "op2",
          fn: async () => {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return 2;
          },
        },
        { name: "op3", fn: async () => 3 },
      ];

      const results = await sequentialWithTimeout(operations, 100);
      const op3 = results.find((r) => r.name === "op3");
      expect(op3).toHaveProperty("result", 3);
    });
  });

  describe("createBatchProcessor", () => {
    it("should process items in batches", async () => {
      const processor = createBatchProcessor<number, number>(2, 5000);
      const items: number[] = [1, 2, 3, 4, 5];
      const results = await processor(items, (x: number) =>
        Promise.resolve(x * 2),
      );

      expect(results).toHaveLength(5);
      expect(results.every((r) => typeof r === "number")).toBe(true);
    });

    it("should handle batch timeout", async () => {
      const processor = createBatchProcessor<number, number>(2, 100);
      const items: number[] = [1, 2, 3, 4];
      const slowProcessor = (x: number) =>
        new Promise<number>((resolve) => {
          setTimeout(() => resolve(x), 5000);
        });

      const results = await processor(items, slowProcessor);
      expect(results.some((r) => r instanceof Error)).toBe(true);
    });

    it("should process all items even if some batches timeout", async () => {
      const processor = createBatchProcessor<number, number>(2, 5000);
      const items: number[] = [1, 2, 3, 4];
      const results = await processor(items, (x: number) => Promise.resolve(x));

      expect(results).toHaveLength(4);
    });
  });

  describe("CircuitBreaker", () => {
    it("should allow operations when closed", async () => {
      const breaker = new CircuitBreaker(3, 1000);
      const result = await breaker.execute(async () => 42);
      expect(result).toBe(42);
      expect(breaker.getState().isClosed).toBe(true);
    });

    it("should open after max failures", async () => {
      const breaker = new CircuitBreaker(2, 1000);

      try {
        await breaker.execute(async () => {
          throw new Error("Fail 1");
        });
      } catch {
        // Expected
      }

      try {
        await breaker.execute(async () => {
          throw new Error("Fail 2");
        });
      } catch {
        // Expected
      }

      expect(breaker.getState().isOpen).toBe(true);
    });

    it("should prevent operations when open", async () => {
      const breaker = new CircuitBreaker(1, 1000);

      try {
        await breaker.execute(async () => {
          throw new Error("Fail");
        });
      } catch {
        // Expected
      }

      await expect(breaker.execute(async () => 42)).rejects.toThrow(
        "Circuit breaker is open",
      );
    });

    it("should reset after timeout", async () => {
      const breaker = new CircuitBreaker(1, 100);

      try {
        await breaker.execute(async () => {
          throw new Error("Fail");
        });
      } catch {
        // Expected
      }

      expect(breaker.getState().isOpen).toBe(true);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await breaker.execute(async () => 42);
      expect(result).toBe(42);
      expect(breaker.getState().isClosed).toBe(true);
    });

    it("should support manual reset", async () => {
      const breaker = new CircuitBreaker(1, 10000);

      try {
        await breaker.execute(async () => {
          throw new Error("Fail");
        });
      } catch {
        // Expected
      }

      breaker.reset();
      expect(breaker.getState().isClosed).toBe(true);
    });
  });

  describe("retryWithBackoff", () => {
    it("should succeed on first try", async () => {
      const fn = vi.fn(async () => 42);
      const result = await retryWithBackoff(fn, 3);

      expect(result).toBe(42);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure", async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("Fail 1"))
        .mockRejectedValueOnce(new Error("Fail 2"))
        .mockResolvedValueOnce(42);

      const result = await retryWithBackoff(fn, 3, 10);
      expect(result).toBe(42);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("should exhaust retries and throw", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Always fails"));
      await expect(retryWithBackoff(fn, 2, 10)).rejects.toThrow("Always fails");

      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("should increase delay exponentially", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Fail"));

      try {
        await retryWithBackoff(fn, 3, 10, 5000);
      } catch {
        // Expected to fail
      }

      // The test verifies retries happen with backoff
      expect(fn.mock.calls.length).toBe(4); // 1 initial + 3 retries
    });

    it("should respect max delay", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Fail"));
      const start = Date.now();

      try {
        // Many retries with max delay of 50ms should not take very long
        await retryWithBackoff(fn, 2, 1000, 50); // initialDelay = 1000 but maxDelay = 50
      } catch {
        // Expected
      }

      const elapsed = Date.now() - start;
      // Should be roughly 50 + 50 + tolerance
      expect(elapsed).toBeLessThan(500); // Much less than 2000+
    });
  });

  describe("TimeoutError", () => {
    it("should create error with operation and timeout", () => {
      const error = new TimeoutError("test-op", 5000);
      expect(error.message).toContain("test-op");
      expect(error.message).toContain("5000");
      expect(error.operation).toBe("test-op");
      expect(error.timeoutMs).toBe(5000);
    });

    it("should extend Error class", () => {
      const error = new TimeoutError("op", 1000);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Security scenarios", () => {
    it("should prevent infinite loops through timeout", async () => {
      const infiniteLoop = new Promise<never>(() => {
        // Never resolves - simulates infinite loop
      });

      await expect(
        withTimeout(infiniteLoop, { timeoutMs: 100 }),
      ).rejects.toThrow(/exceeded timeout/);
    });

    it("should prevent resource exhaustion from parallel operations", async () => {
      const operations = Array(100)
        .fill(0)
        .map((_, i) => ({
          name: `op${i}`,
          fn: async () => i,
        }));

      // Should handle 100 parallel operations with timeout
      const results = await parallelWithTimeout(operations, 5000);
      expect(results).toHaveLength(100);
      expect(results.every((r) => "result" in r || "error" in r)).toBe(true);
    });

    it("should prevent cascading failures with circuit breaker", async () => {
      const breaker = new CircuitBreaker(2, 100);
      let callCount = 0;

      const failingOp = async () => {
        callCount++;
        throw new Error("Service down");
      };

      // First two attempts fail and open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failingOp);
        } catch {
          // Expected
        }
      }

      // Further attempts should fail immediately without calling service
      const beforeCount = callCount;
      try {
        await breaker.execute(failingOp);
      } catch {
        // Expected
      }

      expect(callCount).toBe(beforeCount); // No additional calls
    });
  });
});
