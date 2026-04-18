// AgroPrix Analysis Module
// Handles: analysis launch, Chart.js charts, Leaflet map, factors, news, recommendations
window.AgroPrix = window.AgroPrix || {};

(function(AP) {
  'use strict';

  // =========================================================================
  // Chart / Map instance tracking
  // =========================================================================
  var priceChartInst = null;
  var regionChartInst = null;
  var mapInst = null;
  var mapMarkers = [];

  // =========================================================================
  // AgroPrix color palette
  // =========================================================================
  var COLORS = {
    primary:   '#2D6A4F',
    accent:    '#E8862A',
    alert:     '#e76f51',
    info:      '#1a3a5c',
    forecast:  '#40916C',
    green:     '#10b981',
    red:       '#ef4444',
    gold:      '#f59e0b',
    blue:      '#3b82f6',
    purple:    '#8b5cf6',
    orange:    '#f97316',
    cyan:      '#06b6d4',
    pink:      '#ec4899'
  };

  var BAR_PALETTE = [
    COLORS.primary, COLORS.green, COLORS.accent, COLORS.alert,
    COLORS.purple, COLORS.orange, COLORS.cyan, COLORS.pink
  ];

  // =========================================================================
  // destroyCharts — cleanup all chart and map instances
  // =========================================================================
  function destroyCharts() {
    if (priceChartInst) { priceChartInst.destroy(); priceChartInst = null; }
    if (regionChartInst) { regionChartInst.destroy(); regionChartInst = null; }

    // Destroy any orphan Chart.js instances on our canvases
    ['priceChart', 'regionChart'].forEach(function(id) {
      var canvas = document.getElementById(id);
      if (canvas && typeof Chart !== 'undefined') {
        var existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
      }
    });

    if (mapMarkers.length) {
      mapMarkers.forEach(function(m) { if (mapInst) mapInst.removeLayer(m); });
      mapMarkers = [];
    }
    if (mapInst) { mapInst.remove(); mapInst = null; }
  }

  // =========================================================================
  // launchAnalysis — main entry point (called from onclick)
  // =========================================================================
  function launchAnalysis() {
    var overlay = document.getElementById('loadingOverlay');
    var steps   = document.getElementById('loadingSteps');
    var bar     = document.getElementById('loadingBar');
    if (!overlay || !steps) return;

    // Read form values
    var country = _val('countrySelect', 'benin');
    var culture = _val('cultureSelect', 'mais');
    var period  = _val('periodSelect', '12m');

    // Show loading
    overlay.classList.add('show');
    if (bar) bar.style.width = '0%';

    // Animated loading steps
    steps.innerHTML = '';
    var stepTexts = AP.API_AVAILABLE
      ? [
          'Connexion API AgroPrix...',
          'Chargement prix reels WFP...',
          'Analyse des tendances...',
          'Generation du rapport...'
        ]
      : [
          'Collecte des donnees de marche...',
          'Analyse des tendances et saisonnalite...',
          'Calcul des indicateurs de risque...',
          'Generation des recommandations...'
        ];

    stepTexts.forEach(function(text, idx) {
      setTimeout(function() {
        var div = document.createElement('div');
        div.className = 'loading-step';
        div.innerHTML = '<span class="step-icon"><span class="spinner"></span></span> ' + text;
        steps.appendChild(div);
        if (bar) bar.style.width = Math.round((idx + 1) / stepTexts.length * 100) + '%';
        setTimeout(function() {
          div.classList.add('done');
          div.querySelector('.step-icon').innerHTML = '\u2713';
        }, 350);
      }, idx * 450 + 300);
    });

    if (AP.API_AVAILABLE) {
      // === REAL DATA MODE ===
      var totalDelay = stepTexts.length * 450 + 600;
      setTimeout(function() {
        buildResultsFromAPI(country, culture, period).then(function() {
          _showResults(overlay);
        }).catch(function(err) {
          console.error('[AgroPrix] API error, fallback to simulated:', err);
          buildResults();
          _showResults(overlay);
        });
      }, totalDelay);
    } else {
      // === SIMULATED MODE ===
      setTimeout(function() {
        buildResults();
        _showResults(overlay);
      }, stepTexts.length * 450 + 800);
    }
  }

  // Helper: show results after analysis completes
  function _showResults(overlay) {
    if (overlay) overlay.classList.remove('show');
    var resultsEl = document.getElementById('results');
    if (resultsEl) {
      resultsEl.classList.add('show');
      resultsEl.style.display = 'block';
    }
    setTimeout(function() {
      if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }

  // Helper: get select value
  function _val(id, fallback) {
    var el = document.getElementById(id);
    return el ? el.value : fallback;
  }

  // =========================================================================
  // buildResultsFromAPI — fetch real data and build all sections
  // =========================================================================
  async function buildResultsFromAPI(country, culture, period) {
    destroyCharts();

    var cName       = AP.countryMeta[country] ? AP.countryMeta[country].name : country;
    var cultureName = AP.cultureNames[culture] || culture;
    var flag        = AP.countryMeta[country] ? AP.countryMeta[country].flag : '';

    // Fetch real data in parallel
    var results = await Promise.all([
      AP.api.fetchPrices(country, culture, period),
      AP.api.fetchMarkets(country),
      AP.api.fetchCompare(culture)
    ]);

    var monthlyData = results[0];
    var marketsData = results[1];
    var compareData = results[2];

    if (!monthlyData || monthlyData.length === 0) {
      // No real data — fallback to simulated
      buildResults();
      return;
    }

    // Extract price array and labels
    var data   = monthlyData.map(function(d) { return Math.round(d.avg_price); });
    var labels = monthlyData.map(function(d) { return d.month; });
    var forecast = AP.generateForecast(data);

    var currentPrice = data[data.length - 1];
    var prevPrice    = data.length > 1 ? data[data.length - 2] : currentPrice;
    var momChange    = prevPrice ? ((currentPrice - prevPrice) / prevPrice * 100).toFixed(1) : '0.0';
    var yoyPrice     = data.length > 12 ? data[data.length - 13] : currentPrice;
    var yoyChange    = yoyPrice ? ((currentPrice - yoyPrice) / yoyPrice * 100).toFixed(1) : '0.0';
    var vol          = AP.calculateVolatility(data);

    // Executive hero
    _updateHero(flag, cultureName, cName, currentPrice, momChange, yoyChange, vol,
      'Donnees reelles WFP \u00b7 ' + monthlyData[monthlyData.length - 1].month);

    // Stats
    _updateStats(data, data);

    // Build sub-sections
    buildPriceChartAPI(data, labels, forecast, cultureName, cName);
    buildMapAPI(country, marketsData, culture);
    buildRegionalChartAPI(compareData, culture);
    buildFactors(culture, cName, momChange);
    buildNews(cultureName, cName, currentPrice, momChange);
    buildRecommendationsAPI(country, culture, cultureName, cName, currentPrice, momChange, yoyChange, vol, forecast, AP.getBestSellMonth(data), data);
  }

  // =========================================================================
  // buildResults — simulated data mode
  // =========================================================================
  function buildResults() {
    destroyCharts();

    var country = _val('countrySelect', 'benin');
    var culture = _val('cultureSelect', 'mais');
    var period  = _val('periodSelect', '12m');

    var cName       = AP.countryMeta[country] ? AP.countryMeta[country].name : country;
    var cultureName = AP.cultureNames[culture] || culture;
    var flag        = AP.countryMeta[country] ? AP.countryMeta[country].flag : '';

    var data     = AP.getDataSlice(country, culture, period);
    var prevData = AP.getPrevYearData(country, culture, period);
    var allData  = AP.priceData[country] && AP.priceData[country][culture] ? AP.priceData[country][culture] : [];
    var forecast = AP.generateForecast(data);

    if (data.length === 0) return;

    // ── Calibrage avec données de référence SIM nationaux ──────────────────
    // Mapping clés cultures analysis → clés DataSources
    var DS_CULTURE_MAP = {
      riz_local: 'riz', riz_importe: 'riz', cajou: 'anacarde'
    };
    var dsCulture = DS_CULTURE_MAP[culture] || culture;
    var refPrices = (AP.DataSources) ? AP.DataSources.getReferenceData(country, dsCulture) : [];
    var dataSubtitle = 'Mars 2026 \u00b7 Analyse en temps r\u00e9el';

    if (refPrices.length > 0 && refPrices[0].price > 0) {
      var refPrice = refPrices[0].price;
      var rawCurrent = data[data.length - 1];
      if (rawCurrent > 0) {
        var scale = refPrice / rawCurrent;
        data = data.map(function(p) { return Math.round(p * scale); });
        prevData = prevData.map(function(p) { return Math.round(p * scale); });
        forecast = forecast.map(function(p) { return Math.round(p * scale); });
        allData = allData.map(function(p) { return Math.round(p * scale); });
      }
      var srcLabel = refPrices[0].market || 'SIM nationaux';
      var trendLabel = refPrices[0].trend ? ' \u00b7 ' + refPrices[0].trend : '';
      dataSubtitle = srcLabel + trendLabel + ' \u00b7 Mars 2026';
    }

    var currentPrice = data[data.length - 1];
    var prevPrice    = data.length > 1 ? data[data.length - 2] : currentPrice;
    var momChange    = prevPrice ? ((currentPrice - prevPrice) / prevPrice * 100).toFixed(1) : '0.0';
    var yoyPrice     = data.length > 12 ? data[data.length - 13] : (prevData.length > 0 ? prevData[prevData.length - 1] : currentPrice);
    var yoyChange    = yoyPrice ? ((currentPrice - yoyPrice) / yoyPrice * 100).toFixed(1) : '0.0';
    var vol          = AP.calculateVolatility(data);

    _updateHero(flag, cultureName, cName, currentPrice, momChange, yoyChange, vol, dataSubtitle);

    _updateStats(data, allData);

    buildPriceChart(data, prevData, forecast, period, cultureName, cName);
    buildMap(country, culture, currentPrice);
    buildFactors(culture, cName, momChange);
    buildRegionalChart(culture, period);
    buildNews(cultureName, cName, currentPrice, momChange);
    buildRecommendations(cultureName, cName, currentPrice, momChange, yoyChange, vol, forecast, AP.getBestSellMonth(allData), data);
  }

  // =========================================================================
  // _updateHero — populate executive summary hero section
  // =========================================================================
  function _updateHero(flag, cultureName, cName, currentPrice, momChange, yoyChange, vol, subtitle) {
    var heroTitle    = document.getElementById('heroTitle');
    var heroSubtitle = document.getElementById('heroSubtitle');
    var heroPrice    = document.getElementById('heroPrice');
    var heroMom      = document.getElementById('heroMom');
    var heroYoy      = document.getElementById('heroYoy');
    var heroTrend    = document.getElementById('heroTrend');
    var heroVol      = document.getElementById('heroVol');

    if (heroTitle)    heroTitle.textContent = flag + ' ' + cultureName + ' \u2014 ' + cName;
    if (heroSubtitle) heroSubtitle.textContent = subtitle;
    if (heroPrice)    heroPrice.textContent = currentPrice.toLocaleString('fr-FR');

    var mom = parseFloat(momChange);
    var yoy = parseFloat(yoyChange);

    if (heroMom) {
      heroMom.textContent = (mom >= 0 ? '+' : '') + momChange + '%';
      heroMom.className = 'hs-value ' + (mom >= 0 ? 'up' : 'down');
    }
    if (heroYoy) {
      heroYoy.textContent = (yoy >= 0 ? '+' : '') + yoyChange + '%';
      heroYoy.className = 'hs-value ' + (yoy >= 0 ? 'up' : 'down');
    }
    if (heroTrend) {
      var trendClass = Math.abs(mom) < 2 ? 'stable' : (mom >= 0 ? 'hausse' : 'baisse');
      var trendLabel = Math.abs(mom) < 2 ? 'STABLE' : (mom >= 0 ? 'HAUSSE' : 'BAISSE');
      heroTrend.innerHTML = '<span class="trend-badge ' + trendClass + '">' + trendLabel + '</span>';
    }
    if (heroVol) {
      var volLevel = vol > 25 ? '\u00c9lev\u00e9e' : vol > 15 ? 'Moyenne' : 'Faible';
      heroVol.textContent = vol + '/100 (' + volLevel + ')';
    }
  }

  // =========================================================================
  // _updateStats — min/max/bestBuy/bestSell stat boxes
  // =========================================================================
  function _updateStats(data, allData) {
    var minPrice = Math.min.apply(null, data);
    var maxPrice = Math.max.apply(null, data);
    var bestBuy  = AP.getBestBuyMonth(allData);
    var bestSell = AP.getBestSellMonth(allData);

    var minIdx = data.indexOf(minPrice);
    var maxIdx = data.indexOf(maxPrice);

    _setText('statMin', minPrice.toLocaleString('fr-FR') + ' FCFA');
    _setText('statMax', maxPrice.toLocaleString('fr-FR') + ' FCFA');
    _setText('statBuy', bestBuy);
    _setText('statSell', bestSell);

    _setText('statMinDate', minIdx >= 0 ? 'Mois ' + (minIdx + 1) : '');
    _setText('statMaxDate', maxIdx >= 0 ? 'Mois ' + (maxIdx + 1) : '');
    _setText('statBuyPrice', 'Meilleur achat');
    _setText('statSellPrice', 'Meilleure vente');
  }

  function _setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // =========================================================================
  // buildPriceChartAPI — Chart.js line chart from API data
  // =========================================================================
  function buildPriceChartAPI(data, labels, forecast, cultureName, cName) {
    var canvas = document.getElementById('priceChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    // Format labels: "2024-01" -> "Jan 2024"
    var fmtLabels = labels.map(function(l) {
      var parts = l.split('-');
      return AP.MONTHS[parseInt(parts[1]) - 1] + ' ' + parts[0];
    });

    var forecastMonths = ['Avr 2026', 'Mai 2026', 'Jun 2026'];
    var allLabels = fmtLabels.concat(forecastMonths);
    var mainData = data.concat([null, null, null]);
    var forecastLine = new Array(data.length - 1).fill(null)
      .concat([data[data.length - 1]])
      .concat(forecast);

    var datasets = [
      {
        label: cultureName + ' \u2014 ' + cName + ' (donn\u00e9es r\u00e9elles)',
        data: mainData,
        borderColor: COLORS.primary,
        backgroundColor: _hexToRgba(COLORS.primary, 0.08),
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5
      },
      {
        label: 'Projection tendancielle',
        data: forecastLine,
        borderColor: COLORS.forecast,
        borderWidth: 2,
        borderDash: [8, 4],
        fill: false,
        tension: 0.3,
        pointRadius: 0
      }
    ];

    priceChartInst = new Chart(ctx, {
      type: 'line',
      data: { labels: allLabels, datasets: datasets },
      options: _lineChartOptions(cultureName)
    });
  }

  // =========================================================================
  // buildPriceChart — Chart.js line chart from simulated data
  // =========================================================================
  function buildPriceChart(data, prevData, forecast, period, cultureName, cName) {
    var canvas = document.getElementById('priceChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var labels = AP.getLabels(period);
    var forecastMonths = ['Avr 2026', 'Mai 2026', 'Jun 2026'];
    var allLabels = labels.concat(forecastMonths);

    // Main data with nulls for forecast region
    var mainData = data.concat(new Array(3).fill(null));

    // Previous year padded
    var prevPadded = prevData.length > 0
      ? prevData.concat(new Array(Math.max(0, data.length - prevData.length + 3)).fill(null))
      : [];

    // Forecast line connected from last data point
    var forecastLine = new Array(data.length - 1).fill(null)
      .concat([data[data.length - 1]])
      .concat(forecast);

    // Confidence band
    var bandUpper = new Array(data.length - 1).fill(null).concat([data[data.length - 1]]);
    var bandLower = new Array(data.length - 1).fill(null).concat([data[data.length - 1]]);
    forecast.forEach(function(v, i) {
      var margin = v * 0.05 * (i + 1);
      bandUpper.push(Math.round(v + margin));
      bandLower.push(Math.round(v - margin));
    });

    var datasets = [
      {
        label: cultureName + ' \u2014 ' + cName,
        data: mainData,
        borderColor: COLORS.primary,
        backgroundColor: _hexToRgba(COLORS.primary, 0.08),
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 5
      },
      {
        label: 'Ann\u00e9e pr\u00e9c\u00e9dente',
        data: prevPadded.length > 0 ? prevPadded : undefined,
        borderColor: _hexToRgba(COLORS.accent, 0.6),
        borderWidth: 1.5,
        borderDash: [6, 4],
        fill: false,
        tension: 0.3,
        pointRadius: 0
      },
      {
        label: 'Projection tendancielle',
        data: forecastLine,
        borderColor: COLORS.forecast,
        borderWidth: 2,
        borderDash: [8, 4],
        fill: false,
        tension: 0.3,
        pointRadius: 0
      },
      {
        label: 'Bande haute',
        data: bandUpper,
        borderColor: 'transparent',
        backgroundColor: _hexToRgba(COLORS.forecast, 0.1),
        fill: '+1',
        pointRadius: 0
      },
      {
        label: 'Bande basse',
        data: bandLower,
        borderColor: 'transparent',
        backgroundColor: _hexToRgba(COLORS.forecast, 0.1),
        fill: false,
        pointRadius: 0
      }
    ].filter(function(ds) { return ds.data !== undefined; });

    // Event annotations for long period views
    var annotations = {};
    if (period === '5y' || period === '10y') {
      var covidIdx = allLabels.indexOf('Mar 2020');
      if (covidIdx === -1) covidIdx = allLabels.indexOf('Avr 2020');
      if (covidIdx > -1) {
        annotations.covid = {
          type: 'line', xMin: covidIdx, xMax: covidIdx,
          borderColor: _hexToRgba(COLORS.alert, 0.5), borderWidth: 1, borderDash: [4, 4],
          label: { display: true, content: 'COVID-19', position: 'start', backgroundColor: _hexToRgba(COLORS.alert, 0.7), font: { size: 10 } }
        };
      }
      var coupIdx = allLabels.indexOf('Jul 2023');
      if (coupIdx > -1) {
        annotations.coup = {
          type: 'line', xMin: coupIdx, xMax: coupIdx,
          borderColor: _hexToRgba(COLORS.orange, 0.5), borderWidth: 1, borderDash: [4, 4],
          label: { display: true, content: 'Coup Niger', position: 'start', backgroundColor: _hexToRgba(COLORS.orange, 0.7), font: { size: 10 } }
        };
      }
      var criseIdx = allLabels.indexOf('Ao\u00fb 2024');
      if (criseIdx === -1) criseIdx = allLabels.indexOf('Jul 2024');
      if (criseIdx > -1) {
        annotations.crise = {
          type: 'line', xMin: criseIdx, xMax: criseIdx,
          borderColor: _hexToRgba(COLORS.red, 0.6), borderWidth: 1, borderDash: [4, 4],
          label: { display: true, content: 'Crise prix +57%', position: 'start', backgroundColor: _hexToRgba(COLORS.red, 0.8), font: { size: 10 } }
        };
      }
      var leveeIdx = allLabels.indexOf('Jun 2025');
      if (leveeIdx > -1) {
        annotations.levee = {
          type: 'line', xMin: leveeIdx, xMax: leveeIdx,
          borderColor: _hexToRgba(COLORS.green, 0.5), borderWidth: 1, borderDash: [4, 4],
          label: { display: true, content: 'Lev\u00e9e ban export', position: 'start', backgroundColor: _hexToRgba(COLORS.green, 0.7), font: { size: 10 } }
        };
      }
    }

    priceChartInst = new Chart(ctx, {
      type: 'line',
      data: { labels: allLabels, datasets: datasets },
      options: _lineChartOptions(cultureName, annotations)
    });
  }

  // Common line chart options builder
  function _lineChartOptions(cultureName, annotations) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#64748b',
            font: { size: 11 },
            filter: function(item) {
              return !['Bande haute', 'Bande basse'].includes(item.text);
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(ctx) {
              if (ctx.raw === null) return '';
              return ctx.dataset.label + ' : ' + ctx.raw.toLocaleString('fr-FR') + ' FCFA/kg';
            }
          }
        },
        annotation: annotations ? { annotations: annotations } : undefined
      },
      scales: {
        x: {
          ticks: { color: '#64748b', maxRotation: 45, font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.04)' }
        },
        y: {
          ticks: {
            color: '#64748b',
            callback: function(v) { return v.toLocaleString('fr-FR'); }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        }
      }
    };
  }

  // =========================================================================
  // buildMapAPI — Leaflet map from API markets data
  // =========================================================================
  function buildMapAPI(country, marketsData, culture) {
    var mapContainer = document.getElementById('priceMap');
    if (!mapContainer) return;
    var meta = AP.countryMeta[country];
    if (!meta) return;

    mapInst = L.map('priceMap').setView([meta.lat, meta.lng], meta.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap', maxZoom: 18
    }).addTo(mapInst);

    marketsData.forEach(function(mk) {
      if (!mk.latitude || !mk.longitude) return;
      var icon = L.divIcon({
        className: 'map-marker-custom',
        html: '<div style="background:' + COLORS.primary + ';color:#fff;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)">'
          + mk.market + '</div>',
        iconSize: [120, 24],
        iconAnchor: [60, 12]
      });
      var marker = L.marker([mk.latitude, mk.longitude], { icon: icon }).addTo(mapInst);
      marker.bindPopup(
        '<strong>' + mk.market + '</strong><br>'
        + mk.commodities_tracked + ' produits suivis<br>'
        + 'Derni\u00e8re maj : ' + mk.last_update
      );
      mapMarkers.push(marker);
    });

    setTimeout(function() { if (mapInst) mapInst.invalidateSize(); }, 300);
  }

  // =========================================================================
  // buildMap — Leaflet map from simulated data
  // =========================================================================
  function buildMap(country, culture, currentPrice) {
    var mapContainer = document.getElementById('priceMap');
    if (!mapContainer) return;
    var meta = AP.countryMeta[country];
    if (!meta) return;

    mapInst = L.map('priceMap').setView([meta.lat, meta.lng], meta.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap', maxZoom: 18
    }).addTo(mapInst);

    var markets = AP.marketsByCountry[country] || [];
    markets.forEach(function(mk, idx) {
      var price = AP.getMarketPrice(currentPrice, idx, markets.length);
      var ratio = price / currentPrice;
      var color = ratio > 1.05 ? COLORS.alert : ratio < 0.95 ? COLORS.green : COLORS.primary;

      var icon = L.divIcon({
        className: 'map-marker-custom',
        html: '<div style="background:' + color + ';color:#fff;padding:4px 8px;border-radius:12px;'
          + 'font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3)">'
          + price.toLocaleString('fr-FR') + ' F</div>',
        iconSize: [80, 24],
        iconAnchor: [40, 12]
      });

      var marker = L.marker([mk.lat, mk.lng], { icon: icon }).addTo(mapInst);
      var pctDiff = ((ratio - 1) * 100).toFixed(1);
      marker.bindPopup(
        '<strong>' + mk.name + '</strong><br>'
        + price.toLocaleString('fr-FR') + ' FCFA/kg<br>'
        + '<span style="color:' + color + '">'
        + (ratio > 1 ? '+' : '') + pctDiff + '% vs moyenne</span>'
      );
      mapMarkers.push(marker);
    });

    setTimeout(function() { if (mapInst) mapInst.invalidateSize(); }, 300);
  }

  // =========================================================================
  // buildRegionalChartAPI — horizontal bar chart from API comparison data
  // =========================================================================
  function buildRegionalChartAPI(compareData, culture) {
    var canvas = document.getElementById('regionChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var cultureName = AP.cultureNames[culture] || culture;
    var countryLabels = compareData.map(function(d) {
      var meta = AP.countryMeta[d.country];
      return meta ? meta.flag + ' ' + meta.name : d.country;
    });
    var avgPrices = compareData.map(function(d) { return Math.round(d.avg_price); });

    regionChartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: countryLabels,
        datasets: [{
          label: cultureName + ' \u2014 Prix moyen (FCFA/kg)',
          data: avgPrices,
          backgroundColor: BAR_PALETTE.slice(0, avgPrices.length),
          borderRadius: 6
        }]
      },
      options: _barChartOptions()
    });
  }

  // =========================================================================
  // buildRegionalChart — horizontal bar chart from simulated data
  // =========================================================================
  function buildRegionalChart(culture, period) {
    var canvas = document.getElementById('regionChart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    var countries = Object.keys(AP.countryMeta);
    var labels = [];
    var values = [];
    var colors = [];

    countries.forEach(function(c, idx) {
      var data = AP.getDataSlice(c, culture, period);
      var lastPrice = data.length > 0 ? data[data.length - 1] : 0;
      labels.push(AP.countryMeta[c].flag + ' ' + AP.countryMeta[c].name);
      values.push(lastPrice);
      colors.push(BAR_PALETTE[idx % BAR_PALETTE.length]);
    });

    regionChartInst = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: AP.cultureNames[culture] || culture,
          data: values,
          backgroundColor: colors.map(function(c) { return c + '33'; }),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: _barChartOptions()
    });
  }

  // Common bar chart options
  function _barChartOptions() {
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.95)',
          callbacks: {
            label: function(ctx) { return ctx.raw.toLocaleString('fr-FR') + ' FCFA/kg'; }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b',
            callback: function(v) { return v.toLocaleString('fr-FR'); }
          },
          grid: { color: 'rgba(0,0,0,0.06)' }
        },
        y: {
          ticks: { color: '#64748b', font: { size: 12 } },
          grid: { display: false }
        }
      }
    };
  }

  // =========================================================================
  // buildFactors — generate influence factor cards
  // =========================================================================
  function buildFactors(culture, cName, momChange) {
    var container = document.getElementById('factorsGrid');
    if (!container) return;

    var isCereal = ['mais', 'mil', 'sorgho', 'riz_local', 'riz_importe', 'niebe'].indexOf(culture) > -1;
    var isMaraicher = ['tomate', 'piment', 'oignon', 'gombo'].indexOf(culture) > -1;
    var mom = parseFloat(momChange);

    var factors = [
      {
        icon: '\ud83c\udf27\ufe0f', title: 'M\u00c9T\u00c9O & CLIMAT',
        desc: 'Pluviom\u00e9trie cumul\u00e9e -23% vs normale dans la zone sah\u00e9lienne. Pr\u00e9visions NOAA : d\u00e9ficit probable avril-mai. Risque de semis tardifs et stress hydrique sur les cultures.',
        impact: 'Impact : +8-15%',
        severity: mom > 5 ? 'high' : 'medium',
        impactClass: mom > 5 ? 'high' : 'medium'
      },
      {
        icon: '\ud83d\udec3', title: 'FRONTI\u00c8RES & LOGISTIQUE',
        desc: 'Temps de travers\u00e9e Cotonou-Niamey : 5,2 jours (+18%). Co\u00fbt fret routier en hausse de 12% sur le corridor. Files d\'attente aux postes-fronti\u00e8re.',
        impact: 'Impact : +4-8%',
        severity: 'medium',
        impactClass: 'medium'
      },
      {
        icon: '\ud83d\udcb1', title: 'CHANGE & DEVISES',
        desc: 'Naira nig\u00e9rian : -8% sur 30j. Diff\u00e9rentiel de change favorable aux importations informelles depuis le Nigeria. Franc CFA stable (arrimage euro).',
        impact: 'Impact : -3-5%',
        severity: 'low',
        impactClass: 'low'
      },
      {
        icon: '\ud83d\udcc8', title: 'INFLATION G\u00c9N\u00c9RALE',
        desc: 'Inflation alimentaire ' + cName + ' : 11,2% glissement annuel (vs 8,5% inflation g\u00e9n\u00e9rale). \u00c9nergie +14%. Pression sur pouvoir d\'achat des m\u00e9nages.',
        impact: 'Impact : +5-8%',
        severity: 'medium',
        impactClass: 'medium'
      },
      {
        icon: '\ud83d\udce6', title: 'STOCKS & R\u00c9SERVES',
        desc: isCereal
          ? 'Stocks ONASA/OPVN : 12 400t sur objectif 18 000t (-31%). R\u00e9approvisionnement non programm\u00e9 avant juin. Stocks commer\u00e7ants : niveau bas.'
          : isMaraicher
            ? 'Production mara\u00eech\u00e8re en baisse saisonni\u00e8re. Pertes post-r\u00e9colte estim\u00e9es \u00e0 30-40%. Conservation limit\u00e9e par manque de cha\u00eene du froid.'
            : 'Stocks disponibles en baisse saisonni\u00e8re. Approvisionnement des march\u00e9s centraux sous pression. Pertes post-r\u00e9colte estim\u00e9es \u00e0 25%.',
        impact: 'Impact : +6-12%',
        severity: 'high',
        impactClass: 'high'
      },
      {
        icon: '\ud83c\udf10', title: 'G\u00c9OPOLITIQUE R\u00c9GIONALE',
        desc: 'Alliance des \u00c9tats du Sahel (AES) : fronti\u00e8res partiellement ferm\u00e9es Niger-Nigeria. Sanctions CEDEAO lev\u00e9es mais flux commerciaux perturb\u00e9s.',
        impact: 'Impact : +8-15%',
        severity: 'high',
        impactClass: 'high'
      },
      {
        icon: '\ud83d\udcc5', title: 'SAISONNALIT\u00c9',
        desc: isCereal
          ? 'P\u00e9riode pr\u00e9-soudure (mars-avril). Historiquement : hausse progressive des c\u00e9r\u00e9ales. Pic attendu juillet-ao\u00fbt (+40 \u00e0 +80% vs post-r\u00e9colte).'
          : isMaraicher
            ? 'Fin de saison s\u00e8che, production en d\u00e9clin. Transition vers la saison des pluies favorable \u00e0 certaines cultures mara\u00eech\u00e8res.'
            : 'Cycle saisonnier actif. Les prix suivent le calendrier cultural r\u00e9gional avec des variations de \u00b120-30% selon les p\u00e9riodes.',
        impact: 'Impact : +10-25%',
        severity: 'high',
        impactClass: 'high'
      },
      {
        icon: '\ud83d\udcdc', title: 'POLITIQUE COMMERCIALE',
        desc: cName + ' : lev\u00e9e de l\'interdiction d\'export sur les c\u00e9r\u00e9ales (juin 2025). TEC CEDEAO appliqu\u00e9. Taxes \u00e0 l\'export variables selon produits.',
        impact: 'Impact : -5-10%',
        severity: 'medium',
        impactClass: 'medium'
      },
      {
        icon: '\ud83c\udfdb\ufe0f', title: 'POLITIQUE & R\u00c9GLEMENTATION',
        desc: 'Subvention engrais ' + cName + ' : -15% vs 2024 (budget r\u00e9duit). Nouveau d\u00e9cret sur les stocks strat\u00e9giques en discussion. Programme semences certifi\u00e9es : couverture 23% des producteurs.',
        impact: 'Impact : +3-6%',
        severity: 'medium',
        impactClass: 'medium'
      }
    ];

    container.innerHTML = factors.map(function(f) {
      return '<div class="factor-card severity-' + f.severity + '">'
        + '<div class="factor-header">'
        + '<span class="f-icon">' + f.icon + '</span>'
        + '<span class="f-title">' + f.title + '</span>'
        + '</div>'
        + '<div class="factor-desc">' + f.desc + '</div>'
        + '<span class="factor-impact ' + f.impactClass + '">' + f.impact + '</span>'
        + '</div>';
    }).join('');
  }

  // =========================================================================
  // buildNews — generate news feed items
  // =========================================================================
  function buildNews(cultureName, cName, currentPrice, momChange) {
    var container = document.getElementById('newsFeed');
    if (!container) return;

    var mom = parseFloat(momChange);
    var priceStr = currentPrice.toLocaleString('fr-FR');
    var direction = mom >= 0 ? 'hausse' : 'baisse';

    var newsItems = [
      {
        dot: 'critical',
        tag: 'ALERTE PRIX', tagClass: 'critical',
        date: 'Il y a 2h',
        text: cultureName + ' en ' + direction + ' de ' + Math.abs(mom).toFixed(1) + '% sur le march\u00e9 de ' + cName + '. Le prix atteint ' + priceStr + ' FCFA/kg, port\u00e9 par la demande pr\u00e9-soudure et les perturbations logistiques r\u00e9gionales.',
        source: 'SIM / RESIMAO'
      },
      {
        dot: 'warning',
        tag: 'CLIMAT', tagClass: 'warning',
        date: 'Il y a 5h',
        text: 'D\u00e9ficit pluviom\u00e9trique confirm\u00e9 sur le Sahel central. NOAA et FEWS NET confirment un d\u00e9ficit de 23% des pr\u00e9cipitations. Risque accru de soudure difficile dans le corridor Niger-Burkina-Mali.',
        source: 'FEWS NET / NOAA'
      },
      {
        dot: 'positive',
        tag: 'COMMERCE', tagClass: 'positive',
        date: 'Il y a 8h',
        text: 'CEDEAO : lev\u00e9e officielle des restrictions sur les exportations c\u00e9r\u00e9ali\u00e8res. Les \u00c9tats membres ont act\u00e9 la lev\u00e9e progressive des interdictions d\'export. Impact attendu sur les flux transfrontaliers d\u00e8s le prochain trimestre.',
        source: 'Commission CEDEAO'
      },
      {
        dot: 'critical',
        tag: 'STOCKS', tagClass: 'critical',
        date: 'Il y a 12h',
        text: 'R\u00e9serves strat\u00e9giques \u00e0 69% de l\'objectif dans la zone UEMOA. Le RESOGEST signale des niveaux de stocks en de\u00e7\u00e0 des cibles dans 5 pays sur 8.',
        source: 'RESOGEST / CILSS'
      },
      {
        dot: 'warning',
        tag: 'LOGISTIQUE', tagClass: 'warning',
        date: 'Hier',
        text: 'Co\u00fbts de transport : +12% sur le corridor Cotonou-Niamey. Hausse du fret routier li\u00e9e au prix du carburant et aux contr\u00f4les renforc\u00e9s. Temps de transit moyen pass\u00e9 \u00e0 5,2 jours.',
        source: 'Conseil des Chargeurs'
      }
    ];

    container.innerHTML = newsItems.map(function(n) {
      return '<div class="news-item">'
        + '<div class="news-dot ' + n.dot + '"></div>'
        + '<div class="news-content">'
        + '<div class="news-tag ' + n.tagClass + '">' + n.tag + '</div>'
        + '<div class="news-date">' + n.date + '</div>'
        + '<div class="news-text">' + n.text + '</div>'
        + '<div class="news-source">Source : ' + n.source + '</div>'
        + '</div></div>';
    }).join('');
  }

  // =========================================================================
  // buildRecommendations — simulated mode recommendation card
  // =========================================================================
  function buildRecommendations(cultureName, cName, currentPrice, momChange, yoyChange, vol, forecast, bestSell, data) {
    var container = document.getElementById('recoCard');
    if (!container) return;

    var mom = parseFloat(momChange);
    var yoy = parseFloat(yoyChange);
    var priceStr = currentPrice.toLocaleString('fr-FR');

    // Determine action
    var action, actionClass, confidence;
    if (mom > 3 && yoy > 10) {
      action = 'STOCKER';
      actionClass = 'stocker';
      confidence = Math.min(92, 70 + Math.round(mom) + Math.round(vol / 5));
    } else if (mom < -3) {
      action = 'ACHETER';
      actionClass = 'acheter';
      confidence = Math.min(88, 65 + Math.abs(Math.round(mom)));
    } else {
      action = 'VENDRE';
      actionClass = 'vendre';
      confidence = Math.min(85, 60 + Math.round(vol / 3));
    }

    // Forecast prices
    var f30 = forecast.length > 0 ? forecast[0] : currentPrice;
    var f90 = forecast.length > 2 ? forecast[2] : currentPrice;
    var f30Pct = ((f30 - currentPrice) / currentPrice * 100).toFixed(1);
    var f90Pct = ((f90 - currentPrice) / currentPrice * 100).toFixed(1);

    // Action badge colors
    var actionColors = {
      stocker: 'background:rgba(212,160,23,.2);color:' + COLORS.accent,
      vendre:  'background:rgba(231,111,81,.2);color:' + COLORS.alert,
      acheter: 'background:rgba(16,185,129,.2);color:' + COLORS.green
    };

    // Signal cards
    var signals = [
      {
        label: 'TENDANCE',
        icon: '\ud83d\udcc8',
        title: mom >= 0 ? 'Tendance haussi\u00e8re' : 'Tendance baissi\u00e8re',
        detail: 'Variation mensuelle : ' + (mom >= 0 ? '+' : '') + momChange + '%. Variation annuelle : ' + (yoy >= 0 ? '+' : '') + yoyChange + '%.',
        impact: mom > 5 ? 'haussier' : mom < -5 ? 'baissier' : 'neutre'
      },
      {
        label: 'SAISONNALIT\u00c9',
        icon: '\ud83d\udcc5',
        title: 'P\u00e9riode pr\u00e9-soudure',
        detail: 'Historiquement : hausse de +40 \u00e0 +80% entre mars et juillet. Meilleur mois de vente : ' + bestSell + '.',
        impact: 'haussier'
      },
      {
        label: 'ARBITRAGE',
        icon: '\ud83d\udcb1',
        title: 'Arbitrage r\u00e9gional possible',
        detail: '\u00c9carts de prix de 15-25% entre pays UEMOA. Opportunit\u00e9 de n\u00e9goce transfrontalier si logistique ma\u00eetris\u00e9e.',
        impact: 'haussier'
      },
      {
        label: 'M\u00c9T\u00c9O',
        icon: '\ud83c\udf27\ufe0f',
        title: 'D\u00e9ficit pluviom\u00e9trique',
        detail: 'Pr\u00e9cipitations -23% vs normale. Risque de semis tardifs impactant la prochaine r\u00e9colte.',
        impact: vol > 20 ? 'haussier' : 'neutre'
      }
    ];

    var signalsHTML = signals.map(function(s) {
      var impactLabel = s.impact === 'haussier' ? '\u25b2 HAUSSIER' : s.impact === 'baissier' ? '\u25bc BAISSIER' : '\u25cf NEUTRE';
      var impactStyle = s.impact === 'haussier'
        ? 'background:rgba(231,111,81,.15);color:' + COLORS.alert
        : s.impact === 'baissier'
          ? 'background:rgba(16,185,129,.15);color:' + COLORS.green
          : 'background:rgba(148,163,184,.15);color:#94a3b8';
      return '<div style="display:flex;gap:12px;background:rgba(255,255,255,.06);border-radius:8px;padding:12px;margin-bottom:8px">'
        + '<div style="text-transform:uppercase;font-size:11px;font-weight:700;padding:4px 8px;border-radius:4px;height:fit-content;white-space:nowrap;' + impactStyle + '">' + impactLabel + '</div>'
        + '<div style="flex:1">'
        + '<div style="font-weight:700;font-size:14px;margin-bottom:4px">' + s.icon + ' ' + s.title + '</div>'
        + '<div style="font-size:13px;opacity:.85;margin-bottom:4px">' + s.detail + '</div>'
        + '<div style="font-size:11px;opacity:.5;font-style:italic">Source : Donn\u00e9es simul\u00e9es / Mod\u00e8le AgroPrix</div>'
        + '</div></div>';
    }).join('');

    // Strategy text
    var strategy;
    if (action === 'STOCKER') {
      strategy = 'Conserver le stock actuel et diff\u00e9rer la vente de ' + cultureName.toLowerCase()
        + ' jusqu\'\u00e0 la p\u00e9riode de soudure (mai-juillet). Contexte de stocks d\u00e9ficitaires et soudure imminente favorable \u00e0 une hausse de +15 \u00e0 +25%. '
        + 'Strat\u00e9gie : vente progressive par tiers \u2014 1/3 en mai si le prix d\u00e9passe '
        + Math.round(currentPrice * 1.15).toLocaleString('fr-FR') + ' FCFA, 1/3 en juin-juillet au pic, 1/3 en r\u00e9serve.';
    } else if (action === 'ACHETER') {
      strategy = 'Opportunit\u00e9 d\'achat sur ' + cultureName.toLowerCase() + ' \u00e0 ' + priceStr
        + ' FCFA/kg, en dessous de la moyenne mobile 3 mois. Constituer un stock progressif sur 2-3 semaines. '
        + 'Objectif de revente : p\u00e9riode de soudure pour une marge potentielle de +20-35%.';
    } else {
      strategy = 'Vendre progressivement le ' + cultureName.toLowerCase() + ' sur les 4-6 prochaines semaines. '
        + 'Le prix actuel de ' + priceStr + ' FCFA/kg int\u00e8gre d\u00e9j\u00e0 une partie de la prime de soudure. '
        + 'Strat\u00e9gie : vendre 50% imm\u00e9diatement, 30% sous 3 semaines, conserver 20% en couverture.';
    }

    // Forecast cards
    var forecastHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px">'
      + _forecastCard('Pr\u00e9vision J+30', f30, f30Pct)
      + _forecastCard('Pr\u00e9vision J+90', f90, f90Pct)
      + '<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;text-align:center">'
      + '<div style="font-size:11px;opacity:.5;text-transform:uppercase;margin-bottom:8px">Pic saisonnier</div>'
      + '<div style="font-size:18px;font-weight:700">' + bestSell + '</div>'
      + '<div style="font-size:13px;opacity:.6">Meilleur mois de vente</div></div>'
      + '</div>';

    // Build full card
    container.innerHTML = '<div style="background:rgba(255,255,255,.03);border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,.08)">'
      // Header
      + '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">'
      + '<span class="reco-badge ' + actionClass + '" style="padding:8px 20px;border-radius:8px;font-weight:900;font-size:20px;letter-spacing:1px;' + actionColors[actionClass] + '">' + action + '</span>'
      + '<div>'
      + '<div style="font-size:18px;font-weight:700">' + cultureName + ' \u2014 ' + cName + '</div>'
      + '<div style="font-size:13px;opacity:.6">Confiance indicative : ' + confidence + '% \u00b7 Horizon : 90 jours \u00b7 Mode d\u00e9grad\u00e9 (API recommendations indisponible)</div>'
      + '</div></div>'
      // Strategy
      + '<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.7;opacity:.9">'
      + '\ud83c\udfaf ' + strategy + '</div>'
      // Signals
      + '<div style="margin:16px 0">' + signalsHTML + '</div>'
      // Forecasts
      + forecastHTML
      + '</div>';
  }

  // =========================================================================
  // buildRecommendationsAPI — fetch and display real API recommendations
  // =========================================================================
  async function buildRecommendationsAPI(country, culture, cultureName, cName, currentPrice, momChange, yoyChange, vol, forecast, bestSell, data) {
    var container = document.getElementById('recoCard');
    if (!container) return;

    try {
      var json = await AP.api.fetchRecommendations(country, culture);
      var reco = json.recommendation;
      var recoData = json.data;

      if (!reco || !reco.action) throw new Error('No recommendation');

      var actionClass = reco.action === 'STOCKER' ? 'stocker' : reco.action === 'VENDRE' ? 'vendre' : 'acheter';
      var actionColors = {
        stocker: 'background:rgba(212,160,23,.2);color:' + COLORS.accent,
        vendre:  'background:rgba(231,111,81,.2);color:' + COLORS.alert,
        acheter: 'background:rgba(16,185,129,.2);color:' + COLORS.green
      };

      // Build signals HTML from API
      var signalsHTML = reco.signals.map(function(s) {
        var impactLabel = s.impact === 'positif' ? '\u25b2 HAUSSIER' : s.impact === 'n\u00e9gatif' ? '\u25bc BAISSIER' : '\u25cf NEUTRE';
        var impactStyle = s.impact === 'positif'
          ? 'background:rgba(231,111,81,.15);color:' + COLORS.alert
          : s.impact === 'n\u00e9gatif'
            ? 'background:rgba(16,185,129,.15);color:' + COLORS.green
            : 'background:rgba(148,163,184,.15);color:#94a3b8';
        return '<div style="display:flex;gap:12px;background:rgba(255,255,255,.06);border-radius:8px;padding:12px;margin-bottom:8px">'
          + '<div style="text-transform:uppercase;font-size:11px;font-weight:700;padding:4px 8px;border-radius:4px;height:fit-content;white-space:nowrap;' + impactStyle + '">' + impactLabel + '</div>'
          + '<div style="flex:1">'
          + '<div style="font-weight:700;font-size:14px;margin-bottom:4px">' + s.signal + '</div>'
          + '<div style="font-size:13px;opacity:.85;margin-bottom:4px">' + s.detail + '</div>'
          + '<div style="font-size:11px;opacity:.5;font-style:italic">Source : Donn\u00e9es r\u00e9elles WFP / NASA / Open-Meteo</div>'
          + '</div></div>';
      }).join('');

      // Forecast prices
      var f30 = forecast.length > 0 ? forecast[0] : currentPrice;
      var f90 = forecast.length > 2 ? forecast[2] : currentPrice;
      var f30Pct = ((f30 - currentPrice) / currentPrice * 100).toFixed(1);
      var f90Pct = ((f90 - currentPrice) / currentPrice * 100).toFixed(1);

      // Seasonality info
      var seasonHTML = '';
      if (recoData.seasonality && recoData.seasonality.peak_month) {
        seasonHTML = '<div style="background:rgba(45,106,79,.06);border-radius:12px;padding:16px;margin:16px 0;border-left:3px solid ' + COLORS.primary + '">'
          + '<div style="font-size:13px;font-weight:700;color:' + COLORS.primary + ';margin-bottom:8px">\ud83d\udcc5 Saisonnalit\u00e9 historique</div>'
          + '<div style="font-size:13px;opacity:.85">Pic des prix en <strong>' + recoData.seasonality.peak_month + '</strong> ('
          + recoData.seasonality.peak_price + ' FCFA/kg en moyenne). Creux en <strong>'
          + recoData.seasonality.trough_month + '</strong> (' + recoData.seasonality.trough_price + ' FCFA/kg).</div>'
          + '</div>';
      }

      // Arbitrage info
      var arbitrageHTML = '';
      if (recoData.arbitrage && recoData.arbitrage.opportunity) {
        arbitrageHTML = '<div style="background:rgba(16,185,129,.06);border-radius:12px;padding:16px;margin:16px 0;border-left:3px solid ' + COLORS.green + '">'
          + '<div style="font-size:13px;font-weight:700;color:' + COLORS.green + ';margin-bottom:8px">\ud83d\udcb1 Arbitrage r\u00e9gional</div>'
          + '<div style="font-size:13px;opacity:.85">Le m\u00eame produit se vend <strong>+'
          + recoData.arbitrage.diff_pct + '%</strong> plus cher en <strong>'
          + recoData.arbitrage.best_country + '</strong> ('
          + recoData.arbitrage.best_price + ' FCFA/kg vs '
          + recoData.arbitrage.local_price + ' FCFA/kg ici).</div>'
          + '</div>';
      }

      // Forecast cards
      var forecastHTML = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px">'
        + _forecastCard('Pr\u00e9vision J+30', f30, f30Pct)
        + _forecastCard('Pr\u00e9vision J+90', f90, f90Pct)
        + '<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;text-align:center">'
        + '<div style="font-size:11px;opacity:.5;text-transform:uppercase;margin-bottom:8px">Pic saisonnier</div>'
        + '<div style="font-size:18px;font-weight:700">' + (recoData.seasonality ? recoData.seasonality.peak_month : bestSell) + '</div>'
        + '<div style="font-size:13px;opacity:.6">Meilleur mois de vente</div></div>'
        + '</div>';

      container.innerHTML = '<div style="background:rgba(255,255,255,.03);border-radius:16px;padding:28px;border:1px solid rgba(255,255,255,.08)">'
        + '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">'
        + '<span style="padding:8px 20px;border-radius:8px;font-weight:900;font-size:20px;letter-spacing:1px;' + actionColors[actionClass] + '">' + reco.action + '</span>'
        + '<div>'
        + '<div style="font-size:18px;font-weight:700">' + cultureName + ' \u2014 ' + cName + '</div>'
        + '<div style="font-size:13px;opacity:.6">Confiance : ' + reco.confidence + ' \u00b7 ' + reco.signals_count + ' signaux analys\u00e9s \u00b7 Donn\u00e9es r\u00e9elles WFP</div>'
        + '</div></div>'
        + '<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.7;opacity:.9">' + reco.summary + '</div>'
        + '<div style="margin:16px 0">' + signalsHTML + '</div>'
        + seasonHTML
        + arbitrageHTML
        + forecastHTML
        + '</div>';


    } catch (e) {
      buildRecommendations(cultureName, cName, currentPrice, momChange, yoyChange, vol, forecast, bestSell, data);
    }
  }

  // =========================================================================
  // Helper: forecast card HTML
  // =========================================================================
  function _forecastCard(label, price, pct) {
    var pctNum = parseFloat(pct);
    var color = pctNum >= 0 ? COLORS.green : COLORS.alert;
    return '<div style="background:rgba(255,255,255,.04);border-radius:12px;padding:16px;text-align:center">'
      + '<div style="font-size:11px;opacity:.5;text-transform:uppercase;margin-bottom:8px">' + label + '</div>'
      + '<div style="font-size:22px;font-weight:700">' + price.toLocaleString('fr-FR') + ' <span style="font-size:13px;opacity:.6">FCFA</span></div>'
      + '<div style="font-size:13px;color:' + color + '">' + (pctNum >= 0 ? '+' : '') + pct + '%</div>'
      + '</div>';
  }

  // =========================================================================
  // Helper: hex color to rgba string
  // =========================================================================
  function _hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // =========================================================================
  // Expose on AP namespace and as globals
  // =========================================================================
  AP.analysis = {
    launchAnalysis: launchAnalysis,
    destroyCharts: destroyCharts
  };

  // Global for onclick in HTML
  window.launchAnalysis = launchAnalysis;

})(window.AgroPrix);
