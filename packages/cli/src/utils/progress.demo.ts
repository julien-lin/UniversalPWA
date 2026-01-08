#!/usr/bin/env node
/**
 * Demo of the progress bar system
 * Run with: npx tsx packages/cli/src/utils/progress.demo.ts
 */

import { createPWAProgressBar } from './progress.js'

async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function demo(): Promise<void> {
    console.log('🚀 PWA Generation Progress Demo\n')

    const progress = createPWAProgressBar()

    // Step 1: Scanning (20% weight)
    console.log('Starting scan...')
    for (let i = 1; i <= 10; i++) {
        await delay(100)
        progress.updateStep('Scanning project', i, 10)
    }
    progress.completeStep('Scanning project')
    console.log('✓ Scan complete\n')

    // Step 2: Generating icons (30% weight)
    console.log('Generating icons...')
    const iconSizes = [192, 512, 180, 167, 152, 144, 128, 96, 72, 48]
    for (let i = 0; i < iconSizes.length; i++) {
        await delay(150)
        progress.updateStep('Generating icons', i + 1, iconSizes.length)
        progress.incrementFiles(1)
    }
    progress.completeStep('Generating icons')
    console.log('✓ Icons generated\n')

    // Step 3: Generating manifest (10% weight)
    console.log('Generating manifest...')
    await delay(200)
    progress.updateStep('Generating manifest', 1, 1)
    progress.incrementFiles(1)
    progress.completeStep('Generating manifest')
    console.log('✓ Manifest generated\n')

    // Step 4: Generating service worker (15% weight)
    console.log('Generating service worker...')
    for (let i = 1; i <= 3; i++) {
        await delay(200)
        progress.updateStep('Generating service worker', i, 3)
    }
    progress.incrementFiles(1)
    progress.completeStep('Generating service worker')
    console.log('✓ Service worker generated\n')

    // Step 5: Injecting HTML (25% weight)
    console.log('Injecting HTML...')
    const htmlFiles = 15
    for (let i = 1; i <= htmlFiles; i++) {
        await delay(80)
        progress.updateStep('Injecting HTML', i, htmlFiles)
        progress.incrementFiles(1)
    }
    progress.completeStep('Injecting HTML')
    console.log('✓ HTML injection complete\n')

    // Final stats
    const stats = progress.getStats()
    console.log('\n📊 Final Statistics:')
    console.log(`   • Total files processed: ${stats.filesProcessed}`)
    console.log(`   • Total time: ${Math.round((Date.now() - stats.startTime) / 1000)}s`)
    console.log(`   • Steps completed: ${stats.completedSteps}/${stats.totalSteps}`)
    console.log('\n✅ PWA generation complete!')
}

demo().catch(console.error)
