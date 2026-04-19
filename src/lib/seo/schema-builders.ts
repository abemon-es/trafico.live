/**
 * schema-builders.ts — Team F / Sprint 1
 *
 * Type-safe Schema.org JSON-LD helpers that complement the existing
 * src/lib/seo/schemas.ts (entity-level) and StructuredData.tsx (foundational).
 *
 * Adds builders for DataFeed, TrainStation, Ship, EmergencyEvent, HowTo,
 * and the fixed Organization / WebSite blocks for trafico.live.
 *
 * Consumed by all 7 Teams. Import from this file or re-export via
 * src/lib/seo/index.ts.
 *
 * Usage:
 *   import { buildDataFeed, buildBreadcrumb, buildOrganization } from "@/lib/seo/schema-builders";
 */

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Shared base type
// ---------------------------------------------------------------------------

export interface SchemaObject {
  "@context": "https://schema.org";
  "@type": string | string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// DataFeed — real-time data streams (traffic, flights, trains, vessels, ICA)
// ---------------------------------------------------------------------------

export interface DataFeedParams {
  name: string;
  description: string;
  url: string;
  /** ISO 8601 duration e.g. "PT1M" */
  updateFrequency?: string;
  /** When the feed was last refreshed */
  dateModified?: Date | string;
  /** e.g. "application/geo+json", "application/json" */
  encodingFormat?: string;
  /** Data sources attribution */
  sourceOrganization?: string | string[];
  license?: string;
  keywords?: string[];
}

export function buildDataFeed(params: DataFeedParams): SchemaObject {
  const sources = Array.isArray(params.sourceOrganization)
    ? params.sourceOrganization
    : params.sourceOrganization
    ? [params.sourceOrganization]
    : [];

  return {
    "@context": "https://schema.org",
    "@type": "DataFeed",
    name: params.name,
    description: params.description,
    url: params.url,
    ...(params.encodingFormat && { encodingFormat: params.encodingFormat }),
    ...(params.dateModified && {
      dateModified:
        params.dateModified instanceof Date
          ? params.dateModified.toISOString()
          : params.dateModified,
    }),
    ...(params.updateFrequency && {
      temporalCoverage: params.updateFrequency,
    }),
    ...(params.license && { license: params.license }),
    ...(params.keywords?.length && { keywords: params.keywords.join(", ") }),
    ...(sources.length > 0 && {
      sourceOrganization: sources.map((name) => ({
        "@type": "Organization",
        name,
      })),
    }),
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };
}

// ---------------------------------------------------------------------------
// BreadcrumbList
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function buildBreadcrumb(items: BreadcrumbItem[]): SchemaObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ---------------------------------------------------------------------------
// FAQPage
// ---------------------------------------------------------------------------

export interface FAQItem {
  question: string;
  answer: string;
}

export function buildFAQ(items: FAQItem[]): SchemaObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Place — generic geo-aware location
// ---------------------------------------------------------------------------

export interface PlaceParams {
  name: string;
  url: string;
  description?: string;
  lat?: number | null;
  lon?: number | null;
  addressRegion?: string;
  addressCountry?: string;
}

export function buildPlace(params: PlaceParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: params.name,
    url: params.url,
  };
  if (params.description) schema.description = params.description;
  if (params.lat != null && params.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: params.lat,
      longitude: params.lon,
    };
  }
  if (params.addressRegion || params.addressCountry) {
    schema.address = {
      "@type": "PostalAddress",
      addressCountry: params.addressCountry || "ES",
      ...(params.addressRegion && { addressRegion: params.addressRegion }),
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// TrainStation
// ---------------------------------------------------------------------------

export interface TrainStationParams {
  name: string;
  /** Renfe/ADIF numeric station code */
  stationCode?: string;
  url: string;
  lat?: number | null;
  lon?: number | null;
  municipality?: string;
  province?: string;
  /** e.g. ["AVE", "Cercanías", "Larga Distancia"] */
  services?: string[];
  network?: string;
}

export function buildTrainStation(params: TrainStationParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "TrainStation",
    name: params.name,
    url: params.url,
  };
  if (params.stationCode) schema.identifier = params.stationCode;
  if (params.lat != null && params.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: params.lat,
      longitude: params.lon,
    };
  }
  if (params.municipality || params.province) {
    schema.address = {
      "@type": "PostalAddress",
      ...(params.municipality && { addressLocality: params.municipality }),
      ...(params.province && { addressRegion: params.province }),
      addressCountry: "ES",
    };
  }
  if (params.services?.length) {
    schema.amenityFeature = params.services.map((s) => ({
      "@type": "LocationFeatureSpecification",
      name: s,
      value: true,
    }));
  }
  if (params.network) {
    schema.publicAccess = true;
    schema.containedInPlace = {
      "@type": "LocalBusiness",
      name: `Renfe ${params.network}`,
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Airport
// ---------------------------------------------------------------------------

export interface AirportParams {
  name: string;
  iata: string;
  icao?: string | null;
  url: string;
  city?: string;
  province?: string;
  lat?: number | null;
  lon?: number | null;
  elevation?: number | null;
  runwayCount?: number;
}

export function buildAirport(params: AirportParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "Airport",
    name: params.name,
    iataCode: params.iata,
    url: params.url,
  };
  if (params.icao) schema.icaoCode = params.icao;
  if (params.lat != null && params.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: params.lat,
      longitude: params.lon,
      ...(params.elevation != null && { elevation: params.elevation }),
    };
  }
  if (params.city || params.province) {
    schema.address = {
      "@type": "PostalAddress",
      ...(params.city && { addressLocality: params.city }),
      ...(params.province && { addressRegion: params.province }),
      addressCountry: "ES",
    };
  }
  if (params.runwayCount != null) {
    schema.amenityFeature = {
      "@type": "LocationFeatureSpecification",
      name: "runways",
      value: params.runwayCount,
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Port (CivicStructure)
// ---------------------------------------------------------------------------

export interface PortParams {
  name: string;
  slug: string;
  url: string;
  lat?: number | null;
  lon?: number | null;
  authority?: string | null;
  portType?: "commercial" | "fishing" | "passenger" | "marina";
  region?: string;
  locode?: string | null;
}

export function buildPort(params: PortParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "CivicStructure",
    additionalType: "https://schema.org/Port",
    name: params.name,
    identifier: params.slug,
    url: params.url,
  };
  if (params.locode) schema.globalLocationNumber = params.locode;
  if (params.lat != null && params.lon != null) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: params.lat,
      longitude: params.lon,
    };
  }
  if (params.authority) {
    schema.provider = { "@type": "Organization", name: params.authority };
  }
  if (params.region) {
    schema.address = {
      "@type": "PostalAddress",
      addressRegion: params.region,
      addressCountry: "ES",
    };
  }
  if (params.portType) {
    schema.amenityFeature = {
      "@type": "LocationFeatureSpecification",
      name: "portType",
      value: params.portType,
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Ship — AIS vessel with current position
// ---------------------------------------------------------------------------

export interface ShipParams {
  name: string;
  mmsi: string;
  imo?: string | null;
  callsign?: string | null;
  flag?: string | null;
  shipType?: string | null;
  url?: string;
  lat?: number | null;
  lon?: number | null;
  /** ISO 8601 string of last AIS update */
  positionUpdatedAt?: string | Date | null;
}

export function buildShip(params: ShipParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    additionalType: "https://schema.org/Ship",
    name: params.name,
    identifier: params.mmsi,
  };
  if (params.imo) schema.vehicleIdentificationNumber = params.imo;
  if (params.callsign) schema.callSign = params.callsign;
  if (params.flag) {
    schema.operatingOrganization = {
      "@type": "Organization",
      addressCountry: params.flag,
    };
  }
  if (params.shipType) schema.vehicleSpecialUsage = params.shipType;
  if (params.url) schema.url = params.url;
  if (params.lat != null && params.lon != null) {
    schema.currentLocation = {
      "@type": "GeoCoordinates",
      latitude: params.lat,
      longitude: params.lon,
      ...(params.positionUpdatedAt && {
        description:
          params.positionUpdatedAt instanceof Date
            ? params.positionUpdatedAt.toISOString()
            : params.positionUpdatedAt,
      }),
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// EmergencyEvent — DGT/AEMET traffic incidents
// ---------------------------------------------------------------------------

export interface EmergencyEventParams {
  name: string;
  description?: string;
  url: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  type?: string;
  road?: string;
  startDate?: Date | string;
  endDate?: Date | string | null;
  lat?: number | null;
  lon?: number | null;
  province?: string;
}

const SEVERITY_STATUS: Record<string, string> = {
  LOW: "EventMovedOnline",
  MEDIUM: "EventScheduled",
  HIGH: "EventRescheduled",
  VERY_HIGH: "EventCancelled",
};

export function buildEmergencyEvent(params: EmergencyEventParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "Event",
    additionalType: "EmergencyEvent",
    name: params.name,
    url: params.url,
    eventStatus: params.severity
      ? `https://schema.org/${SEVERITY_STATUS[params.severity] ?? "EventScheduled"}`
      : "https://schema.org/EventScheduled",
    eventAttendanceMode:
      "https://schema.org/OfflineEventAttendanceMode",
  };
  if (params.description) schema.description = params.description;
  if (params.type) schema.about = params.type;
  if (params.startDate) {
    schema.startDate =
      params.startDate instanceof Date
        ? params.startDate.toISOString()
        : params.startDate;
  }
  if (params.endDate) {
    schema.endDate =
      params.endDate instanceof Date
        ? params.endDate.toISOString()
        : params.endDate;
  }
  if (params.lat != null && params.lon != null) {
    schema.location = {
      "@type": "Place",
      geo: {
        "@type": "GeoCoordinates",
        latitude: params.lat,
        longitude: params.lon,
      },
      ...(params.road && { name: params.road }),
      ...(params.province && {
        address: {
          "@type": "PostalAddress",
          addressRegion: params.province,
          addressCountry: "ES",
        },
      }),
    };
  } else if (params.road || params.province) {
    schema.location = {
      "@type": "Place",
      ...(params.road && { name: params.road }),
      ...(params.province && {
        address: {
          "@type": "PostalAddress",
          addressRegion: params.province,
          addressCountry: "ES",
        },
      }),
    };
  }
  return schema;
}

// ---------------------------------------------------------------------------
// HowTo — legal guides, toll calculation steps, etc.
// ---------------------------------------------------------------------------

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
  imageUrl?: string;
}

export interface HowToParams {
  name: string;
  description?: string;
  url: string;
  steps: HowToStep[];
  totalTime?: string;
  supply?: string[];
  tool?: string[];
}

export function buildHowTo(params: HowToParams): SchemaObject {
  const schema: SchemaObject = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    url: params.url,
    step: params.steps.map((step, idx) => ({
      "@type": "HowToStep",
      position: idx + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
      ...(step.imageUrl && {
        image: { "@type": "ImageObject", url: step.imageUrl },
      }),
    })),
  };
  if (params.description) schema.description = params.description;
  if (params.totalTime) schema.totalTime = params.totalTime;
  if (params.supply?.length) {
    schema.supply = params.supply.map((s) => ({ "@type": "HowToSupply", name: s }));
  }
  if (params.tool?.length) {
    schema.tool = params.tool.map((t) => ({ "@type": "HowToTool", name: t }));
  }
  return schema;
}

// ---------------------------------------------------------------------------
// Organization — fixed trafico.live entity
// ---------------------------------------------------------------------------

export function buildOrganization(): SchemaObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "trafico.live",
    url: BASE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/logo.svg`,
      width: 200,
      height: 60,
    },
    description:
      "Plataforma de inteligencia de movilidad en tiempo real para España y Portugal. Tráfico DGT, trenes Renfe, aviación, marítimo, calidad del aire y combustibles.",
    foundingDate: "2024",
    areaServed: ["ES", "PT"],
    knowsAbout: [
      "Tráfico por carretera",
      "Red ferroviaria Renfe",
      "Aviación civil",
      "Tráfico marítimo AIS",
      "Calidad del aire",
      "Precios combustible",
    ],
    sameAs: [],
  };
}

// ---------------------------------------------------------------------------
// WebSite — with SearchAction for Sitelinks search box
// ---------------------------------------------------------------------------

export function buildWebSite(): SchemaObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    name: "trafico.live",
    url: BASE_URL,
    description:
      "Información de tráfico, trenes, aviación, marítimo y calidad del aire en tiempo real para España.",
    inLanguage: "es",
    publisher: {
      "@id": `${BASE_URL}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/buscar?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
