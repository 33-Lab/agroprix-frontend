// AgroPrix — Module Hevea Pro
// Architecture: Dashboard + Journal + Marche + Mon Dossier + Assistant IA flottant
window.AgroPrix = window.AgroPrix || {};

(function(AP) {
  'use strict';

  var STORAGE_KEY = 'agroprix_hevea';
  var initialized = false;

  // ─── DATA STORE (localStorage) ───
  function loadData() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultData(); }
    catch(e) { return defaultData(); }
  }
  function saveData(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }
  function defaultData() {
    return {
      parcelles: [],
      journalSaignee: [],
      journalPesee: [],
      acheteurs: [],
      scores: { plantation: 0, credit: 0, commercial: 0, eudr: 0 }
    };
  }

  // ─── CLONES DATABASE ───
  var CLONES = {
    'GT1':     { rendement: [1200,1800], vigueur: 'Forte',     sensibilites: 'Vent, TPD',       recommandation: 'Zones cotieres, replantation',  immaturite: 6 },
    'PB 217':  { rendement: [1500,2000], vigueur: 'Forte',     sensibilites: 'Fomes',           recommandation: 'Zones humides',                  immaturite: 6 },
    'PB 235':  { rendement: [2000,2500], vigueur: 'Tres forte',sensibilites: 'Corynespora, TPD',recommandation: 'Deconseille replantation',       immaturite: 5 },
    'PB 260':  { rendement: [1800,2200], vigueur: 'Forte',     sensibilites: 'Moderee',         recommandation: 'Recommande CNRA',                immaturite: 6 },
    'IRCA 18': { rendement: [1400,1800], vigueur: 'Forte',     sensibilites: 'Faible',          recommandation: 'Adapte CI',                      immaturite: 6 },
    'IRCA 111':{ rendement: [1600,2100], vigueur: 'Forte',     sensibilites: 'Faible',          recommandation: 'Adapte CI',                      immaturite: 6 },
    'RRIM 600':{ rendement: [1200,1600], vigueur: 'Moderee',   sensibilites: 'Vent',            recommandation: 'Zones interieures',              immaturite: 7 }
  };

  // ─── PRIX HEVEA (FCFA/kg) — REFACTOR 12/05/2026 ───
  // Avant : 20 mois hardcodés (APROMAC stylé). Maintenant : fetch API live
  // depuis /api/prices/monthly?country=cote_divoire&commodity=Rubber (le nom
  // DB HDX pour le caoutchouc). 19 mois disponibles en BDD vérifié.
  var PRIX_APROMAC = [];
  var PRIX_APROMAC_LOADING = false;
  var PRIX_APROMAC_ERROR = null;

  function loadPrixApromacLive() {
    if (PRIX_APROMAC_LOADING) return Promise.resolve();
    PRIX_APROMAC_LOADING = true;
    PRIX_APROMAC_ERROR = null;
    if (!AP.api || !AP.api.fetchPricesByDbName) {
      PRIX_APROMAC_LOADING = false;
      PRIX_APROMAC_ERROR = 'API non disponible';
      return Promise.resolve();
    }
    return AP.api.fetchPricesByDbName('cote_divoire', 'Rubber', '2024-01-01').then(function(rows) {
      PRIX_APROMAC.length = 0;
      (rows || []).forEach(function(r) {
        PRIX_APROMAC.push({ mois: r.month, prix: Math.round(r.avg_price), min: r.min_price, max: r.max_price, nbMarches: r.num_markets });
      });
      PRIX_APROMAC_LOADING = false;
      if (PRIX_APROMAC.length === 0) PRIX_APROMAC_ERROR = 'Aucune donnee BDD pour Hevea CI';
    }).catch(function(err) {
      PRIX_APROMAC_LOADING = false;
      PRIX_APROMAC_ERROR = 'Reseau indisponible';
      console.warn('[Hevea Pro] loadPrixApromacLive failed:', err);
    });
  }

  // ─── SYSTEMES DE SAIGNEE ───
  var SYSTEMES_SAIGNEE = {
    'S/2 d':     { frequence: '1j/2',  stimulation: 'Non',          production: 'Reference',  mainOeuvre: 'Intensive' },
    'S/2 d/3':   { frequence: '1j/3',  stimulation: 'Ethephon 2.5%',production: '+15-25%',    mainOeuvre: 'Reduite' },
    'S/4 d/4 ET':{ frequence: '1j/4',  stimulation: 'Ethephon 5%',  production: 'Maintien',   mainOeuvre: 'Minimale' },
    'S/2 3d/4':  { frequence: '3j/4',  stimulation: 'Ethephon',     production: '+20-50%',    mainOeuvre: 'Moderee' }
  };

  // ─── MALADIES DATABASE ───
  var MALADIES = [
    { nom: 'Fomes (Pourriture blanche)', agent: 'Rigidoporus microporus', symptomes: 'Jaunissement feuilles, champignon blanc sur collet, pourriture racines', incidence: 'Majeure en CI', traitement: 'PCNB, thiabendazole, hexaconazole. Arracher et bruler les souches infectees.', urgence: 'haute' },
    { nom: 'TPD (Encoche seche)', agent: 'Physiologique', symptomes: 'Dessechement du panneau de saignee, latex coagule in situ, baisse production brutale', incidence: '15-50% des arbres', traitement: 'Reduction frequence de saignee, arret stimulation, repos panneau 3-6 mois.', urgence: 'haute' },
    { nom: 'Corynespora', agent: 'C. cassiicola', symptomes: 'Taches brunes foliaires, defoliation. Clones PB 235 tres sensibles.', incidence: 'En progression', traitement: 'Chlorothalonil, mancozebe en traitement foliaire.', urgence: 'moyenne' },
    { nom: 'Phytophthora', agent: 'P. palmivora', symptomes: 'Rayures noires sur panneau, pourriture noire, suintement', incidence: 'Moderee', traitement: 'Metalaxyl + captafol en application sur panneau.', urgence: 'moyenne' },
    { nom: 'Collectotrichum', agent: 'C. gloeosporioides', symptomes: 'Anthracnose des jeunes feuilles, taches brunes', incidence: 'Pepiniere', traitement: 'Traitement au cuivre (bouillie bordelaise).', urgence: 'basse' }
  ];

  // ─── ZONES HEVEICOLES CI ───
  var ZONES_CI = [
    'San Pedro', 'Soubre', 'Tabou', 'Grand-Bereby', 'Sassandra', 'Gagnoa',
    'Daloa', 'Duekoue', 'Man', 'Alepe', 'Aboisso', 'Agboville',
    'Adzope', 'Abengourou', 'Daoukro', 'Bongouanou', 'Divo', 'Lakota'
  ];

  // ─── INIT ───
  AP.heveaInit = function() {
    if (initialized) return;
    initialized = true;
    var data = loadData();
    renderDashboard(data);
    renderTabs();
    // Refactor 12/05 : prix live BDD
    loadPrixApromacLive().then(function() {
      // Re-render le dashboard quand les données arrivent
      if (typeof renderDashboard === 'function') renderDashboard(loadData());
    });
  };

  // ─── TAB NAVIGATION ───
  function renderTabs() {
    document.querySelectorAll('.hevea-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = this.dataset.tab;
        document.querySelectorAll('.hevea-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        document.querySelectorAll('.hevea-section').forEach(function(s) { s.style.display = 'none'; });
        var section = document.getElementById('hevea-' + target);
        if (section) section.style.display = 'block';
        if (target === 'dashboard') renderDashboard(loadData());
        if (target === 'journal') renderJournal(loadData());
        if (target === 'marche') renderMarche(loadData());
        if (target === 'dossier') renderDossier(loadData());
      });
    });
  }

  // ─── SCORE CALCULATORS ───
  function calcScorePlantation(data) {
    var score = 0;
    if (data.parcelles.length > 0) score += 20;
    if (data.journalSaignee.length >= 10) score += 25;
    else if (data.journalSaignee.length >= 5) score += 15;
    else if (data.journalSaignee.length > 0) score += 5;
    // Has GPS
    var hasGps = data.parcelles.some(function(p) { return p.lat && p.lng; });
    if (hasGps) score += 15;
    // Clone info
    var hasClone = data.parcelles.some(function(p) { return p.clone && CLONES[p.clone]; });
    if (hasClone) score += 10;
    // Regular entries (at least 1/week)
    if (data.journalSaignee.length >= 20) score += 15;
    // Journal pesee
    if (data.journalPesee.length >= 5) score += 15;
    return Math.min(100, score);
  }

  function calcScoreCredit(data) {
    var score = 0;
    if (data.parcelles.length > 0) score += 15;
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    if (totalSurface >= 5) score += 20;
    else if (totalSurface >= 2) score += 10;
    if (data.journalSaignee.length >= 20) score += 25;
    if (data.journalPesee.length >= 10) score += 20;
    var hasGps = data.parcelles.some(function(p) { return p.lat && p.lng; });
    if (hasGps) score += 10;
    var hasClone = data.parcelles.some(function(p) { return p.clone; });
    if (hasClone) score += 10;
    return Math.min(100, score);
  }

  function calcScoreEUDR(data) {
    var score = 0;
    if (data.parcelles.length === 0) return 0;
    var hasGps = data.parcelles.some(function(p) { return p.lat && p.lng; });
    if (hasGps) score += 35;
    var hasDate = data.parcelles.some(function(p) { return p.datePlantation; });
    if (hasDate) score += 25;
    if (data.journalSaignee.length > 0) score += 20;
    var hasClone = data.parcelles.some(function(p) { return p.clone; });
    if (hasClone) score += 10;
    var hasSurface = data.parcelles.some(function(p) { return p.surface > 0; });
    if (hasSurface) score += 10;
    return Math.min(100, score);
  }

  function scoreColor(score) {
    if (score >= 70) return '#2D6A4F';
    if (score >= 40) return '#E8862A';
    return '#D32F2F';
  }

  function scoreLabel(score) {
    if (score >= 70) return 'Bon';
    if (score >= 40) return 'A ameliorer';
    return 'Insuffisant';
  }

  function eudrLabel(score) {
    if (score >= 70) return '🟢 Conforme';
    if (score >= 40) return '🟡 Partiel';
    return '🔴 Non conforme';
  }

  // ─── DASHBOARD RENDER ───
  function renderDashboard(data) {
    var sp = calcScorePlantation(data);
    var sc = calcScoreCredit(data);
    var se = calcScoreEUDR(data);
    data.scores = { plantation: sp, credit: sc, eudr: se };
    saveData(data);

    var el = document.getElementById('hevea-dashboard');
    if (!el) return;

    var nbParcelles = data.parcelles.length;
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var derniereSaignee = data.journalSaignee.length > 0 ? data.journalSaignee[data.journalSaignee.length - 1] : null;

    // Alertes
    var alertes = [];
    if (se < 40) alertes.push({ type: 'danger', text: 'Score EUDR insuffisant — Ajoutez la geolocalisation GPS de vos parcelles pour acceder au marche UE (deadline dec. 2026)' });
    if (nbParcelles === 0) alertes.push({ type: 'warning', text: 'Aucune parcelle enregistree. Ajoutez votre premiere parcelle pour commencer.' });
    if (data.journalSaignee.length === 0 && nbParcelles > 0) alertes.push({ type: 'info', text: 'Commencez a enregistrer vos saignees pour ameliorer votre Score Plantation.' });

    // Detect TPD risk
    if (data.journalSaignee.length >= 5) {
      var recent = data.journalSaignee.slice(-5);
      var avgRecent = recent.reduce(function(s, e) { return s + (e.poids || 0); }, 0) / recent.length;
      var older = data.journalSaignee.slice(-15, -5);
      if (older.length >= 5) {
        var avgOlder = older.reduce(function(s, e) { return s + (e.poids || 0); }, 0) / older.length;
        if (avgRecent < avgOlder * 0.7) {
          alertes.push({ type: 'danger', text: 'Alerte TPD : Baisse de production de ' + Math.round((1 - avgRecent/avgOlder) * 100) + '% detectee sur les 5 dernieres saignees. Reduisez la frequence de saignee.' });
        }
      }
    }

    var prixActuel = PRIX_APROMAC[PRIX_APROMAC.length - 1];

    el.innerHTML =
      // Scores
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">' +
        scoreCard('Plantation', sp) +
        scoreCard('Credit', sc) +
        scoreCardEUDR(se) +
      '</div>' +

      // Alertes
      (alertes.length > 0 ?
        '<div style="margin-bottom:16px;">' + alertes.map(function(a) {
          var bg = a.type === 'danger' ? '#FFEBEE' : a.type === 'warning' ? '#FFF8E1' : '#E8F5E9';
          var border = a.type === 'danger' ? '#D32F2F' : a.type === 'warning' ? '#F9A825' : '#2D6A4F';
          return '<div style="padding:12px;background:' + bg + ';border-left:4px solid ' + border + ';border-radius:8px;font-size:12px;color:#333;margin-bottom:8px;">' + a.text + '</div>';
        }).join('') + '</div>' : '') +

      // Resume
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Resume exploitation</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          statBox('Parcelles', nbParcelles) +
          statBox('Surface', totalSurface.toFixed(1) + ' ha') +
          statBox('Saignees', data.journalSaignee.length + ' entrees') +
          statBox('Prix APROMAC', prixActuel.prix + ' FCFA/kg') +
        '</div>' +
      '</div>' +

      // Prochaine action
      '<div class="card" style="padding:16px;border-radius:14px;background:linear-gradient(135deg,#f8faf9,#eef5f0);">' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">Prochaine action recommandee</div>' +
        '<div style="font-size:13px;color:#555;">' + getNextAction(data, se) + '</div>' +
      '</div>';
  }

  function scoreCard(label, score) {
    return '<div style="background:#fff;border-radius:12px;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
      '<div style="font-size:28px;font-weight:900;color:' + scoreColor(score) + ';">' + score + '</div>' +
      '<div style="font-size:10px;font-weight:600;color:#999;text-transform:uppercase;margin-top:2px;">' + label + '</div>' +
      '<div style="font-size:10px;color:' + scoreColor(score) + ';font-weight:600;">' + scoreLabel(score) + '</div>' +
    '</div>';
  }

  function scoreCardEUDR(score) {
    return '<div style="background:#fff;border-radius:12px;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
      '<div style="font-size:28px;font-weight:900;color:' + scoreColor(score) + ';">' + score + '</div>' +
      '<div style="font-size:10px;font-weight:600;color:#999;text-transform:uppercase;margin-top:2px;">EUDR</div>' +
      '<div style="font-size:10px;font-weight:600;">' + eudrLabel(score) + '</div>' +
    '</div>';
  }

  function statBox(label, value) {
    return '<div style="background:#f8f9fa;border-radius:10px;padding:10px;text-align:center;">' +
      '<div style="font-size:16px;font-weight:800;color:#1B4332;">' + value + '</div>' +
      '<div style="font-size:10px;color:#999;">' + label + '</div>' +
    '</div>';
  }

  function getNextAction(data, eudrScore) {
    if (data.parcelles.length === 0) return 'Ajoutez votre premiere parcelle dans l\'onglet <b>Journal</b> pour demarrer.';
    if (eudrScore < 40) return 'Activez la geolocalisation GPS de vos parcelles pour ameliorer votre Score EUDR.';
    if (data.journalSaignee.length === 0) return 'Enregistrez votre premiere saignee dans l\'onglet <b>Journal</b>.';
    if (data.journalPesee.length === 0) return 'Enregistrez votre premiere pesee dans l\'onglet <b>Marche</b> pour suivre vos ventes.';
    if (data.scores.credit < 50) return 'Continuez a enregistrer vos saignees et pesees pour ameliorer votre Score Dossier.';
    return 'Votre exploitation est bien suivie. Consultez l\'onglet <b>Mon Dossier</b> pour generer un dossier de credit.';
  }

  // ─── JOURNAL SECTION ───
  function renderJournal(data) {
    var el = document.getElementById('hevea-journal');
    if (!el) return;

    el.innerHTML =
      // Ajouter parcelle
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Mes parcelles (' + data.parcelles.length + ')</div>' +
        (data.parcelles.length > 0 ?
          data.parcelles.map(function(p, i) {
            return '<div style="padding:10px;background:#f8f9fa;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
              '<div>' +
                '<div style="font-size:13px;font-weight:700;">' + (p.nom || 'Parcelle ' + (i+1)) + '</div>' +
                '<div style="font-size:11px;color:#666;">' + (p.clone || '?') + ' — ' + (p.surface || '?') + ' ha — ' + (p.zone || '?') + '</div>' +
                '<div style="font-size:10px;color:#999;">' + (p.lat ? 'GPS: ' + p.lat.toFixed(4) + ', ' + p.lng.toFixed(4) : 'Pas de GPS') + '</div>' +
              '</div>' +
              '<div style="display:flex;gap:6px;">' +
                '<button onclick="AgroPrix.heveaGeolocParcelle(' + i + ')" style="padding:6px 10px;background:#E8F5E9;border:none;border-radius:8px;font-size:11px;cursor:pointer;" title="Geolocaliser">📍</button>' +
                '<button onclick="AgroPrix.heveaDeleteParcelle(' + i + ')" style="padding:6px 10px;background:#FFEBEE;border:none;border-radius:8px;font-size:11px;cursor:pointer;" title="Supprimer">✕</button>' +
              '</div>' +
            '</div>';
          }).join('') : '<p style="font-size:12px;color:#999;text-align:center;padding:12px;">Aucune parcelle enregistree</p>') +
        '<button onclick="AgroPrix.heveaShowAddParcelle()" style="width:100%;margin-top:8px;padding:12px;background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">+ Ajouter une parcelle</button>' +
        '<div id="hevea-add-parcelle" style="display:none;margin-top:12px;padding:14px;background:#f0f7f3;border-radius:12px;"></div>' +
      '</div>' +

      // Journal saignee
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Journal de saignee</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Parcelle</label>' +
          '<select id="hevea-saignee-parcelle" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;">' +
            (data.parcelles.length > 0 ? data.parcelles.map(function(p, i) { return '<option value="' + i + '">' + (p.nom || 'Parcelle ' + (i+1)) + '</option>'; }).join('') : '<option>Aucune parcelle</option>') +
          '</select></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Poids latex (kg)</label>' +
          '<input type="number" id="hevea-saignee-poids" placeholder="Ex: 45" min="0" step="0.5" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">DRC estime (%)</label>' +
          '<input type="number" id="hevea-saignee-drc" placeholder="Ex: 33" min="20" max="60" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Observations</label>' +
          '<select id="hevea-saignee-obs" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;">' +
            '<option value="">Normal</option><option value="faible">Production faible</option><option value="tpd">Encoche seche (TPD)</option><option value="fomes">Suspicion Fomes</option><option value="pluie">Pluie/annulation</option>' +
          '</select></div>' +
        '</div>' +
        '<button onclick="AgroPrix.heveaAddSaignee()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2D6A4F,#40916C);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Enregistrer la saignee</button>' +

        // Historique
        (data.journalSaignee.length > 0 ?
          '<div style="margin-top:14px;max-height:200px;overflow-y:auto;">' +
          data.journalSaignee.slice().reverse().slice(0, 10).map(function(e) {
            var obsColor = e.observation === 'tpd' ? '#D32F2F' : e.observation === 'fomes' ? '#E8862A' : '#666';
            return '<div style="padding:8px;border-bottom:1px solid #f0f0f0;font-size:12px;display:flex;justify-content:space-between;">' +
              '<span>' + e.date + ' — ' + (e.parcelle || '?') + '</span>' +
              '<span style="font-weight:700;">' + e.poids + ' kg</span>' +
              '<span style="color:' + obsColor + ';">' + (e.observation || 'OK') + '</span>' +
            '</div>';
          }).join('') +
          '</div>' : '') +
      '</div>' +

      // Maladies
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Guide maladies hevea</div>' +
        MALADIES.map(function(m) {
          var bg = m.urgence === 'haute' ? '#FFF3F0' : m.urgence === 'moyenne' ? '#FFF8E1' : '#F8F9FA';
          var border = m.urgence === 'haute' ? '#D32F2F' : m.urgence === 'moyenne' ? '#E8862A' : '#ddd';
          return '<div style="padding:12px;background:' + bg + ';border-left:3px solid ' + border + ';border-radius:8px;margin-bottom:8px;">' +
            '<div style="font-size:13px;font-weight:700;">' + m.nom + '</div>' +
            '<div style="font-size:11px;color:#666;margin:4px 0;">Agent : ' + m.agent + '</div>' +
            '<div style="font-size:11px;">Symptomes : ' + m.symptomes + '</div>' +
            '<div style="font-size:11px;color:#2D6A4F;margin-top:4px;font-weight:600;">Traitement : ' + m.traitement + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      // Calculateur systeme saignee
      '<div class="card" style="padding:16px;border-radius:14px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Systemes de saignee</div>' +
        '<table style="width:100%;font-size:11px;border-collapse:collapse;">' +
          '<tr style="background:#f0f7f3;"><th style="padding:8px;text-align:left;">Systeme</th><th>Frequence</th><th>Stimulation</th><th>Production</th><th>Main d\'oeuvre</th></tr>' +
          Object.keys(SYSTEMES_SAIGNEE).map(function(k) {
            var s = SYSTEMES_SAIGNEE[k];
            return '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;font-weight:700;">' + k + '</td><td style="text-align:center;">' + s.frequence + '</td><td style="text-align:center;">' + s.stimulation + '</td><td style="text-align:center;">' + s.production + '</td><td style="text-align:center;">' + s.mainOeuvre + '</td></tr>';
          }).join('') +
        '</table>' +
      '</div>';
  }

  // ─── MARCHE SECTION ───
  function renderMarche(data) {
    var el = document.getElementById('hevea-marche');
    if (!el) return;

    var prixActuel = PRIX_APROMAC[PRIX_APROMAC.length - 1];
    var prixPrec = PRIX_APROMAC[PRIX_APROMAC.length - 2];
    var variation = prixActuel.prix - prixPrec.prix;
    var arrow = variation >= 0 ? '▲' : '▼';
    var varColor = variation >= 0 ? '#2D6A4F' : '#D32F2F';

    el.innerHTML =
      // Prix APROMAC
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;">' +
        '<div style="font-size:12px;opacity:0.8;margin-bottom:4px;">Prix officiel APROMAC — ' + prixActuel.mois + '</div>' +
        '<div style="font-size:36px;font-weight:900;">' + prixActuel.prix + ' <span style="font-size:14px;font-weight:500;">FCFA/kg</span></div>' +
        '<div style="font-size:13px;margin-top:4px;">' +
          '<span style="color:' + (variation >= 0 ? '#A7F3D0' : '#FCA5A5') + ';font-weight:700;">' + arrow + ' ' + Math.abs(variation) + ' FCFA</span> vs mois precedent' +
        '</div>' +
      '</div>' +

      // Historique prix chart placeholder
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Historique prix APROMAC</div>' +
        '<div style="display:flex;align-items:flex-end;height:120px;gap:4px;padding:0 4px;">' +
          PRIX_APROMAC.map(function(p) {
            var minP = 300, maxP = 500;
            var h = Math.max(10, ((p.prix - minP) / (maxP - minP)) * 100);
            var isLast = p === prixActuel;
            return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
              '<div style="font-size:9px;font-weight:700;color:' + (isLast ? '#1B4332' : '#999') + ';margin-bottom:2px;">' + p.prix + '</div>' +
              '<div style="width:100%;height:' + h + 'px;background:' + (isLast ? '#2D6A4F' : '#D8F3DC') + ';border-radius:4px 4px 0 0;"></div>' +
              '<div style="font-size:8px;color:#999;margin-top:3px;">' + p.mois.slice(5) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      // Journal pesee
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Journal de pesee</div>' +
        '<p style="font-size:11px;color:#999;margin-bottom:10px;">Enregistrez chaque livraison pour comparer le prix paye au prix officiel APROMAC.</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Poids declare (kg)</label>' +
          '<input type="number" id="hevea-pesee-poids" placeholder="400" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Poids paye (kg)</label>' +
          '<input type="number" id="hevea-pesee-paye" placeholder="380" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Prix paye (FCFA/kg)</label>' +
          '<input type="number" id="hevea-pesee-prix" placeholder="' + prixActuel.prix + '" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Acheteur</label>' +
          '<input type="text" id="hevea-pesee-acheteur" placeholder="Nom acheteur" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
        '</div>' +
        '<button onclick="AgroPrix.heveaAddPesee()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2D6A4F,#40916C);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Enregistrer la pesee</button>' +

        // Historique pesee
        (data.journalPesee.length > 0 ?
          '<div style="margin-top:14px;">' +
          data.journalPesee.slice().reverse().slice(0, 10).map(function(p) {
            var ecartPoids = p.poidsDeclare - p.poidsPaye;
            var ecartPrix = PRIX_APROMAC[PRIX_APROMAC.length - 1].prix - p.prixPaye;
            var warn = ecartPoids > 5 || ecartPrix > 20;
            return '<div style="padding:10px;background:' + (warn ? '#FFF3F0' : '#f8f9fa') + ';border-radius:8px;margin-bottom:6px;font-size:12px;">' +
              '<div style="display:flex;justify-content:space-between;">' +
                '<span style="font-weight:700;">' + p.date + ' — ' + (p.acheteur || '?') + '</span>' +
                '<span style="font-weight:700;">' + p.prixPaye + ' FCFA/kg</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;color:#666;margin-top:2px;">' +
                '<span>Declare: ' + p.poidsDeclare + 'kg → Paye: ' + p.poidsPaye + 'kg</span>' +
                (ecartPoids > 5 ? '<span style="color:#D32F2F;font-weight:700;">-' + ecartPoids + 'kg refraction</span>' : '') +
              '</div>' +
              (ecartPrix > 20 ? '<div style="color:#D32F2F;font-size:11px;margin-top:2px;font-weight:600;">Prix APROMAC: ' + PRIX_APROMAC[PRIX_APROMAC.length-1].prix + ' FCFA — ecart de ' + ecartPrix + ' FCFA/kg</div>' : '') +
            '</div>';
          }).join('') +
          '</div>' : '') +
      '</div>' +

      // Comparateur acheteurs
      '<div class="card" style="padding:16px;border-radius:14px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Comparateur acheteurs</div>' +
        (getAcheteurStats(data).length > 0 ?
          '<table style="width:100%;font-size:11px;border-collapse:collapse;">' +
            '<tr style="background:#f0f7f3;"><th style="padding:8px;text-align:left;">Acheteur</th><th>Nb livr.</th><th>Prix moy.</th><th>Ecart APROMAC</th><th>Note</th></tr>' +
            getAcheteurStats(data).map(function(a) {
              var ecart = PRIX_APROMAC[PRIX_APROMAC.length-1].prix - a.prixMoyen;
              var noteColor = ecart <= 10 ? '#2D6A4F' : ecart <= 30 ? '#E8862A' : '#D32F2F';
              var note = ecart <= 10 ? 'Bon' : ecart <= 30 ? 'Moyen' : 'Eviter';
              return '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;font-weight:600;">' + a.nom + '</td><td style="text-align:center;">' + a.count + '</td><td style="text-align:center;">' + a.prixMoyen + '</td><td style="text-align:center;color:' + (ecart > 0 ? '#D32F2F' : '#2D6A4F') + ';">' + (ecart > 0 ? '-' : '+') + Math.abs(ecart) + '</td><td style="text-align:center;color:' + noteColor + ';font-weight:700;">' + note + '</td></tr>';
            }).join('') +
          '</table>'
        : '<p style="font-size:12px;color:#999;text-align:center;">Enregistrez des pesees pour voir les statistiques par acheteur.</p>') +
      '</div>';
  }

  function getAcheteurStats(data) {
    var map = {};
    data.journalPesee.forEach(function(p) {
      if (!p.acheteur) return;
      if (!map[p.acheteur]) map[p.acheteur] = { nom: p.acheteur, totalPrix: 0, count: 0 };
      map[p.acheteur].totalPrix += p.prixPaye;
      map[p.acheteur].count++;
    });
    return Object.values(map).map(function(a) {
      a.prixMoyen = Math.round(a.totalPrix / a.count);
      return a;
    }).sort(function(a, b) { return b.prixMoyen - a.prixMoyen; });
  }

  // ─── MON DOSSIER SECTION ───
  function renderDossier(data) {
    var el = document.getElementById('hevea-dossier');
    if (!el) return;

    var sp = calcScorePlantation(data);
    var sc = calcScoreCredit(data);
    var se = calcScoreEUDR(data);
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var nbSaignees = data.journalSaignee.length;
    var nbPesees = data.journalPesee.length;

    // Completude dossier
    var completude = 0;
    var pieces = [];
    if (data.parcelles.length > 0) { completude += 15; pieces.push({ nom: 'Fiche exploitation', ok: true }); } else { pieces.push({ nom: 'Fiche exploitation', ok: false, action: 'Ajoutez une parcelle' }); }
    if (data.parcelles.some(function(p) { return p.lat; })) { completude += 15; pieces.push({ nom: 'Geolocalisation GPS', ok: true }); } else { pieces.push({ nom: 'Geolocalisation GPS', ok: false, action: 'Geolocalisez une parcelle' }); }
    if (data.parcelles.some(function(p) { return p.clone; })) { completude += 10; pieces.push({ nom: 'Information clones', ok: true }); } else { pieces.push({ nom: 'Information clones', ok: false, action: 'Indiquez le clone de vos parcelles' }); }
    if (nbSaignees >= 10) { completude += 20; pieces.push({ nom: 'Historique production (10+ entrees)', ok: true }); } else { pieces.push({ nom: 'Historique production (' + nbSaignees + '/10 entrees)', ok: false, action: 'Enregistrez vos saignees' }); }
    if (nbPesees >= 5) { completude += 20; pieces.push({ nom: 'Historique vente (5+ pesees)', ok: true }); } else { pieces.push({ nom: 'Historique vente (' + nbPesees + '/5 pesees)', ok: false, action: 'Enregistrez vos pesees' }); }
    if (se >= 70) { completude += 20; pieces.push({ nom: 'Conformite EUDR', ok: true }); } else { pieces.push({ nom: 'Conformite EUDR', ok: false, action: 'Score EUDR insuffisant' }); }

    el.innerHTML =
      // Scores detailles
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Mes scores</div>' +
        scoreBar('Score Plantation', sp) +
        scoreBar('Score Dossier', sc) +
        scoreBar('Score EUDR', se) +
      '</div>' +

      // Completude dossier
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
          '<div style="font-size:15px;font-weight:700;">Dossier de credit</div>' +
          '<div style="font-size:13px;font-weight:700;color:' + scoreColor(completude) + ';">' + completude + '% complet</div>' +
        '</div>' +
        '<div style="height:8px;background:#f0f0f0;border-radius:4px;margin-bottom:14px;"><div style="height:8px;background:' + scoreColor(completude) + ';border-radius:4px;width:' + completude + '%;transition:width 0.3s;"></div></div>' +
        pieces.map(function(p) {
          return '<div style="padding:8px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #f0f0f0;">' +
            '<span style="font-size:14px;">' + (p.ok ? '✅' : '⬜') + '</span>' +
            '<div style="flex:1;">' +
              '<div style="font-size:12px;font-weight:600;color:' + (p.ok ? '#2D6A4F' : '#999') + ';">' + p.nom + '</div>' +
              (p.action ? '<div style="font-size:10px;color:#E8862A;">' + p.action + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
        '<button onclick="AgroPrix.heveaExportDossier()" style="width:100%;margin-top:14px;padding:12px;background:linear-gradient(135deg,#1B4332,#2D6A4F);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;" ' + (completude < 40 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>Generer mon dossier PDF</button>' +
      '</div>' +

      // EUDR declaration
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;border-left:4px solid ' + scoreColor(se) + ';">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">Declaration EUDR</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:12px;">Reglement europeen sur la deforestation — Deadline dec. 2026</div>' +
        '<div style="font-size:24px;text-align:center;margin:12px 0;">' + eudrLabel(se) + '</div>' +
        '<div style="font-size:11px;color:#666;">' +
          '<div style="margin-bottom:4px;">• Parcelles geolocalisees : ' + data.parcelles.filter(function(p) { return p.lat; }).length + '/' + data.parcelles.length + '</div>' +
          '<div style="margin-bottom:4px;">• Date plantation renseignee : ' + data.parcelles.filter(function(p) { return p.datePlantation; }).length + '/' + data.parcelles.length + '</div>' +
          '<div>• Historique cultural : ' + (nbSaignees > 0 ? 'Oui (' + nbSaignees + ' entrees)' : 'Non') + '</div>' +
        '</div>' +
        '<button onclick="AgroPrix.heveaExportEUDR()" style="width:100%;margin-top:12px;padding:12px;background:linear-gradient(135deg,#2D6A4F,#40916C);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Exporter declaration EUDR (PDF)</button>' +
      '</div>' +

      // Estimation assurance
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">Assurance agricole</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:12px;">Estimation indicative — Produits micro-assurance CI</div>' +
        (totalSurface > 0 ?
          '<div style="background:#f8f9fa;border-radius:10px;padding:12px;margin-bottom:10px;">' +
            '<div style="font-size:12px;color:#999;">Prime estimee annuelle</div>' +
            '<div style="font-size:22px;font-weight:800;color:#1B4332;">' + Math.round(totalSurface * 25000) + ' FCFA</div>' +
            '<div style="font-size:10px;color:#666;">Base: 25 000 FCFA/ha/an — ' + totalSurface.toFixed(1) + ' ha</div>' +
          '</div>' : '') +
        '<button onclick="AgroPrix.heveaContactAssurance()" style="width:100%;padding:12px;background:linear-gradient(135deg,#E8862A,#F5A623);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Etre contacte par un assureur</button>' +
      '</div>' +

      // Annuaire techniciens
      '<div class="card" style="padding:16px;border-radius:14px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">Annuaire techniciens hevea</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:12px;">Operateurs techniques APROMAC + saigneurs certifies EVPS</div>' +
        '<select id="hevea-tech-zone" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;">' +
          '<option value="">-- Choisir une zone --</option>' +
          ZONES_CI.map(function(z) { return '<option value="' + z + '">' + z + '</option>'; }).join('') +
        '</select>' +
        '<button onclick="AgroPrix.heveaChercherTechniciens()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2D6A4F,#40916C);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Chercher des techniciens</button>' +
        '<div id="hevea-tech-results"></div>' +
      '</div>';
  }

  function scoreBar(label, score) {
    return '<div style="margin-bottom:12px;">' +
      '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">' +
        '<span style="font-weight:600;">' + label + '</span>' +
        '<span style="font-weight:700;color:' + scoreColor(score) + ';">' + score + '/100 — ' + scoreLabel(score) + '</span>' +
      '</div>' +
      '<div style="height:8px;background:#f0f0f0;border-radius:4px;"><div style="height:8px;background:' + scoreColor(score) + ';border-radius:4px;width:' + score + '%;transition:width 0.3s;"></div></div>' +
    '</div>';
  }

  // ─── ACTIONS (exposed) ───

  AP.heveaShowAddParcelle = function() {
    var el = document.getElementById('hevea-add-parcelle');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    el.innerHTML =
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">Nouvelle parcelle</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
        '<div><label style="font-size:11px;font-weight:600;">Nom</label><input type="text" id="hevea-new-nom" placeholder="Ex: Parcelle Est" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"></div>' +
        '<div><label style="font-size:11px;font-weight:600;">Surface (ha)</label><input type="number" id="hevea-new-surface" placeholder="5" min="0.1" step="0.1" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
        '<div><label style="font-size:11px;font-weight:600;">Clone</label><select id="hevea-new-clone" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;">' +
          '<option value="">-- Clone --</option>' + Object.keys(CLONES).map(function(c) { return '<option value="' + c + '">' + c + ' (' + CLONES[c].rendement[0] + '-' + CLONES[c].rendement[1] + ' kg/ha)</option>'; }).join('') +
        '</select></div>' +
        '<div><label style="font-size:11px;font-weight:600;">Zone</label><select id="hevea-new-zone" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;">' +
          '<option value="">-- Zone --</option>' + ZONES_CI.map(function(z) { return '<option value="' + z + '">' + z + '</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
        '<div><label style="font-size:11px;font-weight:600;">Date plantation</label><input type="date" id="hevea-new-date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"></div>' +
        '<div><label style="font-size:11px;font-weight:600;">Stade</label><select id="hevea-new-stade" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"><option value="immature">Immature</option><option value="production">En production</option></select></div>' +
      '</div>' +
      '<button onclick="AgroPrix.heveaSaveParcelle()" style="width:100%;padding:10px;background:#2D6A4F;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Enregistrer la parcelle</button>';
  };

  AP.heveaSaveParcelle = function() {
    var data = loadData();
    var parcelle = {
      nom: (document.getElementById('hevea-new-nom') || {}).value || 'Parcelle ' + (data.parcelles.length + 1),
      surface: parseFloat((document.getElementById('hevea-new-surface') || {}).value) || 0,
      clone: (document.getElementById('hevea-new-clone') || {}).value || '',
      zone: (document.getElementById('hevea-new-zone') || {}).value || '',
      datePlantation: (document.getElementById('hevea-new-date') || {}).value || '',
      stade: (document.getElementById('hevea-new-stade') || {}).value || 'production',
      lat: null, lng: null,
      dateAjout: new Date().toISOString().slice(0, 10)
    };
    data.parcelles.push(parcelle);
    saveData(data);
    renderJournal(data);
    renderDashboard(data);
  };

  AP.heveaGeolocParcelle = function(index) {
    if (!navigator.geolocation) { alert('Geolocalisation non disponible sur cet appareil.'); return; }
    navigator.geolocation.getCurrentPosition(function(pos) {
      var data = loadData();
      if (data.parcelles[index]) {
        data.parcelles[index].lat = pos.coords.latitude;
        data.parcelles[index].lng = pos.coords.longitude;
        saveData(data);
        renderJournal(data);
        renderDashboard(data);
        alert('Parcelle geolocalisee : ' + pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4));
      }
    }, function() { alert('Impossible d\'obtenir votre position. Verifiez les autorisations GPS.'); });
  };

  AP.heveaDeleteParcelle = function(index) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    var data = loadData();
    data.parcelles.splice(index, 1);
    saveData(data);
    renderJournal(data);
    renderDashboard(data);
  };

  AP.heveaAddSaignee = function() {
    var data = loadData();
    var parcelleIdx = parseInt((document.getElementById('hevea-saignee-parcelle') || {}).value) || 0;
    var poids = parseFloat((document.getElementById('hevea-saignee-poids') || {}).value);
    if (!poids || poids <= 0) { alert('Entrez le poids du latex.'); return; }
    var entry = {
      date: new Date().toISOString().slice(0, 10),
      parcelle: data.parcelles[parcelleIdx] ? data.parcelles[parcelleIdx].nom : 'Parcelle ' + (parcelleIdx + 1),
      poids: poids,
      drc: parseFloat((document.getElementById('hevea-saignee-drc') || {}).value) || 33,
      observation: (document.getElementById('hevea-saignee-obs') || {}).value || ''
    };
    data.journalSaignee.push(entry);
    saveData(data);
    // Reset
    var poidsEl = document.getElementById('hevea-saignee-poids');
    if (poidsEl) poidsEl.value = '';
    renderJournal(data);
    renderDashboard(data);
  };

  AP.heveaAddPesee = function() {
    var data = loadData();
    var poidsDeclare = parseFloat((document.getElementById('hevea-pesee-poids') || {}).value);
    var poidsPaye = parseFloat((document.getElementById('hevea-pesee-paye') || {}).value);
    var prixPaye = parseFloat((document.getElementById('hevea-pesee-prix') || {}).value);
    if (!poidsDeclare || !poidsPaye || !prixPaye) { alert('Remplissez tous les champs.'); return; }
    var entry = {
      date: new Date().toISOString().slice(0, 10),
      poidsDeclare: poidsDeclare,
      poidsPaye: poidsPaye,
      prixPaye: prixPaye,
      acheteur: (document.getElementById('hevea-pesee-acheteur') || {}).value || 'Inconnu'
    };
    data.journalPesee.push(entry);
    saveData(data);
    var el1 = document.getElementById('hevea-pesee-poids'); if (el1) el1.value = '';
    var el2 = document.getElementById('hevea-pesee-paye'); if (el2) el2.value = '';
    var el3 = document.getElementById('hevea-pesee-prix'); if (el3) el3.value = '';
    var el4 = document.getElementById('hevea-pesee-acheteur'); if (el4) el4.value = '';
    renderMarche(data);
    renderDashboard(data);
  };

  AP.heveaExportDossier = function() {
    var data = loadData();
    var sc = calcScoreCredit(data);
    var se = calcScoreEUDR(data);
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var totalProd = data.journalSaignee.reduce(function(s, e) { return s + (e.poids || 0); }, 0);
    var avgPrix = data.journalPesee.length > 0 ? Math.round(data.journalPesee.reduce(function(s, p) { return s + p.prixPaye; }, 0) / data.journalPesee.length) : 0;

    var text = '=== DOSSIER DE CREDIT — HEVEA PRO ===\n' +
      'Genere par AgroPrix le ' + new Date().toISOString().slice(0, 10) + '\n\n' +
      '--- FICHE EXPLOITATION ---\n' +
      'Nombre de parcelles: ' + data.parcelles.length + '\n' +
      'Surface totale: ' + totalSurface.toFixed(1) + ' ha\n' +
      'Clones: ' + data.parcelles.map(function(p) { return p.clone || 'Non renseigne'; }).join(', ') + '\n' +
      'Zones: ' + data.parcelles.map(function(p) { return p.zone || 'Non renseignee'; }).join(', ') + '\n\n' +
      '--- SCORES ---\n' +
      'Score Dossier: ' + sc + '/100\n' +
      'Score EUDR: ' + se + '/100 (' + eudrLabel(se) + ')\n\n' +
      '--- HISTORIQUE PRODUCTION ---\n' +
      'Saignees enregistrees: ' + data.journalSaignee.length + '\n' +
      'Production totale latex: ' + totalProd.toFixed(1) + ' kg\n\n' +
      '--- HISTORIQUE VENTE ---\n' +
      'Pesees enregistrees: ' + data.journalPesee.length + '\n' +
      'Prix moyen obtenu: ' + avgPrix + ' FCFA/kg\n\n' +
      '--- PARCELLES GEOLOCALISEES ---\n' +
      data.parcelles.map(function(p, i) {
        return (i+1) + '. ' + (p.nom || 'Parcelle') + ' — ' + (p.surface || '?') + 'ha — ' + (p.clone || '?') + ' — GPS: ' + (p.lat ? p.lat.toFixed(5) + ',' + p.lng.toFixed(5) : 'Non geolocalisee');
      }).join('\n') + '\n\n' +
      '=== AgroPrix by 33 Lab — agroprix.app ===';

    // Download as text file
    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AgroPrix_Dossier_Credit_Hevea_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
  };

  AP.heveaExportEUDR = function() {
    var data = loadData();
    var text = '=== DECLARATION EUDR — HEVEA PRO ===\n' +
      'AgroPrix — Genere le ' + new Date().toISOString().slice(0, 10) + '\n' +
      'Reglement UE 2023/1115 sur la deforestation\n\n' +
      '--- EXPLOITANT ---\n' +
      'Score EUDR: ' + calcScoreEUDR(data) + '/100\n\n' +
      '--- PARCELLES ---\n' +
      data.parcelles.map(function(p, i) {
        return (i+1) + '. ' + (p.nom || 'Parcelle') + '\n' +
          '   Surface: ' + (p.surface || '?') + ' ha\n' +
          '   Clone: ' + (p.clone || 'Non renseigne') + '\n' +
          '   Date plantation: ' + (p.datePlantation || 'Non renseignee') + '\n' +
          '   Coordonnees GPS: ' + (p.lat ? p.lat.toFixed(6) + ', ' + p.lng.toFixed(6) : 'NON GEOLOCALISEE') + '\n' +
          '   Zone: ' + (p.zone || 'Non renseignee');
      }).join('\n\n') + '\n\n' +
      '--- ATTESTATION ---\n' +
      'Je certifie que les parcelles ci-dessus n\'ont pas fait l\'objet de deforestation\n' +
      'apres le 31 decembre 2020, conformement au Reglement UE 2023/1115.\n\n' +
      '=== AgroPrix by 33 Lab — agroprix.app ===';

    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AgroPrix_Declaration_EUDR_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
  };

  AP.heveaContactAssurance = function() {
    var msg = 'Bonjour, je suis producteur d\'hevea et je souhaite obtenir des informations sur l\'assurance agricole. Mon exploitation est enregistree sur AgroPrix.';
    window.open('https://wa.me/22996816868?text=' + encodeURIComponent(msg), '_blank');
  };

  AP.heveaChercherTechniciens = function() {
    var zone = (document.getElementById('hevea-tech-zone') || {}).value;
    var el = document.getElementById('hevea-tech-results');
    if (!el) return;
    if (!zone) { el.innerHTML = '<p style="font-size:12px;color:#E8862A;margin-top:8px;">Selectionnez une zone.</p>'; return; }

    // Simulated technician database (to be replaced by API)
    var techs = [
      { nom: 'Operateur technique APROMAC — Lot ' + zone, type: 'Encadrement', tel: '+225 07 XX XX XX', specialite: 'Suivi plantation, formation saigneurs' },
      { nom: 'EVPS ' + zone + ' — Ecole de saignee', type: 'Formation', tel: '+225 05 XX XX XX', specialite: 'Formation saigneur certifie (20 jours)' },
      { nom: 'ANADER — Direction ' + zone, type: 'Conseil', tel: '+225 27 XX XX XX', specialite: 'Conseil technique cultures perennes (TSCP)' }
    ];

    el.innerHTML = '<div style="margin-top:12px;">' + techs.map(function(t) {
      return '<div style="padding:12px;background:#f8f9fa;border-radius:10px;margin-bottom:8px;">' +
        '<div style="font-size:13px;font-weight:700;">' + t.nom + '</div>' +
        '<div style="font-size:11px;color:#666;">' + t.specialite + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button onclick="window.open(\'tel:' + t.tel + '\')" style="flex:1;padding:8px;background:#2D6A4F;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">Appeler</button>' +
          '<button onclick="AgroPrix.heveaDemanderDevis(\'' + t.nom.replace(/'/g, "\\'") + '\')" style="flex:1;padding:8px;background:#E8862A;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">Demander un devis</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  };

  AP.heveaDemanderDevis = function(techNom) {
    var data = loadData();
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var clones = data.parcelles.map(function(p) { return p.clone || '?'; }).join(', ');
    var msg = 'Bonjour ' + techNom + ',\n\nJe suis producteur d\'hevea et je souhaite un devis pour votre intervention.\n\n' +
      'Mon exploitation:\n- Surface: ' + totalSurface.toFixed(1) + ' ha\n- Clones: ' + clones + '\n- Parcelles: ' + data.parcelles.length + '\n\n' +
      'Demande envoyee via AgroPrix (agroprix.app)';
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  // ─── ASSISTANT IA (bouton flottant) ───
  AP.heveaToggleIA = function() {
    var panel = document.getElementById('hevea-ia-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  };

  AP.heveaAskIA = function() {
    var input = document.getElementById('hevea-ia-input');
    var output = document.getElementById('hevea-ia-output');
    if (!input || !output) return;
    var q = input.value.trim().toLowerCase();
    if (!q) return;

    var data = loadData();
    var response = getIAResponse(q, data);
    output.innerHTML = '<div style="padding:12px;background:#f0f7f3;border-radius:10px;font-size:12px;line-height:1.5;color:#333;">' +
      '<div style="font-size:11px;color:#2D6A4F;font-weight:700;margin-bottom:6px;">Assistant Agronomique</div>' +
      response +
      '<div style="font-size:9px;color:#999;margin-top:8px;font-style:italic;">Ce conseil ne remplace pas un diagnostic de terrain par un technicien qualifie.</div>' +
    '</div>';
    input.value = '';
  };

  function getIAResponse(q, data) {
    // Context-aware rule-based responses (to be enhanced with real AI API)
    if (q.match(/tpd|encoche.?s[eè]che|dessech/)) {
      return 'Le TPD (Tapping Panel Dryness) est lie a la surexploitation. <b>Actions recommandees :</b><br>' +
        '- Reduire la frequence de saignee (passer en S/2 d/3 ou S/4 d/4)<br>' +
        '- Arreter la stimulation a l\'Ethephon<br>' +
        '- Laisser le panneau au repos 3 a 6 mois<br>' +
        '- Passer a la saignee ascendante si le panneau bas est epuise<br>' +
        'Le CIRAD recommande les systemes LITS (Low Intensity Tapping) : -25 a -40% de main d\'oeuvre pour une production maintenue.';
    }
    if (q.match(/fomes|pourriture|champignon.?blanc|racine/)) {
      return '<b>Fomes (Rigidoporus microporus)</b> — Pourriture blanche des racines, maladie majeure en CI.<br>' +
        '<b>Symptomes :</b> Jaunissement des feuilles, champignon blanc sur le collet, mort lente de l\'arbre.<br>' +
        '<b>Traitement :</b> PCNB, thiabendazole ou hexaconazole en application sur les racines exposees.<br>' +
        '<b>Prevention :</b> Arracher et bruler les souches infectees avant replantation. Traiter les souches voisines.';
    }
    if (q.match(/clone|variete|quel.?clone|choisir/)) {
      return '<b>Clones recommandes CNRA pour la Cote d\'Ivoire :</b><br>' +
        '- <b>PB 260</b> : Meilleur compromis production/resistance (1800-2200 kg/ha)<br>' +
        '- <b>IRCA 18/111</b> : Adaptes CI, faible sensibilite aux maladies<br>' +
        '- <b>GT1</b> : Robuste mais sensible au vent et au TPD<br>' +
        '- <b>PB 235</b> : Tres productif mais TRES sensible a Corynespora et TPD — deconseille en replantation<br>' +
        'Le choix depend de votre zone, de l\'historique de la parcelle et de votre disponibilite en main d\'oeuvre.';
    }
    if (q.match(/eudr|europe|deforestation|tracabilite|export/)) {
      var se = calcScoreEUDR(data);
      return '<b>Reglement EUDR</b> — Le marche UE (30% des exports CI) exigera une tracabilite jusqu\'a la parcelle a partir de dec. 2026.<br>' +
        'Votre Score EUDR actuel : <b>' + se + '/100</b> (' + eudrLabel(se) + ')<br>' +
        '<b>Pour ameliorer :</b><br>' +
        '- Geolocalisez toutes vos parcelles (GPS dans l\'onglet Journal)<br>' +
        '- Renseignez la date de plantation (preuve que la parcelle existait avant dec. 2020)<br>' +
        '- Exportez votre declaration EUDR dans l\'onglet Mon Dossier';
    }
    if (q.match(/prix|apromac|vendre|marche|cours/)) {
      var prixActuel = PRIX_APROMAC[PRIX_APROMAC.length - 1];
      return '<b>Prix APROMAC actuel :</b> ' + prixActuel.prix + ' FCFA/kg (' + prixActuel.mois + ')<br>' +
        'Si un acheteur vous propose moins de ' + Math.round(prixActuel.prix * 0.85) + ' FCFA/kg, c\'est en dessous de 85% du prix officiel — signalez-le.<br>' +
        'Utilisez le <b>Journal de pesee</b> dans l\'onglet Marche pour enregistrer chaque livraison et detecter les ecarts.';
    }
    if (q.match(/saign|frequence|systeme|d\/2|d\/3/)) {
      return '<b>Systemes de saignee recommandes (CIRAD) :</b><br>' +
        '- <b>S/2 d</b> (1j/2) : Standard, reference de production<br>' +
        '- <b>S/2 d/3</b> (1j/3) + Ethephon 2.5% : +15-25% production, -33% main d\'oeuvre<br>' +
        '- <b>S/4 d/4 + stimulation</b> : Economie maximale de main d\'oeuvre<br>' +
        'La saignee ascendante apres 9 ans de descendante augmente la productivite de 34-36% (etude CIRAD CI).';
    }
    if (q.match(/credit|pret|banque|financement|dossier/)) {
      var sc = calcScoreCredit(data);
      return '<b>Votre Score Dossier : ' + sc + '/100</b><br>' +
        'Pour l\'hevea, les prets sont generalement sur 5-7 ans (remboursement a l\'ouverture du panneau).<br>' +
        '<b>Preteurs CI :</b> Advans (100K-5M FCFA), Baobab (jusqu\'a 300M FCFA), Ecobank (PME agricoles).<br>' +
        'Allez dans <b>Mon Dossier</b> pour generer un dossier complet adapte a chaque preteur.';
    }
    // Default
    return 'Je suis l\'Assistant Agronomique Hevea Pro, forme sur les donnees CNRA, CIRAD et APROMAC.<br>' +
      'Posez-moi des questions sur : les clones, la saignee, les maladies (Fomes, TPD), le prix APROMAC, l\'EUDR, le credit, ou la gestion de votre plantation.<br>' +
      '<b>Exemples :</b> "Quel clone choisir ?", "Mon arbre a une encoche seche", "Comment ameliorer mon Score EUDR ?"';
  }

})(window.AgroPrix);
