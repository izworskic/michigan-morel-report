// Reproducible historic input replay.  These tests prove faithful processing of
// REAL ACIS observations, not skill in predicting mushrooms or archived forecasts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseACIS, summarize, addDays } from '../lib/morel-engine.js';
import { station } from '../api/outlook.js';

const data = JSON.parse(readFileSync(new URL('./fixtures/mi-acis-weather-2025-2026.json', import.meta.url)));
const expected = {
  '2025:southern-michigan': '2025-04-23',
  '2026:southern-michigan': '2026-04-14',
  '2025:central-michigan': '2025-04-24',
  '2026:central-michigan': '2026-04-15',
  '2025:northern-lower': '2025-05-12',
  '2026:northern-lower': '2026-04-18',
  '2025:eastern-up': '2025-05-14',
  '2026:eastern-up': '2026-05-19',
  '2025:western-up': '2025-05-13',
  '2026:western-up': '2026-05-19'
};
function firstThreshold(observations, threshold = 52) {
  let last = null;
  const trail = [];
  for (const d of parseACIS(observations)) {
    if (d.avg === null) { trail.length = 0; last = d.date; continue; }
    if (last && addDays(last, 1) !== d.date) trail.length = 0;
    trail.push(d.avg);
    if (trail.length > 7) trail.shift();
    last = d.date;
    if (trail.length === 7 && trail.reduce((a, b) => a + b, 0) / 7 >= threshold)
      return d.date;
  }
  return null;
}
test('full real station fixture has 10 complete spring date ranges', () => {
  assert.equal(data.stations.length, 10);
  assert.equal(data.stations.reduce((n, s) => n + s.observations.length, 0), 1070);
  assert.equal(data.stations.filter(s => s.year === 2025).length, 5);
  assert.equal(data.stations.filter(s => s.year === 2026).length, 5);
  for (const s of data.stations) {
    assert.equal(s.meta.uid, s.uid);
    assert.equal(s.meta.state, 'MI');
    assert.equal(s.observations.length, 107);
    assert.equal(s.observations[0][0], s.year + '-03-01');
    assert.equal(s.observations.at(-1)[0], s.year + '-06-15');
    for (let i = 1; i < s.observations.length; i++)
      assert.equal(s.observations[i][0], addDays(s.observations[i-1][0], 1));
  }
});
test('spring air-temperature screening dates reproduce real archived input', () => {
  for (const s of data.stations) {
    const key = s.year + ':' + s.region;
    assert.equal(firstThreshold(s.observations), expected[key], key);
  }
});
test('regional weather source completeness is visible, not blindly trusted', () => {
  const n = data.stations.find(s => s.year === 2025 && s.region === 'northern-lower');
  assert.ok(n);
  const d = parseACIS(n.observations);
  assert.ok(d.filter(v => v.avg === null).length >= 10);
  const summary = summarize(d, '2025-05-15');
  assert.equal(summary.observedThrough, '2025-05-14');
  assert.ok(summary.last20.temperatureCoverage < 1);
});
test('season-wide station fetch includes March 1 even for late June queries', async () => {
  const original = globalThis.fetch;
  let request = null;
  globalThis.fetch = async (_url, opts) => {
    request = JSON.parse(opts.body);
    return new Response(JSON.stringify({
      meta: { uid: 31805, name: 'SAGINAW MBS INTL AP', ll: [-84.08133, 43.52808] },
      data: data.stations.find(s => s.year === 2026 && s.uid === 31805).observations
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const result = await station(31805, '2026-06-15');
    assert.equal(request.uid, 31805);
    assert.equal(request.sdate, '2026-03-01');
    assert.equal(request.edate, '2026-06-14');
    assert.equal(request.elems, 'maxt,mint,pcpn,snwd');
    assert.equal(result.summary.observedThrough, '2026-06-14');
  } finally {
    globalThis.fetch = original;
  }
});
