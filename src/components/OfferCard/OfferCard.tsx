// app/components/OfferCard/OfferCard.tsx
"use client";

import Link from "next/link";
import { useS3Image } from "@/lib/s3/useS3Image";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

type Props = {
  logoSrc?: string;
  logoAlt?: string;
  title: string;
  description?: string;
  tags?: string[];
  endAt?: string | Date;
  href: string;
};

function fmtCountdown(endAt?: string | Date) {
  if (!endAt) return "";
  const end = new Date(endAt).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, end - now);

  const d = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  let rem = diffMs - d * 24 * 60 * 60 * 1000;

  const h = Math.floor(rem / (60 * 60 * 1000));
  rem -= h * 60 * 60 * 1000;

  const m = Math.floor(rem / (60 * 1000));
  rem -= m * 60 * 1000;

  const s = Math.floor(rem / 1000);

  return `${d}d ${h}h ${m}m ${s}s`;
}

export default function OfferCard({
  logoSrc,
  logoAlt = "Offer",
  title,
  description,
  tags = [],
  endAt,
  href,
}: Props) {
  const isPreview =
    !!logoSrc && (logoSrc.startsWith("blob:") || logoSrc.startsWith("data:"));
  const resolved = useS3Image(logoSrc);
  const showSrc = isPreview ? logoSrc : resolved;
  const countdown = fmtCountdown(endAt);
  return (
    <div className="rounded-[1rem] ring-1 ring-black/5 bg-white p-4 h-[240px] flex flex-col">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 ring-1 ring-black/5 flex items-center justify-center">
          {showSrc ? (
            <img
              src={showSrc}
              alt={logoAlt}
              className="h-10 w-10 object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gray-200" />
          )}
        </div>
        <div className="font-semibold">{title}</div>
      </div>

      <div className="mt-3 text-sm text-gray-700 line-clamp-2">
        {description}
      </div>
      {!!tags.length && (
        <div className="mt-4 flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="text-xs text-gray-500">{endAt ? countdown : ""}</div>
        <Link href={href}>
          <Button>Preorder</Button>
        </Link>
      </div>
    </div>
  );
}
