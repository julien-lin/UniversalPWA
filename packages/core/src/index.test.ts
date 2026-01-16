import { describe, it, expect } from 'vitest'
import { detectFramework, type Framework, type FrameworkDetectionResult } from './index.js'

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
      confidenceScore: 0,
      indicators: [],
      version: null,
      configuration: {
        language: null,
        cssInJs: [],
        stateManagement: [],
        buildTool: null,
      },
    }
    expect(result).toBeDefined()
    expect(result.confidenceScore).toBe(0)
    expect(result.version).toBeNull()
    expect(result.configuration).toBeDefined()
  })
})

