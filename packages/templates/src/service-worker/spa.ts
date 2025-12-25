/**
 * Template Service Worker pour SPA (Single Page Application)
 * Stratégie : Precache + NetworkFirst pour navigation + CacheFirst pour assets
 */
export const spaServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // Navigation route pour SPA (toutes les navigations vers index.html)
  const navigationHandler = workbox.precaching.createHandlerBoundToURL('/index.html')
  const navigationRoute = new workbox.routing.NavigationRoute(navigationHandler, {
    allowlist: [/^\\//],
    denylist: [/^\\/api/, /^\\/_/],
  })
  workbox.routing.registerRoute(navigationRoute)

  // CacheFirst pour images, fonts
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
        }),
      ],
    })
  )

  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'fonts-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
        }),
      ],
    })
  )

  // StaleWhileRevalidate for CSS/JS (background update)
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'assets-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
        }),
      ],
    })
  )

  // NetworkFirst pour les appels API
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'api-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
    })
  )
} else {
  console.error('Workbox could not be loaded.')
}
`

