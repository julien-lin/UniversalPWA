/**
 * P1.3: Sharp Memory and DoS Limits
 * Security constraints for image processing to prevent memory exhaustion and DoS attacks
 * @category Security
 */

/**
 * Limits configuration for Sharp image processing
 */
export interface SharpLimits {
  /** Maximum image width in pixels */
  maxWidth: number;
  /** Maximum image height in pixels */
  maxHeight: number;
  /** Maximum input file size in bytes */
  maxInputSize: number;
  /** Maximum concurrent image operations */
  maxConcurrency: number;
  /** Allowed image formats */
  allowedFormats: string[];
  /** Buffer size for operations (MB) */
  bufferSize: number;
}

/**
 * Default Sharp limits enforcing memory safety
 * Conservative defaults prevent DoS through image processing
 */
export const DEFAULT_SHARP_LIMITS: SharpLimits = {
  maxWidth: 2048,
  maxHeight: 2048,
  maxInputSize: 10 * 1024 * 1024, // 10MB
  maxConcurrency: 2, // Sequential by default, max 2 concurrent
  allowedFormats: ["png", "jpeg", "jpg", "webp", "svg"],
  bufferSize: 16, // 16MB buffer
};

/**
 * Icon-specific limits (typically smaller, batch processing)
 */
export const ICON_SHARP_LIMITS: SharpLimits = {
  maxWidth: 512,
  maxHeight: 512,
  maxInputSize: 5 * 1024 * 1024, // 5MB per icon
  maxConcurrency: 4, // Icons can be processed in parallel
  allowedFormats: ["png", "jpeg", "jpg", "webp"],
  bufferSize: 32, // 32MB for icon batch
};

/**
 * Error for Sharp limit violations
 */
export class SharpLimitError extends Error {
  constructor(
    public readonly imagePath: string,
    message: string,
  ) {
    super(message);
    this.name = "SharpLimitError";
  }
}

/**
 * Validation result for image processing
 */
export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
    size?: number;
  };
}

/**
 * Validate image dimensions and format against Sharp limits
 */
export function validateImageDimensions(
  width: number | undefined,
  height: number | undefined,
  limits: SharpLimits,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!width || !height) {
    errors.push("Image dimensions are required");
    return { isValid: false, errors, warnings };
  }

  // Check maximum dimensions
  if (width > limits.maxWidth) {
    errors.push(
      `Image width (${width}px) exceeds maximum (${limits.maxWidth}px)`,
    );
  }

  if (height > limits.maxHeight) {
    errors.push(
      `Image height (${height}px) exceeds maximum (${limits.maxHeight}px)`,
    );
  }

  // Warn if approaching limits (>80%)
  const widthRatio = width / limits.maxWidth;
  const heightRatio = height / limits.maxHeight;

  if (widthRatio > 0.8) {
    warnings.push(
      `Image width is at ${Math.round(widthRatio * 100)}% of limit (${limits.maxWidth}px)`,
    );
  }

  if (heightRatio > 0.8) {
    warnings.push(
      `Image height is at ${Math.round(heightRatio * 100)}% of limit (${limits.maxHeight}px)`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate image file size against Sharp limits
 */
export function validateImageFileSize(
  fileSizeBytes: number,
  limits: SharpLimits,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (fileSizeBytes > limits.maxInputSize) {
    errors.push(
      `Image file size (${formatBytes(fileSizeBytes)}) exceeds maximum (${formatBytes(limits.maxInputSize)})`,
    );
  }

  // Warn if approaching limit (>80%)
  const sizeRatio = fileSizeBytes / limits.maxInputSize;
  if (sizeRatio > 0.8) {
    warnings.push(
      `Image file size is at ${Math.round(sizeRatio * 100)}% of limit`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate image format is in allowed list
 */
export function validateImageFormat(
  format: string | undefined,
  limits: SharpLimits,
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!format) {
    errors.push("Image format is required");
    return { isValid: false, errors };
  }

  const normalizedFormat = format.toLowerCase();
  if (!limits.allowedFormats.includes(normalizedFormat)) {
    errors.push(
      `Image format '.${normalizedFormat}' is not allowed. Allowed formats: ${limits.allowedFormats.join(", ")}`,
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate maximum area (width * height) and validate
 * Prevents aspect ratio attacks (e.g., 1px x 10000000px)
 */
export function validateImageArea(
  width: number | undefined,
  height: number | undefined,
  limits: SharpLimits,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  area?: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!width || !height) {
    errors.push("Image dimensions are required for area validation");
    return { isValid: false, errors, warnings };
  }

  const area = width * height;
  const maxArea = limits.maxWidth * limits.maxHeight;

  if (area > maxArea) {
    errors.push(
      `Image area (${area.toLocaleString()} pixels) exceeds maximum (${maxArea.toLocaleString()} pixels)`,
    );
  }

  // Warn if at 80% of max area
  const areaRatio = area / maxArea;
  if (areaRatio > 0.8) {
    warnings.push(`Image area is at ${Math.round(areaRatio * 100)}% of limit`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    area,
  };
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format Sharp limits for display in messages
 */
export function formatSharpLimits(limits: SharpLimits): string {
  return (
    `Max: ${limits.maxWidth}x${limits.maxHeight}px, ` +
    `Max Input: ${formatBytes(limits.maxInputSize)}, ` +
    `Concurrency: ${limits.maxConcurrency}`
  );
}
