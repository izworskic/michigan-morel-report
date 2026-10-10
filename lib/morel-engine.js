/*
 * Shared morel weather decision core (v3).
 * Portable geographic inputs; no assumptions about a single state, no claims
 * about fruit-body sightings, calibrated probabilities, or measured soil.
 * Historical weather = ACIS station observations; forecast = NWS at a point.
 */
export const MODEL_VERSION = '2026-10-10.3';
export const MODEL_KIND = 'eastern-spring-air-proxy-v1';
const MIN_COVERAGE = 0.8;
const r1 = n => Number.isFinite(n) ? Math.round(n * 10) / 10 : null;

export function addDays(s, n) {
  return new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
}
export function localDate(value, zone = 'America/Detroit') {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date(value));
  const f = key => p.find(x => x.type === key)?.value;
  return [f('year'), f('month'), f('day')].join('-');
}
function acisNumber(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const value = String(raw).trim().toUpperCase();
  if (!value || ['M', 'S', 'T', 'NA', 'NAN'].includes(value)) return null;
  // An accumulated multi-day ACIS value (e.g. 1.24A) must never be
  // misrepresented as rain falling on that single date.
  if (value.endsWith('A')) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function precip(raw) {
  if (String(raw).trim().toUpperCase() === 'T') return 0;
  const v = acisNumber(raw);
  return v !== null && v >= 0 ? v : null;
}
export function parseACIS(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(x => Array.isArray(x) && /^\d{4}-\d{2}-\d{2}$/.test(x[0]))
    .map(row => {
      const high = acisNumber(row[1]), low = acisNumber(row[2]);
      return { date: row[0], high, low,
        avg: high !== null && low !== null && high >= low ? (high + low) / 2 : null,
        rain: precip(row[3]), snowDepth: precip(row[4]) };
    });
}
export function summarize(observations, today) {
  const by = new Map(observations.filter(x => x.date <= today).map(x => [x.date, x]));
  const yesterday = addDays(today, -1);
  const dates = n => Array.from({ length: n }, (_, i) => by.get(addDays(yesterday, i - n + 1)) || null);
  function window(n) {
    const rows = dates(n);
    const wet = rows.filter(x => x && Number.isFinite(x.rain));
    const therm = rows.filter(x => x && Number.isFinite(x.avg));
    const pCoverage = wet.length / n, tCoverage = therm.length / n;
    return {
      rainIn: pCoverage >= MIN_COVERAGE ? r1(wet.reduce((a, x) => a + x.rain, 0)) : null,
      rainCoverage: r1(pCoverage),
      temperatureCoverage: r1(tCoverage),
      heat32: tCoverage >= MIN_COVERAGE ? Math.round(therm.reduce((a, x) => a + Math.max(0, x.avg - 32), 0)) : null,
      meanF: tCoverage >= MIN_COVERAGE ? r1(therm.reduce((a, x) => a + x.avg, 0) / therm.length) : null
    };
  }
  const observed = [...by.values()].filter(x => x.date <= yesterday && Number.isFinite(x.avg))
    .sort((a, b) => a.date.localeCompare(b.date));
  let peaked = false, trail = [];
  for (const d of observed) {
    // A gap in station readings cannot count as seven consecutive hot days.
    if (trail.length && addDays(trail[trail.length - 1].date, 1) !== d.date) trail = [];
    trail.push(d);
    if (trail.length > 7) trail.shift();
    if (trail.length === 7 && trail.reduce((a, x) => a + x.avg, 0) / 7 >= 68) peaked = true;
  }
  const last = observed.length ? observed[observed.length - 1].date : null;
  const age = last ? Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(last + 'T12:00:00Z')) / 86400000) : null;
  const snow = [yesterday, addDays(yesterday, -1), addDays(yesterday, -2)]
    .map(s => by.get(s)).find(x => x && Number.isFinite(x.snowDepth));
  const recent3 = dates(3);
  const recentRainEvents = recent3
    .filter(x => x && Number.isFinite(x.rain) && x.rain >= 0.15)
    .map(x => ({ date: x.date, amountIn: x.rain }));
  return {
    observedThrough: last, observationAgeDays: age,
    recentSnowDepthIn: snow ? snow.snowDepth : null,
    last3: window(3), last7: window(7), last14: window(14),
    last20: window(20), last30: window(30),
    peakedThisSpring: peaked,
    recentRainEvents,
    recentMeans: dates(7).map(d => d?.avg ?? null)
  };
}
export function distanceKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;
  const rad = n => n * Math.PI / 180, R = 6371;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}
export function rankStationCandidates(candidates, region) {
  return candidates.map(c => {
    const ll = c.meta?.ll;
    const distance = Array.isArray(ll) && ll.length === 2
      ? distanceKm(region.lat, region.lon, Number(ll[1]), Number(ll[0])) : null;
    const h = c.summary;
    const age = h?.observationAgeDays;
    const quality = 3 * (h?.last7?.temperatureCoverage || 0) +
      3 * (h?.last14?.rainCoverage || 0) +
      2 * (h?.last20?.temperatureCoverage || 0) -
      (age === null ? 5 : Math.max(0, age - 1) * 1.5) -
      (distance === null ? 0.5 : Math.min(distance, 500) / 90);
    return { ...c, distanceKm: r1(distance), quality: r1(quality) };
  }).sort((a, b) => b.quality - a.quality);
}
function durationHours(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(iso || '');
  if (!m) return null;
  const hours = Number(m[1] || 0) * 24 + Number(m[2] || 0) + Number(m[3] || 0) / 60;
  return hours > 0 && hours <= 48 ? hours : null;
}
export function forecastDays(periods, qpfValues, today, zone = 'America/Detroit') {
  const days = new Map();
  const max = addDays(today, 6);
  for (const p of periods || []) {
    if (!p.startTime || !Number.isFinite(p.temperature)) continue;
    const date = localDate(p.startTime, zone);
    if (date < today || date > max) continue;
    if (!days.has(date)) days.set(date, {
      date, highF: null, lowF: null, rainChancePct: null,
      forecastRainIn: null, forecastRainCoverageHours: 0, summary: ''
    });
    const day = days.get(date);
    const fahrenheit = p.temperatureUnit === 'C' ? p.temperature * 9 / 5 + 32 : p.temperature;
    if (p.isDaytime) day.highF = Math.round(fahrenheit);
    else day.lowF = Math.round(fahrenheit);
    const chance = p.probabilityOfPrecipitation?.value;
    if (Number.isFinite(chance)) day.rainChancePct = Math.max(day.rainChancePct ?? 0, Math.round(chance));
    if (p.isDaytime || !day.summary) day.summary = p.shortForecast || '';
  }
  // Gridded QPF validTime durations may cross midnight or DST boundaries.
  // We apportion it uniformly by half-hour local-time overlap (approximation);
  // there is no evidence for exact intraperiod rainfall timing.
  if (Array.isArray(qpfValues)) {
    for (const v of qpfValues) {
      if (typeof v.validTime !== 'string' || !Number.isFinite(v.value) || v.value < 0) continue;
      const [startText, dur] = v.validTime.split('/');
      const hours = durationHours(dur), start = Date.parse(startText);
      if (!hours || !Number.isFinite(start)) continue;
      const parts = Math.round(hours * 2), each = (v.value / 25.4) / parts;
      for (let i = 0; i < parts; i++) {
        const date = localDate(new Date(start + i * 30 * 60 * 1000), zone);
        const day = days.get(date);
        if (!day) continue;
        day.forecastRainIn = (day.forecastRainIn ?? 0) + each;
        day.forecastRainCoverageHours += 0.5;
      }
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
    .map(day => {
      // Partial periods and sparse QPF must be marked unknown, never zero.
      const forecastRainIn = day.forecastRainCoverageHours >= (day.date === today ? 4 : 18)
        ? r1(day.forecastRainIn) : null;
      return { ...day, forecastRainIn,
        forecastRainCoverageHours: r1(day.forecastRainCoverageHours) };
    });
}
const verdicts = {
  'Data limited': 'The temperature or rainfall evidence is incomplete; no reliable rating is available.',
  'Window past': 'Earlier sustained warmth suggests the local spring window has passed.',
  'Snow covered': 'Recent station snow cover makes access and soil readiness uncertain.',
  'Freeze risk': 'A hard overnight freeze is forecast; local soil may cool.',
  'Too cold': 'The recent seven-day air-temperature pattern is below the screening window.',
  'Warming, watch': 'Spring warming is approaching the screening window.',
  'Favorable pattern': 'The warming signal and a recent significant rain event align; check local soil and habitat.',
  'Rain approaching': 'Significant rain is forecast today; conditions may improve after it passes.',
  'Warm, moisture uncertain': 'Warmth is promising but sufficient recent moisture is not demonstrated.',
  'Dry spell': 'Recent observed precipitation has been low despite suitable warmth.',
  'Warming past window': 'Sustained warmth suggests the seasonal window may be shifting.'
};
export function evaluate(history, forecast, options = {}) {
  const profile = options.profile || MODEL_KIND;
  if (profile !== MODEL_KIND)
    return forecast.map(day => ({ ...day, verdict: 'Data limited',
      why: 'This geographic/ecological profile has not been calibrated or enabled.', confidence: 'low' }));
  const enough = history && history.last7?.meanF !== null && history.last7?.meanF !== undefined &&
    history.observationAgeDays !== null && history.observationAgeDays <= 3 &&
    history.last14?.rainCoverage >= 0.8 && history.last7?.temperatureCoverage >= 0.8;
  if (!enough)
    return forecast.map(day => ({ ...day, verdict: 'Data limited', why: verdicts['Data limited'], confidence: 'low' }));
  const recent = [...history.recentMeans];
  const rainEvents = [...(history.recentRainEvents || [])];
  let consecutiveWarmForecastDays = 0;
  return forecast.map((day, i) => {
    const mean = Number.isFinite(day.highF) && Number.isFinite(day.lowF)
      ? (day.highF + day.lowF) / 2 : null;
    recent.push(mean);
    const window = recent.slice(-7);
    const mean7 = window.every(Number.isFinite) ? window.reduce((a, b) => a + b, 0) / 7 : null;
    // Never backfill incomplete forward forecast weather with historical data.
    let verdict = 'Data limited';
    if (mean7 !== null) {
      const rainBefore = rainEvents.some(e => {
        const n = Math.round((Date.parse(day.date + 'T12:00:00Z') - Date.parse(e.date + 'T12:00:00Z')) / 86400000);
        return n >= 1 && n <= 3;
      });
      const rainToday = Number.isFinite(day.forecastRainIn) && day.forecastRainIn >= 0.15;
      const snow = history.recentSnowDepthIn !== null && history.recentSnowDepthIn >= 1;
      consecutiveWarmForecastDays = mean >= 45 ? consecutiveWarmForecastDays + 1 : 0;
      if (history.peakedThisSpring || mean7 >= 68) verdict = 'Window past';
      else if (snow && consecutiveWarmForecastDays < 4) verdict = 'Snow covered';
      else if (Number.isFinite(day.lowF) && day.lowF <= 28) verdict = 'Freeze risk';
      else if (mean7 < 45) verdict = 'Too cold';
      else if (mean7 < 52) verdict = 'Warming, watch';
      else if (mean7 >= 62) verdict = 'Warming past window';
      else if (rainBefore && (!snow || consecutiveWarmForecastDays >= 4)) verdict = 'Favorable pattern';
      else if (rainToday) verdict = 'Rain approaching';
      else if (history.last14.rainIn !== null && history.last14.rainIn < 0.15) verdict = 'Dry spell';
      else verdict = 'Warm, moisture uncertain';
    }
    const confidence = mean7 !== null && history.observationAgeDays <= 2 &&
      history.last20.temperatureCoverage >= 0.9 && history.last14.rainCoverage >= 0.9 &&
      i <= 3 && !(history.recentSnowDepthIn >= 1 && i >= 3) ? 'moderate' : 'low';
    const rated = { ...day, projected7DayAirMeanF: r1(mean7),
      verdict, why: verdicts[verdict], confidence };
    // Only substantial forecast events produce a subsequent post-rain opportunity.
    if (Number.isFinite(day.forecastRainIn) && day.forecastRainIn >= 0.15)
      rainEvents.push({ date: day.date, amountIn: day.forecastRainIn, predicted: true });
    return rated;
  });
}
