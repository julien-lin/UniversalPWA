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
  whatIsPWA: {
    title: string
    subtitle: string
    definition: string
    benefits: Array<{
      title: string
      description: string
      icon: string
    }>
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
    whatIsPWA: {
      title: 'What is a PWA?',
      subtitle: 'Understanding Progressive Web Apps',
      definition: 'A Progressive Web App (PWA) is a web application that uses modern web capabilities to provide a native app-like experience. PWAs combine the best of web and mobile apps, offering fast loading, offline functionality, and the ability to install on devices.',
      benefits: [
        {
          title: 'Installable',
          description: 'Users can install PWAs directly from their browser, no app store required. They appear on the home screen just like native apps.',
          icon: '📱',
        },
        {
          title: 'Offline Support',
          description: 'PWAs work offline or on slow networks thanks to service workers. Content is cached and available even without internet.',
          icon: '🌐',
        },
        {
          title: 'Fast & Responsive',
          description: 'PWAs load instantly and respond quickly to user interactions, providing a smooth experience on any device.',
          icon: '⚡',
        },
        {
          title: 'Cross-Platform',
          description: 'One PWA works across all platforms - iOS, Android, Windows, macOS, and Linux. No need to build separate apps.',
          icon: '🔄',
        },
        {
          title: 'Secure',
          description: 'PWAs require HTTPS, ensuring all data is encrypted and secure. Users can trust your application.',
          icon: '🔒',
        },
        {
          title: 'Always Up-to-Date',
          description: 'PWAs automatically update in the background. Users always have the latest version without manual updates.',
          icon: '🔄',
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
    whatIsPWA: {
      title: 'Qu\'est-ce qu\'une PWA?',
      subtitle: 'Comprendre les Progressive Web Apps',
      definition: 'Une Progressive Web App (PWA) est une application web qui utilise les capacités modernes du web pour offrir une expérience similaire à une application native. Les PWA combinent le meilleur du web et des applications mobiles, offrant un chargement rapide, des fonctionnalités hors ligne et la possibilité de s\'installer sur les appareils.',
      benefits: [
        {
          title: 'Installable',
          description: 'Les utilisateurs peuvent installer les PWA directement depuis leur navigateur, sans magasin d\'applications. Elles apparaissent sur l\'écran d\'accueil comme les applications natives.',
          icon: '📱',
        },
        {
          title: 'Support Hors Ligne',
          description: 'Les PWA fonctionnent hors ligne ou sur des réseaux lents grâce aux service workers. Le contenu est mis en cache et disponible même sans internet.',
          icon: '🌐',
        },
        {
          title: 'Rapide & Réactive',
          description: 'Les PWA se chargent instantanément et répondent rapidement aux interactions utilisateur, offrant une expérience fluide sur n\'importe quel appareil.',
          icon: '⚡',
        },
        {
          title: 'Multi-Plateforme',
          description: 'Une seule PWA fonctionne sur toutes les plateformes - iOS, Android, Windows, macOS et Linux. Pas besoin de créer des applications séparées.',
          icon: '🔄',
        },
        {
          title: 'Sécurisée',
          description: 'Les PWA nécessitent HTTPS, garantissant que toutes les données sont cryptées et sécurisées. Les utilisateurs peuvent faire confiance à votre application.',
          icon: '🔒',
        },
        {
          title: 'Toujours à Jour',
          description: 'Les PWA se mettent à jour automatiquement en arrière-plan. Les utilisateurs ont toujours la dernière version sans mises à jour manuelles.',
          icon: '🔄',
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
    whatIsPWA: {
      title: '¿Qué es una PWA?',
      subtitle: 'Entendiendo las Progressive Web Apps',
      definition: 'Una Progressive Web App (PWA) es una aplicación web que utiliza capacidades modernas de la web para proporcionar una experiencia similar a una aplicación nativa. Las PWA combinan lo mejor de la web y las aplicaciones móviles, ofreciendo carga rápida, funcionalidad offline y la capacidad de instalarse en dispositivos.',
      benefits: [
        {
          title: 'Instalable',
          description: 'Los usuarios pueden instalar PWAs directamente desde su navegador, sin necesidad de tienda de aplicaciones. Aparecen en la pantalla de inicio como aplicaciones nativas.',
          icon: '📱',
        },
        {
          title: 'Soporte Offline',
          description: 'Las PWAs funcionan offline o en redes lentas gracias a los service workers. El contenido se almacena en caché y está disponible incluso sin internet.',
          icon: '🌐',
        },
        {
          title: 'Rápida y Responsiva',
          description: 'Las PWAs se cargan instantáneamente y responden rápidamente a las interacciones del usuario, proporcionando una experiencia fluida en cualquier dispositivo.',
          icon: '⚡',
        },
        {
          title: 'Multiplataforma',
          description: 'Una sola PWA funciona en todas las plataformas - iOS, Android, Windows, macOS y Linux. No es necesario crear aplicaciones separadas.',
          icon: '🔄',
        },
        {
          title: 'Segura',
          description: 'Las PWAs requieren HTTPS, asegurando que todos los datos estén encriptados y seguros. Los usuarios pueden confiar en tu aplicación.',
          icon: '🔒',
        },
        {
          title: 'Siempre Actualizada',
          description: 'Las PWAs se actualizan automáticamente en segundo plano. Los usuarios siempre tienen la última versión sin actualizaciones manuales.',
          icon: '🔄',
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

