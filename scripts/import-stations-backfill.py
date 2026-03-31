#!/usr/bin/env python3
"""
Import 2017-2018 stations (no geometry in ArcGIS) and backfill lat/lng from 2019 stations.
Run on hetzner-dev.
"""
import json, math, os, sys, subprocess, time, unicodedata, urllib.request, urllib.parse

DB = os.environ.get("DATABASE_URL", "postgresql://apps@127.0.0.1:5435/le_trafico")
BASE = "https://mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico"
YEARS = [2017, 2018]

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
        return "NULL" if n == 0 or math.isnan(n) else str(n)
    except: return "NULL"

# Map station type strings
def st(v):
    if not v: return "NULL"
    v = v.upper().strip()
    m = {"PERMANENTE":"PERMANENT","SEMIPERMANENTE":"SEMI_PERMANENT","PRIMARIA":"PRIMARY",
         "SECUNDARIA":"SECONDARY","COBERTURA":"COVERAGE","AFORAMIENTO":"COVERAGE",
         "P":"PERMANENT","SP":"SEMI_PERMANENT","E1":"PRIMARY","E2":"SECONDARY","C":"COVERAGE","AF":"COVERAGE"}
    r = m.get(v)
    return f"'{r}'::\"StationType\"" if r else "NULL"

sql = ["BEGIN;"]
total = 0

for year in YEARS:
    offset = 0
    while True:
        params = urllib.parse.urlencode({
            "where": "1=1", "outFields": "*", "returnGeometry": "true",
            "resultOffset": offset, "resultRecordCount": 1000, "f": "json"
        })
        url = f"{BASE}/Mapa{year}web/MapServer/1/query?{params}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "trafico.live/1.0"})
            raw = urllib.request.urlopen(req, timeout=120).read()
            data = json.loads(raw)
        except Exception as ex:
            print(f"ERR {year} off={offset}: {ex}", file=sys.stderr)
            break
        ff = data.get("features", [])
        for feat in ff:
            at = feat.get("attributes", {})
            # 2017-2018 use lowercase field names
            code = str(at.get("estacion", at.get("Estación", at.get("CLAVE", "")))).strip()
            road = str(at.get("carretera", at.get("Carretera", ""))).strip()
            if not code or not road: continue
            pn = str(at.get("provincia", at.get("Provincia", ""))).strip()
            pc = np(pn)
            imd = at.get("imd_total", at.get("IMD_total"))
            iml = at.get("imd_ligeros", at.get("IMD_ligeros", at.get("imd_ligero")))
            imp = at.get("imd_pesados", at.get("IMD_pesados", at.get("imd_pesado")))
            pct = at.get("porcentaje_vp")
            if pct is None and imd and imp:
                try: pct = round(float(imp) / float(imd) * 100, 2)
                except: pass
            days = at.get("dias_aforados", at.get("Días_afor"))
            km = at.get("pk", at.get("Pk", at.get("PK", 0)))
            try: km = float(str(km).replace(",", "."))
            except: km = 0
            rt = irt(road)
            rt_sql = f"'{rt}'::\"RoadType\"" if rt else "NULL"
            stype = st(str(at.get("tipo", at.get("Tipo_de_es", ""))).strip())
            lanes = str(at.get("n_calzadas", at.get("Número_de", ""))).strip() or None
            config = str(at.get("configuracion", at.get("Configurac", ""))).strip() or None
            pop = str(at.get("poblacion", at.get("Población", ""))).strip() or None

            # Use 0,0 as placeholder — will backfill from 2019
            sql.append(
                f'INSERT INTO "TrafficStation" '
                f'("id","stationCode","province","provinceName","roadNumber","roadType","kmPoint",'
                f'"stationType","lanes","configuration","population",'
                f'"latitude","longitude","year","imd","imdLigeros","imdPesados","percentPesados","daysRecorded") '
                f"VALUES (gen_random_uuid()::text, {sq(code)}, {sq(pc)}, {sq(pn)}, {sq(road)}, "
                f"{rt_sql}, {km}, {stype}, {sq(lanes)}, {sq(config)}, {sq(pop)}, "
                f"0, 0, {year}, {si(imd)}, {si(iml)}, {si(imp)}, {sn(pct)}, {si(days)}) "
                f'ON CONFLICT ("stationCode","year") DO UPDATE SET '
                f'"imd"=EXCLUDED."imd","imdLigeros"=EXCLUDED."imdLigeros",'
                f'"imdPesados"=EXCLUDED."imdPesados","percentPesados"=EXCLUDED."percentPesados",'
                f'"province"=EXCLUDED."province","provinceName"=EXCLUDED."provinceName",'
                f'"stationType"=EXCLUDED."stationType","lanes"=EXCLUDED."lanes",'
                f'"configuration"=EXCLUDED."configuration","population"=EXCLUDED."population",'
                f'"daysRecorded"=EXCLUDED."daysRecorded";'
            )
            total += 1
        print(f"Stations {year}: {total} total (off={offset}, batch={len(ff)})", file=sys.stderr)
        if len(ff) < 1000: break
        offset += 1000
        time.sleep(0.5)
    time.sleep(1)

# Backfill lat/lng from 2019 stations with matching stationCode
sql.append("""
UPDATE "TrafficStation" t1
SET latitude = t2.latitude, longitude = t2.longitude
FROM "TrafficStation" t2
WHERE t2."stationCode" = t1."stationCode"
  AND t2.year = 2019
  AND t2.latitude != 0
  AND t1.latitude = 0;
""")

sql.append("COMMIT;")
print(f"Total stations to upsert: {total}", file=sys.stderr)

proc = subprocess.run(
    ["psql", DB, "-v", "ON_ERROR_STOP=1"],
    input="\n".join(sql), text=True, capture_output=True
)
if proc.returncode != 0:
    print(f"PSQL ERROR: {proc.stderr[:1000]}", file=sys.stderr)
    sys.exit(1)
print("Done!", file=sys.stderr)
