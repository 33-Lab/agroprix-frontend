// AgroPrix Service Worker — Cache hybride
// Stratégie : Stale-While-Revalidate pour assets locaux (jamais "stuck" sur vieille version),
//             Cache-first pour CDN immutables, Network-first pour API.
// Version bumpée à chaque déploiement pour purger les anciens caches au activate.
//
// Bug historique (FRONTEND-2 — 06/05/2026) : la stratégie cacheFirstVersioned
// servait éternellement la première version cachée d'un /js/X.js?v=N sans jamais
// la rafraîchir → utilisateurs Opera Mobile/WebView avec cache antérieur à
// l'ajout de fonctions globales (ex. window.updateMarkets) plantaient en
// ReferenceError. Stale-While-Revalidate : retourne le cache instantanément
// MAIS en parallèle revalide le réseau et met à jour le cache → la version
// suivante du chargement aura le nouveau code, sans attendre une expiration.

const CACHE_VERSION = "v7.27.0";  // bump 26/06 : CSP Phase 2 (7/n) — modules plantain + tomate en data-action
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
  '/js/actions.js',
  '/js/boot-sentry.js',
  '/js/error-boundary.js',
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
  // RETIRÉ 12/05/2026 : '/data/prix_reels_uemoa.json' qui contenait des trends
  // null + dates obsolètes. Les modules consomment maintenant /api/prices/*
  // directement (cf. refactor dashboard.js + cacao.js + tomate.js + hevea.js + plantain.js).
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

  // 2bis. Navigation (document index.html) → Network-first.
  //    Indispensable : index.html n'est PAS versionné. En Stale-While-Revalidate
  //    l'utilisateur voyait l'ANCIEN index au chargement (puis le neuf seulement
  //    au 2e reload) → les nouveaux modules/nav (ex. Cacao/Tomate Pro) restaient
  //    invisibles. Network-first sert toujours le dernier index quand en ligne,
  //    avec fallback cache hors-ligne.
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // 3. Assets versionnés ?v=X et assets locaux non versionnés → Stale-While-Revalidate.
  //    Retourne le cache instantanément (perf) MAIS revalide en parallèle (fraîcheur).
  //    Garantit qu'aucun utilisateur ne reste bloqué sur une vieille version d'un .js
  //    après un deploy. Cf. bug FRONTEND-2 du 06/05/2026.
  event.respondWith(staleWhileRevalidate(request));
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
// Stratégie : Network-first pour la navigation (index.html)
// Sert toujours le dernier index quand en ligne (sinon les changements
// structurels non versionnés — nav, vues — n'apparaissent qu'au 2e reload).
// Fallback cache si hors-ligne.
// ============================================================
function networkFirstNavigation(request) {
  return fetch(request).then(function(response) {
    if (response && response.status === 200) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put('/index.html', copy);
      });
    }
    return response;
  }).catch(function() {
    return caches.match('/index.html').then(function(cached) {
      return cached || caches.match(request) || new Response('', { status: 503 });
    });
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
// Stratégie 3 : Stale-While-Revalidate pour assets locaux
//
// 1. Si on a un cache, on le retourne IMMÉDIATEMENT (perf).
// 2. EN PARALLÈLE, on déclenche un fetch réseau qui met à jour le cache
//    en arrière-plan. Le prochain chargement aura la nouvelle version.
// 3. Si pas de cache, on fait un fetch réseau classique avec fallback
//    SPA navigation → /index.html.
//
// Avantages vs cache-first naïf :
//   - L'utilisateur n'est JAMAIS bloqué sur une vieille version périmée
//     (le bug FRONTEND-2 du 06/05/2026 où window.updateMarkets manquait).
//   - L'utilisateur n'attend pas le réseau au chargement (perf 3G).
// ============================================================
function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.match(request).then(function(cached) {
      // Fetch réseau en arrière-plan, met à jour le cache pour la prochaine fois.
      var networkUpdate = fetch(request).then(function(response) {
        if (response && response.status === 200) {
          // clone() OBLIGATOIRE : Response body ne peut être lu qu'une fois.
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function() {
        // Réseau down — pas grave si on a déjà servi le cache.
        return null;
      });

      if (cached) {
        // Sert immédiatement le cache. networkUpdate continue en background
        // (event.waitUntil n'est pas nécessaire ici car la réponse est déjà
        // livrée ; le SW reste vivant le temps que la promise se résolve).
        return cached;
      }

      // Pas de cache — on attend le réseau.
      return networkUpdate.then(function(response) {
        if (response) return response;
        // Réseau a échoué et pas de cache → SPA navigation fallback.
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 503 });
      });
    });
  });
}
