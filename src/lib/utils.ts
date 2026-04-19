/**
 * Minimal class-name joiner. We don't pull tailwind-merge because the
 * codebase doesn't depend on clsx/twMerge; the whole repo uses template
 * strings. `cn` is just a convenience for conditional composition.
 *
 * Pass strings, numbers (ignored), null/undefined/false (skipped), or arrays.
 */
export function cn(
  ...parts: Array<
    string | number | false | null | undefined | Array<string | false | null | undefined>
  >
): string {
  const out: string[] = [];
  for (const p of parts) {
    if (!p) continue;
    if (Array.isArray(p)) {
      for (const q of p) if (q) out.push(String(q));
    } else if (typeof p === "string") {
      out.push(p);
    }
  }
  return out.join(" ");
}
