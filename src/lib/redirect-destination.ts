/**
 * Which paths the Redirect table may hold.
 *
 * Rows of the Redirect table are served by the catch-all page as 307/308. A
 * destination that is a full URL, or a path a browser reads as one («//host»,
 * «/\host»), sends the visitor to another site under a trafico.live link. So
 * both ends of a redirect are paths of this site: they start with a single «/»,
 * carry no backslash, no whitespace and no control character, and fit in 2,048
 * characters. The API refuses anything else on write, and the catch-all page
 * refuses it again on read.
 *
 * No imports on purpose: tests/redirects-admin.test.ts loads it with tsx.
 */

const MAX_LENGTH = 2048;

export function isSameSitePath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length < 1 || value.length > MAX_LENGTH) return false;
  if (value[0] !== "/") return false;
  // «//host» and «/\host» are read by browsers as another origin.
  if (value[1] === "/" || value[1] === "\\") return false;
  // Backslash, whitespace, control characters and DEL.
  if (/[\\\s\u0000-\u001f\u007f]/.test(value)) return false;
  return true;
}
