// app/preorder-offer/new/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useGetOfferQuery } from "@/lib/store/api/offersApi";

type OfferItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number;
  category?: string;
  releaseDate?: string;
  image?: string;
  images?: string[];
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

  // Load the offer with items (make sure your RTK endpoint adds ?include=items)
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
      const disc = Number(it.discount || 0); // percent
      const dp = Number(it.dp || 0);
      const priceAfterDiscount = Math.max(
        0,
        Math.round((base * (100 - disc)) / 100)
      );
      const lineTotal = priceAfterDiscount * q;
      const lineDp = dp * q;
      price += lineTotal;
      dpTotal += lineDp;
      return {
        ...it,
        q,
        unitBasePrice: base,
        unitDiscountPct: disc,
        unitFinalPrice: priceAfterDiscount,
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

      // 👉 Redirect straight to the confirm/payment page
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

  if (isLoading) {
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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
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
        {/* Items with details + qty */}
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
              {(offer.items ?? []).map((it) => {
                const q = qty[it.id] || 0;
                const base = Number(it.price || 0);
                const disc = Number(it.discount || 0);
                const finalUnit = Math.max(
                  0,
                  Math.round((base * (100 - disc)) / 100)
                );
                const dp = Number(it.dp || 0);
                return (
                  <tr key={it.id} className="border-b last:border-0 align-top">
                    {/* Item cell with image, title/name, id, short desc */}
                    <td className="py-2 px-3">
                      <div className="flex gap-3">
                        <div className="w-12 aspect-square rounded border bg-gray-50 overflow-hidden shrink-0">
                          {it.image ? (
                            <img
                              src={it.image}
                              alt={it.title || it.name}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-[220px]">
                          <div className="font-medium">
                            {it.title?.trim() || it.name}
                          </div>
                          <div className="text-xs text-gray-500">{it.id}</div>
                          {it.description && (
                            <div className="text-xs text-gray-600 mt-1">
                              {short(it.description, 120)}
                            </div>
                          )}
                          {/* Optional: show additional image count */}
                          {Array.isArray(it.images) && it.images.length > 1 && (
                            <div className="text-[11px] text-gray-500 mt-1">
                              +{it.images.length - 1} more image
                              {it.images.length - 1 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-3">{it.category || "—"}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {it.releaseDate
                        ? new Date(it.releaseDate).toLocaleDateString()
                        : "—"}
                    </td>

                    <td className="py-2 px-3 text-right whitespace-nowrap">
                      {disc > 0 ? (
                        <div className="space-y-0.5">
                          <div className="line-through text-gray-500">
                            {fmt(base)}
                          </div>
                          <div className="font-medium">{fmt(finalUnit)}</div>
                          <div className="text-[11px] text-emerald-700">
                            -{disc}%
                          </div>
                        </div>
                      ) : (
                        <div className="font-medium">{fmt(base)}</div>
                      )}
                    </td>

                    <td className="py-2 px-3 text-right">{fmt(dp)}</td>

                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        value={q}
                        onChange={(e) =>
                          setItemQty(it.id, Number(e.target.value))
                        }
                        className="w-20 border rounded p-1 text-right"
                        inputMode="numeric"
                        pattern="[0-9]*"
                      />
                    </td>

                    <td className="py-2 px-3 text-right">
                      {fmt(finalUnit * q)}
                    </td>
                    <td className="py-2 px-3 text-right">{fmt(dp * q)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
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

        {/* Submit */}
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

      {!session && (
        <p className="text-xs text-gray-500">
          Tip: Log in first so we can attach this preorder to your account.
        </p>
      )}
    </div>
  );
}
