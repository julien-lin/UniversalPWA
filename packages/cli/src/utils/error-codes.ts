/**
 * Codes d'erreur standardisés pour UniversalPWA
 */
export enum ErrorCode {
  // Erreurs de projet (1000-1999)
  PROJECT_PATH_NOT_FOUND = 'E1001',
  PROJECT_SCAN_FAILED = 'E1002',
  PROJECT_INVALID = 'E1003',

  // Erreurs de manifest (2000-2999)
  MANIFEST_GENERATION_FAILED = 'E2001',
  MANIFEST_VALIDATION_FAILED = 'E2002',
  MANIFEST_WRITE_FAILED = 'E2003',

  // Erreurs d'icônes (3000-3999)
  ICON_SOURCE_NOT_FOUND = 'E3001',
  ICON_GENERATION_FAILED = 'E3002',
  ICON_INVALID_FORMAT = 'E3003',
  ICON_PROCESSING_ERROR = 'E3004',

  // Erreurs de service worker (4000-4999)
  SERVICE_WORKER_GENERATION_FAILED = 'E4001',
  SERVICE_WORKER_WRITE_FAILED = 'E4002',
  SERVICE_WORKER_REGISTRATION_FAILED = 'E4003',

  // Erreurs d'injection HTML (5000-5999)
  HTML_INJECTION_FAILED = 'E5001',
  HTML_FILE_NOT_FOUND = 'E5002',
  HTML_PARSING_FAILED = 'E5003',

  // Erreurs de transaction (6000-6999)
  TRANSACTION_ROLLBACK_FAILED = 'E6001',
  TRANSACTION_BACKUP_FAILED = 'E6002',

  // Erreurs système (9000-9999)
  UNEXPECTED_ERROR = 'E9001',
  PERMISSION_DENIED = 'E9002',
  DISK_FULL = 'E9003',
}

export interface ErrorDetails {
  code: ErrorCode
  message: string
  suggestion?: string
  documentation?: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Messages d'erreur standardisés avec suggestions
 */
export const ERROR_MESSAGES: Record<ErrorCode, ErrorDetails> = {
  [ErrorCode.PROJECT_PATH_NOT_FOUND]: {
    code: ErrorCode.PROJECT_PATH_NOT_FOUND,
    message: 'Project path does not exist',
    suggestion: 'Verify that the project path is correct and accessible',
    documentation: 'https://github.com/julien-lin/UniversalPWA#installation',
    severity: 'error',
  },
  [ErrorCode.PROJECT_SCAN_FAILED]: {
    code: ErrorCode.PROJECT_SCAN_FAILED,
    message: 'Failed to scan project',
    suggestion: 'Check project structure and permissions. Try running with --force-scan',
    documentation: 'https://github.com/julien-lin/UniversalPWA#troubleshooting',
    severity: 'error',
  },
  [ErrorCode.PROJECT_INVALID]: {
    code: ErrorCode.PROJECT_INVALID,
    message: 'Invalid project structure',
    suggestion: 'Ensure your project has a valid structure (package.json, composer.json, or HTML files)',
    severity: 'error',
  },
  [ErrorCode.MANIFEST_GENERATION_FAILED]: {
    code: ErrorCode.MANIFEST_GENERATION_FAILED,
    message: 'Failed to generate manifest.json',
    suggestion: 'Check that all required fields are provided (name, short_name, icons)',
    documentation: 'https://developer.mozilla.org/en-US/docs/Web/Manifest',
    severity: 'error',
  },
  [ErrorCode.MANIFEST_VALIDATION_FAILED]: {
    code: ErrorCode.MANIFEST_VALIDATION_FAILED,
    message: 'Manifest validation failed',
    suggestion: 'Ensure manifest.json follows the Web App Manifest specification',
    documentation: 'https://developer.mozilla.org/en-US/docs/Web/Manifest',
    severity: 'error',
  },
  [ErrorCode.MANIFEST_WRITE_FAILED]: {
    code: ErrorCode.MANIFEST_WRITE_FAILED,
    message: 'Failed to write manifest.json',
    suggestion: 'Check write permissions for the output directory',
    severity: 'error',
  },
  [ErrorCode.ICON_SOURCE_NOT_FOUND]: {
    code: ErrorCode.ICON_SOURCE_NOT_FOUND,
    message: 'Icon source file not found',
    suggestion: 'Provide a valid icon source path (PNG, JPG, SVG, or WebP)',
    severity: 'warning',
  },
  [ErrorCode.ICON_GENERATION_FAILED]: {
    code: ErrorCode.ICON_GENERATION_FAILED,
    message: 'Failed to generate PWA icons',
    suggestion: 'Ensure the icon source is a valid image file (min 512x512 recommended)',
    documentation: 'https://github.com/julien-lin/UniversalPWA#icon-generation',
    severity: 'error',
  },
  [ErrorCode.ICON_INVALID_FORMAT]: {
    code: ErrorCode.ICON_INVALID_FORMAT,
    message: 'Invalid icon format',
    suggestion: 'Use PNG, JPG, SVG, or WebP format for icons',
    severity: 'error',
  },
  [ErrorCode.ICON_PROCESSING_ERROR]: {
    code: ErrorCode.ICON_PROCESSING_ERROR,
    message: 'Error processing icon',
    suggestion: 'Check that the icon file is not corrupted and has sufficient resolution',
    severity: 'error',
  },
  [ErrorCode.SERVICE_WORKER_GENERATION_FAILED]: {
    code: ErrorCode.SERVICE_WORKER_GENERATION_FAILED,
    message: 'Failed to generate service worker',
    suggestion: 'Check that Workbox is properly installed and the output directory is writable',
    documentation: 'https://developers.google.com/web/tools/workbox',
    severity: 'error',
  },
  [ErrorCode.SERVICE_WORKER_WRITE_FAILED]: {
    code: ErrorCode.SERVICE_WORKER_WRITE_FAILED,
    message: 'Failed to write service worker',
    suggestion: 'Check write permissions for the output directory',
    severity: 'error',
  },
  [ErrorCode.SERVICE_WORKER_REGISTRATION_FAILED]: {
    code: ErrorCode.SERVICE_WORKER_REGISTRATION_FAILED,
    message: 'Service worker registration failed',
    suggestion: 'Ensure HTTPS is enabled (required for service workers)',
    documentation: 'https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API',
    severity: 'warning',
  },
  [ErrorCode.HTML_INJECTION_FAILED]: {
    code: ErrorCode.HTML_INJECTION_FAILED,
    message: 'Failed to inject meta-tags into HTML',
    suggestion: 'Check that HTML files are valid and writable',
    severity: 'warning',
  },
  [ErrorCode.HTML_FILE_NOT_FOUND]: {
    code: ErrorCode.HTML_FILE_NOT_FOUND,
    message: 'HTML file not found',
    suggestion: 'Ensure HTML files exist in the project',
    severity: 'warning',
  },
  [ErrorCode.HTML_PARSING_FAILED]: {
    code: ErrorCode.HTML_PARSING_FAILED,
    message: 'Failed to parse HTML file',
    suggestion: 'Check that HTML files are well-formed',
    severity: 'error',
  },
  [ErrorCode.TRANSACTION_ROLLBACK_FAILED]: {
    code: ErrorCode.TRANSACTION_ROLLBACK_FAILED,
    message: 'Failed to rollback transaction',
    suggestion: 'Manually check and restore files if needed',
    severity: 'error',
  },
  [ErrorCode.TRANSACTION_BACKUP_FAILED]: {
    code: ErrorCode.TRANSACTION_BACKUP_FAILED,
    message: 'Failed to backup files',
    suggestion: 'Check read permissions for files to backup',
    severity: 'warning',
  },
  [ErrorCode.UNEXPECTED_ERROR]: {
    code: ErrorCode.UNEXPECTED_ERROR,
    message: 'An unexpected error occurred',
    suggestion: 'Check logs for details and report the issue if it persists',
    documentation: 'https://github.com/julien-lin/UniversalPWA/issues',
    severity: 'error',
  },
  [ErrorCode.PERMISSION_DENIED]: {
    code: ErrorCode.PERMISSION_DENIED,
    message: 'Permission denied',
    suggestion: 'Check file and directory permissions',
    severity: 'error',
  },
  [ErrorCode.DISK_FULL]: {
    code: ErrorCode.DISK_FULL,
    message: 'Disk full',
    suggestion: 'Free up disk space and try again',
    severity: 'error',
  },
}

/**
 * Crée un message d'erreur formaté avec code, suggestion et documentation
 */
export function formatError(code: ErrorCode, context?: string): string {
  const error = ERROR_MESSAGES[code]
  if (!error) {
    return `Unknown error: ${code}`
  }

  let message = `[${error.code}] ${error.message}`
  if (context) {
    message += `: ${context}`
  }

  if (error.suggestion) {
    message += `\n💡 Suggestion: ${error.suggestion}`
  }

  if (error.documentation) {
    message += `\n📚 Documentation: ${error.documentation}`
  }

  return message
}

/**
 * Détecte le code d'erreur à partir d'un message d'erreur
 */
export function detectErrorCode(error: Error | string): ErrorCode {
  const message = error instanceof Error ? error.message : error
  const lowerMessage = message.toLowerCase()

  // Détection basée sur le contenu du message
  if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
    if (lowerMessage.includes('icon') || lowerMessage.includes('image')) {
      return ErrorCode.ICON_SOURCE_NOT_FOUND
    }
    if (lowerMessage.includes('html')) {
      return ErrorCode.HTML_FILE_NOT_FOUND
    }
    if (lowerMessage.includes('project') || lowerMessage.includes('path')) {
      return ErrorCode.PROJECT_PATH_NOT_FOUND
    }
  }

  if (lowerMessage.includes('manifest')) {
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
      return ErrorCode.MANIFEST_VALIDATION_FAILED
    }
    if (lowerMessage.includes('write') || lowerMessage.includes('save')) {
      return ErrorCode.MANIFEST_WRITE_FAILED
    }
    return ErrorCode.MANIFEST_GENERATION_FAILED
  }

  if (lowerMessage.includes('icon')) {
    if (lowerMessage.includes('format') || lowerMessage.includes('invalid')) {
      return ErrorCode.ICON_INVALID_FORMAT
    }
    if (lowerMessage.includes('process') || lowerMessage.includes('generate')) {
      return ErrorCode.ICON_GENERATION_FAILED
    }
    return ErrorCode.ICON_PROCESSING_ERROR
  }

  if (lowerMessage.includes('service worker') || lowerMessage.includes('serviceworker')) {
    if (lowerMessage.includes('registration')) {
      return ErrorCode.SERVICE_WORKER_REGISTRATION_FAILED
    }
    if (lowerMessage.includes('write') || lowerMessage.includes('save')) {
      return ErrorCode.SERVICE_WORKER_WRITE_FAILED
    }
    return ErrorCode.SERVICE_WORKER_GENERATION_FAILED
  }

  if (lowerMessage.includes('html') || lowerMessage.includes('inject')) {
    if (lowerMessage.includes('parse')) {
      return ErrorCode.HTML_PARSING_FAILED
    }
    return ErrorCode.HTML_INJECTION_FAILED
  }

  if (lowerMessage.includes('permission') || lowerMessage.includes('denied')) {
    return ErrorCode.PERMISSION_DENIED
  }

  if (lowerMessage.includes('disk') || lowerMessage.includes('space') || lowerMessage.includes('full')) {
    return ErrorCode.DISK_FULL
  }

  if (lowerMessage.includes('scan') || lowerMessage.includes('detect')) {
    return ErrorCode.PROJECT_SCAN_FAILED
  }

  return ErrorCode.UNEXPECTED_ERROR
}

