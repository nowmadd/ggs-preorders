function srcFromKeyOrUrl(src?: string | null) {
  if (!src) return "";
  // pass through absolute URLs / data/blob / already-relative
  if (/^(https?:|data:|blob:|\/)/i.test(src)) return src;
  // treat as S3 key -> sign via our API route
  return `/api/s3/get-url?key=${encodeURIComponent(src)}`;
}
