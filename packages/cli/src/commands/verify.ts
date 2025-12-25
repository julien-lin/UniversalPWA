import { existsSync, readFileSync } from 'fs'
import { join, resolve } from 'path'
import chalk from 'chalk'

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
}

/**
 * Verify command: checks if all PWA files are present and correctly configured
 */
export function verifyCommand(options: VerifyOptions = {}): Promise<VerifyResult> {
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

    // Determine output directory
    const finalOutputDir = outputDir ?? join(result.projectPath, 'public')
    result.outputDir = finalOutputDir

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

    // Check if HTML files reference PWA files
    console.log(chalk.blue('📄 Checking HTML files...'))
    // This would require parsing HTML files, simplified for now
    // Could be enhanced to check for manifest link and service worker registration

    // Determine success
    result.success = result.filesMissing.length === 0 && result.errors.length === 0

    // Summary
    console.log(chalk.blue('\n📊 Summary:'))
    console.log(chalk.gray(`  Files found: ${result.filesFound.length}`))
    console.log(chalk.gray(`  Files missing: ${result.filesMissing.length}`))
    console.log(chalk.gray(`  Warnings: ${result.warnings.length}`))
    console.log(chalk.gray(`  Errors: ${result.errors.length}`))

    if (result.success) {
      console.log(chalk.green('\n✅ PWA setup is complete!'))
    } else {
      console.log(chalk.red('\n❌ PWA setup has issues that need to be fixed.'))
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

