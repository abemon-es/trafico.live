/**
 * Andorra Traffic Collector
 *
 * Fetches traffic incidents and webcam data from the mobilitat.ad public API.
 * No authentication required.
 *
 * Data sources:
 * - Incidents: https://app.mobilitat.ad/api/v1/incidents/ca
 * - Cameras:   https://app.mobilitat.ad/api/v1/cameras
 *
 * Run every ~5 minutes for incidents, daily for cameras.
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "andorra";
const INCIDENTS_URL = "https://app.mobilitat.ad/api/v1/incidents/ca";
const CAMERAS_URL = "https://app.mobilitat.ad/api/v1/cameras";
const FETCH_TIMEOUT_MS = 15_000;
const CAMERA_IMAGE_BASE = "https://imgs.mobilitat.ad/prod";

// ─── API response shapes ───────────────────────────────────────────────────

interface ApiIncidentCategory {
  classification: string; // "BLAU" | "TARONJA" | "VERMELL"
  title: string;
}

interface ApiIncident {
  id: number;
  category_id: number;
  category: ApiIncidentCategory;
  title: string;
  text?: string;
  init_date?: string;
  final_date?: string;
  lat?: string | number;
  lng?: string | number;
}

interface ApiIncidentsResponse {
  success: boolean;
  result: ApiIncident[];
}

interface ApiCamera {
  id: string;           // slug e.g. "EncampN"
  name?: string;
  latitude?: number | string;
  longitude?: number | string;
  elevation?: number | string;
  route?: string;       // CG1, CG2, etc.
}

// ─── Fetch helpers ────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Incidents ────────────────────────────────────────────────────────────

async function collectIncidents(prisma: PrismaClient): Promise<number> {
  const response = await fetchWithTimeout(INCIDENTS_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from incidents endpoint`);
  }

  const data = (await response.json()) as ApiIncidentsResponse;
  if (!data.success || !Array.isArray(data.result)) {
    throw new Error("Unexpected incidents response shape");
  }

  const now = new Date();
  const activeSourceIds = new Set<number>();

  for (const item of data.result) {
    const sourceId = Number(item.id);
    if (!sourceId) continue;

    const latitude = parseFloat(String(item.lat ?? 0));
    const longitude = parseFloat(String(item.lng ?? 0));

    // Skip records with no usable coordinates
    if (!isFinite(latitude) || !isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      continue;
    }

    const category = item.category?.classification ?? "UNKNOWN";
    const categoryId = Number(item.category_id ?? 0);
    const title = item.title ?? "";
    const description = item.text ?? null;
    const startedAt = item.init_date ? new Date(item.init_date) : now;
    const endedAt = item.final_date ? new Date(item.final_date) : null;

    await prisma.andorraIncident.upsert({
      where: { sourceId },
      create: {
        sourceId,
        category,
        categoryId,
        title,
        description,
        latitude,
        longitude,
        startedAt,
        endedAt: endedAt ?? undefined,
        isActive: true,
        fetchedAt: now,
      },
      update: {
        category,
        categoryId,
        title,
        description,
        latitude,
        longitude,
        endedAt: endedAt ?? undefined,
        isActive: true,
        fetchedAt: now,
      },
    });

    activeSourceIds.add(sourceId);
  }

  // Deactivate incidents not present in the current response
  if (activeSourceIds.size > 0) {
    await prisma.andorraIncident.updateMany({
      where: {
        sourceId: { notIn: Array.from(activeSourceIds) },
        isActive: true,
      },
      data: { isActive: false },
    });
  } else {
    // Nothing came back — deactivate everything rather than leaving stale active rows
    await prisma.andorraIncident.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });
  }

  return activeSourceIds.size;
}

// ─── Cameras ──────────────────────────────────────────────────────────────

async function collectCameras(prisma: PrismaClient): Promise<number> {
  const response = await fetchWithTimeout(CAMERAS_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from cameras endpoint`);
  }

  // The endpoint may return a plain array or a wrapped object
  const raw = await response.json();
  const items: ApiCamera[] = Array.isArray(raw) ? raw : (raw as { result?: ApiCamera[] }).result ?? [];

  const now = new Date();
  const activeIds = new Set<string>();

  for (const item of items) {
    const id = item.id != null ? String(item.id).trim() : "";
    if (!id) continue;

    const latitude = parseFloat(String(item.latitude ?? 0));
    const longitude = parseFloat(String(item.longitude ?? 0));
    if (!isFinite(latitude) || !isFinite(longitude) || (latitude === 0 && longitude === 0)) {
      continue;
    }

    const elevation = item.elevation != null ? Math.round(Number(item.elevation)) : null;
    // Image URL: base/{id}.gif with a cache-busting timestamp baked in at collection time
    const imageUrl = `${CAMERA_IMAGE_BASE}/${id}.gif?t=${now.getTime()}`;

    await prisma.andorraCamera.upsert({
      where: { id },
      create: {
        id,
        name: item.name ?? id,
        latitude,
        longitude,
        elevation: elevation ?? undefined,
        route: item.route ?? null,
        imageUrl,
        isActive: true,
        lastUpdated: now,
      },
      update: {
        name: item.name ?? id,
        latitude,
        longitude,
        elevation: elevation ?? undefined,
        route: item.route ?? null,
        imageUrl,
        isActive: true,
        lastUpdated: now,
      },
    });

    activeIds.add(id);
  }

  // Mark cameras absent from the current response as inactive
  if (activeIds.size > 0) {
    await prisma.andorraCamera.updateMany({
      where: {
        id: { notIn: Array.from(activeIds) },
        isActive: true,
      },
      data: { isActive: false },
    });
  }

  return activeIds.size;
}

// ─── Entry point ──────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting Andorra collector");

  const [incidentsResult, camerasResult] = await Promise.allSettled([
    collectIncidents(prisma),
    collectCameras(prisma),
  ]);

  const incidentCount =
    incidentsResult.status === "fulfilled"
      ? incidentsResult.value
      : (() => {
          logError(TASK, "Incidents fetch failed", incidentsResult.reason);
          return 0;
        })();

  const cameraCount =
    camerasResult.status === "fulfilled"
      ? camerasResult.value
      : (() => {
          logError(TASK, "Cameras fetch failed", camerasResult.reason);
          return 0;
        })();

  log(TASK, `Andorra: ${incidentCount} incidents, ${cameraCount} cameras`);
}
