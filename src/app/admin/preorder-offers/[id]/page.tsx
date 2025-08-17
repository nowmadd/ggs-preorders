"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetOfferQuery,
  useDeleteOfferMutation,
} from "@/lib/store/api/offersApi";

type Item = { id: string; name: string; price?: number; image?: string };

function fmtDate(d: unknown) {
  if (!d) return "—";
  const t = new Date(String(d));
  return isNaN(t.getTime()) ? "—" : t.toLocaleDateString();
}

export default function AdminPreorderOfferPage() {
  const params = useParams();
  const id = useMemo(() => {
    const raw = (params as any)?.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params]);

  const router = useRouter();
  const {
    data: offer,
    isLoading,
    isError,
    refetch,
  } = useGetOfferQuery(id as string, { skip: !id });
  const [deleteOffer, { isLoading: deleting }] = useDeleteOfferMutation();

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm("Delete this offer? This cannot be undone.")) return;
    try {
      await deleteOffer(id as string).unwrap();
      router.push("/admin/preorder-offers");
    } catch {
      alert("Could not delete offer. Try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="h-8 w-56 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded mb-6" />
        <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <p className="text-red-700 bg-red-50 p-3 rounded">
          {isError ? "Failed to load preorder offer." : "Offer not found."}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Retry
          </button>
          <Link
            href="/admin/preorder-offers"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            ← Back to offers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{offer.title ?? "—"}</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {offer.id ?? "—"}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <span className="whitespace-nowrap">
              {fmtDate(offer.start_date)} — {fmtDate(offer.end_date)}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                offer.active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {offer.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/preorder-offers"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Back
          </Link>
          <Link
            href={`/admin/preorder-offers/${encodeURIComponent(offer.id)}/edit`}
            className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {offer.banner && (
        <div className="w-full">
          <img
            src={offer.banner}
            alt="Preorder Offer Banner"
            className="w-full max-h-80 object-cover rounded border"
          />
        </div>
      )}

      {offer.description && (
        <div className="bg-white rounded border p-4">
          <h2 className="font-medium mb-2">Description</h2>
          <p className="text-gray-800 whitespace-pre-wrap">
            {offer.description}
          </p>
        </div>
      )}

      <div className="bg-white rounded border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Included Items</h2>
          <Link
            href={`/admin/preorder-offers/${encodeURIComponent(offer.id)}/edit`}
            className="text-sm px-3 py-1.5 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            Edit Items
          </Link>
        </div>

        {!offer.items || offer.items.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No items linked yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Item ID</th>
                  <th className="py-2 pr-4 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {offer.items.map((it: Item) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{it.name || "—"}</td>
                    <td className="py-2 pr-4 text-gray-600">{it.id}</td>
                    <td className="py-2 pr-4 text-right whitespace-nowrap">
                      {it.price != null
                        ? `₱${Number(it.price).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
