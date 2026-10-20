/**
 * The AEMET pieces every caller shares (services/collector/shared/aemet.ts),
 * and the two callers that throw on an expired key: weather and
 * aemet-historical. Real AEMET bodies are Latin-1 without a charset, and an
 * expired key answers 401 «…plazo establecido … para su renovación».
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:aemet-shared
 */

import assert from "node:assert/strict";
import {
  AemetKeyExpiredError,
  decodeAemetBody,
  fetchWithRetry,
  isKeyExpired,
  readAemetJson,
  readDescripcion,
} from "../services/collector/shared/aemet";
import { fetchAEMETAlerts } from "../services/collector/tasks/weather/aemet-parser";
import { aemetFetch } from "../services/collector/tasks/aemet-historical/collector";

const RENEWAL_TEXT =
  "Tu apiKey ha superado el plazo establecido hasta el 15/10/2026 para su renovación. " +
  "Debes renovar la credencial antes de continuar utilizando el servicio.";

/** Latin-1 bytes, as AEMET sends them (every char here is ≤ U+00FF). */
const latin1 = (text: string) => Uint8Array.from(text, (c) => c.charCodeAt(0));
const renewal401 = () =>
  new Response(latin1(JSON.stringify({ descripcion: RENEWAL_TEXT, estado: 401 })), { status: 401 });

type FetchStub = (url: string) => Response | Promise<Response>;
async function withFetch<T>(stub: FetchStub, body: () => Promise<T>): Promise<{ result: T; calls: number }> {
  const real = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls++;
    return stub(String(input));
  }) as typeof fetch;
  try {
    return { result: await body(), calls };
  } finally {
    globalThis.fetch = real;
  }
}
const socketClosed = () => new TypeError("fetch failed", { cause: new Error("other side closed") });

async function main() {
  // 1. Latin-1 bodies keep their accents; UTF-8 and ASCII pass unchanged.
  const text = "Avisos para Andalucía Occidental y Ceuta · Atlántico al sur de 35º N";
  assert.equal(decodeAemetBody(latin1(text)), text);
  assert.ok(new TextDecoder("utf-8").decode(latin1(text)).includes("Andaluc�a"), "what .json() made of it");
  assert.equal(decodeAemetBody(new TextEncoder().encode(text)), text);
  assert.equal(decodeAemetBody(new TextEncoder().encode('{"estado":200}')), '{"estado":200}');
  assert.deepEqual(await readAemetJson(new Response(latin1('{"nombre":"Málaga"}'))), { nombre: "Málaga" });

  // 2. The 401 descripcion, decoded: «renovación», not «renovaci�n».
  assert.equal(await readDescripcion(renewal401()), RENEWAL_TEXT);
  assert.equal(await readDescripcion(new Response("Bad Gateway", { status: 502 })), "Bad Gateway");

  // 3. Only a 401 that says «renovación» is an expired key.
  assert.equal(isKeyExpired(401, RENEWAL_TEXT), true);
  assert.equal(isKeyExpired(401, "renovaci�n"), true, "still matches an undecoded body");
  assert.equal(isKeyExpired(401, "API key no valida"), false);
  assert.equal(isKeyExpired(429, RENEWAL_TEXT), false);
  assert.equal(isKeyExpired(401, null), false);
  assert.equal(isKeyExpired(undefined, RENEWAL_TEXT), false);
  // AEMET's data server wraps the same refusal in an HTML 500 (2026-10-20 19:51Z).
  const wrapped = `<html><body><h1>HTTP Status 500 - 401 Unauthorized: &quot;{ &quot;descripcion&quot; : &quot;${RENEWAL_TEXT}&quot;}</h1></body></html>`;
  assert.equal(isKeyExpired(500, wrapped), true);
  assert.equal(isKeyExpired(502, wrapped), true);
  assert.equal(isKeyExpired(500, "<html>Internal Server Error</html>"), false);
  assert.equal(isKeyExpired(500, RENEWAL_TEXT), false, "a 500 without the wrapped 401 is not the key");
  assert.equal(isKeyExpired(429, wrapped), false);

  // 4. The error: generic message (public through /api/health), fixed fingerprint per task.
  const err = new AemetKeyExpiredError("weather");
  assert.ok(err instanceof Error);
  assert.equal(err.message, "AEMET refused the API key (401)");
  assert.ok(!/renov/i.test(err.message));
  assert.deepEqual(err.fingerprint, ["aemet-key-expired", "weather"]);

  // 5. fetchWithRetry: a dropped connection is retried; an HTTP status is not.
  let n = 0;
  const retried = await withFetch(
    () => (++n === 1 ? Promise.reject(socketClosed()) : new Response("ok")),
    () => fetchWithRetry("test", "https://x", {}, "step", 3, 1),
  );
  assert.equal(retried.result.status, 200);
  assert.equal(retried.calls, 2);
  const http500 = await withFetch(
    () => new Response("", { status: 500 }),
    () => fetchWithRetry("test", "https://x", {}, "step", 3, 1),
  );
  assert.equal(http500.result.status, 500);
  assert.equal(http500.calls, 1);
  let gaveUp = 0;
  await assert.rejects(
    withFetch(
      () => {
        gaveUp++;
        return Promise.reject(socketClosed());
      },
      () => fetchWithRetry("test", "https://x", {}, "step", 3, 1),
    ),
    /fetch failed/,
  );
  assert.equal(gaveUp, 3);

  // 6. weather: an expired key throws AemetKeyExpiredError; a socket close on
  // step 1 (the 11:00Z crash of 2026-10-20) is retried.
  await assert.rejects(
    withFetch(() => renewal401(), () => fetchAEMETAlerts("k")),
    (e: unknown) => e instanceof AemetKeyExpiredError && e.fingerprint[1] === "weather",
  );
  await assert.rejects(
    withFetch(
      () => new Response(latin1(JSON.stringify({ descripcion: RENEWAL_TEXT, estado: 401 }))),
      () => fetchAEMETAlerts("k"),
    ),
    AemetKeyExpiredError,
    "estado 401 inside a 200 body",
  );
  await assert.rejects(
    withFetch(() => new Response("", { status: 503 }), () => fetchAEMETAlerts("k")),
    (e: unknown) => !(e instanceof AemetKeyExpiredError) && /503/.test(String(e)),
  );
  let w = 0;
  const weather = await withFetch(
    (url) => {
      w++;
      if (w === 1) return Promise.reject(socketClosed());
      if (url.includes("avisos_cap")) return new Response(JSON.stringify({ estado: 200, datos: "https://datos/x" }));
      return new Response(new Uint8Array(1024)); // an empty tar: no alerts
    },
    () => fetchAEMETAlerts("k"),
  );
  assert.deepEqual(weather.result, []);
  assert.equal(weather.calls, 3, "step 1 twice (retry), step 2 once");

  // 7. aemet-historical: an expired key stops the run; any other failure is a
  // null for that chunk, as before.
  await assert.rejects(
    withFetch(() => renewal401(), () => aemetFetch("https://x/inventario", "k")),
    (e: unknown) => e instanceof AemetKeyExpiredError && e.fingerprint[1] === "aemet-historical",
  );
  const other401 = await withFetch(
    () => new Response(JSON.stringify({ descripcion: "API key no valida", estado: 401 }), { status: 401 }),
    () => aemetFetch("https://x/inventario", "k"),
  );
  assert.equal(other401.result, null);

  console.log("aemet-shared: ok");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
