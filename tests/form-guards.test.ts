/**
 * Guards of the public contact forms (src/lib/form-guards.ts):
 *   - Turnstile fails CLOSED in production when TURNSTILE_SECRET_KEY is
 *     missing (reported as an error, form answers «unavailable»);
 *   - outside production a missing secret lets requests through (setup);
 *   - with a secret: no token → failed; siteverify decides; network error →
 *     failed and reported;
 *   - honeypot: only a non-empty string in the hidden field trips it.
 *
 * node:test run by tsx (project has no test framework); exits 1 on failure.
 *   npm run test:contact-leads
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { HONEYPOT_FIELD, checkTurnstile, honeypotTripped } from "../src/lib/form-guards";

function deps(env: Record<string, string | undefined>, reply?: unknown | Error) {
  const errors: unknown[] = [];
  const calls: Array<{ url: string; body: string }> = [];
  return {
    errors,
    calls,
    d: {
      env,
      onError: (e: unknown) => void errors.push(e),
      fetchImpl: (async (url: string, init: RequestInit) => {
        calls.push({ url, body: String(init.body) });
        if (reply instanceof Error) throw reply;
        return new Response(JSON.stringify(reply ?? { success: true }), { status: 200 });
      }) as unknown as typeof fetch,
    },
  };
}

test("production without TURNSTILE_SECRET_KEY: misconfigured, error reported, no fetch", async () => {
  for (const secret of [undefined, "", "   "]) {
    const h = deps({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: secret });
    assert.equal(await checkTurnstile("any-token", "1.2.3.4", h.d), "misconfigured");
    assert.equal(h.errors.length, 1);
    assert.match(String((h.errors[0] as Error).message), /fail closed/);
    assert.equal(h.calls.length, 0);
  }
});

test("outside production without a secret: allowed (development/setup), nothing reported", async () => {
  for (const NODE_ENV of [undefined, "development", "test"]) {
    const h = deps({ NODE_ENV });
    assert.equal(await checkTurnstile("", "", h.d), "ok");
    assert.equal(h.errors.length, 0);
  }
});

test("with a secret: an empty token fails without calling siteverify", async () => {
  const h = deps({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "k" });
  assert.equal(await checkTurnstile("", "1.2.3.4", h.d), "failed");
  assert.equal(h.calls.length, 0);
});

test("with a secret: siteverify success → ok, anything else → failed", async () => {
  const ok = deps({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "k" }, { success: true });
  assert.equal(await checkTurnstile("tok", "1.2.3.4", ok.d), "ok");
  assert.equal(ok.calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
  assert.match(ok.calls[0].body, /secret=k&response=tok&remoteip=1\.2\.3\.4/);
  for (const reply of [{ success: false }, {}, { success: "true" }]) {
    const h = deps({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "k" }, reply);
    assert.equal(await checkTurnstile("tok", "", h.d), "failed");
  }
});

test("with a secret: a network error fails closed and is reported", async () => {
  const h = deps({ NODE_ENV: "production", TURNSTILE_SECRET_KEY: "k" }, new TypeError("fetch failed"));
  assert.equal(await checkTurnstile("tok", "", h.d), "failed");
  assert.equal(h.errors.length, 1);
});

test("honeypot: only a non-empty string in the hidden field trips it", () => {
  assert.equal(HONEYPOT_FIELD, "website");
  assert.equal(honeypotTripped({ website: "http://spam.example" }), true);
  for (const body of [{}, { website: "" }, { website: "   " }, { website: 1 }, null, "x", { name: "Ana" }]) {
    assert.equal(honeypotTripped(body), false, JSON.stringify(body));
  }
});
