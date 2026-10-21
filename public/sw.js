// trafico.live Service Worker — the site's only one: map tile cache + Web Push.
//
// One worker per scope. Until 2026-10-21 every page registered /sw.js and
// /tile-sw.js on the same scope "/" (and /alertas a third, /sw-push.js). A
// scope has a single registration, so each register() with another script
// replaced the worker: every page load swapped the controller once or twice,
// each activate deleted the other worker's caches, and a navigation that
// started during a swap was cancelled and never loaded.
//
// It does what visitors actually got, since /tile-sw.js won every swap:
// - tiles.trafico.live static files (fonts, sprites): stale-while-revalidate;
//   PMTiles are read with Range requests, which go straight to the network
//   (the Cache API refuses a 206, so they were never cached anyway);
// - dynamic Martin tiles (/dynamic/): network first, 5 s, then the cache or
//   an empty 204 (with a null body: an empty string throws for a 204, and the
//   tile request then hung, as in /tile-sw.js);
// - Web Push: /sw-push.js.
// Pages are not intercepted. The old network-first/offline and
// stale-while-revalidate HTML never ran (its cache was wiped on every page
// load), and stale HTML after a deploy would point at chunks that are gone.

importScripts("/sw-push.js");

// The name /tile-sw.js used, so the tiles visitors already have stay cached.
const CACHE_NAME = "trafico-tiles-v1";
const TILES_ORIGIN = "https://tiles.trafico.live";
const STATIC_PATHS = ["/tiles/", "/fonts/", "/sprites/", "/spain.pmtiles"];
const DYNAMIC_PATH = "/dynamic/";
const DYNAMIC_TIMEOUT_MS = 5000;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  if (event.request.method !== "GET" || url.origin !== TILES_ORIGIN) return;
  if (event.request.headers.has("range")) return;

  if (STATIC_PATHS.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(staleWhileRevalidate(event.request));
  } else if (url.pathname.startsWith(DYNAMIC_PATH)) {
    event.respondWith(networkFirst(event.request));
  }
});

// Cloned now, before the page reads the body: cloning it later throws.
function remember(request, response) {
  if (response.status !== 200 && response.status !== 204) return;
  const copy = response.clone();
  caches
    .open(CACHE_NAME)
    .then((cache) => cache.put(request, copy))
    .catch(() => {});
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request, { cacheName: CACHE_NAME });
  const network = fetch(request)
    .then((response) => {
      remember(request, response);
      return response;
    })
    .catch(() => cached || Response.error());
  return cached || network;
}

function networkFirst(request) {
  return new Promise((resolve) => {
    const fallback = () =>
      caches
        .match(request, { cacheName: CACHE_NAME })
        .then((cached) => resolve(cached || new Response(null, { status: 204 })));
    const timeout = setTimeout(fallback, DYNAMIC_TIMEOUT_MS);
    fetch(request)
      .then((response) => {
        clearTimeout(timeout);
        remember(request, response);
        resolve(response);
      })
      .catch(() => {
        clearTimeout(timeout);
        fallback();
      });
  });
}
