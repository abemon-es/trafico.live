/**
 * Copy of the contact forms to BMC One (src/lib/bmc-forms-forward.ts), under
 * the platform's client-forms contract: header, envelope, retries, and a log
 * that never carries the person's data or the secret.
 *
 * node:test run by tsx (project has no test framework); exits 1 on failure.
 *   npm run test:contact-leads
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKGROUND_RETRY,
  INLINE_RETRY,
  __resetForwardState,
  forwardToBmc,
  isBmcForwardConfigured,
  type ForwardInput,
} from "../src/lib/bmc-forms-forward";

const ENV = {
  BMC_FORMS_FORWARD_URL: "https://platform.example/api/public/client-forms/trafico-live-contact",
  BMC_FORMS_FORWARD_SECRET: "s3cr3t-value-for-tests-0123456789abcdef",
};
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

function harness(responses: Array<Response | Error>, env: Record<string, string | undefined> = ENV) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const sleeps: number[] = [];
  const logs: string[] = [];
  let i = 0;
  return {
    calls,
    sleeps,
    logs,
    deps: {
      env,
      fetchImpl: (async (url: string, init: RequestInit) => {
        calls.push({ url, init });
        const r = responses[Math.min(i++, responses.length - 1)];
        if (r instanceof Error) throw r;
        return r;
      }) as unknown as typeof fetch,
      sleep: async (ms: number) => void sleeps.push(ms),
      log: (l: string) => void logs.push(l),
      now: () => new Date("2026-11-08T12:00:00Z"),
    },
  };
}

test("201: header, envelope and contract fields; no Origin", async () => {
  __resetForwardState();
  const h = harness([res(201, { ok: true, ref: "TL-7K4Q2M" })]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.deepEqual(out, { status: "sent", ref: "TL-7K4Q2M" });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, ENV.BMC_FORMS_FORWARD_URL);
  const headers = h.calls[0].init.headers as Record<string, string>;
  assert.equal(headers["X-BMC-Forward-Secret"], ENV.BMC_FORMS_FORWARD_SECRET);
  assert.equal(headers["Origin"], undefined);
  assert.equal(h.calls[0].init.redirect, "error");
  const body = JSON.parse(h.calls[0].init.body as string);
  assert.equal(body.language, "es");
  assert.equal(body.page, "https://trafico.live/sobre/contacto");
  assert.deepEqual(Object.keys(body.fields).sort(), ["company", "consentPrivacy", "email", "message", "name", "subject"]);
  assert.equal(body.fields.consentPrivacy, true);
  assert.equal(body.entryPoint, undefined, "optional: the platform defaults to contacto");
  assert.equal(h.logs.length, 0);
});

test("entryPoint goes at the root of the envelope, never inside fields", async () => {
  for (const entryPoint of ["api_access", "contacto"] as const) {
    __resetForwardState();
    const h = harness([res(201, { ok: true, ref: "TL-7K4Q2M" })]);
    await forwardToBmc({ ...INPUT, entryPoint }, h.deps);
    const body = JSON.parse(h.calls[0].init.body as string);
    assert.equal(body.entryPoint, entryPoint);
    assert.equal(body.fields.entryPoint, undefined);
  }
});

test("400: not retried, logs only field names and the real attempt count", async () => {
  __resetForwardState();
  const h = harness([res(400, { ok: false, error: "invalid", fields: { email: "pattern" } })]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.equal(h.calls.length, 1);
  assert.deepEqual(out, { status: "failed", code: 400, attempts: 1 });
  assert.equal(h.logs.length, 1);
  assert.match(h.logs[0], /status=400 attempts=1 fields=email$/);
});

test("401, 403, 404 and 413 are not retried", async () => {
  for (const code of [401, 403, 404, 413]) {
    __resetForwardState();
    const h = harness([res(code)]);
    const out = await forwardToBmc(INPUT, h.deps);
    assert.equal(h.calls.length, 1, `code ${code}`);
    assert.deepEqual(out, { status: "failed", code, attempts: 1 });
    assert.equal(h.logs.length, 1);
  }
});

test("background: 503 three times, 2 s and 10 s waits, one final log", async () => {
  __resetForwardState();
  const h = harness([res(503), res(503), res(503)]);
  const out = await forwardToBmc(INPUT, h.deps, BACKGROUND_RETRY);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.sleeps, [2000, 10000]);
  assert.deepEqual(out, { status: "failed", code: 503, attempts: 3 });
  assert.equal(h.logs.length, 1);
  assert.match(h.logs[0], /form=trafico-live-contact at=2026-11-08T12:00:00.000Z status=503 attempts=3/);
});

test("inline (visitor waiting): two attempts, waits capped at 1 s even with Retry-After", async () => {
  __resetForwardState();
  const h = harness([res(429, {}, { "retry-after": "30" }), res(503)]);
  const out = await forwardToBmc(INPUT, h.deps, INLINE_RETRY);
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.sleeps, [1000]);
  assert.deepEqual(out, { status: "failed", code: 503, attempts: 2 });
});

test("503 then 201: retried and sent, nothing logged", async () => {
  __resetForwardState();
  const h = harness([res(503), res(201, { ok: true, ref: "TL-AAAAAA" })]);
  const out = await forwardToBmc(INPUT, h.deps);
  assert.deepEqual(out, { status: "sent", ref: "TL-AAAAAA" });
  assert.equal(h.calls.length, 2);
  assert.equal(h.logs.length, 0);
});

test("background: 429 honours Retry-After; network and timeout errors are retried", async () => {
  __resetForwardState();
  const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
  const h = harness([res(429, {}, { "retry-after": "7" }), new TypeError("fetch failed"), timeout]);
  const out = await forwardToBmc(INPUT, h.deps, BACKGROUND_RETRY);
  assert.equal(h.calls.length, 3);
  assert.deepEqual(h.sleeps, [7000, 10000]);
  assert.deepEqual(out, { status: "failed", code: "timeout", attempts: 3 });
});

test("no config, or a non-https URL: skipped without fetch, logged once", async () => {
  __resetForwardState();
  for (const env of [{}, { ...ENV, BMC_FORMS_FORWARD_URL: "http://platform.example/x" }, { ...ENV, BMC_FORMS_FORWARD_SECRET: " " }]) {
    assert.equal(isBmcForwardConfigured(env), false);
  }
  assert.equal(isBmcForwardConfigured(ENV), true);
  const h = harness([res(201)], {});
  const a = await forwardToBmc(INPUT, h.deps);
  const b = await forwardToBmc(INPUT, h.deps);
  assert.deepEqual(a, { status: "skipped", reason: "no-config" });
  assert.deepEqual(b, { status: "skipped", reason: "no-config" });
  assert.equal(h.calls.length, 0);
  assert.equal(h.logs.length, 1);
});

test("privacy box not ticked: never forwarded", async () => {
  __resetForwardState();
  const h = harness([res(201)]);
  const out = await forwardToBmc({ ...INPUT, consentPrivacy: false }, h.deps);
  assert.deepEqual(out, { status: "skipped", reason: "no-consent" });
  assert.equal(h.calls.length, 0);
});

test("the log never contains the message, email, name, secret or URL", async () => {
  __resetForwardState();
  const h = harness([res(503), new Error("boom " + INPUT.email), res(400, { fields: { message: "length" } })]);
  await forwardToBmc(INPUT, h.deps, BACKGROUND_RETRY);
  const all = h.logs.join("\n");
  for (const secret of [INPUT.message, INPUT.email, INPUT.name, ENV.BMC_FORMS_FORWARD_SECRET, "platform.example"]) {
    assert.ok(!all.includes(secret), `log contains ${secret}`);
  }
  assert.match(all, /fields=message/);
});

test("trims to the contract maxima instead of causing a 400", async () => {
  __resetForwardState();
  const h = harness([res(201, { ref: "TL-AAAAAA" })]);
  await forwardToBmc({ ...INPUT, message: "x".repeat(6000), name: "n".repeat(300) }, h.deps);
  const body = JSON.parse(h.calls[0].init.body as string);
  assert.equal(body.fields.message.length, 5000);
  assert.equal(body.fields.name.length, 120);
});
