# Michigan Morel Decision Engine — Validation Audit (2026-10-10)

## Verdict
**Software-data pipeline: partially verified; real archived spring observations: reproducible; predictive mushroom-emergence accuracy: NOT VALIDATED.** This audit does not claim reliable probabilities or that a daily 'Favorable pattern' corresponds to a particular number of morels.

## Source-data verification
- Pulled 1,070 observed daily station rows from ACIS StnData covering March 1 to June 15 in both 2025 and 2026: 5 representative Michigan stations x 2 years x 107 dates. Full raw input fixture: tests/fixtures/mi-acis-weather-2025-2026.json.
- Observed stations: Grand Rapids/KGRR (ACIS uid 9835), Saginaw/MBS (31805), Gaylord/Otsego (10051), Sault Ste. Marie/Sanderson (10158), Marquette WFO (71). Real metadata are stored with the fixture.
- ACIS documentation names sid as the required station selector, but live GET responses confirmed that uid=31805 and other tested UIDs also work and return metadata. Do not treat uid as a confirmed outage. POST service was not directly accessible to the external fetch client; a mock contract test covers its parameters.
- Production off-season endpoint /api/outlook?region=central-michigan returned well-formed JSON with offseason=true and no hunting-day claims; /api/morel was also live, returning all five source regions and their selected station IDs.
- Production GDD chart and new outlook can select different regional weather stations; do not assume the first-date results below must equal the production chart for every region.

## 7-day air-temperature replay (screening threshold >=52 F)
These are **first dates when the station's contiguous 7-day average air temperature reached 52 F**. They are NOT morel observation dates or forecasts issued that morning.

| Reference station | 2025 | 2026 |
|---|---|---|
| Grand Rapids / uid 9835 | 2025-04-23 | 2026-04-14 |
| Saginaw-MBS / uid 31805 | 2025-04-24 | 2026-04-15 |
| Gaylord / uid 10051 | 2025-05-12 | 2026-04-18 |
| Sault Ste. Marie / uid 10158 | 2025-05-14 | 2026-05-19 |
| Marquette / uid 71 | 2025-05-13 | 2026-05-19 |

The reproduced dates vary from 9 to 24 days year-over-year depending on area. Replaying authentic inputs demonstrates the seasonal sensitivity; it does not establish empirical accuracy.

## Limited independently published sightings used as qualitative cross-checks
- The Great Morel 2025 sightings map lists Highland MI on April 23, Jackson MI on April 24, and Cadillac MI on April 25. That makes the April 23 Grand Rapids region crossing directionally plausible but demonstrates that Cadillac was reported 17 days **before** our Gaylord station crossed the rule (May 12). Different towns/subhabitats are not interchangeable.
- The Great Morel 2026 map lists Lupton and Interlochen MI on May 21, Rapid City on May 22, Eastport May 23, and Atlanta May 24, supporting activity in the northern Lower Peninsula during late May. They are not the first confirmed emergence reports for all of Northern Michigan.
- These are crowdsourced positive reports with coverage and identification biases, not exhaustive daily presence/absence surveys. Absence of a submitted report does not mean absence of mushrooms; coarse public location is not the original foraging site.
- https://www.thegreatmorel.com/2025-sightings-map/
- https://www.thegreatmorel.com/morel-sightings/
- https://www.michigan.gov/dnr/things-to-do/morels

## Example retrospective categorical checks
Examples below feed **observed same-day high/low temperatures** to the calculator, which is perfect hindsight, NOT archived NWS forecast data. Any calculation of future skill from these examples would be invalid.

| Date/representative station | Retrospective label | Notes |
|---|---|---|
| 2025-04-23 Grand Rapids | Warm, moisture uncertain | Report in southeastern Michigan the same date cannot validate this station |
| 2025-04-25 Gaylord | Warming, watch | Cadillac sighting the same day is 17 days before this station's first 52 F screening date |
| 2026-05-21 Gaylord | Favorable pattern | Northern MI morel sightings documented during that period; not a first-emergence test |
| 2026-05-23 Sault Ste. Marie | Warming, watch | No matched UP field observation available for that day |

## Actual defects and safeguards
- **Resolved**: historical outlook station call previously truncated inputs to 35 days before issuance. This could forget an earlier sustained hot spell and wrongly reopen spring later. It now requests March 1 through the last complete day, preserving season-long peak history.
- **Tested**: missing ACIS precipitation and temperature, trace rain and accumulated-value flags, NWS overnight and multi-hour precipitation intervals spanning midnight, daylight saving, hard freezes, measured snow cover, source freshness, missing future high/low, and a forecast beginning with Tonight. These are software scenario regressions, not ecological field validation.
- **Known limitation**: published Michigan chart and seven-day forecast can use different representative stations, leading to genuine local disparities. Geography must be subdivided and sources disclosed before a national map inherits the output.
- **Known limitation**: rainfall event cutoffs, 52-62 F 7-day air window and 20-day base-32 F air heat remain uncalibrated for Michigan; actual soil moisture/soil degree-days and species-specific ecology are not measured.

## What is still needed for genuine forecast validation
1. Import adequately verified, date- and broadly location-stamped Morchella observations over several years, retaining observation/report dates separately and respecting withheld locations.
2. Obtain archived **issuance-time NWS forecasts**, not realized weather, so 1-7-day predictive skill can be tested without future-data leakage.
3. Split Michigan into meteorologically defensible smaller forecast units (e.g. Cadillac vs Gaylord), with verified local station points and environment/terrain variation.
4. Pre-register metrics: median first emergence-date absolute error, false-favorable-day rate, missed opportunities, data-abstention fraction, confidence calibration, and baseline comparison; hold out entire years and areas.
5. Add calibrated measured soil temperature and soil moisture where practical, and make western post-fire Morels use a distinct ecology.

**Release gate:** Keep describing forecasts as qualitative spring weather patterns. Do not state a hit rate, accuracy percentage, or probability of mushrooms until steps 1-4 have been completed.