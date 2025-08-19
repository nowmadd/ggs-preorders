"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useGetOfferQuery } from "@/lib/store/api/offersApi";
import { prefetchS3Images, resolveS3Image } from "@/lib/s3/useS3Image";
import { useGlobalSheet } from "@/components/GlobalSheetProvider/GlobalSheetProvider";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatDate } from "@/lib/utils";
import ProductQuantityInput from "@/components/ProductQuantityInput/ProductQuantityInput";

type OfferItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number;
  category?: string;
  releaseDate?: string;
  image?: string; // can be URL, S3 key "items/xxx.png", or bare "xxx.png"
  images?: string[];
  title?: string;
  game: any;
};

type OfferWithItems = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  active: boolean;
  items?: OfferItem[];
};

export default function NewPreorderFromOfferPage() {
  const router = useRouter();
  const offerId = useSearchParams()?.get("offerId") ?? undefined;
  const { data: session } = useSession();
  const { show } = useGlobalSheet();

  const {
    data: offer,
    isLoading,
    isError,
    refetch,
  } = useGetOfferQuery(offerId as string, { skip: !offerId });

  // qty per itemId
  const [qty, setQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    msg: string;
  }>(null);

  //UI until we have all item images resolved ----
  const [imagesReady, setImagesReady] = useState(false);
  const [resolvedThumbs, setResolvedThumbs] = useState<Record<string, string>>(
    {}
  );

  // When offer loads, pre-resolve all primary images
  useEffect(() => {
    (async () => {
      if (!offer?.items) return;
      setImagesReady(false);

      // Collect all possible sources
      const sources: string[] = [];
      for (const it of offer.items) {
        if (it.image) sources.push(it.image);

        if (Array.isArray(it.images) && it.images[0])
          sources.push(it.images[0]);
      }

      const map = await prefetchS3Images(sources, "items");
      // Build an id → resolvedURL mapping for easy access in render
      const byId: Record<string, string> = {};
      for (const it of offer.items) {
        const src = it.image;
        if (src) {
          // ensure we also handle bare filenames
          const url =
            map[src] || (await resolveS3Image(src, "items")) || undefined;
          if (url) byId[it.id] = url;
        }
      }
      setResolvedThumbs(byId);
      setImagesReady(true);
    })();
  }, [offer?.items]);

  useEffect(() => {
    if (offer?.items) {
      const init: Record<string, number> = {};
      for (const it of offer.items) init[it.id] = 0;
      setQty(init);
    }
  }, [offer?.items]);

  const setItemQty = (id: string, val: number) => {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(val || 0)) }));
  };

  const fmt = (n: number) => `₱${(n || 0).toLocaleString()}`;
  const short = (s?: string, n = 100) =>
    s ? (s.length > n ? s.slice(0, n).trim() + "…" : s) : "";

  // Compute line totals using discounted price
  const { totalPrice, totalDP, lines } = useMemo(() => {
    const items = (offer?.items ?? []) as OfferItem[];
    let price = 0;
    let dpTotal = 0;
    const lineRows = items.map((it) => {
      const q = qty[it.id] || 0;
      const base = Number(it.price || 0);
      const discPct = Number(it.discount || 0);
      const dp = Number(it.dp || 0);
      const finalUnit = Math.max(0, Math.round((base * (100 - discPct)) / 100));
      const lineTotal = finalUnit * q;
      const lineDp = dp * q;
      price += lineTotal;
      dpTotal += lineDp;
      return {
        ...it,
        q,
        unitBasePrice: base,
        unitDiscountPct: discPct,
        unitFinalPrice: finalUnit,
        unitDp: dp,
        lineTotal,
        lineDp,
      };
    });
    return { totalPrice: price, totalDP: dpTotal, lines: lineRows };
  }, [offer?.items, qty]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (!offerId) {
      setStatus({ type: "error", msg: "Missing offerId in URL." });
      return;
    }

    const anyQty = Object.values(qty).some((v) => (v || 0) > 0);
    if (!anyQty) {
      setStatus({
        type: "error",
        msg: "Please enter at least one item quantity.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const customerId = (session?.user as any)?.id || null;

      const payload = {
        offer_id: offerId,
        customer_id: customerId,
        items: lines
          .filter((l) => l.q > 0)
          .map((l) => ({
            item_id: l.id,
            quantity: l.q,
            snapshot: {
              id: l.id,
              name: l.name,
              description: l.description,
              category: l.category,
              releaseDate: l.releaseDate,
              image: l.image,
              images: l.images ?? [],
              price: l.unitBasePrice,
              discount: l.unitDiscountPct,
              dp: l.unitDp,
            },
            pricing: {
              unit_price: l.unitBasePrice,
              unit_discount_pct: l.unitDiscountPct,
              unit_final_price: l.unitFinalPrice,
              unit_dp: l.unitDp,
              line_total_price: l.lineTotal,
              line_total_dp: l.lineDp,
            },
          })),
        totals: { price: totalPrice, downpayment: totalDP },
      };

      const res = await fetch("/api/preorders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Create preorder failed");

      const data: { preorder_id?: string } = await res.json();
      if (!data.preorder_id) throw new Error("Missing preorder_id from server");

      router.push(`/preorders/${encodeURIComponent(data.preorder_id)}`);
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        msg: "Could not create preorder. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!offerId) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-semibold">Create Preorder</h1>
        <p className="text-gray-700">
          No <code>offerId</code> provided. Go back to{" "}
          <Link href="/" className="text-sky-700 hover:underline">
            Preorders
          </Link>{" "}
          and pick an offer.
        </p>
      </div>
    );
  }

  // Offer fetching
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-3">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!isLoading && offer && !imagesReady) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-3">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          {isError ? "Failed to load offer." : "Offer not found."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-3 py-2 rounded border hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Preorder: {offer.title}</h1>
          <p className="text-sm text-gray-600 mt-1">Offer ID: {offer.id}</p>
        </div>
        <Link href={`/`} className="px-3 py-2 rounded border hover:bg-gray-50">
          Back to Offer
        </Link>
      </div>

      {status && (
        <div
          className={`p-3 rounded ${
            status.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.msg}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded border p-4 space-y-6"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Release</th>
                <th className="py-2 px-3 text-right">Unit Price</th>
                <th className="py-2 px-3 text-right">Unit DP</th>
                <th className="py-2 px-3 text-right">Qty</th>
                <th className="py-2 px-3 text-right">Line Price</th>
                <th className="py-2 px-3 text-right">Line DP</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const q = qty[l.id] || 0;
                const thumb = resolvedThumbs[l.id]; // resolved URL ready
                return (
                  <>
                    <tr key={l.id} className="border-b last:border-0 align-top">
                      <td className="py-2 px-3">
                        <div className="flex gap-3">
                          <div className="w-12 aspect-square rounded border bg-gray-50 overflow-hidden shrink-0">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={l.title?.trim() || l.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-100" />
                            )}
                          </div>
                          <div className="min-w-[220px]">
                            <div
                              className="cursor-pointer font-medium"
                              onClick={() => {
                                show({
                                  side: "bottom",
                                  content: (
                                    <div className="flex flex-col justify-center pb-5 gap-5">
                                      <div className="flex flex-col justify-center pb-5 gap-5">
                                        <div className="px-10">
                                          <h2 className="text-2xl font-bold">
                                            {l.title?.trim() || l.name}
                                          </h2>
                                          <p className="text-sm text-gray-500">
                                            ID: {l.id}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-[20%_80%] gap-4 px-10">
                                          <div className="flex items-center justify-center border rounded-md p-2">
                                            {thumb ? (
                                              <img
                                                src={thumb}
                                                alt={l.title?.trim() || l.name}
                                                className="w-50 h-50 object-contain"
                                              />
                                            ) : (
                                              <div className="w-50 h-50 bg-gray-100" />
                                            )}
                                          </div>

                                          <table className="w-full border-collapse">
                                            <tbody>
                                              <tr className="border-t">
                                                <td className="w-[20%] border px-4 py-2 text-left">
                                                  Release Date
                                                </td>
                                                <td className="border px-4 py-2 text-left">
                                                  {l.releaseDate
                                                    ? formatDate(l.releaseDate)
                                                    : "No date"}
                                                </td>
                                              </tr>
                                              <tr className=" border-t">
                                                <td className=" w-[20%] border px-4 py-2 text-left">
                                                  Description
                                                </td>
                                                <td className="border px-4 py-2 text-left whitespace-pre-line">
                                                  {l.description}
                                                </td>
                                              </tr>

                                              <tr className="border-t">
                                                <td className=" w-[20%] border px-4 py-2 text-left">
                                                  Price
                                                </td>
                                                <td className="border px-4 py-2 text-left">
                                                  {l.price}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  ),
                                });
                              }}
                            >
                              {l.title?.trim() || l.name}
                            </div>
                            <div className="text-xs text-gray-500">{l.id}</div>
                            {/* {l.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {short(l.description, 120)}
                            </div>
                          )} */}
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3">{l.category || "—"}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {l.releaseDate
                          ? new Date(l.releaseDate).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        {l.unitDiscountPct > 0 ? (
                          <div className="space-y-0.5">
                            <div className="line-through text-gray-500">
                              {fmt(l.unitBasePrice)}
                            </div>
                            <div className="font-medium">
                              {fmt(l.unitFinalPrice)}
                            </div>
                            <div className="text-[11px] text-emerald-700">
                              -{l.unitDiscountPct}%
                            </div>
                          </div>
                        ) : (
                          <div className="font-medium">
                            {fmt(l.unitBasePrice)}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">{fmt(l.unitDp)}</td>

                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={q}
                          onChange={(e) =>
                            setItemQty(l.id, Number(e.target.value))
                          }
                          className="w-20 border rounded p-1 text-right"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </td>

                      <td className="py-2 px-3 text-right">
                        {fmt(l.unitFinalPrice * q)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {fmt(l.unitDp * q)}
                      </td>
                    </tr>
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-6">
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Price</div>
            <div className="text-lg font-semibold">{fmt(totalPrice)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total Down Payment</div>
            <div className="text-lg font-semibold">{fmt(totalDP)}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Place Preorder"}
          </button>
        </div>
      </form>
    </div>
  );
}
