// app/admin/preorders/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Item = { id: string; name: string; price?: number; image?: string };
type Offer = {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  active: boolean;
  banner?: string;
  items?: Item[];
};

export default function AdminPreorderOfferPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);

  useEffect(() => {
    if (!id) return; // guard while params mount
    (async () => {
      try {
        const res = await fetch(
          `/api/preorder-offers/${encodeURIComponent(id)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setOffer(data);
      } catch (e) {
        setStatus({ type: "error", message: "Failed to load preorder offer." });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const ok = confirm("Delete this item? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/preorder-offers/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      setStatus({ type: "success", message: "Offer deleted." });
      setTimeout(() => router.push("/admin/preorders"), 500);
    } catch {
      setStatus({
        type: "error",
        message: "Could not delete offer. Try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="h-8 w-56 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-5 w-32 bg-gray-200 animate-pulse rounded mb-6" />
        <div className="h-48 w-full bg-gray-200 animate-pulse rounded mb-6" />
        <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-700 bg-red-50 p-3 rounded">Offer not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{offer.title}</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {offer.id}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <span>
              {new Date(offer.start_date).toLocaleDateString()} —{" "}
              {new Date(offer.end_date).toLocaleDateString()}
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
          <button
            onClick={() => router.push("/admin/preorders")}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Back
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {status && (
        <div
          className={`p-3 rounded ${
            status.type === "success"
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {status.message}
        </div>
      )}

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
          <button
            onClick={() => router.push(`/admin/preorders/${offer.id}/edit`)}
            className="text-sm px-3 py-1.5 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            Edit Items
          </button>
        </div>

        {!offer.items || offer.items.length === 0 ? (
          <p className="text-sm text-gray-500 mt-3">No items linked yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-4">Item Name</th>
                  <th className="py-2 pr-4">Item ID</th>
                  <th className="py-2 pr-4">Price</th>
                </tr>
              </thead>
              <tbody>
                {offer.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 pr-4">{it.name || "-"}</td>
                    <td className="py-2 pr-4 text-gray-600">{it.id}</td>
                    <td className="py-2 pr-4">
                      {it.price != null ? `₱${it.price}` : "-"}
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
