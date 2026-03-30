// Shared SEO library — central exports for all SEO utilities

// Metadata helpers
export { canonicalUrl, buildPageMetadata } from "./metadata";

// Text generators for geographic SEO pages
export {
  provinceDescription,
  municipalityDescription,
  postalCodeDescription,
  provinceTitle,
  municipalityTitle,
  postalCodeTitle,
} from "./text-generators";

// Schema builders — re-exported from components for convenience
export {
  generateOrganizationSchema,
  generateWebPageSchema,
  generateWebSiteSchema,
  generateRoadSchema,
  generateDatasetSchema,
  generateFAQSchema,
} from "@/components/seo/StructuredData";
