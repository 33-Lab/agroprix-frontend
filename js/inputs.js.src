// AgroPrix — Module Prix Intrants (crowdsourced)
// Saisie, historique et comparaison des prix des intrants agricoles
(function(AP) {
  'use strict';

  var STORAGE_KEY = 'agroprix_input_prices';
  var currentCategory = 'engrais';
  var currentTab = 'saisie'; // saisie, historique, compare

  // Catalog embarqué en inline — chargement instantané, pas de fetch
  var catalog = {"categories":[{"id":"engrais","name":"Engrais","emoji":"🧪","items":[{"id":"npk_15_15_15","name":"NPK 15-15-15","unit":"sac 50kg","crops":["mais","riz_local","sorgho","mil","oignon","tomate"]},{"id":"uree_46","name":"Urée 46%","unit":"sac 50kg","crops":["mais","riz_local","sorgho","mil","oignon"]},{"id":"dap","name":"DAP 18-46-0","unit":"sac 50kg","crops":["mais","riz_local","arachide","niebe"]},{"id":"kcl","name":"KCl (Chlorure de potassium)","unit":"sac 50kg","crops":["cacao","cafe","manioc","igname"]},{"id":"npk_10_18_18","name":"NPK 10-18-18","unit":"sac 50kg","crops":["cacao","cafe","cajou"]},{"id":"npk_0_23_19","name":"NPK 0-23-19","unit":"sac 50kg","crops":["cacao"]},{"id":"fumure_organique","name":"Fumure organique / Compost","unit":"sac 50kg","crops":[]},{"id":"sulfate_ammonium","name":"Sulfate d'ammonium","unit":"sac 50kg","crops":["riz_local","mais"]}]},{"id":"semences","name":"Semences","emoji":"🌱","items":[{"id":"sem_mais_hybride","name":"Maïs hybride (certifié)","unit":"kg","crops":["mais"]},{"id":"sem_mais_local","name":"Maïs local","unit":"kg","crops":["mais"]},{"id":"sem_riz_nerica","name":"Riz NERICA","unit":"kg","crops":["riz_local"]},{"id":"sem_riz_sahel","name":"Riz Sahel (irrigué)","unit":"kg","crops":["riz_local"]},{"id":"sem_niebe","name":"Niébé amélioré","unit":"kg","crops":["niebe"]},{"id":"sem_arachide","name":"Arachide (certifié)","unit":"kg","crops":["arachide"]},{"id":"sem_sorgho","name":"Sorgho amélioré","unit":"kg","crops":["sorgho"]},{"id":"sem_tomate","name":"Tomate (sachet)","unit":"sachet","crops":["tomate"]},{"id":"sem_oignon","name":"Oignon (sachet)","unit":"sachet","crops":["oignon"]},{"id":"sem_piment","name":"Piment (sachet)","unit":"sachet","crops":["piment"]},{"id":"sem_manioc","name":"Boutures manioc","unit":"botte","crops":["manioc"]},{"id":"plants_cacao","name":"Plants cacao (pépinière)","unit":"plant","crops":["cacao"]},{"id":"plants_cafe","name":"Plants café","unit":"plant","crops":["cafe"]},{"id":"plants_cajou","name":"Plants anacardier","unit":"plant","crops":["cajou"]}]},{"id":"phyto","name":"Phytosanitaires","emoji":"🛡️","items":[{"id":"herbicide_glypho","name":"Glyphosate (herbicide total)","unit":"litre","crops":[]},{"id":"herbicide_selectif","name":"Herbicide sélectif maïs/riz","unit":"litre","crops":["mais","riz_local"]},{"id":"insecticide_lambda","name":"Lambda-cyhalothrine (insecticide)","unit":"litre","crops":[]},{"id":"fongicide_mancozeb","name":"Mancozèbe (fongicide)","unit":"sachet","crops":["tomate","cacao","cafe"]},{"id":"insecticide_bio","name":"Insecticide biologique (neem)","unit":"litre","crops":[]},{"id":"fongicide_cuivre","name":"Bouillie bordelaise (cuivre)","unit":"kg","crops":["cacao","cafe","tomate"]},{"id":"raticide","name":"Raticide","unit":"sachet","crops":[]}]},{"id":"equipement","name":"Équipement & Services","emoji":"🚜","items":[{"id":"location_tracteur","name":"Location tracteur + labour","unit":"hectare","crops":[]},{"id":"location_motopompe","name":"Location motopompe","unit":"jour","crops":[]},{"id":"pulverisateur","name":"Pulvérisateur à dos","unit":"pièce","crops":[]},{"id":"sac_jute","name":"Sacs jute/polypropylène","unit":"lot de 100","crops":[]},{"id":"bache","name":"Bâche de séchage","unit":"pièce","crops":[]},{"id":"filet_ombrage","name":"Filet d'ombrage (pépinière)","unit":"rouleau","crops":["tomate","piment","cacao"]},{"id":"tuyau_irrigation","name":"Tuyau irrigation goutte-à-goutte","unit":"rouleau 100m","crops":["tomate","oignon","piment"]}]}]};

  // =========================================================================
  // Load catalog (returns resolved promise — catalog already in memory)
  // =========================================================================
  function loadCatalog() {
    return Promise.resolve(catalog);
  }

  // =========================================================================
  // Storage helpers
  // =========================================================================
  function getPriceHistory() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e) { return []; }
  }

  function savePriceEntry(entry) {
    var history = getPriceHistory();
    history.unshift(entry);
    // Keep last 500 entries
    if (history.length > 500) history = history.slice(0, 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }

  // =========================================================================
  // Get user country & markets
  // =========================================================================
  function getUserCountry() {
    var user = AP.auth ? AP.auth.getUser() : null;
    return (user && (user.pays || user.country)) || 'benin';
  }

  function getMarkets() {
    var country = getUserCountry();
    return (AP.marketsByCountry && AP.marketsByCountry[country]) || [];
  }

  function getCountryName() {
    var country = getUserCountry();
    return AP.countryMeta && AP.countryMeta[country] ? AP.countryMeta[country].name : country;
  }

  // =========================================================================
  // Format helpers
  // =========================================================================
  function formatFCFA(n) {
    if (!n) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  }

  function formatDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    var months = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function timeAgo(iso) {
    var diff = Date.now() - new Date(iso).getTime();
    var hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Il y a moins d\'1h';
    if (hours < 24) return 'Il y a ' + hours + 'h';
    var days = Math.floor(hours / 24);
    if (days < 7) return 'Il y a ' + days + 'j';
    return formatDate(iso);
  }

  // =========================================================================
  // Render main view
  // =========================================================================
  function render() {
    if (!catalog) return;

    var html = '';

    // Tabs
    html += '<div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border);">';
    [
      { id: 'saisie', label: '<i data-lucide="file-text" class="lc"></i> Saisir un prix', icon: '' },
      { id: 'historique', label: '<i data-lucide="bar-chart-3" class="lc"></i> Historique', icon: '' },
      { id: 'compare', label: '<i data-lucide="zap" class="lc"></i> Comparer', icon: '' }
    ].forEach(function(t) {
      var active = currentTab === t.id;
      html += '<button onclick="AgroPrix.inputs.setTab(\'' + t.id + '\')" style="flex:1;padding:10px;font-size:13px;font-weight:' + (active ? '700' : '500') + ';color:' + (active ? 'var(--green)' : 'var(--text-light)') + ';background:none;border:none;border-bottom:' + (active ? '3px solid var(--green)' : '3px solid transparent') + ';cursor:pointer;font-family:inherit;">' + t.label + '</button>';
    });
    html += '</div>';

    if (currentTab === 'saisie') html += renderSaisie();
    else if (currentTab === 'historique') html += renderHistorique();
    else if (currentTab === 'compare') html += renderCompare();

    var container = document.getElementById('inputsContent');
    if (container) container.innerHTML = html;
  }

  // =========================================================================
  // Tab: Saisie
  // =========================================================================
  function renderSaisie() {
    var markets = getMarkets();
    var html = '';

    // Category selector
    html += '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">';
    catalog.categories.forEach(function(cat) {
      var active = currentCategory === cat.id;
      html += '<button onclick="AgroPrix.inputs.setCategory(\'' + cat.id + '\')" style="padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;border:1.5px solid ' + (active ? 'var(--green)' : 'var(--border)') + ';background:' + (active ? 'var(--green)' : '#fff') + ';color:' + (active ? '#fff' : 'var(--text)') + ';cursor:pointer;font-family:inherit;">' + cat.emoji + ' ' + cat.name + '</button>';
    });
    html += '</div>';

    // Input items for selected category
    var cat = catalog.categories.find(function(c) { return c.id === currentCategory; });
    if (!cat) return html;

    html += '<div class="card" style="padding:16px;">'
      + '<div class="card-title"><span class="icon">' + cat.emoji + '</span> Saisir un prix — ' + cat.name + '</div>'
      + '<p style="font-size:12px;color:var(--text-light);margin-bottom:12px;">Renseignez le prix que vous avez paye. Vos donnees aident tous les producteurs!</p>';

    // Product select
    html += '<div class="form-group" style="margin-bottom:12px;">'
      + '<label class="form-label" style="font-weight:600;">Produit</label>'
      + '<select id="inputProduct" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">';
    cat.items.forEach(function(item) {
      html += '<option value="' + item.id + '">' + item.name + ' (' + item.unit + ')</option>';
    });
    html += '</select></div>';

    // Price
    html += '<div class="form-group" style="margin-bottom:12px;">'
      + '<label class="form-label" style="font-weight:600;">Prix paye (FCFA)</label>'
      + '<input type="number" id="inputPrice" placeholder="Ex: 18500" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;" min="0">'
      + '</div>';

    // Market + Date row
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">';
    // Market
    html += '<div class="form-group">'
      + '<label class="form-label" style="font-weight:600;">Lieu d\'achat</label>'
      + '<select id="inputMarket" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">';
    markets.forEach(function(m) {
      html += '<option value="' + m.name + '">' + m.name + '</option>';
    });
    html += '<option value="autre">Autre</option>';
    html += '</select></div>';
    // Date
    html += '<div class="form-group">'
      + '<label class="form-label" style="font-weight:600;">Date</label>'
      + '<input type="date" id="inputDate" value="' + new Date().toISOString().split('T')[0] + '" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">'
      + '</div></div>';

    // Supplier (optional)
    html += '<div class="form-group" style="margin-bottom:16px;">'
      + '<label class="form-label" style="font-weight:600;">Fournisseur <span style="color:var(--text-muted);font-weight:400;">(optionnel)</span></label>'
      + '<input type="text" id="inputSupplier" placeholder="Nom du fournisseur" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-family:inherit;">'
      + '</div>';

    // Submit
    html += '<button class="btn-analyse" style="width:100%;font-size:14px;padding:12px;" onclick="AgroPrix.inputs.submitPrice()">'
      + '<i data-lucide="save" class="lc"></i> Enregistrer ce prix</button>';

    // Success message placeholder
    html += '<div id="inputSuccess" style="display:none;margin-top:12px;padding:10px;background:#d1fae5;border-radius:8px;text-align:center;font-size:13px;color:#1B4332;font-weight:600;"></div>';

    html += '</div>';

    // Recent entries (last 5)
    var history = getPriceHistory();
    var recentForCat = history.filter(function(e) { return e.category === currentCategory; }).slice(0, 5);

    if (recentForCat.length > 0) {
      html += '<div class="card" style="padding:16px;margin-top:16px;">'
        + '<div class="card-title"><span class="icon">🕐</span> Derniers prix saisis — ' + cat.name + '</div>';
      recentForCat.forEach(function(e) {
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">'
          + '<div>'
          + '<div style="font-size:13px;font-weight:600;">' + e.productName + '</div>'
          + '<div style="font-size:11px;color:var(--text-light);">' + e.market + ' — ' + timeAgo(e.date) + '</div>'
          + '</div>'
          + '<div style="font-size:14px;font-weight:700;color:var(--green);">' + formatFCFA(e.price) + '</div>'
          + '</div>';
      });
      html += '</div>';
    }

    return html;
  }

  // =========================================================================
  // Tab: Historique
  // =========================================================================
  function renderHistorique() {
    var history = getPriceHistory();
    var html = '';

    if (history.length === 0) {
      html += '<div class="card" style="padding:32px;text-align:center;">'
        + '<div style="font-size:48px;margin-bottom:12px;"><i data-lucide="bar-chart-3" class="lc"></i></div>'
        + '<h3 style="color:var(--text-light);">Aucune donnee</h3>'
        + '<p style="font-size:13px;color:var(--text-muted);">Saisissez des prix d\'intrants pour voir l\'historique.</p>'
        + '</div>';
      return html;
    }

    // Stats
    var totalEntries = history.length;
    var categories = {};
    history.forEach(function(e) {
      categories[e.category] = (categories[e.category] || 0) + 1;
    });

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:16px;">';
    html += '<div class="card" style="padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;color:var(--green);">' + totalEntries + '</div><div style="font-size:11px;color:var(--text-light);">Prix saisis</div></div>';
    Object.keys(categories).forEach(function(catId) {
      var cat = catalog.categories.find(function(c) { return c.id === catId; });
      html += '<div class="card" style="padding:12px;text-align:center;"><div style="font-size:24px;font-weight:800;">' + categories[catId] + '</div><div style="font-size:11px;color:var(--text-light);">' + (cat ? cat.emoji + ' ' + cat.name : catId) + '</div></div>';
    });
    html += '</div>';

    // Full history list
    html += '<div class="card" style="padding:16px;">'
      + '<div class="card-title"><span class="icon"><i data-lucide="clipboard-list" class="lc"></i></span> Tous les prix saisis</div>';
    history.slice(0, 30).forEach(function(e) {
      var cat = catalog.categories.find(function(c) { return c.id === e.category; });
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">'
        + '<div>'
        + '<div style="font-size:13px;font-weight:600;">' + (cat ? cat.emoji : '') + ' ' + e.productName + '</div>'
        + '<div style="font-size:11px;color:var(--text-light);">' + e.market + ' — ' + formatDate(e.date) + (e.supplier ? ' — ' + e.supplier : '') + '</div>'
        + '</div>'
        + '<div style="font-size:14px;font-weight:700;color:var(--green);">' + formatFCFA(e.price) + '</div>'
        + '</div>';
    });
    if (history.length > 30) {
      html += '<p style="text-align:center;font-size:12px;color:var(--text-muted);margin-top:8px;">... et ' + (history.length - 30) + ' autres</p>';
    }
    html += '</div>';

    return html;
  }

  // =========================================================================
  // Tab: Compare
  // =========================================================================
  function renderCompare() {
    var history = getPriceHistory();
    var html = '';

    if (history.length < 2) {
      html += '<div class="card" style="padding:32px;text-align:center;">'
        + '<div style="font-size:48px;margin-bottom:12px;"><i data-lucide="zap" class="lc"></i></div>'
        + '<h3 style="color:var(--text-light);">Pas assez de donnees</h3>'
        + '<p style="font-size:13px;color:var(--text-muted);">Saisissez au moins 2 prix du meme intrant pour comparer.</p>'
        + '</div>';
      return html;
    }

    // Group by product
    var byProduct = {};
    history.forEach(function(e) {
      if (!byProduct[e.productId]) byProduct[e.productId] = { name: e.productName, category: e.category, entries: [] };
      byProduct[e.productId].entries.push(e);
    });

    // Show products with multiple entries
    var comparables = Object.keys(byProduct).filter(function(k) { return byProduct[k].entries.length >= 2; });

    if (comparables.length === 0) {
      html += '<div class="card" style="padding:32px;text-align:center;">'
        + '<div style="font-size:48px;margin-bottom:12px;"><i data-lucide="zap" class="lc"></i></div>'
        + '<h3 style="color:var(--text-light);">Pas de comparaison possible</h3>'
        + '<p style="font-size:13px;color:var(--text-muted);">Saisissez le meme intrant dans differents marches pour comparer.</p>'
        + '</div>';
      return html;
    }

    comparables.forEach(function(productId) {
      var prod = byProduct[productId];
      var entries = prod.entries.sort(function(a, b) { return a.price - b.price; });
      var minPrice = entries[0].price;
      var maxPrice = entries[entries.length - 1].price;
      var avgPrice = Math.round(entries.reduce(function(s, e) { return s + e.price; }, 0) / entries.length);
      var diff = maxPrice - minPrice;
      var diffPct = Math.round((diff / minPrice) * 100);

      var cat = catalog.categories.find(function(c) { return c.id === prod.category; });

      html += '<div class="card" style="padding:16px;margin-bottom:12px;">'
        + '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">'
        + '<div><div style="font-size:15px;font-weight:700;">' + (cat ? cat.emoji : '') + ' ' + prod.name + '</div>'
        + '<div style="font-size:12px;color:var(--text-light);">' + entries.length + ' prix saisis</div></div>';

      if (diffPct > 10) {
        html += '<div style="background:#fef3c7;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;color:#b45309;">-' + diffPct + '% possible</div>';
      }
      html += '</div>';

      // Price bars
      entries.forEach(function(e, idx) {
        var barWidth = maxPrice > 0 ? Math.max(20, Math.round((e.price / maxPrice) * 100)) : 50;
        var barColor = idx === 0 ? 'var(--green)' : (idx === entries.length - 1 ? 'var(--alert)' : 'var(--gold)');
        html += '<div style="margin-bottom:6px;">'
          + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">'
          + '<span style="color:var(--text-light);">' + e.market + '</span>'
          + '<span style="font-weight:700;">' + formatFCFA(e.price) + '</span></div>'
          + '<div style="height:8px;background:var(--bg);border-radius:4px;overflow:hidden;">'
          + '<div style="height:100%;width:' + barWidth + '%;background:' + barColor + ';border-radius:4px;"></div></div>'
          + '</div>';
      });

      // Insight
      if (diffPct > 10) {
        html += '<div style="margin-top:8px;padding:8px;background:#D8F3DC;border-radius:8px;font-size:12px;color:#1B4332;">'
          + '<i data-lucide="lightbulb" class="lc"></i> <strong>' + prod.name + '</strong> est <strong>' + diffPct + '% moins cher</strong> a ' + entries[0].market + ' qu\'a ' + entries[entries.length - 1].market + '.</div>';
      }

      html += '</div>';
    });

    return html;
  }

  // =========================================================================
  // Actions
  // =========================================================================
  function submitPrice() {
    var productEl = document.getElementById('inputProduct');
    var priceEl = document.getElementById('inputPrice');
    var marketEl = document.getElementById('inputMarket');
    var dateEl = document.getElementById('inputDate');
    var supplierEl = document.getElementById('inputSupplier');

    if (!productEl || !priceEl || !priceEl.value) {
      alert('Veuillez renseigner le produit et le prix.');
      return;
    }

    var price = parseInt(priceEl.value);
    if (isNaN(price) || price <= 0) {
      alert('Le prix doit etre un nombre positif.');
      return;
    }

    // Find product name from catalog
    var cat = catalog.categories.find(function(c) { return c.id === currentCategory; });
    var item = cat ? cat.items.find(function(i) { return i.id === productEl.value; }) : null;

    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString(),
      country: getUserCountry(),
      category: currentCategory,
      productId: productEl.value,
      productName: item ? item.name : productEl.value,
      unit: item ? item.unit : '',
      price: price,
      market: marketEl ? marketEl.value : '',
      date: dateEl ? dateEl.value : new Date().toISOString().split('T')[0],
      supplier: supplierEl ? supplierEl.value.trim() : ''
    };

    savePriceEntry(entry);

    // Show success
    var successEl = document.getElementById('inputSuccess');
    if (successEl) {
      successEl.textContent = '<i data-lucide="check-circle" class="lc"></i> Prix enregistre ! ' + entry.productName + ' a ' + formatFCFA(price) + ' (' + entry.market + ')';
      successEl.style.display = 'block';
      setTimeout(function() { successEl.style.display = 'none'; }, 3000);
    }

    // Reset price field
    if (priceEl) priceEl.value = '';
    if (supplierEl) supplierEl.value = '';

    // Re-render to show recent entries
    setTimeout(function() { render(); }, 100);
  }

  function setCategory(catId) {
    currentCategory = catId;
    render();
  }

  function setTab(tabId) {
    currentTab = tabId;
    render();
  }

  // =========================================================================
  // Init
  // =========================================================================
  function init() {
    loadCatalog().then(function() {
      currentTab = 'saisie';
      currentCategory = 'engrais';
      render();
    });
  }

  // =========================================================================
  // Expose
  // =========================================================================
  AP.inputs = {
    init: init,
    setCategory: setCategory,
    setTab: setTab,
    submitPrice: submitPrice
  };

})(window.AgroPrix);
