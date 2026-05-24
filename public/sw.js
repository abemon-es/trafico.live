// trafico.live Service Worker — stale-while-revalidate + tile caching + offline fallback
// Version bump here to force cache refresh on deploy
const CACHE_VERSION = "v3";
const CACHE_NAME = `trafico-${CACHE_VERSION}`;
const TILES_CACHE_NAME = `trafico-tiles-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

// Tiles CDN origin
const TILES_ORIGIN = "https://tiles.trafico.live";

// Tile max-age: 1 day in seconds
const TILES_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Routes to precache and serve stale-while-revalidate
const SWR_ROUTES = ["/", "/mapa", "/trenes", "/maritimo", "/aviacion"];

// Assets to precache on install
const PRECACHE_URLS = [OFFLINE_URL];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== TILES_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // ── Map tiles (tiles.trafico.live) — cache 1 day, stale-while-revalidate ──
  if (url.origin === TILES_ORIGIN) {
    event.respondWith(handleTileRequest(event.request));
    return;
  }

  // Only handle same-origin requests below this point
  if (url.origin !== self.location.origin) return;

  // ── Skip /api/* — always go to network ───────────────────────────────────
  if (url.pathname.startsWith("/api/")) return;

  // ── Skip Next.js internals ───────────────────────────────────────────────
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/__nextjs") ||
    url.pathname.startsWith("/monitoring")
  ) {
    return;
  }

  // ── SWR routes: /, /mapa, /trenes, /maritimo, /aviacion ─────────────────
  const isSwrRoute = SWR_ROUTES.some(
    (route) => url.pathname === route || url.pathname === route + "/"
  );

  if (isSwrRoute && event.request.mode === "navigate") {
    event.respondWith(handleSwrNavigation(event.request));
    return;
  }

  // ── All other navigation requests — network-first, offline fallback ───────
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((cached) => cached || new Response("Offline", { status: 503 }))
      )
    );
  }
});

// ─── Stale-while-revalidate for navigation routes ────────────────────────────
async function handleSwrNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  // Kick off a background revalidation
  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // If we have a cached copy, return it immediately and revalidate in background
  if (cached) {
    // Don't await — let the update happen in background
    event.waitUntil?.(networkFetch);
    return cached;
  }

  // No cache — wait for network
  const networkResponse = await networkFetch;
  if (networkResponse) return networkResponse;

  // Network failed — return offline page
  return (
    (await cache.match(OFFLINE_URL)) ||
    new Response("Offline", { status: 503 })
  );
}

// ─── Tile caching — stale-while-revalidate with 1-day TTL ────────────────────
async function handleTileRequest(request) {
  const cache = await caches.open(TILES_CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    // Check age via Date header
    const dateHeader = cached.headers.get("date");
    const age = dateHeader ? Date.now() - new Date(dateHeader).getTime() : 0;

    if (age < TILES_MAX_AGE_MS) {
      // Still fresh — return cached, revalidate in background
      fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
        })
        .catch(() => {});
      return cached;
    }
  }

  // Stale or missing — fetch from network
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — return stale copy if available
    if (cached) return cached;
    return new Response("", { status: 204 });
  }
}
