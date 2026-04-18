/**
 * Client-side auth helpers for trafico.live.
 * Wraps next-auth/react — use these in Client Components.
 *
 * NOTE: These functions are intentionally thin wrappers so callers don't need
 * to import next-auth/react directly.
 */

"use client";

import { signIn, signOut } from "next-auth/react";

/**
 * Sign in with a magic-link sent to the given email address.
 * On success, NextAuth redirects to /verify-email.
 *
 * @param email      The user's email address
 * @param callbackUrl  Where to land after the link is clicked (default: /account)
 */
export async function signInMagicLink(
  email: string,
  callbackUrl?: string
): Promise<void> {
  await signIn("resend", {
    email,
    callbackUrl: callbackUrl ?? "/account",
    redirect: false,
  });
}

/**
 * Sign in with an OAuth provider (Google or GitHub).
 * Triggers the OAuth redirect flow.
 *
 * @param provider    "google" | "github"
 * @param callbackUrl  Where to land after OAuth (default: /account)
 */
export async function signInProvider(
  provider: "google" | "github",
  callbackUrl?: string
): Promise<void> {
  await signIn(provider, {
    callbackUrl: callbackUrl ?? "/account",
  });
}

/**
 * Sign out the current user and redirect to the home page.
 */
export async function signOutUser(): Promise<void> {
  await signOut({ callbackUrl: "/" });
}
