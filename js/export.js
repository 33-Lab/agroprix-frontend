(function(AP) {
  function init() {
    console.log('[AgroPrix] Module Export initialisé');
    // Future: fetch real exchange rates from API
    // Future: fetch real FOB prices
  }

  function publishDemand() {
    alert('Inscription requise pour publier une demande.\nFonctionnalité disponible en version complète.');
  }

  AP.exportModule = { init: init, publishDemand: publishDemand };
  window.publishDemand = publishDemand;

})(window.AgroPrix);
