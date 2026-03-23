// AgroPrix Service Worker — Cache offline + performance
const CACHE_NAME = 'agroprix-v6.5-promptmaster';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/config.js',
  '/js/data.js',
  '/js/api.js',
  '/js/ui.js',
  '/js/analysis.js',
  '/js/negoce.js',
  '/js/production.js',
  '/js/export.js',
  '/js/auth.js',
  '/js/app.js',
  '/manifest.json',
  '/favicon.ico'
];

const CDN_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install: cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching static assets');
      // Cache local assets (fail silently if dev server)
      return cache.addAll(STATIC_ASSETS).catch(function() {
        console.log('[SW] Some static assets not cached (dev mode)');
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // API calls: network only (no cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return new Response(JSON.stringify({ error: 'Hors ligne' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Static assets: network-first, fallback to cache (ensures latest version)
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Cache successful responses for offline use
      if (response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
      }
      return response;
    }).catch(function() {
      // Offline: serve from cache
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
