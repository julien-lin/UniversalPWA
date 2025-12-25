# @julien-lin/universal-pwa-cli

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)

Interface en ligne de commande pour UniversalPWA - Transformez n'importe quel projet web en Progressive Web App (PWA) en un clic.

## Installation

```bash
npm install -g @julien-lin/universal-pwa-cli
```

Ou avec pnpm :

```bash
pnpm add -g @julien-lin/universal-pwa-cli
```

## Utilisation

### Commande `init`

Initialise une PWA dans votre projet.

#### Mode Interactif (Recommandé)

Exécutez simplement sans arguments pour lancer les prompts interactifs :

```bash
universal-pwa init
```

Le CLI vous guidera à travers :
- Nom de l'application (détecté automatiquement depuis `package.json`)
- Nom court (max 12 caractères)
- Chemin vers l'image source (détecté automatiquement dans les emplacements courants)
- Couleurs du thème et de fond
- Options de génération d'icônes

#### Mode Ligne de Commande

```bash
universal-pwa init [options]
```

**Options :**

- `-p, --project-path <path>` : Chemin du projet (défaut : répertoire courant)
- `-n, --name <name>` : Nom de l'application
- `-s, --short-name <shortName>` : Nom court (max 12 caractères)
- `-i, --icon-source <path>` : Image source pour les icônes
- `-t, --theme-color <color>` : Couleur du thème (hex, ex: `#2c3e50`)
- `-b, --background-color <color>` : Couleur de fond (hex)
- `--skip-icons` : Ignorer la génération d'icônes
- `--skip-service-worker` : Ignorer la génération du service worker
- `--skip-injection` : Ignorer l'injection des meta-tags
- `-o, --output-dir <dir>` : Répertoire de sortie (défaut : `public`)

**Exemple :**

```bash
universal-pwa init \
  --name "Mon Application" \
  --short-name "MonApp" \
  --icon-source ./logo.png \
  --theme-color "#2c3e50"
```

### Commande `scan`

Scanne un projet et détecte le framework, l'architecture et les assets.

```bash
universal-pwa scan [options]
```

**Options :**

- `-p, --project-path <path>` : Chemin du projet (défaut : répertoire courant)

**Exemple :**

```bash
universal-pwa scan
```

Affiche :
- Framework détecté (React, Vue, WordPress, etc.)
- Architecture (SPA, SSR, statique)
- Outil de build
- Assets trouvés (JS, CSS, images, polices)

### Commande `preview`

Prévisualise la configuration PWA d'un projet.

```bash
universal-pwa preview [options]
```

**Options :**

- `-p, --project-path <path>` : Chemin du projet (défaut : répertoire courant)
- `--port <port>` : Port du serveur (défaut : `3000`)
- `--open` : Ouvrir dans le navigateur

**Exemple :**

```bash
universal-pwa preview --port 8080
```

## Fichiers Générés

Après avoir exécuté `universal-pwa init`, les fichiers suivants sont générés :

- `manifest.json` - Fichier manifest PWA
- `sw.js` - Service Worker (Workbox)
- `sw-src.js` - Source du Service Worker (pour personnalisation)
- `icon-*.png` - Icônes PWA en multiples tailles (72x72 à 512x512)
- `apple-touch-icon.png` - Apple Touch Icon (180x180)
- `splash-*.png` - Splash screens pour iOS

Les meta tags sont automatiquement injectés dans vos fichiers HTML.

## API Programmatique

Vous pouvez également utiliser le CLI comme module :

```typescript
import { initCommand } from '@julien-lin/universal-pwa-cli'

const result = await initCommand({
  projectPath: './my-project',
  name: 'My App',
  iconSource: './icon.png',
})
```

## 💝 Sponsoring

Si UniversalPWA vous est utile, envisagez de [sponsoriser le projet](https://github.com/sponsors/julien-lin) pour aider à le maintenir et l'améliorer.

## Développement

```bash
# Installer les dépendances
pnpm install

# Build
pnpm build

# Tests
pnpm test

# Lint
pnpm lint
```

## Liens

- **Repository** : [https://github.com/julien-lin/UniversalPWA](https://github.com/julien-lin/UniversalPWA)
- **Issues** : [https://github.com/julien-lin/UniversalPWA/issues](https://github.com/julien-lin/UniversalPWA/issues)
- **Discussions** : [https://github.com/julien-lin/UniversalPWA/discussions](https://github.com/julien-lin/UniversalPWA/discussions)
- **Contribution** : [https://github.com/julien-lin/UniversalPWA/blob/main/CONTRIBUTING.md](https://github.com/julien-lin/UniversalPWA/blob/main/CONTRIBUTING.md)
- **Releases** : [https://github.com/julien-lin/UniversalPWA/releases](https://github.com/julien-lin/UniversalPWA/releases)
- **Sponsor** : [https://github.com/sponsors/julien-lin](https://github.com/sponsors/julien-lin)
- **Package npm** : [https://www.npmjs.com/package/@julien-lin/universal-pwa-cli](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)

