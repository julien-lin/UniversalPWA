/**
 * Template Service Worker pour Remix SSR
 * Stratégies:
 * - /build/** → CacheFirst (assets fingerprinted)
 * - Pages dynamiques → NetworkFirst (SSR)
 * - /api/** → NetworkFirst
 * - Images → CacheFirst
 */
export const remixSsrServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques critiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // ====== REMIX STATIQUES (/build) ======
  // CacheFirst - Assets fingerprinted
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/build/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'remix-static-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
        }),
      ],
    })
  )

  // ====== PAGES HTML (SSR DYNAMIQUE) ======
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'remix-pages-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 24h
        }),
      ],
      networkTimeoutSeconds: 5,
    })
  )

  // ====== REMIX RESOURCE ROUTES (/resource/**) ======
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/resource/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'remix-resources-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1h
        }),
      ],
      networkTimeoutSeconds: 4,
    })
  )

  // ====== IMAGES ======
  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'remix-images-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
        }),
      ],
    })
  )

  // ====== FONTS ======
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'font',
    new workbox.strategies.CacheFirst({
      cacheName: 'remix-fonts-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
        }),
      ],
    })
  )

  // ====== STYLES & SCRIPTS ======
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'remix-assets-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
        }),
      ],
    })
  )

  // ====== API ROUTES (/api/**) ======
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' && url.pathname.startsWith('/api/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'remix-api-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 10 * 60, // 10 mins
        }),
      ],
      networkTimeoutSeconds: 5,
    })
  )

  // ====== GRAPHQL ======
  workbox.routing.registerRoute(
    ({ url }) => url.pathname === '/graphql',
    new workbox.strategies.NetworkFirst({
      cacheName: 'remix-graphql-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 5 * 60, // 5 mins
        }),
      ],
      networkTimeoutSeconds: 4,
    })
  )

  // ====== OFFLINE FALLBACK ======
  const offlineFallbackPage = '/offline.html'
  workbox.routing.setCatchHandler(async ({ event }) => {
    if (event.request.destination === 'document') {
      return caches.match(offlineFallbackPage)
    }
    return Response.error()
  })

  // ====== BROADCAST CACHE UPDATE ======
  workbox.core.clientsClaim()
  self.skipWaiting()
}
`;
