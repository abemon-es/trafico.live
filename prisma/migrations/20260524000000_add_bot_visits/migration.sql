-- AI bot observability table — citaciones-ia dashboard
-- Each row is one request from a known AI/LLM crawler.
-- IP stored as first-2-octet prefix only (no PII).
-- Apply as trafico_admin; grants DML to trafico_app via RLS defaults.

CREATE TABLE IF NOT EXISTS "bot_visits" (
    "id"          TEXT PRIMARY KEY,
    "bot"         TEXT NOT NULL,
    "path"        TEXT NOT NULL,
    "statusCode"  INTEGER NOT NULL DEFAULT 200,
    "ip"          TEXT,
    "country"     TEXT,
    "userAgent"   TEXT NOT NULL DEFAULT '',
    "visitedAt"   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "bot_visits_bot_visitedAt_idx"  ON "bot_visits" ("bot", "visitedAt");
CREATE INDEX IF NOT EXISTS "bot_visits_visitedAt_idx"      ON "bot_visits" ("visitedAt");
CREATE INDEX IF NOT EXISTS "bot_visits_path_visitedAt_idx" ON "bot_visits" ("path", "visitedAt");
