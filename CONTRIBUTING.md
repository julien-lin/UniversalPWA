# Guide de Contribution

Merci de votre intérêt pour contribuer à UniversalPWA ! Ce document décrit les guidelines pour contribuer au projet.

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+
- pnpm 9.12+
- Git

### Installation

```bash
# Cloner le repository
git clone https://github.com/julien-lin/UniversalPWA.git
cd UniversalPWA

# Installer les dépendances
pnpm install

# Build tous les packages
pnpm build
```

## 📝 Convention de Commits

Nous utilisons [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation uniquement
- `style:` Formatage, point-virgule manquant, etc.
- `refactor:` Refactoring du code
- `test:` Ajout/modification de tests
- `chore:` Maintenance (dépendances, config, etc.)

Exemples :

```bash
feat(core): add manifest generator
fix(cli): handle missing icon source gracefully
docs(readme): add troubleshooting section
test(core): add tests for icon generator
```

## 🧪 Tests

### Exécuter les tests

```bash
# Tous les tests
pnpm test

# Tests avec coverage
pnpm test:coverage

# Tests d'un package spécifique
pnpm --filter @universal-pwa/core test
```

### Écrire des tests

- Utiliser Vitest pour les tests unitaires
- Utiliser Playwright pour les tests E2E (demos)
- Viser une couverture ≥ 80% pour core/cli/templates
- Un test par fonctionnalité principale

## 🔍 Lint

```bash
# Linter tous les packages
pnpm lint

# Linter un package spécifique
pnpm --filter @universal-pwa/core lint
```

## 📦 Structure du Monorepo

```
UniversalPWA/
├── packages/
│   ├── core/          # Moteur de scan, génération, injection
│   ├── cli/           # Interface en ligne de commande
│   ├── templates/     # Templates de service workers
│   ├── web-ui/        # Interface web no-code
│   ├── sdk-php/       # SDK PHP/Composer
│   └── demos/         # Projets de démonstration
├── DOCUMENTATION/     # Documentation du projet
└── .github/           # GitHub Actions, workflows
```

## 🎯 Workflow de Contribution

1. **Fork** le repository
2. **Créer une branche** depuis `main` : `git checkout -b feat/ma-fonctionnalite`
3. **Développer** votre fonctionnalité
4. **Tester** : `pnpm test && pnpm lint`
5. **Commit** avec un message conventionnel
6. **Push** vers votre fork
7. **Créer une Pull Request**

## 📋 Checklist avant PR

- [ ] Code testé (tests unitaires + coverage ≥ 80%)
- [ ] Lint passé (`pnpm lint`)
- [ ] Build réussi (`pnpm build`)
- [ ] Documentation mise à jour si nécessaire
- [ ] Commit message suit les conventions
- [ ] Pas de breaking changes (ou documentés)

## 🐛 Signaler un Bug

Utilisez les [GitHub Issues](https://github.com/julien-lin/UniversalPWA/issues) avec :

- Description claire du problème
- Steps to reproduce
- Comportement attendu vs. actuel
- Environnement (OS, Node.js version, etc.)
- Logs/erreurs si disponibles

## 💡 Proposer une Fonctionnalité

Ouvrez une issue avec :

- Description de la fonctionnalité
- Cas d'usage
- Alternatives considérées
- Impact sur l'API existante

## 📚 Documentation

- Code : JSDoc pour les fonctions publiques
- README : Mise à jour pour les nouvelles fonctionnalités
- Exemples : Ajouter dans `packages/demos/` si pertinent

## 🔐 Code Review

Toutes les PRs nécessitent une review avant merge. Les reviewers vérifieront :

- Qualité du code
- Tests et coverage
- Conformité aux conventions
- Documentation

## 📞 Questions ?

Ouvrez une discussion sur GitHub ou contactez les maintainers.

Merci de contribuer à UniversalPWA ! 🎉

