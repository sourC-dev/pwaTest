// service-worker.js
const CACHE_NAME = 'pwa-demo-v1'; // bump version to force update
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] install');
  // cache core assets
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => {
        // Optionally call skipWaiting() if you want immediate activation
        // But here we do not call it automatically; we prefer letting user choose
        console.log('[SW] assets cached');
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] activate');
  event.waitUntil(
    (async () => {
      // delete old caches
      const keys = await caches.keys();
      await Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('[SW] deleting cache', key);
          return caches.delete(key);
        }
      }));
      // Immediately take control of all clients
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // For navigation requests, return cached index.html (App Shell model)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // For other requests, use cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        // Optionally cache new requests
        // (omit caching non-GET or cross-origin requests here)
        if (req.method === 'GET' && response && response.status === 200 && response.type === 'basic') {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, respClone));
        }
        return response;
      }).catch(() => {
        // Fallback: maybe return a generic offline image for images, etc.
      });
    })
  );
});

// Listen for messages from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] skip waiting requested');
    self.skipWaiting();
  }
});

