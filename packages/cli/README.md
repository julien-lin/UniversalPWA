# @julien-lin/universal-pwa-cli

Interface en ligne de commande pour UniversalPWA.

## Installation

```bash
npm install -g @julien-lin/universal-pwa-cli
```

## Utilisation

### Commande `init`

Initialise une PWA dans votre projet.

```bash
universal-pwa init [options]
```

**Options :**

- `-p, --project-path <path>` : Chemin du projet (défaut: répertoire courant)
- `-n, --name <name>` : Nom de l'application
- `-s, --short-name <shortName>` : Nom court (max 12 caractères)
- `-i, --icon-source <path>` : Image source pour les icônes
- `-t, --theme-color <color>` : Couleur du thème (hex, ex: `#2c3e50`)
- `-b, --background-color <color>` : Couleur de fond (hex)
- `--skip-icons` : Ignorer la génération d'icônes
- `--skip-service-worker` : Ignorer la génération du service worker
- `--skip-injection` : Ignorer l'injection des meta-tags
- `-o, --output-dir <dir>` : Répertoire de sortie (défaut: `public`)

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

- `-p, --project-path <path>` : Chemin du projet (défaut: répertoire courant)

**Exemple :**

```bash
universal-pwa scan
```

### Commande `preview`

Prévisualise la configuration PWA d'un projet.

```bash
universal-pwa preview [options]
```

**Options :**

- `-p, --project-path <path>` : Chemin du projet (défaut: répertoire courant)
- `--port <port>` : Port du serveur (défaut: `3000`)
- `--open` : Ouvrir dans le navigateur

**Exemple :**

```bash
universal-pwa preview --port 8080
```

## API Programmatique

Vous pouvez également utiliser le CLI comme module :

```typescript
import { initCommand } from '@universal-pwa/cli'

const result = await initCommand({
  projectPath: './my-project',
  name: 'My App',
  iconSource: './icon.png',
})
```

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
