import inquirer from 'inquirer'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import type { Framework } from '@julien-lin/universal-pwa-core'

export interface PromptAnswers {
  name: string
  shortName: string
  iconSource?: string
  themeColor?: string
  backgroundColor?: string
  skipIcons?: boolean
}

interface PackageJson {
  name?: string
}

/**
 * Détecte le nom du projet depuis package.json
 */
function detectProjectName(projectPath: string): string | undefined {
  try {
    const packageJsonPath = join(projectPath, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJsonContent = readFileSync(packageJsonPath, 'utf-8')
      const packageJson = JSON.parse(packageJsonContent) as PackageJson
      return packageJson.name || undefined
    }
  } catch {
    // Ignore errors
  }
  return undefined
}

/**
 * Trouve une image source par défaut dans le projet
 */
function findDefaultIconSource(projectPath: string): string | undefined {
  const commonPaths = [
    'public/logo.png',
    'public/icon.png',
    'public/favicon.png',
    'src/assets/logo.png',
    'src/assets/icon.png',
    'assets/logo.png',
    'assets/icon.png',
    'logo.png',
    'icon.png',
  ]

  for (const path of commonPaths) {
    const fullPath = join(projectPath, path)
    if (existsSync(fullPath)) {
      return path
    }
  }
  return undefined
}

/**
 * Prompts interactifs pour initialiser la PWA
 */
export async function promptInitOptions(
  projectPath: string,
  framework: Framework | null,
): Promise<PromptAnswers> {
  const detectedName = detectProjectName(projectPath)
  const defaultIconSource = findDefaultIconSource(projectPath)
  const defaultName = detectedName || (framework ? `${framework} App` : 'My PWA')
  const defaultShortName = defaultName.substring(0, 12)

  console.log(chalk.blue('\n📋 Configuration PWA\n'))

  const answers = await inquirer.prompt<PromptAnswers>([
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
      message: 'Nom court (max 12 caractères):',
      default: defaultShortName,
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
          return `Le fichier n'existe pas: ${input}`
        }
        return true
      },
    },
    {
      type: 'confirm',
      name: 'skipIcons',
      message: 'Générer les icônes PWA?',
      default: true,
    },
    {
      type: 'input',
      name: 'themeColor',
      message: 'Couleur du thème (hex, ex: #ffffff):',
      default: '#ffffff',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return true // Optionnel
        }
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(input.trim())) {
          return 'Format hex invalide (ex: #ffffff)'
        }
        return true
      },
    },
    {
      type: 'input',
      name: 'backgroundColor',
      message: 'Couleur de fond (hex, ex: #000000):',
      default: '#000000',
      validate: (input: string) => {
        if (!input || input.trim().length === 0) {
          return true // Optionnel
        }
        if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(input.trim())) {
          return 'Format hex invalide (ex: #000000)'
        }
        return true
      },
    },
  ])

  // Si skipIcons est true, on inverse la logique (skipIcons = false signifie générer)
  answers.skipIcons = !answers.skipIcons

  // Validation finale pour s'assurer que les valeurs requises sont définies
  if (!answers.name || answers.name.trim().length === 0) {
    answers.name = defaultName
  }
  if (!answers.shortName || answers.shortName.trim().length === 0) {
    answers.shortName = defaultShortName
  }

  return answers
}

