import { Fragment } from "react";
import { highlightParts } from "@/lib/html-escape";

/** A search highlight rendered as React nodes: text plus <mark>, never raw HTML. */
export function Highlighted({ snippet }: { snippet: string }) {
  return (
    <>
      {highlightParts(snippet).map((p, i) =>
        p.mark ? <mark key={i}>{p.text}</mark> : <Fragment key={i}>{p.text}</Fragment>
      )}
    </>
  );
}
