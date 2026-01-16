<?php

namespace UniversalPwa\Symfony\DependencyInjection;

use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\Extension;
use Symfony\Component\DependencyInjection\Loader\PhpFileLoader;

class UniversalPwaExtension extends Extension
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $config = $this->processConfiguration(new Configuration(), $configs);

        $container->setParameter('universal_pwa.manifest_path', $config['manifest_path']);
        $container->setParameter('universal_pwa.service_worker_path', $config['service_worker_path']);
        $container->setParameter('universal_pwa.theme_color', $config['theme_color']);
        $container->setParameter('universal_pwa.cache_control', $config['cache_control']);
        $container->setParameter('universal_pwa.csrf_header', $config['csrf_header']);

        $loader = new PhpFileLoader($container, new FileLocator(__DIR__ . '/../Resources/config'));
        $loader->load('services.php');
    }
}
