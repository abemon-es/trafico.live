// Spanish INE (Instituto Nacional de Estadística) codes for provinces and communities

export interface Province {
  code: string;
  name: string;
  communityCode: string;
}

export interface Community {
  code: string;
  name: string;
  isExcluded: boolean;
  excludedReason?: string;
}

export const COMMUNITIES: Community[] = [
  { code: "01", name: "Andalucía", isExcluded: false },
  { code: "02", name: "Aragón", isExcluded: false },
  { code: "03", name: "Principado de Asturias", isExcluded: false },
  { code: "04", name: "Illes Balears", isExcluded: false },
  { code: "05", name: "Canarias", isExcluded: false },
  { code: "06", name: "Cantabria", isExcluded: false },
  { code: "07", name: "Castilla y León", isExcluded: false },
  { code: "08", name: "Castilla-La Mancha", isExcluded: false },
  { code: "09", name: "Cataluña", isExcluded: false },
  { code: "10", name: "Comunitat Valenciana", isExcluded: false },
  { code: "11", name: "Extremadura", isExcluded: false },
  { code: "12", name: "Galicia", isExcluded: false },
  { code: "13", name: "Comunidad de Madrid", isExcluded: false },
  { code: "14", name: "Región de Murcia", isExcluded: false },
  { code: "15", name: "Comunidad Foral de Navarra", isExcluded: false },
  { code: "16", name: "País Vasco", isExcluded: false },
  { code: "17", name: "La Rioja", isExcluded: false },
  { code: "18", name: "Ceuta", isExcluded: false },
  { code: "19", name: "Melilla", isExcluded: false },
];

export const PROVINCES: Province[] = [
  // Andalucía
  { code: "04", name: "Almería", communityCode: "01" },
  { code: "11", name: "Cádiz", communityCode: "01" },
  { code: "14", name: "Córdoba", communityCode: "01" },
  { code: "18", name: "Granada", communityCode: "01" },
  { code: "21", name: "Huelva", communityCode: "01" },
  { code: "23", name: "Jaén", communityCode: "01" },
  { code: "29", name: "Málaga", communityCode: "01" },
  { code: "41", name: "Sevilla", communityCode: "01" },
  // Aragón
  { code: "22", name: "Huesca", communityCode: "02" },
  { code: "44", name: "Teruel", communityCode: "02" },
  { code: "50", name: "Zaragoza", communityCode: "02" },
  // Asturias
  { code: "33", name: "Asturias", communityCode: "03" },
  // Baleares
  { code: "07", name: "Illes Balears", communityCode: "04" },
  // Canarias
  { code: "35", name: "Las Palmas", communityCode: "05" },
  { code: "38", name: "Santa Cruz de Tenerife", communityCode: "05" },
  // Cantabria
  { code: "39", name: "Cantabria", communityCode: "06" },
  // Castilla y León
  { code: "05", name: "Ávila", communityCode: "07" },
  { code: "09", name: "Burgos", communityCode: "07" },
  { code: "24", name: "León", communityCode: "07" },
  { code: "34", name: "Palencia", communityCode: "07" },
  { code: "37", name: "Salamanca", communityCode: "07" },
  { code: "40", name: "Segovia", communityCode: "07" },
  { code: "42", name: "Soria", communityCode: "07" },
  { code: "47", name: "Valladolid", communityCode: "07" },
  { code: "49", name: "Zamora", communityCode: "07" },
  // Castilla-La Mancha
  { code: "02", name: "Albacete", communityCode: "08" },
  { code: "13", name: "Ciudad Real", communityCode: "08" },
  { code: "16", name: "Cuenca", communityCode: "08" },
  { code: "19", name: "Guadalajara", communityCode: "08" },
  { code: "45", name: "Toledo", communityCode: "08" },
  // Cataluña (excluded)
  { code: "08", name: "Barcelona", communityCode: "09" },
  { code: "17", name: "Girona", communityCode: "09" },
  { code: "25", name: "Lleida", communityCode: "09" },
  { code: "43", name: "Tarragona", communityCode: "09" },
  // Comunitat Valenciana
  { code: "03", name: "Alicante/Alacant", communityCode: "10" },
  { code: "12", name: "Castellón/Castelló", communityCode: "10" },
  { code: "46", name: "Valencia/València", communityCode: "10" },
  // Extremadura
  { code: "06", name: "Badajoz", communityCode: "11" },
  { code: "10", name: "Cáceres", communityCode: "11" },
  // Galicia
  { code: "15", name: "A Coruña", communityCode: "12" },
  { code: "27", name: "Lugo", communityCode: "12" },
  { code: "32", name: "Ourense", communityCode: "12" },
  { code: "36", name: "Pontevedra", communityCode: "12" },
  // Madrid
  { code: "28", name: "Madrid", communityCode: "13" },
  // Murcia
  { code: "30", name: "Murcia", communityCode: "14" },
  // Navarra
  { code: "31", name: "Navarra", communityCode: "15" },
  // País Vasco (excluded)
  { code: "01", name: "Álava/Araba", communityCode: "16" },
  { code: "48", name: "Bizkaia", communityCode: "16" },
  { code: "20", name: "Gipuzkoa", communityCode: "16" },
  // La Rioja
  { code: "26", name: "La Rioja", communityCode: "17" },
  // Ceuta
  { code: "51", name: "Ceuta", communityCode: "18" },
  // Melilla
  { code: "52", name: "Melilla", communityCode: "19" },
];

// Convenience lookups: code → display name (simplified, matching common usage)
export const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

export const COMMUNITY_NAMES: Record<string, string> = {
  "01": "Andalucía", "02": "Aragón", "03": "Asturias",
  "04": "Baleares", "05": "Canarias", "06": "Cantabria",
  "07": "Castilla y León", "08": "Castilla-La Mancha", "09": "Cataluña",
  "10": "Comunidad Valenciana", "11": "Extremadura", "12": "Galicia",
  "13": "Comunidad de Madrid", "14": "Región de Murcia",
  "15": "Navarra", "16": "País Vasco", "17": "La Rioja",
  "18": "Ceuta", "19": "Melilla",
};

// Lookup functions
export function getProvinceByCode(code: string): Province | undefined {
  return PROVINCES.find((p) => p.code === code);
}

export function getCommunityByCode(code: string): Community | undefined {
  return COMMUNITIES.find((c) => c.code === code);
}

export function getProvincesByCommunity(communityCode: string): Province[] {
  return PROVINCES.filter((p) => p.communityCode === communityCode);
}

export function getCommunityByProvince(provinceCode: string): Community | undefined {
  const province = getProvinceByCode(provinceCode);
  if (!province) return undefined;
  return getCommunityByCode(province.communityCode);
}

// Get all non-excluded communities (for DGT data coverage)
export function getCoveredCommunities(): Community[] {
  return COMMUNITIES.filter((c) => !c.isExcluded);
}

// Check if a province is covered by DGT NAP
export function isProvinceCovered(provinceCode: string): boolean {
  const community = getCommunityByProvince(provinceCode);
  return community ? !community.isExcluded : false;
}
