// Mapping from DGT province names to our database province names
// DGT uses uppercase with special formats, we use standard Spanish names

export const DGT_TO_DB_PROVINCE: Record<string, string> = {
  "ALBACETE": "Albacete",
  "ALICANTE/ALACANT": "Alicante",
  "ALMERÍA": "Almería",
  "ASTURIAS": "Asturias",
  "ÁVILA": "Ávila",
  "BADAJOZ": "Badajoz",
  "BALEARS, ILLES": "Baleares",
  "BURGOS": "Burgos",
  "CÁCERES": "Cáceres",
  "CÁDIZ": "Cádiz",
  "CANTABRIA": "Cantabria",
  "CASTELLÓN/CASTELLÓ": "Castellón",
  "CEUTA": "Ceuta",
  "CIUDAD REAL": "Ciudad Real",
  "CÓRDOBA": "Córdoba",
  "CORUÑA, A": "A Coruña",
  "CUENCA": "Cuenca",
  "GIPUZKOA": "Gipuzkoa",
  "GRANADA": "Granada",
  "GUADALAJARA": "Guadalajara",
  "HUELVA": "Huelva",
  "HUESCA": "Huesca",
  "JAÉN": "Jaén",
  "LEÓN": "León",
  "LUGO": "Lugo",
  "MADRID": "Madrid",
  "MÁLAGA": "Málaga",
  "MURCIA": "Murcia",
  "NAVARRA": "Navarra",
  "OURENSE": "Ourense",
  "PALENCIA": "Palencia",
  "PONTEVEDRA": "Pontevedra",
  "RIOJA, LA": "La Rioja",
  "SALAMANCA": "Salamanca",
  "SEGOVIA": "Segovia",
  "SEVILLA": "Sevilla",
  "SORIA": "Soria",
  "TERUEL": "Teruel",
  "TOLEDO": "Toledo",
  "VALENCIA/VALÈNCIA": "Valencia",
  "VALLADOLID": "Valladolid",
  "ZAMORA": "Zamora",
  "ZARAGOZA": "Zaragoza",
};

// Reverse mapping: DB name → DGT name
export const DB_TO_DGT_PROVINCE: Record<string, string> = Object.fromEntries(
  Object.entries(DGT_TO_DB_PROVINCE).map(([dgt, db]) => [db, dgt])
);

// Normalize DGT province name to our DB format
export function normalizeDGTProvince(dgtProvince: string): string {
  return DGT_TO_DB_PROVINCE[dgtProvince] || dgtProvince;
}

// Get DGT province name from our DB name
export function getDGTProvinceName(dbProvince: string): string | undefined {
  return DB_TO_DGT_PROVINCE[dbProvince];
}

// Province to Community mapping (for filtering by community)
export const PROVINCE_TO_COMMUNITY: Record<string, string> = {
  "Álava": "País Vasco",
  "Albacete": "Castilla-La Mancha",
  "Alicante": "Comunidad Valenciana",
  "Almería": "Andalucía",
  "Ávila": "Castilla y León",
  "Badajoz": "Extremadura",
  "Baleares": "Islas Baleares",
  "Barcelona": "Cataluña",
  "Burgos": "Castilla y León",
  "Cáceres": "Extremadura",
  "Cádiz": "Andalucía",
  "Castellón": "Comunidad Valenciana",
  "Ciudad Real": "Castilla-La Mancha",
  "Córdoba": "Andalucía",
  "A Coruña": "Galicia",
  "Cuenca": "Castilla-La Mancha",
  "Girona": "Cataluña",
  "Granada": "Andalucía",
  "Guadalajara": "Castilla-La Mancha",
  "Gipuzkoa": "País Vasco",
  "Huelva": "Andalucía",
  "Huesca": "Aragón",
  "Jaén": "Andalucía",
  "León": "Castilla y León",
  "Lleida": "Cataluña",
  "La Rioja": "La Rioja",
  "Lugo": "Galicia",
  "Madrid": "Comunidad de Madrid",
  "Málaga": "Andalucía",
  "Murcia": "Región de Murcia",
  "Navarra": "Navarra",
  "Ourense": "Galicia",
  "Asturias": "Principado de Asturias",
  "Palencia": "Castilla y León",
  "Las Palmas": "Canarias",
  "Pontevedra": "Galicia",
  "Salamanca": "Castilla y León",
  "Santa Cruz de Tenerife": "Canarias",
  "Cantabria": "Cantabria",
  "Segovia": "Castilla y León",
  "Sevilla": "Andalucía",
  "Soria": "Castilla y León",
  "Tarragona": "Cataluña",
  "Teruel": "Aragón",
  "Toledo": "Castilla-La Mancha",
  "Valencia": "Comunidad Valenciana",
  "Valladolid": "Castilla y León",
  "Bizkaia": "País Vasco",
  "Zamora": "Castilla y León",
  "Zaragoza": "Aragón",
  "Ceuta": "Ceuta",
  "Melilla": "Melilla",
};

// Get all provinces for a community
export function getProvincesForCommunity(communityName: string): string[] {
  return Object.entries(PROVINCE_TO_COMMUNITY)
    .filter(([, community]) => community === communityName)
    .map(([province]) => province);
}
