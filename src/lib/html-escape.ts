/**
 * Text from feeds and the database, made safe for an HTML string that goes
 * into dangerouslySetInnerHTML.
 *
 * Two places built HTML from that text without escaping it:
 *   - search: Typesense returns the indexed value as is around its <mark>
 *     tags, so a name with markup ran in the search box;
 *   - renderMarkdown: article bodies carry DGT panel messages and AEMET
 *     warning texts, and raw HTML or a javascript: link went straight through.
 */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** A Typesense snippet as HTML: everything escaped, only <mark> and </mark> kept. */
export function safeHighlight(snippet: string): string {
  return escapeHtml(snippet).replace(/&lt;(\/?)mark&gt;/g, "<$1mark>");
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/**
 * A highlight as text pieces, the <mark> ones flagged, for rendering as React
 * nodes (React escapes the text). It doesn't rely on the server having
 * escaped the snippet: any other markup in it is shown as text.
 */
export function highlightParts(snippet: string): { text: string; mark: boolean }[] {
  const parts: { text: string; mark: boolean }[] = [];
  let mark = false;
  for (const seg of snippet.split(/(<\/?mark>)/)) {
    if (seg === "<mark>") mark = true;
    else if (seg === "</mark>") mark = false;
    else if (seg) parts.push({ text: seg.replace(/&(amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e]), mark });
  }
  return parts;
}

/** An href for a markdown link: http(s), a site path or an anchor; anything else is refused. */
export function safeHref(url: string): string | null {
  const u = url.trim();
  return /^(https?:\/\/|\/(?!\/)|#)/i.test(u) ? u : null;
}
