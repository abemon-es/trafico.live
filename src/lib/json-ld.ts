/**
 * JSON for an inline <script> (JSON-LD and the like), safe to put in
 * dangerouslySetInnerHTML.
 *
 * JSON.stringify leaves «<» as is, so a value from a feed or the database
 * holding «</script>» would close the tag and the rest would be read as HTML.
 * «<» only appears inside JSON strings, where «<» is the same character,
 * so the parsed data does not change.
 */
export function jsonLdHtml(data: unknown): string {
  return (JSON.stringify(data) ?? "").replace(/</g, "\\u003c");
}
