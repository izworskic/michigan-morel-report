SITE = "https://morel.chrisizworski.com"
PERSON_ID = "https://chrisizworski.com/#person"

PERSON_NODE = {
    "@type": "Person",
    "@id": PERSON_ID,
    "name": "Chris Izworski",
    "url": "https://chrisizworski.com/chris-izworski/",
    "sameAs": [
        "https://chrisizworski.com",
        "https://michigantroutreport.com/chris-izworski/",
        "https://michiganbirdingreport.com/chris-izworski",
        "https://greatlakeslevels.org",
        "https://github.com/izworskic",
        "https://www.youtube.com/@izworskic",
        "https://www.wikidata.org/wiki/Q138283432",
    ],
}

# Palette: spring hardwoods before the canopy closes. Leaf litter tan, damp loam
# brown, and the pale green of new growth. Deliberately unlike the bay property's
# blue green, the ice property's cold pewter, and the whitetail cream.
CSS = """
*{box-sizing:border-box}
html,body{margin:0;padding:0}
html{overflow-x:hidden}
body{font-family:"Newsreader",Georgia,"Iowan Old Style",serif;background:#f4f1e8;color:#2b2419;line-height:1.62}
.mono,.val,td.num,.rdg{font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
.wrap{max-width:1060px;margin:0 auto;padding:0 20px}
.page{min-height:100vh;background:linear-gradient(180deg,#faf8f1 0%,#f6f3ea 46%,#f4f1e8 100%);padding-bottom:48px}
h1,h2,h3{font-family:"Fraunces",Georgia,serif;line-height:1.24;letter-spacing:-.004em}
a{color:#5c6b2f}
a:hover{color:#77883d}
.site-header{padding-top:30px;padding-bottom:14px;border-bottom:2px solid #5c6b2f}
.site-header .brandrow{display:flex;align-items:baseline;flex-wrap:wrap;gap:12px}
.site-header .brand{font-family:"Fraunces",Georgia,serif;font-size:30px;font-weight:600}
.site-header .tag{font-size:13px;color:#6b6151;letter-spacing:.03em}
.site-header .stage{margin-left:auto;font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:#5c6b2f;text-transform:uppercase;letter-spacing:.11em;border:1px solid #5c6b2f;border-radius:7px;padding:3px 10px}
.nav{margin-top:12px;display:flex;flex-wrap:wrap;gap:6px}
.nav a{display:inline-block;border:1px solid #d6cdb8;border-radius:999px;padding:5px 13px;font-size:12.5px;font-weight:600;text-decoration:none;color:#4d4535;background:rgba(255,255,255,.6)}
.nav a:hover{border-color:#5c6b2f;color:#5c6b2f}
.nav a[aria-current="page"]{background:#5c6b2f;border-color:#5c6b2f;color:#fff}
.lede{font-size:17px;color:#3d3527;margin:18px 0 0}
.card{background:rgba(255,255,255,.68);border:1px solid #e0d8c4;border-radius:13px;padding:16px 20px;margin-top:18px}
.card.read{border-left:4px solid #5c6b2f}
.card.warn{border-left:4px solid #9c3b1f;background:rgba(255,246,242,.86)}
.card.danger{border-left:5px solid #8f2d16;background:rgba(253,242,238,.94)}
.kicker{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#6b6151;margin-bottom:6px}
.stat-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.stat{flex:1 1 auto;min-width:118px;border:1px solid #e0d8c4;border-radius:11px;padding:9px 12px;background:rgba(255,255,255,.78);text-align:center}
.stat .lbl{font-size:9.5px;letter-spacing:.09em;text-transform:uppercase;color:#6b6151}
.stat .val{font-size:21px;line-height:1.22;color:#5c6b2f}
.stat .sub{font-size:10.5px;color:#6b6151}
/* signature: the south to north wave track */
.wave{margin-top:18px;border:1px solid #e0d8c4;border-radius:13px;background:rgba(255,255,255,.62);overflow:hidden}
.wave-row{display:grid;grid-template-columns:1fr;gap:0;border-bottom:1px solid #ece5d6}
.wave-row:last-child{border-bottom:none}
.wave-cell{padding:13px 16px}
@media(min-width:760px){.wave-row{grid-template-columns:210px 1fr 130px}}
.wave-name{font-family:"Fraunces",Georgia,serif;font-size:16px}
.wave-name a{text-decoration:none}
.wave-sub{font-size:11.5px;color:#6b6151}
.bar-wrap{position:relative;height:26px;background:#efe9db;border-radius:6px;overflow:hidden}
.bar{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#a8b57a,#5c6b2f);border-radius:6px}
.bar-mid{position:absolute;top:0;bottom:0;width:2px;background:#9c8f74}
.bar-lab{position:relative;font-size:11px;padding:5px 8px;color:#2b2419;font-family:ui-monospace,Menlo,monospace}
table{width:100%;border-collapse:collapse;margin-top:14px;font-size:14.5px;background:rgba(255,255,255,.6)}
th,td{text-align:left;padding:9px 11px;border-bottom:1px solid #e8e0cf;vertical-align:top}
th{font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#6b6151;font-weight:600}
td.num{white-space:nowrap}
.tbl-wrap{overflow-x:auto}
.badge{display:inline-block;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:.06em;text-transform:uppercase;border-radius:5px;padding:2px 7px;white-space:nowrap;border:1px solid #d6cdb8;color:#4d4535;background:rgba(255,255,255,.75)}
.badge.cold{color:#4a5c6b;border-color:#b8c6d1;background:rgba(238,244,248,.9)}
.badge.watch{color:#8a6a12;border-color:#ddc794;background:rgba(252,246,230,.9)}
.badge.prime{color:#41601f;border-color:#a8bd7d;background:rgba(238,246,226,.92)}
.badge.fading{color:#8f5a2d;border-color:#dcc0a0;background:rgba(252,244,235,.9)}
.badge.over{color:#6b6b6b;border-color:#cfcfcf;background:rgba(244,244,244,.9)}
.grid{display:grid;grid-template-columns:1fr;gap:14px;margin-top:16px}
@media(min-width:730px){.grid.two{grid-template-columns:1fr 1fr}.grid.three{grid-template-columns:repeat(3,1fr)}}
.tile{border:1px solid #e0d8c4;border-radius:13px;padding:15px 17px;background:rgba(255,255,255,.62)}
.tile h3{margin:0 0 6px;font-size:16.5px}
.tile p{margin:0;font-size:14px;color:#3d3527}
.note{font-size:13px;color:#6b6151;font-style:italic}
.site-footer{margin-top:34px;padding-top:16px;border-top:1px solid #e0d8c4;font-size:12.5px;color:#6b6151}
.site-footer a{color:#5c6b2f}
ul.tight li{margin-bottom:7px}
h2{margin-top:30px;font-size:22px}
h3{font-size:17px}
p{margin:12px 0}
.anchor-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.anchor-list a{font-size:13px;border:1px solid #d6cdb8;border-radius:999px;padding:4px 12px;text-decoration:none;background:rgba(255,255,255,.62)}
a:focus-visible{outline:3px solid #5c6b2f;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
         'family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&'
         'family=Newsreader:ital,opsz@0,6..72;1,6..72&display=swap">')

# Every page is one click from the front page. There is no second level.
NAV = [
    ("/", "Where the season is"),
    ("/when-morels-come-up.html", "When they come up"),
    ("/false-morels.html", "False morels"),
    ("/where-morels-grow.html", "Where they grow"),
    ("/indicator-plants.html", "Indicator plants"),
    ("/southern-michigan.html", "Southern"),
    ("/central-michigan.html", "Central"),
    ("/northern-lower.html", "Northern Lower"),
    ("/eastern-up.html", "Eastern UP"),
    ("/western-up.html", "Western UP"),
]


def head(title, desc, canonical, ld_json):
    import json as _j
    return (
        '<!DOCTYPE html><html lang="en"><head>'
        '<meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{title}</title>'
        f'<meta name="description" content="{desc}">'
        f'<link rel="canonical" href="{canonical}">'\n        '<link rel="author" href="https://chrisizworski.com/chris-izworski/">'
        f'<meta property="og:title" content="{title}">'
        f'<meta property="og:description" content="{desc}">'
        f'<meta property="og:url" content="{canonical}">'
        '<meta property="og:type" content="website">'
        '<meta property="og:site_name" content="Michigan Morel Report">'
        '<meta name="twitter:card" content="summary">'
        '<meta name="geo.region" content="US-MI">'
        f'{FONTS}<style>{CSS}</style>'
        f'<script type="application/ld+json">{_j.dumps(ld_json, separators=(",", ":"))}</script>'
        '</head>'
    )


def header(current):
    navhtml = "".join(
        f'<a href="{h}"{" aria-current=\"page\"" if h == current else ""}>{t}</a>'
        for h, t in NAV)
    return (
        '<body><div class="page"><div class="wrap">'
        '<header class="site-header"><div class="brandrow">'
        '<span class="brand">Michigan Morel Report</span>'
        '<span class="tag">Tracking the soil as it warms, south to north</span>'
        '<span class="stage" id="season-stage">Loading</span>'
        '</div>'
        f'<nav class="nav">{navhtml}</nav>'
        '</header>'
    )


SAFETY = (
    '<div class="card danger"><div class="kicker">Read this before you eat anything</div>'
    '<p style="margin:0 0 8px"><strong>This site tells you when to look. It will never tell you what is safe to '
    'eat.</strong> False morels grow in the same woods at the same time of year and people are hospitalised by '
    'them in Michigan every spring. Some contain gyromitrin, which can cause severe poisoning and has killed '
    'people.</p>'
    '<p style="margin:0">Learn identification in person, from someone qualified, before you eat a single '
    'mushroom. Michigan runs a certified wild mushroom expert programme, and the '
    '<a href="https://www.michiganmushroomhunters.org/">Michigan Mushroom Hunters Club</a> holds forays where you can '
    'learn from people who know. If you are not certain, do not eat it. Certainty means certain, not fairly sure.'
    ' <a href="/false-morels.html">What false morels look like</a>.</p></div>'
)

FOOTER = (
    '<footer class="site-footer">'
    'Temperature observations from the '
    '<a href="https://www.rcc-acis.org/">Applied Climate Information System</a>, which aggregates NOAA and '
    'National Weather Service station data. Soil warming on this site is <strong>modelled from air '
    'temperature</strong>, because Michigan has almost no public soil temperature stations. It is a guide to '
    'timing, not a soil thermometer reading. '
    'Seasons, permits, and rules for state land come from the '
    '<a href="https://www.michigan.gov/dnr">Michigan DNR</a>, which is always the authority. '
    'Identification help from the <a href="https://www.michiganmushroomhunters.org/">Michigan Mushroom Hunters Club</a>. '
    'Part of a Michigan outdoor network that includes the '
    '<a href="https://phenology.chrisizworski.com">Saginaw Bay phenology dashboard</a>, the '
    '<a href="https://michigantroutreport.com">Michigan Trout Report</a>, and '
    '<a href="https://weekend.chrisizworski.com">Michigan Outdoor Weekend</a>. '
    'Built and maintained by <a href="https://chrisizworski.com/chris-izworski/">Chris Izworski</a> in Bay City. '
    'Nothing here is an identification guide and nothing here says a mushroom is safe to eat.'
    '</footer>'
    '</div></div><script src="/morel.js"></script></body></html>'
)


def breadcrumb(items):
    return {
        "@type": "BreadcrumbList",
        "@id": items[-1][1] + "#breadcrumb",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
            for i, (n, u) in enumerate(items)],
    }
