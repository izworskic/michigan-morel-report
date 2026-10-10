import test from 'node:test';
import assert from 'node:assert/strict';
import { parseACIS, summarize, forecastDays, evaluate } from '../api/outlook.js';

function day(d, avg = 55, rain = 0.1, snow = 0) {
  return { date: d, high: avg + 5, low: avg - 5, avg, rain, snowDepth: snow };
}
function recentDays(today, count, avg = 55, rain = 0.1) {
  const t = Date.parse(today + 'T12:00:00Z');
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(t - (count - i) * 86400000).toISOString().slice(0, 10);
    return day(d, avg, rain);
  });
}
test('ACIS preserves missing precipitation and treats a trace as zero', () => {
  const parsed = parseACIS([
    ['2026-04-01', '65', '45', 'T', '0'],
    ['2026-04-02', '65', '45', 'M', 'M'],
    ['2026-04-03', 'M', '43', '0.26', '1']
  ]);
  assert.equal(parsed[0].rain, 0);
  assert.equal(parsed[1].rain, null);
  assert.equal(parsed[2].avg, null);
  assert.equal(parsed[2].snowDepth, 1);
});
test('historical windows include 7, 14, 20, 30 days and complete rain', () => {
  const h = summarize(recentDays('2026-04-20', 40), '2026-04-20');
  assert.equal(h.last7.meanF, 55);
  assert.equal(h.last7.rainIn, 0.7);
  assert.equal(h.last14.rainIn, 1.4);
  assert.equal(h.last30.rainIn, 3);
  assert.equal(h.last20.heat32, 460);
  assert.equal(h.observationAgeDays, 1);
  assert.equal(h.recentSnowDepthIn, 0);
});
test('missing rain data never becomes a dry period', () => {
  const obs = recentDays('2026-04-20', 35).map((d, i) => i % 2 ? { ...d, rain: null } : d);
  const h = summarize(obs, '2026-04-20');
  assert.equal(h.last7.rainIn, null);
  const rated = evaluate(h, [{ date: '2026-04-20', highF: 65, lowF: 45, forecastRainIn: null }]);
  assert.equal(rated[0].verdict, 'Data limited');
});
test('NWS day and night periods and gridded millimeters convert correctly', () => {
  const result = forecastDays([
    { startTime: '2026-04-20T12:00:00-04:00', temperature: 65, isDaytime: true,
      probabilityOfPrecipitation: { value: 60 }, shortForecast: 'Showers possible' },
    { startTime: '2026-04-20T20:00:00-04:00', temperature: 45, isDaytime: false,
      probabilityOfPrecipitation: { value: 70 }, shortForecast: 'Rain' }
  ], [{ validTime: '2026-04-20T18:00:00-04:00/PT6H', value: 5.08 }], '2026-04-20');
  assert.equal(result.length, 1);
  assert.equal(result[0].rainChancePct, 70);
  assert.equal(result[0].forecastRainIn, 0.2);
  assert.equal(result[0].highF, 65);
  assert.equal(result[0].lowF, 45);
});
test('warmth plus observed recent rain is favorable but not a probability', () => {
  const h = summarize(recentDays('2026-04-20', 40, 55, 0.1), '2026-04-20');
  const rated = evaluate(h, [{ date: '2026-04-20', highF: 65, lowF: 45, forecastRainIn: null }]);
  assert.equal(rated[0].verdict, 'Favorable pattern');
  assert.equal(rated[0].confidence, 'moderate');
  assert.equal(Object.hasOwn(rated[0], 'probability'), false);
});
test('recent station snow cover vetoes favorable classification', () => {
  const obs = recentDays('2026-04-20', 40, 55, 0.1);
  obs[obs.length - 1].snowDepth = 3;
  const h = summarize(obs, '2026-04-20');
  const rated = evaluate(h, [{ date: '2026-04-20', highF: 65, lowF: 45 }]);
  assert.equal(rated[0].verdict, 'Snow covered');
});
test('forecast hard freezes veto favorable classification', () => {
  const h = summarize(recentDays('2026-04-20', 40, 55, 0.1), '2026-04-20');
  const rated = evaluate(h, [{ date: '2026-04-20', highF: 65, lowF: 25 }]);
  assert.equal(rated[0].verdict, 'Freeze risk');
});
test('season already passed vetoes a late cooling rebound', () => {
  const obs = [...recentDays('2026-04-01', 10, 72), ...recentDays('2026-04-20', 19, 55, 0.1)];
  const h = summarize(obs, '2026-04-20');
  assert.equal(h.peakedThisSpring, true);
  const rated = evaluate(h, [{ date: '2026-04-20', highF: 65, lowF: 45 }]);
  assert.equal(rated[0].verdict, 'Window past');
});
