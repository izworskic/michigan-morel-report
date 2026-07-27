/* Michigan Morel Report client engine.
   Renders the south to north wave board from /api/morel.

   Vocabulary rule for this whole site: the stage describes MODELLED SOIL
   WARMTH, never a promise that mushrooms are up and never a statement that
   anything is safe to eat. Timing is a data problem. Identification is not. */
(function () {
  'use strict';

  var ORDER = ['southern-michigan', 'central-michigan', 'northern-lower', 'eastern-up', 'western-up'];

  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function fmt(n, dp) {
    if (n === null || n === undefined || isNaN(n)) return 'n/a';
    return Number(n).toFixed(dp === undefined ? 0 : dp);
  }

  function stamp(iso) {
    try {
      return new Date(iso).toLocaleString('en-US',
        { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch (e) { return iso; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* The bar shows accumulated warmth against the ten year normal, scaled so the
     normal sits at the midline. Past the midline means this spring is running
     ahead of average. Same presentation as the ice property's cold accumulation
     track, for the same reason: a number against its own history says more than
     a number alone. */
  function bar(region) {
    if (!region.normal || region.gddBase50 === null) {
      return '<div class="bar-wrap"><div class="bar-lab">No normal available</div></div>';
    }
    var ratio = region.gddBase50 / region.normal.mean;      // 1.0 is normal
    var pct = Math.max(2, Math.min(100, ratio * 50));        // normal lands at 50
    var diff = region.gddBase50 - region.normal.mean;
    var word = Math.abs(diff) < region.normal.mean * 0.05 ? 'about normal'
      : (diff > 0 ? fmt(Math.abs(diff)) + ' ahead of normal' : fmt(Math.abs(diff)) + ' behind normal');
    return '<div class="bar-wrap">' +
      '<div class="bar" style="width:' + pct.toFixed(1) + '%"></div>' +
      '<div class="bar-mid" style="left:50%"></div>' +
      '<div class="bar-lab">' + fmt(region.gddBase50) + ' GDD, ' + word + '</div>' +
      '</div>';
  }

  function render(data) {
    var wave = document.getElementById('wave');
    if (!data || !data.regions) {
      if (wave) wave.innerHTML = '<div class="wave-cell">Could not load station data right now.</div>';
      set('the-read', 'The station feed is not reachable at the moment.');
      return;
    }

    var byslug = {};
    data.regions.forEach(function (r) { byslug[r.slug] = r; });
    var ordered = ORDER.map(function (s) { return byslug[s]; }).filter(Boolean);

    if (wave) {
      wave.innerHTML = ordered.map(function (r) {
        var st = r.stage || {};
        return '<div class="wave-row">' +
          '<div class="wave-cell">' +
            '<div class="wave-name"><a href="/' + r.slug + '.html">' + esc(r.name) + '</a></div>' +
            '<div class="wave-sub">' + esc(r.towns) + '</div>' +
          '</div>' +
          '<div class="wave-cell">' + bar(r) +
            '<div class="wave-sub" style="margin-top:6px">' + esc(st.why || '') + '</div>' +
          '</div>' +
          '<div class="wave-cell"><span class="badge ' + esc(st.key || '') + '">' + esc(st.label || '') + '</span>' +
            (r.trailing7dayF !== null && r.trailing7dayF !== undefined
              ? '<div class="wave-sub mono" style="margin-top:5px">' + fmt(r.trailing7dayF, 1) + ' F 7 day mean</div>'
              : '') +
          '</div>' +
        '</div>';
      }).join('');
    }

    var prime = ordered.filter(function (r) { return r.stage && r.stage.key === 'prime'; });
    var offseason = ordered.length && ordered.every(function (r) {
      return r.stage && r.stage.key === 'offseason';
    });

    set('s-season', offseason ? 'Off' : (prime.length ? 'Open' : 'Between'));
    set('s-season-sub', offseason ? 'resumes in March' : 'statewide');
    set('s-prime', offseason ? '0' : String(prime.length));

    var warmest = ordered.filter(function (r) { return r.trailing7dayF !== null; })
      .sort(function (a, b) { return b.trailing7dayF - a.trailing7dayF; })[0];
    set('s-front', warmest ? warmest.name.replace(' Upper Peninsula', ' UP') : 'n/a');

    var withNormal = ordered.filter(function (r) { return r.normal && r.gddBase50 !== null; });
    if (withNormal.length) {
      var tot = withNormal.reduce(function (a, r) { return a + r.gddBase50; }, 0);
      var nor = withNormal.reduce(function (a, r) { return a + r.normal.mean; }, 0);
      var pc = ((tot / nor) - 1) * 100;
      set('s-normal', (pc >= 0 ? '+' : '') + fmt(pc) + '%');
    } else { set('s-normal', 'n/a'); }

    var stageEl = document.getElementById('season-stage');
    if (stageEl) {
      stageEl.textContent = offseason ? 'Off season'
        : (prime.length ? prime[0].name.replace(' Upper Peninsula', ' UP') + ' in window' : 'Between windows');
    }

    var parts = [];
    if (offseason) {
      parts.push('Morels fruit in spring, and it is not spring. Tracking resumes in March, when the model starts ' +
        'accumulating warmth again from the first of the month.');
      parts.push('Out of season the useful work is scouting: learning to recognise ash and elm before the leaves ' +
        'are out, and finding ground you can come back to.');
    } else if (prime.length) {
      parts.push(prime.map(function (r) { return r.name; }).join(' and ') +
        (prime.length > 1 ? ' are' : ' is') + ' in the modelled window.');
      parts.push('Go two or three days after a rain rather than during one, and start on south facing slopes ' +
        'early in the local season.');
    } else {
      var watch = ordered.filter(function (r) { return r.stage && r.stage.key === 'watch'; });
      if (watch.length) {
        parts.push(watch.map(function (r) { return r.name; }).join(' and ') +
          ' still warming toward the trigger. Watch indicator plants rather than the calendar.');
      } else {
        parts.push('No region is in the modelled window right now.');
      }
    }
    if (withNormal.length) {
      var d = withNormal[0];
      parts.push(d.name + ' has accumulated ' + fmt(d.gddBase50) + ' growing degree days since March 1, against a ' +
        d.normal.years + ' year normal of ' + fmt(d.normal.mean) + ' for this date.');
    }
    parts.push('Soil warmth here is modelled from air temperature, not measured in the ground. Carry a thermometer.');
    set('the-read', parts.join(' '));

    set('read-stamp', 'Station data from the Applied Climate Information System' +
      (data.generatedAt ? ', assembled ' + stamp(data.generatedAt) : '') +
      '. Model: ' + (data.model || '') + '.');

    var ws = document.getElementById('wave-stamp');
    if (ws) {
      ws.textContent = 'Bars show accumulated growing degree days against a ten year normal for the same date, ' +
        'scaled so normal sits at the midline. Past the midline means this spring is running warm. ' +
        (data.caveat || '');
    }
  }

  function boot() {
    if (!document.getElementById('wave') && !document.getElementById('the-read')) return;
    fetch('/api/morel')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(render)
      .catch(function () { render(null); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
