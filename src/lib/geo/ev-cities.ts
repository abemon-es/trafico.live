/**
 * The /carga-ev/<ciudad> hubs, shared with /carga-ev/provincia/<slug> so each
 * city links its province and each province links its cities.
 */

import { slugify } from "@/lib/geo/slugify";

export const EV_CITIES: Record<string, { name: string; province: string }> = {
  madrid: { name: "Madrid", province: "Madrid" },
  barcelona: { name: "Barcelona", province: "Barcelona" },
  valencia: { name: "Valencia", province: "Valencia" },
  sevilla: { name: "Sevilla", province: "Sevilla" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza" },
  malaga: { name: "Málaga", province: "Málaga" },
  murcia: { name: "Murcia", province: "Murcia" },
  palma: { name: "Palma", province: "Baleares" },
  bilbao: { name: "Bilbao", province: "Bizkaia" },
  alicante: { name: "Alicante", province: "Alicante" },
  cordoba: { name: "Córdoba", province: "Córdoba" },
  valladolid: { name: "Valladolid", province: "Valladolid" },
  vigo: { name: "Vigo", province: "Pontevedra" },
  gijon: { name: "Gijón", province: "Asturias" },
  hospitalet: { name: "L'Hospitalet", province: "Barcelona" },
  vitoria: { name: "Vitoria-Gasteiz", province: "Álava" },
  granada: { name: "Granada", province: "Granada" },
  elche: { name: "Elche", province: "Alicante" },
  oviedo: { name: "Oviedo", province: "Asturias" },
  santander: { name: "Santander", province: "Cantabria" },
  "san-sebastian": { name: "San Sebastián", province: "Gipuzkoa" },
  pamplona: { name: "Pamplona", province: "Navarra" },
};

/** The /carga-ev/provincia/<slug> slug of a city's province (same as /espana). */
export function evCityProvinceSlug(city: { province: string }): string {
  return slugify(city.province);
}

/** City hubs whose province is `provinceSlug`. */
export function evCitiesInProvince(provinceSlug: string): Array<{ slug: string; name: string }> {
  return Object.entries(EV_CITIES)
    .filter(([, c]) => evCityProvinceSlug(c) === provinceSlug)
    .map(([slug, c]) => ({ slug, name: c.name }));
}
