# UniversalPWA

[![GitHub Stars](https://img.shields.io/github/stars/julien-lin/UniversalPWA?logo=github&style=flat-square)](https://github.com/julien-lin/UniversalPWA/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/julien-lin/UniversalPWA?logo=github&style=flat-square)](https://github.com/julien-lin/UniversalPWA/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/julien-lin/UniversalPWA?logo=github&style=flat-square)](https://github.com/julien-lin/UniversalPWA/issues)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)
[![codecov](https://codecov.io/gh/julien-lin/UniversalPWA/branch/main/graph/badge.svg)](https://codecov.io/gh/julien-lin/UniversalPWA)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> Universal library (CLI + NPM/Composer lib) that transforms any existing web project into a Progressive Web App (PWA) with one click, without refactoring the source code.

## 🎯 Goal

Democratize PWAs for SMEs/artisans/solo developers, targeting 10k installs/year via GitHub + marketplaces.

**⭐ Love UniversalPWA? [Consider sponsoring the project](https://github.com/sponsors/julien-lin) to help it grow!**

## ✨ Features

- 🔍 **Auto Scan & Detection** : Automatic framework detection (WordPress, Shopify, Symfony, Laravel, React, Vue, Angular, Next.js, Nuxt, static HTML)
- ⚡ **One-Click Generation** : Manifest.json + optimized Service Worker + meta-tags injection
- 💬 **Interactive Mode** : User-friendly prompts with smart defaults and validation
- 🎨 **Icon Generation** : Automatic generation of PWA icons in multiple sizes + Apple Touch Icon
- 🎨 **No-Code Customization** : Web editor to customize colors, icons, cache strategies (coming soon)
- 📊 **Analytics & Monitoring** : Built-in structured logging, performance metrics, and RGPD-compliant telemetry
- 🚀 **Deployment** : Support for Vercel/Netlify/Cloudflare + GitHub Actions

## 🚀 Installation

### Via NPM (recommended)

```bash
npm install -g @julien-lin/universal-pwa-cli
```

### Via pnpm

```bash
pnpm add -g @julien-lin/universal-pwa-cli
```

### Direct usage with npx

```bash
npx @julien-lin/universal-pwa-cli init
```

## 📖 Usage

### Initialize a PWA in your project

#### Interactive Mode (Recommended)

Simply run `universal-pwa init` without any arguments to launch the interactive mode:

```bash
# In your project directory
universal-pwa init
```

The CLI will:
1. 🔍 Scan your project to detect the framework and architecture
2. 📋 Prompt you with a 2-phase workflow:

   **Phase 1: Environment Selection**
   - Choose between **Local** (development) or **Production** (build)
   - Auto-detects environment based on `dist/` or `build/` directories
   - Shows detection indicators (e.g., "dist/ directory exists with recent files")

   **Phase 2: Application Configuration**
   - App name (auto-detected from `package.json`)
   - Short name (max 12 characters, auto-generated from app name)
   - Icon source path (auto-detected from common locations)
   - Theme color (suggested based on framework, e.g., `#61dafb` for React)
   - Background color (suggested based on framework)
   - Whether to generate icons

All prompts include smart defaults, validation, and contextual suggestions!

#### Command Line Mode

You can also provide all options directly:

```bash
universal-pwa init \
  --name "My Application" \
  --short-name "MyApp" \
  --icon-source ./logo.png \
  --theme-color "#2c3e50" \
  --background-color "#ffffff"
```

### Scan a project

```bash
universal-pwa scan
```

This will display:
- Detected framework
- Architecture (SPA, SSR, static)
- Build tool
- Assets found (JS, CSS, images, fonts)

### Preview PWA configuration

```bash
universal-pwa preview
```

This checks:
- Presence of `manifest.json`
- Service Worker availability
- HTTPS compliance
- PWA setup status

## 🎯 Examples by Framework

### Static Site (HTML/CSS/JS)

```bash
cd my-static-site
universal-pwa init --icon-source ./icon.png
```

### React / Vue / Angular

```bash
cd my-react-project
# Interactive mode (recommended)
universal-pwa init

# Or with options
universal-pwa init --icon-source ./src/assets/logo.png
```

### Next.js / Nuxt

```bash
cd my-nextjs-project
universal-pwa init --icon-source ./public/logo.png
```

### WordPress

```bash
cd my-wordpress-theme
universal-pwa init --icon-source ./assets/icon.png --output-dir ./public
```

### Symfony / Laravel

```bash
cd my-symfony-project
universal-pwa init --icon-source ./public/logo.png --output-dir ./public
```

## ⚙️ Configuration

### `init` Command Options

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --project-path <path>` | Project path | `.` (current directory) |
| `-n, --name <name>` | Application name | Detected from `package.json` |
| `-s, --short-name <shortName>` | Short name (max 12 chars) | Derived from name |
| `-i, --icon-source <path>` | Source image for icons | Auto-detected if available |
| `-t, --theme-color <color>` | Theme color (hex) | `#ffffff` |
| `-b, --background-color <color>` | Background color (hex) | `#000000` |
| `--skip-icons` | Skip icon generation | `false` |
| `--skip-service-worker` | Skip service worker generation | `false` |
| `--skip-injection` | Skip meta-tags injection | `false` |
| `-o, --output-dir <dir>` | Output directory | `public` |

### Interactive Mode Features

When using interactive mode (`universal-pwa init` without arguments):

- ✅ **Smart Defaults** : Automatically detects project name from `package.json`
- ✅ **Icon Detection** : Searches for icons in common locations (`public/`, `src/assets/`, etc.)
- ✅ **Framework Detection** : Uses detected framework to suggest appropriate defaults
- ✅ **Real-time Validation** : Validates inputs as you type (colors, paths, character limits)
- ✅ **User-friendly** : Clear prompts with helpful descriptions

## 📦 Generated Files

After running `universal-pwa init`, the following files are generated:

### In `public/` (or specified output directory):

- `manifest.json` - PWA manifest file
- `sw.js` - Service Worker (Workbox)
- `sw-src.js` - Service Worker source (for customization)
- `icon-*.png` - PWA icons in multiple sizes (72x72 to 512x512)
- `apple-touch-icon.png` - Apple Touch Icon (180x180)
- `splash-*.png` - Splash screens for iOS

### In your HTML files:

- Meta tags injected in `<head>`:
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="...">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  - Service Worker registration script

## 📦 Project Structure

Monorepo using pnpm with the following packages:

- `@julien-lin/universal-pwa-core` : Core engine for scanning, generation, and injection
- `@julien-lin/universal-pwa-cli` : Command-line interface
- `@julien-lin/universal-pwa-templates` : Service worker templates by framework
- `@julien-lin/universal-pwa-web-ui` : No-code web interface (React 19 + Vite + Tailwind 4)
- `@julien-lin/universal-pwa-sdk-php` : PHP/Composer SDK for Symfony/Laravel integration
- `packages/demos` : Demo projects

## 🛠️ Development

### Install dependencies

```bash
pnpm install
```

### Web UI development

```bash
pnpm dev:web
```

### Build all packages

```bash
pnpm build
```

### Tests

```bash
# All tests
pnpm test

# Tests with coverage
pnpm test:coverage

# Tests for a specific package
pnpm --filter @julien-lin/universal-pwa-core test
```

### Lint

```bash
pnpm lint
```

## 📚 Documentation

See the `DOCUMENTATION/` folder for:
- [Architecture Decisions](./DOCUMENTATION/ARCHITECTURE_DECISIONS.md)
- [Backend Detection Patterns](./DOCUMENTATION/BACKEND_DETECTION_PATTERNS.md)
- [SDK Architecture](./DOCUMENTATION/SDK_ARCHITECTURE.md)
- [Phase 5 Plan - Testing & Documentation](./DOCUMENTATION/PHASE_5_PLAN.md)
- [Performance Guide](./DOCUMENTATION/PERFORMANCE_GUIDE.md) (coming with Phase 5.3)

## 🔧 Troubleshooting

### Error: "Icon source not found"

Make sure the path to the source image is correct and the file exists.

```bash
# Check that the icon exists
ls -la ./icon.png

# Use an absolute path if necessary
universal-pwa init --icon-source /absolute/path/icon.png
```

### Error: "Manifest requires at least one icon"

The PWA manifest requires at least one icon. Provide a source image with `--icon-source`, or use interactive mode which will help you find one.

### Service Worker not registering

Check that:
1. The service worker was generated (`sw.js` in the output directory)
2. The registration script was injected in your HTML
3. You're serving the site via HTTPS (or localhost for development)

### HTTPS required in production

PWAs require HTTPS in production. For local development, HTTP on localhost is accepted.

### Path issues with Vite/React

For Vite/React projects, files in `public/` are served at the root. The CLI automatically handles this by normalizing paths (e.g., `/public/sw.js` → `/sw.js`).

## 🛠️ Tech Stack

- **Runtime** : Node.js 20+
- **Language** : TypeScript 5.9+
- **Build** : Vite 7+ (web-ui), tsup 8+ (core/cli/templates)
- **PWA** : Workbox 7.4+
- **Images** : Sharp 0.34+
- **Web UI** : React 19 + Tailwind CSS 4
- **Package Manager** : pnpm 9.12+
- **CLI Prompts** : Inquirer 12.0+
- **Testing** : Vitest 4.0+ with 1900+ tests
- **Observability** : Structured logging, performance metrics, RGPD-compliant telemetry

## 💝 Sponsoring

If UniversalPWA is useful to you, please consider sponsoring the project to help maintain and improve it.

**[⭐ Sponsor on GitHub](https://github.com/sponsors/julien-lin)**

Your support helps:
- 🚀 Maintain and improve the core features
- 🐛 Fix bugs faster
- ✨ Add new features and integrations
- 📚 Improve documentation
- 🎯 Support more frameworks and platforms
- 🔒 Ensure long-term sustainability

**Thank you to all our sponsors! 🙏**

## 📄 License

MIT

## 🗺️ Roadmap

- **MVP** : Scan + basic generation ✅
- **v1.0.0** : Production-ready with enterprise-grade testing
  - Phase 1: Security (5 modules, 186 tests) ✅
  - Phase 2: Performance (4 modules, 90 tests) ✅
  - Phase 3: Robustness (5 modules, 194 tests) ✅
  - Phase 4: Observability (3 modules, 110 tests) ✅
  - Phase 5: Testing & Documentation (error coverage 90%+, E2E tests, performance guide) 🔄
- **v1.1** : Auto plugins for Shopify/WooCommerce
- **v1.2** : Push notifications (OneSignal/FCM)
- **v2.0** : Drag-drop editor + SW hosting

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**How to contribute:**
1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add some amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🔄 Open a Pull Request

See our [Contributing Guide](./CONTRIBUTING.md) for more details.

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## 🔗 Links

- **Repository**: [https://github.com/julien-lin/UniversalPWA](https://github.com/julien-lin/UniversalPWA)
- **Issues**: [https://github.com/julien-lin/UniversalPWA/issues](https://github.com/julien-lin/UniversalPWA/issues)
- **Discussions**: [https://github.com/julien-lin/UniversalPWA/discussions](https://github.com/julien-lin/UniversalPWA/discussions)
- **Releases**: [https://github.com/julien-lin/UniversalPWA/releases](https://github.com/julien-lin/UniversalPWA/releases)
- **Sponsor**: [https://github.com/sponsors/julien-lin](https://github.com/sponsors/julien-lin)
- **npm CLI**: [https://www.npmjs.com/package/@julien-lin/universal-pwa-cli](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)
- **npm Core**: [https://www.npmjs.com/package/@julien-lin/universal-pwa-core](https://www.npmjs.com/package/@julien-lin/universal-pwa-core)
- **npm Templates**: [https://www.npmjs.com/package/@julien-lin/universal-pwa-templates](https://www.npmjs.com/package/@julien-lin/universal-pwa-templates)
