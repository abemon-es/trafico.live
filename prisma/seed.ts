import "dotenv/config";
import prisma from "../src/lib/db";
import * as fs from "fs";
import * as path from "path";

// Type for historical accidents from JSON
interface HistoricalAccidentData {
  year: number;
  province: string;
  provinceName: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
  nonHospitalized: number;
}

/**
 * Convert a string to a URL-friendly slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Spanish Autonomous Communities (INE codes)
const communities = [
  { code: "01", name: "Andalucía", isExcluded: false },
  { code: "02", name: "Aragón", isExcluded: false },
  { code: "03", name: "Principado de Asturias", isExcluded: false },
  { code: "04", name: "Islas Baleares", isExcluded: false },
  { code: "05", name: "Canarias", isExcluded: false },
  { code: "06", name: "Cantabria", isExcluded: false },
  { code: "07", name: "Castilla y León", isExcluded: false },
  { code: "08", name: "Castilla-La Mancha", isExcluded: false },
  { code: "09", name: "Cataluña", isExcluded: true, excludedReason: "Servei Català de Trànsit (SCT) - sistema propio" },
  { code: "10", name: "Comunidad Valenciana", isExcluded: false },
  { code: "11", name: "Extremadura", isExcluded: false },
  { code: "12", name: "Galicia", isExcluded: false },
  { code: "13", name: "Comunidad de Madrid", isExcluded: false },
  { code: "14", name: "Región de Murcia", isExcluded: false },
  { code: "15", name: "Navarra", isExcluded: false },
  { code: "16", name: "País Vasco", isExcluded: true, excludedReason: "Tráfico del Gobierno Vasco - sistema propio" },
  { code: "17", name: "La Rioja", isExcluded: false },
  { code: "18", name: "Ceuta", isExcluded: false },
  { code: "19", name: "Melilla", isExcluded: false },
];

// Spanish Provinces (INE codes) with population and area
const provinces = [
  { code: "01", name: "Álava", communityCode: "16", population: 333940, area: 3037.26 },
  { code: "02", name: "Albacete", communityCode: "08", population: 388270, area: 14926.40 },
  { code: "03", name: "Alicante", communityCode: "10", population: 1881762, area: 5816.50 },
  { code: "04", name: "Almería", communityCode: "01", population: 727945, area: 8774.43 },
  { code: "05", name: "Ávila", communityCode: "07", population: 157664, area: 8050.15 },
  { code: "06", name: "Badajoz", communityCode: "11", population: 672137, area: 21766.28 },
  { code: "07", name: "Baleares", communityCode: "04", population: 1173008, area: 4992.00 },
  { code: "08", name: "Barcelona", communityCode: "09", population: 5714730, area: 7726.40 },
  { code: "09", name: "Burgos", communityCode: "07", population: 357070, area: 14022.16 },
  { code: "10", name: "Cáceres", communityCode: "11", population: 391850, area: 19868.02 },
  { code: "11", name: "Cádiz", communityCode: "01", population: 1244049, area: 7436.00 },
  { code: "12", name: "Castellón", communityCode: "10", population: 579245, area: 6631.85 },
  { code: "13", name: "Ciudad Real", communityCode: "08", population: 495045, area: 19813.23 },
  { code: "14", name: "Córdoba", communityCode: "01", population: 781451, area: 13771.31 },
  { code: "15", name: "A Coruña", communityCode: "12", population: 1121815, area: 7950.38 },
  { code: "16", name: "Cuenca", communityCode: "08", population: 196139, area: 17140.15 },
  { code: "17", name: "Girona", communityCode: "09", population: 781788, area: 5909.88 },
  { code: "18", name: "Granada", communityCode: "01", population: 919168, area: 12646.99 },
  { code: "19", name: "Guadalajara", communityCode: "08", population: 261995, area: 12212.11 },
  { code: "20", name: "Gipuzkoa", communityCode: "16", population: 727121, area: 1980.35 },
  { code: "21", name: "Huelva", communityCode: "01", population: 524278, area: 10128.47 },
  { code: "22", name: "Huesca", communityCode: "02", population: 222687, area: 15636.00 },
  { code: "23", name: "Jaén", communityCode: "01", population: 631381, area: 13489.10 },
  { code: "24", name: "León", communityCode: "07", population: 456439, area: 15580.76 },
  { code: "25", name: "Lleida", communityCode: "09", population: 440915, area: 12150.00 },
  { code: "26", name: "La Rioja", communityCode: "17", population: 319914, area: 5045.25 },
  { code: "27", name: "Lugo", communityCode: "12", population: 327946, area: 9856.42 },
  { code: "28", name: "Madrid", communityCode: "13", population: 6751251, area: 8027.69 },
  { code: "29", name: "Málaga", communityCode: "01", population: 1685920, area: 7308.46 },
  { code: "30", name: "Murcia", communityCode: "14", population: 1518486, area: 11313.91 },
  { code: "31", name: "Navarra", communityCode: "15", population: 661197, area: 10390.36 },
  { code: "32", name: "Ourense", communityCode: "12", population: 306650, area: 7273.32 },
  { code: "33", name: "Asturias", communityCode: "03", population: 1011792, area: 10602.46 },
  { code: "34", name: "Palencia", communityCode: "07", population: 160321, area: 8052.49 },
  { code: "35", name: "Las Palmas", communityCode: "05", population: 1131065, area: 4065.78 },
  { code: "36", name: "Pontevedra", communityCode: "12", population: 945408, area: 4495.10 },
  { code: "37", name: "Salamanca", communityCode: "07", population: 329245, area: 12349.95 },
  { code: "38", name: "Santa Cruz de Tenerife", communityCode: "05", population: 1044887, area: 3381.00 },
  { code: "39", name: "Cantabria", communityCode: "06", population: 584507, area: 5321.00 },
  { code: "40", name: "Segovia", communityCode: "07", population: 153478, area: 6920.65 },
  { code: "41", name: "Sevilla", communityCode: "01", population: 1950219, area: 14036.09 },
  { code: "42", name: "Soria", communityCode: "07", population: 88884, area: 10306.42 },
  { code: "43", name: "Tarragona", communityCode: "09", population: 816772, area: 6302.79 },
  { code: "44", name: "Teruel", communityCode: "02", population: 134176, area: 14809.57 },
  { code: "45", name: "Toledo", communityCode: "08", population: 703772, area: 15369.73 },
  { code: "46", name: "Valencia", communityCode: "10", population: 2591875, area: 10763.00 },
  { code: "47", name: "Valladolid", communityCode: "07", population: 520649, area: 8110.49 },
  { code: "48", name: "Bizkaia", communityCode: "16", population: 1159443, area: 2217.00 },
  { code: "49", name: "Zamora", communityCode: "07", population: 170588, area: 10561.26 },
  { code: "50", name: "Zaragoza", communityCode: "02", population: 972528, area: 17274.30 },
  { code: "51", name: "Ceuta", communityCode: "18", population: 83517, area: 18.50 },
  { code: "52", name: "Melilla", communityCode: "19", population: 87076, area: 13.41 },
];

// Top Spanish Municipalities by population (INE 5-digit codes)
const municipalities = [
  { code: "28079", name: "Madrid", provinceCode: "28", population: 3332035, latitude: 40.4168, longitude: -3.7038 },
  { code: "08019", name: "Barcelona", provinceCode: "08", population: 1620343, latitude: 41.3851, longitude: 2.1734 },
  { code: "46250", name: "Valencia", provinceCode: "46", population: 791413, latitude: 39.4699, longitude: -0.3763 },
  { code: "41091", name: "Sevilla", provinceCode: "41", population: 684234, latitude: 37.3891, longitude: -5.9845 },
  { code: "50297", name: "Zaragoza", provinceCode: "50", population: 674997, latitude: 41.6488, longitude: -0.8891 },
  { code: "29067", name: "Málaga", provinceCode: "29", population: 574654, latitude: 36.7213, longitude: -4.4214 },
  { code: "30030", name: "Murcia", provinceCode: "30", population: 453258, latitude: 37.9922, longitude: -1.1307 },
  { code: "07040", name: "Palma de Mallorca", provinceCode: "07", population: 416065, latitude: 39.5696, longitude: 2.6502 },
  { code: "35016", name: "Las Palmas de Gran Canaria", provinceCode: "35", population: 379925, latitude: 28.1235, longitude: -15.4363 },
  { code: "48020", name: "Bilbao", provinceCode: "48", population: 346843, latitude: 43.2630, longitude: -2.9350 },
  { code: "03014", name: "Alicante", provinceCode: "03", population: 337304, latitude: 38.3452, longitude: -0.4810 },
  { code: "14021", name: "Córdoba", provinceCode: "14", population: 322767, latitude: 37.8882, longitude: -4.7794 },
  { code: "47186", name: "Valladolid", provinceCode: "47", population: 299265, latitude: 41.6523, longitude: -4.7245 },
  { code: "36057", name: "Vigo", provinceCode: "36", population: 295364, latitude: 42.2406, longitude: -8.7207 },
  { code: "33024", name: "Gijón", provinceCode: "33", population: 271780, latitude: 43.5322, longitude: -5.6611 },
  { code: "28123", name: "Móstoles", provinceCode: "28", population: 207095, latitude: 40.3224, longitude: -3.8649 },
  { code: "28074", name: "Leganés", provinceCode: "28", population: 189861, latitude: 40.3281, longitude: -3.7641 },
  { code: "38038", name: "Santa Cruz de Tenerife", provinceCode: "38", population: 207312, latitude: 28.4636, longitude: -16.2518 },
  { code: "33044", name: "Oviedo", provinceCode: "33", population: 220020, latitude: 43.3619, longitude: -5.8494 },
  { code: "11012", name: "Cádiz", provinceCode: "11", population: 116979, latitude: 36.5271, longitude: -6.2886 },
  { code: "39075", name: "Santander", provinceCode: "39", population: 172539, latitude: 43.4623, longitude: -3.8099 },
  { code: "20069", name: "San Sebastián", provinceCode: "20", population: 187415, latitude: 43.3183, longitude: -1.9812 },
  { code: "01059", name: "Vitoria-Gasteiz", provinceCode: "01", population: 253672, latitude: 42.8467, longitude: -2.6716 },
  { code: "18087", name: "Granada", provinceCode: "18", population: 232770, latitude: 37.1773, longitude: -3.5986 },
  { code: "03063", name: "Elche", provinceCode: "03", population: 234765, latitude: 38.2699, longitude: -0.6988 },
  { code: "33037", name: "Langreo", provinceCode: "33", population: 39200, latitude: 43.3000, longitude: -5.6833 },
  { code: "04013", name: "Almería", provinceCode: "04", population: 200753, latitude: 36.8340, longitude: -2.4637 },
  { code: "27028", name: "Lugo", provinceCode: "27", population: 98025, latitude: 43.0097, longitude: -7.5567 },
  { code: "15030", name: "A Coruña", provinceCode: "15", population: 245711, latitude: 43.3623, longitude: -8.4115 },
  { code: "08101", name: "Hospitalet de Llobregat", provinceCode: "08", population: 264923, latitude: 41.3597, longitude: 2.1008 },
  { code: "28065", name: "Getafe", provinceCode: "28", population: 183949, latitude: 40.3058, longitude: -3.7328 },
  { code: "28006", name: "Alcalá de Henares", provinceCode: "28", population: 195671, latitude: 40.4818, longitude: -3.3636 },
  { code: "28022", name: "Alcorcón", provinceCode: "28", population: 170514, latitude: 40.3489, longitude: -3.8245 },
  { code: "08015", name: "Badalona", provinceCode: "08", population: 223166, latitude: 41.4500, longitude: 2.2474 },
  { code: "03065", name: "Elda", provinceCode: "03", population: 52558, latitude: 38.4779, longitude: -0.7928 },
  { code: "46131", name: "Gandía", provinceCode: "46", population: 74562, latitude: 38.9681, longitude: -0.1800 },
  { code: "21041", name: "Huelva", provinceCode: "21", population: 143663, latitude: 37.2614, longitude: -6.9447 },
  { code: "23050", name: "Jaén", provinceCode: "23", population: 113457, latitude: 37.7796, longitude: -3.7849 },
  { code: "06015", name: "Badajoz", provinceCode: "06", population: 150530, latitude: 38.8794, longitude: -6.9706 },
  { code: "37274", name: "Salamanca", provinceCode: "37", population: 144436, latitude: 40.9701, longitude: -5.6635 },
  { code: "24089", name: "León", provinceCode: "24", population: 124772, latitude: 42.5987, longitude: -5.5671 },
  { code: "26089", name: "Logroño", provinceCode: "26", population: 151113, latitude: 42.4627, longitude: -2.4449 },
  { code: "31201", name: "Pamplona", provinceCode: "31", population: 203418, latitude: 42.8125, longitude: -1.6458 },
  { code: "09059", name: "Burgos", provinceCode: "09", population: 176418, latitude: 42.3439, longitude: -3.6969 },
  { code: "12040", name: "Castellón de la Plana", provinceCode: "12", population: 174264, latitude: 39.9864, longitude: -0.0513 },
  { code: "45168", name: "Toledo", provinceCode: "45", population: 85643, latitude: 39.8628, longitude: -4.0273 },
  { code: "10037", name: "Cáceres", provinceCode: "10", population: 96068, latitude: 39.4753, longitude: -6.3724 },
  { code: "19130", name: "Guadalajara", provinceCode: "19", population: 87000, latitude: 40.6337, longitude: -3.1668 },
  { code: "25120", name: "Lleida", provinceCode: "25", population: 140403, latitude: 41.6176, longitude: 0.6200 },
  { code: "17079", name: "Girona", provinceCode: "17", population: 103369, latitude: 41.9794, longitude: 2.8214 },
];

// Load historical accident data from JSON (generated by scripts/import-dgt-data.ts)
function loadHistoricalAccidents(): HistoricalAccidentData[] {
  const jsonPath = path.join(process.cwd(), "data/historical-accidents.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn("Warning: data/historical-accidents.json not found. Run scripts/import-dgt-data.ts first.");
    return [];
  }
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

async function main() {
  console.log("Starting database seed...\n");

  // Seed communities
  console.log("Seeding autonomous communities...");
  for (const community of communities) {
    const slug = slugify(community.name);
    await prisma.community.upsert({
      where: { code: community.code },
      update: { ...community, slug },
      create: { ...community, slug },
    });
  }
  console.log(`   ${communities.length} communities seeded\n`);

  // Seed provinces
  console.log("Seeding provinces...");
  for (const province of provinces) {
    const slug = slugify(province.name);
    await prisma.province.upsert({
      where: { code: province.code },
      update: {
        name: province.name,
        slug,
        communityCode: province.communityCode,
        population: province.population,
        area: province.area,
      },
      create: {
        code: province.code,
        name: province.name,
        slug,
        communityCode: province.communityCode,
        population: province.population,
        area: province.area,
      },
    });
  }
  console.log(`   ${provinces.length} provinces seeded\n`);

  // Seed municipalities
  console.log("Seeding municipalities...");
  for (const municipality of municipalities) {
    const slug = slugify(municipality.name);
    await prisma.municipality.upsert({
      where: { code: municipality.code },
      update: {
        name: municipality.name,
        slug,
        provinceCode: municipality.provinceCode,
        population: municipality.population,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
      },
      create: {
        code: municipality.code,
        name: municipality.name,
        slug,
        provinceCode: municipality.provinceCode,
        population: municipality.population,
        latitude: municipality.latitude,
        longitude: municipality.longitude,
      },
    });
  }
  console.log(`   ${municipalities.length} municipalities seeded\n`);

  // Seed historical accidents (from DGT data JSON)
  const historicalAccidents = loadHistoricalAccidents();
  if (historicalAccidents.length > 0) {
    console.log("Seeding historical accident data...");

    // Delete existing records to avoid duplicates
    await prisma.historicalAccidents.deleteMany({});

    // Insert all records in batches
    const batchSize = 50;
    for (let i = 0; i < historicalAccidents.length; i += batchSize) {
      const batch = historicalAccidents.slice(i, i + batchSize);
      await prisma.historicalAccidents.createMany({
        data: batch.map(accident => ({
          year: accident.year,
          province: accident.province,
          provinceName: accident.provinceName,
          accidents: accident.accidents,
          fatalities: accident.fatalities,
          hospitalized: accident.hospitalized,
          nonHospitalized: accident.nonHospitalized,
        })),
      });
    }

    const years = [...new Set(historicalAccidents.map(a => a.year))].sort();
    console.log(`   ${historicalAccidents.length} records seeded (years: ${years.join(", ")})\n`);
  } else {
    console.log("Skipping historical accidents (no data file found)\n");
  }

  console.log("Database seed completed successfully!");

  // Print summary
  const communityCount = await prisma.community.count();
  const provinceCount = await prisma.province.count();
  const municipalityCount = await prisma.municipality.count();
  const accidentCount = await prisma.historicalAccidents.count();

  console.log("\nSummary:");
  console.log(`   Communities: ${communityCount}`);
  console.log(`   Provinces: ${provinceCount}`);
  console.log(`   Municipalities: ${municipalityCount}`);
  console.log(`   Historical records: ${accidentCount}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
