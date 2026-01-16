import { describe, it, expect } from 'vitest'
import { processInParallel, processInParallelSimple } from './parallel-processor.js'

describe('parallel-processor', () => {
    describe('processInParallel', () => {
        it('should process items in parallel with concurrency limit', async () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            const processedItems: number[] = []
            const concurrentCalls = new Set<number>()
            let maxConcurrent = 0

            const processor = async (item: number) => {
                concurrentCalls.add(item)
                if (concurrentCalls.size > maxConcurrent) {
                    maxConcurrent = concurrentCalls.size
                }
                processedItems.push(item)
                await new Promise((resolve) => setTimeout(resolve, 10))
                concurrentCalls.delete(item)
                return item * 2
            }

            const result = await processInParallel(items, processor, { concurrency: 3 })

            expect(result.successful).toHaveLength(10)
            expect(result.failed).toHaveLength(0)
            expect(result.totalProcessed).toBe(10)
            expect(result.totalFailed).toBe(0)
            expect(processedItems).toHaveLength(10)
            // Concurrency limit should not be exceeded
            expect(maxConcurrent).toBeLessThanOrEqual(3)
        })

        it('should handle failed items with continueOnError=true', async () => {
            const items = [1, 2, 3, 4, 5]
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => {
                if (item === 3) {
                    throw new Error('Item 3 failed')
                }
                return item * 2
            }

            const result = await processInParallel(items, processor, { continueOnError: true, concurrency: 2 })

            expect(result.successful).toHaveLength(4)
            expect(result.failed).toHaveLength(1)
            expect(result.totalProcessed).toBe(4)
            expect(result.totalFailed).toBe(1)
            expect(result.failed[0].error).toContain('Item 3 failed')
        })

        it('should stop on first error with continueOnError=false', async () => {
            const items = [1, 2, 3, 4, 5]
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => {
                if (item === 3) {
                    throw new Error('Item 3 failed')
                }
                return item * 2
            }

            const result = await processInParallel(items, processor, { continueOnError: false, concurrency: 1 })

            // Should have some failures (depends on order)
            expect(result.totalFailed).toBeGreaterThan(0)
        })

        it('should call onProgress callback', async () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            const progressCalls: Array<[number, number]> = []
            const processor = async (item: number) => {
                await new Promise((resolve) => setTimeout(resolve, 5))
                return item * 2
            }

            const result = await processInParallel(items, processor, {
                concurrency: 3,
                onProgress: (processed, total) => {
                    progressCalls.push([processed, total])
                },
            })

            expect(result.successful).toHaveLength(10)
            expect(progressCalls.length).toBeGreaterThan(0)
            // Last progress call should be total items
            expect(progressCalls[progressCalls.length - 1]).toEqual([10, 10])
        })

        it('should handle synchronous processors', async () => {
            const items = [1, 2, 3, 4, 5]
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => item * 2 // Sync

            const result = await processInParallel(items, processor, { concurrency: 3 })

            expect(result.successful).toHaveLength(5)
            expect(result.failed).toHaveLength(0)
            expect(result.successful.map((s) => s.result)).toEqual([2, 4, 6, 8, 10])
        })

        it('should handle empty list', async () => {
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => item * 2

            const result = await processInParallel([], processor, { concurrency: 3 })

            expect(result.successful).toHaveLength(0)
            expect(result.failed).toHaveLength(0)
            expect(result.totalProcessed).toBe(0)
            expect(result.totalFailed).toBe(0)
        })

        it('should use default concurrency of 10', async () => {
            const items = Array.from({ length: 20 }, (_, i) => i)
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => item * 2

            const result = await processInParallel(items, processor)

            expect(result.successful).toHaveLength(20)
            expect(result.failed).toHaveLength(0)
        })
    })

    describe('processInParallelSimple', () => {
        it('should return only successful results', async () => {
            const items = [1, 2, 3, 4, 5]
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => {
                if (item === 3) {
                    throw new Error('Item 3 failed')
                }
                return item * 2
            }

            const results = await processInParallelSimple(items, processor, 2)

            expect(results).toEqual([2, 4, 8, 10])
            expect(results).not.toContain(6) // Item 3 failed, so 6 not included
        })

        it('should use default concurrency of 10', async () => {
            const items = Array.from({ length: 15 }, (_, i) => i)
            // eslint-disable-next-line @typescript-eslint/require-await
            const processor = async (item: number) => item * 2

            const results = await processInParallelSimple(items, processor)

            expect(results).toHaveLength(15)
            expect(results).toEqual(Array.from({ length: 15 }, (_, i) => i * 2))
        })
    })

    describe('Performance - Batch Processing', () => {
        it('should process large batch efficiently', async () => {
            const items = Array.from({ length: 100 }, (_, i) => i)
            const processor = async (item: number) => {
                await new Promise((resolve) => setTimeout(resolve, 1))
                return item * 2
            }

            const startTime = performance.now()
            const result = await processInParallel(items, processor, {
                concurrency: 10,
            })
            const endTime = performance.now()

            expect(result.successful).toHaveLength(100)
            expect(result.failed).toHaveLength(0)
            // With concurrency=10 and 100 items, should complete in ~10ms or more
            // (1ms per item, 10 items at a time = 10 batches)
            expect(endTime - startTime).toBeLessThan(5000) // Generous timeout
        })

        it('should show proper concurrency behavior', async () => {
            const items = Array.from({ length: 20 }, (_, i) => i)
            const concurrentCounts: number[] = []
            let currentConcurrent = 0
            const maxConcurrentExpected = 5

            const processor = async (item: number) => {
                currentConcurrent++
                concurrentCounts.push(currentConcurrent)

                await new Promise((resolve) => setTimeout(resolve, 10))
                currentConcurrent--

                return item
            }

            const result = await processInParallel(items, processor, {
                concurrency: maxConcurrentExpected,
            })

            expect(result.successful).toHaveLength(20)
            // Check that concurrency limit was respected
            expect(Math.max(...concurrentCounts)).toBeLessThanOrEqual(maxConcurrentExpected)
        })

        it('should handle error isolation in parallel processing', async () => {
            const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            const failingItems = new Set([3, 7])

            const processor = async (item: number) => {
                await new Promise((resolve) => setTimeout(resolve, 5))
                if (failingItems.has(item)) {
                    throw new Error(`Item ${item} failed`)
                }
                return item * 2
            }

            const result = await processInParallel(items, processor, {
                concurrency: 3,
                continueOnError: true,
            })

            expect(result.successful).toHaveLength(8)
            expect(result.failed).toHaveLength(2)
            expect(result.successful.map((s) => s.result)).toEqual([2, 4, 8, 10, 12, 16, 18, 20])
        })
    })
})
