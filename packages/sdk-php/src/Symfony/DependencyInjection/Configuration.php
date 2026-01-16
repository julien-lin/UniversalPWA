<?php

namespace UniversalPwa\Symfony\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('universal_pwa');
        $rootNode = $treeBuilder->getRootNode();

        $rootNode
            ->children()
                ->scalarNode('manifest_path')->defaultValue('/manifest.json')->end()
                ->scalarNode('service_worker_path')->defaultValue('/service-worker.js')->end()
                ->scalarNode('theme_color')->defaultValue('#3B82F6')->end()
                ->scalarNode('cache_control')->defaultValue('public, max-age=3600')->end()
                ->scalarNode('csrf_header')->defaultValue('X-CSRF-Token')->end()
            ->end();

        return $treeBuilder;
    }
}
