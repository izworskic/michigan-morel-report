/* Morel hunting opportunity panel.
   Adds context without changing the existing historic north-to-south wave. */
(function () {
  'use strict';
  var wave = document.getElementById('wave');
  var stamp = document.getElementById('wave-stamp');
  if (!wave || !stamp) return;
  var regionList = [
    ['southern-michigan', 'Southern Michigan'],
    ['central-michigan', 'Central Michigan'],
    ['northern-lower', 'Northern Lower'],
    ['eastern-up', 'Eastern UP'],
    ['western-up', 'Western UP']
  ];
  var matches = window.location.pathname.match(/^\/(southern-michigan|central-michigan|northern-lower|eastern-up|western-up)\.html$/);
  var current = matches ? matches[1] : 'central-michigan';
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', "'": '&#39;' }[c];
    });
  }
  var style = document.createElement('style');
  style.textContent =
    '.morel-outlook{max-width:100%;overflow:hidden}' +
    '.morel-outlook-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}' +
    '.morel-outlook select{max-width:100%;min-width:0;border:1px solid #c7baa1;border-radius:8px;padding:9px 28px 9px 10px;background:#fff;color:#2b2419;font:inherit;font-size:14px}' +
    '.morel-outlook .outlook-days{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,162px),1fr));gap:9px;margin-top:14px}' +
    '.morel-outlook .outlook-day{min-width:0;padding:12px;border:1px solid #ded6c5;border-radius:10px;background:#fff}' +
    '.morel-outlook .outlook-day strong{font-size:17px;display:block;margin:3px 0}' +
    '.morel-outlook .outlook-day p{font-size:13px;line-height:1.4;margin:6px 0 0}' +
    '.morel-outlook .outlook-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,145px),1fr));gap:8px;margin:13px 0}' +
    '.morel-outlook .outlook-metric{border:1px solid #e0d8c4;border-radius:9px;padding:9px;background:#f7f5ee;min-width:0}' +
    '.morel-outlook .outlook-metric b{font-size:19px;display:block;font-family:ui-monospace,monospace}' +
    '.morel-outlook .outlook-metric span{font-size:12px;color:#645a48}' +
    '.morel-outlook .outlook-warning{font-size:12.5px;color:#685c45;margin-top:12px}' +
    '.morel-outlook .outlook-day[data-level="Favorable pattern"]{border-color:#9ab47e;background:#f1f6ec}' +
    '.morel-outlook .outlook-day[data-level="Data limited"]{border-color:#d8ab75}' +
    '.morel-outlook details{margin-top:12px;border-top:1px solid #ddd4c2;padding-top:10px;font-size:13px}' +
    '.morel-outlook summary{cursor:pointer;font-weight:600}';
  document.head.appendChild(style);
  var expl = document.createElement('p');
  expl.className = 'note';
  expl.textContent = 'GDD = Growing Degree Days: cumulative daily warmth above 50°F since March 1. The bar compares this year with the 10-year average for the same date. GDD describes seasonal progress, not mushroom probability.';
  stamp.insertAdjacentElement('afterend', expl);
  var panel = document.createElement('section');
  panel.className = 'card morel-outlook';
  panel.setAttribute('aria-label', 'Seven day morel hunting outlook');
  panel.innerHTML =
    '<div class="morel-outlook-head"><div><div class="kicker">New / experimental outlook</div>' +
    '<h2 style="margin:2px 0 4px">When should I look this week?</h2>' +
    '<p class="note" style="margin:0">Observed rain and recent warmth plus the NWS seven-day forecast.</p></div>' +
    '<label for="outlook-region">Weather region <select id="outlook-region">' +
    regionList.map(function (r) { return '<option value="' + r[0] + '">' + r[1] + '</option>'; }).join('') +
    '</select></label></div><div id="outlook-results" aria-live="polite"><p>Loading weather outlook…</p></div>' +
    '<details><summary>How is this forecast made?</summary>' +
    '<p>Historical temperatures and daily rainfall come from ACIS stations. The next seven days use National Weather Service forecasts. We evaluate the seven-day air-temperature trend, a separate 20-day base-32°F warmth measure, rain over 3/7/14/30 days, and forecast rain where quantitative estimates exist. Forecast rain is not observed rain.</p>' +
    '<p>This is a <strong>qualitative and unvalidated hunting guide</strong>. It is not a mushroom occurrence probability, an actual soil thermometer, or a soil moisture sensor. The model uses representative regional weather stations; a sun-facing slope or shaded forest floor may differ substantially. No forecast indicates a mushroom is safe to eat.</p>' +
    '<p><a href="/when-morels-come-up.html">More about emergence and the limitations</a> · <a href="https://namyco.org/publications/mcilvainea-journal-of-american-amateur-mycology/is-it-time-for-morels-yet/">Morel emergence research</a></p></details>';
  expl.insertAdjacentElement('afterend', panel);
  var select = document.getElementById('outlook-region');
  var results = document.getElementById('outlook-results');
  select.value = current;
  var seq = 0;
  function labelDate(s) {
    try { return new Date(s + 'T12:00:00-04:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
    catch (_) { return s; }
  }
  function metric(title, value, detail) {
    return '<div class="outlook-metric"><span>' + esc(title) + '</span><b>' + esc(value) +
      '</b><span>' + esc(detail || '') + '</span></div>';
  }
  function amount(v) { return typeof v === 'number' ? v.toFixed(1) + ' in' : 'Unavailable'; }
  function display(d) {
    if (!d || !d.ok) { results.innerHTML = '<p>Morel outlook data is not available right now.</p>'; return; }
    if (d.offseason) {
      results.innerHTML = '<p><strong>Out of season.</strong> This forecast only rates spring hunting days (March–June). Rainfall and warmth in October do not mean the spring morel season has reopened.</p>' +
        '<p class="note">The underlying annual soil-warming chart remains available above. Seven-day hunting comparisons resume during spring.</p>';
      return;
    }
    var h = d.history;
    var html = '<p class="note">NWS forecast location: <strong>' + esc(d.forecastPoint) +
      '</strong>. Historical measurements: regional ACIS station' + (d.observedStationUid ? ' #' + esc(d.observedStationUid) : ' unavailable') +
      '. Observed temperature through ' + esc(h && h.observedThrough ? h.observedThrough : 'unknown') + '.</p>';
    if (h) {
      html += '<div class="outlook-metrics">' +
        metric('7-day average air temp', typeof h.last7.meanF === 'number' ? h.last7.meanF + '°F' : 'No data', 'Regional proxy, not soil temperature') +
        metric('Rain in previous 7 days', amount(h.last7.rainIn), 'Observed at weather station') +
        metric('Rain in previous 14 days', amount(h.last14.rainIn), 'Observed at weather station') +
        metric('Rain in previous 30 days', amount(h.last30.rainIn), 'Observed at weather station') +
        metric('20-day heat accumulation', h.last20.heat32 === null ? 'No data' : h.last20.heat32 + '°F-days', 'Base 32°F, experimental indicator') +
        '</div>';
    } else {
      html += '<p>Historical observations could not be retrieved; no hunting rating can be trusted.</p>';
    }
    if (d.days && d.days.length) {
      html += '<div class="outlook-days">' + d.days.map(function (day) {
        var rainText = typeof day.forecastRainIn === 'number' ?
          ('Forecast rain: ' + day.forecastRainIn.toFixed(1) + ' in') :
          ('Rain amount: not available');
        var chanceText = typeof day.rainChancePct === 'number' ? day.rainChancePct + '% chance of rain' : 'Rain chance unknown';
        return '<article class="outlook-day" data-level="' + esc(day.verdict) + '">' +
          '<div class="kicker">' + esc(labelDate(day.date)) + '</div>' +
          '<strong>' + esc(day.verdict) + '</strong>' +
          '<div style="font-size:13px">' + esc(day.highF === null ? '—' : day.highF + '°') + ' high / ' +
          esc(day.lowF === null ? '—' : day.lowF + '°') + ' low</div>' +
          '<div style="font-size:12px;color:#645a48">' + esc(chanceText) + '</div>' +
          '<div style="font-size:12px;color:#645a48">' + esc(rainText) + '</div>' +
          '<p>' + esc(day.why) + '</p>' +
          '<div style="font-size:11px;color:#685c45;margin-top:8px">Confidence: ' + esc(day.confidence) + '</div>' +
          '</article>';
      }).join('') + '</div>';
    } else {
      html += '<p><strong>Seven-day forecast unavailable.</strong> ' + esc(d.forecastError || d.message || 'No forecast periods returned.') + '</p>';
    }
    html += '<p class="outlook-warning">Forecast amounts are provisional, and missing rainfall is never treated as zero. ' +
      'The 20-day heat figure and daily categories require Michigan field validation. ' +
      (d.rainfallAmountsForecast ? 'Rain amounts are from the NWS gridded forecast.' :
        'NWS forecast rain totals are not available; chance of rain alone cannot confirm wet soil.') +
      ' Check soil locally before relying on a favorable rating.</p>';
    results.innerHTML = html;
  }
  function load() {
    var id = ++seq;
    results.innerHTML = '<p>Loading historical weather and the seven-day forecast…</p>';
    fetch('/api/outlook?region=' + encodeURIComponent(select.value))
      .then(function (res) { if (!res.ok) throw new Error('Weather service unavailable'); return res.json(); })
      .then(function (data) { if (id === seq) display(data); })
      .catch(function () { if (id === seq) results.innerHTML = '<p>Outlook sources are temporarily unavailable. The existing regional warming tracker above is unaffected.</p>'; });
  }
  select.addEventListener('change', load);
  load();
})();
