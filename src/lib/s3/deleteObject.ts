export async function deleteS3Object(key: string) {
  if (!key) return { ok: true };
  const res = await fetch("/api/s3/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Failed to delete S3 object");
  }
  return res.json() as Promise<{ ok: boolean }>;
}
