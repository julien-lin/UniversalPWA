# UniversalPWA

> Bibliothèque universelle (CLI + lib NPM/Composer) transformant n'importe quel projet web existant en Progressive Web App (PWA) en un clic, sans refonte du code source.

## 🎯 Objectif

Démocratiser les PWA pour PME/artisans/développeurs solo, viser 10k installs/an via GitHub + marketplaces.

## ✨ Fonctionnalités

- 🔍 **Scan & Détection Auto** : Détection automatique du framework (WordPress, Shopify, Symfony, Laravel, React, Vue, Angular, Next.js, Nuxt, HTML statique)
- ⚡ **Génération One-Click** : Manifest.json + Service Worker optimisé + injection meta-tags
- 🎨 **Customisation No-Code** : Éditeur web pour personnaliser couleurs, icônes, stratégies de cache
- 📊 **Analytics & Monitoring** : Dashboard gratuit avec métriques PWA
- 🚀 **Déploiement** : Support Vercel/Netlify/Cloudflare + GitHub Actions

## 📦 Structure

Monorepo pnpm avec les packages suivants :

- `@universal-pwa/core` : Moteur de scan, génération et injection
- `@universal-pwa/cli` : Interface en ligne de commande
- `@universal-pwa/templates` : Templates de service workers par framework
- `@universal-pwa/web-ui` : Interface web no-code (React 19 + Vite + Tailwind 4)
- `@universal-pwa/sdk-php` : SDK PHP/Composer pour intégration Symfony/Laravel
- `packages/demos` : Projets de démonstration

## 🚀 Installation

```bash
# Installation des dépendances
pnpm install

# Développement web UI
pnpm dev:web

# Build tous les packages
pnpm build

# Tests
pnpm test

# Lint
pnpm lint
```

## 📚 Documentation

Voir le dossier `DOCUMENTATION/` pour :
- [Cahier des charges](./DOCUMENTATION/cahier-des-charges.md)
- [Stack technique](./DOCUMENTATION/stack-technique.md)
- [Prompt initial](./DOCUMENTATION/prompt.md)

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

- **MVP** : Scan + génération basique (2-3 semaines)
- **v1.1** : Plugins auto Shopify/WooCommerce
- **v1.2** : Push notifications (OneSignal/FCM)
- **v2.0** : Éditeur drag-drop + hébergement SW

## 🤝 Contribution

Les contributions sont les bienvenues ! Voir les issues GitHub pour les tâches en cours.
