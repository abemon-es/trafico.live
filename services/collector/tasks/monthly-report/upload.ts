/**
 * R2 upload helper for monthly reports.
 * Retries 3x, logs and returns empty string on failure (non-blocking).
 */
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const R2_PUBLIC_BASE =
  process.env.R2_PUBLIC_BASE_URL ?? "https://reports.trafico.live";

export function getPublicUrl(key: string): string {
  const base = R2_PUBLIC_BASE.replace(/\/$/, "");
  return `${base}/${key.replace(/^\//, "")}`;
}

export async function uploadReport(
  key: string,
  buffer: Buffer
): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    console.error("[monthly-report/upload] R2_ACCOUNT_ID not set — skipping upload");
    return "";
  }

  const bucket = process.env.R2_BUCKET ?? "trafico-reports";
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: "application/pdf",
          CacheControl: "public, max-age=86400",
        })
      );
      const url = getPublicUrl(key);
      console.log(`[monthly-report/upload] OK → ${url}`);
      return url;
    } catch (err) {
      lastError = err;
      console.warn(
        `[monthly-report/upload] attempt ${attempt}/3 failed:`,
        err
      );
      if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
    }
  }

  console.error(
    "[monthly-report/upload] All 3 attempts failed. PDF not stored in R2.",
    lastError
  );
  return "";
}
