<?php

declare(strict_types=1);

use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use UniversalPwa\Symfony\PwaManager;

return function (ContainerConfigurator $container): void {
    $services = $container->services()->defaults()
        ->autowire()
        ->autoconfigure();

    $services->set(PwaManager::class)
        ->arg('$manifestPath', '%universal_pwa.manifest_path%')
        ->arg('$serviceWorkerPath', '%universal_pwa.service_worker_path%')
        ->arg('$themeColor', '%universal_pwa.theme_color%');

    $services->alias('universal_pwa.manager', PwaManager::class)->public();
};
