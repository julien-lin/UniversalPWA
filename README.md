# UniversalPWA

> Bibliothèque universelle (CLI + lib NPM/Composer) transformant n'importe quel projet web existant en Progressive Web App (PWA) en un clic, sans refonte du code source.

## 🎯 Objectif

Démocratiser les PWA pour PME/artisans/développeurs solo, viser 10k installs/an via GitHub + marketplaces.

## ✨ Fonctionnalités

- 🔍 **Scan & Détection Auto** : Détection automatique du framework (WordPress, Shopify, Symfony, Laravel, React, Vue, Angular, Next.js, Nuxt, HTML statique)
- ⚡ **Génération One-Click** : Manifest.json + Service Worker optimisé + injection meta-tags
- 🎨 **Customisation No-Code** : Éditeur web pour personnaliser couleurs, icônes, stratégies de cache (à venir)
- 📊 **Analytics & Monitoring** : Dashboard gratuit avec métriques PWA (à venir)
- 🚀 **Déploiement** : Support Vercel/Netlify/Cloudflare + GitHub Actions

## 🚀 Installation

### Via NPM (recommandé)

```bash
npm install -g @universal-pwa/cli
```

### Via pnpm

```bash
pnpm add -g @universal-pwa/cli
```

### Utilisation directe avec npx

```bash
npx @universal-pwa/cli init
```

## 📖 Utilisation

### Initialiser une PWA dans votre projet

```bash
# Dans le répertoire de votre projet
universal-pwa init

# Avec options
universal-pwa init \
  --name "Mon Application" \
  --short-name "MonApp" \
  --icon-source ./logo.png \
  --theme-color "#2c3e50" \
  --background-color "#ffffff"
```

### Scanner un projet

```bash
universal-pwa scan
```

### Prévisualiser la configuration PWA

```bash
universal-pwa preview
```

## 🎯 Exemples par Framework

### Site Statique (HTML/CSS/JS)

```bash
cd mon-site-statique
universal-pwa init --icon-source ./icon.png
```

### React / Vue / Angular

```bash
cd mon-projet-react
universal-pwa init --icon-source ./src/assets/logo.png
```

### Next.js / Nuxt

```bash
cd mon-projet-nextjs
universal-pwa init --icon-source ./public/logo.png
```

### WordPress

```bash
cd mon-theme-wordpress
universal-pwa init --icon-source ./assets/icon.png --output-dir ./public
```

### Symfony / Laravel

```bash
cd mon-projet-symfony
universal-pwa init --icon-source ./public/logo.png --output-dir ./public
```

## ⚙️ Configuration

### Options de la commande `init`

| Option | Description | Défaut |
|--------|-------------|--------|
| `-p, --project-path <path>` | Chemin du projet | `.` (répertoire courant) |
| `-n, --name <name>` | Nom de l'application | Détecté depuis package.json |
| `-s, --short-name <shortName>` | Nom court (max 12 caractères) | Dérivé du nom |
| `-i, --icon-source <path>` | Image source pour les icônes | Requis |
| `-t, --theme-color <color>` | Couleur du thème (hex) | `#ffffff` |
| `-b, --background-color <color>` | Couleur de fond (hex) | `#000000` |
| `--skip-icons` | Ignorer la génération d'icônes | `false` |
| `--skip-service-worker` | Ignorer la génération du SW | `false` |
| `--skip-injection` | Ignorer l'injection meta-tags | `false` |
| `-o, --output-dir <dir>` | Répertoire de sortie | `public` |

## 📦 Structure

Monorepo pnpm avec les packages suivants :

- `@universal-pwa/core` : Moteur de scan, génération et injection
- `@universal-pwa/cli` : Interface en ligne de commande
- `@universal-pwa/templates` : Templates de service workers par framework
- `@universal-pwa/web-ui` : Interface web no-code (React 19 + Vite + Tailwind 4)
- `@universal-pwa/sdk-php` : SDK PHP/Composer pour intégration Symfony/Laravel
- `packages/demos` : Projets de démonstration

## 🛠️ Développement

### Installation des dépendances

```bash
pnpm install
```

### Développement web UI

```bash
pnpm dev:web
```

### Build tous les packages

```bash
pnpm build
```

### Tests

```bash
# Tous les tests
pnpm test

# Tests avec coverage
pnpm test:coverage

# Tests d'une package spécifique
pnpm --filter @universal-pwa/core test
```

### Lint

```bash
pnpm lint
```

## 📚 Documentation

Voir le dossier `DOCUMENTATION/` pour :
- [Cahier des charges](./DOCUMENTATION/cahier-des-charges.md)
- [Stack technique](./DOCUMENTATION/stack-technique.md)
- [Prompt initial](./DOCUMENTATION/prompt.md)
- [TODO MVP](./DOCUMENTATION/TODO-MVP.md)

## 🔧 Troubleshooting

### Erreur : "Icon source not found"

Assurez-vous que le chemin vers l'image source est correct et que le fichier existe.

```bash
# Vérifier que l'icône existe
ls -la ./icon.png

# Utiliser un chemin absolu si nécessaire
universal-pwa init --icon-source /chemin/absolu/icon.png
```

### Erreur : "Manifest requires at least one icon"

Le manifest PWA nécessite au moins une icône. Fournissez une image source avec `--icon-source`.

### Service Worker non enregistré

Vérifiez que :
1. Le service worker a été généré (`sw.js` dans le répertoire de sortie)
2. Le script d'enregistrement a été injecté dans votre HTML
3. Vous servez le site via HTTPS (ou localhost pour le développement)

### HTTPS requis en production

Les PWA nécessitent HTTPS en production. Pour le développement local, HTTP sur localhost est accepté.

## 🛠️ Stack Technique

- **Runtime** : Node.js 20+
- **Langage** : TypeScript 5.9+
- **Build** : Vite 7+ (web-ui), tsup 8+ (core/cli/templates)
- **PWA** : Workbox 7.4+
- **Images** : Sharp 0.34+
- **Web UI** : React 19 + Tailwind CSS 4
- **Package Manager** : pnpm 9.12+

## 📄 Licence

MIT

## 🗺️ Roadmap

- **MVP** : Scan + génération basique ✅
- **v1.1** : Plugins auto Shopify/WooCommerce
- **v1.2** : Push notifications (OneSignal/FCM)
- **v2.0** : Éditeur drag-drop + hébergement SW

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les guidelines.

## 📝 Changelog

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique des versions.
