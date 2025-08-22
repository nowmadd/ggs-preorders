// lib/images/optimizeImage.ts
export async function optimizeImage(
  file: File,
  opts: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<{ blob: Blob; suggestedFilename: string }> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.5 } = opts;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  const targetW = Math.round(width * ratio);
  const targetH = Math.round(height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), type, quality)
  );

  // preserve extension
  const base = file.name.replace(/\.[^.]+$/, "");
  const suggestedFilename = `${base}.${type === "image/png" ? "png" : "jpg"}`;
  return { blob, suggestedFilename };
}
