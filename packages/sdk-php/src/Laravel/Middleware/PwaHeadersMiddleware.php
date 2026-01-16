<?php

namespace UniversalPwa\Laravel\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PwaHeadersMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Service-Worker-Allowed', '/');

        $manifestPath = config('universal-pwa.manifest_path', '/manifest.json');
        $serviceWorkerPath = config('universal-pwa.service_worker_path', '/service-worker.js');

        if ($request->is(ltrim($manifestPath, '/'))) {
            $response->headers->set('Cache-Control', config('universal-pwa.cache_control', 'public, max-age=3600'));
            $response->headers->set('Content-Type', 'application/manifest+json');
        }

        if ($request->is(ltrim($serviceWorkerPath, '/'))) {
            $response->headers->set('Cache-Control', config('universal-pwa.cache_control', 'public, max-age=3600'));
            $response->headers->set('Content-Type', 'application/javascript');
        }

        $csrfHeader = config('universal-pwa.csrf_header', 'X-CSRF-Token');
        if (function_exists('csrf_token')) {
            $response->headers->set($csrfHeader, csrf_token());
        }

        return $response;
    }
}
