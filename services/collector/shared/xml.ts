import { XMLParser } from "fast-xml-parser";

export function createXMLParser(isArrayNames: string[] = []): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: true,
    isArray: (name) => isArrayNames.includes(name),
  });
}
