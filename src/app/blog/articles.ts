export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO date
  readTime: string;
  category: "guía" | "actualidad" | "seguridad" | "combustible";
  keywords: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: "que-es-baliza-v16-como-funciona",
    title: "¿Qué es la baliza V16 y cómo funciona?",
    excerpt:
      "Todo sobre la nueva baliza V16 obligatoria: qué es, cuándo es obligatoria, cómo funciona y dónde comprar la mejor.",
    date: "2026-03-24",
    readTime: "5 min",
    category: "guía",
    keywords: ["baliza V16", "señalización emergencia", "DGT"],
  },
  {
    slug: "zonas-bajas-emisiones-guia-completa",
    title: "Zonas de Bajas Emisiones (ZBE) en España: Guía Completa 2026",
    excerpt:
      "Qué son las ZBE, qué ciudades las tienen, qué vehículos pueden circular y cómo consultar las restricciones.",
    date: "2026-03-24",
    readTime: "8 min",
    category: "guía",
    keywords: ["ZBE", "zonas bajas emisiones", "distintivo ambiental"],
  },
  {
    slug: "como-ahorrar-gasolina-consejos",
    title: "10 Consejos para Ahorrar Gasolina en 2026",
    excerpt:
      "Técnicas de conducción eficiente, mantenimiento del vehículo y herramientas para encontrar el combustible más barato.",
    date: "2026-03-24",
    readTime: "6 min",
    category: "combustible",
    keywords: ["ahorrar gasolina", "conducción eficiente", "gasolineras baratas"],
  },
  {
    slug: "diesel-o-gasolina-2026",
    title: "¿Diesel o Gasolina en 2026? Guía Completa para Elegir",
    excerpt:
      "Comparativa actualizada: precios, consumo, fiscalidad, restricciones ZBE y tabla de decisión para saber qué motorización te conviene en 2026.",
    date: "2026-03-24",
    readTime: "7 min",
    category: "combustible",
    keywords: ["diesel o gasolina", "gasolina vs diesel 2026", "etiqueta ambiental", "ZBE", "precio combustible"],
  },
  {
    slug: "nuevos-radares-dgt-2026",
    title: "33 Nuevos Radares DGT en 2026: Ubicaciones y Tipos",
    excerpt:
      "La DGT instala 33 nuevos cinemómetros en 2026. Descubre qué tipos de radar hay, las carreteras afectadas y cómo funciona el radar de tramo.",
    date: "2026-03-24",
    readTime: "6 min",
    category: "seguridad",
    keywords: ["nuevos radares DGT 2026", "radares tramo", "cinemómetros", "multa velocidad DGT"],
  },
  {
    slug: "etiqueta-ambiental-dgt-como-saber",
    title: "Etiqueta Ambiental DGT: Cómo Saber la Tuya y Qué Significa",
    excerpt:
      "Guía completa sobre las 5 etiquetas ambientales DGT: qué vehículos las tienen, cómo consultar la tuya en miDGT, qué permite circular en las ZBE y las multas vigentes.",
    date: "2026-03-24",
    readTime: "8 min",
    category: "guía",
    keywords: ["etiqueta ambiental DGT", "cómo saber etiqueta coche", "distintivo ambiental", "ZBE restricciones", "miDGT"],
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getRelatedArticles(slug: string, count = 2): Article[] {
  return ARTICLES.filter((a) => a.slug !== slug).slice(0, count);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const CATEGORY_LABELS: Record<Article["category"], string> = {
  guía: "Guía",
  actualidad: "Actualidad",
  seguridad: "Seguridad",
  combustible: "Combustible",
};

export const CATEGORY_COLORS: Record<Article["category"], string> = {
  guía: "bg-blue-100 text-blue-700",
  actualidad: "bg-orange-100 text-orange-700",
  seguridad: "bg-red-100 text-red-700",
  combustible: "bg-amber-100 text-amber-700",
};
