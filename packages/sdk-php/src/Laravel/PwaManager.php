<?php

namespace UniversalPwa\Laravel;

use Illuminate\Support\HtmlString;

class PwaManager
{
    public function manifestLinkTag(): HtmlString
    {
        $path = $this->config('manifest_path', '/manifest.json');
        return new HtmlString('<link rel="manifest" href="' . $path . '">');
    }

    public function themeColorMetaTag(): HtmlString
    {
        $color = $this->config('theme_color', '#3B82F6');
        return new HtmlString('<meta name="theme-color" content="' . $color . '">');
    }

    public function serviceWorkerScriptTag(): HtmlString
    {
        $path = $this->config('service_worker_path', '/service-worker.js');
        $script = "<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('" . $path . "')
  })
}
</script>";

        return new HtmlString($script);
    }

    private function config(string $key, string $default): string
    {
        $value = config('universal-pwa.' . $key);
        return is_string($value) && $value !== '' ? $value : $default;
    }
}
