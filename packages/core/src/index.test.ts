import { describe, it, expect } from 'vitest'
import { detectFramework, type Framework, type FrameworkDetectionResult } from './index'

describe('@julien-lin/universal-pwa-core', () => {
  it('should export detectFramework', () => {
    expect(typeof detectFramework).toBe('function')
  })

  it('should export Framework type', () => {
    const frameworks: Framework[] = [
      'wordpress',
      'symfony',
      'laravel',
      'react',
      'vue',
      'angular',
      'nextjs',
      'nuxt',
      'static',
    ]
    expect(frameworks.length).toBeGreaterThan(0)
  })

  it('should export FrameworkDetectionResult type', () => {
    const result: FrameworkDetectionResult = {
      framework: null,
      confidence: 'low',
      indicators: [],
    }
    expect(result).toBeDefined()
  })
})

