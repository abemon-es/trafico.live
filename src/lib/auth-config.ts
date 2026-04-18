/**
 * NextAuth v5 configuration for trafico.live
 * Session-based user auth — separate from API key auth (src/lib/auth.ts).
 *
 * Providers:
 *   - Email magic link (Resend SMTP)
 *   - Google OAuth
 *   - GitHub OAuth
 */

import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/db";

const authConfig: NextAuthConfig = {
  // Use the NextAuth Prisma adapter — requires User/Account/Session/VerificationToken
  // models (see docs/PRISMA-PROPOSAL-T4-AUTH.md for migration).
  adapter: PrismaAdapter(prisma),

  // Database sessions (stored in Session table via Prisma adapter)
  session: {
    strategy: "database",
  },

  // Secret for CSRF tokens and encryption
  secret: process.env.NEXTAUTH_SECRET,

  // ---------------------------------------------------------------------------
  // Providers
  // ---------------------------------------------------------------------------
  providers: [
    // Magic-link email via Resend SMTP
    Resend({
      from: "trafico.live <noreply@trafico.live>",
      server: {
        host: "smtp.resend.com",
        port: 465,
        auth: {
          user: "resend",
          pass: process.env.RESEND_API_KEY,
        },
        secure: true,
      },
      sendVerificationRequest: undefined, // use default NextAuth email template
    }),

    // Google OAuth
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    // GitHub OAuth
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],

  // ---------------------------------------------------------------------------
  // Custom pages
  // ---------------------------------------------------------------------------
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-email",
    error: "/login", // error message appended as ?error=... query param
    newUser: "/account", // after first sign-in
  },

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  callbacks: {
    /**
     * Enrich the session object returned to client components.
     * Always returns { id, email, name, image } on the user object.
     */
    async session({ session, user }) {
      if (session.user && user) {
        session.user = {
          ...session.user,
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      }
      return session;
    },
  },

  // ---------------------------------------------------------------------------
  // Events (optional — hook for logging / side-effects)
  // ---------------------------------------------------------------------------
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        console.info("[auth] new user registered:", user.email);
      }
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
