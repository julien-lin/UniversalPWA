# UniversalPWA

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> Bibliothèque universelle (CLI + lib NPM/Composer) transformant n'importe quel projet web existant en Progressive Web App (PWA) en un clic, sans refonte du code source.

## 🎯 Objectif

Démocratiser les PWA pour PME/artisans/développeurs solo, viser 10k installs/an via GitHub + marketplaces.

**⭐ Vous aimez UniversalPWA ? [Envisagez de sponsoriser le projet](https://github.com/sponsors/julien-lin) pour l'aider à grandir !**

## ✨ Fonctionnalités

- 🔍 **Scan & Détection Auto** : Détection automatique du framework (WordPress, Shopify, Symfony, Laravel, React, Vue, Angular, Next.js, Nuxt, HTML statique)
- ⚡ **Génération One-Click** : Manifest.json + Service Worker optimisé + injection meta-tags
- 💬 **Mode Interactif** : Prompts conviviaux avec valeurs par défaut intelligentes et validation
- 🎨 **Génération d'Icônes** : Génération automatique d'icônes PWA en multiples tailles + Apple Touch Icon
- 🎨 **Customisation No-Code** : Éditeur web pour personnaliser couleurs, icônes, stratégies de cache (à venir)
- 📊 **Analytics & Monitoring** : Dashboard gratuit avec métriques PWA (à venir)
- 🚀 **Déploiement** : Support Vercel/Netlify/Cloudflare + GitHub Actions

## 🚀 Installation

### Via NPM (recommandé)

```bash
npm install -g @julien-lin/universal-pwa-cli
```

### Via pnpm

```bash
pnpm add -g @julien-lin/universal-pwa-cli
```

### Utilisation directe avec npx

```bash
npx @julien-lin/universal-pwa-cli init
```

## 📖 Utilisation

### Initialiser une PWA dans votre projet

#### Mode Interactif (Recommandé)

Exécutez simplement `universal-pwa init` sans arguments pour lancer le mode interactif :

```bash
# Dans le répertoire de votre projet
universal-pwa init
```

Le CLI va :
1. 🔍 Scanner votre projet pour détecter le framework
2. 📋 Vous poser des questions :
   - Nom de l'application (détecté automatiquement depuis `package.json`)
   - Nom court (max 12 caractères, généré automatiquement depuis le nom)
   - Chemin vers l'image source (détecté automatiquement dans les emplacements courants)
   - Couleur du thème (par défaut : `#ffffff`)
   - Couleur de fond (par défaut : `#000000`)
   - Générer les icônes ou non

Tous les prompts incluent des valeurs par défaut intelligentes et une validation en temps réel !

#### Mode Ligne de Commande

Vous pouvez également fournir toutes les options directement :

```bash
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

Affiche :
- Framework détecté
- Architecture (SPA, SSR, statique)
- Outil de build
- Assets trouvés (JS, CSS, images, polices)

### Prévisualiser la configuration PWA

```bash
universal-pwa preview
```

Vérifie :
- Présence de `manifest.json`
- Disponibilité du Service Worker
- Conformité HTTPS
- État de la configuration PWA

## 🎯 Exemples par Framework

### Site Statique (HTML/CSS/JS)

```bash
cd mon-site-statique
universal-pwa init --icon-source ./icon.png
```

### React / Vue / Angular

```bash
cd mon-projet-react
# Mode interactif (recommandé)
universal-pwa init

# Ou avec options
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
| `-n, --name <name>` | Nom de l'application | Détecté depuis `package.json` |
| `-s, --short-name <shortName>` | Nom court (max 12 caractères) | Dérivé du nom |
| `-i, --icon-source <path>` | Image source pour les icônes | Détecté automatiquement si disponible |
| `-t, --theme-color <color>` | Couleur du thème (hex) | `#ffffff` |
| `-b, --background-color <color>` | Couleur de fond (hex) | `#000000` |
| `--skip-icons` | Ignorer la génération d'icônes | `false` |
| `--skip-service-worker` | Ignorer la génération du SW | `false` |
| `--skip-injection` | Ignorer l'injection meta-tags | `false` |
| `-o, --output-dir <dir>` | Répertoire de sortie | `public` |

### Fonctionnalités du Mode Interactif

Lors de l'utilisation du mode interactif (`universal-pwa init` sans arguments) :

- ✅ **Valeurs par Défaut Intelligentes** : Détecte automatiquement le nom du projet depuis `package.json`
- ✅ **Détection d'Icônes** : Recherche les icônes dans les emplacements courants (`public/`, `src/assets/`, etc.)
- ✅ **Détection de Framework** : Utilise le framework détecté pour suggérer des valeurs par défaut appropriées
- ✅ **Validation en Temps Réel** : Valide les entrées au fur et à mesure (couleurs, chemins, limites de caractères)
- ✅ **Convivial** : Prompts clairs avec descriptions utiles

## 📦 Fichiers Générés

Après avoir exécuté `universal-pwa init`, les fichiers suivants sont générés :

### Dans `public/` (ou le répertoire de sortie spécifié) :

- `manifest.json` - Fichier manifest PWA
- `sw.js` - Service Worker (Workbox)
- `sw-src.js` - Source du Service Worker (pour personnalisation)
- `icon-*.png` - Icônes PWA en multiples tailles (72x72 à 512x512)
- `apple-touch-icon.png` - Apple Touch Icon (180x180)
- `splash-*.png` - Splash screens pour iOS

### Dans vos fichiers HTML :

- Meta tags injectés dans `<head>` :
  - `<link rel="manifest" href="/manifest.json">`
  - `<meta name="theme-color" content="...">`
  - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
  - Script d'enregistrement du Service Worker

## 📦 Structure

Monorepo pnpm avec les packages suivants :

- `@julien-lin/universal-pwa-core` : Moteur de scan, génération et injection
- `@julien-lin/universal-pwa-cli` : Interface en ligne de commande
- `@julien-lin/universal-pwa-templates` : Templates de service workers par framework
- `@julien-lin/universal-pwa-web-ui` : Interface web no-code (React 19 + Vite + Tailwind 4)
- `@julien-lin/universal-pwa-sdk-php` : SDK PHP/Composer pour intégration Symfony/Laravel
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
pnpm --filter @julien-lin/universal-pwa-core test
```

### Lint

```bash
pnpm lint
```

## 📚 Documentation

Voir le dossier `DOCUMENTATION/` pour :
- [Stack technique](./DOCUMENTATION/stack-technique.md)
- [Prompt initial](./DOCUMENTATION/prompt.md)
- [TODO MVP](./DOCUMENTATION/TODO-MVP.md)
- [Guide de publication](./DOCUMENTATION/PUBLISH.md)

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

Le manifest PWA nécessite au moins une icône. Fournissez une image source avec `--icon-source`, ou utilisez le mode interactif qui vous aidera à en trouver une.

### Service Worker non enregistré

Vérifiez que :
1. Le service worker a été généré (`sw.js` dans le répertoire de sortie)
2. Le script d'enregistrement a été injecté dans votre HTML
3. Vous servez le site via HTTPS (ou localhost pour le développement)

### HTTPS requis en production

Les PWA nécessitent HTTPS en production. Pour le développement local, HTTP sur localhost est accepté.

### Problèmes de chemins avec Vite/React

Pour les projets Vite/React, les fichiers dans `public/` sont servis à la racine. Le CLI gère automatiquement cela en normalisant les chemins (ex: `/public/sw.js` → `/sw.js`).

## 🛠️ Stack Technique

- **Runtime** : Node.js 20+
- **Langage** : TypeScript 5.9+
- **Build** : Vite 7+ (web-ui), tsup 8+ (core/cli/templates)
- **PWA** : Workbox 7.4+
- **Images** : Sharp 0.34+
- **Web UI** : React 19 + Tailwind CSS 4
- **Package Manager** : pnpm 9.12+
- **Prompts CLI** : Inquirer 12.0+

## 💝 Sponsoring

Si UniversalPWA vous est utile, envisagez de sponsoriser le projet pour aider à le maintenir et l'améliorer.

**[⭐ Sponsoriser sur GitHub](https://github.com/sponsors/julien-lin)**

Votre soutien aide à :
- 🚀 Maintenir et améliorer les fonctionnalités principales
- 🐛 Corriger les bugs plus rapidement
- ✨ Ajouter de nouvelles fonctionnalités et intégrations
- 📚 Améliorer la documentation
- 🎯 Supporter plus de frameworks et plateformes
- 🔒 Assurer la pérennité du projet

**Merci à tous nos sponsors ! 🙏**

## 📄 Licence

MIT

## 🗺️ Roadmap

- **MVP** : Scan + génération basique ✅
- **v1.1** : Plugins auto Shopify/WooCommerce
- **v1.2** : Push notifications (OneSignal/FCM) ✅
- **v1.2.2** : Mode interactif avec prompts ✅
- **v2.0** : Éditeur drag-drop + hébergement SW

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les guidelines.

## 📝 Changelog

Voir [CHANGELOG.md](./CHANGELOG.md) pour l'historique des versions.

