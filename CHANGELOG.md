# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

## [1.2.5] - 2024-12-25

### Fixed
- **CRITICAL**: Correction du service worker qui utilisait des imports ES6 non supportés nativement par les navigateurs
- **CRITICAL**: Les service workers ne fonctionnaient pas en production, empêchant l'installation du PWA
- **Templates**: Conversion de tous les templates (static, spa, ssr, wordpress, php) pour utiliser `importScripts()` avec Workbox CDN au lieu d'imports ES6
- **Manifest**: Le manifest.json inclut maintenant toujours `theme_color` et `background_color` (valeurs par défaut: #ffffff) pour garantir l'installabilité du PWA
- **Service Worker**: Utilisation de l'API `workbox.*` via CDN (Workbox 7.4.0) pour compatibilité navigateur maximale

### Changed
- **Service Workers**: Tous les templates chargent maintenant Workbox depuis le CDN Google (`workbox-sw.js`)
- **Manifest Generator**: `theme_color` et `background_color` sont toujours inclus dans le manifest généré

## [1.2.4] - 2024-12-XX

### Added
- Optimisation SEO complète pour le site vitrine
- Support multi-langue (en, fr, es) avec SEO optimisé
- Composant SEO dynamique avec meta tags, Open Graph, Twitter Card, JSON-LD
- Fichiers `robots.txt` et `sitemap.xml` pour le référencement
- Mise à jour du domaine vers `universal-pwa.com`

## [1.2.3] - 2024-12-XX

### Added
- Mode interactif pour la commande `init` avec prompts
- Documentation française (README.fr.md) pour tous les packages
- Site vitrine multi-langue avec système de sponsoring

## [1.2.2] - 2024-12-24

### Fixed
- **CLI**: Correction du bug où `short_name` devenait `undefined` lors de l'initialisation interactive
- **CLI**: Ajout de validations défensives pour s'assurer que toutes les réponses des prompts sont correctement définies
- **CLI**: Amélioration de la gestion des valeurs par défaut pour `name` et `shortName`

## [1.2.1] - 2024-12-XX

### Added
- Phase 0 : Setup monorepo avec pnpm workspaces
- Phase 1 : Scanner & Détection Auto (framework, assets, architecture)
- Phase 2 : Générateur Manifest & Service Worker
- Phase 3 : Injecteur Meta-Tags
- Phase 4 : CLI avec commandes init/preview/scan
- Phase 5 : Structure de base pour tests sur démos (Playwright)

### Changed
- Structure monorepo optimisée
- Configuration ESLint 9 (flat config)
- Configuration Vitest avec coverage

## [0.0.0] - 2024-XX-XX

### Added
- Structure initiale du projet
- Configuration TypeScript
- Configuration pnpm workspaces
- Packages : core, cli, templates, web-ui, sdk-php, demos

---

## Types de changements

- `Added` : Nouvelles fonctionnalités
- `Changed` : Changements dans les fonctionnalités existantes
- `Deprecated` : Fonctionnalités qui seront supprimées
- `Removed` : Fonctionnalités supprimées
- `Fixed` : Corrections de bugs
- `Security` : Corrections de vulnérabilités

