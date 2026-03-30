/**
 * Fuel Price Daily Stats Aggregator
 *
 * Calculates daily aggregate statistics for fuel prices
 * by different scopes: national, province, community, road
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Provincias con fiscalidad especial (excluir de "national")
// 35 = Las Palmas (IGIC 7%), 38 = Santa Cruz de Tenerife (IGIC 7%)
// 51 = Ceuta (IPSI 0.5%), 52 = Melilla (IPSI 0.5%)
const TAX_FREE_PROVINCES = ["35", "38", "51", "52"];

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();
  const now = new Date();
  // Use UTC date to ensure consistency across timezones
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  console.log(`[aggregator] Starting at ${now.toISOString()}`);

  try {
    // 1. National statistics (Península + Baleares only, excludes tax-free zones)
    console.log("[aggregator] Calculating national statistics (excluding tax-free zones)...");

    const nationalStats = await prisma.gasStation.aggregate({
      where: {
        province: { notIn: TAX_FREE_PROVINCES },
        OR: [{ saleType: "P" }, { saleType: null }],
      },
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _min: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _max: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _count: true,
    });

    await prisma.fuelPriceDailyStats.upsert({
      where: {
        date_scope: {
          date: today,
          scope: "national",
        },
      },
      create: {
        date: today,
        scope: "national",
        avgGasoleoA: nationalStats._avg.priceGasoleoA,
        minGasoleoA: nationalStats._min.priceGasoleoA,
        maxGasoleoA: nationalStats._max.priceGasoleoA,
        avgGasolina95: nationalStats._avg.priceGasolina95E5,
        minGasolina95: nationalStats._min.priceGasolina95E5,
        maxGasolina95: nationalStats._max.priceGasolina95E5,
        avgGasolina98: nationalStats._avg.priceGasolina98E5,
        minGasolina98: nationalStats._min.priceGasolina98E5,
        maxGasolina98: nationalStats._max.priceGasolina98E5,
        stationCount: nationalStats._count,
      },
      update: {
        avgGasoleoA: nationalStats._avg.priceGasoleoA,
        minGasoleoA: nationalStats._min.priceGasoleoA,
        maxGasoleoA: nationalStats._max.priceGasoleoA,
        avgGasolina95: nationalStats._avg.priceGasolina95E5,
        minGasolina95: nationalStats._min.priceGasolina95E5,
        maxGasolina95: nationalStats._max.priceGasolina95E5,
        avgGasolina98: nationalStats._avg.priceGasolina98E5,
        minGasolina98: nationalStats._min.priceGasolina98E5,
        maxGasolina98: nationalStats._max.priceGasolina98E5,
        stationCount: nationalStats._count,
      },
    });

    console.log(`[aggregator] National (Península + Baleares): ${nationalStats._count} stations`);

    // 1b. Tax-free territories statistics (Ceuta, Melilla, Canarias)
    console.log("[aggregator] Calculating tax-free territories statistics...");

    const taxFreeStats = await prisma.gasStation.aggregate({
      where: {
        province: { in: TAX_FREE_PROVINCES },
        OR: [{ saleType: "P" }, { saleType: null }],
      },
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _min: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _max: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _count: true,
    });

    await prisma.fuelPriceDailyStats.upsert({
      where: {
        date_scope: {
          date: today,
          scope: "tax-free",
        },
      },
      create: {
        date: today,
        scope: "tax-free",
        avgGasoleoA: taxFreeStats._avg.priceGasoleoA,
        minGasoleoA: taxFreeStats._min.priceGasoleoA,
        maxGasoleoA: taxFreeStats._max.priceGasoleoA,
        avgGasolina95: taxFreeStats._avg.priceGasolina95E5,
        minGasolina95: taxFreeStats._min.priceGasolina95E5,
        maxGasolina95: taxFreeStats._max.priceGasolina95E5,
        avgGasolina98: taxFreeStats._avg.priceGasolina98E5,
        minGasolina98: taxFreeStats._min.priceGasolina98E5,
        maxGasolina98: taxFreeStats._max.priceGasolina98E5,
        stationCount: taxFreeStats._count,
      },
      update: {
        avgGasoleoA: taxFreeStats._avg.priceGasoleoA,
        minGasoleoA: taxFreeStats._min.priceGasoleoA,
        maxGasoleoA: taxFreeStats._max.priceGasoleoA,
        avgGasolina95: taxFreeStats._avg.priceGasolina95E5,
        minGasolina95: taxFreeStats._min.priceGasolina95E5,
        maxGasolina95: taxFreeStats._max.priceGasolina95E5,
        avgGasolina98: taxFreeStats._avg.priceGasolina98E5,
        minGasolina98: taxFreeStats._min.priceGasolina98E5,
        maxGasolina98: taxFreeStats._max.priceGasolina98E5,
        stationCount: taxFreeStats._count,
      },
    });

    console.log(`[aggregator] Tax-free territories: ${taxFreeStats._count} stations`);

    // 2. Province statistics
    console.log("[aggregator] Calculating province statistics...");

    const provinceStats = await prisma.gasStation.groupBy({
      by: ["province"],
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _min: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _max: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _count: true,
      where: {
        province: { not: null },
        OR: [{ saleType: "P" }, { saleType: null }],
      },
    });

    for (const stat of provinceStats) {
      if (!stat.province) continue;

      await prisma.fuelPriceDailyStats.upsert({
        where: {
          date_scope: {
            date: today,
            scope: `province:${stat.province}`,
          },
        },
        create: {
          date: today,
          scope: `province:${stat.province}`,
          avgGasoleoA: stat._avg.priceGasoleoA,
          minGasoleoA: stat._min.priceGasoleoA,
          maxGasoleoA: stat._max.priceGasoleoA,
          avgGasolina95: stat._avg.priceGasolina95E5,
          minGasolina95: stat._min.priceGasolina95E5,
          maxGasolina95: stat._max.priceGasolina95E5,
          avgGasolina98: stat._avg.priceGasolina98E5,
          minGasolina98: stat._min.priceGasolina98E5,
          maxGasolina98: stat._max.priceGasolina98E5,
          stationCount: stat._count,
        },
        update: {
          avgGasoleoA: stat._avg.priceGasoleoA,
          minGasoleoA: stat._min.priceGasoleoA,
          maxGasoleoA: stat._max.priceGasoleoA,
          avgGasolina95: stat._avg.priceGasolina95E5,
          minGasolina95: stat._min.priceGasolina95E5,
          maxGasolina95: stat._max.priceGasolina95E5,
          avgGasolina98: stat._avg.priceGasolina98E5,
          minGasolina98: stat._min.priceGasolina98E5,
          maxGasolina98: stat._max.priceGasolina98E5,
          stationCount: stat._count,
        },
      });
    }

    console.log(`[aggregator] Processed ${provinceStats.length} provinces`);

    // 3. Community statistics
    console.log("[aggregator] Calculating community statistics...");

    const communityStats = await prisma.gasStation.groupBy({
      by: ["communityCode"],
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _min: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _max: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _count: true,
      where: {
        communityCode: { not: null },
        OR: [{ saleType: "P" }, { saleType: null }],
      },
    });

    for (const stat of communityStats) {
      if (!stat.communityCode) continue;

      await prisma.fuelPriceDailyStats.upsert({
        where: {
          date_scope: {
            date: today,
            scope: `community:${stat.communityCode}`,
          },
        },
        create: {
          date: today,
          scope: `community:${stat.communityCode}`,
          avgGasoleoA: stat._avg.priceGasoleoA,
          minGasoleoA: stat._min.priceGasoleoA,
          maxGasoleoA: stat._max.priceGasoleoA,
          avgGasolina95: stat._avg.priceGasolina95E5,
          minGasolina95: stat._min.priceGasolina95E5,
          maxGasolina95: stat._max.priceGasolina95E5,
          avgGasolina98: stat._avg.priceGasolina98E5,
          minGasolina98: stat._min.priceGasolina98E5,
          maxGasolina98: stat._max.priceGasolina98E5,
          stationCount: stat._count,
        },
        update: {
          avgGasoleoA: stat._avg.priceGasoleoA,
          minGasoleoA: stat._min.priceGasoleoA,
          maxGasoleoA: stat._max.priceGasoleoA,
          avgGasolina95: stat._avg.priceGasolina95E5,
          minGasolina95: stat._min.priceGasolina95E5,
          maxGasolina95: stat._max.priceGasolina95E5,
          avgGasolina98: stat._avg.priceGasolina98E5,
          minGasolina98: stat._min.priceGasolina98E5,
          maxGasolina98: stat._max.priceGasolina98E5,
          stationCount: stat._count,
        },
      });
    }

    console.log(`[aggregator] Processed ${communityStats.length} communities`);

    // 4. Road statistics (top roads only)
    console.log("[aggregator] Calculating road statistics...");

    const roadStats = await prisma.gasStation.groupBy({
      by: ["nearestRoad"],
      _avg: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _min: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _max: {
        priceGasoleoA: true,
        priceGasolina95E5: true,
        priceGasolina98E5: true,
      },
      _count: true,
      where: {
        nearestRoad: { not: null },
        OR: [{ saleType: "P" }, { saleType: null }],
      },
      having: {
        nearestRoad: {
          _count: {
            gt: 5, // Only roads with > 5 stations
          },
        },
      },
    });

    for (const stat of roadStats) {
      if (!stat.nearestRoad) continue;

      await prisma.fuelPriceDailyStats.upsert({
        where: {
          date_scope: {
            date: today,
            scope: `road:${stat.nearestRoad}`,
          },
        },
        create: {
          date: today,
          scope: `road:${stat.nearestRoad}`,
          avgGasoleoA: stat._avg.priceGasoleoA,
          minGasoleoA: stat._min.priceGasoleoA,
          maxGasoleoA: stat._max.priceGasoleoA,
          avgGasolina95: stat._avg.priceGasolina95E5,
          minGasolina95: stat._min.priceGasolina95E5,
          maxGasolina95: stat._max.priceGasolina95E5,
          avgGasolina98: stat._avg.priceGasolina98E5,
          minGasolina98: stat._min.priceGasolina98E5,
          maxGasolina98: stat._max.priceGasolina98E5,
          stationCount: stat._count,
        },
        update: {
          avgGasoleoA: stat._avg.priceGasoleoA,
          minGasoleoA: stat._min.priceGasoleoA,
          maxGasoleoA: stat._max.priceGasoleoA,
          avgGasolina95: stat._avg.priceGasolina95E5,
          minGasolina95: stat._min.priceGasolina95E5,
          maxGasolina95: stat._max.priceGasolina95E5,
          avgGasolina98: stat._avg.priceGasolina98E5,
          minGasolina98: stat._min.priceGasolina98E5,
          maxGasolina98: stat._max.priceGasolina98E5,
          stationCount: stat._count,
        },
      });
    }

    console.log(`[aggregator] Processed ${roadStats.length} roads`);

    // Summary
    const totalStats = await prisma.fuelPriceDailyStats.count({
      where: { date: today },
    });

    console.log(`[aggregator] Total stats records for today: ${totalStats}`);
    console.log("[aggregator] Aggregation completed successfully");
  } catch (error) {
    console.error("[aggregator] Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
