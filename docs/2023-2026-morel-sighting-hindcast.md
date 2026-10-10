# Michigan Morel Engine — Four-Year Sighting Simulation
**Run date:** October 10, 2026  
**Evaluation window:** April 1 – June 15, 2023–2026  
**Status:** Retrospective, exploratory *presence-only association*, NOT validated seven-day forecast skill.

## Dataset and reproducibility
- Official ACIS daily observed temperatures, rainfall and snow depth at five Michigan representative stations over four spring seasons (20 station-years). Raw sources: `tests/fixtures/mi-acis-weather-2023-2024.json`, `tests/fixtures/mi-acis-weather-2025-2026.json`.
- GBIF occurrence search for taxon `Morchella`, country `US`, stateProvince `Michigan`, year 2023–2026, basisOfRecord `HUMAN_OBSERVATION`; many entries originate from iNaturalist. Live data sources: https://api.gbif.org/v1/occurrence/search and https://www.inaturalist.org .
- **674** online occurrence records retrieved (111 from 2023, 84 from 2024, 245 from 2025, 234 from 2026). Remove **119** more than 130 kilometers from the nearest of the five reference stations and **13** with date outside March–June or incomplete. **542** usable occurrence observations remain.
- Group observation points only into station-linked REGION + LOCAL DATE, never store exact foraging coordinates, GBIF IDs, or personally identifying information. **216 distinct area-days with morel sightings.** Dataset `tests/fixtures/mi-morel-reports-2023-2026-aggregated.json`.
- The model is evaluated **as of the reported date** using only weather observed by the previous day. Because an archive of NWS forecasts issued on each historical date was not obtained, the prior day's actual daily high/low temperatures substitute as a *persistence weather guess* for the sighting date. No claim about actual NWS lead-time forecast quality.
- Re-run: `node --experimental-default-type=module scripts/validate-morels.mjs`; regression: `node --experimental-default-type=module --test tests/*.test.mjs`.

## Observed class coverage on 216 reported morel area-days

| Type | Sighting area-days | Fraction |
|---|---:|---:|
| Strict current engine “Favorable pattern” | 61 / 216 | **28.2%** |
| Expanded classes (Favorable, Warm/moisture uncertain, Rain approaching) | 118 / 216 | **54.6%** |
| Temperature only: preceding seven-day average 52°F–62°F | 128 / 216 | **59.3%** |

The first percentage is the *recall on presence-only area-days*, not detection accuracy or mushroom probability. There is no validated set of no-morel dates, so no false-positive rate, precision, specificity, or ROC/AUC can legitimately be calculated.

### Split by reporting year

| Year | Usable observations | Area-days | Strict favorable days | Strict match |
|---|---:|---:|---:|---:|
| 2023 | 86 | 45 | 5 | **11.1%** |
| 2024 | 67 | 42 | 21 | **50.0%** |
| 2025 | 205 | 70 | 19 | **27.1%** |
| 2026 | 184 | 59 | 16 | **27.1%** |

The very uneven year-to-year capture warns against marketing one national or even statewide threshold as reliable.

## Matched-calendar association, NOT proof of predictive skill

For every area-day with a reported morel:
1. **Month control:** calculate how often each rule fires among *all* calendar dates from the same area, year and month.
2. **Local ±7-day control:** repeat using the 15-day window centered on the report. Days without reports are not assumed mushroom-free (and reported dates remain in the control window).
3. Compare frequency on reported dates against these candidate dates. This yields enrichment/association only, never true forecast “accuracy.”

| Trigger | Report dates | Same-month comparison | Month enrichment | Nearby ±7-day comparison | Nearby enrichment |
|---|---:|---:|---:|---:|---:|
| Strict rainfall + warmth | 28.2% | 21.0% | **1.34×** | 25.5% | **1.11×** |
| Broad opportunity | 54.6% | 45.1% | **1.21×** | 53.1% | **1.03×** |
| Temperature only | 59.3% | 48.6% | **1.22×** | 56.7% | **1.05×** |

**Interpretation:** Close-in-time discrimination is weak. The strict rain + warmth indicator is slightly more enriched than the temperature-only benchmark at ±7 days (1.11 vs 1.05), but it catches far fewer reported dates. This is not sufficient evidence that rain thresholds improve a real hunting decision, especially given wide station-to-report spatial distances and observation-selection bias.

## Important examples and weaknesses
- Michigan's 2023 area-day observations include several reports when the regional station's preceding seven-day mean was still below our 45°F “Too cold” band. Soil may lag/differ from air; the nearest station may be as much as 130 km away, and morel species/landscape vary.
- The strict rule matched only 5 of 45 area-days in 2023, but 21 of 42 in 2024. A model that “works” in one spring but misses the next needs cross-year calibration before expansion.
- The five weather regions are too broad; a morel reported near Cadillac should not be compared to a Gaylord airport thermometer as if they share identical microclimates.
- A collector may report an established fruiting body days after first emergence. These reports are presence dates, not first-fruiting dates.
- Citizen-science observations are biased by access, weekend activity, observer effort, photographic identification, and late upload; daily nonreports do not establish absence.
- The GBIF-human-observation dataset was NOT independently screened for research-grade IDs or for measurement precision. Association may shift with stricter identification and location-uncertainty filters.
- Multi-year daily station observations are now available for reproducibility. Archived issuance-time NWS high/low/QPF forecasts were not obtained, so this is not a seven-day forecast replay or an independently held-out accuracy trial.

## Decision
1. **Keep existing labels experimental; do not use a numeric chance to find morels.**
2. **Prioritize subregions**, with correctly linked representative stations (Cadillac vs Gaylord, western Lower lake effect vs inland, western vs eastern UP).
3. In a new, separately held-out season, compare temperature alone vs temperature + rainfall + rolling soil-temperature proxy, reporting both sensitivity (presence coverage) and specificity only if credible, verified negative-effort records exist.
4. Obtain archived issuance-time forecasts to measure next-week decision accuracy; track station/report distance and species identity when available, but do not publish exact foraging locations.
5. Apply any threshold changes only after pre-registering hypotheses and measuring out-of-sample improvement. **Do not tune against the same four seasons and advertise the resulting fit as validation.**

**Primary sources:** GBIF API: https://www.gbif.org/developer/occurrence and https://api.gbif.org/v1/occurrence/search ; Morel hunter's dated submissions for independent cross-check: https://www.thegreatmorel.com/2025-sightings-map/ and https://www.thegreatmorel.com/morel-sightings/ ; NOAA ACIS https://docs.rcc-acis.org/acisws/ .
