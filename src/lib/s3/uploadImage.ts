// lib/s3/uploadImage.ts
export async function uploadOptimizedImageToS3(file: File, folder = "items") {
  const qs = new URLSearchParams({
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    folder,
  });

  // Try GET first
  let res = await fetch(`/api/s3/presign?${qs.toString()}`);
  if (res.status === 405) {
    // Fallback to POST if host only accepts POST
    res = await fetch(`/api/s3/presign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        folder,
      }),
    });
  }
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  const { uploadUrl, key } = await res.json();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);

  return { key };
}
