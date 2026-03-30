/**
 * SEO text generators for geographic pages.
 * Produces unique, data-driven descriptions for provinces, municipalities, and postal codes.
 */

export function provinceDescription({
  name,
  community,
  gasStationCount,
  cameraCount,
  radarCount,
  chargerCount,
  municipalityCount,
}: {
  name: string;
  community: string;
  gasStationCount?: number;
  cameraCount?: number;
  radarCount?: number;
  chargerCount?: number;
  municipalityCount?: number;
}): string {
  const parts = [`Tráfico en tiempo real en ${name}, ${community}.`];

  const stats: string[] = [];
  if (gasStationCount) stats.push(`${gasStationCount.toLocaleString("es-ES")} gasolineras`);
  if (cameraCount) stats.push(`${cameraCount} cámaras de tráfico`);
  if (radarCount) stats.push(`${radarCount} radares`);
  if (chargerCount) stats.push(`${chargerCount} cargadores EV`);

  if (stats.length > 0) {
    parts.push(`Infraestructura: ${stats.join(", ")}.`);
  }

  if (municipalityCount) {
    parts.push(`${municipalityCount} municipios con datos actualizados.`);
  }

  parts.push("Datos oficiales DGT, AEMET y MITERD.");
  return parts.join(" ");
}

export function municipalityDescription({
  name,
  province,
  gasStationCount,
  chargerCount,
  postalCodes,
}: {
  name: string;
  province: string;
  gasStationCount?: number;
  chargerCount?: number;
  postalCodes?: string[];
}): string {
  const parts = [];

  if (gasStationCount && chargerCount) {
    parts.push(
      `En ${name}, ${province}, hay ${gasStationCount} gasolineras y ${chargerCount} cargadores eléctricos.`
    );
  } else if (gasStationCount) {
    parts.push(`En ${name}, ${province}, hay ${gasStationCount} gasolineras.`);
  } else {
    parts.push(`Información de tráfico en tiempo real para ${name}, ${province}.`);
  }

  if (postalCodes && postalCodes.length > 0) {
    const shown = postalCodes.slice(0, 3).join(", ");
    const suffix = postalCodes.length > 3 ? ` y ${postalCodes.length - 3} más` : "";
    parts.push(`Códigos postales: ${shown}${suffix}.`);
  }

  parts.push("Precios de combustible actualizados, cámaras DGT y estado del tráfico.");
  return parts.join(" ");
}

export function postalCodeDescription({
  code,
  municipality,
  province,
  gasStationCount,
  chargerCount,
}: {
  code: string;
  municipality: string;
  province: string;
  gasStationCount?: number;
  chargerCount?: number;
}): string {
  const parts = [`Código postal ${code} en ${municipality}, ${province}.`];

  const stats: string[] = [];
  if (gasStationCount) stats.push(`${gasStationCount} gasolineras`);
  if (chargerCount) stats.push(`${chargerCount} cargadores EV`);

  if (stats.length > 0) {
    parts.push(stats.join(" y ") + " en la zona.");
  }

  parts.push("Precios de combustible actualizados y puntos de interés cercanos.");
  return parts.join(" ");
}

export function provinceTitle(name: string): string {
  return `Tráfico ${name} — Gasolineras, Cámaras y Radares`;
}

export function municipalityTitle(name: string, province: string): string {
  return `${name}, ${province} — Gasolineras y Tráfico`;
}

export function postalCodeTitle(code: string, municipality: string): string {
  return `CP ${code} ${municipality} — Gasolineras y Cargadores`;
}
