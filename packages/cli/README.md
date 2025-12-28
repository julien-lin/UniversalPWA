# @julien-lin/universal-pwa-cli

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)

Command-line interface for UniversalPWA - Transform any web project into a Progressive Web App (PWA) with one click.

**🇫🇷 [Documentation en français](./README.fr.md)**

## Installation

```bash
npm install -g @julien-lin/universal-pwa-cli
```

Or with pnpm:

```bash
pnpm add -g @julien-lin/universal-pwa-cli
```

## Usage

### `init` Command

Initialize a PWA in your project.

#### ⚠️ Important: Workflow for Production Builds

For projects using build tools (React, Vite, Vue, etc.), **always build first**, then initialize the PWA:

```bash
# 1. Build your project first (generates assets with hashes)
npm run build
# or
pnpm build
# or
yarn build

# 2. Then initialize PWA
# In interactive mode, select "Production" when prompted
# The CLI will auto-detect dist/ directory and suggest it
universal-pwa init

# Or explicitly specify output directory
universal-pwa init --output-dir dist
```

**Why?** The service worker needs to precache all your built assets (JS/CSS with hashes). If you initialize before building, the service worker won't know about the hashed filenames.

**Environment Detection:**
- The CLI automatically detects your environment:
  - **Production**: If `dist/` or `build/` exists with recent files (< 24h)
  - **Local**: Otherwise, defaults to `public/`
- Detection indicators are displayed during interactive prompts
- You can override the detection by explicitly choosing Local or Production

#### Interactive Mode (Recommended)

Simply run without arguments to launch interactive prompts:

```bash
universal-pwa init
```

The CLI will guide you through a 2-phase workflow:

**Phase 1: Environment Selection**
- Choose between **Local** (development) or **Production** (build)
- The CLI automatically detects your environment based on the presence of `dist/` or `build/` directories
- Displays detection indicators (e.g., "dist/ directory exists with 15 built files")

**Phase 2: Application Configuration**
- App name (auto-detected from `package.json`)
- Short name (max 12 characters, auto-generated from app name)
- Icon source path (auto-detected from common locations)
- Theme and background colors (suggested based on detected framework)
- Icon generation options

All prompts include smart defaults, validation, and contextual suggestions!

#### Command Line Mode

```bash
universal-pwa init [options]
```

**Options:**

- `-p, --project-path <path>` : Project path (default: current directory)
- `-n, --name <name>` : Application name
- `-s, --short-name <shortName>` : Short name (max 12 characters)
- `-i, --icon-source <path>` : Source image for icons
- `-t, --theme-color <color>` : Theme color (hex, e.g., `#2c3e50`)
- `-b, --background-color <color>` : Background color (hex)
- `--skip-icons` : Skip icon generation
- `--skip-service-worker` : Skip service worker generation
- `--skip-injection` : Skip meta-tags injection
- `-o, --output-dir <dir>` : Output directory (auto-detects `dist/` for React/Vite, otherwise `public/`)

**Examples:**

```bash
# For production build (React/Vite)
npm run build
universal-pwa init --output-dir dist --icon-source ./logo.png

# For development or static sites
universal-pwa init \
  --name "My Application" \
  --short-name "MyApp" \
  --icon-source ./logo.png \
  --theme-color "#2c3e50"
```

### PWA Install Button

The CLI automatically injects a PWA install handler into your HTML. To display an install button in your application, use the exposed global functions:

#### Available Global Functions

- `window.installPWA()` : Triggers the install prompt
- `window.isPWAInstalled()` : Checks if the app is already installed
- `window.isPWAInstallable()` : Checks if the app is installable

#### Vanilla JavaScript Example

```javascript
// Check if installable and show a button
if (window.isPWAInstallable && window.isPWAInstallable()) {
  const installButton = document.createElement('button')
  installButton.textContent = 'Install App'
  installButton.onclick = () => {
    window.installPWA().catch(console.error)
  }
  document.body.appendChild(installButton)
}
```

#### React Example

```tsx
import { useState, useEffect } from 'react'

function InstallButton() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check initial state
    if (window.isPWAInstalled) {
      setIsInstalled(window.isPWAInstalled())
    }
    if (window.isPWAInstallable) {
      setIsInstallable(window.isPWAInstallable())
    }

    // Listen to custom events
    const handleInstallable = () => setIsInstallable(true)
    const handleInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    window.addEventListener('pwa-installable', handleInstallable)
    window.addEventListener('pwa-installed', handleInstalled)

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable)
      window.removeEventListener('pwa-installed', handleInstalled)
    }
  }, [])

  if (isInstalled || !isInstallable) {
    return null
  }

  return (
    <button onClick={() => window.installPWA?.()}>
      Install App
    </button>
  )
}
```

#### Custom Events

The injected script emits custom events you can listen to:

- `pwa-installable` : Emitted when the app becomes installable
- `pwa-installed` : Emitted after successful installation
- `pwa-install-choice` : Emitted with user's choice (`{ detail: { outcome: 'accepted' | 'dismissed' } }`)

### `scan` Command

Scan a project and detect framework, architecture, and assets.

```bash
universal-pwa scan [options]
```

**Options:**

- `-p, --project-path <path>` : Project path (default: current directory)

**Example:**

```bash
universal-pwa scan
```

Output:
- Detected framework (React, Vue, WordPress, etc.)
- Architecture (SPA, SSR, static)
- Build tool
- Assets found (JS, CSS, images, fonts)

### `preview` Command

Preview the PWA configuration of a project.

```bash
universal-pwa preview [options]
```

**Options:**

- `-p, --project-path <path>` : Project path (default: current directory)
- `--port <port>` : Server port (default: `3000`)
- `--open` : Open in browser

**Example:**

```bash
universal-pwa preview --port 8080
```

## Generated Files

After running `universal-pwa init`, the following files are generated:

- `manifest.json` - PWA manifest file
- `sw.js` - Service Worker (Workbox)
- `sw-src.js` - Service Worker source (for customization)
- `icon-*.png` - PWA icons in multiple sizes (72x72 to 512x512)
- `apple-touch-icon.png` - Apple Touch Icon (180x180)
- `splash-*.png` - Splash screens for iOS

Meta tags are automatically injected into your HTML files.

## Programmatic API

You can also use the CLI as a module:

```typescript
import { initCommand } from '@julien-lin/universal-pwa-cli'

const result = await initCommand({
  projectPath: './my-project',
  name: 'My App',
  iconSource: './icon.png',
})
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

- **Repository**: [https://github.com/julien-lin/UniversalPWA](https://github.com/julien-lin/UniversalPWA)
- **Issues**: [https://github.com/julien-lin/UniversalPWA/issues](https://github.com/julien-lin/UniversalPWA/issues)
- **Discussions**: [https://github.com/julien-lin/UniversalPWA/discussions](https://github.com/julien-lin/UniversalPWA/discussions)
- **Contributing**: [https://github.com/julien-lin/UniversalPWA/blob/main/CONTRIBUTING.md](https://github.com/julien-lin/UniversalPWA/blob/main/CONTRIBUTING.md)
- **Releases**: [https://github.com/julien-lin/UniversalPWA/releases](https://github.com/julien-lin/UniversalPWA/releases)
- **Sponsor**: [https://github.com/sponsors/julien-lin](https://github.com/sponsors/julien-lin)
- **npm Package**: [https://www.npmjs.com/package/@julien-lin/universal-pwa-cli](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)
