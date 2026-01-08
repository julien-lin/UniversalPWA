export interface ColorContrastResult {
  valid: boolean
  ratio: number
  level: 'AA' | 'AAA' | 'AA-Large' | 'AAA-Large' | 'Fail'
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

export interface ColorValidationOptions {
  foreground: string // themeColor
  background: string // backgroundColor
  strict?: boolean // Si true, bloque si contraste < AA
  checkAAA?: boolean // Si true, vérifie aussi niveau AAA
}

/**
 * Convertit une couleur hex (#RRGGBB) en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Vérifier que la couleur commence par #
  if (!hex.startsWith('#')) {
    return null
  }
  
  // Supprimer le #
  const cleanHex = hex.substring(1)
  
  // Vérifier format (6 caractères hex)
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null
  }

  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  return { r, g, b }
}

/**
 * Calcule la luminance relative d'une couleur RGB (selon WCAG)
 * Formule: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * où R, G, B sont normalisés (0-1) avec correction gamma
 */
function getLuminance(rgb: { r: number; g: number; b: number }): number {
  // Normalisation et correction gamma
  const normalize = (value: number): number => {
    value = value / 255
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  }

  const r = normalize(rgb.r)
  const g = normalize(rgb.g)
  const b = normalize(rgb.b)

  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Calcule le ratio de contraste entre deux couleurs
 * Formule: (L1 + 0.05) / (L2 + 0.05)
 * où L1 est la luminance la plus claire et L2 la plus foncée
 */
function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Ajuste la luminosité d'une couleur RGB
 * @param rgb Couleur RGB
 * @param factor Facteur d'ajustement (1.0 = inchangé, >1.0 = plus clair, <1.0 = plus foncé)
 */
function adjustBrightness(rgb: { r: number; g: number; b: number }, factor: number): { r: number; g: number; b: number } {
  return {
    r: Math.min(255, Math.max(0, Math.round(rgb.r * factor))),
    g: Math.min(255, Math.max(0, Math.round(rgb.g * factor))),
    b: Math.min(255, Math.max(0, Math.round(rgb.b * factor))),
  }
}

/**
 * Convertit RGB en hex
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (n: number): string => {
    const hex = Math.round(n).toString(16)
    return hex.length === 1 ? `0${hex}` : hex
  }
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`
}

/**
 * Suggère une couleur alternative pour améliorer le contraste
 */
function suggestAlternativeColor(
  foreground: { r: number; g: number; b: number },
  background: { r: number; g: number; b: number },
  targetRatio: number,
): string {
  const currentRatio = getContrastRatio(foreground, background)
  
  // Déterminer quelle couleur est la plus claire
  const fgLuminance = getLuminance(foreground)
  const bgLuminance = getLuminance(background)
  const isForegroundLighter = fgLuminance > bgLuminance

  // Ajuster la couleur la plus foncée pour augmenter le contraste
  let adjustedColor = isForegroundLighter ? { ...background } : { ...foreground }
  let factor = 1.0
  let attempts = 0
  const maxAttempts = 20

  // Ajuster progressivement jusqu'à atteindre le ratio cible
  while (attempts < maxAttempts) {
    const testRatio = getContrastRatio(
      isForegroundLighter ? foreground : adjustedColor,
      isForegroundLighter ? adjustedColor : background,
    )

    if (testRatio >= targetRatio) {
      break
    }

    // Ajuster le facteur selon si on doit éclaircir ou assombrir
    if (isForegroundLighter) {
      // Assombrir le background
      factor -= 0.1
    } else {
      // Éclaircir le foreground
      factor += 0.1
    }

    adjustedColor = adjustBrightness(isForegroundLighter ? background : foreground, factor)
    attempts++
  }

  return rgbToHex(adjustedColor)
}

/**
 * Valide le contraste entre themeColor et backgroundColor selon WCAG
 */
export function validateColorContrast(options: ColorValidationOptions): ColorContrastResult {
  const { foreground, background, strict = false, checkAAA = false } = options

  const result: ColorContrastResult = {
    valid: true,
    ratio: 0,
    level: 'Fail',
    errors: [],
    warnings: [],
    suggestions: [],
  }

  // Convertir les couleurs hex en RGB
  const fgRgb = hexToRgb(foreground)
  const bgRgb = hexToRgb(background)

  if (!fgRgb) {
    result.valid = false
    result.errors.push(`Invalid foreground color format: ${foreground}. Expected format: #RRGGBB`)
    return result
  }

  if (!bgRgb) {
    result.valid = false
    result.errors.push(`Invalid background color format: ${background}. Expected format: #RRGGBB`)
    return result
  }

  // Calculer le ratio de contraste
  const ratio = getContrastRatio(fgRgb, bgRgb)
  result.ratio = ratio

  // Déterminer le niveau de conformité
  if (ratio >= 7) {
    result.level = checkAAA ? 'AAA' : 'AA'
    if (checkAAA && ratio >= 7) {
      result.level = 'AAA'
    } else {
      result.level = 'AA'
    }
  } else if (ratio >= 4.5) {
    result.level = 'AA'
  } else if (ratio >= 3) {
    result.level = 'AA-Large' // Pour texte large (≥18pt ou ≥14pt bold)
    result.warnings.push(
      `Contrast ratio ${ratio.toFixed(2)}:1 meets AA-Large (3:1) but not AA (4.5:1) for normal text`,
    )
    result.suggestions.push('Use larger text (≥18pt or ≥14pt bold) or improve contrast to 4.5:1 for normal text')
  } else {
    result.level = 'Fail'
    result.valid = false
    result.errors.push(
      `Contrast ratio ${ratio.toFixed(2)}:1 is insufficient. Minimum required: 3:1 for large text, 4.5:1 for normal text (WCAG AA)`,
    )
  }

  // Vérification niveau AAA si demandé
  if (checkAAA) {
    if (ratio < 7) {
      result.warnings.push(
        `Contrast ratio ${ratio.toFixed(2)}:1 does not meet AAA standard (7:1). Current level: ${result.level}`,
      )
      if (ratio >= 4.5) {
        result.suggestions.push('To meet AAA standard, increase contrast to 7:1')
      }
    }
  }

  // Suggestions si contraste insuffisant
  if (ratio < 4.5) {
    const suggestedColor = suggestAlternativeColor(fgRgb, bgRgb, 4.5)
    result.suggestions.push(
      `Suggested color for better contrast: ${suggestedColor} (target: 4.5:1 ratio)`,
    )

    if (ratio < 3) {
      const suggestedColorLarge = suggestAlternativeColor(fgRgb, bgRgb, 3)
      result.suggestions.push(
        `Alternative for large text: ${suggestedColorLarge} (target: 3:1 ratio)`,
      )
    }
  }

  // Mode strict : bloquer si contraste < AA
  if (strict && ratio < 4.5) {
    result.valid = false
    result.errors.push(
      `Strict mode: Contrast ratio ${ratio.toFixed(2)}:1 is below WCAG AA minimum (4.5:1)`,
    )
  }

  return result
}

/**
 * Valide rapidement si deux couleurs ont un contraste suffisant (WCAG AA)
 */
export function hasSufficientContrast(foreground: string, background: string): boolean {
  const result = validateColorContrast({ foreground, background })
  return result.valid && result.ratio >= 4.5
}

/**
 * Suggère une couleur de thème complémentaire basée sur la couleur de fond
 */
export function suggestComplementaryThemeColor(backgroundColor: string): string {
  const bgRgb = hexToRgb(backgroundColor)
  if (!bgRgb) {
    return '#ffffff' // Fallback
  }

  const bgLuminance = getLuminance(bgRgb)
  
  // Si le fond est clair, suggérer un thème foncé, et vice versa
  if (bgLuminance > 0.5) {
    // Fond clair → thème foncé
    return '#000000'
  } else {
    // Fond foncé → thème clair
    return '#ffffff'
  }
}

