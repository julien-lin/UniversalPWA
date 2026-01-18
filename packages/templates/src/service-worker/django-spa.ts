/**
 * Template Service Worker pour Django SPA
 * Stratégie : NavigationRoute + API NetworkFirst + assets CacheFirst
 * CSRF: Django CSRF token handling via cookies
 */
export const djangoSpaServiceWorkerTemplate = `
// Load Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.4.0/workbox-sw.js')

// Ensure Workbox is loaded
if (typeof workbox !== 'undefined') {
  // Precache des assets statiques
  workbox.precaching.precacheAndRoute(self.__WB_MANIFEST)

  // Navigation route pour SPA
  const navigationHandler = workbox.precaching.createHandlerBoundToURL('/index.html')
  const navigationRoute = new workbox.routing.NavigationRoute(navigationHandler, {
    allowlist: [/^\\//],
    denylist: [/^\\/api/, /^\\/admin/, /^\\/_/],
  })
  workbox.routing.registerRoute(navigationRoute)

  // CacheFirst pour fichiers statiques Django (/static/)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/static/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'django-static-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    })
  )

  // CacheFirst pour fichiers média Django (/media/)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/media/'),
    new workbox.strategies.CacheFirst({
      cacheName: 'django-media-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        }),
      ],
    })
  )

  // CacheFirst pour images
  workbox.routing.registerRoute(
    ({ request }) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'django-images-cache',
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
      cacheName: 'django-fonts-cache',
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
      cacheName: 'django-assets-cache',
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        }),
      ],
    })
  )

  // NetworkFirst pour API (CSRF-friendly avec credentials)
  workbox.routing.registerRoute(
    ({ url, request }) =>
      request.method === 'GET' &&
      (url.pathname.startsWith('/api/') || url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/api/v2/')),
    new workbox.strategies.NetworkFirst({
      cacheName: 'django-api-cache',
      fetchOptions: {
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
      plugins: [
        new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }),
      ],
      networkTimeoutSeconds: 3,
    })
  )

  // NetworkOnly pour admin (toujours frais, pas de cache)
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.startsWith('/admin/'),
    new workbox.strategies.NetworkOnly({
      cacheName: 'django-admin-cache',
      fetchOptions: {
        credentials: 'same-origin',
      },
    })
  )

  // NetworkOnly pour CSRF token endpoint
  workbox.routing.registerRoute(
    ({ url }) => url.pathname.includes('/csrf-token/') || url.pathname.includes('/csrf/'),
    new workbox.strategies.NetworkOnly({
      cacheName: 'django-csrf-cache',
      fetchOptions: {
        credentials: 'same-origin',
      },
    })
  )
} else {
  console.error('Workbox could not be loaded.')
}
`
