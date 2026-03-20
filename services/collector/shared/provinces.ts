export const PROVINCES: Record<string, string> = {
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
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla"
};

export const PROVINCE_TO_COMMUNITY: Record<string, string> = {
  "01": "16", "20": "16", "48": "16",
  "02": "08", "13": "08", "16": "08", "19": "08", "45": "08",
  "03": "10", "12": "10", "46": "10",
  "04": "01", "11": "01", "14": "01", "18": "01", "21": "01", "23": "01", "29": "01", "41": "01",
  "05": "07", "09": "07", "24": "07", "34": "07", "37": "07", "40": "07", "42": "07", "47": "07", "49": "07",
  "06": "11", "10": "11",
  "07": "04",
  "08": "09", "17": "09", "25": "09", "43": "09",
  "15": "12", "27": "12", "32": "12", "36": "12",
  "22": "02", "44": "02", "50": "02",
  "26": "17",
  "28": "13",
  "30": "14",
  "31": "15",
  "33": "03",
  "35": "05", "38": "05",
  "39": "06",
  "51": "18",
  "52": "19",
};

export const COMMUNITIES: Record<string, string> = {
  "01": "Andalucía", "02": "Aragón", "03": "Principado de Asturias",
  "04": "Illes Balears", "05": "Canarias", "06": "Cantabria",
  "07": "Castilla y León", "08": "Castilla-La Mancha", "09": "Cataluña",
  "10": "Comunitat Valenciana", "11": "Extremadura", "12": "Galicia",
  "13": "Comunidad de Madrid", "14": "Región de Murcia",
  "15": "Comunidad Foral de Navarra", "16": "País Vasco", "17": "La Rioja",
  "18": "Ceuta", "19": "Melilla"
};

// Reverse lookup: province name -> code (built at import time)
export const PROVINCE_NAME_TO_CODE: Record<string, string> = {};
for (const [code, name] of Object.entries(PROVINCES)) {
  PROVINCE_NAME_TO_CODE[name.toLowerCase()] = code;
  PROVINCE_NAME_TO_CODE[name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")] = code;
}

// Additional province name variations
const PROVINCE_ALIASES: Record<string, string> = {
  "alava": "01", "araba": "01",
  "vizcaya": "48", "bizkaia": "48",
  "guipuzcoa": "20", "gipuzkoa": "20",
  "la coruna": "15", "a coruna": "15", "coruna": "15",
  "gerona": "17", "girona": "17",
  "lerida": "25", "lleida": "25",
  "orense": "32", "ourense": "32",
  "baleares": "07", "illes balears": "07", "islas baleares": "07",
  "santa cruz de tenerife": "38", "tenerife": "38",
  "las palmas": "35", "gran canaria": "35",
  "la rioja": "26", "rioja": "26",
  "navarra": "31", "nafarroa": "31",
  "asturias": "33", "principado de asturias": "33",
  "cantabria": "39",
  "murcia": "30", "region de murcia": "30",
  "madrid": "28", "comunidad de madrid": "28"
};
Object.assign(PROVINCE_NAME_TO_CODE, PROVINCE_ALIASES);

export function normalizeProvince(province: string): string | null {
  if (!province) return null;
  if (/^\d{2}$/.test(province) && PROVINCES[province]) return province;
  const normalized = province.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return PROVINCE_NAME_TO_CODE[normalized] || null;
}
