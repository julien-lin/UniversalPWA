# @universal-pwa/core

Moteur de scan, génération et injection pour UniversalPWA.

## Installation

```bash
npm install @universal-pwa/core
```

## Utilisation

### Scanner un projet

```typescript
import { scanProject } from '@universal-pwa/core'

const result = await scanProject({
  projectPath: './my-project',
  includeAssets: true,
  includeArchitecture: true,
})

console.log(result.framework.framework) // 'react', 'wordpress', etc.
console.log(result.architecture.architecture) // 'spa', 'ssr', 'static'
```

### Générer un manifest

```typescript
import { generateManifest, writeManifest } from '@universal-pwa/core'

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
import { generateIcons } from '@universal-pwa/core'

const result = await generateIcons({
  sourceImage: './logo.png',
  outputDir: './public/icons',
})

console.log(result.icons) // Array of ManifestIcon
console.log(result.splashScreens) // Array of ManifestSplashScreen
```

### Générer un service worker

```typescript
import { generateServiceWorker } from '@universal-pwa/core'

const result = await generateServiceWorker({
  projectPath: './my-project',
  outputDir: './public',
  architecture: 'spa',
  framework: 'react',
  globDirectory: './public',
  globPatterns: ['**/*.{html,js,css,png,jpg,svg}'],
})

console.log(result.swPath) // Chemin du service worker généré
```

### Injecter des meta-tags

```typescript
import { injectMetaTagsInFile } from '@universal-pwa/core'

const result = injectMetaTagsInFile('./index.html', {
  manifestPath: '/manifest.json',
  themeColor: '#2c3e50',
  appleTouchIcon: '/apple-touch-icon.png',
  serviceWorkerPath: '/sw.js',
})

console.log(result.injected) // Tags injectés
console.log(result.skipped) // Tags déjà présents
```

## API

### Scanner

- `scanProject(options)` : Scanne un projet et retourne un rapport complet
- `detectFramework(projectPath)` : Détecte le framework utilisé
- `detectAssets(projectPath)` : Détecte les assets (JS, CSS, images, fonts)
- `detectArchitecture(projectPath)` : Détecte l'architecture (SPA, SSR, static)

### Générateur

- `generateManifest(options)` : Génère un manifest.json
- `writeManifest(manifest, outputDir)` : Écrit le manifest dans un fichier
- `generateIcons(options)` : Génère les icônes PWA à partir d'une image source
- `generateServiceWorker(options)` : Génère un service worker avec Workbox
- `checkProjectHttps(options)` : Vérifie le statut HTTPS d'un projet

### Injecteur

- `parseHTML(htmlContent)` : Parse du HTML
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
  ServiceWorkerGenerationResult,
} from '@universal-pwa/core'
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
