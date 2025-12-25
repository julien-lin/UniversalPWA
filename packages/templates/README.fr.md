# @julien-lin/universal-pwa-templates

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-templates?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-templates)

Templates de service workers pour UniversalPWA, adaptés aux différentes architectures (statique, SPA, SSR) et variantes de frameworks (Next.js/Nuxt, WordPress, Laravel, Symfony).

## Installation

```bash
npm install @julien-lin/universal-pwa-templates
```

Ou avec pnpm :

```bash
pnpm add @julien-lin/universal-pwa-templates
```

## Utilisation

```typescript
import { getServiceWorkerTemplate } from '@julien-lin/universal-pwa-templates'

const template = getServiceWorkerTemplate({
  architecture: 'spa',
  framework: 'react',
})

console.log(template) // Contenu du template de service worker
```

## Templates Supportés

- **Static** : Pour sites HTML/CSS/JS statiques
- **SPA** : Pour applications Single Page (React, Vue, Angular)
- **SSR** : Pour applications Server-Side Rendered (Next.js, Nuxt)
- **WordPress** : Optimisé pour les thèmes WordPress
- **PHP** : Pour frameworks PHP (Laravel, Symfony)

## API

- `getServiceWorkerTemplate(options)` : Obtenir le template de service worker approprié
- `getTemplateForArchitecture(architecture)` : Obtenir le template pour une architecture spécifique
- `getTemplateForFramework(framework)` : Obtenir le template pour un framework spécifique

## 💝 Sponsoring

Si UniversalPWA vous est utile, envisagez de [sponsoriser le projet](https://github.com/sponsors/julien-lin) pour aider à le maintenir et l'améliorer.

## Liens

- **Repository** : [https://github.com/julien-lin/UniversalPWA](https://github.com/julien-lin/UniversalPWA)
- **Issues** : [https://github.com/julien-lin/UniversalPWA/issues](https://github.com/julien-lin/UniversalPWA/issues)
- **Discussions** : [https://github.com/julien-lin/UniversalPWA/discussions](https://github.com/julien-lin/UniversalPWA/discussions)
- **Contribution** : [https://github.com/julien-lin/UniversalPWA/blob/main/CONTRIBUTING.md](https://github.com/julien-lin/UniversalPWA/blob/main/CONTRIBUTING.md)
- **Releases** : [https://github.com/julien-lin/UniversalPWA/releases](https://github.com/julien-lin/UniversalPWA/releases)
- **Sponsor** : [https://github.com/sponsors/julien-lin](https://github.com/sponsors/julien-lin)
- **Package npm** : [https://www.npmjs.com/package/@julien-lin/universal-pwa-templates](https://www.npmjs.com/package/@julien-lin/universal-pwa-templates)

