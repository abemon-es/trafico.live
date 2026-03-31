#!/usr/bin/env python3
"""
Import 2022 IMD station data from the Ministry's traffic map visor.
Source: mapatrafico.transportes.gob.es/2022/Visor/datos/GIS/estaciones.js
This is a static GeoJSON file with 3,659 stations including coordinates.
Run on hetzner-dev.
"""
import json, sys, subprocess, unicodedata, urllib.request

DB = "postgresql://apps:cCrwx3nWNBsNphpzjzUpZkNYwmwlnHWCypjAqMEd@127.0.0.1:5435/le_trafico"
URL = "https://mapatrafico.transportes.gob.es/2022/Visor/datos/GIS/estaciones.js"
YEAR = 2022

PROV={"alava":"01","albacete":"02","alicante":"03","almeria":"04","avila":"05","badajoz":"06","baleares":"07","barcelona":"08","burgos":"09","caceres":"10","cadiz":"11","castellon":"12","ciudad real":"13","cordoba":"14","a coruna":"15","cuenca":"16","girona":"17","granada":"18","guadalajara":"19","gipuzkoa":"20","huelva":"21","huesca":"22","jaen":"23","leon":"24","lleida":"25","la rioja":"26","lugo":"27","madrid":"28","malaga":"29","murcia":"30","navarra":"31","ourense":"32","asturias":"33","palencia":"34","las palmas":"35","pontevedra":"36","salamanca":"37","santa cruz de tenerife":"38","cantabria":"39","segovia":"40","sevilla":"41","soria":"42","tarragona":"43","teruel":"44","toledo":"45","valencia":"46","valladolid":"47","bizkaia":"48","zamora":"49","zaragoza":"50","ceuta":"51","melilla":"52","guipuzcoa":"20","vizcaya":"48","araba":"01","gerona":"17","lerida":"25","orense":"32","la coruna":"15","coruna":"15","rioja":"26","islas baleares":"07","tenerife":"38","gran canaria":"35","region de murcia":"30","principado de asturias":"33","comunidad de madrid":"28"}

def np(name):
    if not name: return None
    n = unicodedata.normalize("NFD", name.lower())
    n = "".join(c for c in n if unicodedata.category(c) != "Mn").strip()
    return PROV.get(n)

def irt(r):
    if not r: return None
    r = r.upper().strip()
    if r.startswith("AP-"): return "AUTOPISTA"
    if r.startswith("A-"): return "AUTOVIA"
    if r.startswith("N-"): return "NACIONAL"
    if r.startswith("C-"): return "COMARCAL"
    return "OTHER"

ST_MAP = {"permanente":"PERMANENT","semipermanente":"SEMI_PERMANENT","primaria":"PRIMARY","secundaria":"SECONDARY","cobertura":"COVERAGE"}

def sq(v):
    if v is None: return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def si(v):
    if v is None: return "NULL"
    try:
        n = int(float(v))
        return "NULL" if n == 0 else str(n)
    except: return "NULL"

def sn(v):
    if v is None: return "NULL"
    try:
        n = float(v)
        return "NULL" if n == 0 else str(round(n, 2))
    except: return "NULL"

print("Fetching 2022 station data...", file=sys.stderr)
req = urllib.request.Request(URL, headers={"User-Agent": "trafico.live/1.0"})
raw = urllib.request.urlopen(req, timeout=60).read().decode("utf-8")

# Strip "var estaciones_data = " prefix
idx = raw.index("{")
data = json.loads(raw[idx:])
features = data["features"]
print(f"Parsed {len(features)} stations", file=sys.stderr)

sql = ["BEGIN;"]
count = 0

for f in features:
    props = f.get("properties", {})
    geom = f.get("geometry", {})
    coords = geom.get("coordinates", [])
    if len(coords) < 2: continue

    lon, lat = coords[0], coords[1]
    if lat < 27 or lat > 44 or lon < -19 or lon > 5: continue

    code = str(props.get("estación", props.get("estacion", ""))).strip()
    road = str(props.get("carretera", "")).strip()
    if not code or not road: continue

    pn = str(props.get("provincia", "")).strip()
    pc = np(pn)
    imd = props.get("imd_total")
    iml = props.get("imd_ligero")
    imp = props.get("imd_pesado")
    pct = props.get("porc_vp")
    days = props.get("días_afo", props.get("dias_afo"))
    km = props.get("pk", 0)
    pop = str(props.get("población", props.get("poblacion", ""))).strip() or None
    tipo = str(props.get("tipo", "")).strip().lower()
    st = ST_MAP.get(tipo)
    st_sql = f"'{st}'::\"StationType\"" if st else "NULL"
    rt = irt(road)
    rt_sql = f"'{rt}'::\"RoadType\"" if rt else "NULL"
    ncalz = props.get("n_calzadas")
    config = str(props.get("configurac", "")).strip() or None

    sql.append(
        f'INSERT INTO "TrafficStation" '
        f'("id","stationCode","province","provinceName","roadNumber","roadType","kmPoint",'
        f'"stationType","lanes","configuration","population",'
        f'"latitude","longitude","year","imd","imdLigeros","imdPesados","percentPesados","daysRecorded") '
        f"VALUES (gen_random_uuid()::text, {sq(code)}, {sq(pc)}, {sq(pn)}, {sq(road)}, "
        f"{rt_sql}, {km}, {st_sql}, {sq(str(ncalz)) if ncalz else 'NULL'}, {sq(config)}, {sq(pop)}, "
        f"{lat}, {lon}, {YEAR}, {si(imd)}, {si(iml)}, {si(imp)}, {sn(pct)}, {si(days)}) "
        f'ON CONFLICT ("stationCode","year") DO UPDATE SET '
        f'"imd"=EXCLUDED."imd","imdLigeros"=EXCLUDED."imdLigeros",'
        f'"imdPesados"=EXCLUDED."imdPesados","percentPesados"=EXCLUDED."percentPesados",'
        f'"latitude"=EXCLUDED."latitude","longitude"=EXCLUDED."longitude",'
        f'"province"=EXCLUDED."province","provinceName"=EXCLUDED."provinceName",'
        f'"stationType"=EXCLUDED."stationType","population"=EXCLUDED."population",'
        f'"daysRecorded"=EXCLUDED."daysRecorded";'
    )
    count += 1

sql.append("COMMIT;")
print(f"Prepared {count} station upserts", file=sys.stderr)

proc = subprocess.run(["psql", DB, "-v", "ON_ERROR_STOP=1"],
                      input="\n".join(sql), text=True, capture_output=True)
if proc.returncode != 0:
    print(f"PSQL ERROR: {proc.stderr[:500]}", file=sys.stderr)
    sys.exit(1)
print(f"Done! {count} stations imported for {YEAR}", file=sys.stderr)
