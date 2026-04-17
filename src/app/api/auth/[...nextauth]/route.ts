/**
 * NextAuth v5 route handler.
 * Handles all /api/auth/* requests (sign-in, sign-out, callbacks, CSRF, etc.)
 */

import { handlers } from "@/lib/auth-config";

export const { GET, POST } = handlers;
