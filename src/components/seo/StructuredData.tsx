import Script from "next/script";

interface BaseStructuredData {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

interface StructuredDataProps {
  data: BaseStructuredData | BaseStructuredData[];
}

// Content-derived stable ID — survives concurrent SSR renders without
// colliding across modules. FNV-1a 32-bit, base36 for short URLs.
function fnv1aHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function StructuredData({ data }: StructuredDataProps) {
  const payload = JSON.stringify(data);
  const id = `sd-${fnv1aHash(payload)}`;
  return (
    <Script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: payload }}
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
  keywords?: string[];
  temporalCoverage?: string;
  spatialCoverage?: string;
  license?: string;
  creator?: { name: string; url?: string };
  distribution?: Array<{ encodingFormat: string; contentUrl: string }>;
  dateModified?: Date;
  variableMeasured?: string[];
}

export function generateDatasetSchema({
  name,
  description,
  url,
  keywords,
  temporalCoverage,
  spatialCoverage,
  license = "https://creativecommons.org/licenses/by/4.0/",
  creator,
  distribution,
  dateModified,
  variableMeasured,
}: DatasetSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name,
    description,
    url,
    ...(keywords && keywords.length > 0 && { keywords: keywords.join(", ") }),
    ...(temporalCoverage && { temporalCoverage }),
    ...(spatialCoverage && {
      spatialCoverage: { "@type": "Place", name: spatialCoverage },
    }),
    license,
    creator: creator
      ? { "@type": "Organization", name: creator.name, ...(creator.url && { url: creator.url }) }
      : { "@type": "Organization", name: "trafico.live", url: "https://trafico.live" },
    ...(distribution &&
      distribution.length > 0 && {
        distribution: distribution.map((d) => ({
          "@type": "DataDownload",
          encodingFormat: d.encodingFormat,
          contentUrl: d.contentUrl,
        })),
      }),
    ...(dateModified && { dateModified: dateModified.toISOString() }),
    ...(variableMeasured &&
      variableMeasured.length > 0 && {
        variableMeasured: variableMeasured.map((v) => ({
          "@type": "PropertyValue",
          name: v,
        })),
      }),
  };
}

interface FAQSchemaProps {
  questions: Array<{ question: string; answer: string }>;
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

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>;
}

export function generateBreadcrumbSchema({ items }: BreadcrumbSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

interface ServiceSchemaProps {
  name: string;
  description: string;
  url: string;
  provider: { name: string; url: string };
  serviceType: string;
  areaServed?: string;
  availableChannel?: { url: string; name: string };
}

export function generateServiceSchema({
  name,
  description,
  url,
  provider,
  serviceType,
  areaServed,
  availableChannel,
}: ServiceSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url,
    serviceType,
    provider: {
      "@type": "Organization",
      name: provider.name,
      url: provider.url,
    },
    ...(areaServed && {
      areaServed: { "@type": "Country", name: areaServed },
    }),
    ...(availableChannel && {
      availableChannel: {
        "@type": "ServiceChannel",
        serviceUrl: availableChannel.url,
        name: availableChannel.name,
      },
    }),
  };
}

interface SpeakableSchemaProps {
  url: string;
  cssSelector?: string[];
  xpath?: string[];
}

export function generateSpeakableSchema({
  url,
  cssSelector = [".sr-only h1", ".hero-headline"],
  xpath,
}: SpeakableSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    speakable: {
      "@type": "SpeakableSpecification",
      ...(cssSelector && cssSelector.length > 0 && { cssSelector }),
      ...(xpath && xpath.length > 0 && { xpath }),
    },
  };
}

interface ItemListSchemaProps {
  name: string;
  items: Array<{ name: string; url: string; position?: number }>;
  itemListOrder?: "Ascending" | "Descending" | "Unordered";
  numberOfItems?: number;
}

export function generateItemListSchema({
  name,
  items,
  itemListOrder = "Unordered",
  numberOfItems,
}: ItemListSchemaProps): BaseStructuredData {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    ...(numberOfItems !== undefined && { numberOfItems }),
    itemListOrder: `https://schema.org/ItemList${itemListOrder}`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: item.position ?? index + 1,
      name: item.name,
      url: item.url,
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
