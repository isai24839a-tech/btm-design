const CACHE_NAME = 'btm-cache-v2';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/kids-page.html',
  '/future-page.html',
  '/members-page.html',
  '/kids-news.html',
  '/future-news.html',
  '/manifest.json',
  '/favicon.ico',
  '/images/btm_logo.webp'
];

// Install: pre-cache key assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: let navigation requests pass through, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Don't intercept navigation requests - avoids redirect conflicts with Cloudflare
  if (event.request.mode === 'navigate') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          event.request.method === 'GET' &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      return new Response('Offline', { status: 503 });
    })
  );
});
