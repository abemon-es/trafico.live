# Prisma Schema Proposal — Auth Models (T4 → T3.6)

**Author:** T4.10 (auth subagent, S1)
**Target:** T3.6 (schema owner)
**Status:** PROPOSAL — awaiting T3.6 merge

---

## Overview

NextAuth v5 with the Prisma adapter requires four models:

1. `User` — core identity record
2. `Account` — OAuth provider accounts linked to a User
3. `Session` — database sessions (used by `strategy: "database"`)
4. `VerificationToken` — single-use tokens for magic-link email auth

Additionally, a backfill strategy is needed to create `User` rows for existing `ApiKey` records that have an associated email.

---

## 1. Models

Add the following to `prisma/schema.prisma` (before or after the `ApiKey` model, in the Auth/Billing section):

```prisma
// ---------------------------------------------------------------------------
// Auth — NextAuth v5 / @auth/prisma-adapter standard models
// ---------------------------------------------------------------------------

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]

  // Relation to API keys — a user may have multiple keys (optional link)
  apiKeys       ApiKey[]  @relation("UserApiKeys")

  @@map("users")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}
```

---

## 2. ApiKey Model — add optional userId relation

In the existing `ApiKey` model, add:

```prisma
  // Optional: link key to a User account (null for keys created before auth was added)
  userId    String?
  user      User?   @relation("UserApiKeys", fields: [userId], references: [id], onDelete: SetNull)
```

And add index:

```prisma
  @@index([userId])
```

---

## 3. Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `accounts` | `userId` | Fast account lookup by user |
| `sessions` | `userId` | Fast session lookup by user |
| `sessions` | `sessionToken` (unique) | NextAuth token lookup |
| `verification_tokens` | `(identifier, token)` (unique) | Magic-link token lookup |
| `api_keys` | `userId` | Fast key lookup by owner |

---

## 4. Migration SQL Draft

```sql
-- Create users table
CREATE TABLE "users" (
  "id"             TEXT NOT NULL,
  "name"           TEXT,
  "email"          TEXT NOT NULL,
  "emailVerified"  TIMESTAMP(3),
  "image"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- Create accounts table
CREATE TABLE "accounts" (
  "id"                TEXT NOT NULL,
  "userId"            TEXT NOT NULL,
  "type"              TEXT NOT NULL,
  "provider"          TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token"     TEXT,
  "access_token"      TEXT,
  "expires_at"        INTEGER,
  "token_type"        TEXT,
  "scope"             TEXT,
  "id_token"          TEXT,
  "session_state"     TEXT,
  CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create sessions table
CREATE TABLE "sessions" (
  "id"           TEXT NOT NULL,
  "sessionToken" TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "expires"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create verification_tokens table
CREATE TABLE "verification_tokens" (
  "identifier" TEXT NOT NULL,
  "token"      TEXT NOT NULL,
  "expires"    TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- Add userId FK to api_keys (nullable — backfill separately)
ALTER TABLE "api_keys" ADD COLUMN "userId" TEXT;
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## 5. Backfill — ApiKey → User

After the migration, create `User` rows for any distinct email addresses already present in the `ApiKey` table. Run as a one-shot script:

```sql
-- Insert a User row for each distinct email in api_keys that doesn't already have a user
INSERT INTO "users" ("id", "email", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  ak.email,
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT email FROM "api_keys" WHERE email IS NOT NULL
) ak
WHERE NOT EXISTS (
  SELECT 1 FROM "users" u WHERE u.email = ak.email
);

-- Link existing api_keys to the newly-created users
UPDATE "api_keys" ak
SET "userId" = u.id
FROM "users" u
WHERE ak.email = u.email
  AND ak."userId" IS NULL;
```

---

## 6. Rollback Plan

1. **Drop FK from api_keys:** `ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_userId_fkey"; ALTER TABLE "api_keys" DROP COLUMN "userId";`
2. **Drop auth tables (reverse order):** `DROP TABLE "verification_tokens"; DROP TABLE "sessions"; DROP TABLE "accounts"; DROP TABLE "users";`
3. **No data loss:** `ApiKey` records are unaffected; the `userId` column is nullable and its removal leaves keys intact.
4. **Prisma:** regenerate client (`npm run db:push` or revert migration file).

---

## 7. NextAuth Prisma Adapter Compatibility

The models above follow the exact schema required by `@auth/prisma-adapter` v1.x (NextAuth v5). Reference: https://authjs.dev/getting-started/adapters/prisma

Fields use `@db.Text` for long token values (id_token, refresh_token, access_token) to avoid VARCHAR limits on PostgreSQL.
