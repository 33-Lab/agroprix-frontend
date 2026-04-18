/**
 * AgroPrix — Carte interactive des marchés UEMOA & parcelles géolocalisées
 * Leaflet.js — Compatibilité EUDR et ECOAGRIS prévue en phase 2.
 */

(function (AP) {
  'use strict';

  var _map = null;
  var _marketsLayer = null;
  var _parcellesLayer = null;

  // Couleurs EUDR
  var EUDR_COLOR = {
    compliant:     '#2563eb',  // vert institutionnel
    partial:       '#f59e0b',  // orange
    non_compliant: '#dc2626',  // rouge
  };

  // Couleur marchés WFP
  var MARKET_COLOR = '#2d8a4e';

  // Coordonnées par défaut (Bénin)
  var DEFAULT_CENTER = [9.3, 2.3];
  var DEFAULT_ZOOM   = 7;

  // Centre par pays
  var COUNTRY_CENTERS = {
    benin:        [9.3,  2.3,  7],
    cote_divoire: [6.8, -5.5,  7],
    senegal:      [14.5,-14.5, 7],
    mali:         [17.6, -3.9, 6],
    burkina_faso: [12.4, -1.6, 7],
    niger:        [17.6,  8.1, 6],
    togo:         [8.6,   0.8, 8],
    guinee_bissau:[11.8, -15.2,8],
  };

  /**
   * Initialise la carte Leaflet (appelé une seule fois)
   */
  function _initMap() {
    if (_map) return;

    _map = L.map('fullMap', {
      center: DEFAULT_CENTER,
      zoom:   DEFAULT_ZOOM,
      zoomControl: true,
    });

    // Tuiles OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(_map);

    _marketsLayer   = L.layerGroup().addTo(_map);
    _parcellesLayer = L.layerGroup().addTo(_map);
  }

  /**
   * Crée une icône Leaflet circulaire colorée
   */
  function _circleIcon(color, size) {
    size = size || 14;
    return L.divIcon({
      className: '',
      html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize:   [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });
  }

  /**
   * Affiche les marchés depuis l'API AgroPrix
   */
  function _loadMarkets(country) {
    if (!_map) return;
    _marketsLayer.clearLayers();

    var apiBase = (window.AgroPrix && window.AgroPrix.API_BASE) || '';
    var url = apiBase + '/api/prices/markets?country=' + encodeURIComponent(country);

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var rows = data.data || [];
        var count = 0;
        rows.forEach(function (m) {
          if (!m.latitude || !m.longitude) return;
          count++;
          var marker = L.marker([m.latitude, m.longitude], {
            icon: _circleIcon(MARKET_COLOR, 14),
          });
          marker.bindPopup(
            '<div style="min-width:180px;">' +
            '<div style="font-weight:700;font-size:14px;color:#1B4332;">' + (m.market || m.name || '—') + '</div>' +
            '<div style="font-size:12px;color:#666;margin-top:4px;">' +
            '<b>Produits suivis :</b> ' + (m.commodities_tracked || '—') + '<br>' +
            '<b>Dernière maj :</b> ' + (m.last_update || '—') + '<br>' +
            '<b>Source :</b> ' + (m.source || 'AgroPrix (données indicatives)') + '</div>' +
            '</div>'
          );
          _marketsLayer.addLayer(marker);
        });
        _setStatus(count + ' marchés chargés');
      })
      .catch(function () {
        _setStatus('Données marchés indisponibles (hors ligne ?)');
      });
  }

  /**
   * Affiche les parcelles de l'utilisateur depuis l'API
   */
  function _loadParcelles() {
    if (!_map) return;
    _parcellesLayer.clearLayers();

    var apiBase = (window.AgroPrix && window.AgroPrix.API_BASE) || '';
    var token   = localStorage.getItem('agroprix_token') || 'demo';
    var url     = apiBase + '/api/parcelles/geojson';

    fetch(url, {
      headers: { Authorization: 'Bearer ' + token },
    })
      .then(function (r) { return r.json(); })
      .then(function (geojson) {
        var features = geojson.features || [];
        var count = 0;
        features.forEach(function (f) {
          if (!f.geometry || !f.geometry.coordinates) return;
          var coords = f.geometry.coordinates; // [lng, lat]
          var p      = f.properties || {};
          var color  = EUDR_COLOR[p.eudr_compliance] || EUDR_COLOR.non_compliant;
          count++;

          var marker = L.marker([coords[1], coords[0]], {
            icon: _circleIcon(color, 18),
            zIndexOffset: 100,
          });

          var scoreBar = '';
          var score = p.eudr_score || 0;
          var barColor = color;
          scoreBar = '<div style="margin-top:6px;">' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">' +
            '<span>Score EUDR</span><span style="font-weight:700;color:' + barColor + ';">' + score + '/100</span>' +
            '</div>' +
            '<div style="height:6px;border-radius:3px;background:#eee;">' +
            '<div style="height:100%;border-radius:3px;width:' + score + '%;background:' + barColor + ';"></div>' +
            '</div></div>';

          marker.bindPopup(
            '<div style="min-width:200px;">' +
            '<div style="font-weight:700;font-size:14px;color:#1a3a5c;">' + (p.nom || 'Parcelle') + '</div>' +
            '<div style="font-size:12px;color:#666;margin-top:4px;">' +
            '<b>Culture :</b> ' + (p.culture || '—') + '<br>' +
            '<b>Surface :</b> ' + (p.surface_ha ? p.surface_ha + ' ha' : '—') + '<br>' +
            '<b>Région :</b> ' + (p.region || '—') + '<br>' +
            '<b>Date plantation :</b> ' + (p.date_plantation || '—') + '</div>' +
            scoreBar +
            '<div style="margin-top:8px;display:inline-block;padding:3px 10px;border-radius:20px;background:' + barColor + ';color:#fff;font-size:11px;font-weight:700;">' +
            (p.eudr_label || 'Score EUDR') + '</div>' +
            '</div>'
          );
          _parcellesLayer.addLayer(marker);
        });
        _setStatus(function (prev) {
          return (prev ? prev + ' · ' : '') + count + ' parcelle(s) affichée(s)';
        });
      })
      .catch(function () {
        // Silencieux si pas de parcelles ou hors ligne
      });
  }

  function _setStatus(msg) {
    var el = document.getElementById('carteStatus');
    if (!el) return;
    if (typeof msg === 'function') {
      el.textContent = msg(el.textContent);
    } else {
      el.textContent = msg;
    }
  }

  /**
   * Point d'entrée : chargé quand l'utilisateur ouvre la vue Carte
   */
  function loadCarteMarkets() {
    var countryEl = document.getElementById('carteCountry');
    var country   = (countryEl && countryEl.value) || 'benin';
    var showParc  = document.getElementById('carteParcelles');
    var showParcellesChecked = !showParc || showParc.checked;

    _setStatus('Chargement…');

    // Init carte si besoin
    if (!_map) {
      _initMap();
    }

    // Centrage selon pays
    if (COUNTRY_CENTERS[country]) {
      var c = COUNTRY_CENTERS[country];
      _map.setView([c[0], c[1]], c[2]);
    }

    // Invalidate size (Leaflet a besoin après un display:none → display:block)
    setTimeout(function () {
      if (_map) _map.invalidateSize();
    }, 100);

    // Charger marchés
    _loadMarkets(country);

    // Charger parcelles si coché
    if (showParcellesChecked) {
      _loadParcelles();
    } else {
      if (_parcellesLayer) _parcellesLayer.clearLayers();
    }
  }

  // Exposer globalement
  window.loadCarteMarkets = loadCarteMarkets;

  // Hook sur showView : auto-init quand la vue Carte s'ouvre
  var _origShowView = window.showView;
  window.showView = function (viewName) {
    var result = _origShowView ? _origShowView.apply(this, arguments) : undefined;
    if (viewName === 'carte') {
      setTimeout(loadCarteMarkets, 150); // laisser le DOM s'afficher
    }
    return result;
  };

  // Attacher au namespace AgroPrix
  if (AP) {
    AP.carte = { init: loadCarteMarkets };
  }

})(window.AgroPrix);
