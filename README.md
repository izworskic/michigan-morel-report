# Michigan Morel Report

Tracks how far north Michigan's soil has warmed into the morel window, region by region, against a ten year
normal.

## The premise
Morel content online is folklore and calendar dates. The actual trigger is soil temperature: morels fruit when
soil at a few inches settles into roughly the low to mid fifties Fahrenheit, a few days after rain. Michigan
runs over four hundred miles south to north, so that trigger arrives about five weeks apart at the two ends.
This tracks the wave instead of publishing a date.

## The honest part
**Michigan has about three public soil temperature stations.** A search of the federal networks turns up three
in the whole state, two of them tribal installations. There is no soil temperature map of Michigan to plug into
because the instruments do not exist.

So soil warming is **modelled from air temperature**: a trailing seven day mean of daily average temperature as
a proxy for shallow soil, plus growing degree days base 50F accumulated from March 1, compared against a ten
year normal for the same date. ACIS supplies 569 Michigan stations. The site says all of this on its own pages.

Validated against the real 2026 season, the model reproduced the documented south to north spread without being
tuned to it: southern Michigan opened 14 April, the Upper Peninsula 19 May.

## The calendar gate
The model refuses to report a window outside March through June even when temperature says otherwise. Autumn
runs the same temperatures in reverse, so a temperature-only model would announce a prime morel window in
October. Morels fruit in spring; temperature cannot tell spring from autumn, so the calendar has to. This was
caught during the build, not after.

## Safety
This site never says a mushroom is safe to eat and carries no identification key. False morels grow in the same
woods at the same time and some contain gyromitrin. Every page carries a warning pointing at the Michigan
Mushroom Hunters Club and MSU Extension, because identification is a physical skill learned in person and a web
page that claimed otherwise would be the most dangerous page in this network.

It also publishes nobody's spots. It tells you when, and leaves where to you.

## Build
`python3 gen_site.py` regenerates all pages into `public/`.
