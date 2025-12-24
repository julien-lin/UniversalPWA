# @julien-lin/universal-pwa-cli

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)

Command-line interface for UniversalPWA - Transform any web project into a Progressive Web App (PWA) with one click.

**🇫🇷 [Documentation en français](https://github.com/julien-lin/UniversalPWA/blob/main/README.fr.md)**

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

#### Interactive Mode (Recommended)

Simply run without arguments to launch interactive prompts:

```bash
universal-pwa init
```

The CLI will guide you through:
- App name (auto-detected from `package.json`)
- Short name (max 12 characters)
- Icon source path (auto-detected from common locations)
- Theme and background colors
- Icon generation options

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
- `-o, --output-dir <dir>` : Output directory (default: `public`)

**Example:**

```bash
universal-pwa init \
  --name "My Application" \
  --short-name "MyApp" \
  --icon-source ./logo.png \
  --theme-color "#2c3e50"
```

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

- **Homepage**: https://github.com/julien-lin/UniversalPWA
- **Issues**: https://github.com/julien-lin/UniversalPWA/issues
- **Sponsor**: https://github.com/sponsors/julien-lin
