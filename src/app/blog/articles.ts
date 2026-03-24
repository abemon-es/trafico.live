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
