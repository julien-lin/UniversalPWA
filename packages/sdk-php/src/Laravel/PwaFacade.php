<?php

namespace UniversalPwa\Laravel;

use Illuminate\Support\Facades\Facade;

class PwaFacade extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return PwaManager::class;
    }
}
