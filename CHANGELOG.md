# Changelog

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère à [Semantic Versioning](https://semver.org/lang/fr/).

## [Unreleased]

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

