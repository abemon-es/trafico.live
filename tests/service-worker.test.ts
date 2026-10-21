/**
 * One service worker: public/sw.js caches map tiles and handles Web Push, and
 * it is the only script any page registers on scope "/".
 *
 * Until 2026-10-21 the layout registered /sw.js and /tile-sw.js on the same
 * scope: each register() replaced the other, every page load swapped the
 * controller, and a navigation caught in a swap never loaded.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:service-worker
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

type Handler = (event: unknown) => void;

function loadWorker(network: (request: Request) => Promise<Response>) {
  const handlers: Record<string, Handler[]> = {};
  const stores = new Map<string, Map<string, Response>>();
  const timers: Array<() => void> = [];
  const log: string[] = [];
  const imported: string[] = [];
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      match: async (req: Request) => m.get(req.url)?.clone(),
      put: async (req: Request, res: Response) => { log.push(`put ${res.status} ${req.url}`); m.set(req.url, res); },
    };
  };
  const sandbox: Record<string, unknown> = {
    URL, Request, Response, Headers, console,
    addEventListener: (type: string, fn: Handler) => (handlers[type] ??= []).push(fn),
    caches: {
      // Real I/O takes a while: by the time the cache opens, the page has read the body.
      open: async (name: string) => { await new Promise((r) => setTimeout(r, 1)); return store(name); },
      match: async (req: Request, opts?: { cacheName?: string }) => store(opts?.cacheName ?? "").match(req),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
    },
    fetch: (req: Request) => network(req),
    setTimeout: (fn: () => void) => { timers.push(fn); return timers.length; },
    clearTimeout: () => {},
    skipWaiting: () => log.push("skipWaiting"),
    clients: { claim: async () => log.push("claim"), matchAll: async () => [], openWindow: async () => null },
    registration: { showNotification: async () => {} },
    location: new URL("https://trafico.live/sw.js"),
  };
  sandbox.self = sandbox;
  sandbox.importScripts = (...urls: string[]) => {
    for (const url of urls) {
      imported.push(url);
      vm.runInContext(readFileSync(join("public", url), "utf8"), sandbox, { filename: url });
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync("public/sw.js", "utf8"), sandbox, { filename: "sw.js" });

  const fetchEvent = (url: string, init: RequestInit & { mode?: RequestMode } = {}) => {
    let responded: Promise<Response> | undefined;
    const { mode, ...rest } = init;
    const request = new Request(url, rest);
    if (mode === "navigate") Object.defineProperty(request, "mode", { value: "navigate" });
    for (const fn of handlers.fetch ?? []) {
      fn({ request, respondWith: (p: Promise<Response>) => { responded = Promise.resolve(p); }, waitUntil: () => {} });
    }
    return responded;
  };
  return { handlers, stores, timers, log, imported, fetchEvent, sandbox };
}

const settle = () => new Promise((r) => setTimeout(r, 10));

async function main() {
  // Every page registers the same script, never a second one on the scope.
  const registrations: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(tsx?|jsx?)$/.test(name)) {
        for (const m of readFileSync(path, "utf8").matchAll(/serviceWorker\.register\(\s*['"`]([^'"`]+)['"`]/g)) {
          registrations.push(`${path}: ${m[1]}`);
        }
      }
    }
  };
  walk("src");
  assert.ok(registrations.length > 0, "the layout registers the worker");
  for (const r of registrations) assert.match(r, /: \/sw\.js$/, `only /sw.js is ever registered: ${r}`);
  const workers = readdirSync("public").filter((f) => f.endsWith(".js") && /addEventListener\(\s*["']install["']/.test(readFileSync(join("public", f), "utf8")));
  assert.deepEqual(workers, ["sw.js"], "only one script in public/ is a worker with its own lifecycle");

  // Lifecycle and push: sw.js owns install/activate and imports the push handlers.
  const ok = (body = "tile") => async () => new Response(body, { status: 200 });
  const w = loadWorker(ok());
  assert.deepEqual(w.imported, ["/sw-push.js"]);
  for (const type of ["install", "activate", "fetch", "push", "notificationclick"]) {
    assert.ok(w.handlers[type]?.length, `handles ${type}`);
  }
  assert.equal(w.handlers.install.length, 1, "one install handler");
  assert.equal(w.handlers.activate.length, 1, "one activate handler");

  // Activate keeps only the tile cache: the old trafico-v3 (offline page, HTML) goes.
  for (const name of ["trafico-v3", "trafico-tiles-v3", "trafico-tiles-v1"]) await (w.sandbox.caches as { open: (n: string) => Promise<unknown> }).open(name);
  const waits: Promise<unknown>[] = [];
  w.handlers.activate[0]({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
  await Promise.all(waits);
  assert.deepEqual([...w.stores.keys()], ["trafico-tiles-v1"]);

  // Pages, the API and other origins are not intercepted.
  assert.equal(w.fetchEvent("https://trafico.live/", { mode: "navigate" }), undefined, "no navigation handling");
  assert.equal(w.fetchEvent("https://trafico.live/trenes", { mode: "navigate" }), undefined);
  assert.equal(w.fetchEvent("https://trafico.live/api/incidents"), undefined);
  assert.equal(w.fetchEvent("https://example.com/x.js"), undefined);
  assert.equal(w.fetchEvent("https://tiles.trafico.live/fonts/a.pbf", { method: "POST", body: "x" }), undefined);

  // PMTiles are read with Range requests: straight to the network.
  assert.equal(w.fetchEvent("https://tiles.trafico.live/tiles/radars.pmtiles", { headers: { Range: "bytes=0-16383" } }), undefined);
  assert.equal(w.fetchEvent("https://tiles.trafico.live/spain.pmtiles", { headers: { Range: "bytes=0-99" } }), undefined);

  // Static files: stale-while-revalidate, stored from a copy made before the page reads the body.
  const font = "https://tiles.trafico.live/fonts/DM Sans/0-255.pbf";
  const first = await w.fetchEvent(font)!;
  assert.equal(await first.text(), "tile", "the page reads the body right away");
  await settle();
  assert.ok(w.log.includes(`put 200 ${new Request(font).url}`), "and the cache still got its copy");
  const w2 = loadWorker(ok("fresh"));
  await (w2.sandbox.caches as { open: (n: string) => Promise<{ put: (a: Request, b: Response) => Promise<void> }> })
    .open("trafico-tiles-v1").then((c) => c.put(new Request(font), new Response("cached")));
  assert.equal(await (await w2.fetchEvent(font)!).text(), "cached", "a cached copy is served first");
  const w3 = loadWorker(async () => { throw new TypeError("offline"); });
  const failed = await w3.fetchEvent(font)!;
  assert.equal(failed.type, "error", "no copy and no network: a network error, not undefined");

  // Dynamic Martin tiles: the network when it answers…
  const dyn = "https://tiles.trafico.live/dynamic/tile_incidents/6/31/24";
  assert.equal(await (await loadWorker(ok("live")).fetchEvent(dyn)!).text(), "live");
  // …the cache (or an empty 204) when it doesn't, or after 5 s.
  const down = loadWorker(async () => { throw new TypeError("offline"); });
  assert.equal((await down.fetchEvent(dyn)!).status, 204, "an empty 204 (a body on a 204 throws, and the tile hung)");
  const slow = loadWorker(() => new Promise<Response>(() => {}));
  await (slow.sandbox.caches as { open: (n: string) => Promise<{ put: (a: Request, b: Response) => Promise<void> }> })
    .open("trafico-tiles-v1").then((c) => c.put(new Request(dyn), new Response("last")));
  const pending = slow.fetchEvent(dyn)!;
  assert.equal(slow.timers.length, 1, "a timeout is armed");
  slow.timers[0]();
  assert.equal(await (await pending).text(), "last");

  console.log("service worker: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
