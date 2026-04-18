/**
 * GET /verify-email/confirm?token=XXX
 *
 * Standalone email-verification token handler.
 * Validates the token against NextAuth's VerificationToken table, marks the
 * user's emailVerified timestamp, deletes the consumed token, and redirects.
 *
 * Success → /account?verified=1
 * Failure → /verify-email?error=invalid_or_expired
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid_or_expired", request.url)
    );
  }

  // Look up the verification token.
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) {
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid_or_expired", request.url)
    );
  }

  if (record.expires < new Date()) {
    // Expired — clean up and report.
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
    return NextResponse.redirect(
      new URL("/verify-email?error=invalid_or_expired", request.url)
    );
  }

  // Token is valid. Mark the user's email as verified.
  // The identifier field in VerificationToken is the user's email address.
  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: record.identifier, emailVerified: null },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.redirect(new URL("/account?verified=1", request.url));
}
