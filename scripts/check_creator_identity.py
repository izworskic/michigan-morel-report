import json
import re
from pathlib import Path

CREATOR_ID = "https://chrisizworski.com/#person"
CREATOR_HOME = "https://chrisizworski.com/"
CREATOR_PROFILE = "https://chrisizworski.com/chris-izworski/"
PUBLIC = Path(__file__).resolve().parents[1] / "public"

expected = {
    "index.html",
    "when-morels-come-up.html",
    "false-morels.html",
    "where-morels-grow.html",
    "indicator-plants.html",
    "southern-michigan.html",
    "central-michigan.html",
    "northern-lower.html",
    "eastern-up.html",
    "western-up.html",
}
actual = {path.name for path in PUBLIC.glob("*.html")}
assert actual == expected, f"unexpected generated page set: {sorted(actual)}"

for path in sorted(PUBLIC.glob("*.html")):
    html = path.read_text(encoding="utf-8")
    match = re.search(r'<script type="application/ld\+json">([\s\S]*?)</script>', html)
    assert match, f"{path.name}: missing JSON-LD"
    data = json.loads(match.group(1))
    graph = data.get("@graph", [data])
    people = [node for node in graph if node.get("@type") == "Person"]
    assert len(people) == 1, f"{path.name}: expected one Person node"
    assert people[0].get("@id") == CREATOR_ID, f"{path.name}: incorrect Person ID"
    assert people[0].get("name") == "Chris Izworski", f"{path.name}: incorrect Person name"
    assert people[0].get("url") == CREATOR_HOME, f"{path.name}: Person.url must be the homepage"
    defined_ids = {node.get("@id") for node in graph if node.get("@id")}
    for node in graph:
        for field in ("author", "publisher", "creator"):
            value = node.get(field)
            values = value if isinstance(value, list) else [value]
            for ref in values:
                if isinstance(ref, dict) and ref.get("@id"):
                    assert ref["@id"] in defined_ids, f"{path.name}: dangling {field} reference {ref['@id']}"
    assert f'href="{CREATOR_PROFILE}">Chris Izworski</a>' in html, f"{path.name}: missing visible profile credit"
    footer = re.search(r"<footer\b[^>]*>([\s\S]*?)</footer>", html)
    assert footer and f'href="{CREATOR_PROFILE}">Chris Izworski</a>' in footer.group(1), f"{path.name}: visible credit must be in the footer"

print(f"Morel creator identity checks passed for {len(actual)} generated pages.")
