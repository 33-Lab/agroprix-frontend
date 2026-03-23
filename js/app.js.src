// AgroPrix — Main Application Entry Point
// Initializes the app, checks API, sets up event listeners

(function(AP) {
  'use strict';

  function init() {
    console.log('[AgroPrix] Initialisation V6...');

    // Check API availability
    if (AP.api && AP.api.checkAPI) {
      AP.api.checkAPI();
    }

    // Initialize markets grid for default country
    if (AP.ui && AP.ui.updateMarkets) {
      AP.ui.updateMarkets();
    }

    // Set up service worker
    registerServiceWorker();

    // Set up install prompt
    setupInstallPrompt();

    // Initialize authentication (check session, show login if needed)
    if (AP.auth && AP.auth.initAuth) {
      AP.auth.initAuth();
    }

    // Check CGU revalidation
    if (AP.cgu && AP.cgu.checkOnStartup) {
      AP.cgu.checkOnStartup();
    }

    console.log('[AgroPrix] Application V6 prete');
  }

  // Register PWA Service Worker
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(function(reg) {
          console.log('[AgroPrix] Service Worker enregistre', reg.scope);
        })
        .catch(function(err) {
          console.log('[AgroPrix] Service Worker non disponible:', err.message);
        });
    }
  }

  // Handle PWA install prompt
  var deferredPrompt = null;

  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      // Show install button if exists
      var installBtn = document.getElementById('installBtn');
      if (installBtn) {
        installBtn.style.display = 'flex';
        installBtn.addEventListener('click', function() {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(result) {
              console.log('[AgroPrix] Installation:', result.outcome);
              deferredPrompt = null;
              installBtn.style.display = 'none';
            });
          }
        });
      }
    });
  }

  // V6: Demo Mode — skip auth, set fake demo user
  function demoMode() {
    console.log('[AgroPrix] Mode Demo active');

    var demoUser = {
      nom: 'Utilisateur Demo',
      name: 'Utilisateur Demo',
      email: 'demo@agroprix.app',
      pays: 'benin',
      country: 'benin',
      role: 'pro',
      demo: true
    };

    // Save demo user to localStorage
    localStorage.setItem('agroprix_user', JSON.stringify(demoUser));
    localStorage.setItem('agroprix_token', 'demo-token-v6');

    // Hide auth screen, show app
    var authScreen = document.getElementById('authScreen');
    var appContainer = document.getElementById('appContainer');
    if (authScreen) authScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = '';

    // Update UI with demo user info
    var nameEl = document.querySelector('.user-name');
    var roleEl = document.querySelector('.user-role');
    var avatarEl = document.querySelector('.sidebar-footer .avatar');
    if (nameEl) nameEl.textContent = 'Utilisateur Demo';
    if (roleEl) roleEl.textContent = 'Mode Demo';
    if (avatarEl) avatarEl.textContent = 'DM';

    // Update params profile
    var profileName = document.getElementById('profileName');
    var profileEmail = document.getElementById('profileEmail');
    var profileCountry = document.getElementById('profileCountry');
    var profilePlan = document.getElementById('profilePlan');
    if (profileName) profileName.textContent = 'Utilisateur Demo';
    if (profileEmail) profileEmail.textContent = 'demo@agroprix.app';
    if (profileCountry) profileCountry.textContent = 'Benin';
    if (profilePlan) profilePlan.textContent = 'Demo (Pro)';
  }

  // Expose
  AP.app = { init: init, demoMode: demoMode };

  // Also expose demoMode globally for onclick handler
  window.demoMode = demoMode;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.AgroPrix);

// ============================================================
// Proprietaire — Simulateur de potentiel
// ============================================================
window.simulerPotentiel = function() {
  var surface = parseFloat(document.getElementById('propSurface').value) || 0;
  var pays = document.getElementById('propPays').value || 'benin';
  var region = document.getElementById('propRegion').value || '';
  var sol = document.getElementById('propSol').value || '';
  var container = document.getElementById('propResultat');
  if (!container) return;
  if (surface <= 0) { alert('Veuillez indiquer la superficie.'); return; }

  // Simulated recommendations based on inputs
  var cultures = [
    { nom: 'Mais', emoji: '🌽', rendement: 2.5, prixKg: 250, saison: 'Avr-Jul', score: 85 },
    { nom: 'Soja', emoji: '🫘', rendement: 1.8, prixKg: 380, saison: 'Jun-Sep', score: 78 },
    { nom: 'Tomate', emoji: '🍅', rendement: 15, prixKg: 450, saison: 'Oct-Jan', score: 72 },
    { nom: 'Manioc', emoji: '🥔', rendement: 12, prixKg: 120, saison: 'Toute annee', score: 90 },
    { nom: 'Arachide', emoji: '🥜', rendement: 1.2, prixKg: 520, saison: 'Mai-Aout', score: 68 }
  ];

  // Adjust for soil type
  if (sol === 'alluvial') { cultures[2].score += 10; cultures[0].score += 5; }
  if (sol === 'sableux') { cultures[4].score += 10; cultures[3].score += 5; }
  if (sol === 'argileux') { cultures[0].score += 8; cultures[1].score += 5; }
  cultures.sort(function(a, b) { return b.score - a.score; });

  var html = '<div style="margin-top:16px;">';
  html += '<h3 style="font-size:16px;font-weight:700;color:#1B4332;margin-bottom:12px;">📊 Resultats pour ' + surface + ' ha</h3>';

  cultures.slice(0, 3).forEach(function(c, i) {
    var revenu = Math.round(surface * c.rendement * 1000 * c.prixKg);
    var revenuStr = revenu.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    var barColor = i === 0 ? '#2D6A4F' : i === 1 ? '#E8862A' : '#6B7280';
    html += '<div class="card" style="padding:14px;margin-bottom:10px;border-left:4px solid ' + barColor + ';border-radius:0 14px 14px 0;">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;">'
      + '<div><span style="font-size:24px;margin-right:8px;">' + c.emoji + '</span><strong style="font-size:16px;">' + c.nom + '</strong>'
      + (i === 0 ? ' <span style="background:#D8F3DC;color:#2D6A4F;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">RECOMMANDE</span>' : '') + '</div>'
      + '<div style="font-size:11px;color:var(--text-light);">' + c.saison + '</div></div>'
      + '<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center;">'
      + '<div><div style="font-size:10px;color:#999;">Rendement</div><div style="font-weight:700;">' + c.rendement + ' t/ha</div></div>'
      + '<div><div style="font-size:10px;color:#999;">Prix</div><div style="font-weight:700;">' + c.prixKg + ' FCFA/kg</div></div>'
      + '<div><div style="font-size:10px;color:#999;">Revenu estime</div><div style="font-weight:700;color:#2D6A4F;">' + revenuStr + ' FCFA</div></div>'
      + '</div></div>';
  });
  html += '</div>';
  container.innerHTML = html;
  container.style.display = 'block';
};

// ============================================================
// Proprietaire — Annuaire Techniciens Agricoles
// ============================================================
window.chercherTechniciens = function() {
  var pays = document.getElementById('propPays').value || 'benin';
  var region = document.getElementById('propRegion').value || '';
  var container = document.getElementById('techniciensList');
  if (!container) return;

  var techniciens = {
    benin: [
      { nom: 'Agossou Marc', specialite: 'Cultures vivrieres, mais, manioc', zone: 'Parakou / Borgou', tel: '+229 97 XX XX XX' },
      { nom: 'Adjovi Felicien', specialite: 'Maraichage, irrigation', zone: 'Bohicon / Zou', tel: '+229 96 XX XX XX' },
      { nom: 'Dossou Achille', specialite: 'Cajou, anacarde, sols', zone: 'Glazoue / Collines', tel: '+229 95 XX XX XX' },
      { nom: 'Houessou Lydia', specialite: 'Cultures de rente, cacao', zone: 'Cotonou / Littoral', tel: '+229 94 XX XX XX' }
    ],
    burkina_faso: [
      { nom: 'Ouedraogo Ibrahim', specialite: 'Cereales, mil, sorgho', zone: 'Ouagadougou', tel: '+226 70 XX XX XX' },
      { nom: 'Savadogo Mariam', specialite: 'Maraichage, oignon', zone: 'Bobo-Dioulasso', tel: '+226 71 XX XX XX' }
    ],
    cote_divoire: [
      { nom: 'Kouame Jean-Pierre', specialite: 'Cacao, cafe, hevea', zone: 'Abidjan / Sud', tel: '+225 07 XX XX XX' },
      { nom: 'Kone Adama', specialite: 'Riz, mais, igname', zone: 'Bouake / Centre', tel: '+225 05 XX XX XX' }
    ],
    mali: [
      { nom: 'Traore Moussa', specialite: 'Cereales, riz, coton', zone: 'Bamako / Koulikoro', tel: '+223 76 XX XX XX' }
    ],
    senegal: [
      { nom: 'Diallo Abdoulaye', specialite: 'Arachide, mil, riz', zone: 'Dakar / Thies', tel: '+221 77 XX XX XX' },
      { nom: 'Ndiaye Fatou', specialite: 'Maraichage, tomate, oignon', zone: 'Saint-Louis / Niayes', tel: '+221 78 XX XX XX' }
    ],
    niger: [
      { nom: 'Adamou Harouna', specialite: 'Mil, niebe, sorgho', zone: 'Niamey / Tillaberi', tel: '+227 96 XX XX XX' }
    ],
    togo: [
      { nom: 'Mensah Kofi', specialite: 'Mais, manioc, igname', zone: 'Lome / Maritime', tel: '+228 90 XX XX XX' }
    ],
    guinee_bissau: [
      { nom: 'Da Silva Carlos', specialite: 'Cajou, riz', zone: 'Bissau / Biombo', tel: '+245 95 XX XX XX' }
    ]
  };

  var liste = techniciens[pays] || techniciens.benin;
  var html = '';
  liste.forEach(function(t) {
    html += '<div class="card" style="padding:14px;margin-bottom:10px;border-radius:14px;">'
      + '<div style="display:flex;align-items:center;gap:12px;">'
      + '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#2D6A4F,#40916C);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;flex-shrink:0;">'
      + t.nom.charAt(0) + '</div>'
      + '<div style="flex:1;">'
      + '<div style="font-weight:700;font-size:14px;">' + t.nom + '</div>'
      + '<div style="font-size:12px;color:var(--text-light);">' + t.specialite + '</div>'
      + '<div style="font-size:11px;color:#E8862A;font-weight:600;">📍 ' + t.zone + '</div>'
      + '</div></div>'
      + '<div style="display:flex;gap:8px;margin-top:10px;">'
      + '<a href="tel:' + t.tel.replace(/\s/g, '') + '" style="flex:1;padding:10px;background:#2D6A4F;color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;">📞 Appeler</a>'
      + '<a href="https://wa.me/' + t.tel.replace(/[^0-9]/g, '') + '" target="_blank" style="flex:1;padding:10px;background:#25D366;color:#fff;border-radius:10px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;">💬 WhatsApp</a>'
      + '</div></div>';
  });
  container.innerHTML = html;
};

// NOTE: calculateTransport() est dans negoce.js.src — ne pas dupliquer ici

// ============================================================
// Souscription Plan — Paiement Mobile Money via FedaPay
// ============================================================
window.souscrirePlan = function(plan, montant) {
  var fmt = montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  var user = JSON.parse(localStorage.getItem('agroprix_user') || '{}');

  // Build payment modal
  var overlay = document.createElement('div');
  overlay.id = 'paymentOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

  var modal = '<div style="background:#fff;border-radius:20px;padding:24px;max-width:400px;width:100%;">'
    + '<div style="text-align:center;margin-bottom:20px;">'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#999;">ABONNEMENT</div>'
    + '<div style="font-size:24px;font-weight:800;color:#1B4332;margin-top:4px;">Plan ' + plan + '</div>'
    + '<div style="font-size:28px;font-weight:800;color:#E8862A;margin-top:8px;">' + fmt + ' FCFA<span style="font-size:14px;color:#999;font-weight:500;">/mois</span></div>'
    + '</div>'
    + '<div style="margin-bottom:16px;">'
    + '<label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Methode de paiement</label>'
    + '<div style="display:flex;gap:10px;margin-top:8px;">'
    + '<button onclick="selectPayMethod(\'mtn\')" id="payMtn" style="flex:1;padding:14px;border:2px solid #E8862A;border-radius:12px;background:#FFF8F0;cursor:pointer;font-weight:700;font-size:13px;">📱 MTN MoMo</button>'
    + '<button onclick="selectPayMethod(\'moov\')" id="payMoov" style="flex:1;padding:14px;border:2px solid #ddd;border-radius:12px;background:#fff;cursor:pointer;font-weight:700;font-size:13px;">📱 Moov Money</button>'
    + '</div>'
    + '</div>'
    + '<div style="margin-bottom:16px;">'
    + '<label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px;">Numero de telephone</label>'
    + '<input type="tel" id="payPhone" placeholder="+229 XX XX XX XX" style="width:100%;padding:14px;border:1px solid #ddd;border-radius:12px;font-size:15px;font-family:inherit;">'
    + '</div>'
    + '<button onclick="confirmerPaiement(\'' + plan + '\',' + montant + ')" style="width:100%;padding:16px;background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;">💳 Payer ' + fmt + ' FCFA</button>'
    + '<button onclick="document.getElementById(\'paymentOverlay\').remove()" style="width:100%;margin-top:10px;padding:12px;background:none;border:1px solid #ddd;border-radius:12px;font-size:14px;color:#999;cursor:pointer;">Annuler</button>'
    + '</div>';

  overlay.innerHTML = modal;
  document.body.appendChild(overlay);
};

window.selectPayMethod = function(method) {
  var mtn = document.getElementById('payMtn');
  var moov = document.getElementById('payMoov');
  if (method === 'mtn') {
    mtn.style.borderColor = '#E8862A'; mtn.style.background = '#FFF8F0';
    moov.style.borderColor = '#ddd'; moov.style.background = '#fff';
  } else {
    moov.style.borderColor = '#E8862A'; moov.style.background = '#FFF8F0';
    mtn.style.borderColor = '#ddd'; mtn.style.background = '#fff';
  }
};

window.confirmerPaiement = function(plan, montant) {
  var phone = document.getElementById('payPhone');
  if (!phone || !phone.value.trim()) {
    alert('Veuillez entrer votre numero de telephone.');
    return;
  }

  var overlay = document.getElementById('paymentOverlay');
  if (overlay) {
    overlay.innerHTML = '<div style="background:#fff;border-radius:20px;padding:40px;max-width:400px;width:100%;text-align:center;">'
      + '<div style="font-size:64px;margin-bottom:16px;">✅</div>'
      + '<div style="font-size:20px;font-weight:800;color:#1B4332;">Paiement initie !</div>'
      + '<div style="font-size:14px;color:#666;margin-top:8px;">Un SMS de confirmation FedaPay va etre envoye au <strong>' + phone.value + '</strong>.</div>'
      + '<div style="font-size:13px;color:#999;margin-top:8px;">Plan ' + plan + ' — ' + montant.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA/mois</div>'
      + '<div style="margin-top:16px;padding:12px;background:#D8F3DC;border-radius:12px;font-size:12px;color:#1B4332;">'
      + '💡 En production, ce paiement sera traite par FedaPay (MTN MoMo / Moov Money). Pour l\'instant c\'est une simulation.'
      + '</div>'
      + '<button onclick="document.getElementById(\'paymentOverlay\').remove()" style="width:100%;margin-top:16px;padding:14px;background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border:none;border-radius:14px;font-size:15px;font-weight:700;cursor:pointer;">Fermer</button>'
      + '</div>';
  }
};
