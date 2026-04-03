const CACHE_NAME = "trafico-tiles-v1";
const TILES_ORIGIN = "https://tiles.trafico.live";

// Static PMTiles, fonts, sprites — stale-while-revalidate, 24h TTL
const STATIC_PATHS = ["/tiles/", "/fonts/", "/sprites/", "/spain.pmtiles"];
// Dynamic Martin tiles — network-first with 5s timeout
const DYNAMIC_PATH = "/dynamic/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
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

  if (url.origin !== TILES_ORIGIN) return;

  const isStatic = STATIC_PATHS.some((p) => url.pathname.startsWith(p));
  const isDynamic = url.pathname.startsWith(DYNAMIC_PATH);

  if (isStatic) {
    // Stale-while-revalidate: serve from cache immediately, update in background
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request)
            .then((response) => {
              if (response.ok) cache.put(event.request, response.clone());
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
  } else if (isDynamic) {
    // Network-first with 5s timeout, fallback to cache
    event.respondWith(
      new Promise((resolve) => {
        const timeout = setTimeout(() => {
          caches
            .match(event.request)
            .then((cached) =>
              resolve(cached || new Response("", { status: 204 }))
            );
        }, 5000);

        fetch(event.request)
          .then((response) => {
            clearTimeout(timeout);
            if (response.ok || response.status === 204) {
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, response.clone()));
            }
            resolve(response);
          })
          .catch(() => {
            clearTimeout(timeout);
            caches
              .match(event.request)
              .then((cached) =>
                resolve(cached || new Response("", { status: 204 }))
              );
          });
      })
    );
  }
});
