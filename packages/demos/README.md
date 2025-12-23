# UniversalPWA - Démos

Ce package contient des projets de démonstration pour tester UniversalPWA sur différents frameworks.

## Structure

- `demo-static/` : Site statique HTML/CSS/JS
- `tests/` : Tests Playwright pour valider les fonctionnalités PWA

## Utilisation

### 1. Initialiser une PWA dans une démo

```bash
cd demo-static
pnpm --filter @universal-pwa/cli exec universal-pwa init \
  --name "Demo Static" \
  --short-name "Demo" \
  --icon-source ./icon.png \
  --theme-color "#2c3e50" \
  --background-color "#ffffff"
```

### 2. Lancer les tests

```bash
# Tests Playwright
pnpm test

# Tests avec interface UI
pnpm test:ui

# Tests Lighthouse
pnpm test:lighthouse
```

## Tests

Les tests Playwright vérifient :
- Structure HTML valide
- Disponibilité du Service Worker
- Présence des éléments head/body
- (À compléter : manifest, meta-tags, offline, A2HS)

## Lighthouse

Pour obtenir un score Lighthouse ≥ 90, la démo doit avoir :
- Manifest.json valide
- Service Worker fonctionnel
- Meta-tags PWA injectés
- Icônes générées
- HTTPS (en production)

## Prochaines étapes

- [ ] Créer démos complètes (WordPress, Symfony, Next.js, Laravel)
- [ ] Ajouter tests Lighthouse automatisés
- [ ] Tests mobiles (iOS Safari, Android Chrome)
- [ ] Tests A2HS (Add to Home Screen)
