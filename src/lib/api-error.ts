import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";

/**
 * Report an API route error to both console and Sentry.
 * Use in catch blocks instead of bare console.error().
 */
export function reportApiError(
  error: unknown,
  context: string,
  request?: NextRequest | Record<string, unknown>
) {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[${context}]`, err.message);

  // Extract request context if available
  const extra: Record<string, unknown> = {};
  if (request instanceof Request) {
    extra.url = request.url;
    extra.method = request.method;
    const params = new URL(request.url).searchParams.toString();
    if (params) extra.params = params;
  } else if (request) {
    Object.assign(extra, request);
  }

  Sentry.captureException(err, {
    tags: { api_route: context },
    extra,
  });
}
