# Auth Setup — trafico.live

Session-based user authentication via NextAuth v5, alongside the existing API-key auth system (`src/lib/auth.ts`). Both coexist: API-key auth is unchanged; NextAuth handles browser user sessions.

---

## 1. Package Installation

```bash
npm install next-auth@beta @auth/prisma-adapter nodemailer
```

> `nodemailer` is a peer dependency required by NextAuth's built-in email provider.

---

## 2. Environment Variables

Add to `.env` (never commit to git):

```dotenv
# NextAuth core
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://trafico.live

# Email magic-link (Resend SMTP)
RESEND_API_KEY=re_...

# Google OAuth
GOOGLE_CLIENT_ID=<Google Cloud Console>
GOOGLE_CLIENT_SECRET=<Google Cloud Console>

# GitHub OAuth
GITHUB_CLIENT_ID=<GitHub Developer Settings>
GITHUB_CLIENT_SECRET=<GitHub Developer Settings>
```

For local development, use `http://localhost:3000` as `NEXTAUTH_URL`.

---

## 3. Google OAuth App

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web Application)
3. Add these **Authorised redirect URIs**:
   - `https://trafico.live/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (dev)
4. Copy Client ID and Secret into `.env`

---

## 4. GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New
2. Set:
   - **Homepage URL:** `https://trafico.live`
   - **Authorization callback URL:** `https://trafico.live/api/auth/callback/github`
3. For local dev, create a second OAuth App with callback: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Secret into `.env`

---

## 5. Resend SMTP (Email Magic Link)

1. [Create a Resend account](https://resend.com) and verify the domain `trafico.live`
2. Create an API key in the Resend dashboard
3. Set `RESEND_API_KEY` in `.env`
4. NextAuth uses SMTP settings configured in `src/lib/auth-config.ts`:
   - Host: `smtp.resend.com`
   - Port: `465` (TLS)
   - User: `resend`
   - Pass: `RESEND_API_KEY`
   - From: `noreply@trafico.live`

---

## 6. Database Migration

Before NextAuth can function, the Prisma schema must include the auth models (User, Account, Session, VerificationToken). See `docs/PRISMA-PROPOSAL-T4-AUTH.md` for the full proposal.

After T3.6 merges the schema changes:

```bash
npm run db:migrate
```

---

## 7. Auth Routes

| Route | Description |
|-------|-------------|
| `/login` | Magic-link form + Google/GitHub OAuth |
| `/signup` | Same as /login (magic-link creates account on first verify) |
| `/forgot-password` | Request a new magic-link to regain access |
| `/verify-email` | "Check your inbox" screen |
| `/api/auth/[...nextauth]` | NextAuth handler (all OAuth callbacks, CSRF, session) |

---

## 8. Protected Routes

The following routes require an active session (browser). Unauthenticated visitors are redirected to `/login?callbackUrl=<original>`:

- `/dashboard`
- `/flotas/dashboard`
- `/alertas`
- `/account`
- `/admin/*`

API routes (`/api/*`) are NOT affected — they continue to use API-key auth.

---

## 9. Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth-config.ts` | NextAuth options, providers, callbacks |
| `src/lib/auth-client.ts` | Client-side signIn/signOut wrappers |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth GET/POST handler |
| `src/app/(auth)/layout.tsx` | Auth card shell layout |
| `src/middleware.ts` | Session gate for protected routes (S1 T4.10 block) |
