/**
 * DGEG district list (GetDistritos). The API names each district in
 * `Descritivo`; older responses used `Nome`, so both are read.
 */
export interface ApiDistrict {
  Id: string | number;
  Descritivo?: string;
  Nome?: string;
}

export function districtName(d: ApiDistrict): string {
  return d.Descritivo || d.Nome || `distrito ${d.Id}`;
}
