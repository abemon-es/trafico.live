import "dotenv/config";
import prisma from "../src/lib/db";

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

// Sample historical accident data (DGT en Cifras 2023)
// Real data would be imported from DGT PDFs/Excel files
const historicalAccidents2023 = [
  { province: "28", provinceName: "Madrid", accidents: 12453, fatalities: 98, hospitalized: 1234, nonHospitalized: 8765 },
  { province: "08", provinceName: "Barcelona", accidents: 10234, fatalities: 87, hospitalized: 1023, nonHospitalized: 7234 },
  { province: "46", provinceName: "Valencia", accidents: 5432, fatalities: 56, hospitalized: 654, nonHospitalized: 3876 },
  { province: "41", provinceName: "Sevilla", accidents: 4321, fatalities: 48, hospitalized: 543, nonHospitalized: 2987 },
  { province: "29", provinceName: "Málaga", accidents: 3876, fatalities: 42, hospitalized: 465, nonHospitalized: 2654 },
  { province: "03", provinceName: "Alicante", accidents: 3543, fatalities: 38, hospitalized: 432, nonHospitalized: 2543 },
  { province: "30", provinceName: "Murcia", accidents: 2987, fatalities: 35, hospitalized: 367, nonHospitalized: 2134 },
  { province: "48", provinceName: "Bizkaia", accidents: 2654, fatalities: 28, hospitalized: 321, nonHospitalized: 1876 },
  { province: "11", provinceName: "Cádiz", accidents: 2543, fatalities: 32, hospitalized: 298, nonHospitalized: 1765 },
  { province: "35", provinceName: "Las Palmas", accidents: 2321, fatalities: 25, hospitalized: 276, nonHospitalized: 1654 },
];

async function main() {
  console.log("🌱 Starting database seed...\n");

  // Seed communities
  console.log("📍 Seeding autonomous communities...");
  for (const community of communities) {
    await prisma.community.upsert({
      where: { code: community.code },
      update: community,
      create: community,
    });
  }
  console.log(`   ✓ ${communities.length} communities seeded\n`);

  // Seed provinces
  console.log("📍 Seeding provinces...");
  for (const province of provinces) {
    await prisma.province.upsert({
      where: { code: province.code },
      update: {
        name: province.name,
        communityCode: province.communityCode,
        population: province.population,
        area: province.area,
      },
      create: {
        code: province.code,
        name: province.name,
        communityCode: province.communityCode,
        population: province.population,
        area: province.area,
      },
    });
  }
  console.log(`   ✓ ${provinces.length} provinces seeded\n`);

  // Seed historical accidents (2023 sample data)
  console.log("📊 Seeding historical accident data (2023)...");
  for (const accident of historicalAccidents2023) {
    // Use create/update separately since the unique constraint includes nullable roadType
    const existing = await prisma.historicalAccidents.findFirst({
      where: {
        year: 2023,
        province: accident.province,
        roadType: null,
      },
    });

    if (existing) {
      await prisma.historicalAccidents.update({
        where: { id: existing.id },
        data: accident,
      });
    } else {
      await prisma.historicalAccidents.create({
        data: {
          year: 2023,
          ...accident,
        },
      });
    }
  }
  console.log(`   ✓ ${historicalAccidents2023.length} accident records seeded\n`);

  console.log("✅ Database seed completed successfully!");

  // Print summary
  const communityCount = await prisma.community.count();
  const provinceCount = await prisma.province.count();
  const accidentCount = await prisma.historicalAccidents.count();

  console.log("\n📊 Summary:");
  console.log(`   Communities: ${communityCount}`);
  console.log(`   Provinces: ${provinceCount}`);
  console.log(`   Historical records: ${accidentCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
