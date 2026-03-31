#!/usr/bin/env python3
"""
IMD Data Importer — runs on the DB server with only Python stdlib.
Fetches counting stations + IMD segments from the Ministry's ArcGIS REST API,
converts UTM30N→WGS84, and inserts into PostgreSQL via psql.

Usage: python3 import-imd-remote.py | psql $DATABASE_URL
   Or: python3 import-imd-remote.py --execute (runs psql internally)
"""

import json
import math
import sys
import subprocess
import urllib.request
import urllib.parse
import time

DB_URL = "postgresql://apps:cCrwx3nWNBsNphpzjzUpZkNYwmwlnHWCypjAqMEd@127.0.0.1:5435/le_trafico"
BASE_URL = "https://mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico"
MAX_RECORDS = 1000
YEARS = [2017, 2018, 2019]

# ── UTM Zone 30N → WGS84 ──────────────────────────────────────────────
a = 6378137.0
f = 1 / 298.257223563
k0 = 0.9996
e = math.sqrt(2 * f - f * f)
e2 = e * e
e4 = e2 * e2
e6 = e4 * e2
e1 = (1 - math.sqrt(1 - e2)) / (1 + math.sqrt(1 - e2))
lon0 = -3 * math.pi / 180

def utm_to_wgs84(easting, northing):
    x = easting - 500000
    y = northing
    M = y / k0
    mu = M / (a * (1 - e2/4 - 3*e4/64 - 5*e6/256))
    phi1 = (mu
        + (3*e1/2 - 27*e1**3/32) * math.sin(2*mu)
        + (21*e1**2/16 - 55*e1**4/32) * math.sin(4*mu)
        + (151*e1**3/96) * math.sin(6*mu)
        + (1097*e1**4/512) * math.sin(8*mu))
    sp = math.sin(phi1); cp = math.cos(phi1); tp = sp/cp
    N1 = a / math.sqrt(1 - e2*sp*sp)
    T1 = tp*tp
    C1 = (e2/(1-e2)) * cp*cp
    R1 = a*(1-e2) / (1-e2*sp*sp)**1.5
    D = x / (N1*k0)
    lat = phi1 - (N1*tp/R1)*(D**2/2
        - (5+3*T1+10*C1-4*C1**2-9*(e2/(1-e2)))*D**4/24
        + (61+90*T1+298*C1+45*T1**2-252*(e2/(1-e2))-3*C1**2)*D**6/720)
    lon = lon0 + (D - (1+2*T1+C1)*D**3/6
        + (5-2*C1+28*T1-3*C1**2+8*(e2/(1-e2))+24*T1**2)*D**5/120) / cp
    return round(lat*180/math.pi, 6), round(lon*180/math.pi, 6)

# ── Province mapping ──────────────────────────────────────────────────
PROV = {
    "alava":"01","albacete":"02","alicante":"03","almeria":"04","avila":"05",
    "badajoz":"06","baleares":"07","barcelona":"08","burgos":"09","caceres":"10",
    "cadiz":"11","castellon":"12","ciudad real":"13","cordoba":"14","a coruna":"15",
    "cuenca":"16","girona":"17","granada":"18","guadalajara":"19","gipuzkoa":"20",
    "huelva":"21","huesca":"22","jaen":"23","leon":"24","lleida":"25",
    "la rioja":"26","lugo":"27","madrid":"28","malaga":"29","murcia":"30",
    "navarra":"31","ourense":"32","asturias":"33","palencia":"34","las palmas":"35",
    "pontevedra":"36","salamanca":"37","santa cruz de tenerife":"38","cantabria":"39",
    "segovia":"40","sevilla":"41","soria":"42","tarragona":"43","teruel":"44",
    "toledo":"45","valencia":"46","valladolid":"47","bizkaia":"48","zamora":"49",
    "zaragoza":"50","ceuta":"51","melilla":"52",
    "guipuzcoa":"20","vizcaya":"48","araba":"01","gerona":"17","lerida":"25",
    "orense":"32","la coruna":"15","coruna":"15","rioja":"26",
    "islas baleares":"07","illes balears":"07","tenerife":"38",
    "gran canaria":"35","region de murcia":"30","principado de asturias":"33",
    "comunidad de madrid":"28","nafarroa":"31",
}

def norm_prov(name):
    if not name: return None
    import unicodedata
    n = unicodedata.normalize("NFD", name.lower())
    n = "".join(c for c in n if unicodedata.category(c) != "Mn").strip()
    return PROV.get(n)

# ── Road type inference ───────────────────────────────────────────────
def infer_road_type(road):
    if not road: return None
    r = road.upper().strip()
    if r.startswith("AP-"): return "AUTOPISTA"
    if r.startswith("A-"): return "AUTOVIA"
    if r.startswith("N-"): return "NACIONAL"
    if r.startswith("C-"): return "COMARCAL"
    if r.startswith("E-"): return "AUTOVIA"
    return "OTHER"

# ── ArcGIS fetch ──────────────────────────────────────────────────────
def fetch_layer(year, layer_id):
    all_features = []
    offset = 0
    while True:
        params = urllib.parse.urlencode({
            "where": "1=1", "outFields": "*", "returnGeometry": "true",
            "resultOffset": offset, "resultRecordCount": MAX_RECORDS, "f": "json"
        })
        url = f"{BASE_URL}/Mapa{year}web/MapServer/{layer_id}/query?{params}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "trafico.live/1.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as ex:
            print(f"-- ERROR fetching layer {layer_id} year {year} offset {offset}: {ex}", file=sys.stderr)
            break
        features = data.get("features", [])
        all_features.extend(features)
        print(f"-- Fetched {len(all_features)} from layer {layer_id}/{year} (offset {offset})", file=sys.stderr)
        if len(features) < MAX_RECORDS and not data.get("exceededTransferLimit"):
            break
        offset += MAX_RECORDS
        time.sleep(0.5)
    return all_features

def parse_km(val):
    if val is None: return 0
    s = str(val).replace(",", ".").strip()
    import re
    m = re.match(r"^(\d+)\+(\d+)$", s)
    if m: return float(f"{m.group(1)}.{m.group(2)}")
    try: return float(s)
    except: return 0

def sql_str(val):
    if val is None: return "NULL"
    return "'" + str(val).replace("'", "''") + "'"

def sql_num(val):
    if val is None: return "NULL"
    try:
        n = float(val)
        return "NULL" if math.isnan(n) or n == 0 else str(n)
    except: return "NULL"

def sql_int(val):
    if val is None: return "NULL"
    try:
        n = int(float(val))
        return "NULL" if n == 0 else str(n)
    except: return "NULL"

# ── Main ──────────────────────────────────────────────────────────────
def generate_sql():
    sql_lines = []
    sql_lines.append("BEGIN;")

    total_stations = 0
    total_segments = 0

    for year in YEARS:
        print(f"-- === Year {year} ===", file=sys.stderr)

        # Stations (layer 1)
        features = fetch_layer(year, 1)
        for f in features:
            a = f.get("attributes", {})
            g = f.get("geometry", {})
            if not g.get("x") or not g.get("y"): continue
            code = str(a.get("Estación") or a.get("Estacion") or a.get("CLAVE") or "").strip()
            road = str(a.get("Carretera") or a.get("carretera") or "").strip()
            if not code or not road: continue
            lat, lon = utm_to_wgs84(g["x"], g["y"])
            if lat < 27 or lat > 44 or lon < -19 or lon > 5: continue
            pname = str(a.get("Provincia") or "").strip()
            pcode = norm_prov(pname)
            imd = a.get("IMD_total") or a.get("imd_total")
            imd_l = a.get("IMD_ligero") or a.get("IMD_ligeros")
            imd_p = a.get("IMD_pesado") or a.get("IMD_pesados")
            pct = None
            if imd and imd_p:
                try: pct = round(float(imd_p)/float(imd)*100, 2)
                except: pass
            days = a.get("Días_afor") or a.get("Dias_afor")
            stype = str(a.get("Tipo_de_es") or a.get("Tipo") or "").strip().upper()
            st_enum = "NULL"
            if "PERMANENT" in stype and "SEMI" not in stype: st_enum = "'PERMANENT'"
            elif "SEMI" in stype: st_enum = "'SEMI_PERMANENT'"
            elif stype in ("P","PERMANENTE"): st_enum = "'PERMANENT'"
            elif stype in ("SP",) or "SEMIPERMANENTE" in stype: st_enum = "'SEMI_PERMANENT'"
            elif stype in ("E1",) or "PRIMARIA" in stype: st_enum = "'PRIMARY'"
            elif stype in ("E2",) or "SECUNDARIA" in stype: st_enum = "'SECONDARY'"
            elif stype in ("C","AF") or "COBERTURA" in stype or "AFORAMIENTO" in stype: st_enum = "'COVERAGE'"
            lanes = str(a.get("Número_de") or a.get("Numero_de") or "").strip() or None
            config = str(a.get("Configurac") or "").strip() or None
            pop = str(a.get("Población") or a.get("Poblacion") or "").strip() or None
            rt = infer_road_type(road)

            sql_lines.append(f"""INSERT INTO "TrafficStation" ("id","stationCode","province","provinceName","roadNumber","roadType","kmPoint","stationType","lanes","configuration","population","latitude","longitude","year","imd","imdLigeros","imdPesados","percentPesados","daysRecorded")
VALUES (gen_random_uuid()::text, {sql_str(code)}, {sql_str(pcode)}, {sql_str(pname)}, {sql_str(road)}, {sql_str(rt) if rt else 'NULL'}::"RoadType", {parse_km(a.get('Pk') or a.get('pk'))}, {st_enum}::"StationType", {sql_str(lanes)}, {sql_str(config)}, {sql_str(pop)}, {lat}, {lon}, {year}, {sql_int(imd)}, {sql_int(imd_l)}, {sql_int(imd_p)}, {sql_num(pct)}, {sql_int(days)})
ON CONFLICT ("stationCode","year") DO UPDATE SET "imd"=EXCLUDED."imd","imdLigeros"=EXCLUDED."imdLigeros","imdPesados"=EXCLUDED."imdPesados","percentPesados"=EXCLUDED."percentPesados","latitude"=EXCLUDED."latitude","longitude"=EXCLUDED."longitude";""")
            total_stations += 1

        # IMD segments (layer 3)
        features = fetch_layer(year, 3)
        for f in features:
            a = f.get("attributes", {})
            road = str(a.get("Nombre") or a.get("nombre") or "").strip()
            if not road: continue
            imd = a.get("IMD_total") or a.get("imd_total") or a.get("IMD")
            try:
                imd_val = int(float(imd))
            except:
                continue
            if imd_val <= 0: continue
            km_s = parse_km(a.get("Pk_inicio") or a.get("pk_inicio"))
            km_e = parse_km(a.get("Pk_fin") or a.get("pk_fin"))
            pname = str(a.get("Provincia") or "").strip()
            pcode = norm_prov(pname)
            imd_l = a.get("IMD_ligero") or a.get("imd_ligeros")
            imd_p = a.get("IMD_pesado") or a.get("imd_pesados") or a.get("imd_pesado")
            pct = None
            if imd_val and imd_p:
                try: pct = round(float(imd_p)/imd_val*100, 2)
                except: pass
            vhk_t = a.get("vh_km_tota") or a.get("vh_km_total")
            vhk_l = a.get("vh_km_lige") or a.get("vh_km_ligeros")
            vhk_p = a.get("vh_km_pesa") or a.get("vh_km_pesados")
            seg_len = a.get("Longitud") or a.get("longitud")
            src_id = a.get("OBJECTID") or a.get("ID") or a.get("id")
            tipo = str(a.get("Tipo_de_ca") or "").strip().upper()
            rt = None
            if "AUTOPISTA" in tipo: rt = "AUTOPISTA"
            elif "AUTOVIA" in tipo or "AUTOVÍA" in tipo: rt = "AUTOVIA"
            elif "NACIONAL" in tipo or "RED GENERAL" in tipo: rt = "NACIONAL"
            elif "COMARCAL" in tipo: rt = "COMARCAL"
            else: rt = infer_road_type(road)

            sql_lines.append(f"""INSERT INTO "TrafficFlow" ("id","roadNumber","roadType","kmStart","kmEnd","province","provinceName","year","imd","imdLigeros","imdPesados","percentPesados","vhKmTotal","vhKmLigeros","vhKmPesados","segmentLength","sourceId")
VALUES (gen_random_uuid()::text, {sql_str(road)}, {sql_str(rt) if rt else 'NULL'}::"RoadType", {km_s}, {km_e}, {sql_str(pcode)}, {sql_str(pname)}, {year}, {imd_val}, {sql_int(imd_l)}, {sql_int(imd_p)}, {sql_num(pct)}, {sql_num(vhk_t)}, {sql_num(vhk_l)}, {sql_num(vhk_p)}, {sql_num(seg_len)}, {sql_int(src_id)})
ON CONFLICT ("roadNumber","kmStart","kmEnd","year") DO UPDATE SET "imd"=EXCLUDED."imd","imdLigeros"=EXCLUDED."imdLigeros","imdPesados"=EXCLUDED."imdPesados","percentPesados"=EXCLUDED."percentPesados","vhKmTotal"=EXCLUDED."vhKmTotal","vhKmLigeros"=EXCLUDED."vhKmLigeros","vhKmPesados"=EXCLUDED."vhKmPesados","segmentLength"=EXCLUDED."segmentLength","roadType"=EXCLUDED."roadType","province"=EXCLUDED."province","provinceName"=EXCLUDED."provinceName";""")
            total_segments += 1

        time.sleep(1)

    sql_lines.append("COMMIT;")
    print(f"-- Total: {total_stations} stations, {total_segments} segments", file=sys.stderr)
    return "\n".join(sql_lines)

if __name__ == "__main__":
    sql = generate_sql()
    if "--execute" in sys.argv:
        print(f"-- Executing against {DB_URL[:40]}...", file=sys.stderr)
        proc = subprocess.run(["psql", DB_URL, "-v", "ON_ERROR_STOP=1"],
                              input=sql, text=True, capture_output=True)
        print(proc.stdout, file=sys.stderr)
        if proc.returncode != 0:
            print(f"-- PSQL ERROR: {proc.stderr}", file=sys.stderr)
            sys.exit(1)
        print("-- Done!", file=sys.stderr)
    else:
        print(sql)
