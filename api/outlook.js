// Michigan Morel Report: weather-backed daily outlook.
// Geography and provider requests live here; forecast decisions are isolated
// in ../lib/morel-engine.js for reuse with future regional/national pages.
import {
  MODEL_VERSION, MODEL_KIND, localDate, addDays, parseACIS, summarize,
  forecastDays, evaluate, rankStationCandidates
} from '../lib/morel-engine.js';
import { REGION_BY_ID, AREA_SCHEMA_VERSION } from '../lib/morel-regions.js';
export { parseACIS, summarize, forecastDays, evaluate };
export const config = { runtime: 'edge' };

const ACIS = 'https://data.rcc-acis.org/StnData';
const NWS = 'https://api.weather.gov';
const USER_AGENT = { 'User-Agent': 'MichiganMorelReport/3.0 (https://morel.chrisizworski.com)',
  'Accept': 'application/geo+json, application/json' };
async function getJSON(url, options = {}) {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 7500);
  try {
    const res = await fetch(url, { ...options, signal: abort.signal });
    if (!res.ok) throw new Error('Upstream HTTP ' + res.status);
    const data = await res.json();
    if (!data || data.error) throw new Error('Upstream response invalid');
    return data;
  } finally { clearTimeout(timer); }
}
async function station(uid, today) {
  // Fetch through the last complete day, not the current partial day.
  const yesterday = addDays(today, -1);
  const march1 = today.slice(0, 4) + '-03-01';
  const start = addDays(today, -35) > march1 ? addDays(today, -35) : march1;
  const response = await getJSON(ACIS, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid, sdate: start, edate: yesterday,
      elems: 'maxt,mint,pcpn,snwd', meta: 'll,name'
    })
  });
  if (!Array.isArray(response.data)) throw new Error('ACIS station missing');
  return { uid, summary: summarize(parseACIS(response.data), today), meta: response.meta || null };
}
async function forecast(region, today) {
  const point = await getJSON(NWS + '/points/' + region.lat + ',' + region.lon, { headers: USER_AGENT });
  const properties = point.properties || {};
  if (!properties.forecast) throw new Error('NWS forecast location unavailable');
  const sources = await Promise.allSettled([
    getJSON(properties.forecast, { headers: USER_AGENT }),
    properties.forecastGridData
      ? getJSON(properties.forecastGridData, { headers: USER_AGENT })
      : Promise.reject(new Error('Grid endpoint unavailable'))
  ]);
  const periods = sources[0].status === 'fulfilled' ? sources[0].value?.properties?.periods : null;
  if (!Array.isArray(periods) || periods.length === 0) throw new Error('NWS forecast periods unavailable');
  const grid = sources[1].status === 'fulfilled' ?
    sources[1].value?.properties?.quantitativePrecipitation : null;
  // Do not misinterpret unsupported precipitation units as millimeters.
  const unit = grid?.uom || grid?.unitCode || 'wmoUnit:mm';
  const amounts = unit === 'wmoUnit:mm' && Array.isArray(grid?.values) ? grid.values : null;
  const days = forecastDays(periods, amounts, today, region.timeZone);
  return { days, hasRainAmounts: days.some(d => d.forecastRainIn !== null),
    qpfSource: amounts ? 'NWS gridded quantitative precipitation' : 'unavailable' };
}
const respond = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': status === 200 ? 'public, s-maxage=3600, stale-while-revalidate=3600' : 'no-store'
  }
});
export default async function handler(request) {
  const slug = new URL(request.url).searchParams.get('region') || 'central-michigan';
  const region = REGION_BY_ID[slug];
  if (!region) return respond({ ok: false, error: 'Unsupported region: no verified weather station and ecological profile.' }, 400);
  const now = new Date();
  const today = localDate(now, region.timeZone), month = Number(today.slice(5, 7));
  const base = {
    ok: true, modelVersion: MODEL_VERSION, areaSchemaVersion: AREA_SCHEMA_VERSION,
    modelProfile: region.profile, geography: { country: region.country, zone: region.zone, state: region.state },
    region: slug, name: region.name, forecastPoint: region.place,
    generatedAt: now.toISOString(),
    model: 'Experimental Michigan eastern morel weather pattern, not measured forest soil or a calibrated probability.'
  };
  if (month < 3 || month > 6)
    return respond({ ...base, offseason: true,
      message: 'Spring-only morel hunting outlook resumes in March. No autumn fruiting prediction is made.', days: [] });
  // The short station list uses documented IDs and known location anchors.
  // Any missing ACIS station is simply skipped, never treated as dry.
  const tasks = await Promise.allSettled([
    ...region.uids.map(uid => station(uid, today)), forecast(region, today)
  ]);
  const stations = tasks.slice(0, -1)
    .filter(x => x.status === 'fulfilled').map(x => x.value);
  const ordered = rankStationCandidates(stations, region);
  const best = ordered.length ? ordered[0] : null;
  const weather = tasks[tasks.length - 1].status === 'fulfilled' ? tasks[tasks.length - 1].value : null;
  const forecastError = weather ? null : 'NWS forecast currently unavailable';
  if (!best && !weather)
    return respond({ ...base, offseason: false, available: false,
      message: 'Historical weather and seven-day forecast are unavailable.',
      forecastError, days: [], history: null });
  const days = weather ? (best ?
    evaluate(best.summary, weather.days, { profile: region.profile }) :
    weather.days.map(day => ({ ...day, verdict: 'Data limited',
      why: 'No usable historical station data available.', confidence: 'low' }))) : [];
  return respond({
    ...base, offseason: false, available: !!best && !!weather,
    observedStationUid: best?.uid ?? null,
    observedStationName: best?.meta?.name ?? null,
    observedStationDistanceKm: best?.distanceKm ?? null,
    stationCandidatesChecked: region.uids.length,
    weatherSource: { observations: best ? 'ACIS station measurements' : 'unavailable',
      forecast: weather ? 'NWS seven-day point forecast' : 'unavailable',
      forecastRain: weather?.qpfSource || 'unavailable' },
    dataQuality: {
      temperatureCompleteness7d: best?.summary?.last7?.temperatureCoverage ?? null,
      rainfallCompleteness14d: best?.summary?.last14?.rainCoverage ?? null,
      daysSinceTemperatureObservation: best?.summary?.observationAgeDays ?? null
    },
    history: best?.summary || null,
    rainfallAmountsForecast: weather?.hasRainAmounts || false, forecastError, days,
    notes: [
      'The base-50°F GDD seasonal chart is separate from this seven-day weather outlook.',
      '20-day base-32°F warmth is an AIR-temperature proxy, not the soil-temperature finding studied in Missouri.',
      'Rain comes from regional station observations or NWS forecasts; missing values cannot prove dry weather.',
      'This is an experimental timing model, not evidence that morels have emerged and not mushroom identification.'
    ]
  });
}
