# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

### Fixed

- **Core + CLI**: [P0 CRITICAL] Correction + Sécurisation du contexte `this` sur backend integrations
  - **Issue**: `Cannot read properties of undefined (reading 'config')` lors de la génération PWA sur Symfony/Django/Laravel/Flask
  - **Root Cause**: Extraction de méthode perdait le contexte `this` (ligne 543 et 569 de init.ts)
  - **Solution (Immédiate)**: Appel direct `backendIntegration.detect()` au lieu d'extraction
  - **Sécurisation (Structurelle)**: Conversion de `detect()` en arrow functions dans tous les backends
    - Symfony: `packages/core/src/backends/symfony.ts`
    - Django: `packages/core/src/backends/django.ts`
    - Laravel: `packages/core/src/backends/laravel.ts`
    - Flask: `packages/core/src/backends/flask.ts`
  - **Tests**: Tests anti-régression robustes dans `backend-binding.e2e.test.ts`
    - Validation vraie intégration Symfony
    - Validation extraction de méthode sans perte contexte
    - Validation pattern init.ts
  - **Impact**: Génération PWA Symfony, Django, Laravel, Rails, Flask maintenant fonctionnelle
  - **Prevention**: Arrow functions garantissent que le bug ne peut pas réapparaître
  - **Status**: Bug fix + Sécurisation structurelle (impossible à réintroduire)

## [1.3.3] - 2025-01-XX

### Added

- **CLI**: Nouvelle commande `remove` pour supprimer une PWA générée
- **CLI**: Suppression automatique des fichiers PWA (manifest.json, sw.js, icônes, workbox-\*.js)
- **CLI**: Restauration automatique des fichiers HTML (suppression des meta-tags PWA et scripts de service worker)
- **CLI**: Détection automatique du répertoire de sortie pour la commande `remove`
- **CLI**: Options `--skip-html-restore` et `--skip-files` pour la commande `remove`

### Fixed

- **CLI**: Correction de la résolution de `outputDir` pour les chemins relatifs dans la commande `init`
- **CLI**: Les fichiers PWA sont maintenant correctement générés dans `dist/` en mode production

### Changed

- **CLI**: Optimisation des tests avec helpers réutilisables
- **CLI**: Amélioration de la gestion des transactions pour la commande `remove`

## [1.3.2] - 2025-01-XX

### Added

- **CLI**: Tests unitaires complets pour `prompts.ts` (31 tests, 84.65% coverage)
- **CLI**: Nouveau flux interactif 2 phases (sélection environnement + configuration)
- **CLI**: Détection automatique d'environnement (Local/Production) basée sur `dist/` ou `build/`
- **Documentation**: Mise à jour README avec nouveau workflow 2 phases

### Changed

- **CLI**: Amélioration de l'expérience utilisateur avec suggestions contextuelles
- **CLI**: Affichage des indicateurs de détection d'environnement
- **Documentation**: README mis à jour pour documenter le nouveau flux interactif

### Fixed

- **CLI**: Amélioration de la validation des prompts (noms, couleurs, icônes)
- **CLI**: Normalisation automatique des couleurs hex (3 → 6 caractères)

## [1.2.7] - 2024-12-25

### Added

- **CLI**: Nouvelle commande `verify` pour vérifier la configuration PWA
- **CLI**: Détection automatique des fichiers PWA manquants
- **CLI**: Vérification du Dockerfile et suggestions d'amélioration
- **CLI**: Rapport détaillé des fichiers trouvés et manquants

### Fixed

- **CLI**: Correction des erreurs de lint dans la commande `verify`

## [1.2.6] - 2024-12-25

### Fixed

- **CLI**: Support du dossier `dist/` pour les builds de production
- **CLI**: Correction de la normalisation des chemins pour le service worker dans `dist/`
- **Core**: Amélioration de la suppression du meta tag déprécié `apple-mobile-web-app-capable`
- **Core**: Correction de l'injection du meta tag `theme-color` qui n'était pas injecté
- **Core**: Correction de `findElement` pour utiliser `attribs` au lieu de `attributes` (compatibilité htmlparser2)
- **Core**: Amélioration de la validation et de l'encodage du manifest.json (UTF-8 sans BOM)

### Changed

- **CLI**: Priorisation des fichiers HTML dans `dist/` pour les builds de production
- **Core**: Remplacement automatique de `apple-mobile-web-app-capable` par `mobile-web-app-capable`

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
