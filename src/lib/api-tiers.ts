/**
 * API Tier Definitions
 *
 * Rate limits and feature access for each tier.
 */

export type ApiTierName = "FREE" | "PRO" | "ENTERPRISE";

export interface TierConfig {
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  features: string[];
  priceMonthlyEur?: number;
  stripePriceId?: string;
}

export const API_TIERS: Record<ApiTierName, TierConfig> = {
  FREE: {
    rateLimitPerMinute: 10,
    rateLimitPerDay: 1000,
    features: [
      "active_incidents",
      "current_fuel_prices",
      "weather_alerts",
      "railway_alerts",
      "search",
    ],
  },
  PRO: {
    rateLimitPerMinute: 60,
    rateLimitPerDay: 50_000,
    features: [
      "active_incidents",
      "current_fuel_prices",
      "weather_alerts",
      "railway_alerts",
      "search",
      "historical_data",
      "trend_analysis",
      "mobility_od",
      "accident_microdata",
      "climate_data",
      "fleet_tracking",
    ],
    priceMonthlyEur: 29,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
  },
  ENTERPRISE: {
    rateLimitPerMinute: 300,
    rateLimitPerDay: 500_000,
    features: [
      "all",
      "bulk_export",
      "webhooks",
      "priority_support",
    ],
    priceMonthlyEur: 149,
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
};

export function tierHasFeature(tier: ApiTierName, feature: string): boolean {
  const config = API_TIERS[tier];
  return config.features.includes("all") || config.features.includes(feature);
}

export function getTierRateLimits(tier: ApiTierName) {
  const config = API_TIERS[tier];
  return { perMinute: config.rateLimitPerMinute, perDay: config.rateLimitPerDay };
}
