# universal-pwa/sdk-php

SDK PHP (Composer, PSR-4) pour intégrer UniversalPWA dans Laravel/Symfony.

## Laravel (exemple rapide)

1. Installer via Composer
```
composer require julien-lin/universal-pwa-sdk-php
```

2. Publier la config
```
php artisan vendor:publish --tag=universal-pwa-config
```

3. Ajouter les tags PWA dans un layout Blade
```
{!! \Pwa::manifestLinkTag() !!}
{!! \Pwa::themeColorMetaTag() !!}
{!! \Pwa::serviceWorkerScriptTag() !!}
```

4. Activer le middleware
```
Route::middleware(['pwa'])->group(function () {
    // Routes PWA
});
```

