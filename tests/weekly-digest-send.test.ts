/**
 * Weekly digest send rules: SES credentials alone never mail the list, a
 * test send reaches one address only, every email carries List-Unsubscribe,
 * the list goes out paced, and the email links get past the API gate.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:weekly-digest
 */

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { NextRequest } from "next/server";
import { digestEmailInput, digestMode, pacingMs } from "../services/collector/tasks/weekly-digest/send";
import { authenticateRequest } from "../src/lib/auth";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules") return [];
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(name) ? [p] : [];
  });
}

function main() {
  // Mode: credentials are not consent to send.
  assert.deepEqual(digestMode({}, []), { kind: "off", reason: "DIGEST_SEND_ENABLED is not true" });
  assert.equal(digestMode({ AWS_SES_ACCESS_KEY: "k", AWS_SES_SECRET_KEY: "s" }, []).kind, "off");
  assert.equal(digestMode({ DIGEST_SEND_ENABLED: "1" }, []).kind, "off");
  assert.deepEqual(digestMode({ DIGEST_SEND_ENABLED: "true" }, []), { kind: "list" });
  // A test address wins over the list switch, and must be exactly one address.
  assert.deepEqual(digestMode({ DIGEST_SEND_ENABLED: "true", DIGEST_TEST_TO: " Prueba@Ejemplo.es " }, []), {
    kind: "test",
    to: "prueba@ejemplo.es",
  });
  for (const bad of ["a@b.es,c@d.es", "a@b.es; c@d.es", "nadie", "a b@c.es"]) {
    assert.throws(() => digestMode({ DIGEST_TEST_TO: bad }, []), /single email address/, bad);
  }
  assert.deepEqual(digestMode({ DIGEST_TEST_TO: "a@b.es" }, ["--preview"]), { kind: "preview" });

  // Pacing: default 5/s, never above SES's 14/s starting limit.
  assert.equal(pacingMs({}), 200);
  assert.equal(pacingMs({ DIGEST_MAX_PER_SECOND: "2" }), 500);
  assert.equal(pacingMs({ DIGEST_MAX_PER_SECOND: "100" }), 72);
  assert.equal(pacingMs({ DIGEST_MAX_PER_SECOND: "0" }), 200);
  assert.equal(pacingMs({ DIGEST_MAX_PER_SECOND: "x" }), 200);

  // Email: one recipient, List-Unsubscribe + one-click, SES-safe tag values.
  const input = digestEmailInput({
    from: "trafico.live <noticias@trafico.live>",
    to: "a@b.es",
    subject: "s",
    html: "<p>h</p>",
    text: "t",
    unsubscribeUrl: "https://trafico.live/api/digest/unsubscribe?token=abc",
    weekLabel: "19 – 25 oct 2026",
  });
  assert.deepEqual(input.Destination, { ToAddresses: ["a@b.es"] });
  assert.deepEqual(input.Content?.Simple?.Headers, [
    { Name: "List-Unsubscribe", Value: "<https://trafico.live/api/digest/unsubscribe?token=abc>" },
    { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
  ]);
  for (const tag of input.EmailTags ?? []) assert.match(tag.Value ?? "", /^[A-Za-z0-9_-]+$/, tag.Name);

  // The test branch returns before the subscriber list is ever read.
  const run = readFileSync(join(ROOT, "services/collector/tasks/weekly-digest/index.ts"), "utf8");
  const testReturn = run.indexOf('if (mode.kind === "test")');
  assert.ok(testReturn > 0 && testReturn < run.indexOf("digestSubscriber.findMany"), "test send precedes the list read");
  assert.ok(run.indexOf('mode.kind === "off"') < run.indexOf("await getSESClient()"), "off exits before SES is touched");

  // One sender only: nothing else in the collector mails the subscriber list.
  const senders = files(join(ROOT, "services"))
    .filter((f) => /digestSubscriber\.findMany/.test(readFileSync(f, "utf8")))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(senders, ["services/collector/tasks/weekly-digest/index.ts"]);

  // The links in the emails reach their routes from a mail client.
  const req = (method: string, path: string, headers: Record<string, string> = {}) =>
    authenticateRequest(new NextRequest(`https://trafico.live${path}`, { method, headers }));
  assert.equal(req("GET", "/api/digest/confirm?token=x"), null);
  assert.equal(req("GET", "/api/digest/unsubscribe?token=x", { referer: "https://mail.google.com/" }), null);
  assert.equal(req("POST", "/api/digest/unsubscribe?token=x"), null);
  // Exact paths only: the rest of the API stays gated.
  assert.equal(req("POST", "/api/digest/subscribe")?.status, 401);
  assert.equal(req("GET", "/api/digest/unsubscribe-all")?.status, 401);

  console.log("weekly-digest-send: OK");
}

main();
