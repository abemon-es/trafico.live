/**
 * Cloudflare R2 S3-compatible client wrapper.
 * Bucket: trafico-reports
 * Public base URL: https://reports.trafico.live
 *
 * Required env vars:
 *   R2_ACCOUNT_ID
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET  (default: trafico-reports)
 */
import {
  S3Client,
  PutObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";

const R2_PUBLIC_BASE =
  process.env.R2_PUBLIC_BASE_URL ?? "https://reports.trafico.live";

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID is not set");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

export interface UploadFileOptions {
  /** Object key inside the bucket, e.g. "monthly/2026-04.pdf" */
  key: string;
  /** File content as Buffer or string */
  body: Buffer | string;
  /** MIME type, e.g. "application/pdf" */
  contentType: string;
  /** Cache-Control header (default: public, max-age=86400) */
  cacheControl?: string;
}

/**
 * Upload a file to R2.
 * Retries up to 3 times before logging and skipping (non-blocking).
 */
export async function uploadFile(opts: UploadFileOptions): Promise<string> {
  const bucket = process.env.R2_BUCKET ?? "trafico-reports";
  const input: PutObjectCommandInput = {
    Bucket: bucket,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
    CacheControl: opts.cacheControl ?? "public, max-age=86400",
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const client = getClient();
      await client.send(new PutObjectCommand(input));
      return getPublicUrl(opts.key);
    } catch (err) {
      lastError = err;
      console.warn(`[r2] upload attempt ${attempt}/3 failed for key=${opts.key}:`, err);
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }

  // After 3 failures, log and return empty string (caller must handle gracefully)
  console.error(`[r2] All 3 upload attempts failed for key=${opts.key}. Skipping.`, lastError);
  return "";
}

/**
 * Returns the public URL for a stored object.
 * Works regardless of whether the upload succeeded — useful for deterministic URLs.
 */
export function getPublicUrl(key: string): string {
  const base = R2_PUBLIC_BASE.replace(/\/$/, "");
  const normalizedKey = key.replace(/^\//, "");
  return `${base}/${normalizedKey}`;
}
