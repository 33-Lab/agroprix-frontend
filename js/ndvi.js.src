// AgroPrix — Santé Parcelle / NDVI Module
// Indice de végétation satellite (Sentinel-2 via Agromonitoring API)
// Enregistrement parcelle GPS → NDVI hebdomadaire → alertes → assurance paramétrique
(function(AP) {
  'use strict';

  var PARCELS_KEY = 'agroprix_parcels';
  var NDVI_HISTORY_KEY = 'agroprix_ndvi_history';

  // Demo NDVI data (simulated Sentinel-2 values)
  var DEMO_NDVI = [
    { date: '2025-10-01', ndvi: 0.42 },
    { date: '2025-10-15', ndvi: 0.48 },
    { date: '2025-11-01', ndvi: 0.55 },
    { date: '2025-11-15', ndvi: 0.61 },
    { date: '2025-12-01', ndvi: 0.68 },
    { date: '2025-12-15', ndvi: 0.72 },
    { date: '2026-01-01', ndvi: 0.75 },
    { date: '2026-01-15', ndvi: 0.71 },
    { date: '2026-02-01', ndvi: 0.65 },
    { date: '2026-02-15', ndvi: 0.58 },
    { date: '2026-03-01', ndvi: 0.52 },
    { date: '2026-03-15', ndvi: 0.47 },
  ];

  // NDVI thresholds
  var THRESHOLDS = {
    excellent: 0.7,
    good: 0.5,
    moderate: 0.3,
    stress: 0.2
  };

  // NDVI interpretation
  function getNDVIStatus(ndvi) {
    if (ndvi >= THRESHOLDS.excellent) return { label: 'Excellente', color: '#2D6A4F', bg: '#D8F3DC', emoji: '🟢', advice: 'Vegetation dense et saine. Conditions optimales.' };
    if (ndvi >= THRESHOLDS.good) return { label: 'Bonne', color: '#40916C', bg: '#E8F5E9', emoji: '🟡', advice: 'Vegetation en bon etat. Surveillez l\'irrigation.' };
    if (ndvi >= THRESHOLDS.moderate) return { label: 'Moderee', color: '#E8862A', bg: '#FFF8E1', emoji: '🟠', advice: 'Stress vegetal detecte. Verifiez l\'eau et les intrants.' };
    if (ndvi >= THRESHOLDS.stress) return { label: 'Stress', color: '#e76f51', bg: '#FFF3E0', emoji: '🔴', advice: 'Stress severe ! Risque de perte de recolte. Action urgente.' };
    return { label: 'Critique', color: '#c0392b', bg: '#FFEBEE', emoji: '⛔', advice: 'Parcelle en danger critique. Sol nu ou vegetation morte.' };
  }

  // =========================================================================
  // Parcel management
  // =========================================================================
  function getParcels() {
    try { return JSON.parse(localStorage.getItem(PARCELS_KEY) || '[]'); } catch(e) { return []; }
  }

  function saveParcels(parcels) {
    localStorage.setItem(PARCELS_KEY, JSON.stringify(parcels));
  }

  function addParcel(parcel) {
    var parcels = getParcels();
    parcel.id = 'P' + Date.now();
    parcel.createdAt = new Date().toISOString();
    // Generate demo NDVI history for this parcel
    parcel.ndviHistory = generateDemoNDVI(parcel.culture);
    parcels.push(parcel);
    saveParcels(parcels);
    return parcel;
  }

  function generateDemoNDVI(culture) {
    // Simulate realistic NDVI based on crop type
    var base = DEMO_NDVI.slice();
    var variation = Math.random() * 0.15 - 0.075; // ±0.075
    return base.map(function(d) {
      var v = Math.max(0.05, Math.min(0.95, d.ndvi + variation + (Math.random() * 0.06 - 0.03)));
      return { date: d.date, ndvi: parseFloat(v.toFixed(2)) };
    });
  }

  // =========================================================================
  // Render functions
  // =========================================================================
  function render() {
    var parcels = getParcels();
    var container = document.getElementById('ndviContent');
    if (!container) return;

    var html = '<div style="text-align:center;margin-bottom:16px;">'
      + '<h3 style="margin:0 0 4px;color:var(--primary);">Sante Parcelle</h3>'
      + '<p style="font-size:12px;color:var(--text-light);">Suivez la sante de vos cultures par satellite (NDVI Sentinel-2)</p>'
      + '</div>';

    if (parcels.length === 0) {
      html += renderEmptyState();
    } else {
      // Dashboard cards
      html += renderDashboard(parcels);
      // Parcels list
      html += renderParcelsList(parcels);
    }

    // Add parcel button
    html += '<button class="btn-analyse" style="width:100%;font-size:14px;padding:12px;margin-top:16px;" '
      + 'onclick="AgroPrix.ndvi.showAddForm()">➕ Enregistrer une parcelle</button>';

    container.innerHTML = html;
  }

  function renderEmptyState() {
    return '<div class="card" style="padding:32px;text-align:center;">'
      + '<div style="font-size:48px;margin-bottom:12px;">🛰️</div>'
      + '<h3 style="color:var(--text-light);margin-bottom:8px;">Aucune parcelle enregistree</h3>'
      + '<p style="font-size:12px;color:var(--text-muted);margin-bottom:16px;">'
      + 'Enregistrez vos parcelles pour recevoir l\'indice de vegetation par satellite '
      + 'et des alertes en cas de stress vegetal.</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:320px;margin:0 auto;">'
      + '<div style="background:#D8F3DC;padding:10px;border-radius:8px;text-align:center;">'
      + '<div style="font-size:18px;">🟢</div><div style="font-size:10px;font-weight:600;color:#2D6A4F;">Saine</div>'
      + '<div style="font-size:9px;color:#666;">NDVI > 0.7</div></div>'
      + '<div style="background:#FFF8E1;padding:10px;border-radius:8px;text-align:center;">'
      + '<div style="font-size:18px;">🟠</div><div style="font-size:10px;font-weight:600;color:#E8862A;">Moderee</div>'
      + '<div style="font-size:9px;color:#666;">NDVI 0.3-0.5</div></div>'
      + '<div style="background:#E8F5E9;padding:10px;border-radius:8px;text-align:center;">'
      + '<div style="font-size:18px;">🟡</div><div style="font-size:10px;font-weight:600;color:#40916C;">Bonne</div>'
      + '<div style="font-size:9px;color:#666;">NDVI 0.5-0.7</div></div>'
      + '<div style="background:#FFF3E0;padding:10px;border-radius:8px;text-align:center;">'
      + '<div style="font-size:18px;">🔴</div><div style="font-size:10px;font-weight:600;color:#e76f51;">Stress</div>'
      + '<div style="font-size:9px;color:#666;">NDVI < 0.3</div></div>'
      + '</div></div>';
  }

  function renderDashboard(parcels) {
    // Get latest NDVI for each parcel
    var totalNDVI = 0;
    var alertCount = 0;
    parcels.forEach(function(p) {
      var latest = p.ndviHistory && p.ndviHistory.length > 0 ? p.ndviHistory[p.ndviHistory.length - 1].ndvi : 0;
      totalNDVI += latest;
      if (latest < THRESHOLDS.good) alertCount++;
    });
    var avgNDVI = parcels.length > 0 ? (totalNDVI / parcels.length).toFixed(2) : 0;
    var avgStatus = getNDVIStatus(avgNDVI);

    var html = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px;">';

    // Avg NDVI
    html += '<div class="card" style="padding:12px;text-align:center;border-top:3px solid ' + avgStatus.color + ';">'
      + '<div style="font-size:10px;color:var(--text-light);">NDVI moyen</div>'
      + '<div style="font-size:24px;font-weight:800;color:' + avgStatus.color + ';">' + avgNDVI + '</div>'
      + '<div style="font-size:10px;font-weight:600;color:' + avgStatus.color + ';">' + avgStatus.emoji + ' ' + avgStatus.label + '</div>'
      + '</div>';

    // Parcels count
    html += '<div class="card" style="padding:12px;text-align:center;border-top:3px solid var(--primary);">'
      + '<div style="font-size:10px;color:var(--text-light);">Parcelles</div>'
      + '<div style="font-size:24px;font-weight:800;color:var(--primary);">' + parcels.length + '</div>'
      + '<div style="font-size:10px;color:#666;">enregistrees</div>'
      + '</div>';

    // Alerts
    var alertColor = alertCount > 0 ? '#e76f51' : '#2D6A4F';
    html += '<div class="card" style="padding:12px;text-align:center;border-top:3px solid ' + alertColor + ';">'
      + '<div style="font-size:10px;color:var(--text-light);">Alertes</div>'
      + '<div style="font-size:24px;font-weight:800;color:' + alertColor + ';">' + alertCount + '</div>'
      + '<div style="font-size:10px;color:#666;">' + (alertCount > 0 ? 'parcelle(s) en stress' : 'tout va bien') + '</div>'
      + '</div>';

    html += '</div>';

    // Insurance banner
    html += '<div class="card" style="padding:12px;margin-bottom:16px;background:linear-gradient(135deg,#D8F3DC,#B7E4C7);border:1px solid #2D6A4F33;">'
      + '<div style="display:flex;align-items:center;gap:10px;">'
      + '<span style="font-size:28px;">🛡️</span>'
      + '<div>'
      + '<div style="font-size:12px;font-weight:700;color:#1B4332;">Assurance parametrique disponible</div>'
      + '<div style="font-size:11px;color:#2D6A4F;">Si votre NDVI chute sous 0.3, vous etes automatiquement indemnise. Sans expert terrain.</div>'
      + '</div></div></div>';

    return html;
  }

  function renderParcelsList(parcels) {
    var html = '<div class="card" style="padding:16px;margin-bottom:12px;">'
      + '<div class="card-title"><span class="icon">🗺️</span> Mes parcelles</div>';

    parcels.forEach(function(p, idx) {
      var latest = p.ndviHistory && p.ndviHistory.length > 0 ? p.ndviHistory[p.ndviHistory.length - 1] : { ndvi: 0, date: '' };
      var status = getNDVIStatus(latest.ndvi);

      // NDVI sparkline
      var sparkline = renderSparkline(p.ndviHistory || [], 120, 30);

      html += '<div style="padding:12px;border-radius:10px;background:' + status.bg + ';margin-bottom:10px;cursor:pointer;" '
        + 'onclick="AgroPrix.ndvi.showDetail(' + idx + ')">'
        + '<div style="display:flex;justify-content:space-between;align-items:start;">'
        + '<div>'
        + '<div style="font-size:13px;font-weight:700;color:var(--text);">🌾 ' + (p.name || 'Parcelle ' + (idx + 1)) + '</div>'
        + '<div style="font-size:11px;color:#666;">' + (p.culture || '—') + ' · ' + (p.surface || '—') + ' ha · ' + (p.location || '—') + '</div>'
        + '</div>'
        + '<div style="text-align:right;">'
        + '<div style="font-size:18px;font-weight:800;color:' + status.color + ';">' + latest.ndvi + '</div>'
        + '<div style="font-size:10px;font-weight:600;color:' + status.color + ';">' + status.emoji + ' ' + status.label + '</div>'
        + '</div></div>'
        + '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;">'
        + sparkline
        + '<div style="font-size:10px;color:#999;">Derniere mesure : ' + latest.date + '</div>'
        + '</div>'
        + '<div style="font-size:11px;color:' + status.color + ';margin-top:6px;font-style:italic;">💡 ' + status.advice + '</div>'
        + '</div>';
    });

    html += '</div>';
    return html;
  }

  function renderSparkline(history, width, height) {
    if (!history || history.length < 2) return '';
    var maxNDVI = 1.0;
    var minNDVI = 0;
    var points = [];
    var step = width / (history.length - 1);

    history.forEach(function(h, i) {
      var x = i * step;
      var y = height - ((h.ndvi - minNDVI) / (maxNDVI - minNDVI)) * height;
      points.push(x.toFixed(1) + ',' + y.toFixed(1));
    });

    var lastNDVI = history[history.length - 1].ndvi;
    var color = getNDVIStatus(lastNDVI).color;

    return '<svg width="' + width + '" height="' + height + '" style="flex-shrink:0;">'
      + '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
      + '<circle cx="' + points[points.length - 1].split(',')[0] + '" cy="' + points[points.length - 1].split(',')[1] + '" r="3" fill="' + color + '"/>'
      + '</svg>';
  }

  // =========================================================================
  // Parcel detail view
  // =========================================================================
  function showDetail(idx) {
    var parcels = getParcels();
    var p = parcels[idx];
    if (!p) return;

    var container = document.getElementById('ndviContent');
    var latest = p.ndviHistory && p.ndviHistory.length > 0 ? p.ndviHistory[p.ndviHistory.length - 1] : { ndvi: 0, date: '' };
    var status = getNDVIStatus(latest.ndvi);

    var html = '<button class="action-btn" onclick="AgroPrix.ndvi.render()" style="font-size:12px;margin-bottom:16px;">← Retour</button>';

    // Header
    html += '<div class="card" style="padding:16px;margin-bottom:16px;border-top:4px solid ' + status.color + ';">'
      + '<h3 style="margin:0 0 8px;">🌾 ' + (p.name || 'Parcelle') + '</h3>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">'
      + '<div style="background:var(--bg);padding:8px;border-radius:8px;"><div style="font-size:10px;color:#999;">Culture</div><div style="font-weight:700;">' + (p.culture || '—') + '</div></div>'
      + '<div style="background:var(--bg);padding:8px;border-radius:8px;"><div style="font-size:10px;color:#999;">Surface</div><div style="font-weight:700;">' + (p.surface || '—') + ' ha</div></div>'
      + '<div style="background:var(--bg);padding:8px;border-radius:8px;"><div style="font-size:10px;color:#999;">Localisation</div><div style="font-weight:700;">' + (p.location || '—') + '</div></div>'
      + '</div></div>';

    // Current NDVI gauge
    html += '<div class="card" style="padding:16px;margin-bottom:16px;text-align:center;">'
      + '<div style="font-size:11px;color:#999;margin-bottom:4px;">NDVI ACTUEL</div>'
      + '<div style="font-size:48px;font-weight:900;color:' + status.color + ';">' + latest.ndvi + '</div>'
      + '<div style="font-size:14px;font-weight:700;color:' + status.color + ';margin-bottom:8px;">' + status.emoji + ' ' + status.label + '</div>'
      + '<div style="font-size:12px;color:#666;">' + status.advice + '</div>'
      + '<div style="font-size:10px;color:#999;margin-top:4px;">Derniere mesure : ' + latest.date + '</div>'
      + '</div>';

    // NDVI timeline (bar chart)
    html += '<div class="card" style="padding:16px;margin-bottom:16px;">'
      + '<div class="card-title"><span class="icon">📈</span> Evolution NDVI (6 mois)</div>'
      + '<div style="display:flex;align-items:end;gap:3px;height:120px;margin-top:8px;">';

    (p.ndviHistory || []).forEach(function(h) {
      var barH = Math.max(4, Math.round(h.ndvi * 110));
      var st = getNDVIStatus(h.ndvi);
      var shortDate = h.date.substring(5); // MM-DD
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;">'
        + '<div style="font-size:7px;color:#999;margin-bottom:2px;">' + h.ndvi + '</div>'
        + '<div style="width:100%;height:' + barH + 'px;background:' + st.color + ';border-radius:3px 3px 0 0;"></div>'
        + '<div style="font-size:7px;color:#999;margin-top:2px;writing-mode:vertical-lr;transform:rotate(180deg);height:30px;">' + shortDate + '</div>'
        + '</div>';
    });

    html += '</div></div>';

    // NDVI scale legend
    html += '<div class="card" style="padding:12px;margin-bottom:16px;">'
      + '<div class="card-title"><span class="icon">📊</span> Echelle NDVI</div>'
      + '<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin:8px 0;">'
      + '<div style="flex:1;background:#c0392b;" title="Critique"></div>'
      + '<div style="flex:1;background:#e76f51;" title="Stress"></div>'
      + '<div style="flex:1;background:#E8862A;" title="Moderee"></div>'
      + '<div style="flex:1;background:#40916C;" title="Bonne"></div>'
      + '<div style="flex:1;background:#2D6A4F;" title="Excellente"></div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:9px;color:#666;">'
      + '<span>0 (sol nu)</span><span>0.2</span><span>0.3</span><span>0.5</span><span>0.7</span><span>1.0 (foret)</span>'
      + '</div></div>';

    // Insurance card
    html += '<div class="card" style="padding:16px;margin-bottom:16px;background:linear-gradient(135deg,#FFF8E1,#FFECB3);border:1px solid #E8862A33;">'
      + '<div class="card-title" style="color:#b45309;"><span class="icon">🛡️</span> Assurance parametrique</div>'
      + '<p style="font-size:12px;color:#92400e;margin-bottom:8px;">'
      + 'Si le NDVI de cette parcelle descend en dessous de <b>0.3</b> pendant 2 mesures consecutives, '
      + 'vous serez automatiquement eligible a une indemnisation.</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      + '<div style="background:linear-gradient(180deg,#fff,#FAFCFB);padding:8px;border-radius:8px;"><div style="font-size:10px;color:#666;">Seuil alerte</div><div style="font-weight:700;color:#e76f51;">NDVI < 0.3</div></div>'
      + '<div style="background:linear-gradient(180deg,#fff,#FAFCFB);padding:8px;border-radius:8px;"><div style="font-size:10px;color:#666;">Statut actuel</div><div style="font-weight:700;color:' + (latest.ndvi >= 0.3 ? '#2D6A4F' : '#e76f51') + ';">' + (latest.ndvi >= 0.3 ? 'Couvert' : 'ALERTE') + '</div></div>'
      + '</div></div>';

    // Delete parcel
    html += '<button style="width:100%;padding:10px;border:1px solid #e76f51;color:#e76f51;background:linear-gradient(180deg,#fff,#FAFCFB);border-radius:8px;font-size:12px;cursor:pointer;" '
      + 'onclick="if(confirm(\'Supprimer cette parcelle ?\')) { AgroPrix.ndvi.deleteParcel(' + idx + '); }">🗑️ Supprimer cette parcelle</button>';

    container.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // Add parcel form
  // =========================================================================
  function showAddForm() {
    var container = document.getElementById('ndviContent');
    var cultures = Object.keys(AP.cultureNames || {});

    var html = '<button class="action-btn" onclick="AgroPrix.ndvi.render()" style="font-size:12px;margin-bottom:16px;">← Retour</button>';

    html += '<div class="card" style="padding:16px;">'
      + '<div class="card-title"><span class="icon">➕</span> Enregistrer une parcelle</div>'
      + '<p style="font-size:12px;color:var(--text-light);margin-bottom:12px;">Enregistrez votre parcelle pour recevoir le suivi NDVI satellite automatique.</p>';

    // Name
    html += '<div class="form-group" style="margin-bottom:12px;">'
      + '<label class="form-label" style="font-weight:600;">Nom de la parcelle</label>'
      + '<input type="text" id="ndviName" placeholder="Ex: Champ Nord, Parcelle 2..." '
      + 'style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;">'
      + '</div>';

    // Culture
    html += '<div class="form-group" style="margin-bottom:12px;">'
      + '<label class="form-label" style="font-weight:600;">Culture</label>'
      + '<select id="ndviCulture" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">';
    cultures.forEach(function(c) {
      html += '<option value="' + c + '">' + (AP.cultureNames[c] || c) + '</option>';
    });
    html += '</select></div>';

    // Surface + Location
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">'
      + '<div class="form-group">'
      + '<label class="form-label" style="font-weight:600;">Surface (ha)</label>'
      + '<input type="number" id="ndviSurface" placeholder="Ex: 2.5" step="0.1" min="0.1" '
      + 'style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;">'
      + '</div>'
      + '<div class="form-group">'
      + '<label class="form-label" style="font-weight:600;">Localite</label>'
      + '<input type="text" id="ndviLocation" placeholder="Ex: Parakou" '
      + 'style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;">'
      + '</div></div>';

    // GPS coordinates
    html += '<div class="form-group" style="margin-bottom:12px;">'
      + '<label class="form-label" style="font-weight:600;">Coordonnees GPS (optionnel)</label>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      + '<input type="number" id="ndviLat" placeholder="Latitude (ex: 9.3377)" step="0.0001" '
      + 'style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;">'
      + '<input type="number" id="ndviLon" placeholder="Longitude (ex: 2.6253)" step="0.0001" '
      + 'style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;box-sizing:border-box;">'
      + '</div>'
      + '<button type="button" style="margin-top:6px;font-size:11px;padding:6px 12px;border:1px solid var(--primary);color:var(--primary);background:linear-gradient(180deg,#fff,#FAFCFB);border-radius:6px;cursor:pointer;" '
      + 'onclick="AgroPrix.ndvi.getGPS()">📍 Utiliser ma position actuelle</button>'
      + '</div>';

    // Submit
    html += '<button class="btn-analyse" style="width:100%;font-size:14px;padding:14px;" '
      + 'onclick="AgroPrix.ndvi.saveParcel()">🛰️ Enregistrer et obtenir le NDVI</button>';

    html += '</div>';
    container.innerHTML = html;
  }

  function getGPS() {
    if (!navigator.geolocation) {
      alert('La geolocalisation n\'est pas disponible sur ce navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(function(pos) {
      var latEl = document.getElementById('ndviLat');
      var lonEl = document.getElementById('ndviLon');
      if (latEl) latEl.value = pos.coords.latitude.toFixed(4);
      if (lonEl) lonEl.value = pos.coords.longitude.toFixed(4);
    }, function(err) {
      alert('Impossible d\'obtenir la position : ' + err.message);
    });
  }

  function saveParcel() {
    var name = (document.getElementById('ndviName') || {}).value || '';
    var culture = (document.getElementById('ndviCulture') || {}).value || '';
    var surface = parseFloat((document.getElementById('ndviSurface') || {}).value) || 0;
    var location = (document.getElementById('ndviLocation') || {}).value || '';
    var lat = parseFloat((document.getElementById('ndviLat') || {}).value) || null;
    var lon = parseFloat((document.getElementById('ndviLon') || {}).value) || null;

    if (!name) { alert('Donnez un nom a votre parcelle.'); return; }
    if (!surface) { alert('Indiquez la surface en hectares.'); return; }

    var parcel = {
      name: name,
      culture: AP.cultureNames ? (AP.cultureNames[culture] || culture) : culture,
      cultureKey: culture,
      surface: surface,
      location: location,
      lat: lat,
      lon: lon
    };

    addParcel(parcel);

    // Update scoring (more parcels = better score)
    if (AP.scoring && AP.scoring.calculate) AP.scoring.calculate();

    render();
  }

  function deleteParcel(idx) {
    var parcels = getParcels();
    parcels.splice(idx, 1);
    saveParcels(parcels);
    render();
  }

  // =========================================================================
  // Init
  // =========================================================================
  function init() {
    render();
  }

  // =========================================================================
  // Expose
  // =========================================================================
  AP.ndvi = {
    init: init,
    render: render,
    showAddForm: showAddForm,
    showDetail: showDetail,
    saveParcel: saveParcel,
    deleteParcel: deleteParcel,
    getGPS: getGPS,
    getParcels: getParcels
  };

})(window.AgroPrix);
