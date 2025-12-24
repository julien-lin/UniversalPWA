# @julien-lin/universal-pwa-web-ui

[![GitHub Sponsors](https://img.shields.io/github/sponsors/julien-lin?style=flat-square&logo=github)](https://github.com/sponsors/julien-lin)
[![npm version](https://img.shields.io/npm/v/@julien-lin/universal-pwa-cli?style=flat-square&logo=npm)](https://www.npmjs.com/package/@julien-lin/universal-pwa-cli)

> Site vitrine multi-langue pour UniversalPWA

Site web de présentation pour UniversalPWA, construit avec React 19, TailwindCSS 4, et React Router.

## 🌍 Fonctionnalités

- **Multi-langue** : Support de l'anglais, français et espagnol
- **Navigation** : React Router pour une navigation fluide
- **Design moderne** : Interface utilisateur moderne avec TailwindCSS 4
- **Responsive** : Optimisé pour tous les appareils
- **Sponsoring** : Mise en avant du système de sponsoring GitHub

## 🚀 Développement

```bash
# Installer les dépendances
pnpm install

# Lancer le serveur de développement
pnpm dev

# Build pour la production
pnpm build

# Prévisualiser le build
pnpm preview
```

## 📁 Structure

```
src/
├── components/      # Composants réutilisables (Header, Footer)
├── contexts/       # Contextes React (LanguageContext)
├── hooks/          # Hooks personnalisés (useTranslation)
├── i18n/           # Traductions (en, fr, es)
├── pages/          # Pages de l'application (Home, Features, Sponsors)
└── App.tsx         # Composant principal avec routing
```

## 🌐 Langues

Le site supporte 3 langues :
- **Anglais (en)** : Langue par défaut
- **Français (fr)** : Détection automatique si la langue du navigateur est le français
- **Espagnol (es)** : Détection automatique si la langue du navigateur est l'espagnol

La langue sélectionnée est sauvegardée dans `localStorage` pour persister entre les sessions.

## 📄 Pages

- **/** : Page d'accueil avec présentation et quick start
- **/features** : Liste complète des fonctionnalités
- **/sponsors** : Page de sponsoring avec lien vers GitHub Sponsors

## 🎨 Technologies

- **React 19** : Framework UI
- **React Router DOM** : Navigation
- **TailwindCSS 4** : Styling
- **React Icons** : Icônes
- **Vite** : Build tool

## 📚 Documentation

Pour plus d'informations sur UniversalPWA, consultez :
- [Documentation principale](../../README.md)
- [Documentation CLI](../cli/README.md)
- [Documentation Core](../core/README.md)

## 🤝 Support

- **GitHub Discussions** : [Discussions](https://github.com/julien-lin/UniversalPWA/discussions)
- **GitHub Sponsors** : [Devenir sponsor](https://github.com/sponsors/julien-lin)
