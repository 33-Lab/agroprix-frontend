// AgroPrix — Initialisation Sentry (externalisé d'index.html pour la CSP Phase 2).
// Fichier écrit à la main (pas de .src, pas de minification). Doit être chargé
// APRÈS le bundle Sentry CDN. DSN vide = désactivé (no-op total).
(function() {
  var SENTRY_DSN = "https://ed5df772b53afa3fb0d70196a63f0b94@o4511241103409152.ingest.de.sentry.io/4511246162788432";
  if (!SENTRY_DSN || !window.Sentry) return;
  var host = window.location.hostname;
  var env = (host === "app.agroprix.app" || host === "agroprix.app")
    ? "production"
    : (host === "localhost" || host === "127.0.0.1" ? "development" : "staging");
  window.Sentry.init({
    dsn: SENTRY_DSN,
    environment: env,
    tracesSampleRate: 0.1,
    // RGPD : pas d'email/IP envoyes par defaut
    sendDefaultPii: false,
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Network request failed",
      "Failed to fetch"
    ],
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i
    ]
  });
  // Expose pour app.js (ex: Sentry.captureMessage sur erreurs metier)
  window.AgroPrix = window.AgroPrix || {};
  window.AgroPrix.Sentry = window.Sentry;
})();
