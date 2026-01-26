// Province center coordinates and zoom levels for map focusing
// All coordinates are [longitude, latitude] as required by MapLibre

export const PROVINCE_BOUNDS: Record<string, { center: [number, number]; zoom: number }> = {
  "01": { center: [-2.68, 42.85], zoom: 9 },      // Álava
  "02": { center: [-1.86, 38.99], zoom: 8 },      // Albacete
  "03": { center: [-0.48, 38.35], zoom: 9 },      // Alicante
  "04": { center: [-2.46, 37.00], zoom: 9 },      // Almería
  "05": { center: [-5.00, 40.66], zoom: 8 },      // Ávila
  "06": { center: [-6.35, 38.88], zoom: 8 },      // Badajoz
  "07": { center: [2.92, 39.57], zoom: 9 },       // Baleares
  "08": { center: [2.17, 41.39], zoom: 9 },       // Barcelona
  "09": { center: [-3.70, 42.34], zoom: 8 },      // Burgos
  "10": { center: [-6.37, 39.47], zoom: 8 },      // Cáceres
  "11": { center: [-5.99, 36.53], zoom: 9 },      // Cádiz
  "12": { center: [-0.03, 39.99], zoom: 9 },      // Castellón
  "13": { center: [-3.93, 38.98], zoom: 8 },      // Ciudad Real
  "14": { center: [-4.78, 37.89], zoom: 8 },      // Córdoba
  "15": { center: [-8.40, 43.37], zoom: 9 },      // A Coruña
  "16": { center: [-2.13, 40.07], zoom: 8 },      // Cuenca
  "17": { center: [2.82, 42.00], zoom: 9 },       // Girona
  "18": { center: [-3.60, 37.18], zoom: 9 },      // Granada
  "19": { center: [-2.64, 40.63], zoom: 8 },      // Guadalajara
  "20": { center: [-2.15, 43.18], zoom: 9 },      // Gipuzkoa
  "21": { center: [-6.95, 37.26], zoom: 9 },      // Huelva
  "22": { center: [-0.41, 42.14], zoom: 8 },      // Huesca
  "23": { center: [-3.79, 37.77], zoom: 8 },      // Jaén
  "24": { center: [-5.57, 42.60], zoom: 8 },      // León
  "25": { center: [0.62, 41.62], zoom: 8 },       // Lleida
  "26": { center: [-2.45, 42.29], zoom: 9 },      // La Rioja
  "27": { center: [-7.56, 43.01], zoom: 8 },      // Lugo
  "28": { center: [-3.70, 40.42], zoom: 9 },      // Madrid
  "29": { center: [-4.42, 36.72], zoom: 9 },      // Málaga
  "30": { center: [-1.13, 37.98], zoom: 9 },      // Murcia
  "31": { center: [-1.64, 42.82], zoom: 8 },      // Navarra
  "32": { center: [-7.86, 42.34], zoom: 8 },      // Ourense
  "33": { center: [-5.86, 43.36], zoom: 8 },      // Asturias
  "34": { center: [-4.53, 42.01], zoom: 8 },      // Palencia
  "35": { center: [-15.45, 28.10], zoom: 9 },     // Las Palmas
  "36": { center: [-8.64, 42.43], zoom: 9 },      // Pontevedra
  "37": { center: [-5.66, 40.97], zoom: 8 },      // Salamanca
  "38": { center: [-16.55, 28.47], zoom: 9 },     // Santa Cruz de Tenerife
  "39": { center: [-4.03, 43.20], zoom: 9 },      // Cantabria
  "40": { center: [-4.00, 41.12], zoom: 8 },      // Segovia
  "41": { center: [-5.99, 37.39], zoom: 9 },      // Sevilla
  "42": { center: [-2.47, 41.76], zoom: 8 },      // Soria
  "43": { center: [1.25, 41.12], zoom: 9 },       // Tarragona
  "44": { center: [-1.11, 40.35], zoom: 8 },      // Teruel
  "45": { center: [-4.02, 39.86], zoom: 8 },      // Toledo
  "46": { center: [-0.38, 39.47], zoom: 9 },      // Valencia
  "47": { center: [-4.72, 41.65], zoom: 8 },      // Valladolid
  "48": { center: [-2.92, 43.26], zoom: 9 },      // Bizkaia
  "49": { center: [-5.75, 41.50], zoom: 8 },      // Zamora
  "50": { center: [-0.88, 41.65], zoom: 8 },      // Zaragoza
  "51": { center: [-5.31, 35.89], zoom: 13 },     // Ceuta
  "52": { center: [-2.94, 35.29], zoom: 13 },     // Melilla
};

export const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

export function getProvinceBounds(code: string): { center: [number, number]; zoom: number } {
  const paddedCode = code.padStart(2, "0");
  return PROVINCE_BOUNDS[paddedCode] || { center: [-3.7, 40.4], zoom: 6 };
}

export function getProvinceName(code: string): string {
  const paddedCode = code.padStart(2, "0");
  return PROVINCE_NAMES[paddedCode] || code;
}
