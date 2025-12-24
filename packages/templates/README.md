# @julien-lin/universal-pwa-templates

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?logo=github&style=flat-square&label=Sponsors)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-templates?logo=npm&style=flat-square)](https://www.npmjs.com/package/@julien-lin/universal-pwa-templates)

Service worker templates for UniversalPWA, adapted to different architectures (static, SPA, SSR) and framework variants (Next.js/Nuxt, WordPress, Laravel, Symfony).

**🇫🇷 [Documentation en français](./README.fr.md)**

## Installation

```bash
npm install @julien-lin/universal-pwa-templates
```

Or with pnpm:

```bash
pnpm add @julien-lin/universal-pwa-templates
```

## Usage

```typescript
import { getServiceWorkerTemplate } from '@julien-lin/universal-pwa-templates'

const template = getServiceWorkerTemplate({
  architecture: 'spa',
  framework: 'react',
})

console.log(template) // Service worker template content
```

## Supported Templates

- **Static** : For static HTML/CSS/JS sites
- **SPA** : For Single Page Applications (React, Vue, Angular)
- **SSR** : For Server-Side Rendered apps (Next.js, Nuxt)
- **WordPress** : Optimized for WordPress themes
- **PHP** : For PHP frameworks (Laravel, Symfony)

## API

- `getServiceWorkerTemplate(options)` : Get the appropriate service worker template
- `getTemplateForArchitecture(architecture)` : Get template for a specific architecture
- `getTemplateForFramework(framework)` : Get template for a specific framework

## 💝 Sponsoring

If UniversalPWA is useful to you, please consider [sponsoring the project](https://github.com/sponsors/julien-lin) to help maintain and improve it.

## Links

- **Homepage**: https://github.com/julien-lin/UniversalPWA
- **Support**: For issues and questions, please use [GitHub Discussions](https://github.com/julien-lin/UniversalPWA/discussions)
- **Sponsor**: https://github.com/sponsors/julien-lin
