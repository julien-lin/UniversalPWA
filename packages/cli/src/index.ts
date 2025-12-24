#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { initCommand } from './commands/init.js'
import { previewCommand } from './commands/preview.js'
import { scanProject } from '@julien-lin/universal-pwa-core'

const program = new Command()

program
  .name('universal-pwa')
  .description('Transform any web project into a PWA with one click')
  .version('0.0.0')

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
      const result = await initCommand({
        projectPath: options.projectPath,
        name: options.name,
        shortName: options.shortName,
        iconSource: options.iconSource,
        themeColor: options.themeColor,
        backgroundColor: options.backgroundColor,
        skipIcons: options.skipIcons,
        skipServiceWorker: options.skipServiceWorker,
        skipInjection: options.skipInjection,
        outputDir: options.outputDir,
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

// Parse les arguments
program.parse()
