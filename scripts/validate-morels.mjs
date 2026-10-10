/**
 * Four-year, presence-only, retrospective WEATHER-ASSOCIATION analysis.
 * Run: node --experimental-default-type=module scripts/validate-morels.mjs
 * DO NOT quote these rates as mushroom probabilities or forecast skill.
 *
 * Input provenance:
 * - tests/fixtures/mi-acis-weather-2023-2024.json (official ACIS daily records)
 * - tests/fixtures/mi-acis-weather-2025-2026.json (official ACIS daily records)
 * - tests/fixtures/mi-morel-reports-2023-2026-aggregated.json (GBIF/iNaturalist
 *   public human observations, aggregated to date x broad station region)
 *
 * Privacy: do not print any occurrence IDs, personal information, or exact spots.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseACIS, summarize, evaluate, addDays } from '../lib/morel-engine.js';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>JSON.parse(readFileSync(resolve(ROOT,p),'utf8'));
const OLD='tests/fixtures/mi-acis-weather-2023-2024.json';
const NEW='tests/fixtures/mi-acis-weather-2025-2026.json';
const SIGHT='tests/fixtures/mi-morel-reports-2023-2026-aggregated.json';
export const STRICT='Favorable pattern';
export const OPPORTUNITY=['Favorable pattern','Warm, moisture uncertain','Rain approaching'];

export function simulate() {
  const sources=[...read(OLD).stations,...read(NEW).stations];
  const sightingData=read(SIGHT), sightings=sightingData.aggregatedAreaDays;
  const dayById=new Map(), all=[];
  for(const station of sources) {
    const records=parseACIS(station.observations);
    const byDate=new Map(records.map(x=>[x.date,x]));
    for(const todayRecord of records) {
      const date=todayRecord.date;
      if(date.slice(5,7)<'04'||date.slice(5,7)>'06'||date>station.year+'-06-15') continue;
      const previous=byDate.get(addDays(date,-1));
      // As-of-date calculation uses only weather completed by yesterday.
      const history=summarize(records.filter(x=>x.date<date),date);
      // No issuance-time archive exists: yesterday's observed high and low
      // stand in as a one-day PERSISTENCE weather guess for today.
      const forecast={date,highF:previous?.high??null,
        lowF:previous?.low??null,forecastRainIn:null};
      const verdict=evaluate(history,[forecast])[0].verdict;
      const day={
        year:station.year,region:station.region,date,month:date.slice(0,7),
        verdict,strict:verdict===STRICT,
        broad:OPPORTUNITY.includes(verdict),
        tempOnly:Number.isFinite(history.last7.meanF)&&
          history.last7.meanF>=52&&history.last7.meanF<62
      };
      all.push(day);
      dayById.set(station.region+'|'+date,day);
    }
  }
  const cases=sightings.map(o=>({...o,...dayById.get(o.region+'|'+o.date)}))
    .filter(d=>typeof d.verdict==='string');
  const groups=Array.from(new Set(cases.map(d=>d.year+'|'+d.region)));
  const months=new Map(), weeks=new Map();
  for(const c of cases) {
    const monthKey=c.year+'|'+c.region+'|'+c.month;
    if(!months.has(monthKey))months.set(monthKey,all.filter(d=>
      d.year===c.year&&d.region===c.region&&d.month===c.month));
    const weekKey=c.region+'|'+c.date;
    if(!weeks.has(weekKey)) {
      const center=Date.parse(c.date+'T12:00:00Z');
      weeks.set(weekKey,all.filter(d=>d.region===c.region&&d.year===c.year&&
        Math.abs(Date.parse(d.date+'T12:00:00Z')-center)<=7*86400000));
    }
  }
  function summary(rows) {
    const n=rows.length, count=rows.reduce((a,x)=>a+x.count,0);
    const metrics={};for(const metric of ['strict','broad','tempOnly']) {
      const observed=rows.filter(x=>x[metric]).length;
      let monthExpected=0, nearbyExpected=0;
      for(const x of rows){
        const m=months.get(x.year+'|'+x.region+'|'+x.month);
        const w=weeks.get(x.region+'|'+x.date);
        monthExpected+=m.filter(d=>d[metric]).length/m.length;
        nearbyExpected+=w.filter(d=>d[metric]).length/w.length;
      }
      const rate=observed/n, m=monthExpected/n, near=nearbyExpected/n;
      metrics[metric]={
        hit:observed,dayCount:n,hitPct:Math.round(rate*1000)/10,
        monthMatchedPct:Math.round(m*1000)/10,
        monthEnrichment:m?Math.round(rate/m*100)/100:null,
        nearbyMatchedPct:Math.round(near*1000)/10,
        nearbyEnrichment:near?Math.round(rate/near*100)/100:null
      };
    }
    const counts={};for(const c of rows)counts[c.verdict]=(counts[c.verdict]||0)+1;
    return {sightingAreaDays:n,observations:count,counts,metrics};
  }
  return {
    methodology:{
      inputYears:[2023,2024,2025,2026],
      candidateWeatherDays:all.length,stations:5,stationYears:sources.length,
      originalRecordsReviewed:sightingData.recordsFetched,
      reasonForExclusion:sightingData.rejected,
      definition:'A reported sighting area-day is one calendar date x station-anchored region with one or more public morel records. Positive-only data; nonreports are NOT negative sightings.',
      simulation:'Previous-day observed high/low persistence surrogate, not archived NWS forecasts. All history strictly before report day.',
      monthControl:'Mean classification rate on all dates from same region, year and month for each reported area-day.',
      nearbyControl:'Mean classification rate in +/-7-day window (15 calendar days) in same region and year, including the sighting day itself.',
      privacy:'No exact coordinates or observation IDs stored in the aggregated fixture.'
    },
    overall:summary(cases),
    byYear:Object.fromEntries([2023,2024,2025,2026].map(y=>[y,summary(cases.filter(c=>c.year===y))])),
    byRegion:Object.fromEntries([...new Set(cases.map(c=>c.region))].sort()
      .map(region=>[region,summary(cases.filter(c=>c.region===region))])),
    byDistance:Object.fromEntries([30,50,80,130].map(maxKm=>[maxKm,summary(cases.filter(c=>c.maxStationDistanceKm<=maxKm))])),
    reportAreaDaysNotMapped:sightings.length-cases.length,
    distinctStationYearGroups:groups.length
  };
}
const summary=simulate();
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1])){
 console.log(JSON.stringify(summary,null,2));
}
