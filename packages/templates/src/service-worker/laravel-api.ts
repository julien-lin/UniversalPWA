/**
 * Template Service Worker pour Laravel API-centric
 * Stratégie : NetworkFirst API + CacheFirst assets
 * CSRF: credentials same-origin + X-Requested-With
 */
export const laravelApiServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // CacheFirst pour assets publics
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/build/') || url.pathname.startsWith('/public/') || url.pathname.startsWith('/storage/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'laravel-public-assets-cache',
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
      cacheName: 'laravel-images-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // StaleWhileRevalidate pour CSS/JS
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'laravel-assets-cache',
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
      cacheName: 'laravel-api-cache',
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
