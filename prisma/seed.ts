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
  // Optional metadata fields (not stored in DB)
  dataNote?: string;
  totalInjured?: number;
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
  { code: "09", name: "Cataluña", isExcluded: false },
  { code: "10", name: "Comunidad Valenciana", isExcluded: false },
  { code: "11", name: "Extremadura", isExcluded: false },
  { code: "12", name: "Galicia", isExcluded: false },
  { code: "13", name: "Comunidad de Madrid", isExcluded: false },
  { code: "14", name: "Región de Murcia", isExcluded: false },
  { code: "15", name: "Navarra", isExcluded: false },
  { code: "16", name: "País Vasco", isExcluded: false },
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

// Municipality interface for JSON loading
interface MunicipalityData {
  code: string;
  name: string;
  provinceCode: string;
  slug: string;
  population?: number;
  latitude?: number;
  longitude?: number;
}

// Fallback municipalities (province capitals only) if JSON not found
const fallbackMunicipalities = [
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
];

// Load municipalities from JSON file (generated by scripts/generate-municipalities.ts)
function loadMunicipalities(): MunicipalityData[] {
  const jsonPath = path.join(process.cwd(), "data/municipalities.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn("Warning: data/municipalities.json not found. Using fallback data (10 largest cities).");
    console.warn("Run: npx tsx scripts/generate-municipalities.ts");
    return fallbackMunicipalities.map(m => ({
      ...m,
      slug: slugify(m.name),
    }));
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as MunicipalityData[];
  console.log(`   Loaded ${data.length} municipalities from JSON`);
  return data;
}

// Load historical accident data from JSON (generated by scripts/import-dgt-data.ts)
function loadHistoricalAccidents(): HistoricalAccidentData[] {
  const jsonPath = path.join(process.cwd(), "data/historical-accidents.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn("Warning: data/historical-accidents.json not found. Run scripts/import-dgt-data.ts first.");
    return [];
  }
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

// Type for IMD traffic flow data
interface TrafficFlowData {
  roadNumber: string;
  roadType: string;
  kmStart: number;
  kmEnd: number;
  province: string | null;
  provinceName: string | null;
  year: number;
  imd: number;
  imdPesados: number | null;
  percentPesados: number | null;
}

// Type for road catalog data
interface RoadData {
  id: string;
  name: string | null;
  type: "AUTOPISTA" | "AUTOVIA" | "NACIONAL" | "COMARCAL" | "PROVINCIAL" | "URBANA" | "OTHER";
  kmStart: number | null;
  kmEnd: number | null;
  totalKm: number | null;
  provinces: string[];
}

// Load IMD traffic flow data from JSON (generated by scripts/import-imd-data.ts)
function loadTrafficFlowData(): TrafficFlowData[] {
  const jsonPath = path.join(process.cwd(), "data/imd/traffic-flow.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn("Warning: data/imd/traffic-flow.json not found. Run scripts/import-imd-data.ts first.");
    return [];
  }
  return JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
}

// Load road catalog from JSON (generated by scripts/import-roads.ts)
function loadRoadCatalog(): RoadData[] {
  const jsonPath = path.join(process.cwd(), "data/roads-catalog.json");
  if (!fs.existsSync(jsonPath)) {
    console.warn("Warning: data/roads-catalog.json not found. Run: npm run import:roads:json");
    return [];
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8")) as RoadData[];
  console.log(`   Loaded ${data.length} roads from JSON`);
  return data;
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

  // Seed municipalities (from JSON file or fallback)
  console.log("Seeding municipalities...");
  const municipalities = loadMunicipalities();

  // Use batch upsert for better performance with large datasets
  const batchSize = 100;
  for (let i = 0; i < municipalities.length; i += batchSize) {
    const batch = municipalities.slice(i, i + batchSize);
    await Promise.all(
      batch.map((municipality) =>
        prisma.municipality.upsert({
          where: { code: municipality.code },
          update: {
            name: municipality.name,
            slug: municipality.slug || slugify(municipality.name),
            provinceCode: municipality.provinceCode,
            population: municipality.population,
            latitude: municipality.latitude,
            longitude: municipality.longitude,
          },
          create: {
            code: municipality.code,
            name: municipality.name,
            slug: municipality.slug || slugify(municipality.name),
            provinceCode: municipality.provinceCode,
            population: municipality.population,
            latitude: municipality.latitude,
            longitude: municipality.longitude,
          },
        })
      )
    );
    // Progress indicator for large datasets
    if (municipalities.length > 500 && (i + batchSize) % 500 === 0) {
      console.log(`   ... ${Math.min(i + batchSize, municipalities.length)}/${municipalities.length} processed`);
    }
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

  // Seed IMD traffic flow data (from scripts/import-imd-data.ts)
  const trafficFlowData = loadTrafficFlowData();
  if (trafficFlowData.length > 0) {
    console.log("Seeding IMD traffic flow data...");

    // Delete existing records to avoid duplicates
    await prisma.trafficFlow.deleteMany({});

    // Insert all records in batches
    const batchSize = 100;
    for (let i = 0; i < trafficFlowData.length; i += batchSize) {
      const batch = trafficFlowData.slice(i, i + batchSize);
      await prisma.trafficFlow.createMany({
        data: batch.map(record => ({
          roadNumber: record.roadNumber,
          roadType: record.roadType as "AUTOPISTA" | "AUTOVIA" | "NACIONAL" | "COMARCAL" | "PROVINCIAL" | "URBANA" | "OTHER" | null,
          kmStart: record.kmStart,
          kmEnd: record.kmEnd,
          province: record.province,
          provinceName: record.provinceName,
          year: record.year,
          imd: record.imd,
          imdPesados: record.imdPesados,
          percentPesados: record.percentPesados,
        })),
        skipDuplicates: true,
      });

      // Progress indicator
      if (trafficFlowData.length > 200 && (i + batchSize) % 500 === 0) {
        console.log(`   ... ${Math.min(i + batchSize, trafficFlowData.length)}/${trafficFlowData.length} processed`);
      }
    }

    const imdYears = [...new Set(trafficFlowData.map(r => r.year))].sort();
    const roads = [...new Set(trafficFlowData.map(r => r.roadNumber))].length;
    console.log(`   ${trafficFlowData.length} records seeded (years: ${imdYears.join(", ")}, ${roads} roads)\n`);
  } else {
    console.log("Skipping IMD traffic flow (no data file found)\n");
  }

  // Seed road catalog (from scripts/import-roads.ts)
  const roadCatalog = loadRoadCatalog();
  if (roadCatalog.length > 0) {
    console.log("Seeding road catalog...");

    // Delete existing records to avoid duplicates
    await prisma.road.deleteMany({});

    // Insert all records in batches
    const batchSize = 50;
    for (let i = 0; i < roadCatalog.length; i += batchSize) {
      const batch = roadCatalog.slice(i, i + batchSize);
      await prisma.road.createMany({
        data: batch.map(road => ({
          id: road.id,
          name: road.name,
          type: road.type,
          kmStart: road.kmStart,
          kmEnd: road.kmEnd,
          totalKm: road.totalKm,
          provinces: road.provinces,
        })),
        skipDuplicates: true,
      });
    }

    const totalKm = roadCatalog.reduce((sum, r) => sum + (r.totalKm || 0), 0);
    console.log(`   ${roadCatalog.length} roads seeded (${totalKm.toLocaleString()} km total)\n`);
  } else {
    console.log("Skipping road catalog (no data file found)\n");
  }

  console.log("Database seed completed successfully!");

  // Print summary
  const communityCount = await prisma.community.count();
  const provinceCount = await prisma.province.count();
  const municipalityCount = await prisma.municipality.count();
  const accidentCount = await prisma.historicalAccidents.count();
  const trafficFlowCount = await prisma.trafficFlow.count();
  const roadCount = await prisma.road.count();

  console.log("\nSummary:");
  console.log(`   Communities: ${communityCount}`);
  console.log(`   Provinces: ${provinceCount}`);
  console.log(`   Municipalities: ${municipalityCount}`);
  console.log(`   Historical accidents: ${accidentCount}`);
  console.log(`   IMD traffic flow: ${trafficFlowCount}`);
  console.log(`   Roads: ${roadCount}`);

  // Municipality data quality report
  if (municipalityCount > 0) {
    const withPopulation = await prisma.municipality.count({
      where: { population: { not: null } },
    });
    const withCoordinates = await prisma.municipality.count({
      where: {
        AND: [
          { latitude: { not: null } },
          { longitude: { not: null } },
        ],
      },
    });
    const withArea = await prisma.municipality.count({
      where: { area: { not: null } },
    });

    const popPct = ((withPopulation / municipalityCount) * 100).toFixed(1);
    const coordPct = ((withCoordinates / municipalityCount) * 100).toFixed(1);
    const areaPct = ((withArea / municipalityCount) * 100).toFixed(1);

    console.log("\n   Municipality data quality:");
    console.log(`     With population: ${withPopulation}/${municipalityCount} (${popPct}%)`);
    console.log(`     With coordinates: ${withCoordinates}/${municipalityCount} (${coordPct}%)`);
    console.log(`     With area: ${withArea}/${municipalityCount} (${areaPct}%)`);

    if (withPopulation < municipalityCount || withCoordinates < municipalityCount) {
      console.log(
        "     Tip: run 'npx tsx scripts/enrich-municipalities.ts' to fill missing data"
      );
    }
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
