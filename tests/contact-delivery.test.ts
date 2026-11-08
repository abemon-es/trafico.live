/**
 * Which channel delivers an accepted contact request
 * (src/lib/contact-delivery.ts), and what the two routes and forms promise.
 *
 *   - SES ok → emailed, copy to BMC One after the response;
 *   - SES fails → the copy to BMC One rescues it if configured;
 *   - no SES, forwarding configured → the copy IS the delivery, awaited;
 *   - neither → no channel (the route answers 503 and says where to write).
 *
 * node:test run by tsx (project has no test framework); exits 1 on failure.
 *   npm run test:contact-leads
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deliverContact, type DeliveryDeps } from "../src/lib/contact-delivery";
import type { ForwardOutcome } from "../src/lib/bmc-forms-forward";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function deps(over: Partial<DeliveryDeps> & { forwardOutcome?: ForwardOutcome; emailThrows?: boolean }) {
  const calls = { emails: 0, now: 0, later: 0 };
  const d: DeliveryDeps = {
    sesConfigured: over.sesConfigured ?? false,
    forwardConfigured: over.forwardConfigured ?? false,
    sendEmails: async () => {
      calls.emails++;
      if (over.emailThrows) throw new Error("ses down");
    },
    forwardNow: async () => {
      calls.now++;
      return over.forwardOutcome ?? { status: "sent", ref: "TL-AAAAAA" };
    },
    forwardLater: () => void calls.later++,
  };
  return { d, calls };
}

test("SES ok: emailed, copy scheduled after the response, nothing awaited", async () => {
  const { d, calls } = deps({ sesConfigured: true, forwardConfigured: true });
  assert.deepEqual(await deliverContact(d), { kind: "emailed" });
  assert.deepEqual(calls, { emails: 1, now: 0, later: 1 });
});

test("SES ok without forwarding: still emailed (the copy skips itself)", async () => {
  const { d, calls } = deps({ sesConfigured: true });
  assert.deepEqual(await deliverContact(d), { kind: "emailed" });
  assert.equal(calls.later, 1);
});

test("no SES, forwarding configured: the copy is the delivery", async () => {
  const { d, calls } = deps({ forwardConfigured: true });
  assert.deepEqual(await deliverContact(d), { kind: "forwarded", ref: "TL-AAAAAA" });
  assert.deepEqual(calls, { emails: 0, now: 1, later: 0 });
});

test("no SES, copy fails: forward-failed with the code, never «received»", async () => {
  const { d } = deps({ forwardConfigured: true, forwardOutcome: { status: "failed", code: 503, attempts: 2 } });
  assert.deepEqual(await deliverContact(d), { kind: "forward-failed", code: "503" });
});

test("SES fails, forwarding configured: rescued by the copy", async () => {
  const { d, calls } = deps({ sesConfigured: true, forwardConfigured: true, emailThrows: true });
  assert.deepEqual(await deliverContact(d), { kind: "forwarded", ref: "TL-AAAAAA" });
  assert.deepEqual(calls, { emails: 1, now: 1, later: 0 });
});

test("SES fails and the copy fails too: email-failed", async () => {
  const { d } = deps({
    sesConfigured: true,
    forwardConfigured: true,
    emailThrows: true,
    forwardOutcome: { status: "failed", code: "timeout", attempts: 2 },
  });
  assert.equal((await deliverContact(d)).kind, "email-failed");
});

test("SES fails without forwarding: email-failed", async () => {
  const { d, calls } = deps({ sesConfigured: true, emailThrows: true });
  assert.equal((await deliverContact(d)).kind, "email-failed");
  assert.equal(calls.now, 0);
});

test("neither channel: no-channel, nothing attempted", async () => {
  const { d, calls } = deps({});
  assert.deepEqual(await deliverContact(d), { kind: "no-channel" });
  assert.deepEqual(calls, { emails: 0, now: 0, later: 0 });
});

test("both routes: honeypot, consent, Turnstile and the shared delivery", () => {
  for (const f of ["src/app/api/contact/route.ts", "src/app/api/contacto/general/route.ts"]) {
    const src = read(f);
    assert.match(src, /honeypotTripped\(/, `${f}: honeypot`);
    assert.match(src, /consentPrivacy !== true/, `${f}: consent required`);
    assert.match(src, /checkTurnstile\(/, `${f}: Turnstile`);
    assert.match(src, /turnstile === "misconfigured"[\s\S]{0,200}status: 503/, `${f}: missing Turnstile secret → 503, not «received»`);
    assert.match(src, /deliverContact\(/, `${f}: shared delivery`);
    assert.match(src, /forwardToBmc\(forwardInput, \{\}, INLINE_RETRY\)/, `${f}: inline copy when it is the delivery`);
    assert.ok(!/console\.log\(/.test(src), `${f}: nothing from the request goes to the log`);
  }
  assert.match(read("src/app/api/contact/route.ts"), /entryPoint: "api_access"/);
  assert.match(read("src/app/api/contacto/general/route.ts"), /entryPoint: "contacto"/);
  // The access-request email interpolates what people typed: escaped.
  assert.match(read("src/app/api/contact/route.ts"), /\$\{escapeHtml\(value\)\}/);
});

test("forms: privacy box, honeypot, generate_lead only after res.ok", () => {
  const forms: Array<[string, string]> = [
    ["src/components/api-landing/RequestAccessForm.tsx", "api_access"],
    ["src/app/sobre/contacto/ContactForm.tsx", "contacto"],
  ];
  for (const [f, location] of forms) {
    const src = read(f);
    assert.match(src, /consentPrivacy:/, `${f}: sends consent`);
    assert.match(src, /<Honeypot /, `${f}: honeypot`);
    const lead = src.indexOf(`trackGenerateLead("${location}")`);
    const okCheck = src.search(/!res\.ok/);
    assert.ok(lead > 0, `${f}: generate_lead ${location}`);
    assert.ok(okCheck > 0 && okCheck < lead, `${f}: generate_lead fires after the res.ok check`);
  }
});

test("the forwarding secret never reaches the browser", () => {
  for (const f of [
    "src/lib/bmc-forms-forward.ts",
    "src/lib/bmc-forms-forward-after.ts",
    "src/components/api-landing/RequestAccessForm.tsx",
    "src/app/sobre/contacto/ContactForm.tsx",
    ".env.example",
  ]) {
    assert.ok(!/NEXT_PUBLIC_BMC/.test(read(f)), `${f}: no NEXT_PUBLIC_ forwarding variable`);
  }
  for (const f of ["src/components/api-landing/RequestAccessForm.tsx", "src/app/sobre/contacto/ContactForm.tsx"]) {
    assert.ok(!/bmc-forms-forward/.test(read(f)), `${f}: client code does not import the forwarder`);
  }
});
