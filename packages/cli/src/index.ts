#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { initCommand } from './commands/init.js'
import { previewCommand } from './commands/preview.js'
import { verifyCommand } from './commands/verify.js'
import { removeCommand } from './commands/remove.js'
import { generateConfigCommand } from './commands/generate-config.js'
import { scanProject } from '@julien-lin/universal-pwa-core'
import { promptInitOptions } from './prompts.js'
import packageJson from '../package.json' with { type: 'json' }

interface PackageJson {
  version?: string
}

type ConfigFormat = 'ts' | 'js' | 'json' | 'yaml'

const version = (packageJson as PackageJson).version || '0.0.0'

const program = new Command()

const normalizeConfigFormat = (value?: string): ConfigFormat => {
  const format = (value ?? 'ts').toLowerCase()
  if (format === 'yml') {
    return 'yaml'
  }
  if (format === 'ts' || format === 'js' || format === 'json' || format === 'yaml') {
    return format
  }
  throw new Error(`Invalid format: ${value ?? 'undefined'}`)
}

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
  .option('--force-scan', 'Force scan (bypass cache)')
  .option('--no-cache', 'Disable cache')
  .option('--max-html-files <number>', 'Maximum number of HTML files to process (default: unlimited)', (value) => Number.parseInt(value, 10))
  .option('--html-extensions <extensions>', 'Comma-separated HTML/template extensions (e.g. html,twig,blade.php,j2)', (value: string) => value ? value.split(',').map((s) => s.trim()).filter(Boolean) : undefined)
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
    forceScan?: boolean
    noCache?: boolean
    maxHtmlFiles?: number
    htmlExtensions?: string[]
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

        // Launch prompts with suggestions
        const promptAnswers = await promptInitOptions(
          projectPath,
          scanResult.framework.framework,
          scanResult.architecture.architecture,
        )

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
        forceScan: options.forceScan,
        noCache: options.noCache,
        maxHtmlFiles: options.maxHtmlFiles,
        htmlExtensions: options.htmlExtensions,
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

// Commande generate-config
program
  .command('generate-config')
  .description('Generate universal-pwa config file from scan')
  .option('-p, --project-path <path>', 'Project path', process.cwd())
  .option('-f, --format <format>', 'Config format (ts|js|json|yaml)', 'ts')
  .option('-o, --output <file>', 'Output file name')
  .option('--non-interactive', 'Skip prompts')
  .action(async (options: {
    projectPath?: string
    format?: string
    output?: string
    nonInteractive?: boolean
  }) => {
    try {
      const format = normalizeConfigFormat(options.format)
      const result = await generateConfigCommand({
        projectPath: options.projectPath,
        format,
        interactive: !options.nonInteractive,
        output: options.output,
      })
      process.exit(result.success ? 0 : 1)
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

// Commande remove
program
  .command('remove')
  .description('Remove PWA files and restore HTML files')
  .option('-p, --project-path <path>', 'Project path', process.cwd())
  .option('-o, --output-dir <dir>', 'Output directory (auto-detected if not specified)')
  .option('--skip-html-restore', 'Skip HTML file restoration')
  .option('--skip-files', 'Skip PWA file removal')
  .option('--force', 'Force removal without confirmation')
  .action(async (options: {
    projectPath?: string
    outputDir?: string
    skipHtmlRestore?: boolean
    skipFiles?: boolean
    force?: boolean
  }) => {
    try {
      const result = await removeCommand({
        projectPath: options.projectPath,
        outputDir: options.outputDir,
        skipHtmlRestore: options.skipHtmlRestore,
        skipFiles: options.skipFiles,
        force: options.force,
      })
      process.exit(result.success ? 0 : 1)
    } catch (error) {
      console.error(chalk.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
      process.exit(1)
    }
  })

// Parse arguments
program.parse()
