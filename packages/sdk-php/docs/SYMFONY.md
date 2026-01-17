## Symfony Integration (SDK PHP)

Documentation pour intégrer UniversalPWA dans une application Symfony.

### Installation

```bash
composer require julien-lin/universal-pwa-sdk-php
```

### Activation du Bundle

Dans `config/bundles.php`, ajoutez :

```php
<?php

return [
    // ... autres bundles
    UniversalPwa\Symfony\UniversalPwaBundle::class => ['all' => true],
];
```

### Configuration

Créez ou modifiez `config/packages/universal_pwa.yaml` :

```yaml
universal_pwa:
    manifest_path: '/manifest.json'
    service_worker_path: '/sw.js'
    theme_color: '#3B82F6'
    cache_control: 'public, max-age=3600'
    csrf_header: 'X-CSRF-Token'
```

**Paramètres disponibles** :

- `manifest_path` : Chemin vers le fichier manifest.json (défaut: `/manifest.json`)
- `service_worker_path` : Chemin vers le service worker (défaut: `/service-worker.js`)
- `theme_color` : Couleur du thème en hexadécimal (défaut: `#3B82F6`)
- `cache_control` : Header Cache-Control pour le manifest et le service worker (défaut: `public, max-age=3600`)
- `csrf_header` : Nom du header CSRF (défaut: `X-CSRF-Token`)

### Utilisation dans les templates Twig

#### Injection via le service PwaManager

Dans votre template de base (ex: `templates/base.html.twig`), injectez le service `PwaManager` :

```twig
{% block head %}
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        {# Tags PWA #}
        {{ pwa_manager.manifestLinkTag()|raw }}
        {{ pwa_manager.themeColorMetaTag()|raw }}
        
        {# ... autres meta tags ... #}
    </head>
{% endblock %}

{% block body %}
    <body>
        {# ... contenu ... #}
        
        {# Service Worker Registration #}
        {{ pwa_manager.serviceWorkerScriptTag()|raw }}
    </body>
{% endblock %}
```

#### Configuration du service dans services.yaml

Si vous utilisez l'autowiring, le service est automatiquement disponible. Sinon, configurez-le dans `config/services.yaml` :

```yaml
services:
    # ... autres services
    
    UniversalPwa\Symfony\PwaManager:
        arguments:
            $manifestPath: '%universal_pwa.manifest_path%'
            $serviceWorkerPath: '%universal_pwa.service_worker_path%'
            $themeColor: '%universal_pwa.theme_color%'
```

#### Utilisation dans un contrôleur

Vous pouvez aussi injecter le service dans un contrôleur :

```php
<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use UniversalPwa\Symfony\PwaManager;

class HomeController extends AbstractController
{
    public function index(PwaManager $pwaManager): Response
    {
        return $this->render('home/index.html.twig', [
            'pwa_manager' => $pwaManager,
        ]);
    }
}
```

### Headers HTTP pour PWA

Pour que le service worker fonctionne correctement, vous devez ajouter les headers appropriés. Créez un Event Listener ou utilisez un middleware.

#### Option 1 : Event Listener (recommandé)

Créez `src/EventListener/PwaHeadersListener.php` :

```php
<?php

namespace App\EventListener;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class PwaHeadersListener implements EventSubscriberInterface
{
    public function __construct(
        private readonly string $manifestPath,
        private readonly string $serviceWorkerPath,
        private readonly string $csrfHeader
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::RESPONSE => 'onKernelResponse',
        ];
    }

    public function onKernelResponse(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        $response = $event->getResponse();
        $path = $request->getPathInfo();

        // Ajouter Service-Worker-Allowed header
        $response->headers->set('Service-Worker-Allowed', '/');

        // Headers pour le manifest
        if ($path === $this->manifestPath) {
            $response->headers->set('Content-Type', 'application/manifest+json');
            $response->headers->set('Cache-Control', 'public, max-age=3600');
        }

        // Headers pour le service worker
        if ($path === $this->serviceWorkerPath) {
            $response->headers->set('Content-Type', 'application/javascript');
            $response->headers->set('Cache-Control', 'public, max-age=0');
            $response->headers->set('Service-Worker-Allowed', '/');
        }

        // Ajouter header CSRF si nécessaire
        if ($request->hasSession()) {
            $token = $request->getSession()->get('_csrf/authenticate');
            if ($token) {
                $response->headers->set($this->csrfHeader, $token);
            }
        }
    }
}
```

Enregistrez l'event listener dans `config/services.yaml` :

```yaml
services:
    App\EventListener\PwaHeadersListener:
        arguments:
            $manifestPath: '%universal_pwa.manifest_path%'
            $serviceWorkerPath: '%universal_pwa.service_worker_path%'
            $csrfHeader: '%universal_pwa.csrf_header%'
        tags:
            - { name: kernel.event_subscriber }
```

#### Option 2 : Middleware (Symfony 6.1+)

Créez `src/Middleware/PwaHeadersMiddleware.php` :

```php
<?php

namespace App\Middleware;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\HttpKernelInterface;

class PwaHeadersMiddleware implements HttpKernelInterface
{
    public function __construct(
        private readonly HttpKernelInterface $kernel,
        private readonly string $manifestPath,
        private readonly string $serviceWorkerPath
    ) {
    }

    public function handle(Request $request, int $type = self::MAIN_REQUEST, bool $catch = true): Response
    {
        $response = $this->kernel->handle($request, $type, $catch);

        $path = $request->getPathInfo();

        // Ajouter Service-Worker-Allowed header
        $response->headers->set('Service-Worker-Allowed', '/');

        // Headers pour le manifest
        if ($path === $this->manifestPath) {
            $response->headers->set('Content-Type', 'application/manifest+json');
        }

        // Headers pour le service worker
        if ($path === $this->serviceWorkerPath) {
            $response->headers->set('Content-Type', 'application/javascript');
            $response->headers->set('Service-Worker-Allowed', '/');
        }

        return $response;
    }
}
```

### Génération des fichiers PWA

Avant d'utiliser le SDK, vous devez générer les fichiers PWA (manifest.json, service worker, icônes) avec le CLI UniversalPWA :

```bash
# Depuis la racine de votre projet Symfony
npx @julien-lin/universal-pwa-cli init

# Ou avec des options spécifiques
npx @julien-lin/universal-pwa-cli init \
  --project-path . \
  --output-dir public \
  --name "Mon Application Symfony" \
  --short-name "MAS" \
  --icon-source public/logo.png \
  --theme-color "#3B82F6"
```

Le CLI détectera automatiquement Symfony et générera une configuration optimisée.

### Structure des fichiers

Après génération, votre projet devrait avoir cette structure :

```
symfony-project/
├── public/
│   ├── manifest.json          # Manifest PWA
│   ├── sw.js                  # Service Worker
│   ├── icon-192x192.png       # Icônes PWA
│   ├── icon-512x512.png
│   └── apple-touch-icon.png
├── config/
│   └── packages/
│       └── universal_pwa.yaml # Configuration du bundle
└── templates/
    └── base.html.twig         # Template avec tags PWA
```

### Exemple complet

#### Template base.html.twig

```twig
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Mon Application Symfony{% endblock %}</title>
    
    {# Tags PWA #}
    {{ pwa_manager.manifestLinkTag()|raw }}
    {{ pwa_manager.themeColorMetaTag()|raw }}
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    
    {% block stylesheets %}
        {# ... vos stylesheets ... #}
    {% endblock %}
</head>
<body>
    {% block body %}
        {# ... contenu ... #}
    {% endblock %}
    
    {% block javascripts %}
        {# ... vos scripts ... #}
        
        {# Service Worker Registration #}
        {{ pwa_manager.serviceWorkerScriptTag()|raw }}
    {% endblock %}
</body>
</html>
```

#### Configuration pour différents environnements

Vous pouvez avoir des configurations différentes selon l'environnement :

**config/packages/dev/universal_pwa.yaml** :

```yaml
universal_pwa:
    manifest_path: '/manifest.json'
    service_worker_path: '/sw.js'
    theme_color: '#FF0000'  # Rouge en dev pour différencier
    cache_control: 'no-cache'  # Pas de cache en dev
```

**config/packages/prod/universal_pwa.yaml** :

```yaml
universal_pwa:
    manifest_path: '/manifest.json'
    service_worker_path: '/sw.js'
    theme_color: '#3B82F6'
    cache_control: 'public, max-age=31536000'  # Cache long en prod
```

### Intégration avec API Platform

Si vous utilisez API Platform, le service worker généré par UniversalPWA inclura automatiquement les routes API optimisées :

- Routes `/api/**` en cache réseau d'abord
- Routes CSRF protégées
- Gestion des tokens d'authentification

### Troubleshooting

#### Le service worker ne s'enregistre pas

**Vérifications** :
1. Vérifiez que `service_worker_path` correspond à un fichier accessible dans `public/`
2. Vérifiez l'absence d'erreurs JavaScript dans la console du navigateur
3. Vérifiez que le header `Service-Worker-Allowed: /` est présent dans la réponse
4. Vérifiez que vous êtes en HTTPS (ou localhost) - les service workers nécessitent HTTPS en production

**Solution** :
```yaml
# Vérifiez que le chemin est correct
universal_pwa:
    service_worker_path: '/sw.js'  # Doit correspondre au fichier dans public/
```

#### Le manifest ne charge pas

**Vérifications** :
1. Vérifiez que `manifest_path` pointe vers un fichier existant dans `public/`
2. Vérifiez que le header `Content-Type: application/manifest+json` est présent
3. Vérifiez les permissions d'accès au fichier

**Solution** :
```yaml
# Vérifiez le chemin
universal_pwa:
    manifest_path: '/manifest.json'  # Doit correspondre au fichier dans public/
```

#### Erreur "Service worker registration failed"

**Causes possibles** :
- Le service worker n'est pas accessible (404)
- Le service worker contient des erreurs de syntaxe
- Le scope du service worker ne correspond pas à l'URL de l'application

**Solution** :
1. Vérifiez que le fichier `public/sw.js` existe et est valide
2. Testez le service worker directement dans le navigateur : `https://votre-domaine.com/sw.js`
3. Vérifiez la console du navigateur pour les erreurs détaillées

#### Les icônes ne s'affichent pas

**Vérifications** :
1. Vérifiez que les fichiers d'icônes existent dans `public/`
2. Vérifiez que les chemins dans `manifest.json` sont corrects
3. Vérifiez que les icônes ont les bonnes dimensions (192x192, 512x512, etc.)

**Solution** :
```bash
# Régénérez les icônes avec le CLI
npx @julien-lin/universal-pwa-cli init --icon-source public/logo.png
```

#### Le bundle ne se charge pas

**Vérifications** :
1. Vérifiez que le bundle est bien enregistré dans `config/bundles.php`
2. Vérifiez que la configuration est présente dans `config/packages/universal_pwa.yaml`
3. Vérifiez les logs Symfony : `bin/console debug:container universal_pwa.manager`

**Solution** :
```php
// config/bundles.php
return [
    // ...
    UniversalPwa\Symfony\UniversalPwaBundle::class => ['all' => true],
];
```

### Notes importantes

- **HTTPS requis** : Les service workers nécessitent HTTPS en production (localhost est accepté en développement)
- **Fichiers statiques** : Assurez-vous que `manifest.json` et `sw.js` sont accessibles publiquement dans `public/`
- **Cache** : En développement, désactivez le cache pour voir les modifications immédiatement
- **Symfony versions** : Compatible avec Symfony 6.4+ et 7.0+

### Ressources

- [Documentation UniversalPWA CLI](../../../README.md)
- [Documentation Symfony](https://symfony.com/doc/current/index.html)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
