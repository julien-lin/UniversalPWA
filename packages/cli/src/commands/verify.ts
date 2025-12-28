import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import { glob } from 'glob'
import chalk from 'chalk'
import { validatePWA, type ValidationResult } from '@julien-lin/universal-pwa-core'

export interface VerifyOptions {
  projectPath?: string
  outputDir?: string
  checkDocker?: boolean
}

export interface VerifyResult {
  success: boolean
  projectPath: string
  outputDir: string
  filesFound: string[]
  filesMissing: string[]
  warnings: string[]
  errors: string[]
  dockerfileFound: boolean
  dockerfileNeedsUpdate: boolean
  dockerfileSuggestions: string[]
  validationResult?: ValidationResult // Nouveau : résultat de validation PWA complète
}

/**
 * Verify command: checks if all PWA files are present and correctly configured
 */
export async function verifyCommand(options: VerifyOptions = {}): Promise<VerifyResult> {
  const {
    projectPath = process.cwd(),
    outputDir,
    checkDocker = true,
  } = options

  const result: VerifyResult = {
    success: false,
    projectPath: resolve(projectPath),
    outputDir: '',
    filesFound: [],
    filesMissing: [],
    warnings: [],
    errors: [],
    dockerfileFound: false,
    dockerfileNeedsUpdate: false,
    dockerfileSuggestions: [],
  }

  try {
    // Check that path exists
    if (!existsSync(result.projectPath)) {
      result.errors.push(`Project path does not exist: ${result.projectPath}`)
      return result
    }

    console.log(chalk.blue('🔍 Verifying PWA setup...'))

    // Determine output directory (make it absolute)
    const finalOutputDir = outputDir
      ? outputDir.startsWith('/')
        ? outputDir
        : join(result.projectPath, outputDir)
      : join(result.projectPath, 'public')
    result.outputDir = finalOutputDir

    // Find HTML files for validation
    const htmlFiles = await glob('**/*.html', {
      cwd: result.projectPath,
      ignore: ['**/node_modules/**', '**/.next/**', '**/.nuxt/**', '**/dist/**'],
      absolute: true,
    })

    // Run comprehensive PWA validation
    console.log(chalk.blue('🔍 Running comprehensive PWA validation...'))
    const validationResult = await validatePWA({
      projectPath: result.projectPath,
      outputDir: finalOutputDir,
      htmlFiles,
      strict: false,
    })

    result.validationResult = validationResult

    // Display validation results
    console.log(chalk.blue('\n📊 PWA Validation Results:'))
    console.log(chalk.gray(`  Score: ${validationResult.score}/100`))
    console.log(chalk.gray(`  Errors: ${validationResult.errors.length}`))
    console.log(chalk.gray(`  Warnings: ${validationResult.warnings.length}`))

    if (validationResult.errors.length > 0) {
      console.log(chalk.red('\n❌ Errors:'))
      validationResult.errors.forEach((error) => {
        console.log(chalk.red(`  ✗ [${error.code}] ${error.message}`))
        if (error.file) {
          console.log(chalk.gray(`    File: ${error.file}`))
        }
        if (error.suggestion) {
          console.log(chalk.yellow(`    💡 ${error.suggestion}`))
        }
      })
    }

    if (validationResult.warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Warnings:'))
      validationResult.warnings.forEach((warning) => {
        console.log(chalk.yellow(`  ⚠ [${warning.code}] ${warning.message}`))
        if (warning.file) {
          console.log(chalk.gray(`    File: ${warning.file}`))
        }
        if (warning.suggestion) {
          console.log(chalk.gray(`    💡 ${warning.suggestion}`))
        }
      })
    }

    if (validationResult.suggestions.length > 0) {
      console.log(chalk.blue('\n💡 Suggestions:'))
      validationResult.suggestions.forEach((suggestion) => {
        console.log(chalk.gray(`  • ${suggestion}`))
      })
    }

    // Add validation errors and warnings to result
    result.errors.push(...validationResult.errors.map((e) => e.message))
    result.warnings.push(...validationResult.warnings.map((w) => w.message))

    // Required PWA files
    const requiredFiles = [
      'sw.js',
      'manifest.json',
      'icon-192x192.png',
      'icon-512x512.png',
      'apple-touch-icon.png',
    ]

    // Optional but recommended files
    const recommendedFiles = [
      'icon-72x72.png',
      'icon-96x96.png',
      'icon-128x128.png',
      'icon-144x144.png',
      'icon-152x152.png',
      'icon-384x384.png',
    ]

    // Check required files
    console.log(chalk.blue('📋 Checking required PWA files...'))
    for (const file of requiredFiles) {
      const filePath = join(finalOutputDir, file)
      if (existsSync(filePath)) {
        result.filesFound.push(file)
        console.log(chalk.green(`  ✓ ${file}`))
      } else {
        result.filesMissing.push(file)
        result.errors.push(`Missing required file: ${file}`)
        console.log(chalk.red(`  ✗ ${file} (MISSING)`))
      }
    }

    // Check recommended files
    console.log(chalk.blue('📋 Checking recommended PWA files...'))
    for (const file of recommendedFiles) {
      const filePath = join(finalOutputDir, file)
      if (existsSync(filePath)) {
        result.filesFound.push(file)
        console.log(chalk.green(`  ✓ ${file}`))
      } else {
        result.filesMissing.push(file)
        result.warnings.push(`Missing recommended file: ${file}`)
        console.log(chalk.yellow(`  ⚠ ${file} (recommended)`))
      }
    }

    // Check Dockerfile if requested
    if (checkDocker) {
      const dockerfilePath = join(result.projectPath, 'Dockerfile')
      const dockerfileExists = existsSync(dockerfilePath)
      result.dockerfileFound = dockerfileExists

      if (dockerfileExists) {
        console.log(chalk.blue('🐳 Checking Dockerfile...'))
        const dockerfileContent = readFileSync(dockerfilePath, 'utf-8')

        // Check if PWA files are copied
        const pwaFilesInDockerfile = [
          'sw.js',
          'manifest.json',
          'icon-',
          'apple-touch-icon.png',
        ]

        let needsUpdate = false
        for (const file of pwaFilesInDockerfile) {
          if (!dockerfileContent.includes(file)) {
            needsUpdate = true
            result.dockerfileNeedsUpdate = true
            break
          }
        }

        if (needsUpdate) {
          result.warnings.push('Dockerfile may not copy all PWA files')
          console.log(chalk.yellow('  ⚠ Dockerfile may need updates to copy PWA files'))

          // Generate suggestions
          if (!dockerfileContent.includes('sw.js')) {
            result.dockerfileSuggestions.push('COPY sw.js /usr/share/nginx/html/')
          }
          if (!dockerfileContent.includes('manifest.json')) {
            result.dockerfileSuggestions.push('COPY manifest.json /usr/share/nginx/html/')
          }
          if (!dockerfileContent.includes('icon-')) {
            result.dockerfileSuggestions.push('COPY icon-*.png /usr/share/nginx/html/')
          }
          if (!dockerfileContent.includes('apple-touch-icon.png')) {
            result.dockerfileSuggestions.push('COPY apple-touch-icon.png /usr/share/nginx/html/')
          }

          if (result.dockerfileSuggestions.length > 0) {
            console.log(chalk.yellow('\n  Suggested Dockerfile additions:'))
            result.dockerfileSuggestions.forEach((suggestion) => {
              console.log(chalk.gray(`    ${suggestion}`))
            })
          }
        } else {
          console.log(chalk.green('  ✓ Dockerfile appears to copy PWA files'))
        }
      } else {
        console.log(chalk.gray('  ℹ No Dockerfile found (skipping Docker checks)'))
      }
    }

    // Determine success based on validation result
    result.success = validationResult.isValid && result.filesMissing.length === 0

    // Summary
    console.log(chalk.blue('\n📊 Summary:'))
    console.log(chalk.gray(`  Files found: ${result.filesFound.length}`))
    console.log(chalk.gray(`  Files missing: ${result.filesMissing.length}`))
    console.log(chalk.gray(`  Warnings: ${result.warnings.length}`))
    console.log(chalk.gray(`  Errors: ${result.errors.length}`))
    console.log(chalk.gray(`  PWA Score: ${validationResult.score}/100`))

    // Display detailed validation breakdown
    console.log(chalk.blue('\n📋 Validation Details:'))
    console.log(chalk.gray(`  Manifest: ${validationResult.details.manifest.exists ? '✓' : '✗'} ${validationResult.details.manifest.valid ? 'Valid' : 'Invalid'}`))
    console.log(chalk.gray(`  Icons: ${validationResult.details.icons.exists ? '✓' : '✗'} ${validationResult.details.icons.has192x192 ? '192✓' : '192✗'} ${validationResult.details.icons.has512x512 ? '512✓' : '512✗'}`))
    console.log(chalk.gray(`  Service Worker: ${validationResult.details.serviceWorker.exists ? '✓' : '✗'} ${validationResult.details.serviceWorker.valid ? 'Valid' : 'Invalid'}`))
    console.log(chalk.gray(`  Meta Tags: ${validationResult.details.metaTags.valid ? '✓ Valid' : '✗ Invalid'}`))
    console.log(chalk.gray(`  HTTPS: ${validationResult.details.https.isSecure ? '✓ Secure' : '⚠ Not verified'}`))

    if (result.success && validationResult.score >= 90) {
      console.log(chalk.green('\n✅ PWA setup is complete and highly compliant!'))
    } else if (result.success && validationResult.score >= 70) {
      console.log(chalk.yellow('\n⚠️  PWA setup is complete but could be improved.'))
    } else if (result.success) {
      console.log(chalk.yellow('\n⚠️  PWA setup is complete but has compliance issues.'))
    } else {
      console.log(chalk.red('\n❌ PWA setup has critical issues that need to be fixed.'))
      if (result.dockerfileNeedsUpdate) {
        console.log(chalk.yellow('\n💡 Tip: Update your Dockerfile to copy PWA files.'))
      }
    }

    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    result.errors.push(`Verification failed: ${errorMessage}`)
    console.log(chalk.red(`✗ Verification failed: ${errorMessage}`))
    return result
  }
}

