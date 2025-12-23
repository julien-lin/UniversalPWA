import { describe, it, expect } from 'vitest'
import { placeholder } from './index'

describe('@universal-pwa/templates', () => {
  it('should export placeholder', () => {
    expect(placeholder).toBe(true)
  })
})

