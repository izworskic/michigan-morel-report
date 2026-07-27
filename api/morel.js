// /api/morel — aggregates ACIS station temperature into a soil warming read per region.
//
// Why this is server side even though ACIS allows cross origin requests: five
// regions times several stations times a season of daily records plus a ten
// year normal is far too much to pull from a phone. It is fetched once here and
// cached.
//
// What the model is, stated plainly because the site says so too: morels are
// triggered by soil temperature, but Michigan has only a handful of public soil
// temperature stations, so soil warming is MODELLED from air temperature. Soil
// at a few inches behaves like a lagged, damped average of the air above it, so
// a trailing seven day mean air temperature is used as the proxy. That is a
// guide to timing, not a thermometer reading.

export const config = { runtime: 'edge' };

const ACIS = 'https://data.rcc-acis.org/StnData';

const REGIONS = [
  { slug: 'southern-michigan', name: 'Southern Michigan',
    towns: 'Kalamazoo, Jackson, Ann Arbor, Grand Rapids', uids: [9721, 69, 31532, 9835] },
  { slug: 'central-michigan', name: 'Central Michigan',
    towns: 'Lansing, Saginaw, Flint', uids: [70, 31805, 9846] },
  { slug: 'northern-lower', name: 'Northern Lower',
    towns: 'Cadillac, Traverse City, Gaylord, Houghton Lake', uids: [29345, 10021, 10051, 29645] },
  { slug: 'eastern-up', name: 'Eastern Upper Peninsula',
    towns: 'Sault Ste Marie, Newberry, Escanaba', uids: [10158, 10149, 10091] },
  { slug: 'western-up', name: 'Western Upper Peninsula',
    towns: 'Marquette, Iron Mountain, Hancock', uids: [71, 10105, 29678] }
];

// Thresholds on the trailing seven day mean air temperature. Sources put the
// morel trigger at soil in the low to mid 50s Fahrenheit; validated against the
// 2026 season these thresholds reproduced the documented south to north spread
// of roughly five weeks.
const T_WATCH = 45;
const T_PRIME = 52;
const T_FADING = 62;
const T_OVER = 68;

// The season is gated on the calendar before temperature is even considered.
// Without that gate the model is badly wrong twice a year: in autumn the
// trailing mean descends back through the same 52 to 62 band it climbed in
// spring, and the site would cheerfully announce a prime morel window in
// October. Morels fruit in spring. Temperature alone cannot tell spring from
// autumn, so the calendar has to.
const SEASON_START_MONTH = 3;   // March
const SEASON_END_MONTH = 6;     // through June

function inSeason(dateStr) {
  const m = Number(dateStr.slice(5, 7));
  return m >= SEASON_START_MONTH && m <= SEASON_END_MONTH;
}

function stage(t7, dateStr, peakedAlready) {
  if (!dateStr || !inSeason(dateStr)) {
    return { key: 'offseason', label: 'Off season',
             why: 'Morels fruit in spring. Tracking resumes in March.' };
  }
  if (t7 === null) return { key: 'unknown', label: 'No data', why: 'No station data for this region.' };
  // Once a region has run hot for the year the window does not reopen, even if
  // a cool spell drops the trailing mean back into the prime band.
  if (peakedAlready) {
    return { key: 'over', label: 'Season past',
             why: 'This region already ran past the window this spring.' };
  }
  if (t7 < T_WATCH) return { key: 'cold', label: 'Too cold',
    why: 'Ground is still too cold. Nothing is coming up yet.' };
  if (t7 < T_PRIME) return { key: 'watch', label: 'Warming, watch',
    why: 'Soil is climbing toward the trigger. Start watching indicator plants and check south facing slopes.' };
  if (t7 < T_FADING) return { key: 'prime', label: 'Prime window',
    why: 'Modelled soil warmth is in the band morels fruit in. Go after a rain.' };
  if (t7 < T_OVER) return { key: 'fading', label: 'Window fading',
    why: 'Running warm. The window is closing here and moving north.' };
  return { key: 'over', label: 'Season past',
    why: 'Too warm. The season has moved north of here.' };
}

async function stnData(uid, sdate, edate) {
  const r = await fetch(ACIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, sdate, edate, elems: 'maxt,mint' })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j && j.data ? j.data : null;
}

// Walk daily records accumulating growing degree days base 50 and a trailing
// seven day mean of the daily average.
function walk(rows) {
  let gdd = 0;
  const trail = [];
  let last = null;
  let firstPrime = null;
  let peaked = false;
  for (const [d, mxs, mns] of rows) {
    const mx = parseFloat(mxs), mn = parseFloat(mns);
    if (!isFinite(mx) || !isFinite(mn)) continue;
    const avg = (mx + mn) / 2;
    gdd += Math.max(0, avg - 50);
    trail.push(avg);
    if (trail.length > 7) trail.shift();
    const t7 = trail.reduce((a, b) => a + b, 0) / trail.length;
    if (firstPrime === null && trail.length === 7 && t7 >= T_PRIME) firstPrime = d;
    if (trail.length === 7 && t7 >= T_OVER) peaked = true;
    last = { date: d, avg, t7, gdd };
  }
  return { last, firstPrime, peaked };
}

export default async function handler() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const today = now.toISOString().slice(0, 10);
  const seasonStart = `${year}-03-01`;

  const out = [];
  for (const reg of REGIONS) {
    // current season, first station that returns usable data
    let cur = null, usedUid = null;
    for (const uid of reg.uids) {
      const rows = await stnData(uid, seasonStart, today);
      if (rows && rows.length) {
        const w = walk(rows);
        if (w.last) { cur = w; usedUid = uid; break; }
      }
    }

    // ten year normal of accumulated GDD to this same calendar date
    let normal = null;
    if (usedUid) {
      const md = today.slice(5);
      const sums = [];
      for (let y = year - 10; y < year; y++) {
        const rows = await stnData(usedUid, `${y}-03-01`, `${y}-${md}`);
        if (!rows || !rows.length) continue;
        const w = walk(rows);
        if (w.last) sums.push(w.last.gdd);
      }
      if (sums.length >= 5) {
        sums.sort((a, b) => a - b);
        normal = {
          years: sums.length,
          mean: sums.reduce((a, b) => a + b, 0) / sums.length,
          median: sums[Math.floor(sums.length / 2)],
          min: sums[0],
          max: sums[sums.length - 1]
        };
      }
    }

    const t7 = cur && cur.last ? cur.last.t7 : null;
    out.push({
      slug: reg.slug,
      name: reg.name,
      towns: reg.towns,
      stationUid: usedUid,
      observedThrough: cur && cur.last ? cur.last.date : null,
      trailing7dayF: t7 === null ? null : Math.round(t7 * 10) / 10,
      gddBase50: cur && cur.last ? Math.round(cur.last.gdd) : null,
      firstPrimeDate: cur ? cur.firstPrime : null,
      normal: normal ? {
        years: normal.years,
        mean: Math.round(normal.mean),
        median: Math.round(normal.median),
        min: Math.round(normal.min),
        max: Math.round(normal.max)
      } : null,
      peakedThisSeason: cur ? !!cur.peaked : false,
      stage: stage(t7, cur && cur.last ? cur.last.date : null, cur ? cur.peaked : false)
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    generatedAt: new Date().toISOString(),
    model: 'trailing 7 day mean air temperature as a proxy for shallow soil warming, plus growing degree days base 50F accumulated from March 1',
    caveat: 'Soil warming is modelled from air temperature. Michigan has almost no public soil temperature stations. This is timing guidance, not a thermometer reading.',
    thresholdsF: { watch: T_WATCH, prime: T_PRIME, fading: T_FADING, over: T_OVER },
    regions: out
  }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=21600, stale-while-revalidate=43200'
    }
  });
}
