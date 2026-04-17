// Shared SEO library — central exports for all SEO utilities

// Metadata helpers
export {
  canonicalUrl,
  stripBrandSuffix,
  buildMetadata,
  buildPageMetadata,
} from "./metadata";
export type { BuildMetadataInput } from "./metadata";

// Text generators for geographic SEO pages
export {
  provinceDescription,
  municipalityDescription,
  postalCodeDescription,
  provinceTitle,
  municipalityTitle,
  postalCodeTitle,
} from "./text-generators";

// Entity schema builders (source of truth in src/lib/seo/schemas.ts)
export {
  placeSchema,
  articleSchema,
  airportSchema,
  portSchema,
  gasStationSchema,
  weatherStationSchema,
  generatePlaceSchema,
  generateArticleSchema,
  generateAirportSchema,
  generatePortSchema,
  generateGasStationSchema,
  generateWeatherStationSchema,
} from "./schemas";
export type {
  BaseSchema,
  PlaceSchemaInput,
  ArticleSchemaInput,
  AirportSchemaInput,
  PortSchemaInput,
  GasStationSchemaInput,
  WeatherStationSchemaInput,
} from "./schemas";

// Foundational schemas re-exported from the component lib
export {
  generateOrganizationSchema,
  generateWebPageSchema,
  generateWebSiteSchema,
  generateRoadSchema,
  generateDatasetSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  generateServiceSchema,
  generateSpeakableSchema,
  generateItemListSchema,
  generateSiteNavigationSchema,
} from "@/components/seo/StructuredData";

// Lean aliases matching the team-lead helper-contract
export { generateFAQSchema as faqSchema } from "@/components/seo/StructuredData";
export { generateBreadcrumbSchema as breadcrumbSchema } from "@/components/seo/StructuredData";
export { generateRoadSchema as roadSchema } from "@/components/seo/StructuredData";
