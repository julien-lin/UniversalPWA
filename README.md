# UniversalPWA

> Universal library (CLI + NPM/Composer lib) that transforms any existing web project into a Progressive Web App (PWA) with one click, without refactoring the source code.

## 🎯 Goal

Democratize PWAs for SMEs/artisans/solo developers, targeting 10k installs/year via GitHub + marketplaces.

## ✨ Features

- 🔍 **Auto Scan & Detection** : Automatic framework detection (WordPress, Shopify, Symfony, Laravel, React, Vue, Angular, Next.js, Nuxt, static HTML)
- ⚡ **One-Click Generation** : Manifest.json + optimized Service Worker + meta-tags injection
- 💬 **Interactive Mode** : User-friendly prompts with smart defaults and validation
- 🎨 **Icon Generation** : Automatic generation of PWA icons in multiple sizes + Apple Touch Icon
- 🎨 **No-Code Customization** : Web editor to customize colors, icons, cache strategies (coming soon)
- 📊 **Analytics & Monitoring** : Free dashboard with PWA metrics (coming soon)
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
1. 🔍 Scan your project to detect the framework
2. 📋 Prompt you with questions:
   - App name (auto-detected from `package.json`)
   - Short name (max 12 characters, auto-generated from app name)
   - Icon source path (auto-detected from common locations)
   - Theme color (default: `#ffffff`)
   - Background color (default: `#000000`)
   - Whether to generate icons

All prompts include smart defaults and validation!

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
- [Technical Stack](./DOCUMENTATION/stack-technique.md)
- [Initial Prompt](./DOCUMENTATION/prompt.md)
- [MVP TODO](./DOCUMENTATION/TODO-MVP.md)
- [Publishing Guide](./DOCUMENTATION/PUBLISH.md)

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

## 📄 License

MIT

## 🗺️ Roadmap

- **MVP** : Scan + basic generation ✅
- **v1.1** : Auto plugins for Shopify/WooCommerce
- **v1.2** : Push notifications (OneSignal/FCM) ✅
- **v1.2.2** : Interactive mode with prompts ✅
- **v2.0** : Drag-drop editor + SW hosting

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📝 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
