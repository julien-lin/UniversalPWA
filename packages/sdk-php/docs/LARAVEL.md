## Laravel Integration (SDK PHP)

Documentation pour intégrer UniversalPWA dans une application Laravel.

### Installation

```
composer require julien-lin/universal-pwa-sdk-php
```

Le provider et la facade sont auto-enregistrés via `composer.json`.

### Publication de la configuration

```
php artisan vendor:publish --tag=universal-pwa-config
```

Fichier généré : `config/universal-pwa.php`

### Utilisation dans un layout Blade

```php
{!! \Pwa::manifestLinkTag() !!}
{!! \Pwa::themeColorMetaTag() !!}
{!! \Pwa::serviceWorkerScriptTag() !!}
```

### Activation du middleware

```php
Route::middleware(['pwa'])->group(function () {
    // Routes PWA
});
```

Le middleware ajoute :
- `Service-Worker-Allowed: /`
- headers `Cache-Control` pour le manifest et le service worker
- header CSRF (`X-CSRF-Token` par defaut)

### Configuration disponible

Extrait de `config/universal-pwa.php` :

```php
return [
    'manifest_path' => '/manifest.json',
    'service_worker_path' => '/service-worker.js',
    'theme_color' => '#3B82F6',
    'cache_control' => 'public, max-age=3600',
    'csrf_header' => 'X-CSRF-Token',
];
```

### Notes

- Assurez-vous que `public/manifest.json` et `public/service-worker.js` existent.
- Les routes du middleware peuvent etre limitees a un groupe specifique si besoin.

### Troubleshooting

**Le service worker ne s'enregistre pas**
- Verifier que `service_worker_path` correspond a un fichier accessible dans `public/`.
- Verifier l'absence d'erreurs JavaScript dans la console.

**Le manifest ne charge pas**
- Verifier `manifest_path` et les permissions d'acces au fichier.
- Verifier que le header `Content-Type` est bien `application/manifest+json`.
