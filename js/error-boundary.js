// AgroPrix — Error boundary + détection hors-ligne (externalisé d'index.html
// pour la CSP Phase 2). Fichier écrit à la main (pas de .src). Chargé en fin
// de body, après les éléments #errorBoundary / #offlineBanner et l'app.

// === ERROR BOUNDARY ===
window.onerror = function(msg, src, line, col, err) {
  var errorId = 'ERR-' + Date.now().toString(36).toUpperCase();
  console.error('[AgroPrix Error Boundary]', errorId, msg, src, line);

  // Show error UI only for critical errors (not API timeouts)
  if (msg && (msg.indexOf('Script error') > -1 || msg.indexOf('ChunkLoadError') > -1)) {
    var el = document.getElementById('errorBoundary');
    var info = document.getElementById('errorDebugInfo');
    if (el) { el.style.display = 'flex'; }
    if (info) { info.textContent = 'ID erreur : #' + errorId + ' (utile pour le support)'; }
  }

  // Send to Sentry if available
  if (window.Sentry && err) {
    Sentry.captureException(err, { tags: { errorId: errorId } });
  }

  return false;
};

// === UNHANDLED PROMISE REJECTIONS ===
window.addEventListener('unhandledrejection', function(e) {
  console.warn('[AgroPrix] Unhandled promise:', e.reason);
  if (window.Sentry && e.reason) {
    Sentry.captureException(e.reason);
  }
});

// === OFFLINE DETECTION ===
function updateOnlineStatus() {
  var banner = document.getElementById('offlineBanner');
  if (banner) {
    banner.style.display = navigator.onLine ? 'none' : 'block';
  }
  // Adjust main content padding when offline banner shows
  var main = document.querySelector('.main');
  if (main) {
    main.style.paddingTop = navigator.onLine ? '' : '40px';
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();
