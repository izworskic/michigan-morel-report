# Morel decision engine: national rollout contract

## What is implemented
The current Michigan site and its five regional GDD bars remain intact. lib/morel-engine.js is the portable weather evaluator, lib/morel-regions.js records supported geography, and api/outlook.js adapts official ACIS observations and NWS forecasts. No unverified national region has been activated.

Historical evidence: 3/7/14/30-day rainfall, 7-day mean air temperature, 20-day air heat (base 32 F), snow depth, observation freshness, station completeness and proximity. Future evidence: NWS highs and lows, freezing risk, rain chance and gridded precipitation split across local calendar days. Missing rainfall is always unknown, never zero; an incomplete temperature forecast cannot inherit a favorable historical verdict.

Forecast rain and measured rain are different and explicitly labeled. The calculator does not output probabilities of finding mushrooms. Confidence means evidence availability and forecast horizon, not field-validated ecological skill. The model is for spring only. Rain screening thresholds and air-warming ranges are provisional, not scientifically calibrated cutoffs.

## Geography and editorial breakdown after calibration
1. United States -> large ecological/weather region -> state -> local scouting subregion. The MI five-segment experience is the template, not one undifferentiated state pin.
2. Eastern U.S.: Southeast, Midwest, Great Lakes and Northeast grouped by ecological and seasonal differences, with state pages and separate local subregion forecast cells.
3. Western U.S.: Rockies and Pacific Northwest require separate altitude, snowmelt, forest association, wildfire perimeter, burn severity, and burn-age profiles. Do NOT enable the current eastern temperature rule for western post-fire morels.
4. Each national or regional map point stands for a broad forecast area, not a foraging location. Do not publish exact foraging spots.
5. Preserve current chart vocabulary, source attribution, map/UI styling, regional drill-down links, and mobile fit when the national experience is later built.

## Definition of a validated engine
1. Collect several years of date-stamped, coarse-location morel emergence observations, preferably species-identified and with provenance.
2. Replay every forecast using only observations and forecasts available on that historical issuance date (no future-data leakage).
3. Evaluate first emergence date error, early/late false alerts, missed periods, abstention rates, and skill versus the existing temperature-only model.
4. Hold out entire seasons and areas; require out-of-sample improvement before adding each predictor.
5. Validate air-to-soil proxy against measured soil temperatures where available and licensed.
6. Do not display numerical mushroom probabilities until properly calibrated.

## Operational gates
ACIS station IDs must be verified before enabling a new region. A representative NWS forecast point does not speak for every slope or forest in a broad region. Verify live upstream endpoints during March-June because the endpoint abstains outside spring. ACIS/NWS outages must be reported as missing data. Last reported snow depth may not match remote woods. Rainfall QPF is divided evenly within each forecast interval, a transparent approximation rather than an exact hourly prediction.

## Sources
- https://namyco.org/publications/mcilvainea-journal-of-american-amateur-mycology/is-it-time-for-morels-yet/
- https://naturalresources.extension.iastate.edu/post/soil-temperatures-predictors-mushroom-emergence
- https://docs.rcc-acis.org/acisws/
- https://www.weather.gov/documentation/services-web-api

## Test
node --experimental-default-type=module --test tests/outlook.test.mjs