import json, pathlib, sys
sys.path.insert(0, "/home/claude/mor")
from gen_chrome import head, header, FOOTER, SAFETY, breadcrumb, PERSON_NODE, PERSON_ID, SITE

OUT = pathlib.Path("/home/claude/mor/public")
OUT.mkdir(parents=True, exist_ok=True)

REGIONS = [
    dict(slug="southern-michigan", name="Southern Michigan",
         towns="Kalamazoo, Jackson, Ann Arbor, Grand Rapids",
         opened2026="April 14",
         blurb=("Where the Michigan season starts. The southern tier warms first, so this is the front edge of "
                "the wave every year and the first place anyone in the state finds anything."),
         detail=("Southern Michigan is the earliest ground in the state and the most heavily hunted, because it "
                 "is close to the most people. The hardwood river bottoms through the southern counties are the "
                 "classic setting: ash and elm on moist, well drained soil, with south facing slopes coming on "
                 "first.\n\nBeing first has a cost. This is where pressure is heaviest, and a spot that produced "
                 "in April can be picked over by the time you get to it on the weekend. The compensation is that "
                 "when the rest of the state is still frozen, this is the only game running.")),
    dict(slug="central-michigan", name="Central Michigan",
         towns="Lansing, Saginaw, Flint, Mount Pleasant",
         opened2026="April 14",
         blurb=("The middle of the state runs close behind the southern tier, often within days. Farm country "
                "with hardwood lots and river corridors threaded through it."),
         detail=("Central Michigan tends to open within a few days of the south, close enough that in some years "
                 "there is no practical difference. The landscape is different though: less continuous forest, "
                 "more woodlots, fencerows, and the wooded edges of river systems like the Saginaw, the Cass, and "
                 "the Tittabawassee.\n\nThat fragmentation matters. Small woodlots warm faster than deep forest, "
                 "so edges and isolated stands can produce before larger blocks nearby. Old apple trees around "
                 "abandoned farmsteads are worth knowing about here, because this is the part of the state that "
                 "has the most of them.")),
    dict(slug="northern-lower", name="Northern Lower",
         towns="Cadillac, Traverse City, Gaylord, Houghton Lake",
         opened2026="April 17",
         blurb=("The heart of Michigan morel culture. Mesick and Boyne City hold festivals, and the northern "
                "lower peninsula is where most people picture morel hunting when they picture it at all."),
         detail=("This is the destination region. The northern lower peninsula has extensive public land, the "
                 "right forest types, and the festivals that made Michigan morels famous. It also has the most "
                 "visitors, which means the well known ground near towns gets worked hard.\n\nTiming here runs "
                 "days to a couple of weeks behind the south, and the spread within the region is real: the "
                 "Traverse City area, moderated by the lake, behaves differently from the higher ground around "
                 "Gaylord. Treat this region as a range rather than a single date, and use elevation and aspect "
                 "the way you would use latitude.")),
    dict(slug="eastern-up", name="Eastern Upper Peninsula",
         towns="Sault Ste Marie, Newberry, Escanaba",
         opened2026="May 19",
         blurb=("Roughly five weeks behind the southern tier. When the downstate season is finished, this is "
                "where the wave has gone."),
         detail=("The eastern UP is the late end of the Michigan season, and that is its entire advantage. "
                 "Hunters who follow the wave north get a second and third season out of one spring, and by the "
                 "time it opens up here the crowds have gone home.\n\nLake Superior and Lake Huron both moderate "
                 "this ground, holding it cold well into May and then holding it mild afterward. Cedar edges and "
                 "mixed hardwood stands are the setting rather than the open hardwood bottoms of the south.")),
    dict(slug="western-up", name="Western Upper Peninsula",
         towns="Marquette, Iron Mountain, Hancock, Ironwood",
         opened2026="May 19",
         blurb=("The last ground in Michigan to open, and the ground where burned over areas matter most. Big "
                "country, long season, few people."),
         detail=("The western UP finishes the Michigan season, sometimes running into the middle of June. It is "
                 "also the part of the state where fire history matters most to morel hunters, because large "
                 "burns produce heavily in the seasons that follow and the western UP has the most of them.\n\n"
                 "This is remote country and the practical constraints are different. Cell coverage is poor, "
                 "distances between towns are long, and a day of hunting involves real driving. The payoff is "
                 "ground that has not been walked by fifty other people that morning.")),
]


def board():
    return (
        '<div class="stat-row">'
        '<div class="stat"><div class="lbl">Season</div><div class="val mono" id="s-season">...</div>'
        '<div class="sub" id="s-season-sub">statewide</div></div>'
        '<div class="stat"><div class="lbl">Regions in window</div><div class="val mono" id="s-prime">...</div>'
        '<div class="sub">of five</div></div>'
        '<div class="stat"><div class="lbl">Front edge</div><div class="val mono" id="s-front">...</div>'
        '<div class="sub">warmest region</div></div>'
        '<div class="stat"><div class="lbl">vs normal</div><div class="val mono" id="s-normal">...</div>'
        '<div class="sub">accumulated warmth</div></div>'
        '</div>'
        '<div class="wave" id="wave"></div>'
        '<p class="note" id="wave-stamp">Loading station observations.</p>'
    )


def build_index():
    url = SITE + "/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebSite", "@id": SITE + "/#website", "name": "Michigan Morel Report", "url": SITE,
         "description": "Tracks how far north Michigan's soil has warmed into the morel window, region by "
                        "region, against a ten year normal.",
         "author": {"@id": PERSON_ID}},
        {"@type": "WebPage", "@id": url + "#webpage", "url": url,
         "isPartOf": {"@id": SITE + "/#website"},
         "name": "Michigan Morel Report: Where the Season Is Right Now",
         "description": "Live soil warming by region across Michigan, tracking the morel season as it moves "
                        "south to north, measured against a ten year normal.",
         "inLanguage": "en-US", "author": {"@id": PERSON_ID},
         "breadcrumb": {"@id": url + "#breadcrumb"}},
        breadcrumb([("Michigan Morel Report", url)]),
        PERSON_NODE,
    ]}
    tiles = "".join(
        f'<div class="tile"><h3><a href="/{r["slug"]}.html">{r["name"]}</a></h3>'
        f'<p>{r["towns"]}. {r["blurb"][:118]}...</p></div>' for r in REGIONS)
    body = (
        header("/") +
        '<p class="lede">Morels do not follow a date, they follow the ground warming up. That warming crosses '
        'Michigan from south to north over about five weeks, and this tracks where the front edge of it is right '
        'now, region by region, against what is normal for the date.</p>'
        + board() +
        '<div class="card read"><div class="kicker">The read</div>'
        '<p style="margin:0;font-size:16px" id="the-read">Loading.</p>'
        '<p class="note" style="margin-top:10px" id="read-stamp"></p></div>'
        + SAFETY +

        '<h2>Why soil temperature and not a calendar</h2>'
        '<p>Every experienced hunter says a version of the same thing: the date on the calendar is a rough guide '
        'and the ground is the real answer. Morels fruit when the soil at a few inches settles into roughly the '
        'low to mid fifties, and they do it a few days after rain. A warm March pulls the whole season forward. A '
        'cold snap in late April stops it dead and then restarts it.</p>'
        '<p>That is why a fixed date is close to useless across a state this long. Michigan runs more than four '
        'hundred miles south to north, and the same trigger arrives about five weeks apart at the two ends. In '
        '2026 the modelled window opened in southern Michigan around the middle of April and did not reach the '
        'Upper Peninsula until the third week of May.</p>'
        '<p><a href="/when-morels-come-up.html">The full explanation of the trigger and how this models it</a>.</p>'

        '<h2>The five regions</h2>'
        '<p>Michigan is treated as five bands, because that is roughly the resolution the data supports and '
        'roughly how the wave actually moves.</p>'
        f'<div class="grid three">{tiles}</div>'

        '<h2>What to do with this</h2>'
        '<ul class="tight">'
        '<li><strong>Too cold.</strong> Nothing is happening. Scout, do not hunt.</li>'
        '<li><strong>Warming, watch.</strong> The trigger is close. Check south facing slopes and start watching '
        '<a href="/indicator-plants.html">indicator plants</a>, which are more reliable than any forecast.</li>'
        '<li><strong>Prime window.</strong> Go, and go two days after a rain rather than during one.</li>'
        '<li><strong>Window fading.</strong> Still worth hunting shaded north facing ground, but the front has '
        'moved north of you. Follow it.</li>'
        '<li><strong>Season past.</strong> Drive north or wait for next year.</li>'
        '</ul>'

        '<h2>What this is not</h2>'
        '<ul class="tight">'
        '<li><strong>It is not a soil thermometer.</strong> Michigan has almost no public soil temperature '
        'stations, so soil warming here is modelled from air temperature. A five dollar soil thermometer in your '
        'own woods beats this every time.</li>'
        '<li><strong>It is not a map of spots.</strong> Nobody who hunts morels wants their ground published and '
        'this site will never do it. It tells you when, and leaves where to you.</li>'
        '<li><strong>It is not an identification guide.</strong> Read the warning above. Timing and safety are '
        'different problems and only one of them can be solved with data.</li>'
        '<li><strong>It cannot see your microclimate.</strong> A south facing slope can run a week ahead of a '
        'shaded bottom two hundred yards away.</li>'
        '</ul>'
        '<div class="anchor-list">'
        '<a href="/when-morels-come-up.html">When they come up</a>'
        '<a href="/where-morels-grow.html">Where they grow</a>'
        '<a href="/indicator-plants.html">Indicator plants</a>'
        '<a href="/false-morels.html">False morels</a>'
        + "".join(f'<a href="/{r["slug"]}.html">{r["name"]}</a>' for r in REGIONS) +
        '</div>'
        + FOOTER
    )
    (OUT / "index.html").write_text(head(
        "Michigan Morel Report: Where the Season Is Right Now, South to North",
        "Live soil warming by region across Michigan, tracking the morel season as it moves south to north over "
        "about five weeks, measured against a ten year normal.",
        url, ld) + body)


def build_when():
    url = SITE + "/when-morels-come-up.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "When Morels Come Up in Michigan, and What Actually Triggers Them",
         "description": "Soil temperature is the trigger for morel fruiting. How that works, why Michigan's "
                        "season runs five weeks from south to north, and how this site models it.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url, "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Morel Report", SITE + "/"), ("When they come up", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/when-morels-come-up.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">When morels come up, and what actually triggers them</h1>'
        '<p class="lede">The short answer is soil temperature. Everything else people argue about is either a '
        'proxy for soil temperature or a modifier on top of it.</p>'
        + board() +

        '<h2>The trigger</h2>'
        '<p>Morels are the fruiting body of a fungus that spends most of its life underground as mycelium. '
        'Fruiting is triggered by conditions, not by a date, and the condition that matters most is the '
        'temperature of the soil the mycelium is living in. The figure repeated across sources is soil settling '
        'into roughly the low to mid fifties Fahrenheit, held for several days rather than touched for an '
        'afternoon.</p>'
        '<p>Two things modify it. The first is moisture: morels want damp soil, and the classic advice is to hunt '
        'two or three days after a soaking rain rather than during it. The second is air temperature at night. '
        'Days near sixty with nights holding above forty is the pattern people describe, and what that really '
        'describes is soil that is gaining more heat during the day than it loses overnight.</p>'
        '<p>That is the whole mechanism. Warm the ground steadily, keep it damp, and they come.</p>'

        '<h2>Why the season moves south to north</h2>'
        '<p>Michigan is a long state. The southern border sits near the latitude of Chicago and the Keweenaw '
        'reaches past Montreal. Spring arrives at those two ends about five weeks apart, and the morel season '
        'arrives with it. In 2026 the modelled window opened in the southern tier around 14 April and did not '
        'reach either end of the Upper Peninsula until 19 May.</p>'
        '<p>This is the single most useful fact for anyone willing to drive. A hunter who follows the front north '
        'can get five or six weeks of prime hunting out of a season that lasts about ten days in any one place. '
        'It is also why a report from a friend three hundred miles away is worthless for timing your own weekend.</p>'
        '<div class="tbl-wrap"><table><thead><tr><th>Region</th><th>2026 modelled opening</th><th>Character</th>'
        '</tr></thead><tbody>'
        + "".join(f'<tr><td><a href="/{r["slug"]}.html">{r["name"]}</a></td>'
                  f'<td class="num">{r["opened2026"]}</td><td>{r["towns"]}</td></tr>' for r in REGIONS) +
        '</tbody></table></div>'
        '<p class="note">Those are modelled openings for one particular year, shown to give a sense of the spread. '
        'They are not a schedule. Watch the live board instead.</p>'

        '<h2>How this site models it, and where that model is weak</h2>'
        '<p>Being straight about this matters, because the honest version is less impressive than the version a '
        'marketing page would give you.</p>'
        '<p><strong>Michigan has almost no public soil temperature stations.</strong> A search of the federal '
        'networks turns up three in the entire state, and two of those are tribal installations not intended as a '
        'statewide product. There is no soil temperature map of Michigan to plug into, because the instruments do '
        'not exist.</p>'
        '<p><strong>So soil warming here is modelled from air temperature.</strong> Soil a few inches down behaves '
        'like a lagged, damped version of the air above it: slower to rise, slower to fall, smoothing out daily '
        'swings. A trailing seven day mean of daily average air temperature is a reasonable stand in for that, and '
        'it is what drives the stage on the front page. Alongside it, accumulated growing degree days since the '
        'first of March give a measure of how much total warmth the season has delivered, which is then compared '
        'against a ten year normal for the same date so you can see whether this spring is early or late.</p>'
        '<p><strong>The weaknesses, plainly.</strong> The model cannot see your slope, your aspect, your canopy, '
        'or the cold air that pools in your bottom ground overnight. A south facing bank can run a week ahead of a '
        'shaded flat two hundred yards away, and no station based model will ever catch that. It also cannot see '
        'soil moisture, which is the second half of the trigger. And it is anchored to one station per region, so '
        'a large region is being described by a single point.</p>'
        '<p>What it is good for is the question it was built for: has the wave reached my part of the state yet, '
        'and is this spring running early or late. For anything finer than that, carry a thermometer.</p>'

        + SAFETY +
        '<h2>The calendar gate, and why it is there</h2>'
        '<p>One detail worth explaining because it looks like a limitation and is actually a correctness fix. The '
        'model refuses to report a window outside March through June, even if the temperature says otherwise.</p>'
        '<p>The reason is that autumn runs the same temperatures in reverse. A trailing mean of fifty five degrees '
        'happens in late April and again in early October, and a model reading temperature alone would announce a '
        'prime morel window in the middle of autumn. Morels fruit in spring. Temperature cannot tell the '
        'difference between a spring warming and an autumn cooling, so the calendar has to.</p>'
        '<div class="anchor-list">'
        '<a href="/">Where the season is now</a><a href="/indicator-plants.html">Indicator plants</a>'
        '<a href="/where-morels-grow.html">Where they grow</a><a href="/false-morels.html">False morels</a>'
        '<a href="/southern-michigan.html">Southern Michigan</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "when-morels-come-up.html").write_text(head(
        "When Do Morels Come Up in Michigan? Soil Temperature Is the Trigger",
        "Soil temperature triggers morel fruiting. Why Michigan's season runs five weeks from south to north, "
        "how this site models soil warming from air temperature, and where that model is weak.",
        url, ld) + body)


def build_false():
    url = SITE + "/false-morels.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "False Morels in Michigan: Why This Matters More Than Timing",
         "description": "False morels grow in the same Michigan woods at the same time as true morels, some "
                        "contain gyromitrin, and people are poisoned every spring. How to learn identification "
                        "properly.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url, "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Morel Report", SITE + "/"), ("False morels", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/false-morels.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">False morels, and why this page exists</h1>'
        '<p class="lede">This is the one subject on this site where being approximately right is not good enough. '
        'The rest of these pages are about timing. This one is about not getting hurt.</p>'
        + SAFETY +

        '<h2>What the problem actually is</h2>'
        '<p>False morels are a group of unrelated fungi that superficially resemble true morels and fruit in the '
        'same woods at the same time of year. Some of them contain gyromitrin, a compound the body converts into '
        'a substance that damages the liver and nervous system. Poisonings happen in Michigan every spring, and '
        'the outcome ranges from a very bad few days to death.</p>'
        '<p>Two details make this more dangerous than a straightforward poisonous mushroom. The first is that '
        'people eat false morels for years without incident and then get badly sick, because sensitivity varies '
        'between people and toxin content varies between specimens and seasons. Anecdote is not evidence here. '
        'The second is that the toxin is volatile, which has produced a folk tradition of parboiling them, and '
        'that tradition has led to people being poisoned by the steam.</p>'
        '<p>This site is not going to walk you through telling them apart from photographs, because photographs '
        'are exactly how people get this wrong.</p>'

        '<h2>Why not just publish an identification guide</h2>'
        '<p>Because it would be a bad way to keep you safe, and a worse thing to be responsible for.</p>'
        '<p>Mushroom identification is a physical skill. It involves cutting the specimen open, looking at how the '
        'cap attaches to the stem, checking whether the inside is hollow or chambered, feeling the texture, and '
        'comparing against material you have handled before. Every one of those steps is degraded by learning from '
        'a screen. Somebody who has read a web page feels confident. Somebody who has been in the woods with an '
        'experienced hunter is competent. Those are not the same, and the gap between them is where people get '
        'hurt.</p>'
        '<p>There is also an honest conflict of interest worth naming. A page that told you it could teach you '
        'identification would rank well and get shared. It would also be the single most dangerous page in this '
        'network, and no amount of traffic justifies that.</p>'

        '<h2>How to actually learn</h2>'
        '<ul class="tight">'
        '<li><strong>Go on a foray.</strong> The <a href="https://www.michiganmushroomhunters.org/">Michigan Mushroom '
        'Hunters Club</a> runs organised outings where experienced members look at what you picked and tell you '
        'what it is. This is the single best thing a beginner can do.</li>'
        '<li><strong>Use the state certified experts.</strong> Michigan runs a certification programme for wild '
        'mushroom identification, largely because mushrooms sold to restaurants have to be checked by someone '
        'qualified. Those people exist in most regions and many of them teach.</li>'
        '<li><strong>Learn one species at a time.</strong> Nobody needs to identify everything. Learning true '
        'morels thoroughly, including what they are not, is a season\'s work and enough.</li>'
        '<li><strong>Never eat anything you are not certain of.</strong> Certain means certain. Not fairly sure, '
        'not it looks like the picture, not my uncle has eaten these for years.</li>'
        '<li><strong>If you think you have been poisoned, call Poison Control.</strong> In the United States that '
        'is 1-800-222-1222, and it is free and staffed at all hours. Do not wait to see whether it gets worse.</li>'
        '</ul>'

        '<h2>What this site will and will not do</h2>'
        '<p>It will tell you when the ground in your region has warmed into the range morels fruit in, how that '
        'compares to a normal year, and where the front edge of the season is. That is a data problem and data can '
        'solve it.</p>'
        '<p>It will not tell you that a mushroom is safe to eat, will not identify anything from a photograph, and '
        'will not carry an identification key. That is not a data problem, and pretending otherwise would be the '
        'kind of mistake you cannot take back.</p>'
        '<div class="anchor-list">'
        '<a href="/">Where the season is now</a><a href="/when-morels-come-up.html">When they come up</a>'
        '<a href="/where-morels-grow.html">Where they grow</a>'
        '<a href="https://www.michiganmushroomhunters.org/">Michigan Mushroom Hunters Club</a>'
        '<a href="https://www.michigan.gov/dnr">Michigan DNR</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "false-morels.html").write_text(head(
        "False Morels in Michigan: Why Timing Is the Easy Part",
        "False morels grow in the same Michigan woods at the same time as true morels and some contain "
        "gyromitrin. Why this site will not teach identification from a screen, and how to learn properly.",
        url, ld) + body)


def build_where():
    url = SITE + "/where-morels-grow.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "Where Morels Grow in Michigan: Trees, Ground, and Burns",
         "description": "The habitat morels associate with in Michigan: ash, elm, oak and old apple, moist well "
                        "drained ground, south facing slopes early, and recently burned areas.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url, "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Morel Report", SITE + "/"), ("Where they grow", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/where-morels-grow.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">Where morels grow</h1>'
        '<p class="lede">This page is about habitat, not about anybody\'s spots. The point is to teach you to read '
        'ground so you can find your own, which is the only kind of spot worth having.</p>'
        + board() +

        '<h2>Trees</h2>'
        '<p>Morels associate with particular trees, and in Michigan the names that come up again and again are '
        'ash, elm, and oak, with old apple trees a distant but real fourth. Dying and recently dead elm is the '
        'classic. The association is not fully understood and it is not a guarantee, but it is strong enough that '
        'experienced hunters look at bark before they look at the ground.</p>'
        '<p>The practical version: learn to recognise ash and elm in early spring, before leaves are out, from '
        'bark and form. That single skill will change your hit rate more than any other piece of knowledge on this '
        'site, and it is the reason people who grew up doing this seem to find them effortlessly. They are not '
        'scanning the leaf litter. They are scanning the canopy and then the litter underneath the right tree.</p>'

        '<h2>Ground</h2>'
        '<p>Moist but well drained is the phrase, and both halves matter. Morels want damp soil and will not '
        'produce in ground that has dried out, but they also do not come out of standing water or heavy saturated '
        'clay. River bottoms, wooded slopes above a creek, and old floodplain terraces are the classic settings '
        'because they hold moisture and still drain.</p>'
        '<p>Aspect drives timing within a single piece of ground. South facing slopes take more sun and warm '
        'first, so early in the local season that is where to start. As the season progresses the advantage shifts '
        'to shadier north facing ground, which stays cool and damp after the sunny banks have dried and finished. '
        'Working aspect deliberately can stretch a ten day local window into three weeks.</p>'

        '<h2>Disturbance and burns</h2>'
        '<p>Disturbed ground produces. Logged areas, old two tracks, the edges of clearings, and above all recently '
        'burned forest are all known to fruit heavily, sometimes spectacularly in the first season or two after a '
        'fire. This is most relevant in the northern lower peninsula and the Upper Peninsula, where the large burns '
        'happen and where there is enough public land to hunt them.</p>'
        '<p>The Michigan DNR publishes a map of recent large burn areas specifically because morel hunters ask for '
        'it, which tells you how well established this pattern is. If you are planning a trip north and want ground '
        'that has not been walked flat, recent burns on public land are the most reliable public information there '
        'is. Check current access and any fire area closures with the '
        '<a href="https://www.michigan.gov/dnr">DNR</a> before you drive.</p>'

        + SAFETY +
        '<h2>Public land, and the etiquette</h2>'
        '<p>Michigan has a great deal of state forest, national forest, and state game area, and morel hunting for '
        'personal use is broadly permitted on much of it. Rules differ between state land, national forest, and '
        'state parks, and commercial harvest is a different matter entirely with its own permits. Check the '
        'specific unit before you go rather than assuming.</p>'
        '<p>The etiquette is simpler and unwritten. Do not ask people where they hunt, because the question is '
        'rude and the answer will be a lie. Do not park in a way that advertises a spot. Do not pick a patch '
        'clean. Cut rather than pull, carry them in mesh so spores drop as you walk, and leave the small ones for '
        'the next person, who might be you next week.</p>'
        '<div class="anchor-list">'
        '<a href="/">Where the season is now</a><a href="/when-morels-come-up.html">When they come up</a>'
        '<a href="/indicator-plants.html">Indicator plants</a><a href="/false-morels.html">False morels</a>'
        '<a href="/western-up.html">Western UP and burn country</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "where-morels-grow.html").write_text(head(
        "Where Morels Grow in Michigan: Ash, Elm, Slopes, and Burns",
        "The habitat morels associate with in Michigan, from ash and elm to south facing slopes early and shaded "
        "ground late, plus why recently burned forest produces and where to check access.",
        url, ld) + body)


def build_indicators():
    url = SITE + "/indicator-plants.html"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "@id": url + "#article",
         "headline": "Indicator Plants for Morel Season in Michigan",
         "description": "Trillium, fiddleheads, and lilac tell you what the soil is doing better than any "
                        "forecast, because they are responding to the same trigger morels are.",
         "author": {"@id": PERSON_ID}, "publisher": {"@id": PERSON_ID},
         "inLanguage": "en-US", "mainEntityOfPage": url, "isPartOf": {"@id": SITE + "/#website"}},
        breadcrumb([("Michigan Morel Report", SITE + "/"), ("Indicator plants", url)]),
        PERSON_NODE,
    ]}
    body = (
        header("/indicator-plants.html") +
        '<h1 style="font-size:30px;margin:22px 0 0">Indicator plants</h1>'
        '<p class="lede">The plants growing in your woods are a better soil thermometer than any model on this '
        'site, because they are standing in the exact ground you are about to hunt and responding to the exact '
        'same trigger.</p>'
        + board() +

        '<h2>Why this works</h2>'
        '<p>A model built from a weather station forty miles away is describing a region. A trillium at your feet '
        'is describing the square metre you are standing on. Spring ephemerals break dormancy on soil temperature '
        'and accumulated warmth, which is the same signal that drives morel fruiting, so their timing tracks the '
        'thing you actually care about.</p>'
        '<p>This is not folklore dressed up. It is the same logic professional phenology networks use, and it is '
        'the reason experienced hunters glance at the ground cover before deciding whether a spot is worth '
        'walking.</p>'

        '<h2>The three worth knowing</h2>'
        '<div class="grid three">'
        '<div class="tile"><h3>White trillium in bloom</h3>'
        '<p>The most quoted indicator in Michigan. When trillium are blooming across a piece of woods, the soil '
        'there has warmed into the range. Trillium are also a useful reminder about restraint: picking them can '
        'kill the plant, so look and leave them.</p></div>'
        '<div class="tile"><h3>Fiddleheads unfurling</h3>'
        '<p>Ferns pushing up and starting to straighten out of their coil is the second classic signal. Tightly '
        'curled means early, fully unfurled means you are into it.</p></div>'
        '<div class="tile"><h3>Lilac and apple bloom</h3>'
        '<p>Not a woods plant, but it is in half the yards in Michigan and everybody notices it. Lilac coming into '
        'bloom is a rough regional marker that spring has arrived properly rather than teased.</p></div>'
        '</div>'

        + SAFETY +
        '<h2>How to use them alongside the model</h2>'
        '<p>The two work at different scales and the combination is stronger than either.</p>'
        '<ul class="tight">'
        '<li><strong>Use the regional read to decide whether to bother.</strong> If your region is still reading '
        'too cold, the plants will tell you the same thing and you can save the drive.</li>'
        '<li><strong>Use the plants to pick the spot once you are there.</strong> Two hillsides in the same county '
        'can be a week apart. The plants know which one is ahead.</li>'
        '<li><strong>Trust the plants over the model when they disagree.</strong> The model is a station forty '
        'miles away. The trillium is right there.</li>'
        '<li><strong>Keep your own notes year to year.</strong> The date your local trillium bloom is worth more '
        'to you than anything published, and after three seasons you will have a better predictor than this '
        'site.</li>'
        '</ul>'
        '<p>If tracking that kind of thing appeals to you, the '
        '<a href="https://phenology.chrisizworski.com">Saginaw Bay phenology dashboard</a> follows the same class '
        'of seasonal signal through the whole year rather than just the spring.</p>'
        '<div class="anchor-list">'
        '<a href="/">Where the season is now</a><a href="/when-morels-come-up.html">When they come up</a>'
        '<a href="/where-morels-grow.html">Where they grow</a><a href="/false-morels.html">False morels</a>'
        '<a href="/northern-lower.html">Northern Lower</a>'
        '</div>'
        + FOOTER
    )
    (OUT / "indicator-plants.html").write_text(head(
        "Morel Indicator Plants in Michigan: Trillium, Fiddleheads, Lilac",
        "Trillium, fiddleheads and lilac track the same soil warming that triggers morels, at the scale of the "
        "ground under your feet rather than a weather station forty miles away.",
        url, ld) + body)


def build_region(r):
    url = SITE + f"/{r['slug']}.html"
    others = [x for x in REGIONS if x["slug"] != r["slug"]]
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#webpage", "url": url,
         "name": f"Morel Season in {r['name']}",
         "description": f"Live soil warming and morel season stage for {r['name']}, covering {r['towns']}.",
         "isPartOf": {"@id": SITE + "/#website"}, "inLanguage": "en-US",
         "author": {"@id": PERSON_ID}, "breadcrumb": {"@id": url + "#breadcrumb"}},
        breadcrumb([("Michigan Morel Report", SITE + "/"), (r["name"], url)]),
        PERSON_NODE,
    ]}
    detail = "".join(f"<p>{p}</p>" for p in r["detail"].split("\n\n"))
    tiles = "".join(
        f'<div class="tile"><h3><a href="/{o["slug"]}.html">{o["name"]}</a></h3>'
        f'<p>{o["towns"]}. Opened {o["opened2026"]} in 2026.</p></div>' for o in others[:3])
    body = (
        header("/") +
        f'<h1 style="font-size:30px;margin:22px 0 0">Morel season in {r["name"]}</h1>'
        f'<p class="lede">{r["blurb"]}</p>'
        f'<p class="note">Towns and reference points: {r["towns"]}. In 2026 the modelled window here opened '
        f'around {r["opened2026"]}, which is one year and not a schedule.</p>'
        + board() +
        f'<h2>What this region is like</h2>{detail}'

        '<h2>Practical notes for this region</h2>'
        '<ul class="tight">'
        f'<li><strong>Treat the regional stage as a starting point, not a verdict.</strong> {r["name"]} covers a '
        f'lot of ground and the model is anchored to one station. Aspect and elevation inside the region can move '
        f'the real timing by a week in either direction.</li>'
        '<li><strong>Work south facing ground first, shaded ground later.</strong> Within a single local season '
        'the sunny banks come on and finish before the north facing slopes have started, which is how you stretch '
        'a ten day window into three weeks without driving anywhere.</li>'
        '<li><strong>Go after rain, not during it.</strong> Two or three days after a soaking is the pattern '
        'people describe, and it holds up.</li>'
        '<li><strong>Check land rules before you park.</strong> State forest, national forest, state game area '
        'and state park all have different rules about foraging, and commercial harvest is a separate matter '
        'entirely. The <a href="https://www.michigan.gov/dnr">DNR</a> is the authority.</li>'
        '<li><strong>Keep your own dates.</strong> After two or three seasons your own notes about when the '
        'trillium bloom on your ground will beat anything published, including this.</li>'
        '</ul>'
        + SAFETY +
        '<h2>Where the rest of the state is</h2>'
        '<p>Morel season is a wave, so the useful question is not only what is happening here but how far the '
        'front has moved. If this region has finished, the answer is north.</p>'
        f'<div class="grid three">{tiles}</div>'
        '<h2>Related</h2>'
        '<div class="anchor-list">'
        '<a href="/">Statewide board</a><a href="/when-morels-come-up.html">What triggers them</a>'
        '<a href="/where-morels-grow.html">Habitat</a><a href="/indicator-plants.html">Indicator plants</a>'
        '<a href="/false-morels.html">False morels</a>'
        '</div>'
        + FOOTER
    )
    (OUT / f"{r['slug']}.html").write_text(head(
        f"Morel Season in {r['name']}: Live Soil Warming and Timing",
        f"Live soil warming and morel season stage for {r['name']}, covering {r['towns']}, measured against a ten "
        f"year normal.",
        url, ld) + body)


build_index()
build_when()
build_false()
build_where()
build_indicators()
for r in REGIONS:
    build_region(r)

print("pages written:")
for p in sorted(OUT.glob("*.html")):
    print(f"  {p.name:32} {p.stat().st_size:,} bytes")
