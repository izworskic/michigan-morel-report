import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../scripts/validate-morels.mjs';

test('real four-season sighting records can be re-simulated without raw locations', ()=>{
 const s=simulate();
 assert.equal(s.methodology.originalRecordsReviewed,674);
 assert.equal(s.overall.sightingAreaDays,216);
 assert.equal(s.overall.observations,542);
 assert.equal(s.reportAreaDaysNotMapped,0);
 assert.equal(s.distinctStationYearGroups,20);
 assert.equal(s.overall.metrics.strict.hit,61);
 assert.equal(s.overall.metrics.broad.hit,118);
 assert.equal(s.overall.metrics.tempOnly.hit,128);
 assert.equal(s.overall.metrics.strict.nearbyEnrichment,1.11);
 assert.equal(s.overall.metrics.tempOnly.nearbyEnrichment,1.05);
});
test('year splits show important sensitivity variation; do not advertise prediction accuracy', ()=>{
 const a=simulate().byYear;
 assert.deepEqual([2023,2024,2025,2026].map(y=>a[y].sightingAreaDays),[45,42,70,59]);
 assert.deepEqual([2023,2024,2025,2026].map(y=>a[y].metrics.strict.hit),[5,21,19,16]);
});
