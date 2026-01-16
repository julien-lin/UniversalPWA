<?php

namespace UniversalPwa\Laravel;

use Illuminate\Support\ServiceProvider;

class PwaServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/config/universal-pwa.php', 'universal-pwa');

        $this->app->singleton(PwaManager::class, function () {
            return new PwaManager();
        });
    }

    public function boot(): void
    {
        $this->publishes([
            __DIR__ . '/config/universal-pwa.php' => config_path('universal-pwa.php'),
        ], 'universal-pwa-config');

        $this->app['router']->aliasMiddleware('pwa', Middleware\PwaHeadersMiddleware::class);
    }
}
