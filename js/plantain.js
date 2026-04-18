// AgroPrix — Module Plantain Pro
// Architecture: Dashboard + Journal + Marche + Mon Dossier + Assistant IA flottant
window.AgroPrix = window.AgroPrix || {};

(function(AP) {
  'use strict';

  var STORAGE_KEY = 'agroprix_plantain';
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
      journalRecolte: [],
      journalVente: [],
      scores: { exploitation: 0, credit: 0, qualite: 0 }
    };
  }

  // ─── VARIETES DATABASE ───
  var VARIETES = {
    'Faux Corne':  { rendement: [8,15],  cycle: '12-14 mois', resistance: 'Sigatoka: sensible', usage: 'Frais, alloco, foutou', recommandation: 'Dominant en CI, bon rendement' },
    'Corne':       { rendement: [6,12],  cycle: '14-16 mois', resistance: 'Sigatoka: sensible', usage: 'Frais, foutou', recommandation: 'Gros fruits, moins productif' },
    'French':      { rendement: [10,20], cycle: '11-13 mois', resistance: 'Sigatoka: moderee', usage: 'Frais, transformation', recommandation: 'Nombreux doigts, bon pour chips' },
    'Orishele':    { rendement: [12,22], cycle: '10-12 mois', resistance: 'Sigatoka: sensible', usage: 'Frais, alloco', recommandation: 'Cycle court, bon rendement' },
    'FHIA-21':     { rendement: [15,30], cycle: '11-13 mois', resistance: 'Sigatoka: resistant', usage: 'Frais, transformation', recommandation: 'Resistant Black Sigatoka — recommande CNRA' },
    'PITA-3':      { rendement: [12,25], cycle: '12-14 mois', resistance: 'Sigatoka: resistant', usage: 'Transformation, frais', recommandation: 'Bon compromis rendement/resistance' },
    'Big Ebanga':  { rendement: [10,18], cycle: '13-15 mois', resistance: 'Sigatoka: moderee', usage: 'Frais, foutou', recommandation: 'Gros regime, marche local' }
  };

  // ─── PRIX MARCHE PLANTAIN (FCFA/kg) ───
  // Prix bord champ et detail — sources: OCPV, ANADER, enquetes terrain CI
  var PRIX_PLANTAIN = [
    { mois: '2025-01', bordChamp: 180, detail: 380, saison: 'haute' },
    { mois: '2025-02', bordChamp: 200, detail: 400, saison: 'haute' },
    { mois: '2025-03', bordChamp: 160, detail: 350, saison: 'transition' },
    { mois: '2025-04', bordChamp: 130, detail: 280, saison: 'basse' },
    { mois: '2025-05', bordChamp: 100, detail: 220, saison: 'basse' },
    { mois: '2025-06', bordChamp: 90,  detail: 200, saison: 'basse' },
    { mois: '2025-07', bordChamp: 110, detail: 250, saison: 'transition' },
    { mois: '2025-08', bordChamp: 140, detail: 300, saison: 'transition' },
    { mois: '2025-09', bordChamp: 120, detail: 270, saison: 'transition' },
    { mois: '2025-10', bordChamp: 150, detail: 320, saison: 'haute' },
    { mois: '2025-11', bordChamp: 170, detail: 360, saison: 'haute' },
    { mois: '2025-12', bordChamp: 190, detail: 390, saison: 'haute' },
    { mois: '2026-01', bordChamp: 185, detail: 385, saison: 'haute' },
    { mois: '2026-02', bordChamp: 195, detail: 400, saison: 'haute' },
    { mois: '2026-03', bordChamp: 175, detail: 370, saison: 'transition' }
  ];

  // ─── MALADIES DATABASE ───
  var MALADIES = [
    { nom: 'Cercosporiose noire (Black Sigatoka)', agent: 'Mycosphaerella fijiensis', symptomes: 'Stries noires sur feuilles, dessechement progressif, reduction photosynthese — 3 a 52 traitements/an', incidence: 'Majeure (30-50% pertes)', traitement: 'Fongicides systemiques (propiconazole, azoxystrobine). Effeuillage sanitaire. Varietes resistantes FHIA-21, PITA-3.', urgence: 'haute' },
    { nom: 'Charancon du bananier', agent: 'Cosmopolites sordidus', symptomes: 'Galeries dans le bulbe, chute des plants, affaiblissement general', incidence: 'Elevee partout', traitement: 'Pieges a pheromones. Parage des bulbes avant plantation. Insecticide biologique (Beauveria bassiana).', urgence: 'haute' },
    { nom: 'Nematodes (Radopholus similis)', agent: 'R. similis, Pratylenchus', symptomes: 'Racines necrosees, chute des plants (toppling), croissance ralentie', incidence: 'Moderee a elevee', traitement: 'Parage + trempage bulbes eau chaude (52C, 20min). Rotation culturale. Varietes tolerantes.', urgence: 'moyenne' },
    { nom: 'Flétrissement bactérien (Moko)', agent: 'Ralstonia solanacearum', symptomes: 'Fletrissement brutal, jaunissement, exsudat bacterien sur coupe', incidence: 'Moderee', traitement: 'Destruction plants infectes. Desinfection outils. Pas de traitement curatif.', urgence: 'haute' },
    { nom: 'Fusariose TR4 (menace)', agent: 'Fusarium oxysporum f.sp. cubense TR4', symptomes: 'Jaunissement feuilles, fissures pseudo-tronc, mort du plant. PAS ENCORE en Afrique de l\'Ouest.', incidence: 'Menace existentielle', traitement: 'AUCUN traitement curatif. Prevention : biosecurite stricte, quarantaine, varietes resistantes. Signaler tout cas suspect au CNRA.', urgence: 'haute' }
  ];

  // ─── ZONES PLANTAIN CI ───
  var ZONES_CI = [
    'San Pedro', 'Soubre', 'Man', 'Daloa', 'Gagnoa', 'Divo',
    'Agboville', 'Adzope', 'Abengourou', 'Aboisso', 'Tiassale',
    'Lakota', 'Sassandra', 'Duekoue', 'Guiglo', 'Issia',
    'Yamoussoukro', 'Bouafle', 'Sinfra', 'Oume'
  ];

  // ─── CALENDRIER CULTURAL ───
  var CALENDRIER = [
    { periode: 'Jan-Fev', activite: 'Recolte haute saison', detail: 'Prix eleves. Recolter au stade 3/4 plein pour meilleure conservation.', type: 'recolte' },
    { periode: 'Mar-Avr', activite: 'Preparation terrain', detail: 'Debut grande saison des pluies. Preparer les parcelles, nettoyer, amender.', type: 'preparation' },
    { periode: 'Mai-Jun', activite: 'Plantation principale', detail: 'Planter les rejets baionnette a 3m x 2m (1666 plants/ha). Paillage epais.', type: 'plantation' },
    { periode: 'Jul-Aou', activite: 'Entretien & croissance', detail: 'Sarclage, oeilletonnage (garder 1 rejet/pied), surveillance Sigatoka.', type: 'entretien' },
    { periode: 'Sep-Oct', activite: 'Petite saison seche', detail: 'Contre-saison possible en zone irriguee. Fertilisation potassique.', type: 'entretien' },
    { periode: 'Nov-Dec', activite: 'Debut recolte', detail: 'Premiers regimes a 9-11 mois. Recolter avant chute naturelle.', type: 'recolte' }
  ];

  // ─── INIT ───
  AP.plantainInit = function() {
    if (initialized) return;
    initialized = true;
    var data = loadData();
    renderDashboard(data);
    renderTabs();
  };

  // ─── TAB NAVIGATION ───
  function renderTabs() {
    document.querySelectorAll('.plantain-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        var target = this.dataset.tab;
        document.querySelectorAll('.plantain-tab').forEach(function(t) { t.classList.remove('active'); t.style.background = 'transparent'; t.style.color = '#666'; });
        this.classList.add('active');
        this.style.background = '#fff';
        this.style.color = '#5B3A1A';
        document.querySelectorAll('.plantain-section').forEach(function(s) { s.style.display = 'none'; });
        var section = document.getElementById('plantain-' + target);
        if (section) section.style.display = 'block';
        var data = loadData();
        if (target === 'dashboard') renderDashboard(data);
        if (target === 'journal') renderJournal(data);
        if (target === 'marche') renderMarche(data);
        if (target === 'dossier') renderDossier(data);
      });
    });
  }

  // ─── SCORE CALCULATORS ───
  function calcScoreExploitation(data) {
    var score = 0;
    if (data.parcelles.length > 0) score += 20;
    if (data.journalRecolte.length >= 10) score += 25;
    else if (data.journalRecolte.length >= 5) score += 15;
    else if (data.journalRecolte.length > 0) score += 5;
    var hasGps = data.parcelles.some(function(p) { return p.lat && p.lng; });
    if (hasGps) score += 15;
    var hasVariete = data.parcelles.some(function(p) { return p.variete && VARIETES[p.variete]; });
    if (hasVariete) score += 10;
    if (data.journalRecolte.length >= 20) score += 15;
    if (data.journalVente.length >= 5) score += 15;
    return Math.min(100, score);
  }

  function calcScoreCredit(data) {
    var score = 0;
    if (data.parcelles.length > 0) score += 15;
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    if (totalSurface >= 3) score += 20;
    else if (totalSurface >= 1) score += 10;
    if (data.journalRecolte.length >= 20) score += 25;
    if (data.journalVente.length >= 10) score += 20;
    var hasGps = data.parcelles.some(function(p) { return p.lat && p.lng; });
    if (hasGps) score += 10;
    var hasVariete = data.parcelles.some(function(p) { return p.variete; });
    if (hasVariete) score += 10;
    return Math.min(100, score);
  }

  function calcScoreQualite(data) {
    var score = 0;
    if (data.parcelles.length === 0) return 0;
    // Variete resistante
    var hasResistant = data.parcelles.some(function(p) { return p.variete === 'FHIA-21' || p.variete === 'PITA-3'; });
    if (hasResistant) score += 25;
    // GPS
    var hasGps = data.parcelles.some(function(p) { return p.lat && p.lng; });
    if (hasGps) score += 15;
    // Regular harvest tracking
    if (data.journalRecolte.length >= 10) score += 25;
    else if (data.journalRecolte.length >= 3) score += 10;
    // Sale tracking
    if (data.journalVente.length >= 5) score += 20;
    // Surface documented
    var hasSurface = data.parcelles.some(function(p) { return p.surface > 0; });
    if (hasSurface) score += 15;
    return Math.min(100, score);
  }

  function scoreColor(score) {
    if (score >= 70) return '#5B3A1A';
    if (score >= 40) return '#E8862A';
    return '#D32F2F';
  }

  function scoreLabel(score) {
    if (score >= 70) return 'Bon';
    if (score >= 40) return 'A ameliorer';
    return 'Insuffisant';
  }

  // ─── DASHBOARD RENDER ───
  function renderDashboard(data) {
    var se = calcScoreExploitation(data);
    var sc = calcScoreCredit(data);
    var sq = calcScoreQualite(data);
    data.scores = { exploitation: se, credit: sc, qualite: sq };
    saveData(data);

    var el = document.getElementById('plantain-dashboard');
    if (!el) return;

    var nbParcelles = data.parcelles.length;
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var derniereRecolte = data.journalRecolte.length > 0 ? data.journalRecolte[data.journalRecolte.length - 1] : null;
    var prixActuel = PRIX_PLANTAIN[PRIX_PLANTAIN.length - 1];

    // Alertes
    var alertes = [];
    if (nbParcelles === 0) alertes.push({ type: 'warning', text: 'Aucune parcelle enregistree. Ajoutez votre premiere parcelle pour commencer.' });
    if (data.journalRecolte.length === 0 && nbParcelles > 0) alertes.push({ type: 'info', text: 'Commencez a enregistrer vos recoltes pour ameliorer votre Score Exploitation.' });
    // Seasonal alert
    var moisActuel = new Date().getMonth();
    if (moisActuel >= 3 && moisActuel <= 5) alertes.push({ type: 'info', text: 'Saison basse : les prix sont au plus bas. Privilegiez la transformation (chips, farine) ou le stockage.' });
    if (moisActuel >= 4 && moisActuel <= 5) alertes.push({ type: 'info', text: 'Periode de plantation ideale — profitez du debut de saison des pluies.' });
    // Sigatoka alert
    if (moisActuel >= 5 && moisActuel <= 9) alertes.push({ type: 'danger', text: 'Haute pression Sigatoka noire (saison humide). Intensifiez la surveillance foliaire et l\'effeuillage sanitaire.' });
    // Pertes post-recolte warning
    if (data.journalRecolte.length >= 3 && data.journalVente.length === 0) {
      alertes.push({ type: 'warning', text: 'Vous enregistrez des recoltes mais aucune vente. Les pertes post-recolte atteignent 30-40% sans commercialisation rapide.' });
    }

    el.innerHTML =
      // Scores
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">' +
        scoreCard('Exploitation', se) +
        scoreCard('Credit', sc) +
        scoreCard('Qualite', sq) +
      '</div>' +

      // Alertes
      (alertes.length > 0 ?
        '<div style="margin-bottom:16px;">' + alertes.map(function(a) {
          var bg = a.type === 'danger' ? '#FFEBEE' : a.type === 'warning' ? '#FFF8E1' : '#FFF3E0';
          var border = a.type === 'danger' ? '#D32F2F' : a.type === 'warning' ? '#F9A825' : '#E8862A';
          return '<div style="padding:12px;background:' + bg + ';border-left:4px solid ' + border + ';border-radius:8px;font-size:12px;color:#333;margin-bottom:8px;">' + a.text + '</div>';
        }).join('') + '</div>' : '') +

      // Resume
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Resume exploitation</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          statBox('Parcelles', nbParcelles) +
          statBox('Surface', totalSurface.toFixed(1) + ' ha') +
          statBox('Recoltes', data.journalRecolte.length + ' entrees') +
          statBox('Prix bord champ', prixActuel.bordChamp + ' FCFA/kg') +
        '</div>' +
      '</div>' +

      // Calendrier cultural
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:12px;">Calendrier cultural</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px;">' +
          CALENDRIER.map(function(c) {
            var bg = c.type === 'recolte' ? '#FFF3E0' : c.type === 'plantation' ? '#E8F5E9' : '#F3E5F5';
            var border = c.type === 'recolte' ? '#E8862A' : c.type === 'plantation' ? '#2D6A4F' : '#7B1FA2';
            return '<div style="flex:1;min-width:140px;padding:10px;background:' + bg + ';border-left:3px solid ' + border + ';border-radius:8px;">' +
              '<div style="font-size:11px;font-weight:700;color:' + border + ';">' + c.periode + '</div>' +
              '<div style="font-size:11px;font-weight:600;margin:2px 0;">' + c.activite + '</div>' +
              '<div style="font-size:10px;color:#666;">' + c.detail + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' +

      // Prochaine action
      '<div class="card" style="padding:16px;border-radius:14px;background:linear-gradient(135deg,#FFF8F0,#FFF3E0);">' +
        '<div style="font-size:14px;font-weight:700;margin-bottom:8px;">Prochaine action recommandee</div>' +
        '<div style="font-size:13px;color:#555;">' + getNextAction(data) + '</div>' +
      '</div>';
  }

  function scoreCard(label, score) {
    return '<div style="background:#fff;border-radius:12px;padding:14px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">' +
      '<div style="font-size:28px;font-weight:900;color:' + scoreColor(score) + ';">' + score + '</div>' +
      '<div style="font-size:10px;font-weight:600;color:#999;text-transform:uppercase;margin-top:2px;">' + label + '</div>' +
      '<div style="font-size:10px;color:' + scoreColor(score) + ';font-weight:600;">' + scoreLabel(score) + '</div>' +
    '</div>';
  }

  function statBox(label, value) {
    return '<div style="background:#f8f9fa;border-radius:10px;padding:10px;text-align:center;">' +
      '<div style="font-size:16px;font-weight:800;color:#5B3A1A;">' + value + '</div>' +
      '<div style="font-size:10px;color:#999;">' + label + '</div>' +
    '</div>';
  }

  function getNextAction(data) {
    if (data.parcelles.length === 0) return 'Ajoutez votre premiere parcelle dans l\'onglet <b>Journal</b> pour demarrer.';
    if (!data.parcelles.some(function(p) { return p.lat; })) return 'Geolocalisez vos parcelles avec le bouton GPS pour ameliorer votre dossier.';
    if (data.journalRecolte.length === 0) return 'Enregistrez votre premiere recolte dans l\'onglet <b>Journal</b>.';
    if (data.journalVente.length === 0) return 'Enregistrez votre premiere vente dans l\'onglet <b>Marche</b> pour suivre vos revenus.';
    if (data.scores.credit < 50) return 'Continuez a enregistrer recoltes et ventes pour ameliorer votre Score Dossier.';
    return 'Votre exploitation est bien suivie. Consultez l\'onglet <b>Mon Dossier</b> pour generer un dossier de credit.';
  }

  // ─── JOURNAL SECTION ───
  function renderJournal(data) {
    var el = document.getElementById('plantain-journal');
    if (!el) return;

    el.innerHTML =
      // Parcelles
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Mes parcelles (' + data.parcelles.length + ')</div>' +
        (data.parcelles.length > 0 ?
          data.parcelles.map(function(p, i) {
            return '<div style="padding:10px;background:#f8f9fa;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">' +
              '<div>' +
                '<div style="font-size:13px;font-weight:700;">' + (p.nom || 'Parcelle ' + (i+1)) + '</div>' +
                '<div style="font-size:11px;color:#666;">' + (p.variete || '?') + ' — ' + (p.surface || '?') + ' ha — ' + (p.zone || '?') + '</div>' +
                '<div style="font-size:10px;color:#999;">' + (p.lat ? 'GPS: ' + p.lat.toFixed(4) + ', ' + p.lng.toFixed(4) : 'Pas de GPS') + '</div>' +
              '</div>' +
              '<div style="display:flex;gap:6px;">' +
                '<button onclick="AgroPrix.plantainGeolocParcelle(' + i + ')" style="padding:6px 10px;background:#FFF3E0;border:none;border-radius:8px;font-size:11px;cursor:pointer;" title="Geolocaliser">📍</button>' +
                '<button onclick="AgroPrix.plantainDeleteParcelle(' + i + ')" style="padding:6px 10px;background:#FFEBEE;border:none;border-radius:8px;font-size:11px;cursor:pointer;" title="Supprimer">✕</button>' +
              '</div>' +
            '</div>';
          }).join('') : '<p style="font-size:12px;color:#999;text-align:center;padding:12px;">Aucune parcelle enregistree</p>') +
        '<button onclick="AgroPrix.plantainShowAddParcelle()" style="width:100%;margin-top:8px;padding:12px;background:linear-gradient(135deg,#5B3A1A,#8B6914);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">+ Ajouter une parcelle</button>' +
        '<div id="plantain-add-parcelle" style="display:none;margin-top:12px;padding:14px;background:#FFF8F0;border-radius:12px;"></div>' +
      '</div>' +

      // Journal recolte
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Journal de recolte</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Parcelle</label>' +
          '<select id="plantain-recolte-parcelle" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;">' +
            (data.parcelles.length > 0 ? data.parcelles.map(function(p, i) { return '<option value="' + i + '">' + (p.nom || 'Parcelle ' + (i+1)) + '</option>'; }).join('') : '<option>Aucune parcelle</option>') +
          '</select></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Nb regimes</label>' +
          '<input type="number" id="plantain-recolte-regimes" placeholder="Ex: 15" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Poids total (kg)</label>' +
          '<input type="number" id="plantain-recolte-poids" placeholder="Ex: 300" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Observations</label>' +
          '<select id="plantain-recolte-obs" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;">' +
            '<option value="">Normal</option><option value="sigatoka">Sigatoka visible</option><option value="charancon">Charancon detecte</option><option value="chute">Chute de plants</option><option value="maturite">Sur-maturite (pertes)</option>' +
          '</select></div>' +
        '</div>' +
        '<button onclick="AgroPrix.plantainAddRecolte()" style="width:100%;padding:12px;background:linear-gradient(135deg,#5B3A1A,#8B6914);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Enregistrer la recolte</button>' +

        // Historique
        (data.journalRecolte.length > 0 ?
          '<div style="margin-top:14px;max-height:200px;overflow-y:auto;">' +
          data.journalRecolte.slice().reverse().slice(0, 10).map(function(e) {
            var obsColor = e.observation === 'sigatoka' ? '#D32F2F' : e.observation === 'charancon' ? '#E8862A' : '#666';
            return '<div style="padding:8px;border-bottom:1px solid #f0f0f0;font-size:12px;display:flex;justify-content:space-between;">' +
              '<span>' + e.date + ' — ' + (e.parcelle || '?') + '</span>' +
              '<span style="font-weight:700;">' + e.regimes + ' reg. / ' + e.poids + ' kg</span>' +
              '<span style="color:' + obsColor + ';">' + (e.observation || 'OK') + '</span>' +
            '</div>';
          }).join('') +
          '</div>' : '') +
      '</div>' +

      // Maladies
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Guide maladies & ravageurs</div>' +
        MALADIES.map(function(m) {
          var bg = m.urgence === 'haute' ? '#FFF3F0' : m.urgence === 'moyenne' ? '#FFF8E1' : '#F8F9FA';
          var border = m.urgence === 'haute' ? '#D32F2F' : m.urgence === 'moyenne' ? '#E8862A' : '#ddd';
          return '<div style="padding:12px;background:' + bg + ';border-left:3px solid ' + border + ';border-radius:8px;margin-bottom:8px;">' +
            '<div style="font-size:13px;font-weight:700;">' + m.nom + '</div>' +
            '<div style="font-size:11px;color:#666;margin:4px 0;">Agent : ' + m.agent + '</div>' +
            '<div style="font-size:11px;">Symptomes : ' + m.symptomes + '</div>' +
            '<div style="font-size:11px;color:#5B3A1A;margin-top:4px;font-weight:600;">Traitement : ' + m.traitement + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      // Simulateur transformation
      '<div class="card" style="padding:16px;border-radius:14px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Simulateur marge transformation</div>' +
        '<p style="font-size:11px;color:#666;margin-bottom:10px;">Comparez la marge brut vs frais et transformation (chips, farine).</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Quantite (kg)</label>' +
          '<input type="number" id="plantain-transfo-qty" placeholder="100" min="1" value="100" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Prix achat bord champ</label>' +
          '<input type="number" id="plantain-transfo-prix" placeholder="150" min="0" value="' + PRIX_PLANTAIN[PRIX_PLANTAIN.length-1].bordChamp + '" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
        '</div>' +
        '<button onclick="AgroPrix.plantainSimulerTransfo()" style="width:100%;padding:12px;background:linear-gradient(135deg,#E8862A,#F5A623);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Simuler la marge</button>' +
        '<div id="plantain-transfo-results" style="margin-top:10px;"></div>' +
      '</div>';
  }

  // ─── MARCHE SECTION ───
  function renderMarche(data) {
    var el = document.getElementById('plantain-marche');
    if (!el) return;

    var prixActuel = PRIX_PLANTAIN[PRIX_PLANTAIN.length - 1];
    var prixPrec = PRIX_PLANTAIN[PRIX_PLANTAIN.length - 2];
    var variation = prixActuel.bordChamp - prixPrec.bordChamp;
    var arrow = variation >= 0 ? '▲' : '▼';

    el.innerHTML =
      // Prix actuel
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;background:linear-gradient(135deg,#5B3A1A,#8B6914);color:#fff;">' +
        '<div style="font-size:12px;opacity:0.8;margin-bottom:4px;">Prix plantain — ' + prixActuel.mois + ' (' + prixActuel.saison + ')</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-end;">' +
          '<div>' +
            '<div style="font-size:11px;opacity:0.7;">Bord champ</div>' +
            '<div style="font-size:32px;font-weight:900;">' + prixActuel.bordChamp + ' <span style="font-size:14px;font-weight:500;">FCFA/kg</span></div>' +
          '</div>' +
          '<div style="text-align:right;">' +
            '<div style="font-size:11px;opacity:0.7;">Detail</div>' +
            '<div style="font-size:22px;font-weight:800;">' + prixActuel.detail + ' <span style="font-size:12px;">FCFA/kg</span></div>' +
          '</div>' +
        '</div>' +
        '<div style="font-size:13px;margin-top:8px;">' +
          '<span style="color:' + (variation >= 0 ? '#FFD54F' : '#FCA5A5') + ';font-weight:700;">' + arrow + ' ' + Math.abs(variation) + ' FCFA</span> vs mois precedent' +
        '</div>' +
      '</div>' +

      // Historique prix
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Historique prix plantain</div>' +
        '<div style="display:flex;align-items:flex-end;height:120px;gap:4px;padding:0 4px;">' +
          PRIX_PLANTAIN.map(function(p) {
            var minP = 50, maxP = 250;
            var h = Math.max(10, ((p.bordChamp - minP) / (maxP - minP)) * 100);
            var isLast = p === prixActuel;
            var barColor = p.saison === 'haute' ? '#E8862A' : p.saison === 'basse' ? '#FFCC80' : '#FFE0B2';
            if (isLast) barColor = '#5B3A1A';
            return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">' +
              '<div style="font-size:9px;font-weight:700;color:' + (isLast ? '#5B3A1A' : '#999') + ';margin-bottom:2px;">' + p.bordChamp + '</div>' +
              '<div style="width:100%;height:' + h + 'px;background:' + barColor + ';border-radius:4px 4px 0 0;"></div>' +
              '<div style="font-size:8px;color:#999;margin-top:3px;">' + p.mois.slice(5) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;gap:12px;margin-top:8px;font-size:10px;justify-content:center;">' +
          '<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#E8862A;border-radius:2px;"></span> Haute saison</span>' +
          '<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#FFE0B2;border-radius:2px;"></span> Transition</span>' +
          '<span style="display:flex;align-items:center;gap:3px;"><span style="width:10px;height:10px;background:#FFCC80;border-radius:2px;"></span> Basse saison</span>' +
        '</div>' +
      '</div>' +

      // Journal vente
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Journal de vente</div>' +
        '<p style="font-size:11px;color:#999;margin-bottom:10px;">Enregistrez chaque vente pour suivre vos revenus et comparer les prix obtenus.</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Quantite (kg)</label>' +
          '<input type="number" id="plantain-vente-qty" placeholder="300" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Prix obtenu (FCFA/kg)</label>' +
          '<input type="number" id="plantain-vente-prix" placeholder="' + prixActuel.bordChamp + '" min="0" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
          '<div><label style="font-size:11px;font-weight:600;">Acheteur</label>' +
          '<input type="text" id="plantain-vente-acheteur" placeholder="Nom acheteur" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;"></div>' +
          '<div><label style="font-size:11px;font-weight:600;">Lieu de vente</label>' +
          '<select id="plantain-vente-lieu" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;">' +
            '<option value="bord_champ">Bord champ</option><option value="marche_local">Marche local</option><option value="marche_gros">Marche de gros</option><option value="abidjan">Abidjan</option><option value="transformateur">Transformateur</option>' +
          '</select></div>' +
        '</div>' +
        '<button onclick="AgroPrix.plantainAddVente()" style="width:100%;padding:12px;background:linear-gradient(135deg,#5B3A1A,#8B6914);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Enregistrer la vente</button>' +

        // Historique ventes
        (data.journalVente.length > 0 ?
          '<div style="margin-top:14px;">' +
          data.journalVente.slice().reverse().slice(0, 10).map(function(v) {
            var refPrix = PRIX_PLANTAIN[PRIX_PLANTAIN.length - 1].bordChamp;
            var ecart = v.prix - refPrix;
            return '<div style="padding:10px;background:#f8f9fa;border-radius:8px;margin-bottom:6px;font-size:12px;">' +
              '<div style="display:flex;justify-content:space-between;">' +
                '<span style="font-weight:700;">' + v.date + ' — ' + (v.acheteur || '?') + '</span>' +
                '<span style="font-weight:700;">' + v.prix + ' FCFA/kg</span>' +
              '</div>' +
              '<div style="display:flex;justify-content:space-between;color:#666;margin-top:2px;">' +
                '<span>' + v.qty + ' kg — ' + (v.lieu || '?') + '</span>' +
                '<span style="font-weight:700;color:' + (ecart >= 0 ? '#2D6A4F' : '#D32F2F') + ';">' + (ecart >= 0 ? '+' : '') + ecart + ' vs ref.</span>' +
              '</div>' +
              '<div style="font-size:11px;color:#5B3A1A;font-weight:600;">Revenu : ' + (v.qty * v.prix).toLocaleString('fr-FR') + ' FCFA</div>' +
            '</div>';
          }).join('') +
          '</div>' : '') +
      '</div>' +

      // Stats acheteurs
      '<div class="card" style="padding:16px;border-radius:14px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Comparateur acheteurs</div>' +
        (getAcheteurStats(data).length > 0 ?
          '<table style="width:100%;font-size:11px;border-collapse:collapse;">' +
            '<tr style="background:#FFF3E0;"><th style="padding:8px;text-align:left;">Acheteur</th><th>Nb ventes</th><th>Prix moy.</th><th>Revenu total</th></tr>' +
            getAcheteurStats(data).map(function(a) {
              return '<tr style="border-bottom:1px solid #f0f0f0;"><td style="padding:8px;font-weight:600;">' + a.nom + '</td><td style="text-align:center;">' + a.count + '</td><td style="text-align:center;">' + a.prixMoyen + ' FCFA</td><td style="text-align:center;font-weight:700;">' + a.revenuTotal.toLocaleString('fr-FR') + ' FCFA</td></tr>';
            }).join('') +
          '</table>'
        : '<p style="font-size:12px;color:#999;text-align:center;">Enregistrez des ventes pour voir les statistiques par acheteur.</p>') +
      '</div>';
  }

  function getAcheteurStats(data) {
    var map = {};
    data.journalVente.forEach(function(v) {
      if (!v.acheteur) return;
      if (!map[v.acheteur]) map[v.acheteur] = { nom: v.acheteur, totalPrix: 0, count: 0, revenuTotal: 0 };
      map[v.acheteur].totalPrix += v.prix;
      map[v.acheteur].count++;
      map[v.acheteur].revenuTotal += v.qty * v.prix;
    });
    return Object.values(map).map(function(a) {
      a.prixMoyen = Math.round(a.totalPrix / a.count);
      return a;
    }).sort(function(a, b) { return b.prixMoyen - a.prixMoyen; });
  }

  // ─── MON DOSSIER SECTION ───
  function renderDossier(data) {
    var el = document.getElementById('plantain-dossier');
    if (!el) return;

    var se = calcScoreExploitation(data);
    var sc = calcScoreCredit(data);
    var sq = calcScoreQualite(data);
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var nbRecoltes = data.journalRecolte.length;
    var nbVentes = data.journalVente.length;

    // Completude dossier
    var completude = 0;
    var pieces = [];
    if (data.parcelles.length > 0) { completude += 15; pieces.push({ nom: 'Fiche exploitation', ok: true }); } else { pieces.push({ nom: 'Fiche exploitation', ok: false, action: 'Ajoutez une parcelle' }); }
    if (data.parcelles.some(function(p) { return p.lat; })) { completude += 15; pieces.push({ nom: 'Geolocalisation GPS', ok: true }); } else { pieces.push({ nom: 'Geolocalisation GPS', ok: false, action: 'Geolocalisez une parcelle' }); }
    if (data.parcelles.some(function(p) { return p.variete; })) { completude += 10; pieces.push({ nom: 'Information varietes', ok: true }); } else { pieces.push({ nom: 'Information varietes', ok: false, action: 'Indiquez la variete de vos parcelles' }); }
    if (nbRecoltes >= 10) { completude += 20; pieces.push({ nom: 'Historique production (10+ entrees)', ok: true }); } else { pieces.push({ nom: 'Historique production (' + nbRecoltes + '/10 entrees)', ok: false, action: 'Enregistrez vos recoltes' }); }
    if (nbVentes >= 5) { completude += 20; pieces.push({ nom: 'Historique vente (5+ ventes)', ok: true }); } else { pieces.push({ nom: 'Historique vente (' + nbVentes + '/5 ventes)', ok: false, action: 'Enregistrez vos ventes' }); }
    if (sq >= 60) { completude += 20; pieces.push({ nom: 'Score qualite suffisant', ok: true }); } else { pieces.push({ nom: 'Score qualite (' + sq + '/60 min)', ok: false, action: 'Ameliorez votre suivi' }); }

    el.innerHTML =
      // Scores detailles
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:12px;">Mes scores</div>' +
        scoreBar('Score Exploitation', se) +
        scoreBar('Score Dossier', sc) +
        scoreBar('Score Qualite', sq) +
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
              '<div style="font-size:12px;font-weight:600;color:' + (p.ok ? '#5B3A1A' : '#999') + ';">' + p.nom + '</div>' +
              (p.action ? '<div style="font-size:10px;color:#E8862A;">' + p.action + '</div>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
        '<button onclick="AgroPrix.plantainExportDossier()" style="width:100%;margin-top:14px;padding:12px;background:linear-gradient(135deg,#5B3A1A,#8B6914);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;" ' + (completude < 40 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : '') + '>Generer mon dossier PDF</button>' +
      '</div>' +

      // Estimation revenus
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">Estimation revenus annuels</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:12px;">Base: rendement moyen variete x surface x prix moyen</div>' +
        (totalSurface > 0 ?
          (function() {
            var rendMoyen = 12; // t/ha moyenne
            var prixMoyen = 150; // FCFA/kg moyenne annuelle
            var revenuBrut = totalSurface * rendMoyen * 1000 * prixMoyen;
            var couts = totalSurface * 800000; // ~800K FCFA/ha pour rejets
            var margeBrute = revenuBrut - couts;
            return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
              '<div style="background:#FFF3E0;border-radius:10px;padding:12px;text-align:center;">' +
                '<div style="font-size:10px;color:#999;">Revenu brut estime</div>' +
                '<div style="font-size:18px;font-weight:800;color:#5B3A1A;">' + revenuBrut.toLocaleString('fr-FR') + '</div>' +
                '<div style="font-size:10px;color:#999;">FCFA/an</div>' +
              '</div>' +
              '<div style="background:#E8F5E9;border-radius:10px;padding:12px;text-align:center;">' +
                '<div style="font-size:10px;color:#999;">Marge brute estimee</div>' +
                '<div style="font-size:18px;font-weight:800;color:' + (margeBrute > 0 ? '#2D6A4F' : '#D32F2F') + ';">' + margeBrute.toLocaleString('fr-FR') + '</div>' +
                '<div style="font-size:10px;color:#999;">FCFA/an</div>' +
              '</div>' +
            '</div>';
          })()
        : '<p style="font-size:12px;color:#999;text-align:center;">Ajoutez des parcelles pour voir l\'estimation.</p>') +
      '</div>' +

      // Assurance
      '<div class="card" style="padding:16px;border-radius:14px;margin-bottom:12px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">Assurance agricole</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:12px;">Estimation indicative — Produits micro-assurance CI</div>' +
        (totalSurface > 0 ?
          '<div style="background:#f8f9fa;border-radius:10px;padding:12px;margin-bottom:10px;">' +
            '<div style="font-size:12px;color:#999;">Prime estimee annuelle</div>' +
            '<div style="font-size:22px;font-weight:800;color:#5B3A1A;">' + Math.round(totalSurface * 20000) + ' FCFA</div>' +
            '<div style="font-size:10px;color:#666;">Base: 20 000 FCFA/ha/an — ' + totalSurface.toFixed(1) + ' ha</div>' +
          '</div>' : '') +
        '<button onclick="AgroPrix.plantainContactAssurance()" style="width:100%;padding:12px;background:linear-gradient(135deg,#E8862A,#F5A623);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Etre contacte par un assureur</button>' +
      '</div>' +

      // Annuaire
      '<div class="card" style="padding:16px;border-radius:14px;">' +
        '<div style="font-size:15px;font-weight:700;margin-bottom:4px;">Annuaire techniciens & transformateurs</div>' +
        '<div style="font-size:12px;color:#666;margin-bottom:12px;">ANADER, CNRA, transformateurs chips/farine</div>' +
        '<select id="plantain-tech-zone" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:13px;margin-bottom:10px;">' +
          '<option value="">-- Choisir une zone --</option>' +
          ZONES_CI.map(function(z) { return '<option value="' + z + '">' + z + '</option>'; }).join('') +
        '</select>' +
        '<button onclick="AgroPrix.plantainChercherTechniciens()" style="width:100%;padding:12px;background:linear-gradient(135deg,#5B3A1A,#8B6914);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;">Chercher</button>' +
        '<div id="plantain-tech-results"></div>' +
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

  AP.plantainShowAddParcelle = function() {
    var el = document.getElementById('plantain-add-parcelle');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    el.innerHTML =
      '<div style="font-size:13px;font-weight:700;margin-bottom:10px;">Nouvelle parcelle</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
        '<div><label style="font-size:11px;font-weight:600;">Nom</label><input type="text" id="plantain-new-nom" placeholder="Ex: Parcelle Sud" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"></div>' +
        '<div><label style="font-size:11px;font-weight:600;">Surface (ha)</label><input type="number" id="plantain-new-surface" placeholder="2" min="0.1" step="0.1" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
        '<div><label style="font-size:11px;font-weight:600;">Variete</label><select id="plantain-new-variete" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;">' +
          '<option value="">-- Variete --</option>' + Object.keys(VARIETES).map(function(v) { return '<option value="' + v + '">' + v + ' (' + VARIETES[v].rendement[0] + '-' + VARIETES[v].rendement[1] + ' t/ha)</option>'; }).join('') +
        '</select></div>' +
        '<div><label style="font-size:11px;font-weight:600;">Zone</label><select id="plantain-new-zone" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;">' +
          '<option value="">-- Zone --</option>' + ZONES_CI.map(function(z) { return '<option value="' + z + '">' + z + '</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">' +
        '<div><label style="font-size:11px;font-weight:600;">Date plantation</label><input type="date" id="plantain-new-date" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"></div>' +
        '<div><label style="font-size:11px;font-weight:600;">Type</label><select id="plantain-new-type" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:12px;"><option value="rejets">Culture de rejets</option><option value="neuf">Nouvelle plantation</option></select></div>' +
      '</div>' +
      '<button onclick="AgroPrix.plantainSaveParcelle()" style="width:100%;padding:10px;background:#5B3A1A;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">Enregistrer la parcelle</button>';
  };

  AP.plantainSaveParcelle = function() {
    var data = loadData();
    var parcelle = {
      nom: (document.getElementById('plantain-new-nom') || {}).value || 'Parcelle ' + (data.parcelles.length + 1),
      surface: parseFloat((document.getElementById('plantain-new-surface') || {}).value) || 0,
      variete: (document.getElementById('plantain-new-variete') || {}).value || '',
      zone: (document.getElementById('plantain-new-zone') || {}).value || '',
      datePlantation: (document.getElementById('plantain-new-date') || {}).value || '',
      type: (document.getElementById('plantain-new-type') || {}).value || 'rejets',
      lat: null, lng: null,
      dateAjout: new Date().toISOString().slice(0, 10)
    };
    data.parcelles.push(parcelle);
    saveData(data);
    renderJournal(data);
    renderDashboard(data);
  };

  AP.plantainGeolocParcelle = function(index) {
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

  AP.plantainDeleteParcelle = function(index) {
    if (!confirm('Supprimer cette parcelle ?')) return;
    var data = loadData();
    data.parcelles.splice(index, 1);
    saveData(data);
    renderJournal(data);
    renderDashboard(data);
  };

  AP.plantainAddRecolte = function() {
    var data = loadData();
    var parcelleIdx = parseInt((document.getElementById('plantain-recolte-parcelle') || {}).value) || 0;
    var regimes = parseInt((document.getElementById('plantain-recolte-regimes') || {}).value);
    var poids = parseFloat((document.getElementById('plantain-recolte-poids') || {}).value);
    if (!regimes || regimes <= 0) { alert('Entrez le nombre de regimes.'); return; }
    var entry = {
      date: new Date().toISOString().slice(0, 10),
      parcelle: data.parcelles[parcelleIdx] ? data.parcelles[parcelleIdx].nom : 'Parcelle ' + (parcelleIdx + 1),
      regimes: regimes,
      poids: poids || Math.round(regimes * 18),
      observation: (document.getElementById('plantain-recolte-obs') || {}).value || ''
    };
    data.journalRecolte.push(entry);
    saveData(data);
    var el1 = document.getElementById('plantain-recolte-regimes'); if (el1) el1.value = '';
    var el2 = document.getElementById('plantain-recolte-poids'); if (el2) el2.value = '';
    renderJournal(data);
    renderDashboard(data);
  };

  AP.plantainAddVente = function() {
    var data = loadData();
    var qty = parseFloat((document.getElementById('plantain-vente-qty') || {}).value);
    var prix = parseFloat((document.getElementById('plantain-vente-prix') || {}).value);
    if (!qty || !prix) { alert('Remplissez quantite et prix.'); return; }
    var entry = {
      date: new Date().toISOString().slice(0, 10),
      qty: qty,
      prix: prix,
      acheteur: (document.getElementById('plantain-vente-acheteur') || {}).value || 'Inconnu',
      lieu: (document.getElementById('plantain-vente-lieu') || {}).value || 'bord_champ'
    };
    data.journalVente.push(entry);
    saveData(data);
    var el1 = document.getElementById('plantain-vente-qty'); if (el1) el1.value = '';
    var el2 = document.getElementById('plantain-vente-prix'); if (el2) el2.value = '';
    var el3 = document.getElementById('plantain-vente-acheteur'); if (el3) el3.value = '';
    renderMarche(data);
    renderDashboard(data);
  };

  AP.plantainSimulerTransfo = function() {
    var qty = parseFloat((document.getElementById('plantain-transfo-qty') || {}).value) || 100;
    var prixAchat = parseFloat((document.getElementById('plantain-transfo-prix') || {}).value) || 150;
    var el = document.getElementById('plantain-transfo-results');
    if (!el) return;

    var coutAchat = qty * prixAchat;
    // Vente frais
    var prixDetailFresc = PRIX_PLANTAIN[PRIX_PLANTAIN.length-1].detail;
    var revenFrais = qty * prixDetailFresc;
    var margeFrais = revenFrais - coutAchat;
    // Chips (rendement 30% du poids frais, prix 2500-4000 FCFA/kg chips)
    var qtyChips = qty * 0.30;
    var prixChips = 3000;
    var coutTransfoChips = qty * 80; // 80 FCFA/kg frais (huile, emballage, energie)
    var revenChips = qtyChips * prixChips;
    var margeChips = revenChips - coutAchat - coutTransfoChips;
    // Farine (rendement 35%, prix 1500-2000 FCFA/kg)
    var qtyFarine = qty * 0.35;
    var prixFarine = 1800;
    var coutTransfoFarine = qty * 50;
    var revenFarine = qtyFarine * prixFarine;
    var margeFarine = revenFarine - coutAchat - coutTransfoFarine;

    el.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:10px;">' +
        '<div style="padding:12px;background:#FFF3E0;border-radius:10px;text-align:center;">' +
          '<div style="font-size:11px;font-weight:700;color:#E8862A;">Frais (detail)</div>' +
          '<div style="font-size:14px;font-weight:800;color:' + (margeFrais > 0 ? '#2D6A4F' : '#D32F2F') + ';margin:4px 0;">' + margeFrais.toLocaleString('fr-FR') + '</div>' +
          '<div style="font-size:9px;color:#666;">FCFA marge</div>' +
          '<div style="font-size:9px;color:#999;">' + qty + 'kg → ' + prixDetailFresc + ' FCFA/kg</div>' +
        '</div>' +
        '<div style="padding:12px;background:#E8F5E9;border-radius:10px;text-align:center;">' +
          '<div style="font-size:11px;font-weight:700;color:#2D6A4F;">Chips</div>' +
          '<div style="font-size:14px;font-weight:800;color:' + (margeChips > 0 ? '#2D6A4F' : '#D32F2F') + ';margin:4px 0;">' + margeChips.toLocaleString('fr-FR') + '</div>' +
          '<div style="font-size:9px;color:#666;">FCFA marge</div>' +
          '<div style="font-size:9px;color:#999;">' + qtyChips.toFixed(0) + 'kg → ' + prixChips + ' FCFA/kg</div>' +
        '</div>' +
        '<div style="padding:12px;background:#F3E5F5;border-radius:10px;text-align:center;">' +
          '<div style="font-size:11px;font-weight:700;color:#7B1FA2;">Farine</div>' +
          '<div style="font-size:14px;font-weight:800;color:' + (margeFarine > 0 ? '#2D6A4F' : '#D32F2F') + ';margin:4px 0;">' + margeFarine.toLocaleString('fr-FR') + '</div>' +
          '<div style="font-size:9px;color:#666;">FCFA marge</div>' +
          '<div style="font-size:9px;color:#999;">' + qtyFarine.toFixed(0) + 'kg → ' + prixFarine + ' FCFA/kg</div>' +
        '</div>' +
      '</div>';
  };

  AP.plantainExportDossier = function() {
    var data = loadData();
    var sc = calcScoreCredit(data);
    var sq = calcScoreQualite(data);
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var totalProd = data.journalRecolte.reduce(function(s, e) { return s + (e.poids || 0); }, 0);
    var totalRevenu = data.journalVente.reduce(function(s, v) { return s + (v.qty * v.prix); }, 0);

    var text = '=== DOSSIER DE CREDIT — PLANTAIN PRO ===\n' +
      'Genere par AgroPrix le ' + new Date().toISOString().slice(0, 10) + '\n\n' +
      '--- FICHE EXPLOITATION ---\n' +
      'Nombre de parcelles: ' + data.parcelles.length + '\n' +
      'Surface totale: ' + totalSurface.toFixed(1) + ' ha\n' +
      'Varietes: ' + data.parcelles.map(function(p) { return p.variete || 'Non renseigne'; }).join(', ') + '\n' +
      'Zones: ' + data.parcelles.map(function(p) { return p.zone || 'Non renseignee'; }).join(', ') + '\n\n' +
      '--- SCORES ---\n' +
      'Score Dossier: ' + sc + '/100\n' +
      'Score Qualite: ' + sq + '/100\n\n' +
      '--- HISTORIQUE PRODUCTION ---\n' +
      'Recoltes enregistrees: ' + data.journalRecolte.length + '\n' +
      'Production totale: ' + totalProd.toFixed(1) + ' kg\n\n' +
      '--- HISTORIQUE VENTE ---\n' +
      'Ventes enregistrees: ' + data.journalVente.length + '\n' +
      'Revenu total: ' + totalRevenu.toLocaleString('fr-FR') + ' FCFA\n\n' +
      '--- PARCELLES GEOLOCALISEES ---\n' +
      data.parcelles.map(function(p, i) {
        return (i+1) + '. ' + (p.nom || 'Parcelle') + ' — ' + (p.surface || '?') + 'ha — ' + (p.variete || '?') + ' — GPS: ' + (p.lat ? p.lat.toFixed(5) + ',' + p.lng.toFixed(5) : 'Non geolocalisee');
      }).join('\n') + '\n\n' +
      '=== AgroPrix by 33 Lab — agroprix.app ===';

    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'AgroPrix_Dossier_Credit_Plantain_' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
  };

  AP.plantainContactAssurance = function() {
    var msg = 'Bonjour, je suis producteur de banane plantain et je souhaite obtenir des informations sur l\'assurance agricole. Mon exploitation est enregistree sur AgroPrix.';
    window.open('https://wa.me/22996816868?text=' + encodeURIComponent(msg), '_blank');
  };

  AP.plantainChercherTechniciens = function() {
    var zone = (document.getElementById('plantain-tech-zone') || {}).value;
    var el = document.getElementById('plantain-tech-results');
    if (!el) return;
    if (!zone) { el.innerHTML = '<p style="font-size:12px;color:#E8862A;margin-top:8px;">Selectionnez une zone.</p>'; return; }

    var techs = [
      { nom: 'ANADER — Direction ' + zone, type: 'Conseil', tel: '+225 27 XX XX XX', specialite: 'Conseil technique cultures vivrieres, plantain' },
      { nom: 'CNRA Bimbresso — Antenne ' + zone, type: 'Recherche', tel: '+225 27 XX XX XX', specialite: 'Varietes ameliorees, lutte Sigatoka, rejets certifies' },
      { nom: 'Transformateur chips — ' + zone, type: 'Transformation', tel: '+225 07 XX XX XX', specialite: 'Achat plantain frais, transformation chips & alloco' }
    ];

    el.innerHTML = '<div style="margin-top:12px;">' + techs.map(function(t) {
      return '<div style="padding:12px;background:#f8f9fa;border-radius:10px;margin-bottom:8px;">' +
        '<div style="font-size:13px;font-weight:700;">' + t.nom + '</div>' +
        '<div style="font-size:11px;color:#666;">' + t.specialite + '</div>' +
        '<div style="display:flex;gap:8px;margin-top:8px;">' +
          '<button onclick="window.open(\'tel:' + t.tel + '\')" style="flex:1;padding:8px;background:#5B3A1A;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">Appeler</button>' +
          '<button onclick="AgroPrix.plantainDemanderDevis(\'' + t.nom.replace(/'/g, "\\'") + '\')" style="flex:1;padding:8px;background:#E8862A;color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">Contacter</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  };

  AP.plantainDemanderDevis = function(techNom) {
    var data = loadData();
    var totalSurface = data.parcelles.reduce(function(s, p) { return s + (p.surface || 0); }, 0);
    var varietes = data.parcelles.map(function(p) { return p.variete || '?'; }).join(', ');
    var msg = 'Bonjour ' + techNom + ',\n\nJe suis producteur de banane plantain et je souhaite vous contacter.\n\n' +
      'Mon exploitation:\n- Surface: ' + totalSurface.toFixed(1) + ' ha\n- Varietes: ' + varietes + '\n- Parcelles: ' + data.parcelles.length + '\n\n' +
      'Demande envoyee via AgroPrix (agroprix.app)';
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };

  // ─── ASSISTANT IA (bouton flottant) ───
  AP.plantainToggleIA = function() {
    var panel = document.getElementById('plantain-ia-panel');
    if (!panel) return;
    panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  };

  AP.plantainAskIA = function() {
    var input = document.getElementById('plantain-ia-input');
    var output = document.getElementById('plantain-ia-output');
    if (!input || !output) return;
    var q = input.value.trim().toLowerCase();
    if (!q) return;

    var data = loadData();
    var response = getIAResponse(q, data);
    output.innerHTML = '<div style="padding:12px;background:#FFF8F0;border-radius:10px;font-size:12px;line-height:1.5;color:#333;">' +
      '<div style="font-size:11px;color:#5B3A1A;font-weight:700;margin-bottom:6px;">Assistant Agronomique</div>' +
      response +
      '<div style="font-size:9px;color:#999;margin-top:8px;font-style:italic;">Ce conseil ne remplace pas un diagnostic de terrain par un technicien qualifie.</div>' +
    '</div>';
    input.value = '';
  };

  function getIAResponse(q, data) {
    if (q.match(/sigatoka|cercospor|maladie.?noire|tache/)) {
      return '<b>Cercosporiose noire (Black Sigatoka)</b> — Maladie n°1 du plantain en CI.<br>' +
        '<b>Symptomes :</b> Stries noires sur feuilles, dessechement progressif.<br>' +
        '<b>Actions :</b><br>' +
        '- Effeuillage sanitaire (couper les feuilles atteintes)<br>' +
        '- Fongicides systemiques si forte pression (propiconazole)<br>' +
        '- Varietes resistantes : <b>FHIA-21</b> et <b>PITA-3</b> — zero traitement necessaire<br>' +
        '- Espacement adequat (3m x 2m) pour ventilation<br>' +
        'Le CNRA Bimbresso distribue des rejets de varietes resistantes.';
    }
    if (q.match(/charancon|cosmopolites|ravageur|insecte/)) {
      return '<b>Charancon du bananier (Cosmopolites sordidus)</b> — Ravageur majeur.<br>' +
        '<b>Symptomes :</b> Galeries dans le bulbe, chute des plants, affaiblissement.<br>' +
        '<b>Lutte :</b><br>' +
        '- Pieges a pheromones (Cosmolure) : 4 pieges/ha<br>' +
        '- Parage soigneux des bulbes avant plantation<br>' +
        '- Trempage bulbes dans insecticide biologique (Beauveria bassiana)<br>' +
        '- Rotation culturale de 6 mois minimum avant replantation';
    }
    if (q.match(/variete|quel.?plant|choisir|fhia|resistant/)) {
      return '<b>Varietes recommandees :</b><br>' +
        '- <b>Faux Corne</b> : Dominant en CI, bon rendement (8-15 t/ha), bon gout<br>' +
        '- <b>FHIA-21</b> : Resistant Black Sigatoka — ZERO traitement fongicide. Recommande CNRA<br>' +
        '- <b>Orishele</b> : Cycle court (10-12 mois), bon rendement<br>' +
        '- <b>French</b> : Nombreux doigts, ideal pour transformation chips<br>' +
        'Les <b>varietes resistantes</b> (FHIA-21, PITA-3) reduisent les couts de 50% en supprimant les traitements Sigatoka.';
    }
    if (q.match(/prix|vendre|march|saison|quand/)) {
      var prixActuel = PRIX_PLANTAIN[PRIX_PLANTAIN.length - 1];
      return '<b>Prix actuel :</b> ' + prixActuel.bordChamp + ' FCFA/kg bord champ, ' + prixActuel.detail + ' FCFA/kg detail (' + prixActuel.mois + ')<br>' +
        '<b>Saisonnalite :</b><br>' +
        '- <b>Haute saison</b> (jan-fev, oct-dec) : 150-200 FCFA/kg bord champ<br>' +
        '- <b>Basse saison</b> (avr-jul) : 75-120 FCFA/kg — surproduction<br>' +
        '<b>Conseil :</b> En basse saison, privilegiez la <b>transformation</b> (chips x10, farine x5 le prix brut) plutot que la vente fraiche a perte.';
    }
    if (q.match(/chips|transform|farine|alloco|seche/)) {
      return '<b>Transformation — Valeur ajoutee :</b><br>' +
        '- <b>Chips plantain</b> : 100kg frais → 30kg chips a 2500-4000 FCFA/kg (marge x5-x10)<br>' +
        '- <b>Farine plantain</b> : 100kg frais → 35kg farine a 1500-2000 FCFA/kg<br>' +
        '- <b>Alloco surgele</b> : marche en expansion (supermarchés Abidjan)<br>' +
        'Utilisez le <b>Simulateur de marge</b> dans l\'onglet Journal pour comparer frais vs transformation.<br>' +
        'Le CORAF identifie la farine de plantain comme solution aux pertes post-recolte (30-40%).';
    }
    if (q.match(/perte|post.?recol|conserv|stock/)) {
      return '<b>Pertes post-recolte : 30-40%</b> en CI (source FAO/RONGEAD).<br>' +
        '<b>Reduire les pertes :</b><br>' +
        '- Recolter au stade <b>3/4 plein</b> (pas mur) pour 5-7 jours de conservation<br>' +
        '- <b>Ne pas empiler</b> les regimes — blessures = murissement accelere<br>' +
        '- Transporter a l\'ombre, eviter les chocs<br>' +
        '- Vente directe producteur→acheteur (eliminer les intermediaires)<br>' +
        '- En surplus : transformer immediatement en chips ou farine';
    }
    if (q.match(/credit|pret|banque|financement|dossier/)) {
      var sc = calcScoreCredit(data);
      return '<b>Votre Score Dossier : ' + sc + '/100</b><br>' +
        'Le plantain est un vivrier — les banques le financent peu. Mais AgroPrix change la donne :<br>' +
        '<b>Preteurs adaptes :</b> Advans CI, Baobab, Coopec, MFI locales.<br>' +
        'Allez dans <b>Mon Dossier</b> pour generer un dossier avec historique de production et ventes — c\'est ce qui convainc les preteurs.';
    }
    if (q.match(/contre.?saison|irrigu|sec/)) {
      return '<b>Production de contre-saison</b> — La vraie opportunite (source RONGEAD).<br>' +
        'En CI, la surproduction saisonniere fait chuter les prix. La contre-saison (jan-avr) paie 2x plus.<br>' +
        '<b>Comment :</b><br>' +
        '- Planter en aout-septembre pour recolter en contre-saison<br>' +
        '- Irrigation goutte-a-goutte ou gravitaire si possible<br>' +
        '- Varietes a cycle court : Orishele (10-12 mois), French (11-13 mois)<br>' +
        '- Paillage epais pour conserver l\'humidite du sol';
    }
    // Default
    return 'Je suis l\'Assistant Agronomique Plantain Pro, forme sur les donnees CNRA, CIRAD, FAO et RONGEAD.<br>' +
      'Posez-moi des questions sur : les varietes, la Sigatoka noire, le charancon, les prix, la transformation (chips, farine), les pertes post-recolte, la contre-saison, ou le credit.<br>' +
      '<b>Exemples :</b> "Quelle variete choisir ?", "Comment lutter contre la Sigatoka ?", "Quand vendre au meilleur prix ?"';
  }

})(window.AgroPrix);
