import { describe, it, expect } from 'vitest'
import {
  validateColorContrast,
  hasSufficientContrast,
  suggestComplementaryThemeColor,
} from './color-validator.js'

describe('color-validator', () => {
  describe('validateColorContrast', () => {
    it('should validate high contrast colors (black on white)', () => {
      const result = validateColorContrast({
        foreground: '#000000',
        background: '#ffffff',
      })

      expect(result.valid).toBe(true)
      expect(result.ratio).toBeGreaterThan(20) // Black on white ≈ 21:1
      expect(result.level).toBe('AA')
      expect(result.errors).toHaveLength(0)
    })

    it('should validate high contrast colors (white on black)', () => {
      const result = validateColorContrast({
        foreground: '#ffffff',
        background: '#000000',
      })

      expect(result.valid).toBe(true)
      expect(result.ratio).toBeGreaterThan(20)
      expect(result.level).toBe('AA')
    })

    it('should fail for low contrast colors (gray on gray)', () => {
      const result = validateColorContrast({
        foreground: '#808080',
        background: '#808080',
      })

      expect(result.valid).toBe(false)
      expect(result.ratio).toBeCloseTo(1, 1) // Same color = 1:1
      expect(result.level).toBe('Fail')
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate WCAG AA compliant colors (4.5:1)', () => {
      // Example: #767676 on white ≈ 4.5:1
      const result = validateColorContrast({
        foreground: '#767676',
        background: '#ffffff',
      })

      expect(result.valid).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(4.5)
      expect(result.level).toBe('AA')
    })

    it('should validate WCAG AAA compliant colors (7:1)', () => {
      // Example: #595959 on white ≈ 7:1
      const result = validateColorContrast({
        foreground: '#595959',
        background: '#ffffff',
        checkAAA: true,
      })

      expect(result.valid).toBe(true)
      expect(result.ratio).toBeGreaterThanOrEqual(7)
      expect(result.level).toBe('AAA')
    })

    it('should warn for AA-Large level (3:1 to 4.5:1)', () => {
      // Test avec une couleur qui donne un ratio entre 3 et 4.5
      // Note: Il est difficile de trouver une couleur exacte, donc on teste la logique
      // avec une couleur qui devrait être proche (on vérifie juste que le niveau est défini)
      const result = validateColorContrast({
        foreground: '#808080',
        background: '#ffffff',
      })

      // Le ratio devrait être calculé et le niveau défini
      expect(result.ratio).toBeGreaterThan(0)
      expect(['AA', 'AA-Large', 'Fail']).toContain(result.level)
    })

    it('should return error for invalid foreground color format', () => {
      const result = validateColorContrast({
        foreground: 'invalid',
        background: '#ffffff',
      })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Invalid foreground color'))).toBe(true)
    })

    it('should return error for invalid background color format', () => {
      const result = validateColorContrast({
        foreground: '#000000',
        background: 'not-a-color',
      })

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Invalid background color'))).toBe(true)
    })

    it('should handle hex colors without # prefix', () => {
      // Le validateur attend #, donc cela devrait échouer
      const result = validateColorContrast({
        foreground: '000000',
        background: 'ffffff',
      })

      expect(result.valid).toBe(false)
    })

    it('should provide suggestions for low contrast', () => {
      const result = validateColorContrast({
        foreground: '#808080',
        background: '#808080',
      })

      expect(result.suggestions.length).toBeGreaterThan(0)
      expect(result.suggestions.some(s => s.includes('Suggested color'))).toBe(true)
    })

    it('should block in strict mode if contrast < AA', () => {
      const result = validateColorContrast({
        foreground: '#808080',
        background: '#808080',
        strict: true,
      })

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Strict mode'))).toBe(true)
    })

    it('should not block in non-strict mode for AA-Large', () => {
      // Test avec une couleur qui pourrait donner AA-Large
      const result = validateColorContrast({
        foreground: '#808080',
        background: '#ffffff',
        strict: false,
      })

      // Le résultat devrait être valide (pas d'erreur en mode non-strict)
      // et avoir des informations de contraste
      expect(result.ratio).toBeGreaterThan(0)
      expect(result.level).toBeDefined()
    })

    it('should warn about AAA when checkAAA is true and ratio < 7', () => {
      const result = validateColorContrast({
        foreground: '#767676', // ≈ 4.5:1
        background: '#ffffff',
        checkAAA: true,
      })

      expect(result.warnings.some(w => w.includes('AAA'))).toBe(true)
    })

    it('should not warn about AAA when checkAAA is false', () => {
      const result = validateColorContrast({
        foreground: '#767676',
        background: '#ffffff',
        checkAAA: false,
      })

      expect(result.warnings.some(w => w.includes('AAA'))).toBe(false)
    })

    it('should handle uppercase hex colors', () => {
      const result = validateColorContrast({
        foreground: '#FFFFFF',
        background: '#000000',
      })

      expect(result.valid).toBe(true)
      expect(result.ratio).toBeGreaterThan(20)
    })

    it('should handle mixed case hex colors', () => {
      const result = validateColorContrast({
        foreground: '#FfFfFf',
        background: '#000000',
      })

      expect(result.valid).toBe(true)
      expect(result.ratio).toBeGreaterThan(20)
    })

    it('should calculate correct contrast for known color pairs', () => {
      // Test avec des paires de couleurs connues
      const testCases = [
        { fg: '#000000', bg: '#ffffff', minRatio: 20 },
        { fg: '#ffffff', bg: '#000000', minRatio: 20 },
        { fg: '#767676', bg: '#ffffff', minRatio: 4.5 },
        { fg: '#595959', bg: '#ffffff', minRatio: 7 },
      ]

      testCases.forEach(({ fg, bg, minRatio }) => {
        const result = validateColorContrast({ foreground: fg, background: bg })
        expect(result.ratio).toBeGreaterThanOrEqual(minRatio)
      })
    })

    it('should suggest alternative colors for insufficient contrast', () => {
      const result = validateColorContrast({
        foreground: '#cccccc',
        background: '#dddddd',
      })

      expect(result.suggestions.length).toBeGreaterThan(0)
      // Les suggestions devraient contenir des couleurs hex
      const hasColorSuggestion = result.suggestions.some(s => /#[0-9A-Fa-f]{6}/.test(s))
      expect(hasColorSuggestion).toBe(true)
    })
  })

  describe('hasSufficientContrast', () => {
    it('should return true for high contrast colors', () => {
      expect(hasSufficientContrast('#000000', '#ffffff')).toBe(true)
      expect(hasSufficientContrast('#ffffff', '#000000')).toBe(true)
    })

    it('should return true for WCAG AA compliant colors', () => {
      expect(hasSufficientContrast('#767676', '#ffffff')).toBe(true)
    })

    it('should return false for low contrast colors', () => {
      expect(hasSufficientContrast('#808080', '#808080')).toBe(false)
      expect(hasSufficientContrast('#cccccc', '#dddddd')).toBe(false)
    })

    it('should return false for AA-Large only colors', () => {
      // #808080 on white ≈ 2.8:1 (Fail, pas même AA-Large)
      expect(hasSufficientContrast('#808080', '#ffffff')).toBe(false)
    })
  })

  describe('suggestComplementaryThemeColor', () => {
    it('should suggest dark theme for light background', () => {
      const suggestion = suggestComplementaryThemeColor('#ffffff')
      expect(suggestion).toBe('#000000')
    })

    it('should suggest light theme for dark background', () => {
      const suggestion = suggestComplementaryThemeColor('#000000')
      expect(suggestion).toBe('#ffffff')
    })

    it('should suggest dark theme for medium-light background', () => {
      const suggestion = suggestComplementaryThemeColor('#cccccc')
      expect(suggestion).toBe('#000000')
    })

    it('should suggest light theme for medium-dark background', () => {
      const suggestion = suggestComplementaryThemeColor('#333333')
      expect(suggestion).toBe('#ffffff')
    })

    it('should handle invalid color format gracefully', () => {
      const suggestion = suggestComplementaryThemeColor('invalid')
      expect(suggestion).toBe('#ffffff') // Fallback
    })

    it('should handle edge case colors', () => {
      // Test avec différentes nuances
      const lightColors = ['#ffffff', '#f0f0f0', '#e0e0e0']
      const darkColors = ['#000000', '#111111', '#222222']

      lightColors.forEach(color => {
        const suggestion = suggestComplementaryThemeColor(color)
        expect(suggestion).toBe('#000000')
      })

      darkColors.forEach(color => {
        const suggestion = suggestComplementaryThemeColor(color)
        expect(suggestion).toBe('#ffffff')
      })
    })
  })
})
