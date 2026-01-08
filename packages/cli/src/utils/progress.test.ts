import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ProgressBar, createPWAProgressBar, type ProgressStats } from './progress.js'

describe('ProgressBar', () => {
    let stdoutWriteSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
        vi.useFakeTimers()
    })

    afterEach(() => {
        stdoutWriteSpy.mockRestore()
        vi.useRealTimers()
    })

    describe('Basic functionality', () => {
        it('should create progress bar with default options', () => {
            const progress = new ProgressBar({ total: 100 })
            expect(progress).toBeDefined()
        })

        it('should update progress and render', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.update(50)

            expect(stdoutWriteSpy).toHaveBeenCalled()
            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('50%')
        })

        it('should not exceed total when updating', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.update(150)

            // Find output that contains percentage (before completion newline)
            const calls = stdoutWriteSpy.mock.calls
            const outputWithPercent = calls.find((call: unknown[]) => {
                const output = call[0] as string
                return output.includes('100%')
            })
            expect(outputWithPercent).toBeDefined()
        })

        it('should increment progress with tick', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.tick(10)
            progress.tick(15)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('25%')
        })

        it('should complete progress bar', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.finish()

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('\n')
        })
    })

    describe('Custom options', () => {
        it('should use custom width', () => {
            const progress = new ProgressBar({
                total: 100,
                width: 20,
                complete: '#',
                incomplete: '-',
            })
            progress.update(50)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            // 50% of 20 chars = 10 # and 10 -
            expect(output).toContain('##########----------')
        })

        it('should use custom format', () => {
            const progress = new ProgressBar({
                total: 100,
                format: 'Progress: :current/:total (:percent)',
            })
            progress.update(25)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('Progress: 25/100')
            expect(output).toContain('25%')
        })

        it('should use custom complete/incomplete characters', () => {
            const progress = new ProgressBar({
                total: 100,
                complete: '=',
                incomplete: ' ',
                width: 10,
            })
            progress.update(70)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('=======   ')
        })
    })

    describe('Steps management', () => {
        it('should add and track steps', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.addStep('Step 1', 50)
            progress.addStep('Step 2', 50)

            const stats = progress.getStats()
            expect(stats.totalSteps).toBe(2)
            expect(stats.completedSteps).toBe(0)
        })

        it('should update step progress', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.addStep('Step 1', 100)
            progress.updateStep('Step 1', 5, 10)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('50%') // 5/10 = 50%
        })

        it('should calculate weighted progress from multiple steps', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.addStep('Step 1', 30) // Weight 30%
            progress.addStep('Step 2', 70) // Weight 70%

            progress.updateStep('Step 1', 10, 10) // Step 1 complete (30%)
            progress.updateStep('Step 2', 5, 10) // Step 2 half done (35%)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            // 30% + (70% * 0.5) = 65%
            expect(output).toContain('65%')
        })

        it('should mark step as complete', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.addStep('Step 1', 100)
            progress.completeStep('Step 1')

            const stats = progress.getStats()
            expect(stats.completedSteps).toBe(1)

            // Find output with percentage
            const calls = stdoutWriteSpy.mock.calls
            const outputWithPercent = calls.find((call: unknown[]) => {
                const output = call[0] as string
                return output.includes('100%')
            })
            expect(outputWithPercent).toBeDefined()
        })

        it('should track current step name', () => {
            const progress = new ProgressBar({
                total: 100,
                format: ':step :percent',
            })
            progress.addStep('Scanning', 50)
            progress.updateStep('Scanning', 1, 10)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('Scanning')
        })

        it('should handle non-existent step updates gracefully', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.updateStep('NonExistent', 5, 10)
            progress.completeStep('NonExistent')

            // Should not crash
            expect(progress.getStats()).toBeDefined()
        })
    })

    describe('File counting', () => {
        it('should track files processed', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.incrementFiles(5)
            progress.incrementFiles(3)

            const stats = progress.getStats()
            expect(stats.filesProcessed).toBe(8)
        })

        it('should display files processed in format', () => {
            const progress = new ProgressBar({
                total: 100,
                format: 'Files: :files',
            })
            progress.incrementFiles(42)
            progress.update(50)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('Files: 42')
        })
    })

    describe('Time estimation', () => {
        it('should show "calculating..." when just started', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.update(0)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('calculating...')
        })

        it('should show "done" when complete', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.update(100)

            const calls = stdoutWriteSpy.mock.calls
            const outputWithDone = calls.find((call: unknown[]) => {
                const output = call[0] as string
                return output.includes('done')
            })
            expect(outputWithDone).toBeDefined()
        })

        it('should calculate ETA based on current progress', () => {
            const progress = new ProgressBar({ total: 100 })

            progress.update(50)

            // Get ETA immediately
            const eta = progress.getEstimatedTimeRemaining()

            // ETA should be a reasonable number (not negative)
            expect(eta).toBeGreaterThanOrEqual(0)
        })

        it('should format time correctly', () => {
            const progress = new ProgressBar({ total: 100 })

            vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
            progress.update(10)

            // Advance time by 10 seconds (10% in 10s = 90s remaining)
            vi.setSystemTime(new Date('2024-01-01T00:00:10Z'))
            progress.update(20)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            // Should show seconds or minutes
            expect(output).toMatch(/\d+[sm]/)
        })
    })

    describe('Statistics', () => {
        it('should return accurate progress statistics', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.addStep('Step 1', 50)
            progress.addStep('Step 2', 50)
            progress.completeStep('Step 1')
            progress.incrementFiles(10)

            const stats: ProgressStats = progress.getStats()

            expect(stats.totalSteps).toBe(2)
            expect(stats.completedSteps).toBe(1)
            expect(stats.filesProcessed).toBe(10)
            expect(stats.currentStep).toBeDefined()
            expect(stats.startTime).toBeDefined()
            expect(typeof stats.estimatedTimeRemaining).toBe('number')
        })

        it('should track start time', () => {
            const startTime = Date.now()
            const progress = new ProgressBar({ total: 100 })
            const stats = progress.getStats()

            expect(stats.startTime).toBeGreaterThanOrEqual(startTime)
            expect(stats.startTime).toBeLessThanOrEqual(Date.now())
        })
    })

    describe('Edge cases', () => {
        it('should handle zero total', () => {
            const progress = new ProgressBar({ total: 0 })
            progress.update(10)

            // Should not crash
            expect(progress).toBeDefined()
        })

        it('should handle empty steps', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.update(50)

            const stats = progress.getStats()
            expect(stats.totalSteps).toBe(0)
            expect(stats.completedSteps).toBe(0)
        })

        it('should handle step with zero total', () => {
            const progress = new ProgressBar({ total: 100 })
            progress.addStep('Step 1', 100)
            progress.updateStep('Step 1', 0, 0)

            // Should not crash
            expect(progress.getStats()).toBeDefined()
        })
    })

    describe('createPWAProgressBar', () => {
        it('should create pre-configured progress bar for PWA', () => {
            const progress = createPWAProgressBar()

            expect(progress).toBeInstanceOf(ProgressBar)
            const stats = progress.getStats()
            expect(stats.totalSteps).toBe(5) // 5 predefined steps
        })

        it('should have correct PWA steps', () => {
            const progress = createPWAProgressBar()
            const stats = progress.getStats()

            expect(stats.totalSteps).toBe(5)
            // Steps: Scanning, Icons, Manifest, SW, Injection
        })

        it('should render with PWA format', () => {
            const progress = createPWAProgressBar()
            progress.update(50)

            const output = stdoutWriteSpy.mock.calls[stdoutWriteSpy.mock.calls.length - 1][0] as string
            expect(output).toContain('⏳')
            expect(output).toContain('ETA')
            expect(output).toContain('Files')
        })
    })
})
