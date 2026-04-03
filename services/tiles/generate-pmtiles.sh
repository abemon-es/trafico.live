#!/usr/bin/env bash
# generate-pmtiles.sh — Export PostGIS tables to GeoJSON and convert to PMTiles
# Usage:
#   ./generate-pmtiles.sh --all              # regenerate all layers
#   ./generate-pmtiles.sh --layer=stations   # regenerate one layer
#   ./generate-pmtiles.sh --layer=cameras --layer=radars  # multiple layers
#
# Requires: psql, tippecanoe
# Env: DATABASE_URL (postgres connection string)
set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
WORK_DIR="${WORK_DIR:-/tmp/tiles-work}"
OUTPUT_DIR="${OUTPUT_DIR:-/data/tiles}"
mkdir -p "$WORK_DIR" "$OUTPUT_DIR"

LAYERS=()
ALL=false

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --all)        ALL=true ;;
    --layer=*)    LAYERS+=("${arg#--layer=}") ;;
    --output=*)   OUTPUT_DIR="${arg#--output=}" ;;
    --work-dir=*) WORK_DIR="${arg#--work-dir=}" ;;
    --help|-h)
      echo "Usage: $0 [--all] [--layer=NAME ...] [--output=DIR] [--work-dir=DIR]"
      echo ""
      echo "Layers: stations, cameras, radars, gas-stations, chargers,"
      echo "        railway-stations, railway-routes, climate-stations,"
      echo "        air-quality, airports, ports, ferry-stops, ferry-routes,"
      echo "        transit-stops, transit-routes, portugal-gas, panels, accidents"
      exit 0
      ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

if [[ "$ALL" == false && ${#LAYERS[@]} -eq 0 ]]; then
  echo "Error: specify --all or at least one --layer=NAME"
  echo "Run with --help for usage."
  exit 1
fi

ALL_LAYER_NAMES=(stations cameras radars gas-stations chargers railway-stations railway-routes climate-stations air-quality airports ports ferry-stops ferry-routes transit-stops transit-routes portugal-gas panels accidents)

if [[ "$ALL" == true ]]; then
  LAYERS=("${ALL_LAYER_NAMES[@]}")
fi

# ---------------------------------------------------------------------------
# Validate prerequisites
# ---------------------------------------------------------------------------
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

for cmd in psql tippecanoe; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: $cmd not found in PATH"
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# Helper: run SQL query and write GeoJSON to file
# ---------------------------------------------------------------------------
run_query() {
  local name="$1"
  local sql="$2"
  local outfile="$WORK_DIR/${name}.geojson"

  echo "  [sql] Exporting $name ..."
  psql "$DATABASE_URL" -t -A -c "$sql" > "$outfile"

  local size
  size=$(wc -c < "$outfile" | tr -d ' ')
  echo "  [sql] $name → $(numfmt --to=iec "$size" 2>/dev/null || echo "${size} bytes")"
}

# ---------------------------------------------------------------------------
# Helper: run tippecanoe and copy output
# ---------------------------------------------------------------------------
run_tippecanoe() {
  local name="$1"
  local layer="$2"
  shift 2
  local extra_args=("$@")

  local infile="$WORK_DIR/${name}.geojson"
  local outfile="$WORK_DIR/${name}.pmtiles"
  local final="$OUTPUT_DIR/${name}.pmtiles"

  echo "  [tile] Generating $name.pmtiles ..."
  tippecanoe \
    -z14 -Z4 \
    -l "$layer" \
    -o "$outfile" \
    --force \
    "${extra_args[@]}" \
    "$infile"

  cp "$outfile" "$final"

  local size
  size=$(wc -c < "$final" | tr -d ' ')
  echo "  [tile] $name.pmtiles → $(numfmt --to=iec "$size" 2>/dev/null || echo "${size} bytes")"
}

# ---------------------------------------------------------------------------
# Helper: check if layer is requested
# ---------------------------------------------------------------------------
should_build() {
  local name="$1"
  for l in "${LAYERS[@]}"; do
    if [[ "$l" == "$name" ]]; then
      return 0
    fi
  done
  return 1
}

# ---------------------------------------------------------------------------
# Layer: stations (TrafficStation) — ~14,400 rows
# ---------------------------------------------------------------------------
generate_stations() {
  echo ""
  echo "=== stations (TrafficStation) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'stationCode', "stationCode",
      'roadNumber', "roadNumber",
      'province', province,
      'provinceName', "provinceName",
      'kmPoint', "kmPoint"::float,
      'stationType', "stationType",
      'imd', imd,
      'imdLigeros', "imdLigeros",
      'imdPesados', "imdPesados",
      'percentPesados', "percentPesados"::float,
      'year', year,
      'population', population
    )
  )), '[]'::json)
) FROM "TrafficStation";
SQL
  )

  run_query "stations" "$sql"
  run_tippecanoe "stations" "stations" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --cluster-distance=10
}

# ---------------------------------------------------------------------------
# Layer: cameras (Camera) — ~2,000 active rows
# ---------------------------------------------------------------------------
generate_cameras() {
  echo ""
  echo "=== cameras (Camera) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'id', id,
      'name', name,
      'roadNumber', "roadNumber",
      'province', province,
      'provinceName', "provinceName",
      'isActive', "isActive",
      'feedUrl', "feedUrl",
      'thumbnailUrl', "thumbnailUrl"
    )
  )), '[]'::json)
) FROM "Camera" WHERE "isActive" = true;
SQL
  )

  run_query "cameras" "$sql"
  run_tippecanoe "cameras" "cameras" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: radars (Radar) — ~500 active rows
# ---------------------------------------------------------------------------
generate_radars() {
  echo ""
  echo "=== radars (Radar) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'radarId', "radarId",
      'roadNumber', "roadNumber",
      'province', province,
      'provinceName', "provinceName",
      'type', type,
      'speedLimit', "speedLimit",
      'direction', direction,
      'isActive', "isActive"
    )
  )), '[]'::json)
) FROM "Radar" WHERE "isActive" = true;
SQL
  )

  run_query "radars" "$sql"
  run_tippecanoe "radars" "radars" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: gas-stations (GasStation) — ~12,000 rows
# ---------------------------------------------------------------------------
generate_gas_stations() {
  echo ""
  echo "=== gas-stations (GasStation) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'id', id,
      'name', name,
      'address', address,
      'province', province,
      'provinceName', "provinceName",
      'brand', name,
      'priceGasolina95', "priceGasolina95E5"::float,
      'priceDieselA', "priceGasoleoA"::float,
      'priceGasolina98', "priceGasolina98E5"::float,
      'priceDieselPremium', "priceGasoleoPremium"::float,
      'priceGLP', "priceGLP"::float,
      'schedule', schedule,
      'isOpen24h', "is24h"
    )
  )), '[]'::json)
) FROM "GasStation";
SQL
  )

  run_query "gas-stations" "$sql"
  run_tippecanoe "gas-stations" "gas_stations" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: chargers (EVCharger) — ~2,000 rows
# ---------------------------------------------------------------------------
generate_chargers() {
  echo ""
  echo "=== chargers (EVCharger) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'id', id,
      'name', name,
      'address', address,
      'province', province,
      'provinceName', "provinceName",
      'operator', operator,
      'powerKw', "powerKw"::float,
      'connectors', connectors,
      'chargerTypes', "chargerTypes",
      'is24h', "is24h",
      'isPublic', "isPublic"
    )
  )), '[]'::json)
) FROM "EVCharger" WHERE "isPublic" = true;
SQL
  )

  run_query "chargers" "$sql"
  run_tippecanoe "chargers" "chargers" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: railway-stations (RailwayStation) — ~1,500 rows
# ---------------------------------------------------------------------------
generate_railway_stations() {
  echo ""
  echo "=== railway-stations (RailwayStation) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'stopId', "stopId",
      'name', name,
      'code', code,
      'province', province,
      'provinceName', "provinceName",
      'network', network,
      'serviceTypes', "serviceTypes",
      'wheelchair', wheelchair
    )
  )), '[]'::json)
) FROM "RailwayStation";
SQL
  )

  run_query "railway-stations" "$sql"
  run_tippecanoe "railway-stations" "railway_stations" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: railway-routes (RailwayRoute) — line geometry from JSON column
# ---------------------------------------------------------------------------
generate_railway_routes() {
  echo ""
  echo "=== railway-routes (RailwayRoute) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', "shapeGeoJSON",
    'properties', json_build_object(
      'routeId', "routeId",
      'shortName', "shortName",
      'longName', "longName",
      'brand', brand,
      'serviceType', "serviceType",
      'color', color,
      'textColor', "textColor",
      'network', network,
      'stopsCount', "stopsCount"
    )
  )), '[]'::json)
) FROM "RailwayRoute" WHERE "shapeGeoJSON" IS NOT NULL;
SQL
  )

  run_query "railway-routes" "$sql"
  run_tippecanoe "railway-routes" "railway_routes" \
    --no-feature-limit \
    --no-tile-size-limit
}

# ---------------------------------------------------------------------------
# Layer: climate-stations (ClimateStation) — ~900 rows
# ---------------------------------------------------------------------------
generate_climate_stations() {
  echo ""
  echo "=== climate-stations (ClimateStation) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'stationCode', "stationCode",
      'name', name,
      'province', province,
      'provinceName', "provinceName",
      'altitude', altitude,
      'isActive', "isActive"
    )
  )), '[]'::json)
) FROM "ClimateStation";
SQL
  )

  run_query "climate-stations" "$sql"
  run_tippecanoe "climate-stations" "climate_stations" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: air-quality (AirQualityStation) — ~600 rows
# ---------------------------------------------------------------------------
generate_air_quality() {
  echo ""
  echo "=== air-quality (AirQualityStation) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'stationId', "stationId",
      'name', name,
      'network', network,
      'city', city,
      'province', province,
      'elevation', elevation
    )
  )), '[]'::json)
) FROM "AirQualityStation";
SQL
  )

  run_query "air-quality" "$sql"
  run_tippecanoe "air-quality" "air_quality" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: airports (Airport) — ~50 rows
# ---------------------------------------------------------------------------
generate_airports() {
  echo ""
  echo "=== airports (Airport) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'icao', icao,
      'iata', iata,
      'name', name,
      'city', city,
      'province', province,
      'elevation', elevation,
      'isAena', "isAena"
    )
  )), '[]'::json)
) FROM "Airport";
SQL
  )

  run_query "airports" "$sql"
  run_tippecanoe "airports" "airports" \
    --no-feature-limit \
    --no-tile-size-limit
}

# ---------------------------------------------------------------------------
# Layer: ports (SpanishPort) — ~50 rows
# ---------------------------------------------------------------------------
generate_ports() {
  echo ""
  echo "=== ports (SpanishPort) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'slug', slug,
      'name', name,
      'type', type::text,
      'province', province,
      'provinceName', "provinceName",
      'coastalZone', "coastalZone",
      'stationCount', "stationCount"
    )
  )), '[]'::json)
) FROM "SpanishPort";
SQL
  )

  run_query "ports" "$sql"
  run_tippecanoe "ports" "ports" \
    --no-feature-limit \
    --no-tile-size-limit
}

# ---------------------------------------------------------------------------
# Layer: ferry-stops (FerryStop) — ~200 rows
# ---------------------------------------------------------------------------
generate_ferry_stops() {
  echo ""
  echo "=== ferry-stops (FerryStop) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'stopId', "stopId",
      'stopName', "stopName",
      'routeId', "routeId"
    )
  )), '[]'::json)
) FROM "FerryStop";
SQL
  )

  run_query "ferry-stops" "$sql"
  run_tippecanoe "ferry-stops" "ferry_stops" \
    --no-feature-limit \
    --no-tile-size-limit
}

# ---------------------------------------------------------------------------
# Layer: ferry-routes (FerryRoute) — line geometry from JSON
# ---------------------------------------------------------------------------
generate_ferry_routes() {
  echo ""
  echo "=== ferry-routes (FerryRoute) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', geometry,
    'properties', json_build_object(
      'routeId', "routeId",
      'routeName', "routeName",
      'operator', operator,
      'routeColor', "routeColor"
    )
  )), '[]'::json)
) FROM "FerryRoute" WHERE geometry IS NOT NULL;
SQL
  )

  run_query "ferry-routes" "$sql"
  run_tippecanoe "ferry-routes" "ferry_routes" \
    --no-feature-limit \
    --no-tile-size-limit
}

# ---------------------------------------------------------------------------
# Layer: transit-stops (TransitStop) — thousands of rows
# ---------------------------------------------------------------------------
generate_transit_stops() {
  echo ""
  echo "=== transit-stops (TransitStop) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'stopId', "stopId",
      'stopName', "stopName",
      'operatorId', "operatorId",
      'locationType', "locationType"
    )
  )), '[]'::json)
) FROM "TransitStop";
SQL
  )

  run_query "transit-stops" "$sql"
  run_tippecanoe "transit-stops" "transit_stops" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --cluster-distance=10
}

# ---------------------------------------------------------------------------
# Layer: transit-routes (TransitRoute) — line geometry from JSON
# ---------------------------------------------------------------------------
generate_transit_routes() {
  echo ""
  echo "=== transit-routes (TransitRoute) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', geometry,
    'properties', json_build_object(
      'routeId', "routeId",
      'shortName', "shortName",
      'longName', "longName",
      'routeType', "routeType",
      'routeColor', "routeColor",
      'operatorId', "operatorId"
    )
  )), '[]'::json)
) FROM "TransitRoute" WHERE geometry IS NOT NULL;
SQL
  )

  run_query "transit-routes" "$sql"
  run_tippecanoe "transit-routes" "transit_routes" \
    --no-feature-limit \
    --no-tile-size-limit
}

# ---------------------------------------------------------------------------
# Layer: portugal-gas (PortugalGasStation) — ~1,000+ rows
# ---------------------------------------------------------------------------
generate_portugal_gas() {
  echo ""
  echo "=== portugal-gas (PortugalGasStation) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'id', id,
      'name', name,
      'brand', brand,
      'district', district,
      'municipality', municipality,
      'priceGasoleoSimples', "priceGasoleoSimples"::float,
      'priceGasolina95', "priceGasolina95"::float,
      'priceGasolina98', "priceGasolina98"::float
    )
  )), '[]'::json)
) FROM "PortugalGasStation";
SQL
  )

  run_query "portugal-gas" "$sql"
  run_tippecanoe "portugal-gas" "portugal_gas" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: panels (VariablePanel) — DGT variable message signs
# ---------------------------------------------------------------------------
generate_panels() {
  echo ""
  echo "=== panels (VariablePanel) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'panelId', "panelId",
      'roadNumber', "roadNumber",
      'kmPoint', "kmPoint"::float,
      'province', province,
      'provinceName', "provinceName",
      'direction', direction::text,
      'currentMessage', "currentMessage"
    )
  )), '[]'::json)
) FROM "VariablePanel";
SQL
  )

  run_query "panels" "$sql"
  run_tippecanoe "panels" "panels" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping
}

# ---------------------------------------------------------------------------
# Layer: accidents (AccidentMicrodata) — where lat/lon exist
# ---------------------------------------------------------------------------
generate_accidents() {
  echo ""
  echo "=== accidents (AccidentMicrodata with coords) ==="

  local sql
  sql=$(cat <<'SQL'
SELECT json_build_object(
  'type', 'FeatureCollection',
  'features', COALESCE(json_agg(json_build_object(
    'type', 'Feature',
    'geometry', json_build_object(
      'type', 'Point',
      'coordinates', json_build_array(longitude::float, latitude::float)
    ),
    'properties', json_build_object(
      'year', year,
      'month', month,
      'severity', severity,
      'numVehicles', "numVehicles",
      'numVictims', "numVictims",
      'numDeaths', "numDeaths",
      'roadType', "roadType",
      'roadNumber', "roadNumber",
      'province', province
    )
  )), '[]'::json)
) FROM "AccidentMicrodata"
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
SQL
  )

  run_query "accidents" "$sql"
  run_tippecanoe "accidents" "accidents" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --cluster-distance=15 \
    -z12 -Z3
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
echo "=============================================="
echo " PMTiles Generation — trafico.live"
echo "=============================================="
echo "Work dir:   $WORK_DIR"
echo "Output dir: $OUTPUT_DIR"
echo "Layers:     ${LAYERS[*]}"
echo "=============================================="

START_TIME=$(date +%s)

should_build "stations"         && generate_stations
should_build "cameras"          && generate_cameras
should_build "radars"           && generate_radars
should_build "gas-stations"     && generate_gas_stations
should_build "chargers"         && generate_chargers
should_build "railway-stations" && generate_railway_stations
should_build "railway-routes"   && generate_railway_routes
should_build "climate-stations" && generate_climate_stations
should_build "air-quality"      && generate_air_quality
should_build "airports"         && generate_airports
should_build "ports"            && generate_ports
should_build "ferry-stops"      && generate_ferry_stops
should_build "ferry-routes"     && generate_ferry_routes
should_build "transit-stops"    && generate_transit_stops
should_build "transit-routes"   && generate_transit_routes
should_build "portugal-gas"     && generate_portugal_gas
should_build "panels"           && generate_panels
should_build "accidents"        && generate_accidents

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "=============================================="
echo " Done in ${ELAPSED}s"
echo "=============================================="
echo ""
echo "Output files:"
ls -lh "$OUTPUT_DIR"/*.pmtiles 2>/dev/null || echo "  (no .pmtiles files found)"
