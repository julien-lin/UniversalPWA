# @julien-lin/universal-pwa-core

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-core?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-core)

Moteur de scan, génération et injection pour UniversalPWA.

## Installation

```bash
npm install @julien-lin/universal-pwa-core
```

Ou avec pnpm :

```bash
pnpm add @julien-lin/universal-pwa-core
```

## Utilisation

### Scanner un projet

```typescript
import { scanProject } from '@julien-lin/universal-pwa-core'

const result = await scanProject({
  projectPath: './my-project',
  includeAssets: true,
  includeArchitecture: true,
})

console.log(result.framework.framework) // 'react', 'wordpress', etc.
console.log(result.architecture.architecture) // 'spa', 'ssr', 'static'
console.log(result.assets.javascript.length) // Nombre de fichiers JS
```

### Générer un manifest

```typescript
import { generateManifest, writeManifest } from '@julien-lin/universal-pwa-core'

const manifest = generateManifest({
  name: 'My App',
  shortName: 'MyApp',
  startUrl: '/',
  scope: '/',
  display: 'standalone',
  themeColor: '#2c3e50',
  backgroundColor: '#ffffff',
  icons: [
    {
      src: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
  ],
})

writeManifest(manifest, './public')
```

### Générer des icônes

```typescript
import { generateIcons } from '@julien-lin/universal-pwa-core'

const result = await generateIcons({
  sourceImage: './logo.png',
  outputDir: './public/icons',
})

console.log(result.icons) // Tableau de ManifestIcon
console.log(result.splashScreens) // Tableau de ManifestSplashScreen
console.log(result.generatedFiles) // Tableau des chemins de fichiers générés
```

La fonction génère automatiquement :
- Icônes PWA en multiples tailles (72x72 à 512x512)
- Apple Touch Icon (180x180)
- Splash screens pour iOS

### Générer un service worker

```typescript
import { generateServiceWorker } from '@julien-lin/universal-pwa-core'

const result = await generateServiceWorker({
  projectPath: './my-project',
  outputDir: './public',
  architecture: 'spa',
  framework: 'react',
  globDirectory: './public',
  globPatterns: ['**/*.{html,js,css,png,jpg,svg}'],
})

console.log(result.swPath) // Chemin vers le service worker généré
console.log(result.count) // Nombre de fichiers pré-cachés
```

### Injecter des meta tags

```typescript
import { injectMetaTagsInFile } from '@julien-lin/universal-pwa-core'

const result = injectMetaTagsInFile('./index.html', {
  manifestPath: '/manifest.json',
  themeColor: '#2c3e50',
  backgroundColor: '#ffffff',
  appleTouchIcon: '/apple-touch-icon.png',
  serviceWorkerPath: '/sw.js',
  appleMobileWebAppCapable: true,
})

console.log(result.injected) // Tags injectés
console.log(result.skipped) // Tags déjà présents
```

## Référence API

### Scanner

- `scanProject(options)` : Scanne un projet et retourne un rapport complet
- `detectFramework(projectPath)` : Détecte le framework utilisé
- `detectAssets(projectPath)` : Détecte les assets (JS, CSS, images, polices)
- `detectArchitecture(projectPath)` : Détecte l'architecture (SPA, SSR, static)

### Générateur

- `generateManifest(options)` : Génère un manifest.json
- `writeManifest(manifest, outputDir)` : Écrit le manifest dans un fichier
- `generateAndWriteManifest(options, outputDir)` : Génère et écrit le manifest en une seule fois
- `generateIcons(options)` : Génère les icônes PWA à partir d'une image source
- `generateServiceWorker(options)` : Génère un service worker avec Workbox
- `checkProjectHttps(options)` : Vérifie le statut HTTPS d'un projet

### Injecteur

- `parseHTML(htmlContent)` : Parse du contenu HTML
- `parseHTMLFile(filePath)` : Parse un fichier HTML
- `injectMetaTags(htmlContent, options)` : Injecte des meta-tags PWA
- `injectMetaTagsInFile(filePath, options)` : Injecte des meta-tags dans un fichier

## Types

```typescript
import type {
  Framework,
  Architecture,
  ScannerResult,
  Manifest,
  ManifestIcon,
  ManifestSplashScreen,
  ServiceWorkerGenerationResult,
} from '@julien-lin/universal-pwa-core'
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

- **Page d'accueil** : https://github.com/julien-lin/UniversalPWA
- **Issues** : https://github.com/julien-lin/UniversalPWA/issues
- **Sponsor** : https://github.com/sponsors/julien-lin

