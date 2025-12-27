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
    quickLinks: string
    support: string
    github: string
    sponsor: string
  }
  quickStart: {
    title: string
    subtitle: string
    step1: string
    step2: string
    step3: string
    step3Description: string
  }
  featuresPage: {
    title: string
    ctaTitle: string
    ctaSubtitle: string
    ctaButton: string
  }
  sponsorsPage: {
    ourSponsors: string
    thankYou: string
    viewOnGitHub: string
    questions: string
    contactVia: string
    githubDiscussions: string
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
          icon: 'zap',
        },
        {
          title: 'Framework Agnostic',
          description: 'Works with React, Vue, Angular, Next.js, WordPress, Symfony, Laravel, and static sites.',
          icon: 'settings',
        },
        {
          title: 'Auto-Detection',
          description: 'Automatically detects your project framework and generates optimized PWA files.',
          icon: 'search',
        },
        {
          title: 'Interactive Mode',
          description: 'User-friendly prompts guide you through the setup process with smart defaults.',
          icon: 'message-circle',
        },
        {
          title: 'Icon Generation',
          description: 'Automatically generates all required PWA icons and splash screens from a single source image.',
          icon: 'image',
        },
        {
          title: 'Production Ready',
          description: 'Generates optimized service workers with Workbox and validates all PWA requirements.',
          icon: 'send',
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
          icon: 'smartphone',
        },
        {
          title: 'Offline Support',
          description: 'PWAs work offline or on slow networks thanks to service workers. Content is cached and available even without internet.',
          icon: 'globe',
        },
        {
          title: 'Fast & Responsive',
          description: 'PWAs load instantly and respond quickly to user interactions, providing a smooth experience on any device.',
          icon: 'zap',
        },
        {
          title: 'Cross-Platform',
          description: 'One PWA works across all platforms - iOS, Android, Windows, macOS, and Linux. No need to build separate apps.',
          icon: 'refresh-cw',
        },
        {
          title: 'Secure',
          description: 'PWAs require HTTPS, ensuring all data is encrypted and secure. Users can trust your application.',
          icon: 'shield',
        },
        {
          title: 'Always Up-to-Date',
          description: 'PWAs automatically update in the background. Users always have the latest version without manual updates.',
          icon: 'refresh-cw',
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
      quickLinks: 'Quick Links',
      support: 'Support',
      github: 'GitHub',
      sponsor: 'Sponsor',
    },
    quickStart: {
      title: 'How to Create a PWA in 3 Simple Steps',
      subtitle: 'Transform your web project into a Progressive Web App with UniversalPWA - the fastest PWA generator available',
      step1: '1. Install',
      step2: '2. Initialize',
      step3: '3. Deploy',
      step3Description: 'Your PWA is ready to deploy!',
    },
    featuresPage: {
      title: 'UniversalPWA Features - Complete PWA Generator Solution',
      ctaTitle: 'Ready to Get Started?',
      ctaSubtitle: 'Transform your web project into a PWA in minutes',
      ctaButton: 'Install Now',
    },
    sponsorsPage: {
      ourSponsors: 'Our Sponsors',
      thankYou: 'Thank you to everyone who supports UniversalPWA!',
      viewOnGitHub: 'View on GitHub Sponsors',
      questions: 'Questions about sponsoring?',
      contactVia: 'Contact us via',
      githubDiscussions: 'GitHub Discussions',
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
          icon: 'zap',
        },
        {
          title: 'Indépendant du Framework',
          description: 'Fonctionne avec React, Vue, Angular, Next.js, WordPress, Symfony, Laravel et sites statiques.',
          icon: 'settings',
        },
        {
          title: 'Détection Automatique',
          description: 'Détecte automatiquement votre framework et génère des fichiers PWA optimisés.',
          icon: 'search',
        },
        {
          title: 'Mode Interactif',
          description: 'Prompts conviviaux vous guident à travers le processus de configuration avec des valeurs par défaut intelligentes.',
          icon: 'message-circle',
        },
        {
          title: 'Génération d\'Icônes',
          description: 'Génère automatiquement toutes les icônes PWA et splash screens requises à partir d\'une seule image source.',
          icon: 'image',
        },
        {
          title: 'Prêt pour la Production',
          description: 'Génère des service workers optimisés avec Workbox et valide tous les requis PWA.',
          icon: 'send',
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
          icon: 'smartphone',
        },
        {
          title: 'Support Hors Ligne',
          description: 'Les PWA fonctionnent hors ligne ou sur des réseaux lents grâce aux service workers. Le contenu est mis en cache et disponible même sans internet.',
          icon: 'globe',
        },
        {
          title: 'Rapide & Réactive',
          description: 'Les PWA se chargent instantanément et répondent rapidement aux interactions utilisateur, offrant une expérience fluide sur n\'importe quel appareil.',
          icon: 'zap',
        },
        {
          title: 'Multi-Plateforme',
          description: 'Une seule PWA fonctionne sur toutes les plateformes - iOS, Android, Windows, macOS et Linux. Pas besoin de créer des applications séparées.',
          icon: 'refresh-cw',
        },
        {
          title: 'Sécurisée',
          description: 'Les PWA nécessitent HTTPS, garantissant que toutes les données sont cryptées et sécurisées. Les utilisateurs peuvent faire confiance à votre application.',
          icon: 'shield',
        },
        {
          title: 'Toujours à Jour',
          description: 'Les PWA se mettent à jour automatiquement en arrière-plan. Les utilisateurs ont toujours la dernière version sans mises à jour manuelles.',
          icon: 'refresh-cw',
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
      quickLinks: 'Liens Rapides',
      support: 'Support',
      github: 'GitHub',
      sponsor: 'Sponsor',
    },
    quickStart: {
      title: 'Comment Créer une PWA en 3 Étapes Simples',
      subtitle: 'Transformez votre projet web en Progressive Web App avec UniversalPWA - le générateur PWA le plus rapide disponible',
      step1: '1. Installer',
      step2: '2. Initialiser',
      step3: '3. Déployer',
      step3Description: 'Votre PWA est prête à être déployée !',
    },
    featuresPage: {
      title: 'Fonctionnalités UniversalPWA - Solution Complète de Générateur PWA',
      ctaTitle: 'Prêt à Commencer ?',
      ctaSubtitle: 'Transformez votre projet web en PWA en quelques minutes',
      ctaButton: 'Installer Maintenant',
    },
    sponsorsPage: {
      ourSponsors: 'Nos Sponsors',
      thankYou: 'Merci à tous ceux qui soutiennent UniversalPWA !',
      viewOnGitHub: 'Voir sur GitHub Sponsors',
      questions: 'Des questions sur le parrainage ?',
      contactVia: 'Contactez-nous via',
      githubDiscussions: 'Discussions GitHub',
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
          icon: 'zap',
        },
        {
          title: 'Independiente del Framework',
          description: 'Funciona con React, Vue, Angular, Next.js, WordPress, Symfony, Laravel y sitios estáticos.',
          icon: 'settings',
        },
        {
          title: 'Detección Automática',
          description: 'Detecta automáticamente tu framework y genera archivos PWA optimizados.',
          icon: 'search',
        },
        {
          title: 'Modo Interactivo',
          description: 'Prompts amigables te guían a través del proceso de configuración con valores predeterminados inteligentes.',
          icon: 'message-circle',
        },
        {
          title: 'Generación de Iconos',
          description: 'Genera automáticamente todos los iconos PWA y splash screens requeridos desde una sola imagen fuente.',
          icon: 'image',
        },
        {
          title: 'Listo para Producción',
          description: 'Genera service workers optimizados con Workbox y valida todos los requisitos PWA.',
          icon: 'send',
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
          icon: 'smartphone',
        },
        {
          title: 'Soporte Offline',
          description: 'Las PWAs funcionan offline o en redes lentas gracias a los service workers. El contenido se almacena en caché y está disponible incluso sin internet.',
          icon: 'globe',
        },
        {
          title: 'Rápida y Responsiva',
          description: 'Las PWAs se cargan instantáneamente y responden rápidamente a las interacciones del usuario, proporcionando una experiencia fluida en cualquier dispositivo.',
          icon: 'zap',
        },
        {
          title: 'Multiplataforma',
          description: 'Una sola PWA funciona en todas las plataformas - iOS, Android, Windows, macOS y Linux. No es necesario crear aplicaciones separadas.',
          icon: 'refresh-cw',
        },
        {
          title: 'Segura',
          description: 'Las PWAs requieren HTTPS, asegurando que todos los datos estén encriptados y seguros. Los usuarios pueden confiar en tu aplicación.',
          icon: 'shield',
        },
        {
          title: 'Siempre Actualizada',
          description: 'Las PWAs se actualizan automáticamente en segundo plano. Los usuarios siempre tienen la última versión sin actualizaciones manuales.',
          icon: 'refresh-cw',
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
      quickLinks: 'Enlaces Rápidos',
      support: 'Soporte',
      github: 'GitHub',
      sponsor: 'Patrocinar',
    },
    quickStart: {
      title: 'Cómo Crear una PWA en 3 Pasos Simples',
      subtitle: 'Transforma tu proyecto web en una Progressive Web App con UniversalPWA - el generador PWA más rápido disponible',
      step1: '1. Instalar',
      step2: '2. Inicializar',
      step3: '3. Desplegar',
      step3Description: '¡Tu PWA está lista para desplegarse!',
    },
    featuresPage: {
      title: 'Características UniversalPWA - Solución Completa de Generador PWA',
      ctaTitle: '¿Listo para Empezar?',
      ctaSubtitle: 'Transforma tu proyecto web en una PWA en minutos',
      ctaButton: 'Instalar Ahora',
    },
    sponsorsPage: {
      ourSponsors: 'Nuestros Patrocinadores',
      thankYou: '¡Gracias a todos los que apoyan UniversalPWA!',
      viewOnGitHub: 'Ver en GitHub Sponsors',
      questions: '¿Preguntas sobre patrocinio?',
      contactVia: 'Contáctanos a través de',
      githubDiscussions: 'Discusiones de GitHub',
    },
  },
}

