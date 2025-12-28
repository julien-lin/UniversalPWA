import inquirer from 'inquirer'
import { existsSync } from 'fs'
import { join, extname } from 'path'
import chalk from 'chalk'
import type { Framework } from '@julien-lin/universal-pwa-core'
import { detectEnvironment, type Environment } from './utils/environment-detector.js'
import { generateSuggestions } from './utils/suggestions.js'

export interface PromptAnswers {
  environment: Environment
  name: string
  shortName: string
  iconSource?: string
  themeColor?: string
  backgroundColor?: string
  skipIcons?: boolean
}


/**
 * Prompts interactifs pour initialiser la PWA
 */
export async function promptInitOptions(
  projectPath: string,
  framework: Framework | null,
  architecture: 'spa' | 'ssr' | 'static' | null = null,
): Promise<PromptAnswers> {
  // Générer toutes les suggestions intelligentes
  const suggestions = generateSuggestions(projectPath, framework, architecture)
  
  const defaultName = suggestions.name.name
  const defaultShortName = suggestions.name.shortName
  const defaultIconSource = suggestions.icons.length > 0 ? suggestions.icons[0].path : undefined

  // Détecter l'environnement automatiquement
  const envDetection = detectEnvironment(projectPath, framework)

  console.log(chalk.blue('\n📋 Configuration PWA\n'))

  // Afficher les suggestions si disponibles
  if (suggestions.name.confidence === 'high') {
    console.log(chalk.gray(`💡 Suggestion: Nom "${suggestions.name.name}" (${suggestions.name.source})`))
  }
  if (suggestions.icons.length > 0) {
    console.log(chalk.gray(`💡 Suggestion: ${suggestions.icons.length} icône(s) trouvée(s)`))
  }
  if (suggestions.colors.confidence === 'high') {
    console.log(chalk.gray(`💡 Suggestion: Couleurs basées sur ${framework}`))
  }

  // Phase 1 : Choix de l'environnement
  const environmentAnswer = await inquirer.prompt<{ environment: Environment }>([
    {
      type: 'list',
      name: 'environment',
      message: 'Environnement de génération:',
      choices: [
        {
          name: `Local (développement) - Génère dans public/`,
          value: 'local',
          short: 'Local',
        },
        {
          name: `Production (build) - Génère dans ${envDetection.suggestedOutputDir}/`,
          value: 'production',
          short: 'Production',
        },
      ],
      default: envDetection.environment,
    },
  ])

  if (envDetection.indicators.length > 0) {
    console.log(chalk.gray(`  ${envDetection.indicators.join(', ')}`))
  }

  // Phase 2 : Configuration de l'application
  const configAnswers = await inquirer.prompt<Omit<PromptAnswers, 'environment'>>([
    {
      type: 'input',
      name: 'name',
      message: 'Nom de l\'application:',
      default: defaultName,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Le nom de l\'application est requis'
        }
        if (input.length > 50) {
          return 'Le nom doit faire moins de 50 caractères'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'shortName',
      message: 'Nom court (max 12 caractères, pour l\'écran d\'accueil):',
      default: (answers: { name?: string }) => {
        return answers.name ? answers.name.substring(0, 12) : defaultShortName
      },
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return 'Le nom court est requis'
        }
        if (input.length > 12) {
          return 'Le nom court doit faire maximum 12 caractères'
        }
        return true
      },
      filter: (input: string) => input.trim().substring(0, 12),
    },
    {
      type: 'input',
      name: 'iconSource',
      message: 'Chemin vers l\'image source pour les icônes:',
      default: defaultIconSource,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return true // Optionnel
        }
        const fullPath = existsSync(input) ? input : join(projectPath, input)
        if (!existsSync(fullPath)) {
          const suggestions = [
            'public/logo.png',
            'src/assets/icon.png',
            'assets/logo.png',
            'logo.png',
          ].join(', ')
          return `Le fichier n'existe pas: ${input}\nSuggestions: ${suggestions}`
        }
        // Valider le format
        const ext = extname(fullPath).toLowerCase()
        const supportedFormats = ['.png', '.jpg', '.jpeg', '.svg', '.webp']
        if (!supportedFormats.includes(ext)) {
          return `Format non supporté: ${ext}. Utilisez PNG, JPG, SVG ou WebP`
        }
        return true
      },
    },
    {
      type: 'confirm',
      name: 'skipIcons',
      message: 'Générer les icônes PWA à partir de cette image?',
      default: true,
      when: (answers: { iconSource?: string }) => {
        return answers.iconSource && answers.iconSource.trim().length > 0
      },
    },
    {
      type: 'input',
      name: 'themeColor',
      message: 'Couleur du thème (hex, ex: #ffffff):',
      default: suggestions.colors.themeColor,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return true // Optionnel
        }
        const trimmed = input.trim()
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) {
          return 'Format hex invalide (ex: #ffffff ou #fff)'
        }
        return true
      },
      filter: (input: string) => {
        // Normaliser vers format 6 caractères si format 3
        const trimmed = input.trim()
        if (/^#[A-Fa-f0-9]{3}$/.test(trimmed)) {
          return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
        }
        return trimmed
      },
    },
    {
      type: 'input',
      name: 'backgroundColor',
      message: 'Couleur de fond (hex, ex: #000000):',
      default: suggestions.colors.backgroundColor,
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return true // Optionnel
        }
        const trimmed = input.trim()
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) {
          return 'Format hex invalide (ex: #000000 ou #000)'
        }
        return true
      },
      filter: (input: string) => {
        // Normaliser vers format 6 caractères si format 3
        const trimmed = input.trim()
        if (/^#[A-Fa-f0-9]{3}$/.test(trimmed)) {
          return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
        }
        return trimmed
      },
    },
  ])

  // If skipIcons is true, invert the logic (skipIcons = false means generate)
  configAnswers.skipIcons = !configAnswers.skipIcons

  // Si aucune source d'icône, skipIcons = true
  if (!configAnswers.iconSource || configAnswers.iconSource.trim().length === 0) {
    configAnswers.skipIcons = true
  }

  // Final validation to ensure required values are defined
  if (!configAnswers.name || configAnswers.name.trim().length === 0) {
    configAnswers.name = defaultName
  }
  if (!configAnswers.shortName || configAnswers.shortName.trim().length === 0) {
    configAnswers.shortName = defaultShortName
  }

  return {
    ...environmentAnswer,
    ...configAnswers,
  }
}

