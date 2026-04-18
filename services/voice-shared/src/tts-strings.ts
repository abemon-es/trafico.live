/**
 * TTS-friendly string helpers for Spanish voice output.
 * Formats numbers, road names, prices and lists for natural speech synthesis.
 */

const ONES = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve"];
const TEENS = ["diez","once","doce","trece","catorce","quince","dieciséis","diecisiete","dieciocho","diecinueve"];
const TENS = ["","","veinte","treinta","cuarenta","cincuenta","sesenta","setenta","ochenta","noventa"];
const HUNDREDS = ["","ciento","doscientos","trescientos","cuatrocientos","quinientos","seiscientos","setecientos","ochocientos","novecientos"];

/** Convert integer 0-999 to Spanish words */
function hundredsToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  if (n < 10) return ONES[n];
  if (n < 20) return TEENS[n - 10];
  if (n < 30) {
    const ones = n % 10;
    return ones === 0 ? "veinte" : `veinti${ONES[ones]}`;
  }
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const tens = Math.floor(rem / 10);
  const ones = rem % 10;
  let result = "";
  if (h > 0) result += HUNDREDS[h];
  if (rem > 0) {
    if (h > 0) result += " ";
    if (rem < 10) result += ONES[rem];
    else if (rem < 20) result += TEENS[rem - 10];
    else result += ones === 0 ? TENS[tens] : `${TENS[tens]} y ${ONES[ones]}`;
  }
  return result;
}

/**
 * Format a decimal number for Spanish TTS.
 * e.g. 1.622 → "uno coma seis dos dos"
 * e.g. 17 → "diecisiete"
 */
export function numberToTts(value: number): string {
  const str = value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  const [intPart, decPart] = str.split(".");
  const intN = parseInt(intPart, 10);
  let result = hundredsToWords(Math.min(intN, 999));
  if (!result) result = "cero";
  if (decPart) {
    const decWords = decPart.split("").map((d) => ONES[parseInt(d, 10)]).join(" ");
    result += ` coma ${decWords}`;
  }
  return result;
}

/**
 * Format a price in euros for TTS.
 * e.g. 1.622 → "uno coma seis dos dos euros el litro"
 */
export function priceTts(euros: number, unit = "euros el litro"): string {
  return `${numberToTts(euros)} ${unit}`;
}

/**
 * Format a road identifier for natural speech.
 * "A-2" → "A dos"
 * "AP-7" → "A P siete"
 * "M-30" → "M treinta"
 * "N-II" → "N dos"   (Roman numerals simplified)
 */
export function roadToTts(road: string): string {
  return road
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^(AP|AG|EX|GI|CA|VIA|R)[-–](\d+)$/i, (_, prefix, num) => {
      return `${prefix.split("").join(" ")} ${numberToTts(parseInt(num, 10))}`;
    })
    .replace(/^([A-Z]{1,2})[-–](\d+)$/i, (_, letter, num) => {
      return `${letter.split("").join(" ")} ${numberToTts(parseInt(num, 10))}`;
    })
    .replace(/^([A-Z]+)[-–]([IVX]+)$/i, (_, letter, roman) => {
      const romanMap: Record<string, number> = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7, VIII:8, IX:9, X:10 };
      const n = romanMap[roman.toUpperCase()];
      return n ? `${letter} ${numberToTts(n)}` : `${letter} ${roman}`;
    });
}

/**
 * Format minutes for TTS.
 * 1 → "un minuto", 5 → "cinco minutos"
 */
export function minutesToTts(minutes: number): string {
  if (minutes === 1) return "un minuto";
  return `${numberToTts(minutes)} minutos`;
}

/**
 * Truncate a list to max N items for speech, appending "y N más" if needed.
 * e.g. ["a","b","c","d"], 2 → "a, b y 2 más"
 */
export function truncateListForSpeech(items: string[], maxItems = 2): string {
  if (items.length === 0) return "";
  if (items.length <= maxItems) {
    if (items.length === 1) return items[0];
    const last = items[items.length - 1];
    const rest = items.slice(0, -1);
    return `${rest.join(", ")} y ${last}`;
  }
  const shown = items.slice(0, maxItems);
  const remaining = items.length - maxItems;
  return `${shown.join(", ")} y ${numberToTts(remaining)} más`;
}

/**
 * Format a station name for TTS (capitalize properly, expand abbreviations).
 */
export function stationToTts(name: string): string {
  return name
    .replace(/\bAv\b/gi, "Avenida")
    .replace(/\bSta\b/gi, "Santa")
    .replace(/\bSto\b/gi, "Santo")
    .replace(/\bC\./gi, "Calle")
    .trim();
}

/** Format a time string "HH:MM" for TTS. "08:03" → "las ocho y tres" */
export function timeTts(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const hour = h === 1 ? "la una" : `las ${numberToTts(h)}`;
  if (m === 0) return hour;
  if (m === 30) return `${hour} y media`;
  if (m === 15) return `${hour} y cuarto`;
  if (m === 45) return `${hour} menos cuarto`;
  return `${hour} y ${numberToTts(m)}`;
}

/** Generic "no data" fallback message */
export const NO_DATA_MESSAGE =
  "No he podido consultar los datos ahora. Inténtalo en un momento.";

/** Generic error message */
export const ERROR_MESSAGE =
  "Lo siento, no he podido obtener los datos ahora mismo. Inténtalo en un momento.";
