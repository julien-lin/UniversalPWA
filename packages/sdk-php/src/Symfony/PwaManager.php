<?php

namespace UniversalPwa\Symfony;

class PwaManager
{
    public function __construct(
        private readonly string $manifestPath,
        private readonly string $serviceWorkerPath,
        private readonly string $themeColor
    ) {
    }

    public function manifestLinkTag(): string
    {
        return '<link rel="manifest" href="' . $this->escape($this->manifestPath) . '">';
    }

    public function themeColorMetaTag(): string
    {
        return '<meta name="theme-color" content="' . $this->escape($this->themeColor) . '">';
    }

    public function serviceWorkerScriptTag(): string
    {
        $path = $this->escape($this->serviceWorkerPath);
        $script = "<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('" . $path . "')
  })
}
</script>";

        return $script;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
