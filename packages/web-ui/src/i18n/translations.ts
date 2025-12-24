export type Language = 'en' | 'fr' | 'es'

export interface Translations {
  nav: {
    home: string
    features: string
    sponsors: string
    docs: string
  }
  hero: {
    title: string
    subtitle: string
    cta: string
    ctaSecondary: string
  }
  features: {
    title: string
    subtitle: string
    items: Array<{
      title: string
      description: string
      icon: string
    }>
  }
  sponsors: {
    title: string
    subtitle: string
    description: string
    cta: string
    benefits: string[]
  }
  footer: {
    description: string
    links: {
      home: string
      features: string
      sponsors: string
      docs: string
    }
    copyright: string
  }
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      home: 'Home',
      features: 'Features',
      sponsors: 'Sponsors',
      docs: 'Documentation',
    },
    hero: {
      title: 'Transform Any Web Project into a PWA',
      subtitle: 'One-click solution to convert your existing website into a Progressive Web App. No code refactoring required.',
      cta: 'Get Started',
      ctaSecondary: 'View Documentation',
    },
    features: {
      title: 'Why Choose UniversalPWA?',
      subtitle: 'Everything you need to create powerful Progressive Web Apps',
      items: [
        {
          title: 'One-Click Conversion',
          description: 'Transform any web project into a PWA instantly. No manual configuration needed.',
          icon: '⚡',
        },
        {
          title: 'Framework Agnostic',
          description: 'Works with React, Vue, Angular, Next.js, WordPress, Symfony, Laravel, and static sites.',
          icon: '🔧',
        },
        {
          title: 'Auto-Detection',
          description: 'Automatically detects your project framework and generates optimized PWA files.',
          icon: '🔍',
        },
        {
          title: 'Interactive Mode',
          description: 'User-friendly prompts guide you through the setup process with smart defaults.',
          icon: '💬',
        },
        {
          title: 'Icon Generation',
          description: 'Automatically generates all required PWA icons and splash screens from a single source image.',
          icon: '🎨',
        },
        {
          title: 'Production Ready',
          description: 'Generates optimized service workers with Workbox and validates all PWA requirements.',
          icon: '🚀',
        },
      ],
    },
    sponsors: {
      title: 'Support UniversalPWA',
      subtitle: 'Help us build the future of Progressive Web Apps',
      description: 'UniversalPWA is an open-source project maintained by passionate developers. Your support helps us continue improving and adding new features.',
      cta: 'Become a Sponsor',
      benefits: [
        '🚀 Maintain and improve core features',
        '🐛 Fix bugs faster',
        '✨ Add new features and integrations',
        '📚 Improve documentation',
        '🎯 Support more frameworks and platforms',
      ],
    },
    footer: {
      description: 'Transform any web project into a Progressive Web App with one click.',
      links: {
        home: 'Home',
        features: 'Features',
        sponsors: 'Sponsors',
        docs: 'Documentation',
      },
      copyright: '© 2024 UniversalPWA. All rights reserved.',
    },
  },
  fr: {
    nav: {
      home: 'Accueil',
      features: 'Fonctionnalités',
      sponsors: 'Sponsors',
      docs: 'Documentation',
    },
    hero: {
      title: 'Transformez N\'importe Quel Projet Web en PWA',
      subtitle: 'Solution en un clic pour convertir votre site web existant en Progressive Web App. Aucune refonte de code requise.',
      cta: 'Commencer',
      ctaSecondary: 'Voir la Documentation',
    },
    features: {
      title: 'Pourquoi Choisir UniversalPWA?',
      subtitle: 'Tout ce dont vous avez besoin pour créer des Progressive Web Apps puissantes',
      items: [
        {
          title: 'Conversion en Un Clic',
          description: 'Transformez n\'importe quel projet web en PWA instantanément. Aucune configuration manuelle nécessaire.',
          icon: '⚡',
        },
        {
          title: 'Indépendant du Framework',
          description: 'Fonctionne avec React, Vue, Angular, Next.js, WordPress, Symfony, Laravel et sites statiques.',
          icon: '🔧',
        },
        {
          title: 'Détection Automatique',
          description: 'Détecte automatiquement votre framework et génère des fichiers PWA optimisés.',
          icon: '🔍',
        },
        {
          title: 'Mode Interactif',
          description: 'Prompts conviviaux vous guident à travers le processus de configuration avec des valeurs par défaut intelligentes.',
          icon: '💬',
        },
        {
          title: 'Génération d\'Icônes',
          description: 'Génère automatiquement toutes les icônes PWA et splash screens requises à partir d\'une seule image source.',
          icon: '🎨',
        },
        {
          title: 'Prêt pour la Production',
          description: 'Génère des service workers optimisés avec Workbox et valide tous les requis PWA.',
          icon: '🚀',
        },
      ],
    },
    sponsors: {
      title: 'Soutenez UniversalPWA',
      subtitle: 'Aidez-nous à construire l\'avenir des Progressive Web Apps',
      description: 'UniversalPWA est un projet open-source maintenu par des développeurs passionnés. Votre soutien nous aide à continuer d\'améliorer et d\'ajouter de nouvelles fonctionnalités.',
      cta: 'Devenir Sponsor',
      benefits: [
        '🚀 Maintenir et améliorer les fonctionnalités principales',
        '🐛 Corriger les bugs plus rapidement',
        '✨ Ajouter de nouvelles fonctionnalités et intégrations',
        '📚 Améliorer la documentation',
        '🎯 Supporter plus de frameworks et plateformes',
      ],
    },
    footer: {
      description: 'Transformez n\'importe quel projet web en Progressive Web App en un clic.',
      links: {
        home: 'Accueil',
        features: 'Fonctionnalités',
        sponsors: 'Sponsors',
        docs: 'Documentation',
      },
      copyright: '© 2024 UniversalPWA. Tous droits réservés.',
    },
  },
  es: {
    nav: {
      home: 'Inicio',
      features: 'Características',
      sponsors: 'Patrocinadores',
      docs: 'Documentación',
    },
    hero: {
      title: 'Transforma Cualquier Proyecto Web en una PWA',
      subtitle: 'Solución de un clic para convertir tu sitio web existente en una Progressive Web App. No se requiere refactorización de código.',
      cta: 'Comenzar',
      ctaSecondary: 'Ver Documentación',
    },
    features: {
      title: '¿Por Qué Elegir UniversalPWA?',
      subtitle: 'Todo lo que necesitas para crear Progressive Web Apps potentes',
      items: [
        {
          title: 'Conversión de Un Clic',
          description: 'Transforma cualquier proyecto web en una PWA instantáneamente. No se necesita configuración manual.',
          icon: '⚡',
        },
        {
          title: 'Independiente del Framework',
          description: 'Funciona con React, Vue, Angular, Next.js, WordPress, Symfony, Laravel y sitios estáticos.',
          icon: '🔧',
        },
        {
          title: 'Detección Automática',
          description: 'Detecta automáticamente tu framework y genera archivos PWA optimizados.',
          icon: '🔍',
        },
        {
          title: 'Modo Interactivo',
          description: 'Prompts amigables te guían a través del proceso de configuración con valores predeterminados inteligentes.',
          icon: '💬',
        },
        {
          title: 'Generación de Iconos',
          description: 'Genera automáticamente todos los iconos PWA y splash screens requeridos desde una sola imagen fuente.',
          icon: '🎨',
        },
        {
          title: 'Listo para Producción',
          description: 'Genera service workers optimizados con Workbox y valida todos los requisitos PWA.',
          icon: '🚀',
        },
      ],
    },
    sponsors: {
      title: 'Apoya UniversalPWA',
      subtitle: 'Ayúdanos a construir el futuro de las Progressive Web Apps',
      description: 'UniversalPWA es un proyecto open-source mantenido por desarrolladores apasionados. Tu apoyo nos ayuda a continuar mejorando y agregando nuevas funcionalidades.',
      cta: 'Convertirse en Patrocinador',
      benefits: [
        '🚀 Mantener y mejorar las funcionalidades principales',
        '🐛 Corregir errores más rápido',
        '✨ Agregar nuevas funcionalidades e integraciones',
        '📚 Mejorar la documentación',
        '🎯 Soportar más frameworks y plataformas',
      ],
    },
    footer: {
      description: 'Transforma cualquier proyecto web en una Progressive Web App con un clic.',
      links: {
        home: 'Inicio',
        features: 'Características',
        sponsors: 'Patrocinadores',
        docs: 'Documentación',
      },
      copyright: '© 2024 UniversalPWA. Todos los derechos reservados.',
    },
  },
}

