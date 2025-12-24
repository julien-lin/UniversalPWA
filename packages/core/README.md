# @julien-lin/universal-pwa-core

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-core?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-core)

Core engine for scanning, generation, and injection for UniversalPWA.

**🇫🇷 [Documentation en français](https://github.com/julien-lin/UniversalPWA/blob/main/README.fr.md)**

## Installation

```bash
npm install @julien-lin/universal-pwa-core
```

Or with pnpm:

```bash
pnpm add @julien-lin/universal-pwa-core
```

## Usage

### Scan a Project

```typescript
import { scanProject } from '@julien-lin/universal-pwa-core'

const result = await scanProject({
  projectPath: './my-project',
  includeAssets: true,
  includeArchitecture: true,
})

console.log(result.framework.framework) // 'react', 'wordpress', etc.
console.log(result.architecture.architecture) // 'spa', 'ssr', 'static'
console.log(result.assets.javascript.length) // Number of JS files
```

### Generate a Manifest

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

### Generate Icons

```typescript
import { generateIcons } from '@julien-lin/universal-pwa-core'

const result = await generateIcons({
  sourceImage: './logo.png',
  outputDir: './public/icons',
})

console.log(result.icons) // Array of ManifestIcon
console.log(result.splashScreens) // Array of ManifestSplashScreen
console.log(result.generatedFiles) // Array of generated file paths
```

The function automatically generates:
- PWA icons in multiple sizes (72x72 to 512x512)
- Apple Touch Icon (180x180)
- Splash screens for iOS

### Generate a Service Worker

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

console.log(result.swPath) // Path to generated service worker
console.log(result.count) // Number of files pre-cached
```

### Inject Meta Tags

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

console.log(result.injected) // Tags injected
console.log(result.skipped) // Tags already present
```

## API Reference

### Scanner

- `scanProject(options)` : Scan a project and return a complete report
- `detectFramework(projectPath)` : Detect the framework used
- `detectAssets(projectPath)` : Detect assets (JS, CSS, images, fonts)
- `detectArchitecture(projectPath)` : Detect architecture (SPA, SSR, static)

### Generator

- `generateManifest(options)` : Generate a manifest.json
- `writeManifest(manifest, outputDir)` : Write manifest to a file
- `generateAndWriteManifest(options, outputDir)` : Generate and write manifest in one call
- `generateIcons(options)` : Generate PWA icons from a source image
- `generateServiceWorker(options)` : Generate a service worker with Workbox
- `checkProjectHttps(options)` : Check project HTTPS status

### Injector

- `parseHTML(htmlContent)` : Parse HTML content
- `parseHTMLFile(filePath)` : Parse an HTML file
- `injectMetaTags(htmlContent, options)` : Inject PWA meta-tags
- `injectMetaTagsInFile(filePath, options)` : Inject meta-tags in a file

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

If UniversalPWA is useful to you, please consider [sponsoring the project](https://github.com/sponsors/julien-lin) to help maintain and improve it.

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Tests
pnpm test

# Lint
pnpm lint
```

## Links

- **Homepage**: https://github.com/julien-lin/UniversalPWA
- **Issues**: https://github.com/julien-lin/UniversalPWA/issues
- **Sponsor**: https://github.com/sponsors/julien-lin
