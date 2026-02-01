/**
 * Template Service Worker pour Next.js SSR
 * Stratégies:
 * - /_next/static/** → CacheFirst (fingerprinted assets)
 * - Pages dynamiques → NetworkFirst (SSR)
 * - /api/** → NetworkFirst avec timeout
 * - Images optimisées → CacheFirst
 */
export const nextSsrServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques critiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // ====== STATIQUES FINGERPRINTED (_next/static) ======
  // CacheFirst - Les assets fingerprints ne changent jamais
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/_next/static/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'next-static-cache',
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
  // NetworkFirst avec fallback pour les pages
  workbox.routing.registerRoute(
    ({ request }) => request.mode === 'navigate',
    new workbox.strategies.NetworkFirst({
      cacheName: 'next-pages-cache',
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

  // ====== ISR (Incremental Static Regeneration) ======
  // Aussi NetworkFirst pour /_next/data/** (API ISR)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/_next/data/'),
    new workbox.strategies.NetworkFirst({
      cacheName: 'next-isr-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1h
        }),
      ],
      networkTimeoutSeconds: 3,
    })
  )

  // ====== IMAGES OPTIMISÉES (Next.js Image Optimization) ======
  workbox.routing.registerRoute(
    ({ request, url }) =>
      request.destination === 'image' || url.pathname.startsWith('/_next/image'),
    new workbox.strategies.CacheFirst({
      cacheName: 'next-images-cache',
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
      cacheName: 'next-fonts-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 an
        }),
      ],
    })
  )

  // ====== STYLES & SCRIPTS (Non-fingerprinted) ======
  workbox.routing.registerRoute(
    ({ request }) =>
      request.destination === 'style' || request.destination === 'script',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'next-assets-cache',
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
      cacheName: 'next-api-cache',
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
      cacheName: 'next-graphql-cache',
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
  // Fallback pour pages non trouvées en offline
  const offlineFallbackPage = '/offline.html'
  workbox.routing.setCatchHandler(async ({ event }) => {
    if (event.request.destination === 'document') {
      return caches.match(offlineFallbackPage)
    }
    return Response.error()
  })

  // ====== BROADCAST CACHE UPDATE ======
  // Notifier le client quand le cache est mis à jour
  workbox.core.clientsClaim()
  self.skipWaiting()
}
`;
