<?php

namespace UniversalPwa\Symfony;

use Symfony\Component\HttpKernel\Bundle\Bundle;
use Symfony\Component\DependencyInjection\Extension\ExtensionInterface;
use UniversalPwa\Symfony\DependencyInjection\UniversalPwaExtension;

class UniversalPwaBundle extends Bundle
{
    public function getContainerExtension(): ?ExtensionInterface
    {
        return new UniversalPwaExtension();
    }
}
