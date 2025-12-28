#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initCommand } from './commands/init.js'
import { previewCommand } from './commands/preview.js'
import { verifyCommand } from './commands/verify.js'
import { scanProject } from '@julien-lin/universal-pwa-core'
import { promptInitOptions } from './prompts.js'

// Read version from package.json
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const packageJsonPath = join(__dirname, '../package.json')

interface PackageJson {
  version?: string
}

let version = '0.0.0'
try {
  const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonContent) as PackageJson
  version = packageJson.version || '0.0.0'
} catch {
  // If package.json cannot be read, use default version
  version = '0.0.0'
}

const program = new Command()

program
  .name('universal-pwa')
  .description('Transform any web project into a PWA with one click')
  .version(version)

// Commande init
program
  .command('init')
  .description('Initialize PWA in your project')
  .option('-p, --project-path <path>', 'Project path', process.cwd())
  .option('-n, --name <name>', 'App name')
  .option('-s, --short-name <shortName>', 'App short name (max 12 chars)')
  .option('-i, --icon-source <path>', 'Source image for icons')
  .option('-t, --theme-color <color>', 'Theme color (hex)')
  .option('-b, --background-color <color>', 'Background color (hex)')
  .option('--skip-icons', 'Skip icon generation')
  .option('--skip-service-worker', 'Skip service worker generation')
  .option('--skip-injection', 'Skip HTML meta-tag injection')
  .option('-o, --output-dir <dir>', 'Output directory', 'public')
  .action(async (options: {
    projectPath?: string
    name?: string
    shortName?: string
    iconSource?: string
    themeColor?: string
    backgroundColor?: string
    skipIcons?: boolean
    skipServiceWorker?: boolean
    skipInjection?: boolean
    outputDir?: string
  }) => {
    try {
      const projectPath = options.projectPath ?? process.cwd()

      // If no options provided, use interactive mode
      const hasOptions = options.name || options.shortName || options.iconSource ||
        options.themeColor || options.backgroundColor || options.skipIcons !== undefined

      let finalOptions = { ...options }

      if (!hasOptions) {
        // Interactive mode: scan first to detect framework
        console.log(chalk.blue('🔍 Scanning project...'))
        const scanResult = await scanProject({
          projectPath,
          includeAssets: false,
          includeArchitecture: false,
        })

        // Display scan results
        console.log(chalk.green(`✓ Framework detected: ${scanResult.framework.framework ?? 'Unknown'}`))
        console.log(chalk.green(`✓ Architecture: ${scanResult.architecture.architecture}`))

        // Launch prompts
        const promptAnswers = await promptInitOptions(projectPath, scanResult.framework.framework)

        // Ajuster outputDir selon environnement choisi
        if (promptAnswers.environment === 'production') {
          // Vérifier que dist/ existe et contient des fichiers buildés
          const { detectEnvironment } = await import('./utils/environment-detector.js')
          const envDetection = detectEnvironment(projectPath, scanResult.framework.framework)
          
          if (envDetection.suggestedOutputDir === 'dist') {
            finalOptions.outputDir = 'dist'
          } else if (envDetection.suggestedOutputDir === 'build') {
            finalOptions.outputDir = 'build'
          } else {
            finalOptions.outputDir = 'dist'
            console.log(chalk.yellow('⚠ dist/ directory not found. Run build first:'))
            console.log(chalk.gray('  npm run build'))
            console.log(chalk.gray('  or'))
            console.log(chalk.gray('  pnpm build'))
          }
        } else {
          finalOptions.outputDir = 'public'
        }

        // Merge prompt answers with options
        // Ensure all values are properly defined
        finalOptions = {
          ...options,
          name: promptAnswers.name?.trim() || 'My PWA',
          shortName: promptAnswers.shortName?.trim() || promptAnswers.name?.trim().substring(0, 12) || 'PWA',
          iconSource: (promptAnswers.iconSource && promptAnswers.iconSource.trim().length > 0) ? promptAnswers.iconSource.trim() : undefined,
          themeColor: (promptAnswers.themeColor && promptAnswers.themeColor.trim().length > 0) ? promptAnswers.themeColor.trim() : undefined,
          backgroundColor: (promptAnswers.backgroundColor && promptAnswers.backgroundColor.trim().length > 0) ? promptAnswers.backgroundColor.trim() : undefined,
          skipIcons: promptAnswers.skipIcons,
        }
      }

      const result = await initCommand({
        projectPath: finalOptions.projectPath,
        name: finalOptions.name,
        shortName: finalOptions.shortName,
        iconSource: finalOptions.iconSource,
        themeColor: finalOptions.themeColor,
        backgroundColor: finalOptions.backgroundColor,
        skipIcons: finalOptions.skipIcons,
        skipServiceWorker: finalOptions.skipServiceWorker,
        skipInjection: finalOptions.skipInjection,
        outputDir: finalOptions.outputDir,
      })
      process.exit(result.success ? 0 : 1)
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

// Commande preview
program
  .command('preview')
  .description('Preview PWA setup')
  .option('-p, --project-path <path>', 'Project path', process.cwd())
  .option('--port <port>', 'Server port', '3000')
  .option('--open', 'Open in browser', false)
  .action(async (options: {
    projectPath?: string
    port?: string
    open?: boolean
  }) => {
    try {
      const result = await previewCommand({
        projectPath: options.projectPath,
        port: options.port ? Number.parseInt(options.port, 10) : undefined,
        open: options.open,
      })
      process.exit(result.success ? 0 : 1)
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

// Commande scan
program
  .command('scan')
  .description('Scan project and detect framework/architecture')
  .option('-p, --project-path <path>', 'Project path', process.cwd())
  .action(async (options: { projectPath?: string }) => {
    try {
      console.log(chalk.blue('🔍 Scanning project...'))

      const result = await scanProject({
        projectPath: options.projectPath ?? process.cwd(),
        includeAssets: true,
        includeArchitecture: true,
      })

      console.log(chalk.green(`\n✓ Framework: ${result.framework.framework ?? 'Unknown'}`))
      console.log(chalk.green(`✓ Architecture: ${result.architecture.architecture}`))
      console.log(chalk.green(`✓ Build Tool: ${result.architecture.buildTool ?? 'Unknown'}`))
      console.log(chalk.gray(`\nAssets found:`))
      console.log(chalk.gray(`  - JavaScript: ${result.assets.javascript.length} files`))
      console.log(chalk.gray(`  - CSS: ${result.assets.css.length} files`))
      console.log(chalk.gray(`  - Images: ${result.assets.images.length} files`))
      console.log(chalk.gray(`  - Fonts: ${result.assets.fonts.length} files`))

      process.exit(0)
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

// Commande verify
program
  .command('verify')
  .description('Verify PWA setup and check for missing files')
  .option('-p, --project-path <path>', 'Project path', process.cwd())
  .option('-o, --output-dir <dir>', 'Output directory', 'public')
  .option('--no-docker', 'Skip Dockerfile checks')
  .action(async (options: {
    projectPath?: string
    outputDir?: string
    docker?: boolean
  }) => {
    try {
      const result = await verifyCommand({
        projectPath: options.projectPath,
        outputDir: options.outputDir,
        checkDocker: options.docker !== false,
      })
      process.exit(result.success ? 0 : 1)
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

// Parse arguments
program.parse()
