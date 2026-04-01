// AgroPrix Service Worker — Cache hybride Prompt Master
// Stratégie : Cache-first pour assets statiques, Network-first pour API
// Version bumped à chaque déploiement pour forcer le refresh

const CACHE_VERSION = 'v6.11.0';
const CACHE_NAME = 'agroprix-' + CACHE_VERSION;
const CDN_CACHE = 'agroprix-cdn-' + CACHE_VERSION;

// Assets locaux — mis en cache à l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // CSS
  '/css/styles.css',
  '/css/design-premium.css',
  // JS core
  '/js/config.js',
  '/js/data.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/app.js',
  // JS modules
  '/js/analysis.js',
  '/js/negoce.js',
  '/js/production.js',
  '/js/export.js',
  '/js/security.js',
  '/js/cgu.js',
  '/js/inputs.js',
  '/js/marketplace.js',
  '/js/financing.js',
  '/js/scoring.js',
  '/js/ndvi.js',
  '/js/hevea.js',
  '/js/plantain.js',
  // Data embarquée
  '/data/prix_reels_uemoa.json',
  '/data/institutions.json'
];

// CDN — cache-first (immutable, versioned by CDN)
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'unpkg.com'
];

// API backend Railway — Network-first, fallback JSON erreur
const API_ORIGINS = [
  'web-production-46fb2.up.railway.app'
];

// ============================================================
// INSTALL — precache des assets statiques
// ============================================================
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // addAll échoue silencieusement sur certains assets manquants (screenshots)
      var promises = STATIC_ASSETS.map(function(url) {
        return cache.add(url).catch(function() {
          // Asset non critique manquant — on continue
        });
      });
      return Promise.all(promises);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ============================================================
// ACTIVATE — purge anciens caches
// ============================================================
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) {
          return key !== CACHE_NAME && key !== CDN_CACHE;
        }).map(function(key) {
          return caches.delete(key);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ============================================================
// FETCH — stratégie hybride
// ============================================================
self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url;

  try {
    url = new URL(request.url);
  } catch(e) {
    return;
  }

  // Ne pas intercepter les requêtes non-GET
  if (request.method !== 'GET') return;

  // 1. API Railway → Network-first, fallback JSON offline
  if (API_ORIGINS.some(function(o) { return url.hostname.includes(o); }) ||
      url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // 2. CDN (fonts, libs) → Cache-first (ressources versionnées, immutables)
  if (CDN_ORIGINS.some(function(o) { return url.hostname.includes(o); })) {
    event.respondWith(cacheFirstCDN(request));
    return;
  }

  // 3. Assets versionnés (?v=X) → Cache-first (immutables par version, chargement instantané)
  if (url.search && url.search.match(/[?&]v=\d/)) {
    event.respondWith(cacheFirstVersioned(request));
    return;
  }

  // 4. Assets locaux → Network-first avec fallback cache (toujours la dernière version)
  event.respondWith(networkFirstLocal(request));
});

// ============================================================
// Stratégie 1 : Network-first avec fallback JSON offline
// ============================================================
function networkFirstWithFallback(request) {
  return fetch(request).catch(function() {
    return new Response(
      JSON.stringify({ error: 'Hors ligne — reconnectez-vous pour obtenir les données en temps réel.', offline: true }),
      { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  });
}

// ============================================================
// Stratégie 2 : Cache-first pour CDN
// ============================================================
function cacheFirstCDN(request) {
  return caches.open(CDN_CACHE).then(function(cache) {
    return cache.match(request).then(function(cached) {
      if (cached) return cached;
      return fetch(request).then(function(response) {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function() {
        return new Response('', { status: 503 });
      });
    });
  });
}

// ============================================================
// Stratégie 3 : Cache-first pour assets versionnés (?v=X)
// ============================================================
function cacheFirstVersioned(request) {
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.match(request).then(function(cached) {
      if (cached) return cached;
      return fetch(request).then(function(response) {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function() {
        return new Response('', { status: 503 });
      });
    });
  });
}

// ============================================================
// Stratégie 4 : Network-first pour assets locaux (timeout 2s)
// ============================================================
function networkFirstLocal(request) {
  var networkTimeout = new Promise(function(_, reject) {
    setTimeout(function() { reject(new Error('timeout')); }, 2000);
  });
  return Promise.race([fetch(request), networkTimeout]).then(function(response) {
    if (response.status === 200) {
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(request, response.clone());
      });
    }
    return response;
  }).catch(function() {
    return caches.match(request).then(function(cached) {
      if (cached) return cached;
      // Navigation fallback → index.html (SPA)
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      return new Response('', { status: 404 });
    });
  });
}
