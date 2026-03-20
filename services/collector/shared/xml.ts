import { XMLParser, X2jOptions } from "fast-xml-parser";

const BASE_OPTIONS: Partial<X2jOptions> = {
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
};

export function createXMLParser(opts: Partial<X2jOptions> = {}): XMLParser {
  return new XMLParser({ ...BASE_OPTIONS, ...opts });
}
