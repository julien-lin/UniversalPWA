import { existsSync } from "fs";
import { join, extname } from "path";
import chalk from "chalk";
import type { Framework } from "@julien-lin/universal-pwa-core";
import {
  detectEnvironment,
  type Environment,
} from "./utils/environment-detector.js";
import { generateSuggestions } from "./utils/suggestions.js";
import inquirer from "inquirer";

export interface PromptAnswers {
  environment: Environment;
  name: string;
  shortName: string;
  iconSource?: string;
  themeColor?: string;
  backgroundColor?: string;

  /**
   * true = ne pas générer les icônes
   * false = générer les icônes
   */
  skipIcons?: boolean;

  /**
   * Optionnel : si tu l’utilises réellement ailleurs
   */
  installButton?: boolean;
}

// Validators exported for testing
export function validateName(input: string): string | true {
  if (!input || input.trim().length === 0) {
    return "Le nom de l'application est requis";
  }
  if (input.length > 50) {
    return "Le nom doit faire moins de 50 caractères";
  }
  return true;
}

export function validateShortName(input: string): string | true {
  if (!input || input.trim().length === 0) {
    return "Le nom court est requis";
  }
  if (input.length > 12) {
    return "Le nom court doit faire maximum 12 caractères";
  }
  return true;
}

export function filterShortName(input: string): string {
  return input.trim().substring(0, 12);
}

export function validateIconSource(
  input: string,
  projectPath: string,
): string | true {
  if (!input || input.trim().length === 0) {
    return true; // Optionnel
  }

  const fullPath = existsSync(input) ? input : join(projectPath, input);
  if (!existsSync(fullPath)) {
    const suggestions = [
      "public/logo.png",
      "src/assets/icon.png",
      "assets/logo.png",
      "logo.png",
    ].join(", ");
    return `Le fichier n'existe pas: ${input}\nSuggestions: ${suggestions}`;
  }

  const ext = extname(fullPath).toLowerCase();
  const supportedFormats = [".png", ".jpg", ".jpeg", ".svg", ".webp"];
  if (!supportedFormats.includes(ext)) {
    return `Format non supporté: ${ext}. Utilisez PNG, JPG, SVG ou WebP`;
  }

  return true;
}

export function validateHexColor(
  input: string,
  fieldName: string,
): string | true {
  if (!input || input.trim().length === 0) {
    return true; // Optionnel
  }
  const trimmed = input.trim();
  if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmed)) {
    return `Format hex invalide (ex: ${
      fieldName === "themeColor" ? "#ffffff ou #fff" : "#000000 ou #000"
    })`;
  }
  return true;
}

export function filterHexColor(input: string): string {
  const trimmed = input.trim();
  if (/^#[A-Fa-f0-9]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return trimmed;
}

/**
 * Prompts interactifs pour initialiser la PWA
 */
export async function promptInitOptions(
  projectPath: string,
  framework: Framework | null,
  architecture: "spa" | "ssr" | "static" | null = null,
): Promise<PromptAnswers> {
  const suggestions = generateSuggestions(projectPath, framework, architecture);

  const defaultName = suggestions.name.name;
  const defaultShortName = suggestions.name.shortName;
  const defaultIconSource =
    suggestions.icons.length > 0 ? suggestions.icons[0].path : undefined;

  const envDetection = detectEnvironment(projectPath, framework);

  console.log(chalk.blue("\n📋 Configuration PWA\n"));

  if (suggestions.name.confidence === "high") {
    console.log(
      chalk.gray(
        `💡 Suggestion: Nom "${suggestions.name.name}" (${suggestions.name.source})`,
      ),
    );
  }
  if (suggestions.icons.length > 0) {
    console.log(
      chalk.gray(
        `💡 Suggestion: ${suggestions.icons.length} icône(s) trouvée(s)`,
      ),
    );
  }
  if (suggestions.colors.confidence === "high") {
    console.log(chalk.gray(`💡 Suggestion: Couleurs basées sur ${framework}`));
  }

  // Phase 1 : Choix de l'environnement
  const environmentAnswer = await inquirer.prompt<{ environment: Environment }>(
    [
      {
        type: "list",
        name: "environment",
        message: chalk.bold("🎯 Où générer les fichiers PWA?"),
        choices: [
          {
            name: `${chalk.green("✓")} Local (développement) - Génère dans public/`,
            value: "local",
            short: "Local",
          },
          {
            name: `${chalk.cyan("📦")} Production (build) - Génère dans ${envDetection.suggestedOutputDir}/`,
            value: "production",
            short: "Production",
          },
        ],
        default: envDetection.environment,
      },
    ],
  );

  if (envDetection.indicators.length > 0) {
    console.log(chalk.gray(`  ${envDetection.indicators.join(", ")}`));
  }

  // Phase 2 : Configuration de l'application
  type ConfigAnswers = {
    name: string;
    shortName: string;
    iconSource?: string;
    themeColor?: string;
    backgroundColor?: string;
    /**
     * true = générer les icônes
     * false = ne pas générer
     */
    generateIcons?: boolean;
    installButton?: boolean;
  };

  const questions = [
    {
      type: "input",
      name: "name",
      message: chalk.bold("📱 Nom de l'application:"),
      default: defaultName,
      validate: validateName,
      prefix: chalk.cyan("?"),
    },
    {
      type: "input",
      name: "shortName",
      message: chalk.bold(
        "📌 Nom court (max 12 caractères, pour l'écran d'accueil):",
      ),
      default: (answers: Partial<ConfigAnswers>) =>
        answers.name ? answers.name.substring(0, 12) : defaultShortName,
      validate: validateShortName,
      filter: filterShortName,
      prefix: chalk.cyan("?"),
    },
    {
      type: "input",
      name: "iconSource",
      message: chalk.bold("🎨 Chemin vers l'image source pour les icônes:"),
      default: defaultIconSource,
      validate: (input: string) => validateIconSource(input, projectPath),
      prefix: chalk.cyan("?"),
    },
    {
      type: "confirm",
      name: "generateIcons",
      message: chalk.bold(
        "🖼️  Générer les icônes PWA à partir de cette image?",
      ),
      default: true,
      when: (answers: Partial<ConfigAnswers>) =>
        Boolean(answers.iconSource && answers.iconSource.trim().length > 0),
      prefix: chalk.cyan("?"),
    },
    {
      type: "input",
      name: "themeColor",
      message: chalk.bold("🎨 Couleur du thème (hex, ex: #ffffff):"),
      default: suggestions.colors.themeColor,
      validate: (input: string) => validateHexColor(input, "themeColor"),
      filter: filterHexColor,
      prefix: chalk.cyan("?"),
    },
    {
      type: "input",
      name: "backgroundColor",
      message: chalk.bold("⬜ Couleur de fond (hex, ex: #000000):"),
      default: suggestions.colors.backgroundColor,
      validate: (input: string) => validateHexColor(input, "backgroundColor"),
      filter: filterHexColor,
      prefix: chalk.cyan("?"),
    },
    // Si tu veux garder installButton en prompt (sinon supprime)
    // {
    //   type: "confirm",
    //   name: "installButton",
    //   message: chalk.bold("➕ Ajouter un bouton d'installation (Chrome/Edge)?"),
    //   default: true,
    //   prefix: chalk.cyan("?"),
    // },
  ] as const;

  const configAnswers = await inquirer.prompt<ConfigAnswers>(questions);

  // Normalisation finale
  const name = configAnswers.name?.trim() || defaultName;
  const shortName = configAnswers.shortName?.trim() || defaultShortName;

  const iconSource = configAnswers.iconSource?.trim() || "";
  const hasIconSource = iconSource.length > 0;

  // generateIcons is undefined if iconSource is empty (question not asked)
  // If iconSource exists and generateIcons is true → skipIcons should be false (generate them)
  // If iconSource is empty or generateIcons is false → skipIcons should be true (skip them)
  const generateIcons = Boolean(configAnswers.generateIcons);
  const skipIcons = !hasIconSource || !generateIcons;

  const installButton = configAnswers.installButton ?? true;

  return {
    ...environmentAnswer,
    name,
    shortName,
    iconSource: hasIconSource ? iconSource : "",
    themeColor: configAnswers.themeColor,
    backgroundColor: configAnswers.backgroundColor,
    skipIcons,
    installButton,
  };
}
