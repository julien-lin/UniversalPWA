# @julien-lin/universal-pwa-cli

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)

Interface en ligne de commande pour UniversalPWA - Transformez n'importe quel projet web en Progressive Web App (PWA) en un clic.

## Démarrage Rapide (Sans Installation)

```bash
npx @julien-lin/universal-pwa-cli init
```

Cette commande va :

- Vous guider à travers une configuration interactive
- Générer tous les assets PWA (icônes, manifest, service worker)
- Injecter les meta tags dans vos fichiers HTML

Aucune installation globale nécessaire !

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

#### ⚠️ Important : Workflow pour les Builds de Production

Pour les projets utilisant des outils de build (React, Vite, Vue, etc.), **toujours builder d'abord**, puis initialiser la PWA :

```bash
# 1. Builder votre projet d'abord (génère les assets avec hash)
npm run build
# ou
pnpm build
# ou
yarn build

# 2. Puis initialiser la PWA (le CLI détectera automatiquement dist/)
universal-pwa init --output-dir dist
```

**Pourquoi ?** Le service worker doit precacher tous vos assets buildés (JS/CSS avec hash). Si vous initialisez avant de builder, le service worker ne connaîtra pas les noms de fichiers hashés.

Le CLI détecte automatiquement le répertoire `dist/` pour les projets React/Vite s'il existe. Vous pouvez aussi le spécifier explicitement avec `--output-dir dist`.

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
- `-o, --output-dir <dir>` : Répertoire de sortie (détecte automatiquement `dist/` pour React/Vite, sinon `public/`)
- `--base-path <path>` : Chemin de base pour le déploiement (ex: `/app/`, `/api/pwa/`)

**Exemples :**

```bash
# Pour un build de production (React/Vite)
npm run build
universal-pwa init --output-dir dist --icon-source ./logo.png

# Pour le développement ou sites statiques
universal-pwa init \
  --name "Mon Application" \
  --short-name "MonApp" \
  --icon-source ./logo.png \
  --theme-color "#2c3e50"

# Pour un déploiement sous un sous-chemin
universal-pwa init \
  --name "CreativeHub" \
  --output-dir public \
  --base-path "/creativehub/"

# Pour une PWA basée sur une API
universal-pwa init \
  --name "PWA API" \
  --output-dir dist \
  --base-path "/api/pwa/"
```

### Déploiement Sous un Sous-chemin

Si votre PWA est déployée sous un sous-chemin (ex: derrière un reverse proxy ou sur un domaine partagé), utilisez l'option `--base-path` pour assurer que toutes les ressources sont correctement scoped.

#### Quand Utiliser `--base-path`

- **Reverse Proxy/Load Balancer**: App servie à `/app/` au lieu de `/`
- **Plusieurs PWA sur le Même Domaine**: Chaque PWA a son propre chemin
- **Hébergement Partagé**: PWA dans un sous-répertoire comme `/pwa/` ou `/myapp/`
- **PWA Montée sur une API**: Servie depuis `/api/v1/pwa/`

#### Comment Ça Fonctionne

Quand vous spécifiez `--base-path /app/`:

- Le lien manifest devient: `<link rel="manifest" href="/app/manifest.json">`
- Le Service Worker est enregistré à: `/app/sw.js`
- Toutes les ressources sont scoped au chemin `/app/`

Cela garantit:

- ✅ Le manifest est trouvé au bon chemin
- ✅ Le Service Worker fonctionne dans le bon scope
- ✅ Pas de conflits avec d'autres apps sur le même domaine

#### Exemples

**Projet Symfony** - Déployé sous le chemin `/creative-hub/`:

```bash
npm run build
universal-pwa init \
  --name "Creative Hub" \
  --output-dir public \
  --base-path "/creative-hub/"
```

**Next.js avec Chemin Personnalisé**:

```bash
pnpm build
universal-pwa init \
  --output-dir .next \
  --base-path "/dashboard/"
```

**Site Statique sur Hébergement Partagé** - Déployé à `example.com/apps/myapp/`:

```bash
universal-pwa init \
  --name "Mon App" \
  --output-dir dist \
  --base-path "/apps/myapp/"
```

**Notes Importantes:**

- Le chemin de base doit commencer par `/` et idéalement finir par `/`
- Le chemin de base est utilisé pour le manifest et l'enregistrement du service worker
- Assurez-vous que votre serveur web est configuré pour servir les fichiers PWA depuis le chemin spécifié
- Testez que `https://votredomaine/basePath/manifest.json` est accessible

### Bouton d'Installation PWA

Le CLI injecte automatiquement un gestionnaire d'installation PWA dans votre HTML. Pour afficher un bouton d'installation dans votre application, utilisez les fonctions globales exposées :

#### Fonctions Globales Disponibles

- `window.installPWA()` : Déclenche la prompt d'installation
- `window.isPWAInstalled()` : Vérifie si l'app est déjà installée
- `window.isPWAInstallable()` : Vérifie si l'app est installable

#### Exemple Vanilla JavaScript

```javascript
// Vérifier si installable et afficher un bouton
if (window.isPWAInstallable && window.isPWAInstallable()) {
  const installButton = document.createElement("button");
  installButton.textContent = "Installer l'app";
  installButton.onclick = () => {
    window.installPWA().catch(console.error);
  };
  document.body.appendChild(installButton);
}
```

#### Exemple React

```tsx
import { useState, useEffect } from "react";

function InstallButton() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial
    if (window.isPWAInstalled) {
      setIsInstalled(window.isPWAInstalled());
    }
    if (window.isPWAInstallable) {
      setIsInstallable(window.isPWAInstallable());
    }

    // Écouter les événements personnalisés
    const handleInstallable = () => setIsInstallable(true);
    const handleInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener("pwa-installable", handleInstallable);
    window.addEventListener("pwa-installed", handleInstalled);

    return () => {
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("pwa-installed", handleInstalled);
    };
  }, []);

  if (isInstalled || !isInstallable) {
    return null;
  }

  return <button onClick={() => window.installPWA?.()}>Installer l'app</button>;
}
```

#### Événements Personnalisés

Le script injecté émet des événements personnalisés que vous pouvez écouter :

- `pwa-installable` : Émis quand l'app devient installable
- `pwa-installed` : Émis après l'installation réussie
- `pwa-install-choice` : Émis avec le choix de l'utilisateur (`{ detail: { outcome: 'accepted' | 'dismissed' } }`)

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
import { initCommand } from "@julien-lin/universal-pwa-cli";

const result = await initCommand({
  projectPath: "./my-project",
  name: "My App",
  iconSource: "./icon.png",
});
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
