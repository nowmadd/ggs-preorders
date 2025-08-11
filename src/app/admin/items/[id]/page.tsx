// app/admin/items/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Item = {
  id: string;
  name: string;
  description?: string;
  price: number;
  dp: number;
  discount: number;
  category?: string;
  releaseDate?: string;
  image?: string;
};

export default function AdminItemDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load item");
        const data = await res.json();
        if (mounted) setItem(data);
      } catch (e) {
        setStatus({ type: "error", message: "Failed to load item." });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const ok = confirm("Delete this item? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setStatus({ type: "success", message: "Item deleted." });
      setTimeout(() => router.push("/admin/items"), 600);
    } catch {
      setStatus({
        type: "error",
        message: "Could not delete item. Try again.",
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-5 w-40 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 w-full bg-gray-200 animate-pulse rounded" />
        <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-red-700 bg-red-50 p-3 rounded">Item not found.</p>
        <div className="mt-4">
          <Link href="/admin/items" className="text-sky-700 hover:underline">
            ← Back to items
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header + actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.name}</h1>
          <p className="text-sm text-gray-600 mt-1">ID: {item.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/items"
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Back
          </Link>
          <Link
            href={`/admin/items/${encodeURIComponent(item.id)}/edit`}
            className="px-3 py-2 rounded bg-amber-600 text-white hover:bg-amber-700"
          >
            Edit
          </Link>
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

      {/* Image */}
      {item.image && (
        <div className="w-full">
          <img
            src={item.image}
            alt={item.name}
            className="w-full max-h-80 object-cover rounded border"
          />
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Detail label="Price" value={formatCurrency(item.price)} />
        <Detail
          label="Down Payment"
          value={item.dp ? formatCurrency(item.dp) : "—"}
        />
        <Detail
          label="Discount (%)"
          value={item.discount != null ? String(item.discount) : "—"}
        />
        <Detail label="Category" value={item.category || "—"} />
        <Detail
          label="Release Date"
          value={
            item.releaseDate
              ? new Date(item.releaseDate).toLocaleDateString()
              : "—"
          }
        />
      </div>

      {/* Description */}
      {item.description && (
        <div className="bg-white rounded border p-4">
          <h2 className="font-medium mb-2">Description</h2>
          <p className="text-gray-800 whitespace-pre-wrap">
            {item.description}
          </p>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-gray-900">{value}</div>
    </div>
  );
}

function formatCurrency(n: number) {
  try {
    return `₱${n.toLocaleString()}`;
  } catch {
    return "—";
  }
}
