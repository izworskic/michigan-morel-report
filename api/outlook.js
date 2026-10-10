// Morel opportunity outlook: historical observations + NWS seven-day forecast.
// This is a qualitative, unvalidated timing guide, NOT a mushroom probability.
// Weather station data represent a region; no precise forest-soil moisture claim.
export const config = { runtime: 'edge' };

const ACIS = 'https://data.rcc-acis.org/StnData';
const NWS = 'https://api.weather.gov';
const REGIONS = {
  'southern-michigan': { name: 'Southern Michigan', place: 'Grand Rapids', lat: 42.9634, lon: -85.6681, uids: [9835, 9721, 69, 31532] },
  'central-michigan': { name: 'Central Michigan', place: 'Saginaw / Bay City', lat: 43.5945, lon: -83.8889, uids: [31805, 70, 9846] },
  'northern-lower': { name: 'Northern Lower', place: 'Gaylord', lat: 45.0275, lon: -84.6748, uids: [10051, 29345, 10021, 29645] },
  'eastern-up': { name: 'Eastern Upper Peninsula', place: 'Sault Ste. Marie', lat: 46.4977, lon: -84.3476, uids: [10158, 10149, 10091] },
  'western-up': { name: 'Western Upper Peninsula', place: 'Marquette', lat: 46.5436, lon: -87.3954, uids: [71, 10105, 29678] }
};
const HEADERS = {
  'Accept': 'application/geo+json, application/json',
  'User-Agent': 'MichiganMorelReport/2.0 (https://morel.chrisizworski.com)'
};
const ROUND = x => x === null || !Number.isFinite(x) ? null : Math.round(x * 10) / 10;
const dateUTC = d => d.toISOString().slice(0, 10);
const addDays = (s, n) => dateUTC(new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000));
function localDate(value) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value));
  const get = type => parts.find(p => p.type === type)?.value || '';
  return get('year') + '-' + get('month') + '-' + get('day');
}
async function getJSON(url, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6500);
  try {
    const response = await fetch(url, { ...options, signal: ctrl.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const body = await response.json();
    if (!body || body.error) throw new Error('Malformed source response');
    return body;
  } finally { clearTimeout(timer); }
}
function temp(x) {
  if (typeof x !== 'string' && typeof x !== 'number') return null;
  if (String(x).trim() === '') return null;
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}
function rain(x) {
  if (String(x).trim().toUpperCase() === 'T') return 0; // ACIS trace (not a measurable amount)
  const n = temp(x);
  return n !== null && n >= 0 ? n : null;
}
export function parseACIS(rows) {
  return rows.map(row => {
    const high = temp(row[1]), low = temp(row[2]);
    return {
      date: row[0], high, low,
      avg: high === null || low === null ? null : (high + low) / 2,
      rain: rain(row[3]), snowDepth: rain(row[4])
    };
  });
}
export function summarize(observations, today) {
  const byDate = new Map(observations.map(d => [d.date, d]));
  const end = addDays(today, -1); // never count a partial "today" as a complete dry day
  function window(n) {
    const dates = Array.from({ length: n }, (_, i) => byDate.get(addDays(end, -(n - 1 - i))));
    const pcpn = dates.filter(d => d && d.rain !== null);
    const thermal = dates.filter(d => d && d.avg !== null);
    return {
      rainIn: pcpn.length / n >= 0.8 ? ROUND(pcpn.reduce((a, d) => a + d.rain, 0)) : null,
      rainCoverage: ROUND(pcpn.length / n),
      temperatureCoverage: ROUND(thermal.length / n),
      heat32: thermal.length / n >= 0.8 ? Math.round(thermal.reduce((a, d) => a + Math.max(0, d.avg - 32), 0)) : null,
      meanF: thermal.length / n >= 0.8 ? ROUND(thermal.reduce((a, d) => a + d.avg, 0) / thermal.length) : null
    };
  }
  const full = observations.filter(d => d.avg !== null).sort((a, b) => a.date.localeCompare(b.date));
  let crossed = false, history = [];
  for (const d of full) {
    history.push(d);
    if (history.length > 7) history.shift();
    if (history.length === 7 &&
        history.reduce((a, v) => a + v.avg, 0) / 7 >= 68) crossed = true;
  }
  const lastTemp = full.length ? full[full.length - 1].date : null;
  const freshSnow = [today, addDays(today, -1), addDays(today, -2)].map(d => byDate.get(d)?.snowDepth).find(v => v !== undefined && v !== null);
  const ageDays = lastTemp ? Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(lastTemp + 'T12:00:00Z')) / 86400000) : null;
  return {
    observedThrough: lastTemp,
    observationAgeDays: ageDays,
    recentSnowDepthIn: freshSnow === undefined ? null : freshSnow,
    last3: window(3), last7: window(7), last14: window(14),
    last20: window(20), last30: window(30),
    peakedThisSpring: crossed,
    recentMeans: Array.from({ length: 7 }, (_, i) => byDate.get(addDays(end, -6 + i))?.avg ?? null)
  };
}
export function forecastDays(periods, qpfValues, today) {
  const days = new Map();
  for (const p of periods) {
    if (!p.startTime || !Number.isFinite(p.temperature)) continue;
    const date = localDate(p.startTime);
    if (date < today || date > addDays(today, 7)) continue;
    if (!days.has(date)) days.set(date, { date, highF: null, lowF: null, rainChancePct: null, forecastRainIn: null, summary: '' });
    const day = days.get(date);
    if (p.isDaytime) day.highF = p.temperature;
    else day.lowF = p.temperature;
    const chance = p.probabilityOfPrecipitation?.value;
    if (typeof chance === 'number') day.rainChancePct = Math.max(day.rainChancePct ?? 0, Math.round(chance));
    if (p.isDaytime || !day.summary) day.summary = p.shortForecast || '';
  }
  if (Array.isArray(qpfValues)) {
    for (const item of qpfValues) {
      if (!item.validTime || typeof item.value !== 'number') continue;
      const date = localDate(item.validTime.split('/')[0]);
      const day = days.get(date);
      if (!day) continue;
      day.forecastRainIn = (day.forecastRainIn || 0) + Math.max(0, item.value) / 25.4;
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)
    .map(d => ({ ...d, forecastRainIn: ROUND(d.forecastRainIn) }));
}
async function getForecast(region, today) {
  const point = await getJSON(NWS + '/points/' + region.lat + ',' + region.lon, { headers: HEADERS });
  const props = point.properties || {};
  if (!props.forecast || !props.forecastGridData) throw new Error('NWS location grid unavailable');
  const result = await Promise.allSettled([
    getJSON(props.forecast, { headers: HEADERS }),
    getJSON(props.forecastGridData, { headers: HEADERS })
  ]);
  if (result[0].status !== 'fulfilled' || !Array.isArray(result[0].value?.properties?.periods))
    throw new Error('NWS period forecast unavailable');
  const qpf = result[1].status === 'fulfilled' ? result[1].value?.properties?.quantitativePrecipitation?.values : null;
  return { days: forecastDays(result[0].value.properties.periods, qpf, today), hasRainAmounts: Array.isArray(qpf) };
}
export function evaluate(history, forecast) {
  if (!history || !history.last7 || history.last7.meanF === null || history.observationAgeDays > 3)
    return forecast.map(day => ({ ...day, verdict: 'Data limited', why: 'Recent station temperatures are missing or stale.', confidence: 'low' }));
  if (history.last14.rainCoverage < 0.8)
    return forecast.map(day => ({ ...day, verdict: 'Data limited', why: 'Historical rainfall records are incomplete.', confidence: 'low' }));
  const temps = [...history.recentMeans];
  const historicRain = history.last7.rainIn; // null means insufficient evidence, never "dry"
  let forecastRainSoFar = 0, lastRainDate = null;
  return forecast.map((day, i) => {
    const mean = day.highF !== null && day.lowF !== null ? (day.highF + day.lowF) / 2 : null;
    temps.push(mean);
    const trailing = temps.slice(-7);
    const projectedMean = trailing.every(t => t !== null)
      ? trailing.reduce((a, t) => a + t, 0) / 7 : null;
    const warmth = projectedMean === null ? history.last7.meanF : projectedMean;
    const initialRain = i <= 3 && historicRain !== null && historicRain >= 0.25;
    const supportedForecastRain = day.forecastRainIn !== null && day.forecastRainIn >= 0.15;
    const recentForecastRain = forecastRainSoFar >= 0.15 && lastRainDate !== null && i - lastRainDate <= 3;
    let verdict = 'Watch', why = 'The seasonal and moisture pattern is mixed.';
    if (history.recentSnowDepthIn !== null && history.recentSnowDepthIn >= 1) {
      verdict = 'Snow covered'; why = 'The reporting station has recent snow cover; forest conditions may differ.';
    } else if (day.lowF !== null && day.lowF <= 28) {
      verdict = 'Freeze risk'; why = 'A hard overnight freeze is forecast; check soil and delay hunting expectations.';
    } else if (history.peakedThisSpring || warmth >= 68) {
      verdict = 'Window past'; why = 'Sustained seasonal warmth has passed the model window.';
    } else if (warmth < 45) {
      verdict = 'Too cold'; why = 'The seven-day air-temperature trend is still too cool.';
    } else if (warmth >= 52 && warmth < 62 && (initialRain || recentForecastRain)) {
      verdict = 'Favorable pattern'; why = 'Warming conditions and recent rain align; check local soil temperature.';
    } else if (warmth >= 52 && warmth < 62 && supportedForecastRain) {
      verdict = 'Rain approaching'; why = 'Rain may improve moisture conditions after it passes; amounts are forecast.';
    } else if (warmth >= 52 && warmth < 62) {
      verdict = 'Warm, moisture uncertain'; why = 'The warmth signal is promising but recent wet conditions are not confirmed.';
    } else if (warmth >= 62) {
      verdict = 'Warming past window'; why = 'The warm spell may be moving the local season along.';
    } else {
      verdict = 'Warming, watch'; why = 'Temperatures are approaching the spring window.';
    }
    const confidence = history.observationAgeDays <= 2 && history.last20.temperatureCoverage >= 0.9 &&
      history.last14.rainCoverage >= 0.9 && projectedMean !== null && i <= 3 ? 'moderate' : 'low';
    const rated = { ...day, projected7DayAirMeanF: ROUND(projectedMean), verdict, why, confidence };
    if (supportedForecastRain) lastRainDate = i;
    if (day.forecastRainIn !== null) forecastRainSoFar += day.forecastRainIn;
    return rated;
  });
}
const json = (body, code = 200) => new Response(JSON.stringify(body), {
  status: code,
  headers: { 'content-type': 'application/json; charset=utf-8',
    'cache-control': code === 200 ? 'public, s-maxage=3600, stale-while-revalidate=3600' : 'no-store' }
});
export default async function handler(request) {
  const query = new URL(request.url).searchParams;
  const slug = query.get('region') || 'central-michigan';
  const region = REGIONS[slug];
  if (!region) return json({ ok: false, error: 'Unknown region' }, 400);
  const today = localDate(new Date());
  const month = Number(today.slice(5, 7));
  const base = { ok: true, region: slug, name: region.name, forecastPoint: region.place,
    generatedAt: new Date().toISOString(),
    model: 'Experimental: regional air warming and precipitation observations plus the NWS seven-day outlook, not measured forest soil or calibrated morel probabilities.' };
  if (month < 3 || month > 6)
    return json({ ...base, offseason: true, message: 'Spring-only morel hunting outlook resumes in March. No autumn fruiting prediction is made.', days: [] });
  const year = Number(today.slice(0, 4));
  const start = addDays(today, -35) < year + '-03-01' ? addDays(today, -35) : year + '-03-01';
  let best = null;
  for (const uid of region.uids) {
    try {
      const data = await getJSON(ACIS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, sdate: start, edate: today, elems: 'maxt,mint,pcpn,snwd' })
      });
      if (!Array.isArray(data.data)) continue;
      const summary = summarize(parseACIS(data.data), today);
      const quality = (summary.last14.temperatureCoverage || 0) + (summary.last14.rainCoverage || 0);
      if (!best || quality > best.quality) best = { uid, summary, quality };
      if (summary.last14.temperatureCoverage >= 0.85 && summary.last14.rainCoverage >= 0.85 &&
          summary.observationAgeDays !== null && summary.observationAgeDays <= 3) break;
    } catch (_) { /* Try the next documented regional weather station. */ }
  }
  let nws = null, forecastError = null;
  try { nws = await getForecast(region, today); }
  catch (_) { forecastError = 'NWS forecast currently unavailable'; }
  if (!best && !nws)
    return json({ ...base, offseason: false, available: false, message: 'Historical weather and the forecast are temporarily unavailable.', days: [] });
  return json({
    ...base, offseason: false, available: !!best && !!nws, observedStationUid: best?.uid || null,
    history: best?.summary || null, rainfallAmountsForecast: nws?.hasRainAmounts || false,
    forecastError,
    days: nws ? (best ? evaluate(best.summary, nws.days) : nws.days.map(d => ({
      ...d, verdict: 'Data limited', why: 'Historical station data are unavailable.', confidence: 'low'
    }))) : [],
    notes: [
      'Growing degree days base 50 F are a seasonal context measure, not a morel fruiting probability.',
      'The rolling 20-day heat measure uses base 32 F for exploration; Michigan-specific thresholds are not validated.',
      'Precipitation and snow depth are measured at a regional station, not in forest soil; rain forecasts are provisional.',
      'A favorable pattern is not confirmation that mushrooms have emerged. Check local soil and habitat.'
    ]
  });
}
