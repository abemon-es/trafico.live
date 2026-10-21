/**
 * Live catalogue counts on the home: page.tsx counts them in the database at
 * render time. A count of 0 means the database didn't answer (or the build has
 * none), and then no number shows at all, never a figure written by hand.
 */

/** «12.470 gasolineras», or just «gasolineras» when the count is missing. */
export function withCount(n: number, noun: string): string {
  return n > 0 ? `${n.toLocaleString("es-ES")} ${noun}` : noun;
}

/** The latest published articles, as page.tsx passes them to the client. */
export interface HomeArticle {
  slug: string;
  title: string;
  summary: string;
  category: string;
  /** ISO 8601. */
  publishedAt: string;
}
