/**
 * Progress bar and feedback system for CLI operations
 */

export interface ProgressStep {
    name: string
    weight: number // Relative weight for calculating overall progress
    current?: number
    total?: number
}

export interface ProgressOptions {
    total: number
    format?: string
    width?: number
    complete?: string
    incomplete?: string
    clear?: boolean
}

export interface ProgressStats {
    startTime: number
    currentStep: string
    totalSteps: number
    completedSteps: number
    filesProcessed: number
    estimatedTimeRemaining: number
}

export class ProgressBar {
    private current: number = 0
    private total: number
    private width: number
    private completeChar: string
    private incompleteChar: string
    private format: string
    private clear: boolean
    private startTime: number
    private steps: Map<string, ProgressStep> = new Map()
    private currentStepName: string = ''
    private filesProcessed: number = 0

    constructor(options: ProgressOptions) {
        this.total = options.total
        this.width = options.width || 40
        this.completeChar = options.complete || '█'
        this.incompleteChar = options.incomplete || '░'
        this.format = options.format || ':bar :percent :eta'
        this.clear = options.clear !== false
        this.startTime = Date.now()
    }

    /**
     * Register a step with its weight
     */
    addStep(name: string, weight: number): void {
        this.steps.set(name, { name, weight })
    }

    /**
     * Update progress for a specific step
     */
    updateStep(name: string, current: number, total: number): void {
        const step = this.steps.get(name)
        if (!step) return

        step.current = current
        step.total = total
        this.currentStepName = name

        // Calculate overall progress based on weighted steps
        const overallProgress = this.calculateOverallProgress()
        this.update(overallProgress)
    }

    /**
     * Mark a step as complete
     */
    completeStep(name: string): void {
        const step = this.steps.get(name)
        if (!step) return

        step.current = step.total || 1
        step.total = step.total || 1

        const overallProgress = this.calculateOverallProgress()
        this.update(overallProgress)
    }

    /**
     * Increment files processed counter
     */
    incrementFiles(count: number = 1): void {
        this.filesProcessed += count
    }

    /**
     * Calculate overall progress from all steps
     */
    private calculateOverallProgress(): number {
        if (this.steps.size === 0) return 0

        let totalWeight = 0
        let completedWeight = 0

        for (const step of this.steps.values()) {
            totalWeight += step.weight
            if (step.current !== undefined && step.total !== undefined && step.total > 0) {
                completedWeight += (step.current / step.total) * step.weight
            }
        }

        return totalWeight > 0 ? (completedWeight / totalWeight) * this.total : 0
    }

    /**
     * Update progress value
     */
    update(value: number): void {
        this.current = Math.min(value, this.total)
        this.render()
    }

    /**
     * Increment progress
     */
    tick(delta: number = 1): void {
        this.current = Math.min(this.current + delta, this.total)
        this.render()
    }

    /**
     * Render the progress bar
     */
    private render(): void {
        const percent = this.total > 0 ? (this.current / this.total) : 0
        const completeLength = Math.round(this.width * percent)
        const incompleteLength = this.width - completeLength

        const bar = this.completeChar.repeat(completeLength) + this.incompleteChar.repeat(incompleteLength)
        const percentStr = `${Math.round(percent * 100)}%`
        const eta = this.getETA()

        const output = this.format
            .replace(':bar', bar)
            .replace(':percent', percentStr)
            .replace(':eta', eta)
            .replace(':current', this.current.toString())
            .replace(':total', this.total.toString())
            .replace(':step', this.currentStepName)
            .replace(':files', this.filesProcessed.toString())

        // Clear line and print
        if (this.clear) {
            process.stdout.write('\r\x1b[K')
        }
        process.stdout.write(output)

        if (this.current >= this.total) {
            process.stdout.write('\n')
        }
    }

    /**
     * Calculate estimated time remaining
     */
    private getETA(): string {
        if (this.current === 0) return 'calculating...'
        if (this.current >= this.total) return 'done'

        const elapsed = Date.now() - this.startTime
        const rate = this.current / elapsed
        const remaining = (this.total - this.current) / rate

        return this.formatTime(remaining)
    }

    /**
     * Get estimated time remaining in milliseconds
     */
    getEstimatedTimeRemaining(): number {
        if (this.current === 0 || this.current >= this.total) return 0

        const elapsed = Date.now() - this.startTime
        const rate = this.current / elapsed
        return (this.total - this.current) / rate
    }

    /**
     * Format time in human readable format
     */
    private formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000)
        if (seconds < 60) return `${seconds}s`
        const minutes = Math.floor(seconds / 60)
        if (minutes < 60) return `${minutes}m ${seconds % 60}s`
        const hours = Math.floor(minutes / 60)
        return `${hours}h ${minutes % 60}m`
    }

    /**
     * Get current progress statistics
     */
    getStats(): ProgressStats {
        const completedSteps = Array.from(this.steps.values()).filter(
            (step) => step.current !== undefined && step.total !== undefined && step.current >= step.total
        ).length

        return {
            startTime: this.startTime,
            currentStep: this.currentStepName,
            totalSteps: this.steps.size,
            completedSteps,
            filesProcessed: this.filesProcessed,
            estimatedTimeRemaining: this.getEstimatedTimeRemaining(),
        }
    }

    /**
     * Complete the progress bar
     */
    finish(): void {
        this.current = this.total
        this.render()
    }
}

/**
 * Create a progress bar for PWA generation
 */
export function createPWAProgressBar(): ProgressBar {
    const progress = new ProgressBar({
        total: 100,
        format: '⏳ [:bar] :percent | :step | ETA: :eta | Files: :files',
        width: 30,
    })

    // Define steps with their relative weights
    progress.addStep('Scanning project', 20)
    progress.addStep('Generating icons', 30)
    progress.addStep('Generating manifest', 10)
    progress.addStep('Generating service worker', 15)
    progress.addStep('Injecting HTML', 25)

    return progress
}
