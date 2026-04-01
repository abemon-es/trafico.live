import * as Sentry from "@sentry/nextjs";

/**
 * SWR-compatible fetcher that throws on non-2xx responses.
 * Adds Sentry breadcrumbs for request tracing.
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.message || body.error || `HTTP ${res.status}`);
    (error as any).status = res.status;
    (error as any).url = url;

    Sentry.addBreadcrumb({
      category: "fetch",
      message: `${res.status} ${url}`,
      level: "error",
      data: { status: res.status, url },
    });

    throw error;
  }

  return res.json();
};
