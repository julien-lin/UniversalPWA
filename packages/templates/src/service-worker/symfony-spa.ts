/**
 * Template Service Worker pour Symfony SPA (Webpack Encore)
 * Stratégie : NavigationRoute + API NetworkFirst + assets CacheFirst
 * CSRF: credentials same-origin + X-Requested-With
 */
export const symfonySpaServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // Navigation route pour SPA Symfony
  const navigationHandler = workbox.precaching.createHandlerBoundToURL('/index.html')
  const navigationRoute = new workbox.routing.NavigationRoute(navigationHandler, {
    allowlist: [/^\\//],
    denylist: [/^\\/api/, /^\\/graphql/, /^\\/_profiler/, /^\\/_wdt/, /^\\/_fragment/, /^\\/login/, /^\\/logout/],
  })
  workbox.routing.registerRoute(navigationRoute)

  // Routes sensibles (auth/CSRF) en réseau uniquement
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' &&
      (url.pathname.startsWith('/login') ||
        url.pathname.startsWith('/logout') ||
        url.pathname.startsWith('/auth') ||
        url.pathname.startsWith('/_csrf')),
    new workbox.strategies.NetworkOnly({
      fetchOptions: {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      },
    })
  )

  // CacheFirst pour assets versionnés (Webpack Encore + bundles)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/build/') || url.pathname.startsWith('/bundles/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'symfony-assets-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // CacheFirst pour images
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'symfony-images-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // CacheFirst pour fonts
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'symfony-fonts-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // StaleWhileRevalidate pour CSS/JS
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'symfony-static-assets-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // NetworkFirst pour API (CSRF-friendly)
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' &&
      (url.pathname.startsWith('/api/') || url.pathname.startsWith('/graphql')),
    new workbox.strategies.NetworkFirst({
      cacheName: 'symfony-api-cache',
      fetchOptions: {
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      },
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60,
        }),
      ],
      networkTimeoutSeconds: 3,
    })
  )
} else {
  console.error('Workbox could not be loaded.')
}
`
