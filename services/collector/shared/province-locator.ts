/**
 * The Spanish province (INE code) that contains a point, from the province
 * polygons in data/spain-provinces.geojson (a copy of
 * public/geo/spain-provinces.geojson; tests/province-locator.test.ts keeps them
 * identical).
 *
 * Why: DGT DATEX records only carry province and autonomous community in the
 * extension of a TpegNonJunctionPoint. On 2026-11-02 at 11:38, 1,556 of 1,875
 * active DGT incidents (mostly vehicle stops) had neither, so they belonged to
 * no province or community page. Coordinates they always have.
 *
 * Plain ray casting over each ring (holes subtract), with a bounding box per
 * province to skip most of them. A point at sea or outside Spain → null.
 */

import { readFileSync } from "fs";
import { COMMUNITIES, PROVINCES, PROVINCE_TO_COMMUNITY, normalizeProvince } from "./provinces.js";

type Ring = [number, number][]; // [lng, lat]
interface ProvinceShape {
  code: string;
  polygons: Ring[][]; // polygon → rings (first outer, rest holes)
  bbox: [number, number, number, number]; // minLng, minLat, maxLng, maxLat
}

function parse(text: string): ProvinceShape[] {
  const geo = JSON.parse(text) as {
    features: { properties: { cod_prov: string }; geometry: { type: string; coordinates: unknown } }[];
  };
  return geo.features.map((f) => {
    const polygons = (f.geometry.type === "MultiPolygon"
      ? (f.geometry.coordinates as Ring[][])
      : [f.geometry.coordinates as Ring[]]);
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const poly of polygons)
      for (const [lng, lat] of poly[0]) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    return { code: String(f.properties.cod_prov).padStart(2, "0"), polygons, bbox: [minLng, minLat, maxLng, maxLat] };
  });
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

let shapes: ProvinceShape[] | null = null;
function load(): ProvinceShape[] {
  shapes ??= parse(readFileSync(new URL("../data/spain-provinces.geojson", import.meta.url), "utf8"));
  return shapes;
}

/** INE province code («28») containing the point, or null. */
export function provinceCodeAt(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const s of load()) {
    const [minLng, minLat, maxLng, maxLat] = s.bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    for (const poly of s.polygons) {
      if (!inRing(lng, lat, poly[0])) continue;
      if (poly.slice(1).some((hole) => inRing(lng, lat, hole))) continue;
      return s.code;
    }
  }
  return null;
}

export interface ProvinceLocation {
  province: string; // INE code, «28»: what province pages and /api/incidents filter on
  provinceName: string;
  community: string; // community code, «13»
  communityName: string;
}

function fromCode(code: string | null): ProvinceLocation | null {
  if (!code || !PROVINCES[code]) return null;
  const community = PROVINCE_TO_COMMUNITY[code];
  if (!community || !COMMUNITIES[community]) return null;
  return { province: code, provinceName: PROVINCES[code], community, communityName: COMMUNITIES[community] };
}

/** Codes and names of the province containing a point, or null. */
export function locateProvince(lat: number, lng: number): ProvinceLocation | null {
  return fromCode(provinceCodeAt(lat, lng));
}

/**
 * Location of a DGT record. The DGT sends province and community as names
 * («Madrid», «Balears, Illes»), and only for some records; every other source
 * and every page uses codes. The DGT's province name wins when it maps to a
 * code; otherwise the coordinates decide.
 */
export function resolveDGTLocation(dgtProvince: string | undefined, lat: number, lng: number): ProvinceLocation | null {
  return fromCode(dgtProvince ? normalizeProvince(dgtProvince) : null) ?? locateProvince(lat, lng);
}
