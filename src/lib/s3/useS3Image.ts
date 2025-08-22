import { useEffect, useState } from "react";

// in-memory cache for presigned URLs
const cache = new Map<string, string>();

// Keep existing hook as-is
export function useS3Image(src?: string) {
  const [url, setUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!src) return setUrl(undefined);

    if (/^data:|^https?:\/\//i.test(src)) {
      setUrl(src);
      return;
    }

    const key = src;
    if (cache.has(key)) {
      setUrl(cache.get(key));
      return;
    }

    let alive = true;
    (async () => {
      try {
        const q = new URLSearchParams({ key });
        const r = await fetch(`/api/s3/geturl?${q.toString()}`);
        if (!r.ok) throw new Error(`geturl failed (${r.status})`);
        const { url } = await r.json();
        if (!alive) return;
        cache.set(key, url);
        setUrl(url);
      } catch {
        if (alive) setUrl(undefined);
      }
    })();

    return () => {
      alive = false;
    };
  }, [src]);

  return url;
}

/** Resolve a single image to a final URL (respects http(s)/data/blob). */
export async function resolveS3Image(
  src?: string,
  defaultFolder = "items"
): Promise<string | undefined> {
  if (!src) return undefined;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  // allow bare filenames: put them under /items by default
  const key = src.includes("/") ? src : `${defaultFolder}/${src}`;

  if (cache.has(key)) return cache.get(key);
  const q = new URLSearchParams({ key });
  const r = await fetch(`/api/s3/geturl?${q.toString()}`);
  if (!r.ok) return undefined;
  const { url } = await r.json();
  cache.set(key, url);
  return url;
}

/** Prefetch many images before render. Returns a map from original src → resolved URL. */
export async function prefetchS3Images(
  sources: (string | undefined)[],
  defaultFolder = "items"
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    sources.map(async (s) => {
      const u = await resolveS3Image(s, defaultFolder);
      if (s && u) out[s] = u;
    })
  );
  return out;
}
