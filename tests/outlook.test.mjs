import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MODEL_KIND, addDays, localDate, parseACIS, summarize,
  forecastDays, evaluate, rankStationCandidates, distanceKm
} from '../lib/morel-engine.js';

const TODAY = '2026-04-20';
function sample(n = 40, avg = 55, rain = 0.1) {
  return Array.from({ length: n }, (_, i) => {
    const date = addDays(TODAY, i - n);
    return { date, high: avg + 5, low: avg - 5, avg, rain, snowDepth: 0 };
  });
}
const todayForecast = (opts = {}) => ({
  date: TODAY, highF: 65, lowF: 45, forecastRainIn: null, ...opts
});
const withRecentEvent = () => {
  const obs = sample(40, 55, 0);
  obs[obs.length - 2].rain = 0.35;
  return summarize(obs, TODAY);
};
test('ACIS missing codes, trace rain, flagged accumulated rain and snow', () => {
  const rows = parseACIS([
    ['2026-04-01', '65', '45', 'T', '0'],
    ['2026-04-02', '65', '45', 'M', 'M'],
    ['2026-04-03', 'M', '43', '0.26', '1'],
    ['2026-04-04', '67', '42', '1.4A', '0'],
    ['2026-04-05', '54', '69', '0', '0']
  ]);
  assert.equal(rows[0].rain, 0);
  assert.equal(rows[1].rain, null);
  assert.equal(rows[2].avg, null);
  assert.equal(rows[2].snowDepth, 1);
  assert.equal(rows[3].rain, null); // ACIS "A" does NOT mean rain that day
  assert.equal(rows[4].avg, null); // anomalous min > max
});
test('temperature and rainfall rolling windows', () => {
  const h = summarize(sample(), TODAY);
  assert.equal(h.last7.meanF, 55);
  assert.equal(h.last7.rainIn, 0.7);
  assert.equal(h.last14.rainIn, 1.4);
  assert.equal(h.last30.rainIn, 3);
  assert.equal(h.last20.heat32, 460);
  assert.equal(h.observationAgeDays, 1);
  assert.equal(h.recentSnowDepthIn, 0);
});
test('incomplete rain is never converted into zero rain', () => {
  const h = summarize(sample().map((d, i) => i % 2 ? { ...d, rain: null } : d), TODAY);
  assert.equal(h.last7.rainIn, null);
  assert.equal(evaluate(h, [todayForecast()])[0].verdict, 'Data limited');
});
test('stale observations veto a claim of favorable morel weather', () => {
  const h = summarize(sample(40).slice(0, -5), TODAY);
  assert.equal(h.observationAgeDays, 6);
  assert.equal(evaluate(h, [todayForecast()])[0].verdict, 'Data limited');
});
test('midnight and daylight saving are evaluated in the requested local zone', () => {
  assert.equal(localDate('2026-04-21T02:00:00Z'), '2026-04-20');
  assert.equal(localDate('2026-04-21T02:00:00Z', 'America/Denver'), '2026-04-20');
  assert.equal(localDate('2026-04-21T07:00:00Z', 'America/Denver'), '2026-04-21');
});
test('NWS day/night, precipitation chance, Celsius conversion', () => {
  const d = forecastDays([
    { startTime: '2026-04-20T12:00:00-04:00', temperature: 18, temperatureUnit: 'C',
      isDaytime: true, probabilityOfPrecipitation: { value: 60 } },
    { startTime: '2026-04-20T20:00:00-04:00', temperature: 7, temperatureUnit: 'C',
      isDaytime: false, probabilityOfPrecipitation: { value: 70 } }
  ], null, TODAY);
  assert.equal(d.length, 1);
  assert.equal(d[0].highF, 64);
  assert.equal(d[0].lowF, 45);
  assert.equal(d[0].rainChancePct, 70);
  assert.equal(d[0].forecastRainIn, null);
});
test('NWS six hour QPF that crosses local midnight is split, NOT charged to one day', () => {
  const periods = [
    { startTime: '2026-04-20T12:00:00-04:00', temperature: 64, isDaytime: true },
    { startTime: '2026-04-20T20:00:00-04:00', temperature: 44, isDaytime: false },
    { startTime: '2026-04-21T12:00:00-04:00', temperature: 66, isDaytime: true },
    { startTime: '2026-04-21T20:00:00-04:00', temperature: 46, isDaytime: false }
  ];
  const days = forecastDays(periods, [
    { validTime: '2026-04-20T21:00:00-04:00/PT6H', value: 25.4 }
  ], TODAY);
  assert.equal(days.length, 2);
  assert.equal(days[0].forecastRainCoverageHours, 3);
  assert.equal(days[1].forecastRainCoverageHours, 3);
  assert.equal(days[0].forecastRainIn, null); // 3 hours != complete day
  assert.equal(days[1].forecastRainIn, null);
});
test('usable full day gridded rain counts as forecast rain', () => {
  const periods = [
    { startTime: '2026-04-20T12:00:00-04:00', temperature: 65, isDaytime: true },
    { startTime: '2026-04-20T20:00:00-04:00', temperature: 45, isDaytime: false },
    { startTime: '2026-04-21T12:00:00-04:00', temperature: 65, isDaytime: true },
    { startTime: '2026-04-21T20:00:00-04:00', temperature: 45, isDaytime: false }
  ];
  const values = [0, 6, 12, 18].map(h => ({
    validTime: '2026-04-21T' + String(h).padStart(2, '0') + ':00:00-04:00/PT6H', value: 2.54
  }));
  const days = forecastDays(periods, values, TODAY);
  assert.equal(days[1].forecastRainCoverageHours, 24);
  assert.equal(days[1].forecastRainIn, 0.4);
});
test('isolated previous measured heavy rain plus warmth enables favorable pattern', () => {
  const h = withRecentEvent(), d = evaluate(h, [todayForecast()]);
  assert.equal(d[0].verdict, 'Favorable pattern');
  assert.equal(d[0].confidence, 'moderate');
  assert.equal(Object.hasOwn(d[0], 'probability'), false);
});
test('ordinary drizzle does not get promoted to a post-soaking rain window', () => {
  const h = summarize(sample(), TODAY), d = evaluate(h, [todayForecast()]);
  assert.equal(d[0].verdict, 'Warm, moisture uncertain');
});
test('forecast rain produces a "rain approaching" day rather than instant prime', () => {
  const h = summarize(sample(40, 55, 0), TODAY);
  const day = todayForecast({ forecastRainIn: 0.3 });
  assert.equal(evaluate(h, [day])[0].verdict, 'Rain approaching');
});
test('a forecast soaking creates an opportunity only on following days', () => {
  const h = summarize(sample(40, 55, 0), TODAY);
  const forecasts = [0, 1, 2].map(i => ({
    date: addDays(TODAY, i), highF: 65, lowF: 45, forecastRainIn: i === 0 ? 0.3 : 0
  }));
  const d = evaluate(h, forecasts);
  assert.equal(d[0].verdict, 'Rain approaching');
  assert.equal(d[1].verdict, 'Favorable pattern');
});
test('a six-hour data gap never fabricates a future mean or green rating', () => {
  const h = withRecentEvent();
  const d = evaluate(h, [todayForecast({ lowF: null })]);
  assert.equal(d[0].projected7DayAirMeanF, null);
  assert.equal(d[0].verdict, 'Data limited');
});
test('NWS Tonight first-day partial forecast does not invalidate all six later days', () => {
  const h = withRecentEvent();
  const later = [todayForecast({ highF: null }),
    { date: addDays(TODAY, 1), highF: 66, lowF: 46, forecastRainIn: null },
    { date: addDays(TODAY, 2), highF: 66, lowF: 46, forecastRainIn: null }];
  const result = evaluate(h, later);
  assert.equal(result[0].verdict, 'Data limited');
  assert.equal(result[1].partialForecastGap, true);
  assert.equal(result[1].confidence, 'low');
  assert.equal(result[1].projected7DayAirMeanF, null);
  assert.notEqual(result[1].verdict, 'Favorable pattern');
  assert.notEqual(result[1].verdict, 'Data limited');
});
test('hard freeze overrides otherwise favorable warmth/moisture', () => {
  const h = withRecentEvent();
  assert.equal(evaluate(h, [todayForecast({ lowF: 25 })])[0].verdict, 'Freeze risk');
});
test('recent snow cover suppresses favorable rating', () => {
  const obs = sample();
  obs[obs.length - 1].snowDepth = 3;
  const h = summarize(obs, TODAY);
  assert.equal(evaluate(h, [todayForecast()])[0].verdict, 'Snow covered');
});
test('late spring cool rebound does not reopen a concluded season', () => {
  const hotStart = Array.from({ length: 10 }, (_, i) => ({
    date: addDays(TODAY, i - 29), avg: 72, rain: 0.1, snowDepth: 0
  }));
  const obs = [...hotStart, ...Array.from({ length: 19 }, (_, i) => {
    const date = addDays(TODAY, i - 19);
    return { date, avg: 55, rain: 0.2, snowDepth: 0 };
  })];
  const h = summarize(obs, TODAY);
  assert.equal(h.peakedThisSpring, true);
  assert.equal(evaluate(h, [todayForecast()])[0].verdict, 'Window past');
});
test('station selection accounts for observation quality, distance and freshness', () => {
  const good = { uid: 1, meta: { ll: [-83.88, 43.59] }, summary: summarize(sample(), TODAY) };
  const bad = { uid: 2, meta: { ll: [-84.4, 43.7] },
    summary: summarize(sample().slice(0, -7), TODAY) };
  const ranked = rankStationCandidates([bad, good], { lat: 43.5945, lon: -83.8889 });
  assert.equal(ranked[0].uid, 1);
  assert.ok(distanceKm(43.59, -83.88, 43.59, -83.88) < 1);
});
test('geographic profile must be validated, western burn-morel scores not fabricated', () => {
  const result = evaluate(withRecentEvent(), [todayForecast()],
    { profile: 'western-postfire-morel-v1' });
  assert.equal(result[0].verdict, 'Data limited');
});
test('forecast produces seven distinct local days at most', () => {
  const periods = Array.from({ length: 20 }, (_, i) => ({
    startTime: addDays(TODAY, i) + 'T12:00:00-04:00',
    temperature: 65, isDaytime: true
  }));
  assert.equal(forecastDays(periods, [], TODAY).length, 7);
});
