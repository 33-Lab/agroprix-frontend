// AgroPrix API Module
(function(AP) {

  // Check backend availability on load
  function checkAPI() {
    fetch(AP.API_BASE + '/', { method: 'GET', signal: AbortSignal.timeout(3000) })
      .then(function(r) { if (r.ok) { AP.API_AVAILABLE = true; console.log('[AgroPrix] Backend API connecté ✓'); } })
      .catch(function() { AP.API_AVAILABLE = false; console.log('[AgroPrix] Backend non disponible — mode données simulées'); });
  }

  // Convert period key to start date string
  function periodToStartDate(periodKey) {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1;
    switch (periodKey) {
      case '12m': return (y - 1) + '-' + String(m).padStart(2, '0') + '-01';
      case '3y':  return (y - 3) + '-' + String(m).padStart(2, '0') + '-01';
      case '5y':  return (y - 5) + '-' + String(m).padStart(2, '0') + '-01';
      case '10y': return (y - 10) + '-' + String(m).padStart(2, '0') + '-01';
      default:    return (y - 1) + '-01-01';
    }
  }

  // Fetch monthly prices
  async function fetchPrices(country, commodity, periodKey) {
    var wfpName = AP.cultureToWFP[commodity] || commodity;
    var startDate = periodToStartDate(periodKey);
    var url = AP.API_BASE + '/api/prices/monthly?country=' + country + '&commodity=' + encodeURIComponent(wfpName) + '&start_date=' + startDate;
    var resp = await fetch(url);
    var json = await resp.json();
    return json.data || [];
  }

  // Fetch markets for map
  async function fetchMarkets(country) {
    var resp = await fetch(AP.API_BASE + '/api/prices/markets?country=' + country);
    var json = await resp.json();
    return json.data || [];
  }

  // Fetch regional comparison
  async function fetchCompare(commodity) {
    var wfpName = AP.cultureToWFP[commodity] || commodity;
    var resp = await fetch(AP.API_BASE + '/api/prices/compare?commodity=' + encodeURIComponent(wfpName));
    var json = await resp.json();
    return json.data || [];
  }

  // Fetch weather forecast
  async function fetchForecast(country) {
    var resp = await fetch(AP.API_BASE + '/api/weather/forecast?country=' + country);
    return resp.json();
  }

  // Fetch recommendations
  async function fetchRecommendations(country, commodity) {
    var wfpName = AP.cultureToWFP[commodity] || commodity;
    var resp = await fetch(AP.API_BASE + '/api/recommendations/?country=' + country + '&commodity=' + encodeURIComponent(wfpName));
    return resp.json();
  }

  // Expose
  AP.api = {
    checkAPI: checkAPI,
    periodToStartDate: periodToStartDate,
    fetchPrices: fetchPrices,
    fetchMarkets: fetchMarkets,
    fetchCompare: fetchCompare,
    fetchForecast: fetchForecast,
    fetchRecommendations: fetchRecommendations
  };

})(window.AgroPrix);
