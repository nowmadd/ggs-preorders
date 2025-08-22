const API_BASE = process.env.NEXT_PUBLIC_UPLOAD_API_BASE || ""; // e.g. https://xxxxx.lambda-url.region.on.aws
const PUBLIC_BUCKET = process.env.NEXT_PUBLIC_S3_BUCKET || ""; // e.g. ggs-assets
const PUBLIC_REGION = process.env.NEXT_PUBLIC_AWS_REGION || ""; // e.g. ap-southeast-1

// Build a direct public URL for keys under uploads/items/*
export function buildPublicUrlFromKey(key: string) {
  if (!PUBLIC_BUCKET || !PUBLIC_REGION || !key) return "";
  return `https://${PUBLIC_BUCKET}.s3.${PUBLIC_REGION}.amazonaws.com/${key}`;
}

// If key is a full URL or data-uri, pass-through
export function isUrlLike(s?: string) {
  return !!s && /^(data:|https?:\/\/)/i.test(s);
}

export async function presignPut({
  filename,
  contentType,
  folder, // "items" | "receipts" | etc.
}: {
  filename: string;
  contentType: string;
  folder?: "items" | "receipts" | string;
}): Promise<{ uploadUrl: string; key: string }> {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_UPLOAD_API_BASE");
  const q = new URLSearchParams({
    filename,
    contentType,
    ...(folder ? { folder } : {}),
  });
  const res = await fetch(`${API_BASE}/s3-presign?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to get presigned URL");
  return res.json();
}

export async function presignGet(key: string): Promise<{ url: string }> {
  if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_UPLOAD_API_BASE");
  const q = new URLSearchParams({ key });
  const res = await fetch(`${API_BASE}/s3-geturl?${q.toString()}`);
  if (!res.ok) throw new Error("Failed to get signed GET URL");
  return res.json();
}

/**
 * Resolve a displayable URL for an S3 "key".
 * - If it's a URL/data-uri, return as is.
 * - If it starts with "uploads/items/", return a direct public URL.
 * - Else (e.g., receipts), fetch a signed GET URL.
 */
export async function resolveImageUrl(key?: string | null): Promise<string> {
  if (!key) return "";
  if (isUrlLike(key)) return key;
  if (key.startsWith("uploads/items/")) {
    return buildPublicUrlFromKey(key);
  }
  // private (e.g., receipts)
  const { url } = await presignGet(key);
  return url;
}
