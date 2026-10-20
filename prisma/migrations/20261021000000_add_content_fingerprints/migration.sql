-- ContentFingerprint: the real lastmod of sitemap pages.
-- See services/collector/tasks/content-fingerprints and src/lib/seo/lastmod.ts.
--
-- The app role has no DDL: apply as trafico_admin, then
-- `prisma migrate resolve --applied 20261021000000_add_content_fingerprints`
-- (PLAYBOOK, "Migrations do NOT auto-apply").

CREATE TABLE IF NOT EXISTS "content_fingerprints" (
    "key"       TEXT PRIMARY KEY,
    "hash"      TEXT NOT NULL,
    "changedAt" TIMESTAMPTZ(3),
    "checkedAt" TIMESTAMPTZ(3) NOT NULL
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trafico_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "content_fingerprints" TO trafico_app;
  END IF;
END
$$;
