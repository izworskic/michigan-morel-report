// Morel forecasting geography contract.
// Organize future content as USA -> zone -> state -> sub-state scouting area.
// Only five Michigan forecast areas have station lists and an enabled ecological
// weather profile today. Do not silently issue Eastern-MI rules for western
// burns, mountains or places lacking verified local station coverage.
import { MODEL_KIND } from './morel-engine.js';

export const REGION_LIST = Object.freeze([
  { id: 'southern-michigan', country: 'US', zone: 'Great Lakes', state: 'MI',
    name: 'Southern Michigan', place: 'Grand Rapids', lat: 42.9634, lon: -85.6681,
    timeZone: 'America/Detroit', uids: [9835, 9721, 69, 31532], profile: MODEL_KIND },
  { id: 'central-michigan', country: 'US', zone: 'Great Lakes', state: 'MI',
    name: 'Central Michigan', place: 'Saginaw / Bay City', lat: 43.5945, lon: -83.8889,
    timeZone: 'America/Detroit', uids: [31805, 70, 9846], profile: MODEL_KIND },
  { id: 'northern-lower', country: 'US', zone: 'Great Lakes', state: 'MI',
    name: 'Northern Lower', place: 'Gaylord', lat: 45.0275, lon: -84.6748,
    timeZone: 'America/Detroit', uids: [10051, 29345, 10021, 29645], profile: MODEL_KIND },
  { id: 'eastern-up', country: 'US', zone: 'Great Lakes', state: 'MI',
    name: 'Eastern Upper Peninsula', place: 'Sault Ste. Marie', lat: 46.4977, lon: -84.3476,
    timeZone: 'America/Detroit', uids: [10158, 10149, 10091], profile: MODEL_KIND },
  { id: 'western-up', country: 'US', zone: 'Great Lakes', state: 'MI',
    name: 'Western Upper Peninsula', place: 'Marquette', lat: 46.5436, lon: -87.3954,
    timeZone: 'America/Detroit', uids: [71, 10105, 29678], profile: MODEL_KIND }
]);
export const REGION_BY_ID = Object.freeze(Object.fromEntries(REGION_LIST.map(r => [r.id, r])));
export const AREA_SCHEMA_VERSION = '1.0';
