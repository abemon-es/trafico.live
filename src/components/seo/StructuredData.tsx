import Script from "next/script";

interface BaseStructuredData {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

interface StructuredDataProps {
  data: BaseStructuredData | BaseStructuredData[];
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
      strategy="beforeInteractive"
    />
  );
}

// Pre-built structured data generators

interface RoadSchemaProps {
  id: string;
  name?: string | null;
  type: string;
  provinces: string[];
  totalKm?: number | null;
  cameraCount?: number;
  radarCount?: number;
  url: string;
}

export function generateRoadSchema({
  id,
  name,
  type,
  provinces,
  totalKm,
  cameraCount,
  radarCount,
  url,
}: RoadSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Road",
    name: name ? `${id} - ${name}` : id,
    alternateName: id,
    description: `${type === "AUTOPISTA" ? "Autopista" : type === "AUTOVIA" ? "Autovía" : type === "NACIONAL" ? "Carretera Nacional" : "Carretera"} ${id}${name ? ` (${name})` : ""}`,
    ...(totalKm && {
      length: {
        "@type": "QuantitativeValue",
        value: totalKm,
        unitCode: "KMT",
        unitText: "kilometers",
      },
    }),
    containedInPlace: provinces.map((p) => ({
      "@type": "AdministrativeArea",
      name: p,
    })),
    url,
    additionalProperty: [
      ...(cameraCount !== undefined
        ? [
            {
              "@type": "PropertyValue",
              name: "Traffic Cameras",
              value: cameraCount,
            },
          ]
        : []),
      ...(radarCount !== undefined
        ? [
            {
              "@type": "PropertyValue",
              name: "Speed Cameras",
              value: radarCount,
            },
          ]
        : []),
    ],
  };
}

interface WebPageSchemaProps {
  title: string;
  description: string;
  url: string;
  dateModified?: Date;
  breadcrumbs?: { name: string; url: string }[];
}

export function generateWebPageSchema({
  title,
  description,
  url,
  dateModified,
  breadcrumbs,
}: WebPageSchemaProps): BaseStructuredData[] {
  const schemas: BaseStructuredData[] = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url,
      ...(dateModified && { dateModified: dateModified.toISOString() }),
      publisher: {
        "@type": "Organization",
        name: "trafico.live",
        url: "https://trafico.live",
      },
    },
  ];

  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    });
  }

  return schemas;
}

interface OrganizationSchemaProps {
  name: string;
  url: string;
  description: string;
  logo?: string;
  sameAs?: string[];
  contactPoint?: {
    contactType: string;
    url: string;
    availableLanguage: string;
  };
  foundingDate?: string;
  areaServed?: { "@type": string; name: string };
}

export function generateOrganizationSchema({
  name,
  url,
  description,
  logo,
  sameAs,
  contactPoint,
  foundingDate,
  areaServed,
}: OrganizationSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    description,
    ...(logo && { logo }),
    ...(sameAs && sameAs.length > 0 && { sameAs }),
    ...(contactPoint && {
      contactPoint: {
        "@type": "ContactPoint",
        contactType: contactPoint.contactType,
        url: contactPoint.url,
        availableLanguage: contactPoint.availableLanguage,
      },
    }),
    ...(foundingDate && { foundingDate }),
    ...(areaServed && { areaServed }),
  };
}

interface WebSiteSchemaProps {
  name: string;
  url: string;
  description: string;
  searchUrl?: string;
}

export function generateWebSiteSchema({
  name,
  url,
  description,
  searchUrl,
}: WebSiteSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    inLanguage: "es",
    ...(searchUrl && {
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: searchUrl,
        },
        "query-input": "required name=search_term_string",
      },
    }),
  };
}

interface DatasetSchemaProps {
  name: string;
  description: string;
  url: string;
  keywords: string[];
  dateModified?: Date;
  spatialCoverage?: string;
  temporalCoverage?: string;
}

export function generateDatasetSchema({
  name,
  description,
  url,
  keywords,
  dateModified,
  spatialCoverage,
  temporalCoverage,
}: DatasetSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    keywords: keywords.join(", "),
    ...(dateModified && { dateModified: dateModified.toISOString() }),
    ...(spatialCoverage && { spatialCoverage }),
    ...(temporalCoverage && { temporalCoverage }),
    creator: {
      "@type": "Organization",
      name: "trafico.live",
      url: "https://trafico.live",
    },
    license: "https://creativecommons.org/licenses/by/4.0/",
  };
}

interface FAQSchemaProps {
  questions: { question: string; answer: string }[];
}

export function generateFAQSchema({ questions }: FAQSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

export function generateSiteNavigationSchema(
  items: { name: string; url: string }[]
): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Navegación principal",
    itemListElement: items.map((item, index) => ({
      "@type": "SiteNavigationElement",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  };
}
