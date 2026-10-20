#!/usr/bin/env python3
"""
Checks that CyL incidents placed by road + km (data/cyl-pks.json) land on the
right road, against OpenStreetMap, independently of the kilometre points.

Input: a JSON list of {id, road, km, lat, lon, d} (d = the incident
description; its last "|" part is the Junta's stretch, "DE X A Y"). Export it
from the DB, e.g. 20 incidents in md5(situationId) order, kmPoint > 0.

A point is a hit if, at it, OpenStreetMap has:
  (a) a road whose name/ref equals the source road, or the same prefix with
      the digits extended (SG-313 → SG-V-3131, the Diputación's renumbering);
  (b) a locality (hamlet/village/town/…) that appears in the stretch; or
  (c) a road whose NAME contains a locality of the stretch
      ("Carretera Burón - Puerto de Tarna" for CL-635 "DE BURÓN …").
Exit 1 below 90 % hits. On 2026-10-20: 18/20 by (a)+(b), 20/20 with (c).

Nominatim's usage policy: at most 1 request per second, an identifying
User-Agent. Fetches go through scrape-turbo (the house fetcher).

  python3 bin/check-cyl-points.py incidents.json
"""

import json, re, subprocess, sys, tempfile, time, unicodedata

THRESHOLD = 0.9
UA = "trafico.live-ops-check/1.0 (cyl kilometre points verification)"


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().upper()
    return re.sub(r"\s+", " ", s).strip()


def road_hit(src, names):
    m = re.match(r"([A-Z]+)-?(\d+)", norm(src).replace(" ", ""))
    for n in names:
        for token in re.findall(r"[A-Z]{1,4}-[A-Z]?-?\d{2,5}", norm(n)):
            if re.sub(r"[^A-Z0-9]", "", token) == re.sub(r"[^A-Z0-9]", "", norm(src)):
                return "road"
            t = re.match(r"([A-Z]+)-(?:[A-Z]-)?(\d+)", token)
            if m and t and t.group(1) == m.group(1) and t.group(2).startswith(m.group(2)):
                return "road (renumbered)"
    return None


def stretch_places(stretch):
    # "DE BURÓN (N-625) A LÍMITE DE C.A. DE ASTURIAS" → ["BURON", "LIMITE DE C.A. DE ASTURIAS"]
    s = re.sub(r"\([^)]*\)", " ", norm(stretch))
    parts = re.split(r"^DE |\s+A\s+", s)
    return [p.strip() for p in parts if len(p.strip()) >= 4]


def reverse(lat, lon, out):
    url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lon}&zoom=17&extratags=1&addressdetails=1"
    subprocess.run(["scrape-turbo", "-q", "--user-agent", UA, url, "--output", out], capture_output=True, timeout=40)
    text = open(out, encoding="utf-8").read().strip()
    return json.loads(re.sub(r"^<html><body>|</body></html>\s*$", "", text))


def main(path):
    rows = json.load(open(path))
    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False).name
    hits = 0
    for r in rows:
        try:
            d = reverse(r["lat"], r["lon"], tmp)
        except Exception as e:
            print(r["id"], "NO ANSWER", e)
            time.sleep(1.2)
            continue
        a, x = d.get("address", {}), d.get("extratags") or {}
        names = [n for n in (d.get("name"), a.get("road"), x.get("ref"), x.get("old_ref")) if n]
        places = [a[k] for k in ("hamlet", "village", "town", "city", "municipality", "suburb", "neighbourhood") if a.get(k)]
        stretch = r["d"].split("|")[-1]
        why = road_hit(r["road"], names)
        if not why:
            why = next((f"place «{p}» in stretch" for p in places if norm(p) and norm(p) in norm(stretch)), None)
        if not why:
            why = next((f"stretch «{p.title()}» in road name" for p in stretch_places(stretch) for n in names if p in norm(n)), None)
        hits += why is not None
        print(r["id"], r["road"], r["km"], f"HIT {why}" if why else "MISS", f"| osm road={a.get('road')!r} places={places} | {stretch.strip()[:70]}")
        time.sleep(1.2)
    share = hits / len(rows) if rows else 0
    print(f"HITS {hits}/{len(rows)} = {share:.0%} (threshold {THRESHOLD:.0%})")
    sys.exit(0 if share >= THRESHOLD else 1)


if __name__ == "__main__":
    main(sys.argv[1])
