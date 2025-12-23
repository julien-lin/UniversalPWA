import { describe, it, expect } from 'vitest'
import { placeholder } from './index'

describe('@universal-pwa/cli', () => {
  it('should export placeholder', () => {
    expect(placeholder).toBe(true)
  })
})

