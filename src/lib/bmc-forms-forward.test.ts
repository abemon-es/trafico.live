/**
 * Tests del reenvío a BMC. Runner: node:test vía tsx (el repo no tiene framework).
 *   npx tsx --test src/lib/bmc-forms-forward.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { forwardToBmc, __resetForwardState, type ForwardInput } from "./bmc-forms-forward";

const ENV = { BMC_FORMS_FORWARD_URL: "https://platform.example/api/public/client-forms/trafico-live-contact", BMC_FORMS_FORWARD_SECRET: "s3cr3t-value-for-tests-0123456789abcdef" };
const INPUT: ForwardInput = {
  name: "Ana Pérez",
  email: "ana.privada@example.com",
  company: "Empresa SL",
  subject: "Consulta general",
  message: "Texto privado del mensaje que no debe salir en el log",
  consentPrivacy: true,
  page: "https://trafico.live/sobre/contacto",
};

function res(status: number, body: unknown = {}, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function harness(responses: Array<Response | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const sleeps: number[] = [];
  const logs: string[] = [];
  let i = 0;
  return {
    calls,
    sleeps,
    logs,
    deps: {
      env: ENV,
      fetchImpl: (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        const r = responses[Math.min(i++, responses.length - 1)];
        if (r instanceof Error) throw r;
        return r;
      }) as unknown as typeof fetch,
      sleep: async (ms: number) => void sleeps.push(ms),
      log: (l: string) => void logs.push(l),
      now: () => new Date("2026-10-10T12:00:00Z"),
    },
  };
}

test("201: envía cabecera, sobre y campos del contrato", async () => {
  __resetForwardState();
  const h = harness([res(201, { ok: true, ref: "TL-7K4Q2M" })]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.deepEqual(out, { status: "sent", ref: "TL-7K4Q2M" });
  assert.equal(h.calls.length, 1);
  const headers = h.calls[0].init.headers as Record<string, string>;
  assert.equal(headers["X-BMC-Forward-Secret"], ENV.BMC_FORMS_FORWARD_SECRET);
  assert.equal(headers["Origin"], undefined);
  const body = JSON.parse(h.calls[0].init.body as string);
  assert.equal(body.language, "es");
  assert.equal(body.page, "https://trafico.live/sobre/contacto");
  assert.equal(body.fields.consentPrivacy, true);
  assert.equal(body.fields.email, "ana.privada@example.com");
  assert.equal(body.fields.phone, undefined);
  assert.equal(h.logs.length, 0);
});

test("400: no se reintenta y se registran solo los nombres de campo", async () => {
  __resetForwardState();
  const h = harness([res(400, { ok: false, error: "invalid", fields: { email: "pattern" } })]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(out, { status: "failed", code: 400, attempts: 3 });
  assert.equal(h.logs.length, 1);
  assert.match(h.logs[0], /status=400/);
  assert.match(h.logs[0], /fields=email/);
});

test("401, 403, 404 y 413 no se reintentan", async () => {
  for (const code of [401, 403, 404, 413]) {
    __resetForwardState();
    const h = harness([res(code)]);
    await forwardToBmc(INPUT, h.deps);
    assert.equal(h.calls.length, 1, `código ${code}`);
    assert.equal(h.logs.length, 1);
  }
});

test("503: 3 intentos con espera creciente y un log final", async () => {
  __resetForwardState();
  const h = harness([res(503), res(503), res(503)]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.sleeps, [2000, 10000]);
  assert.deepEqual(out, { status: "failed", code: 503, attempts: 3 });
  assert.equal(h.logs.length, 1);
  assert.match(h.logs[0], /form=trafico-live-contact/);
  assert.match(h.logs[0], /at=2026-10-10T12:00:00.000Z/);
  assert.match(h.logs[0], /status=503/);
});

test("503 y luego 201: reintenta y acaba enviado", async () => {
  __resetForwardState();
  const h = harness([res(503), res(201, { ok: true, ref: "TL-AAAAAA" })]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.equal(out.status, "sent");
  assert.equal(h.calls.length, 2);
  assert.equal(h.logs.length, 0);
});

test("429 respeta Retry-After y red/timeout se reintentan", async () => {
  __resetForwardState();
  const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
  const h = harness([res(429, {}, { "retry-after": "7" }), new TypeError("fetch failed"), timeout]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.sleeps, [7000, 10000]);
  assert.deepEqual(out, { status: "failed", code: "timeout", attempts: 3 });
});

test("sin variables: se omite, sin llamar a fetch y con una sola línea de log", async () => {
  __resetForwardState();
  const h = harness([res(201)]);
  const deps = { ...h.deps, env: {} };
  const a = await forwardToBmc(INPUT, deps);
  const b = await forwardToBmc(INPUT, deps);
  assert.deepEqual(a, { status: "skipped", reason: "no-config" });
  assert.deepEqual(b, { status: "skipped", reason: "no-config" });
  assert.equal(h.calls.length, 0);
  assert.equal(h.logs.length, 1);
});

test("sin consentimiento marcado: no se reenvía", async () => {
  __resetForwardState();
  const h = harness([res(201)]);
  const out = await forwardToBmc({ ...INPUT, consentPrivacy: false }, h.deps);
  assert.deepEqual(out, { status: "skipped", reason: "no-consent" });
  assert.equal(h.calls.length, 0);
});

test("el log nunca contiene mensaje, correo, nombre ni secreto", async () => {
  __resetForwardState();
  const h = harness([res(503), new Error("boom " + INPUT.email), res(400, { fields: { message: "length" } })]);
  await forwardToBmc(INPUT, h.deps);
  const all = h.logs.join("\n");
  for (const secret of [INPUT.message, INPUT.email, INPUT.name, ENV.BMC_FORMS_FORWARD_SECRET, "platform.example"]) {
    assert.ok(!all.includes(secret), `el log contiene ${secret}`);
  }
  assert.match(all, /fields=message/);
});

test("recorta al máximo del contrato en vez de provocar un 400", async () => {
  __resetForwardState();
  const h = harness([res(201, { ref: "TL-AAAAAA" })]);
  await forwardToBmc({ ...INPUT, message: "x".repeat(6000), name: "n".repeat(300) }, h.deps);
  const body = JSON.parse(h.calls[0].init.body as string);
  assert.equal(body.fields.message.length, 5000);
  assert.equal(body.fields.name.length, 120);
});
