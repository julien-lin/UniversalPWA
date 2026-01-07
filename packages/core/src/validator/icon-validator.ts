import sharp from 'sharp'
import { existsSync } from 'fs'

export interface IconValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
  metadata?: {
    width: number
    height: number
    format: string
    size: number
  }
}

export interface IconValidationOptions {
  sourceImage: string
  strict?: boolean // Si true, bloque si < 192x192
  minRecommendedSize?: number // Taille minimale recommandée (défaut: 192)
  optimalSize?: number // Taille optimale recommandée (défaut: 512)
}

/**
 * Validates icon dimensions, format, and quality
 * Returns validation result with errors, warnings, and suggestions
 */
export async function validateIconSource(
  options: IconValidationOptions,
): Promise<IconValidationResult> {
  const {
    sourceImage,
    strict = false,
    minRecommendedSize = 192,
    optimalSize = 512,
  } = options

  const result: IconValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  }

  // Check file exists
  if (!existsSync(sourceImage)) {
    result.valid = false
    result.errors.push(`Source image not found: ${sourceImage}`)
    return result
  }

  // Load image metadata with Sharp
  try {
    const image = sharp(sourceImage)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      result.valid = false
      result.errors.push('Unable to read image dimensions')
      return result
    }

    const { width, height, format, size } = metadata
    const minDimension = Math.min(width, height)
    const maxDimension = Math.max(width, height)
    const isSquare = width === height

    // Store metadata
    result.metadata = {
      width,
      height,
      format: format || 'unknown',
      size: size || 0,
    }

    // Validation: Format supporté
    const supportedFormats = ['png', 'jpeg', 'jpg', 'webp', 'svg']
    if (!format || !supportedFormats.includes(format.toLowerCase())) {
      result.valid = false
      result.errors.push(
        `Unsupported image format: ${format || 'unknown'}. Supported formats: ${supportedFormats.join(', ')}`,
      )
    }

    // Validation: Dimensions minimales (192x192 recommandé)
    if (minDimension < minRecommendedSize) {
      const message = `Icon dimensions too small: ${width}x${height}. Minimum recommended: ${minRecommendedSize}x${minRecommendedSize}`
      if (strict) {
        result.valid = false
        result.errors.push(message)
      } else {
        result.warnings.push(message)
        result.suggestions.push(
          `Use an image at least ${minRecommendedSize}x${minRecommendedSize} pixels for best PWA compatibility`,
        )
      }
    }

    // Warning: Dimensions < 512x512 (recommandé)
    if (minDimension < optimalSize) {
      result.warnings.push(
        `Icon dimensions below optimal size: ${width}x${height}. Optimal size: ${optimalSize}x${optimalSize} for best quality on all devices`,
      )
      result.suggestions.push(
        `Consider using a ${optimalSize}x${optimalSize} source image for optimal icon quality`,
      )
    }

    // Warning: Image not square
    if (!isSquare) {
      result.warnings.push(
        `Icon is not square (${width}x${height}). Square images work best for PWA icons`,
      )
      result.suggestions.push(
        'Consider using a square source image. The icon will be cropped to fit during generation',
      )
    }

    // Suggestion: Format optimization
    if (format?.toLowerCase() === 'jpg' || format?.toLowerCase() === 'jpeg') {
      result.suggestions.push(
        'PNG format is recommended for icons with transparency. Consider converting JPG to PNG',
      )
    }

    // Suggestion: File size optimization
    if (size && size > 1024 * 1024) {
      // > 1MB
      const sizeMB = (size / (1024 * 1024)).toFixed(2)
      result.warnings.push(`Icon file size is large: ${sizeMB}MB. This may slow down generation`)
      result.suggestions.push(
        'Consider optimizing the source image before generation to reduce file size',
      )
    } else if (size && size > 500 * 1024) {
      // > 500KB
      const sizeKB = (size / 1024).toFixed(2)
      result.suggestions.push(
        `Icon file size is ${sizeKB}KB. Consider optimizing to reduce generation time`,
      )
    }

    // Validation: Aspect ratio acceptable (max 2:1 or 1:2)
    const aspectRatio = maxDimension / minDimension
    if (aspectRatio > 2) {
      result.warnings.push(
        `Icon has extreme aspect ratio (${aspectRatio.toFixed(2)}:1). Square images are recommended`,
      )
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    result.valid = false
    result.errors.push(`Failed to validate icon: ${message}`)
    return result
  }
}

/**
 * Quick validation: checks if icon meets minimum requirements
 */
export async function isIconValid(sourceImage: string, minSize = 192): Promise<boolean> {
  if (!existsSync(sourceImage)) {
    return false
  }

  try {
    const image = sharp(sourceImage)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      return false
    }

    const minDimension = Math.min(metadata.width, metadata.height)
    return minDimension >= minSize
  } catch {
    return false
  }
}

