/**
 * Parser compartido para feeds GTFS-RT de posiciones de vehículos.
 *
 * Decodifica un buffer binario GTFS-RT (protobuf FeedMessage) usando
 * gtfs-realtime-bindings y extrae los campos necesarios para insertar
 * en la tabla TransitVehiclePosition.
 *
 * Uso:
 *   import { decodeVehiclePositions, type VehiclePositionRow } from "../transit-rt-shared/parser.js";
 *   const rows = await decodeVehiclePositions(buffer, operatorId, capturedAt);
 *
 * Reglas de extracción:
 *   - Se descartan entidades sin posición o con coordenadas 0,0.
 *   - vehicleId: descriptor.id > descriptor.label > entity.id (en ese orden).
 *   - speedKmh: GTFS-RT devuelve m/s → multiplicamos por 3.6.
 *   - occupancyStatus: se mapea desde el enum numérico de GTFS-RT a string.
 *   - capturedAt: timestamp de la llamada HTTP (lo pasa el colector).
 *   - timestamp: campo vehicle.timestamp del feed (Unix segundos); usa capturedAt si ausente.
 */

// gtfs-realtime-bindings es un paquete CommonJS — importar como default
import GtfsRtLib from "gtfs-realtime-bindings";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { transit_realtime } = GtfsRtLib as any;

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface VehiclePositionRow {
  operatorId: string;
  vehicleId: string;
  tripId: string | null;
  routeId: string | null;
  latitude: number;
  longitude: number;
  bearing: number | null;
  /** Velocidad en m/s tal como llega en el feed (campo legacy `speed`) */
  speed: number | null;
  /** Velocidad en km/h calculada (speed * 3.6); null si el feed no incluye velocidad */
  speedKmh: number | null;
  /** Estado de ocupación como string legible */
  occupancyStatus: string | null;
  /** Hora programada de paso por la parada activa (scheduledArrival/departureTime del feed) */
  scheduledTime: Date | null;
  /** Timestamp GPS del feed (Unix segundos convertido a Date) */
  timestamp: Date;
  /** Momento de captura HTTP (lo provee el colector) */
  capturedAt: Date;
  /** Alias de capturedAt para compatibilidad con cleanup-realtime (campo fetchedAt existente) */
  fetchedAt: Date;
}

// ── Mapa de OccupancyStatus (enum GTFS-RT → string) ──────────────────────────

const OCCUPANCY_STATUS_MAP: Record<number, string> = {
  0: "EMPTY",
  1: "MANY_SEATS_AVAILABLE",
  2: "FEW_SEATS_AVAILABLE",
  3: "STANDING_ROOM_ONLY",
  4: "CRUSHED_STANDING_ROOM_ONLY",
  5: "FULL",
  6: "NOT_ACCEPTING_PASSENGERS",
};

function mapOccupancyStatus(value: number | null | undefined): string | null {
  if (value == null) return null;
  return OCCUPANCY_STATUS_MAP[value] ?? null;
}

// ── Helper: Long o number → número JS ────────────────────────────────────────

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  if (typeof value === "object" && typeof (value as { toNumber?: unknown }).toNumber === "function") {
    const n = (value as { toNumber: () => number }).toNumber();
    return isNaN(n) ? null : n;
  }
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// ── Función principal ─────────────────────────────────────────────────────────

/**
 * Decodifica un buffer binario GTFS-RT y devuelve un array de filas listas
 * para insertar en TransitVehiclePosition.
 *
 * @param buffer   Respuesta binaria del feed (ArrayBuffer)
 * @param operatorId  ID del TransitOperator en la base de datos
 * @param capturedAt  Momento de la solicitud HTTP (usado como fetchedAt y capturedAt)
 */
export function decodeVehiclePositions(
  buffer: ArrayBuffer,
  operatorId: string,
  capturedAt: Date
): VehiclePositionRow[] {
  const bytes = new Uint8Array(buffer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let feedMessage: any;
  try {
    feedMessage = transit_realtime.FeedMessage.decode(bytes);
  } catch {
    // Buffer vacío o malformado — el colector decide cómo manejarlo
    return [];
  }

  const entities: unknown[] = feedMessage?.entity ?? [];
  const rows: VehiclePositionRow[] = [];

  for (const entity of entities) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = entity as any;
    const vp = e?.vehicle;
    if (!vp) continue;

    const pos = vp?.position;
    if (!pos) continue;

    // Validar coordenadas
    const lat = toNumber(pos.latitude);
    const lon = toNumber(pos.longitude);
    if (lat == null || lon == null) continue;
    if (lat === 0 && lon === 0) continue;
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;

    // vehicleId: id > label > entity.id
    const vehicleId =
      vp?.vehicle?.id?.trim() ||
      vp?.vehicle?.label?.trim() ||
      String(e?.id ?? "").trim();
    if (!vehicleId) continue;

    // Timestamp del feed (Unix segundos)
    const tsRaw = toNumber(vp?.timestamp);
    const timestamp = tsRaw != null ? new Date(tsRaw * 1000) : capturedAt;

    // Velocidad
    const speedRaw = toNumber(pos.speed);
    const speed = speedRaw != null ? speedRaw : null;
    const speedKmh = speed != null ? Math.round(speed * 3.6 * 10) / 10 : null;

    // Rumbo (bearing)
    const bearingRaw = toNumber(pos.bearing);
    const bearing = bearingRaw != null ? bearingRaw : null;

    // Estado de ocupación
    const occupancyRaw = toNumber(vp?.occupancyStatus);
    const occupancyStatus = mapOccupancyStatus(occupancyRaw);

    // Hora programada: se puede obtener de stopTimeUpdate[0] si el feed la incluye
    // (no todos los feeds incluyen esta información en VehiclePositions)
    let scheduledTime: Date | null = null;
    const stopTimeUpdate = vp?.stopTimeUpdate ?? vp?.currentStopSequence;
    if (stopTimeUpdate == null) {
      // Intentar desde trip update (algunos feeds mezclan datos)
      const arrivalTime = toNumber(vp?.trip?.scheduleRelationship);
      if (arrivalTime != null && arrivalTime > 0) {
        scheduledTime = new Date(arrivalTime * 1000);
      }
    }

    rows.push({
      operatorId,
      vehicleId,
      tripId: vp?.trip?.tripId?.trim() ?? null,
      routeId: vp?.trip?.routeId?.trim() ?? null,
      latitude: lat,
      longitude: lon,
      bearing,
      speed,
      speedKmh,
      occupancyStatus,
      scheduledTime,
      timestamp,
      capturedAt,
      fetchedAt: capturedAt, // alias para compatibilidad con cleanup-realtime
    });
  }

  return rows;
}
