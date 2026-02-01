/**
 * Template Service Worker pour SvelteKit SSR
 * Stratégies:
 * - /_app/** → CacheFirst (assets fingerprinted)
 * - Pages dynamiques → NetworkFirst (SSR)
 * - /api/** → NetworkFirst
 * - Images → CacheFirst
 */
export const svelteKitSsrServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques critiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // ====== SVELTEKIT STATIQUES (/_app) ======
  // CacheFirst - Assets fingerprinted
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/_app/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'sveltekit-static-cache',
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
      cacheName: 'sveltekit-pages-cache',
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

  // ====== LAYOUT & COMPONENT DATA ======
  // Pour les données de layout et composants
  workbox.routing.registerRoute(
    ({ url }) =>
      url.pathname.startsWith('/__data/') ||
      url.pathname.endsWith('.json'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'sveltekit-data-cache',
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
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'sveltekit-images-cache',
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
      cacheName: 'sveltekit-fonts-cache',
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
      cacheName: 'sveltekit-assets-cache',
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
      cacheName: 'sveltekit-api-cache',
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
      cacheName: 'sveltekit-graphql-cache',
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
