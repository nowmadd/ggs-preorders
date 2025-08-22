"use client";
import { useS3Image } from "@/lib/s3/useS3Image";

export default function S3Thumb({
  src,
  alt,
  className,
  emptyClassName,
  defaultFolder = "items", // if snapshot only has "uuid.png"
}: {
  src?: string | null;
  alt: string;
  className?: string;
  emptyClassName?: string;
  defaultFolder?: string;
}) {
  // If we got just "uuid.png", assume it's under items/
  const keyOrUrl = !src
    ? undefined
    : /^(https?:|data:|blob:)/i.test(src)
    ? src
    : src.includes("/")
    ? src
    : `${defaultFolder}/${src}`;

  const url = useS3Image(keyOrUrl);
  if (!url) return <div className={emptyClassName || className} />;

  return <img src={url} alt={alt} className={className} />;
}
