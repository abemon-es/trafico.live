-- NewsletterSubscriber — email collection for trafico.live newsletter.
-- GDPR proof-of-consent: stores hashed/truncated IP + user-agent + timestamp.
-- ip stored as first-2-octet prefix only (no full PII).
--
-- Must be applied as trafico_admin (trafico_app lacks DDL / CREATE privilege).
-- The GRANT block at the end is idempotent via DO $$ IF EXISTS $$.

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id"             TEXT NOT NULL,
    "email"          TEXT NOT NULL,
    "source"         TEXT,
    "ip"             TEXT,
    "userAgent"      TEXT,
    "country"        TEXT,
    "status"         TEXT NOT NULL DEFAULT 'active',
    "subscribedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMPTZ(3),

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_key"
    ON "newsletter_subscribers" ("email");

CREATE INDEX IF NOT EXISTS "newsletter_subscribers_subscribedAt_idx"
    ON "newsletter_subscribers" ("subscribedAt");

CREATE INDEX IF NOT EXISTS "newsletter_subscribers_status_subscribedAt_idx"
    ON "newsletter_subscribers" ("status", "subscribedAt");

-- Grant DML to the app role so the API route can upsert subscribers.
-- DO block keeps this idempotent across envs (dev may lack trafico_app).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trafico_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "newsletter_subscribers" TO trafico_app;
  END IF;
END
$$;
