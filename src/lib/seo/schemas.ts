/**
 * Schema.org JSON-LD generators — single source of truth for 2.8 SEO infra.
 *
 * Entity-level helpers consumed by hub pages (2.2), entity pages (2.5, 2.6),
 * polish pages (2.7), and the dedicated SEO helpers under `src/lib/seo/`.
 * For foundational schemas (Organization, WebSite, Road, FAQ, Breadcrumb, …)
 * see `src/components/seo/StructuredData.tsx`, which is re-exported from
 * `src/lib/seo/index.ts`.
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export interface BaseSchema {
  "@context": string;
  "@type": string | string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Place — generic GeoCoordinates-aware entity (cities, regions, landmarks)
// ---------------------------------------------------------------------------

export interface PlaceSchemaInput {
  name: string;
  url: string;
  description?: string;
  lat?: number | null;
  lon?: number | null;
  addressRegion?: string;
  addressCountry?: string;
  areaServed?: string;
}

export function placeSchema(input: PlaceSchemaInput): BaseSchema {
  const schema: BaseSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: input.name,
    url: input.url,
  };
  if (input.description) schema.description = input.description;
  if (input.lat != null && input.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.lat,
      longitude: input.lon,
    };
  }
  if (input.addressRegion || input.addressCountry) {
    schema.address = {
      "@type": "PostalAddress",
      addressCountry: input.addressCountry || "ES",
      ...(input.addressRegion && { addressRegion: input.addressRegion }),
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Article — blog posts, auto-generated reports, analysis pieces
// ---------------------------------------------------------------------------

export interface ArticleSchemaInput {
  headline: string;
  url: string;
  datePublished: Date | string;
  dateModified?: Date | string;
  description?: string;
  author?: string;
  image?: string;
  section?: string;
  keywords?: string[];
}

export function articleSchema(input: ArticleSchemaInput): BaseSchema {
  const published = input.datePublished instanceof Date
    ? input.datePublished.toISOString()
    : input.datePublished;
  const modified = input.dateModified instanceof Date
    ? input.dateModified.toISOString()
    : input.dateModified;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    url: input.url,
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    datePublished: published,
    dateModified: modified || published,
    ...(input.description && { description: input.description }),
    ...(input.image && { image: input.image }),
    ...(input.section && { articleSection: input.section }),
    ...(input.keywords?.length && { keywords: input.keywords.join(", ") }),
    author: {
      "@type": "Organization",
      name: input.author || "trafico.live",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Airport — aeropuertos/[iata] pages
// ---------------------------------------------------------------------------

export interface AirportSchemaInput {
  name: string;
  iata: string;
  icao?: string | null;
  url: string;
  city?: string;
  lat?: number | null;
  lon?: number | null;
  elevation?: number | null;
  runwayCount?: number;
}

export function airportSchema(input: AirportSchemaInput): BaseSchema {
  const schema: BaseSchema = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: input.name,
    iataCode: input.iata,
    url: input.url,
  };
  if (input.icao) schema.icaoCode = input.icao;
  if (input.lat != null && input.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.lat,
      longitude: input.lon,
      ...(input.elevation != null && { elevation: input.elevation }),
    };
  }
  if (input.city) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: input.city,
      addressCountry: "ES",
    };
  }
  if (input.runwayCount != null) {
    schema.amenityFeature = {
      "@type": "LocationFeatureSpecification",
      name: "runways",
      value: input.runwayCount,
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Port — maritimo/puertos/[slug]
// ---------------------------------------------------------------------------

export interface PortSchemaInput {
  name: string;
  slug: string;
  url: string;
  lat?: number | null;
  lon?: number | null;
  authority?: string | null;
  portType?: "commercial" | "fishing" | "passenger" | "marina";
  region?: string;
}

export function portSchema(input: PortSchemaInput): BaseSchema {
  const schema: BaseSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    additionalType: "https://schema.org/Port",
    name: input.name,
    identifier: input.slug,
    url: input.url,
  };
  if (input.lat != null && input.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.lat,
      longitude: input.lon,
    };
  }
  if (input.authority) {
    schema.provider = {
      "@type": "Organization",
      name: input.authority,
    };
  }
  if (input.region) {
    schema.address = {
      "@type": "PostalAddress",
      addressRegion: input.region,
      addressCountry: "ES",
    };
  }
  if (input.portType) {
    schema.amenityFeature = {
      "@type": "LocationFeatureSpecification",
      name: "portType",
      value: input.portType,
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// GasStation — individual station pages under /gasolineras/terrestres/[id]
// ---------------------------------------------------------------------------

export interface GasStationSchemaInput {
  id: string;
  name: string;
  url: string;
  brand?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  province?: string | null;
  lat?: number | null;
  lon?: number | null;
  phone?: string | null;
  openingHours?: string | null;
  prices?: Array<{ fuelType: string; price: number; currency?: string }>;
}

export function gasStationSchema(input: GasStationSchemaInput): BaseSchema {
  const schema: BaseSchema = {
    "@context": "https://schema.org",
    "@type": "GasStation",
    "@id": input.url,
    name: input.name,
    url: input.url,
    identifier: input.id,
  };
  if (input.brand) schema.brand = { "@type": "Brand", name: input.brand };
  if (input.phone) schema.telephone = input.phone;
  if (input.openingHours) schema.openingHours = input.openingHours;
  if (input.address || input.city) {
    schema.address = {
      "@type": "PostalAddress",
      ...(input.address && { streetAddress: input.address }),
      ...(input.city && { addressLocality: input.city }),
      ...(input.province && { addressRegion: input.province }),
      ...(input.postalCode && { postalCode: input.postalCode }),
      addressCountry: "ES",
    };
  }
  if (input.lat != null && input.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.lat,
      longitude: input.lon,
    };
  }
  if (input.prices?.length) {
    schema.priceRange = input.prices
      .map((p) => `${p.currency || "EUR"} ${p.price.toFixed(3)}`)
      .join(" – ");
    schema.makesOffer = input.prices.map((p) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: p.fuelType },
      price: p.price.toFixed(3),
      priceCurrency: p.currency || "EUR",
    }));
  }
  return schema;
}

// ---------------------------------------------------------------------------
// WeatherStation — AEMET/ICA stations rendered on /clima/estacion/[id]
// ---------------------------------------------------------------------------

export interface WeatherStationSchemaInput {
  id: string;
  name: string;
  url: string;
  operator?: string;
  lat?: number | null;
  lon?: number | null;
  elevation?: number | null;
  province?: string;
  measures?: string[];
}

export function weatherStationSchema(
  input: WeatherStationSchemaInput
): BaseSchema {
  const schema: BaseSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    additionalType: "https://schema.org/ObservationStation",
    name: input.name,
    identifier: input.id,
    url: input.url,
  };
  if (input.lat != null && input.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.lat,
      longitude: input.lon,
      ...(input.elevation != null && { elevation: input.elevation }),
    };
  }
  if (input.operator) {
    schema.provider = { "@type": "Organization", name: input.operator };
  }
  if (input.province) {
    schema.address = {
      "@type": "PostalAddress",
      addressRegion: input.province,
      addressCountry: "ES",
    };
  }
  if (input.measures?.length) {
    schema.variableMeasured = input.measures;
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Convenience: aliased names matching the team-lead helper-contract
// ---------------------------------------------------------------------------

export { placeSchema as generatePlaceSchema };
export { articleSchema as generateArticleSchema };
export { airportSchema as generateAirportSchema };
export { portSchema as generatePortSchema };
export { gasStationSchema as generateGasStationSchema };
export { weatherStationSchema as generateWeatherStationSchema };
