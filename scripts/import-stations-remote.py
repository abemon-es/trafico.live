#!/usr/bin/env python3
"""Import counting stations from Ministry ArcGIS Layer 1. Run on hetzner-dev."""
import json, math, os, sys, subprocess, time, unicodedata, urllib.request, urllib.parse

DB = os.environ.get("DATABASE_URL", "postgresql://apps@127.0.0.1:5435/le_trafico")
BASE = "https://mapas.fomento.gob.es/arcgis/rest/services/MapaTrafico"
YEARS = [2017, 2018, 2019]

a=6378137.0;f=1/298.257223563;k0=0.9996;e=math.sqrt(2*f-f*f);e2=e*e;e4=e2*e2;e6=e4*e2
e1=(1-math.sqrt(1-e2))/(1+math.sqrt(1-e2));lon0=-3*math.pi/180

def u2w(ex,ny):
    x=ex-500000;y=ny;M=y/k0;mu=M/(a*(1-e2/4-3*e4/64-5*e6/256))
    p=mu+(3*e1/2-27*e1**3/32)*math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*math.sin(4*mu)+(151*e1**3/96)*math.sin(6*mu)
    sp=math.sin(p);cp=math.cos(p);tp=sp/cp;N=a/math.sqrt(1-e2*sp*sp)
    T=tp*tp;C=(e2/(1-e2))*cp*cp;R=a*(1-e2)/(1-e2*sp*sp)**1.5;D=x/(N*k0)
    lat=p-(N*tp/R)*(D**2/2-(5+3*T+10*C-4*C**2-9*(e2/(1-e2)))*D**4/24+(61+90*T+298*C+45*T**2-252*(e2/(1-e2))-3*C**2)*D**6/720)
    lon=lon0+(D-(1+2*T+C)*D**3/6+(5-2*C+28*T-3*C**2+8*(e2/(1-e2))+24*T**2)*D**5/120)/cp
    return round(lat*180/math.pi,6),round(lon*180/math.pi,6)

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
    except:
        return "NULL"

def sn(v):
    if v is None: return "NULL"
    try:
        n = float(v)
        return "NULL" if n == 0 or math.isnan(n) else str(n)
    except:
        return "NULL"

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
            time.sleep(5)
            # retry once
            try:
                raw = urllib.request.urlopen(req, timeout=120).read()
                data = json.loads(raw)
            except Exception as ex2:
                print(f"RETRY FAIL {year} off={offset}: {ex2}", file=sys.stderr)
                break
        ff = data.get("features", [])
        for feat in ff:
            at = feat.get("attributes", {})
            g = feat.get("geometry", {})
            if not g.get("x") or not g.get("y"):
                continue
            code = str(at.get("Estación", at.get("Estacion", at.get("CLAVE", "")))).strip()
            road = str(at.get("Carretera", at.get("carretera", ""))).strip()
            if not code or not road:
                continue
            lat, lon = u2w(g["x"], g["y"])
            if lat < 27 or lat > 44 or lon < -19 or lon > 5:
                continue
            pn = str(at.get("Provincia", at.get("provincia", ""))).strip()
            pc = np(pn)
            imd = at.get("IMD_total", at.get("imd_total"))
            iml = at.get("IMD_ligero", at.get("IMD_ligeros", at.get("imd_ligeros")))
            imp = at.get("IMD_pesado", at.get("IMD_pesados", at.get("imd_pesados")))
            pct = None
            if imd and imp:
                try: pct = round(float(imp) / float(imd) * 100, 2)
                except: pass
            days = at.get("Días_afor", at.get("Dias_afor"))
            km = at.get("Pk", at.get("pk", at.get("PK", 0)))
            try: km = float(str(km).replace(",", "."))
            except: km = 0
            rt = irt(road)
            rt_sql = f"'{rt}'::\"RoadType\"" if rt else "NULL"

            sql.append(
                f'INSERT INTO "TrafficStation" '
                f'("id","stationCode","province","provinceName","roadNumber","roadType","kmPoint",'
                f'"latitude","longitude","year","imd","imdLigeros","imdPesados","percentPesados","daysRecorded") '
                f"VALUES (gen_random_uuid()::text, {sq(code)}, {sq(pc)}, {sq(pn)}, {sq(road)}, "
                f"{rt_sql}, {km}, {lat}, {lon}, {year}, {si(imd)}, {si(iml)}, {si(imp)}, {sn(pct)}, {si(days)}) "
                f'ON CONFLICT ("stationCode","year") DO UPDATE SET '
                f'"imd"=EXCLUDED."imd","imdLigeros"=EXCLUDED."imdLigeros",'
                f'"imdPesados"=EXCLUDED."imdPesados","latitude"=EXCLUDED."latitude",'
                f'"longitude"=EXCLUDED."longitude","province"=EXCLUDED."province",'
                f'"provinceName"=EXCLUDED."provinceName";'
            )
            total += 1
        print(f"Stations {year}: {total} total (off={offset}, batch={len(ff)})", file=sys.stderr)
        if len(ff) < 1000:
            break
        offset += 1000
        time.sleep(0.5)
    time.sleep(1)

sql.append("COMMIT;")
print(f"Total stations to upsert: {total}", file=sys.stderr)

proc = subprocess.run(
    ["psql", DB, "-v", "ON_ERROR_STOP=1"],
    input="\n".join(sql), text=True, capture_output=True
)
if proc.returncode != 0:
    print(f"PSQL ERROR: {proc.stderr[:1000]}", file=sys.stderr)
    sys.exit(1)
print("Stations import done!", file=sys.stderr)
