"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useListOffersQuery } from "@/lib/store/api/offersApi";
import OfferCard from "../../components/OfferCard/OfferCard";

function OfferCardSkeleton() {
  return (
    <div className="rounded-[2rem] ring-1 ring-black/5 bg-white p-4 h-[240px] animate-pulse flex flex-col">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gray-200 rounded-md" />
        <div className="h-5 w-1/2 bg-gray-200 rounded" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <div className="h-5 w-24 bg-gray-200 rounded" />
        <div className="h-9 w-20 bg-gray-200 rounded-full" />
      </div>
    </div>
  );
}

const MAX_TAGS = 3;

export default function Home() {
  const {
    data: offers = [],
    isLoading,
    isError,
    refetch,
  } = useListOffersQuery();

  // live countdown re-render
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const offersPrepared = useMemo(
    () =>
      (offers as any[]).map((o) => {
        const tags: string[] = Array.isArray(o.items)
          ? o.items.map((i: any) => i?.name).filter(Boolean)
          : [];
        const displayTags =
          tags.length > MAX_TAGS ? [...tags.slice(0, MAX_TAGS), "…"] : tags;

        return {
          ...o,
          _displayTags: displayTags,
        };
      }),
    [offers, now] // include `now` so countdown inside cards updates each second
  );

  const hasData = Array.isArray(offersPrepared) && offersPrepared.length > 0;

  return (
    <div>
      <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        PREORDER OFFERS
      </h2>

      <section className="mt-5" aria-busy={isLoading}>
        {isError && !isLoading && (
          <div className="p-4 text-red-700 bg-red-50 rounded-lg">
            Failed to load offers.{" "}
            <button
              onClick={() => refetch()}
              className="ml-2 underline font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <OfferCardSkeleton key={i} />
            ))}
          </div>
        )}

        {!isLoading && !isError && !hasData && (
          <div className="rounded-lg border border-dashed p-8 text-center text-gray-500">
            No preorder offers yet.
            <button
              onClick={() => refetch()}
              className="ml-2 inline-flex items-center rounded-full border px-3 py-1 text-sm"
            >
              Refresh
            </button>
          </div>
        )}

        {!isLoading && !isError && hasData && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
            {offersPrepared.map((d: any) => (
              <OfferCard
                key={d.id}
                // 👉 pass the raw S3 key (e.g. "offers/banners/abc.jpg") or full URL
                logoSrc={d.logo || d.banner}
                logoAlt={d.title || "Offer"}
                title={d.title}
                description={d.description}
                tags={d._displayTags}
                endAt={d.end_date}
                href={`/preorder/new?offerId=${encodeURIComponent(d.id)}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
