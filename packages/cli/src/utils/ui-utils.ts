/**
 * CLI UI Utilities - Design and formatting helpers
 * Provides ASCII art, styled prompts, and beautiful terminal output
 */

import chalk from "chalk";

/**
 * PWA ASCII Art Banner
 */
export function displayPWABanner(): void {
  const banner = `
${chalk.bold.cyan("╔════════════════════════════════════════════════════════════╗")}
${chalk.bold.cyan("║")}                                                            ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}  ${chalk.bold.magenta("╔══════╗  ╦ ╦  ╔═╗  ╔═╗")}                             ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}  ${chalk.bold.magenta("╠═╗ ╔═╝  ║║║  ╠═╣  ║ ║")}                             ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}  ${chalk.bold.magenta("║ ║ ╚═╗  ╚╩╝  ║ ║  ╚═╝")}                             ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}                                                            ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}  ${chalk.bold.yellow("Progressive Web App Generator")}                        ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}  ${chalk.dim("Transformez vos apps en PWA en quelques clics")}              ${chalk.bold.cyan("║")}
${chalk.bold.cyan("║")}                                                            ${chalk.bold.cyan("║")}
${chalk.bold.cyan("╚════════════════════════════════════════════════════════════╝")}
  `;
  console.log(banner);
}

/**
 * Display section header with styling
 */
export function displaySection(title: string, icon = "📋"): void {
  console.log();
  console.log(chalk.bold.cyan(`${icon} ${title}`));
  console.log(chalk.dim("─".repeat(60)));
}

/**
 * Display success message
 */
export function displaySuccess(message: string, details?: string): void {
  console.log(chalk.green(`✓ ${message}`));
  if (details) {
    console.log(chalk.gray(`  ${details}`));
  }
}

/**
 * Display info message with styled box
 */
export function displayInfo(title: string, content: string[]): void {
  console.log();
  console.log(chalk.blue(`┌ ${title}`));
  content.forEach((line) => {
    console.log(chalk.blue(`│ `) + chalk.gray(line));
  });
  console.log(chalk.blue("└"));
}

/**
 * Display warning with styling
 */
export function displayWarning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

/**
 * Display error with styling
 */
export function displayError(message: string, details?: string): void {
  console.log(chalk.red(`✗ ${message}`));
  if (details) {
    console.log(chalk.red(`  ${details}`));
  }
}

/**
 * Format a list of items with indentation
 */
export function formatList(items: string[]): string[] {
  return items.map((item) => `  ${chalk.gray("•")} ${item}`);
}

/**
 * Create a styled progress indicator
 */
export function createProgressBar(
  label: string,
  total: number,
): {
  start: () => void;
  update: (current: number, detail?: string) => void;
  stop: () => void;
} {
  let current = 0;

  return {
    start: () => {
      console.log(chalk.cyan(`\n▶ ${label}`));
    },
    update: (value: number, detail?: string) => {
      current = value;
      const percentage = Math.round((current / total) * 100);
      const filled = Math.round((percentage / 100) * 20);
      const empty = 20 - filled;
      const bar = `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
      const detailStr = detail ? chalk.gray(` - ${detail}`) : "";
      process.stdout.write(`\r  ${bar} ${percentage}%${detailStr}`.padEnd(80));
      if (current === total) {
        console.log();
      }
    },
    stop: () => {
      console.log();
    },
  };
}

/**
 * Display installation button preview with custom colors
 */
export function displayInstallButtonPreview(
  appName: string,
  themeColor: string,
  backgroundColor: string,
): void {
  console.log();
  console.log(chalk.cyan("┌─ Aperçu du bouton d'installation ─┐"));

  // Create a styled representation of the button
  console.log(
    chalk.white(
      `│ ${chalk.bgHex(backgroundColor)(
        chalk.hex(getContrastColor(backgroundColor))(
          ` 📥 Installer "${appName}" `,
        ),
      )} │`,
    ),
  );

  console.log(chalk.cyan("└────────────────────────────────────┘"));
  console.log();
  console.log(
    chalk.gray(
      `  Couleurs: Thème ${chalk.hex(themeColor)("●")} / Fond ${chalk.hex(backgroundColor)("●")}`,
    ),
  );
  console.log();
}

/**
 * Get contrasting text color for a background
 */
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Display configuration summary
 */
export function displayConfigurationSummary(config: {
  name: string;
  shortName: string;
  themeColor: string;
  backgroundColor: string;
  hasIcons: boolean;
  installButton: boolean;
}): void {
  console.log();
  console.log(chalk.bold.cyan("📱 Résumé de la configuration"));
  console.log(chalk.dim("─".repeat(60)));

  const items = [
    [chalk.gray("Nom de l'app:"), chalk.white(config.name)],
    [chalk.gray("Nom court:"), chalk.white(config.shortName)],
    [
      chalk.gray("Thème:"),
      chalk.hex(config.themeColor)("●"),
      chalk.white(config.themeColor),
    ],
    [
      chalk.gray("Fond:"),
      chalk.hex(config.backgroundColor)("●"),
      chalk.white(config.backgroundColor),
    ],
    [
      chalk.gray("Icônes PWA:"),
      config.hasIcons ? chalk.green("✓ Activées") : chalk.gray("✗ Désactivées"),
    ],
    [
      chalk.gray("Bouton install:"),
      config.installButton ? chalk.green("✓ Affiché") : chalk.gray("✗ Caché"),
    ],
  ];

  items.forEach(([label, ...values]) => {
    console.log(`${label.padEnd(20)} ${values.join(" ")}`);
  });

  console.log();
}

/**
 * Animated loading indicator
 */
export function createLoadingSpinner(message: string): {
  start: () => void;
  stop: (finalMessage?: string) => void;
} {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frameIndex = 0;
  let intervalId: NodeJS.Timeout | null = null;

  return {
    start: () => {
      intervalId = setInterval(() => {
        process.stdout.write(
          `\r${chalk.cyan(frames[frameIndex % frames.length])} ${message}`,
        );
        frameIndex++;
      }, 80);
    },
    stop: (finalMessage?: string) => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      process.stdout.write("\r");
      if (finalMessage) {
        console.log(chalk.green(`✓ ${finalMessage}`));
      } else {
        console.log();
      }
    },
  };
}

/**
 * Display next steps after initialization
 */
export function displayNextSteps(
  outputDir: string,
  hasServiceWorker: boolean,
): void {
  console.log();
  console.log(chalk.bold.cyan("📚 Prochaines étapes"));
  console.log(chalk.dim("─".repeat(60)));

  const steps = [
    [
      `${chalk.bold("1.")} Vérifier l'installation:`,
      `${chalk.gray("$")} pnpm universal-pwa verify`,
    ],
    [`${chalk.bold("2.")} Tester en local:`, `${chalk.gray("$")} npm run dev`],
    [
      `${chalk.bold("3.")} Déployer:`,
      `${chalk.gray("$")} npm run build && npm run deploy`,
    ],
  ];

  if (hasServiceWorker) {
    steps.push([
      `${chalk.bold("4.")} Service Worker:`,
      `${chalk.gray("Files générés dans")} ${chalk.cyan(outputDir)}`,
    ]);
  }

  steps.forEach(([label, command]) => {
    console.log(`  ${label}`);
    console.log(`    ${command}`);
  });

  console.log();
  console.log(chalk.green("✨ Bravo! Votre PWA est prête!"));
  console.log();
}
