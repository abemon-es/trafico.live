/**
 * No email sender (decision of 09-11-2026: no SES), so no page offers the
 * weekly digest (src/lib/email/digest-signup.ts):
 *   - the switch is off;
 *   - /informes renders DigestForm only behind it;
 *   - the access request form shows the newsletter checkbox, calls
 *     /api/digest/subscribe and records newsletter_signup only behind it;
 *   - the footer still does not render NewsletterCTA.
 *
 * node:test run by tsx; exits 1 on failure.
 *   npm run test:digest-signup-hidden
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIGEST_SIGNUP_ENABLED } from "../src/lib/email/digest-signup";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const read = (p: string) => readFileSync(join(HERE, "..", p), "utf8");

test("the digest sign-up switch is off while there is no sender", () => {
  assert.equal(DIGEST_SIGNUP_ENABLED, false);
});

test("/informes renders the digest form only behind the switch", () => {
  const page = read("src/app/informes/page.tsx");
  assert.match(page, /\{DIGEST_SIGNUP_ENABLED && \(\s*<div[^>]*>\s*<DigestForm \/>/);
  assert.equal((page.match(/<DigestForm \/>/g) ?? []).length, 1);
});

test("the access request form hides the checkbox, the call and the GA4 event", () => {
  const form = read("src/components/api-landing/RequestAccessForm.tsx");
  assert.match(form, /if \(DIGEST_SIGNUP_ENABLED && form\.newsletter\) \{\s*trackNewsletterSignupEvent/);
  assert.match(form, /\{DIGEST_SIGNUP_ENABLED && \(\s*<div className="flex items-start gap-3">\s*<input\s*id=\{`\$\{formId\}-newsletter`\}/);
  assert.equal((form.match(/fetch\("\/api\/digest\/subscribe"/g) ?? []).length, 1);
});

test("the footer does not render the newsletter CTA", () => {
  const footer = read("src/components/layout/Footer.tsx");
  const code = footer.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  assert.ok(!/<NewsletterCTA\b/.test(code), "NewsletterCTA must stay out of the footer");
});
